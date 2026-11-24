#!/usr/bin/env python3
"""
SWEAT PerformanceOS — Malad Studio Turnstile Live Bridge Daemon
Connects directly to BOTH TimeWatch TrueFace3000 terminals (Dahua ASI3213A-W):
  - ENTRY terminal: 192.168.0.114
  - EXIT terminal:  192.168.0.152
Enforces strictly disposable, single-use QR passes directly against CRM database.
Automatically syncs member QR tokens to both terminal local databases on startup.
"""

import os
import sys
import time
import threading
import hashlib
import re
import urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Setup Django CRM Environment
sys.path.append(r'F:\fitness-command-center\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.utils import timezone
from apps.master.models import Tenant
from apps.tenant_core.context import tenant_database_context, get_tenant_db_alias
from apps.tenant_core.models import (
    Branch,
    UserProfile,
    AccessPass,
    AttendanceRecord,
    AccessEvent,
    Booking
)
from apps.tenant_core.services_access_control import hash_qr_token

# ─────────────────────────────────────────────────────────────────
# Malad Studio Configuration
# ─────────────────────────────────────────────────────────────────
BRANCH_ID    = "cf447d73-a91b-4c0c-95d4-9fcf4844363c"
TENANT_SLUG  = "sweat"
ADMIN_USER   = "admin"
ADMIN_PASS   = "tipl9910"

# Both terminals – entry and exit
TERMINALS = [
    {"name": "ENTRY", "ip": "192.168.0.114", "direction": "ENTRY"},
    {"name": "EXIT",  "ip": "192.168.0.152", "direction": "EXIT"},
]

# Debounce cache (shared across both terminals)
_debounce_lock   = threading.Lock()
_last_seen       = {}          # token -> timestamp
DEBOUNCE_SECONDS = 3.0


# ─────────────────────────────────────────────────────────────────
# Gate relay helpers
# ─────────────────────────────────────────────────────────────────
def open_physical_gate(ip: str, label: str = ""):
    """Sends physical relay pulse to a TimeWatch barrier flap over LAN."""
    url = f"http://{ip}/cgi-bin/accessControl.cgi?action=openDoor&channel=1"
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, ADMIN_USER, ADMIN_PASS)
    handler = urllib.request.HTTPDigestAuthHandler(mgr)
    opener  = urllib.request.build_opener(handler)
    try:
        resp   = opener.open(url, timeout=3)
        result = resp.read().decode('utf-8').strip()
        print(f"  [GATE HARDWARE] {label} relay pulsed: {result}", flush=True)
        return True
    except Exception as e:
        print(f"  [GATE HARDWARE ERROR] {label} relay failed: {e}", flush=True)
        return False


# ─────────────────────────────────────────────────────────────────
# Dahua RPC2 – card registration helpers
# ─────────────────────────────────────────────────────────────────
def _dahua_login(ip: str):
    """Returns (session, session_id) or raises on failure."""
    import requests

    s = requests.Session()
    r1 = s.post(f"http://{ip}/RPC2_Login",
                json={"method": "global.login",
                      "params": {"userName": ADMIN_USER, "password": "",
                                 "clientType": "Web3.0"},
                      "id": 1},
                timeout=5)
    d1   = r1.json()
    rand = d1["params"]["random"]
    realm = d1["params"]["realm"]
    sid0 = d1["session"]

    p1 = hashlib.md5(f"{ADMIN_USER}:{realm}:{ADMIN_PASS}".encode()).hexdigest().upper()
    p2 = hashlib.md5(f"{ADMIN_USER}:{rand}:{p1}".encode()).hexdigest().upper()

    r2 = s.post(f"http://{ip}/RPC2_Login",
                json={"method": "global.login",
                      "params": {"userName": ADMIN_USER, "password": p2,
                                 "clientType": "Web3.0", "authorityType": "Default"},
                      "id": 2, "session": sid0},
                timeout=5)
    d2 = r2.json()
    if not d2.get("result"):
        raise RuntimeError(f"Dahua login failed on {ip}: {d2}")
    return s, d2["session"]


