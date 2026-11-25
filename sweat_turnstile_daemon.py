#!/usr/bin/env python3
"""
SWEAT PerformanceOS — Universal Multi-Studio Turnstile Daemon
=============================================================

Supports one branch (studio PC) OR multiple branches simultaneously (cloud worker)
configured entirely via environment variables / .env files.

What it does
------------
1. Loads `.env.turnstile` / `.env` (or `--env-file <path>`) automatically.
2. Fetches active TurnstileDevice rows for every configured branch from
   `GET /api/v1/tenant/access/turnstile/devices/`.
3. Starts an event listener thread per active terminal (`eventManager.cgi`),
   automatically adding/stopping listeners if devices change in the CRM.
4. Polls `active-tokens/` every 60s per branch, pre-registering upcoming bookings
   (using a single login session per terminal + synced-card cache) and purging
   any `revoked_tokens` (cancelled bookings) immediately.
5. Sends scanned QR tokens + `branch_id` + `device_reference` + `X-Turnstile-Api-Key`
   to `verify-punch/`, opening the relay when `allow_access=True`.
6. Periodically purges stale expired passes older than 7 days via batch `deleteMulti`.

Configuration (env vars or .env / .env.turnstile)
-------------------------------------------------
  SWEAT_BRANCH_ID          Single studio branch UUID/code (or use SWEAT_BRANCH_IDS)
  SWEAT_BRANCH_IDS         Comma-separated branch UUIDs for cloud multi-studio worker
  SWEAT_TENANT_SLUG        Tenant slug (default: sweat)
  SWEAT_API_BASE           Cloud API base URL (default: https://api.sweatfitwellness.com)
  TURNSTILE_SYNC_SECRET    Shared HMAC secret (must match cloud server)
  TURNSTILE_GATEWAY_API_KEY Shared verify-punch API key (must match cloud server if set)
  DAHUA_ADMIN_USER         Terminal admin username (default: admin)
  DAHUA_ADMIN_PASS         Terminal admin password (required)
  SYNC_INTERVAL_SECONDS    Token sync interval in seconds (default: 60)

Usage
-----
  python sweat_turnstile_daemon.py
  python sweat_turnstile_daemon.py --env-file .env.turnstile.malad
  python sweat_turnstile_daemon.py --sync-now
  python sweat_turnstile_daemon.py --test-token <22charToken> [ENTRY|EXIT] [branch_id]
  python sweat_turnstile_daemon.py --register-card <user_id> <name> <token>
"""

import hashlib
import hmac
import logging
import os
import re as _re
import sys
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone as _tz
from pathlib import Path
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger('sweat.daemon')


# ---------------------------------------------------------------------------
# Automatic .env file loader (supports python-dotenv OR pure-stdlib fallback)
# ---------------------------------------------------------------------------