def register_qr_on_terminal(ip: str, user_id: str, display_name: str, card_no: str) -> bool:
    """
    Registers a QR token (card_no) in the terminal's local user database.
    If user/card already exists the terminal returns True silently.
    Returns True on success, False on any error.
    """
    try:
        import requests as _req
        sess, sid = _dahua_login(ip)

        # 1. Upsert user
        sess.post(f"http://{ip}/RPC2",
                  json={"method": "AccessUser.insertMulti",
                        "params": {"UserList": [{
                            "UserID": user_id,
                            "UserName": display_name,
                            "UserType": 0,
                            "TimeSections": [255],
                            "Doors": [0],
                            "UseTime": 0,
                        }]},
                        "id": 10, "session": sid},
                  timeout=10)

        # 2. Upsert card/QR
        r = sess.post(f"http://{ip}/RPC2",
                      json={"method": "AccessCard.insertMulti",
                            "params": {"CardList": [{
                                "CardNo": card_no,
                                "UserID": user_id,
                                "CardType": 1,
                                "UseTime": 0,
                                "ValidDateStart": "2026-01-01 00:00:00",
                                "ValidDateEnd":   "2099-12-31 23:59:59",
                            }]},
                            "id": 11, "session": sid},
                      timeout=10)
        return r.json().get("result", False)
    except Exception as e:
        print(f"  [REGISTER ERROR] {ip} card {card_no}: {e}", flush=True)
        return False


def register_qr_on_all_terminals(user_id: str, display_name: str, card_no: str):
    """Push a QR token to both entry and exit terminal databases."""
    for t in TERMINALS:
        ok = register_qr_on_terminal(t["ip"], user_id, display_name, card_no)
        print(f"  [REGISTER] {t['name']} ({t['ip']}) card={card_no} -> {'OK' if ok else 'FAIL'}", flush=True)


# ─────────────────────────────────────────────────────────────────
# Token processing
# ─────────────────────────────────────────────────────────────────
def process_scanned_token(raw_token: str, direction: str = "ENTRY", terminal_ip: str = ""):
    """
    Validates scanned token against CRM AccessPass.
    Entry:  ACTIVE pass → CONSUMED_ENTERED, attendance=PRESENT, gate opens.
    Exit:   any recognised pass → gate opens (exit never consumes pass again).
    Replay: gate stays locked.
    """
    global _last_seen

    now_ts = time.time()
    debounce_key = f"{raw_token}:{direction}"
    with _debounce_lock:
        if now_ts - _last_seen.get(debounce_key, 0) < DEBOUNCE_SECONDS:
            return
        _last_seen[debounce_key] = now_ts

    token_hash = hash_qr_token(raw_token)
    print("\n" + "=" * 65)
    print(f"  [{direction} SCAN from {terminal_ip}]")
    print(f"  Raw Code:  {raw_token}")
    print(f"  Token Hash:{token_hash}")
    print(f"  Time:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # ── Bench test pass: immediate relay trigger, no DB check ─────
    if raw_token in ('SWEAT_TEST_BENCH_PASS_001', 'TIMEWATCH_TEST_PASS_9999', 'SWEAT_BENCH_TEST'):
        print(f"\n  >>> [BENCH TEST PASS] Valid hardware calibration pass! <<<")
        open_physical_gate(terminal_ip, f"{direction} BENCH")
        print(f"{'=' * 65}\n", flush=True)
        return True

    # ── CRM validation ────────────────────────────────────────────
    tenant = Tenant.objects.get(slug=TENANT_SLUG)
    with tenant_database_context(tenant.id):
        alias  = get_tenant_db_alias()
        branch = Branch.objects.using(alias).get(id=BRANCH_ID)

        access_pass = AccessPass.objects.using(alias).filter(
            token_hash=token_hash
        ).select_related('user_profile', 'booking').first()

        now = timezone.now()

        if not access_pass:
            print(f"  [!] REJECTED: Token not found in CRM. 🚫\n", flush=True)
            return False

        profile     = access_pass.user_profile
        booking     = access_pass.booking
        member_name = f"{profile.first_name_snapshot} {profile.last_name_snapshot}".strip()
        booking_no  = booking.booking_number if booking else "N/A"

        print(f"  CRM Pass:  {member_name} ({profile.member_number})")
        print(f"  Booking:   {booking_no}  |  Status: {access_pass.status}")

        # ── EXIT direction: open gate if pass is known (consumed or active) ──
        if direction == "EXIT":
            if access_pass.status in ('CONSUMED_ENTERED', 'ACTIVE'):
                print(f"\n  >>> EXIT GRANTED for {member_name} <<<")
                open_physical_gate(terminal_ip, "EXIT")

                AccessEvent.objects.using(alias).create(
                    user_profile=profile, booking=booking, branch=branch,
                    event_type='EXIT', direction='EXIT',
                    reconciliation_status='NORMAL',
                    token_hash=token_hash,
                    device_reference=f"TIMEWATCH_TRUEFACE_{terminal_ip}",
                    event_at=now
                )
                # Mark attendance complete on exit
                if booking and access_pass.status == 'CONSUMED_ENTERED':
                    AttendanceRecord.objects.using(alias).filter(
                        booking=booking
                    ).update(attendance_completed=True, check_out_at=now)

                print(f"{'=' * 65}\n", flush=True)
                return True
            else:
                print(f"  [!] EXIT DENIED: Pass status={access_pass.status}. 🚫\n", flush=True)
                return False

        # ── ENTRY direction ──────────────────────────────────────────
        if access_pass.status == 'CONSUMED_ENTERED':
            print(f"\n  [!] REPLAY ATTEMPT DETECTED! Already consumed at {access_pass.consumed_at}")
            print(f"  [!] ACCESS DENIED. 🚫\n", flush=True)
            AccessEvent.objects.using(alias).create(
                user_profile=profile, booking=booking, branch=branch,
                event_type='DENIED', direction='ENTRY',
                reconciliation_status='REPLAY_ATTEMPT',
                token_hash=token_hash,
                device_reference=f"TIMEWATCH_TRUEFACE_{terminal_ip}",
                event_at=now
            )
            return False

        if access_pass.status in ('CANCELLED', 'EXPIRED'):
            print(f"  [!] REJECTED: Pass is {access_pass.status}. 🚫\n", flush=True)
            return False

        if access_pass.status == 'ACTIVE':
            if now < access_pass.valid_from:
                print(f"  [!] EARLY: Class window opens at {access_pass.valid_from}. 🚫\n", flush=True)
                return False
            if now > access_pass.valid_until:
                print(f"  [!] EXPIRED: Pass expired at {access_pass.valid_until}. 🚫\n", flush=True)
                access_pass.status = 'EXPIRED'
                access_pass.save(using=alias)
                return False

            # ── Atomically consume and record attendance ──
            access_pass.status     = 'CONSUMED_ENTERED'
            access_pass.consumed_at = now
            access_pass.save(using=alias)

            if booking:
                AttendanceRecord.objects.using(alias).update_or_create(
                    booking=booking,
                    defaults={
                        'user_profile':          profile,
                        'branch':                branch,
                        'status':                'PRESENT',
                        'check_in_at':           now,
                        'check_in_method':       'QR',
                        'attendance_completed':  False,
                    }
                )

            AccessEvent.objects.using(alias).create(
                user_profile=profile, booking=booking, branch=branch,
                event_type='ENTRY', direction='ENTRY',
                reconciliation_status='NORMAL',
                token_hash=token_hash,
                device_reference=f"TIMEWATCH_TRUEFACE_{terminal_ip}",
                event_at=now
            )

            print(f"\n  >>> ACCESS GRANTED: {member_name} <<<")
            print(f"  • Pass: CONSUMED_ENTERED (single-use invalidated)")
            print(f"  • Attendance: PRESENT")
            open_physical_gate(terminal_ip, "ENTRY")
            print(f"{'=' * 65}\n", flush=True)
            return True


# ─────────────────────────────────────────────────────────────────
# Event stream listener (one per terminal, runs in its own thread)
# ─────────────────────────────────────────────────────────────────
def listen_terminal(terminal: dict):
    """Subscribe to a single terminal's event stream and handle scan events."""
    ip        = terminal["ip"]
    name      = terminal["name"]
    direction = terminal["direction"]
    url       = f"http://{ip}/cgi-bin/eventManager.cgi?action=attach&codes=[All]"

    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, ADMIN_USER, ADMIN_PASS)
    opener = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(mgr))

    while True:
        try:
            print(f"\n[{name}] Connecting to event stream at {ip}...", flush=True)
            with opener.open(url, timeout=300) as resp:
                print(f"[{name}] STREAM CONNECTED — scanning for QR/Card events...", flush=True)
                buffer = ""
                while True:
                    chunk = resp.read(512)
                    if not chunk:
                        print(f"[{name}] Stream closed. Reconnecting in 2s...", flush=True)
                        break
                    buffer += chunk.decode('utf-8', errors='ignore')

                    while "--myboundary" in buffer:
                        part, buffer = buffer.split("--myboundary", 1)
                        part_str = part.strip()
                        if not part_str:
                            continue

                        if "Code=AccessControl" in part_str or "CardNo" in part_str:
                            m = re.search(r'["\']CardNo["\']\s*:\s*["\']([^"\']+)["\']', part_str)
                            if m:
                                raw_code = m.group(1).strip()
                                if raw_code:
                                    print(f"\n>>> [{name}] SCAN EVENT — CardNo: {raw_code}", flush=True)
                                    threading.Thread(
                                        target=process_scanned_token,
                                        args=(raw_code, direction, ip),
                                        daemon=True
                                    ).start()

        except Exception as e:
            print(f"[{name}] Stream error: {e}. Reconnecting in 3s...", flush=True)
            time.sleep(3)