def _load_env_files(explicit_path: Optional[str] = None) -> None:
    """Loads .env configuration without overwriting already-exported shell vars."""
    candidates: list[Path] = []
    if explicit_path:
        candidates.append(Path(explicit_path))
    else:
        here = Path(__file__).resolve().parent
        candidates.extend([
            here / '.env.turnstile',
            here / '.env',
            Path.cwd() / '.env.turnstile',
            Path.cwd() / '.env',
        ])

    seen = set()
    target: Optional[Path] = None
    for p in candidates:
        rp = p.resolve() if p.exists() else None
        if rp and rp not in seen:
            seen.add(rp)
            target = rp
            break

    if not target:
        return

    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(target, override=False)
        logger.info('Loaded env config from %s', target)
        return
    except ImportError:
        pass

    for line in target.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, val = line.split('=', 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val
    logger.info('Loaded env config (stdlib) from %s', target)


def _extract_env_file_arg(argv: list[str]) -> tuple[Optional[str], list[str]]:
    """Extracts optional `--env-file <path>` flag from CLI args."""
    cleaned: list[str] = []
    env_file: Optional[str] = None
    skip_next = False
    for idx, arg in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if arg == '--env-file' and idx + 1 < len(argv):
            env_file = argv[idx + 1]
            skip_next = True
        elif arg.startswith('--env-file='):
            env_file = arg.split('=', 1)[1]
        else:
            cleaned.append(arg)
    return env_file, cleaned


# Configuration globals (populated in _init_config)
BRANCH_IDS: list[str] = []
BRANCH_ID: str = ''
TENANT_SLUG: str = 'sweat'
API_BASE: str = 'https://api.sweatfitwellness.com'
SYNC_SECRET: str = ''
GATEWAY_API_KEY: str = ''
ADMIN_USER: str = 'admin'
ADMIN_PASS: str = ''
SYNC_INTERVAL_SECONDS: int = 60
DEVICE_REFRESH_CYCLES: int = 5
RESYNC_TTL_SECONDS: int = 1800

BENCH_TEST_TOKENS = frozenset({
    'SWEAT_TEST_BENCH_PASS_001',
    'TIMEWATCH_TEST_PASS_9999',
    'SWEAT_BENCH_TEST',
})

DEBOUNCE_SECONDS: float = 3.0
_debounce_lock = threading.Lock()
_last_seen: dict[str, float] = {}

# Cache of cards already confirmed on a terminal: (base_url, card_no) -> monotonic ts
_sync_cache_lock = threading.Lock()
_synced_cards: dict[tuple[str, str], float] = {}


def _init_config(env_file: Optional[str] = None) -> None:
    """Initializes runtime configuration from environment variables."""
    global BRANCH_IDS, BRANCH_ID, TENANT_SLUG, API_BASE
    global SYNC_SECRET, GATEWAY_API_KEY, ADMIN_USER, ADMIN_PASS
    global SYNC_INTERVAL_SECONDS, RESYNC_TTL_SECONDS

    _load_env_files(env_file)

    raw_multi = os.environ.get('SWEAT_BRANCH_IDS', '').strip()
    raw_single = os.environ.get('SWEAT_BRANCH_ID', '').strip()
    if raw_multi:
        BRANCH_IDS = [b.strip() for b in raw_multi.split(',') if b.strip()]
    elif raw_single:
        BRANCH_IDS = [raw_single]
    else:
        BRANCH_IDS = []

    BRANCH_ID = BRANCH_IDS[0] if BRANCH_IDS else ''
    TENANT_SLUG = os.environ.get('SWEAT_TENANT_SLUG', 'sweat').strip() or 'sweat'
    API_BASE = os.environ.get('SWEAT_API_BASE', 'https://api.sweatfitwellness.com').strip().rstrip('/')
    SYNC_SECRET = os.environ.get('TURNSTILE_SYNC_SECRET', '').strip()
    GATEWAY_API_KEY = os.environ.get('TURNSTILE_GATEWAY_API_KEY', '').strip()
    ADMIN_USER = os.environ.get('DAHUA_ADMIN_USER', 'admin').strip() or 'admin'
    ADMIN_PASS = os.environ.get('DAHUA_ADMIN_PASS', '').strip()
    SYNC_INTERVAL_SECONDS = max(10, int(os.environ.get('SYNC_INTERVAL_SECONDS', '60')))
    RESYNC_TTL_SECONDS = max(60, int(os.environ.get('RESYNC_TTL_SECONDS', '1800')))


def _assert_config() -> None:
    missing = [name for val, name in [
        (BRANCH_IDS,  'SWEAT_BRANCH_ID or SWEAT_BRANCH_IDS'),
        (SYNC_SECRET, 'TURNSTILE_SYNC_SECRET'),
        (ADMIN_PASS,  'DAHUA_ADMIN_PASS'),
    ] if not val]
    if missing:
        logger.error('Missing required environment variables: %s', missing)
        sys.exit(1)


# ---------------------------------------------------------------------------
# HMAC helper — mirrors TurnstileActiveTokensView._verify_sync_token()
# ---------------------------------------------------------------------------

def _build_sync_auth_header(branch_id: str) -> str:
    """Returns the Authorization header value for turnstile sync endpoints."""
    now_utc = datetime.now(tz=_tz.utc)
    hour_epoch = int(
        now_utc.replace(minute=0, second=0, microsecond=0).timestamp()
    )
    message = f'SWEAT:active-tokens:{branch_id}:{hour_epoch}'.encode()
    token = hmac.new(SYNC_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return f'Bearer {token}'


# ---------------------------------------------------------------------------
# Terminal registry — fetched from cloud on startup & refreshed periodically
# ---------------------------------------------------------------------------

class TerminalConfig:
    """Lightweight struct representing one physical terminal."""
    __slots__ = ('device_id', 'branch_id', 'name', 'base_url', 'direction', 'class_category_code', 'is_active')

    def __init__(
        self,
        name: str,
        base_url: str,
        direction: str,
        class_category_code: str,
        is_active: bool,
        branch_id: str = '',
        device_id: str = '',
    ):
        self.device_id = device_id
        self.branch_id = branch_id
        self.name = name
        self.base_url = base_url
        self.direction = direction
        self.class_category_code = class_category_code.strip().upper()
        self.is_active = is_active

    def matches_category(self, category_code: str) -> bool:
        """Mirrors TurnstileDevice.matches_category(): empty device filter accepts all."""
        if not self.class_category_code:
            return True
        if not category_code:
            return False
        return self.class_category_code == category_code.strip().upper()

    def __repr__(self) -> str:
        return f'<Terminal {self.name} ({self.direction}) branch={self.branch_id[:8]} @ {self.base_url}>'


_terminals: list[TerminalConfig] = []
_terminals_lock = threading.Lock()
_listener_stops: dict[tuple[str, str], threading.Event] = {}
_listener_lock = threading.Lock()


def _fetch_terminals_for_branch(branch_id: str) -> list[TerminalConfig]:
    """Fetches active TurnstileDevice rows for one branch from cloud API."""
    url = f'{API_BASE}/api/v1/tenant/access/turnstile/devices/'
    try:
        resp = requests.get(
            url,
            params={'branch_id': branch_id},
            headers={
                'X-Tenant-Slug': TENANT_SLUG,
                'Authorization': _build_sync_auth_header(branch_id),
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        resolved_branch_id = data.get('branch_id', branch_id)
        result = []
        for d in data.get('devices', []):
            port = d.get('port', 80)
            host = d.get('host', '')
            if not host:
                continue
            base = f'http://{host}' if port == 80 else f'http://{host}:{port}'
            result.append(TerminalConfig(
                device_id=str(d.get('id', '')),
                branch_id=str(d.get('branch_id') or resolved_branch_id),
                name=d.get('name', 'Unknown'),
                base_url=base,
                direction=d.get('direction', 'ENTRY').upper(),
                class_category_code=d.get('class_category_code', ''),
                is_active=d.get('is_active', True),
            ))
        logger.info('Fetched %d terminal(s) for branch %s', len(result), branch_id)
        return result
    except Exception as exc:
        logger.error('Failed to fetch terminals for branch=%s: %s', branch_id, exc)
        return []


def _fetch_all_terminals() -> list[TerminalConfig]:
    all_devs: list[TerminalConfig] = []
    for b_id in BRANCH_IDS:
        all_devs.extend(_fetch_terminals_for_branch(b_id))
    return all_devs


# ---------------------------------------------------------------------------
# Dahua RPC2 helpers (reuses 1 session per terminal batch)
# ---------------------------------------------------------------------------

def _dahua_login(base_url: str, timeout: int = 5) -> tuple[requests.Session, str]:
    sess = requests.Session()
    r1 = sess.post(
        f'{base_url}/RPC2_Login',
        json={'method': 'global.login',
              'params': {'userName': ADMIN_USER, 'password': '', 'clientType': 'Web3.0'},
              'id': 1},
        timeout=timeout,
    )
    r1.raise_for_status()
    d1 = r1.json()
    rand = d1['params']['random']
    realm = d1['params']['realm']
    sid0 = d1['session']
    p1 = hashlib.md5(f'{ADMIN_USER}:{realm}:{ADMIN_PASS}'.encode()).hexdigest().upper()
    p2 = hashlib.md5(f'{ADMIN_USER}:{rand}:{p1}'.encode()).hexdigest().upper()
    r2 = sess.post(
        f'{base_url}/RPC2_Login',
        json={'method': 'global.login',
              'params': {'userName': ADMIN_USER, 'password': p2,
                         'clientType': 'Web3.0', 'authorityType': 'Default'},
              'id': 2, 'session': sid0},
        timeout=timeout,
    )
    r2.raise_for_status()
    d2 = r2.json()
    if not d2.get('result'):
        raise RuntimeError(f'Dahua login failed: {base_url} → {d2}')
    return sess, d2['session']


def _register_cards_batch(
    terminal: TerminalConfig,
    items: list[tuple[str, str, str]],
) -> int:
    """
    Registers multiple (user_id, display_name, card_no) tuples using ONE login session.
    Returns count of cards confirmed registered.
    """
    if not items:
        return 0
    succeeded = 0
    try:
        sess, sid = _dahua_login(terminal.base_url, timeout=5)
        now_ts = time.monotonic()
        for idx, (user_id, display_name, card_no) in enumerate(items):
            sess.post(
                f'{terminal.base_url}/RPC2',
                json={
                    'method': 'AccessUser.insertMulti',
                    'params': {'UserList': [{
                        'UserID': user_id, 'UserName': display_name[:31],
                        'UserType': 0, 'TimeSections': [255], 'Doors': [0], 'UseTime': 0,
                    }]},
                    'id': 10 + idx * 2, 'session': sid,
                },
                timeout=8,
            )
            r = sess.post(
                f'{terminal.base_url}/RPC2',
                json={
                    'method': 'AccessCard.insertMulti',
                    'params': {'CardList': [{
                        'CardNo': card_no, 'UserID': user_id, 'CardType': 1,
                        'UseTime': 0,
                        'ValidDateStart': '2026-01-01 00:00:00',
                        'ValidDateEnd': '2099-12-31 23:59:59',
                    }]},
                    'id': 11 + idx * 2, 'session': sid,
                },
                timeout=8,
            )
            if r.json().get('result', False):
                succeeded += 1
                with _sync_cache_lock:
                    _synced_cards[(terminal.base_url, card_no)] = now_ts
        logger.debug('register_batch: %s %d/%d OK', terminal.name, succeeded, len(items))
    except Exception as exc:
        logger.warning('register_batch failed: %s count=%d err=%s', terminal.name, len(items), exc)
    return succeeded


def _delete_cards_batch(terminal: TerminalConfig, card_nos: list[str], batch_size: int = 50) -> bool:
    """Batch-removes cards from a terminal using ONE login session."""
    if not card_nos:
        return True
    try:
        sess, sid = _dahua_login(terminal.base_url, timeout=5)
        all_ok = True
        for i in range(0, len(card_nos), batch_size):
            chunk = card_nos[i:i + batch_size]
            r = sess.post(
                f'{terminal.base_url}/RPC2',
                json={
                    'method': 'AccessCard.deleteMulti',
                    'params': {'CardNoList': chunk},
                    'id': 20 + i, 'session': sid,
                },
                timeout=10,
            )
            all_ok = all_ok and bool(r.json().get('result', False))
        with _sync_cache_lock:
            for c in card_nos:
                _synced_cards.pop((terminal.base_url, c), None)
        return all_ok
    except Exception as exc:
        logger.warning('delete_cards_batch failed: %s count=%d err=%s', terminal.name, len(card_nos), exc)
        return False


def _open_physical_gate(base_url: str, label: str = '') -> bool:
    """Sends HTTP Digest relay-open CGI command to a terminal."""
    url = f'{base_url}/cgi-bin/accessControl.cgi?action=openDoor&channel=1'
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, ADMIN_USER, ADMIN_PASS)
    opener = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(mgr))
    try:
        resp = opener.open(url, timeout=5)
        result = resp.read().decode('utf-8', errors='replace').strip()
        logger.info('Gate opened: %s label=%r result=%r', base_url, label, result)
        return True
    except Exception as exc:
        logger.error('Gate open FAILED: %s label=%r err=%s', base_url, label, exc)
        return False


# ---------------------------------------------------------------------------
# Token sync loop (per branch, cached + room-routed)
# ---------------------------------------------------------------------------

def _get_active_tokens(branch_id: str) -> tuple[list[dict], list[str]]:
    """Calls cloud active-tokens endpoint for one branch. Returns (tokens, revoked_tokens)."""
    url = f'{API_BASE}/api/v1/tenant/access/turnstile/active-tokens/'
    try:
        resp = requests.get(
            url,
            params={'branch_id': branch_id},
            headers={
                'X-Tenant-Slug': TENANT_SLUG,
                'Authorization': _build_sync_auth_header(branch_id),
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        tokens = data.get('tokens', [])
        revoked = data.get('revoked_tokens', [])
        logger.info(
            'active-tokens[%s]: active=%d revoked=%d',
            data.get('branch_name', branch_id[:8]), len(tokens), len(revoked),
        )
        return tokens, revoked
    except Exception as exc:
        logger.error('active-tokens fetch failed for branch=%s: %s', branch_id, exc)
        return [], []


def _sync_tokens_to_terminals(force_all: bool = False) -> None:
    """
    Fetches active + revoked tokens per branch and batches terminal updates.
    Uses `_synced_cards` cache to avoid spamming 4 HTTP calls per token every 60s.
    """
    with _terminals_lock:
        active_terminals = [t for t in _terminals if t.is_active]

    # Group terminals by branch_id
    by_branch: dict[str, list[TerminalConfig]] = {}
    for term in active_terminals:
        by_branch.setdefault(term.branch_id or BRANCH_ID, []).append(term)

    now_mono = time.monotonic()

    for b_id, branch_terminals in by_branch.items():
        tokens, revoked = _get_active_tokens(b_id)

        # Immediately purge revoked/cancelled passes on branch terminals
        if revoked:
            for term in branch_terminals:
                _delete_cards_batch(term, revoked)

        if not tokens:
            continue

        for term in branch_terminals:
            pending_items: list[tuple[str, str, str]] = []
            for token_info in tokens:
                card_no = token_info.get('token', '')
                user_id = token_info.get('user_id', '')
                display_name = token_info.get('display_name', 'Member')
                cat_code = (token_info.get('class_category_code') or '').strip().upper()
                if not card_no or not user_id:
                    continue
                if not term.matches_category(cat_code):
                    continue

                if not force_all:
                    with _sync_cache_lock:
                        last_ts = _synced_cards.get((term.base_url, card_no))
                    if last_ts is not None and (now_mono - last_ts) < RESYNC_TTL_SECONDS:
                        continue

                pending_items.append((user_id, display_name, card_no))

            if pending_items:
                _register_cards_batch(term, pending_items)


def _sync_loop() -> None:
    """Background thread: syncs tokens every SYNC_INTERVAL_SECONDS & refreshes terminal list."""
    logger.info('Sync loop started (interval=%ds)', SYNC_INTERVAL_SECONDS)
    cycle = 0
    while True:
        try:
            cycle += 1
            if cycle > 1 and cycle % DEVICE_REFRESH_CYCLES == 0:
                refreshed = _fetch_all_terminals()
                if refreshed:
                    _reconcile_terminals(refreshed)
            _sync_tokens_to_terminals()
        except Exception as exc:
            logger.error('sync_loop unhandled error: %s', exc)
        time.sleep(SYNC_INTERVAL_SECONDS)


# ---------------------------------------------------------------------------
# Cloud verify-punch
# ---------------------------------------------------------------------------

def _verify_token_with_cloud(
    raw_token: str,
    direction: str,
    terminal: Optional[TerminalConfig] = None,
    branch_id: str = '',
) -> dict:
    """
    POSTs scanned token, direction, branch_id, device_reference, and
    X-Turnstile-Api-Key (when configured) to the cloud verify-punch endpoint.
    """
    url = f'{API_BASE}/api/v1/tenant/access/turnstile/verify-punch/'
    eff_branch_id = (terminal.branch_id if terminal else '') or branch_id or BRANCH_ID
    device_ref = terminal.name if terminal else 'TIMEWATCH-CLI'
    payload = {
        'card_no': raw_token,
        'direction': direction,
        'branch_id': eff_branch_id,
        'device_reference': device_ref,
    }
    headers = {'X-Tenant-Slug': TENANT_SLUG}
    if GATEWAY_API_KEY:
        headers['X-Turnstile-Api-Key'] = GATEWAY_API_KEY

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        logger.warning('verify-punch HTTP %s for token=%s…', resp.status_code, raw_token[:6])
        return {'allow_access': False, 'status': 'DENIED', 'reason': f'HTTP_{resp.status_code}'}
    except requests.Timeout:
        logger.error('verify-punch timed out for token=%s…', raw_token[:6])
        return {'allow_access': False, 'status': 'DENIED', 'reason': 'CLOUD_TIMEOUT'}
    except Exception as exc:
        logger.error('verify-punch error for token=%s… err=%s', raw_token[:6], exc)
        return {'allow_access': False, 'status': 'DENIED', 'reason': 'CLOUD_ERROR'}


# ---------------------------------------------------------------------------
# Scan processing & event listeners
# ---------------------------------------------------------------------------

def _process_scan(raw_token: str, direction: str, terminal: TerminalConfig) -> None:
    """Validates scanned QR token against cloud CRM and pulses gate relay if granted."""
    debounce_key = f'{terminal.base_url}:{raw_token}:{direction}'
    now_ts = time.monotonic()
    with _debounce_lock:
        if now_ts - _last_seen.get(debounce_key, 0) < DEBOUNCE_SECONDS:
            logger.debug('debounce skip: %s direction=%s', raw_token[:6], direction)
            return
        _last_seen[debounce_key] = now_ts

    sep = '=' * 65
    logger.info(
        '\n%s\n  [%s SCAN] terminal=%s branch=%s\n  Token: %s…\n  Time:  %s\n%s',
        sep, direction, terminal.name, terminal.branch_id[:8], raw_token[:6],
        datetime.now().strftime('%Y-%m-%d %H:%M:%S'), sep,
    )

    if raw_token in BENCH_TEST_TOKENS:
        logger.info('>>> [BENCH TEST PASS] Valid calibration token — opening gate <<<')
        _open_physical_gate(terminal.base_url, f'{direction} BENCH')
        return

    result = _verify_token_with_cloud(raw_token, direction, terminal=terminal)

    if result.get('allow_access'):
        member = result.get('user_name', 'Member')
        logger.info('>>> ACCESS GRANTED: %s (%s) <<<', member, direction)
        _open_physical_gate(terminal.base_url, f'{direction} {member}')
    else:
        reason = result.get('reason', result.get('status', 'DENIED'))
        logger.warning('ACCESS DENIED: token=%s… reason=%s', raw_token[:6], reason)


def _listen_terminal(terminal: TerminalConfig, stop_event: threading.Event) -> None:
    """Subscribes to one terminal's HTTP event stream until stop_event is set."""
    url = f'{terminal.base_url}/cgi-bin/eventManager.cgi?action=attach&codes=[All]'
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, ADMIN_USER, ADMIN_PASS)
    opener = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(mgr))

    logger.info('Listener starting: %s @ %s', terminal.name, terminal.base_url)

    while not stop_event.is_set():
        try:
            logger.info('[%s] Connecting to event stream…', terminal.name)
            with opener.open(url, timeout=300) as resp:
                logger.info('[%s] STREAM CONNECTED — waiting for QR scans…', terminal.name)
                buffer = ''
                while not stop_event.is_set():
                    chunk = resp.read(512)
                    if not chunk:
                        logger.warning('[%s] Stream ended. Reconnecting in 2s…', terminal.name)
                        break
                    buffer += chunk.decode('utf-8', errors='ignore')

                    while '--myboundary' in buffer:
                        part, buffer = buffer.split('--myboundary', 1)
                        if 'Code=AccessControl' not in part and 'CardNo' not in part:
                            continue
                        m = _re.search(r'["\']CardNo["\']\s*:\s*["\']([^"\']+)["\']', part)
                        if m:
                            card_no = m.group(1).strip()
                            if card_no:
                                logger.info('[%s] SCAN EVENT — CardNo: %s…', terminal.name, card_no[:6])
                                threading.Thread(
                                    target=_process_scan,
                                    args=(card_no, terminal.direction, terminal),
                                    daemon=True,
                                    name=f'scan-{terminal.name}-{card_no[:4]}',
                                ).start()
        except Exception as exc:
            if not stop_event.is_set():
                logger.error('[%s] Stream error: %s. Reconnecting in 3s…', terminal.name, exc)
                stop_event.wait(3)


def _reconcile_terminals(latest: list[TerminalConfig]) -> None:
    """Updates global terminal list and spawns/stops listener threads dynamically."""
    with _terminals_lock:
        _terminals.clear()
        _terminals.extend(latest)

    desired_keys = {(t.branch_id, t.base_url): t for t in latest if t.is_active}
    with _listener_lock:
        for key in list(_listener_stops.keys()):
            if key not in desired_keys:
                _listener_stops.pop(key).set()
        for key, term in desired_keys.items():
            if key not in _listener_stops:
                ev = threading.Event()
                _listener_stops[key] = ev
                threading.Thread(
                    target=_listen_terminal,
                    args=(term, ev),
                    daemon=True,
                    name=f'listener-{term.name}',
                ).start()


# ---------------------------------------------------------------------------
# Stale card cleanup (runs 60s after boot, then once every 24 hours)
# ---------------------------------------------------------------------------

def _cleanup_stale_cards() -> None:
    time.sleep(60)
    url = f'{API_BASE}/api/v1/tenant/access/turnstile/stale-tokens/'
    while True:
        try:
            with _terminals_lock:
                by_branch: dict[str, list[TerminalConfig]] = {}
                for t in _terminals:
                    if t.is_active:
                        by_branch.setdefault(t.branch_id or BRANCH_ID, []).append(t)

            for b_id, branch_terminals in by_branch.items():
                resp = requests.get(
                    url,
                    params={'branch_id': b_id},
                    headers={
                        'X-Tenant-Slug': TENANT_SLUG,
                        'Authorization': _build_sync_auth_header(b_id),
                    },
                    timeout=15,
                )
                if resp.status_code == 404:
                    continue
                resp.raise_for_status()
                stale = resp.json().get('tokens', [])
                if not stale:
                    continue
                for term in branch_terminals:
                    _delete_cards_batch(term, stale)
                logger.info('Stale card cleanup[%s]: purged %d card(s)', b_id[:8], len(stale))
        except Exception as exc:
            logger.error('Stale card cleanup error: %s', exc)
        time.sleep(86400)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _main() -> None:
    env_file, argv = _extract_env_file_arg(sys.argv[1:])
    _init_config(env_file)
    _assert_config()

    if argv:
        cmd = argv[0]

        if cmd == '--sync-now':
            with _terminals_lock:
                _terminals.extend(_fetch_all_terminals())
            _sync_tokens_to_terminals(force_all=True)
            logger.info('--sync-now complete.')
            sys.exit(0)

        if cmd == '--test-token' and len(argv) >= 2:
            raw_token = argv[1]
            direction = argv[2].upper() if len(argv) >= 3 else 'ENTRY'
            b_id = argv[3] if len(argv) >= 4 else BRANCH_ID
            result = _verify_token_with_cloud(raw_token, direction, branch_id=b_id)
            print(result)
            sys.exit(0)

        if cmd == '--register-card' and len(argv) >= 4:
            user_id = argv[1]
            display_name = argv[2]
            card_no = argv[3]
            terminals = _fetch_all_terminals()
            for t in terminals:
                cnt = _register_cards_batch(t, [(user_id, display_name, card_no)])
                print(f'  [{t.name}] → {"OK" if cnt else "FAIL"}')
            sys.exit(0)

        logger.error('Unknown command: %s', cmd)
        sys.exit(1)

    logger.info('=' * 65)
    logger.info('  SWEAT FITNESS — Universal Turnstile Daemon')
    logger.info('  Branches : %s', ', '.join(BRANCH_IDS))
    logger.info('  Tenant   : %s', TENANT_SLUG)
    logger.info('  API      : %s', API_BASE)
    logger.info('=' * 65)

    fetched = _fetch_all_terminals()
    if not fetched:
        logger.error(
            'No active terminals found for branches %s. '
            'Check TurnstileDevice records in Django Admin.',
            BRANCH_IDS,
        )
        sys.exit(1)

    _reconcile_terminals(fetched)
    for t in fetched:
        logger.info('  %s', t)

    threading.Thread(target=_sync_loop, daemon=True, name='sync-loop').start()
    threading.Thread(target=_cleanup_stale_cards, daemon=True, name='cleanup').start()

    logger.info(
        'Daemon running — %d listener(s) active. Press Ctrl+C to stop.',
        len([t for t in fetched if t.is_active]),
    )

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info('Daemon stopped by user.')


if __name__ == '__main__':
    _main()