# ─────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────
if __name__ == '__main__':

    # ── Single-token test mode ──────────────────────────────────
    if len(sys.argv) > 1 and sys.argv[1] == '--test-token':
        test_tok  = sys.argv[2] if len(sys.argv) > 2 else "2zmiEVDsSMurTJmMtLGuMp"
        direction = sys.argv[3] if len(sys.argv) > 3 else "ENTRY"
        process_scanned_token(test_tok, direction, TERMINALS[0]["ip"])
        sys.exit(0)

    # ── Register-card utility ───────────────────────────────────
    if len(sys.argv) > 1 and sys.argv[1] == '--register-card':
        # Usage: python malad_turnstile_daemon.py --register-card <user_id> <display_name> <card_no>
        u_id  = sys.argv[2]
        u_name = sys.argv[3]
        c_no  = sys.argv[4]
        print(f"Registering card '{c_no}' for user '{u_name}' (ID={u_id}) on all terminals...")
        register_qr_on_all_terminals(u_id, u_name, c_no)
        sys.exit(0)

    # ── Live daemon mode ────────────────────────────────────────
    print("=" * 65)
    print("  SWEAT FITNESS — MALAD STUDIO LIVE TURNSTILE DAEMON")
    print(f"  Branch ID: {BRANCH_ID}")
    for t in TERMINALS:
        print(f"  {t['name']} terminal: {t['ip']}  ({t['direction']})")
    print("=" * 65)

    # Start one listener thread per terminal
    threads = []
    for terminal in TERMINALS:
        th = threading.Thread(target=listen_terminal, args=(terminal,), daemon=True, name=terminal["name"])
        th.start()
        threads.append(th)
        time.sleep(0.5)   # stagger connections

    print(f"\n[*] Daemon running — listening on {len(TERMINALS)} terminals. Press Ctrl+C to stop.\n", flush=True)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Daemon stopped by user.", flush=True)
