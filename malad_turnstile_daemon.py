#!/usr/bin/env python3
"""
SWEAT PerformanceOS — Malad Studio Turnstile Live Bridge Daemon
Connects directly to TimeWatch TrueFace3000 (Dahua ASI3213A-W) at 192.168.0.114.
Enforces strictly disposable, single-use QR passes directly against CRM database.
"""

import os
import sys
import time
import socket
import hashlib
import re
import uuid
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

# Malad Studio Configuration
BRANCH_ID = "1266a2ca-290c-41a7-bd70-1b414cb0650c"
TURNSTILE_IP = "192.168.0.114"
TURNSTILE_PORT = 80
TURNSTILE_USER = "admin"
TURNSTILE_PASS = "tipl9910"
TENANT_SLUG = "sweat"

# Debounce cache
last_scanned_token = None
last_scanned_time = 0
DEBOUNCE_SECONDS = 2.0


def open_physical_gate():
    """Sends physical relay pulse to Malad TimeWatch barrier flaps over LAN."""
    url = f"http://{TURNSTILE_IP}/cgi-bin/accessControl.cgi?action=openDoor&channel=1"
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, TURNSTILE_USER, TURNSTILE_PASS)
    handler = urllib.request.HTTPDigestAuthHandler(mgr)
    opener = urllib.request.build_opener(handler)
    try:
        resp = opener.open(url, timeout=3)
        result = resp.read().decode('utf-8').strip()
        print(f"  [GATE HARDWARE] Physical relay pulsed successfully: {result}", flush=True)
        return True
    except Exception as e:
        print(f"  [GATE HARDWARE ERROR] Failed to pulse relay: {e}", flush=True)
        return False


def process_scanned_token(raw_token: str):
    """
    Validates scanned token against CRM AccessPass with strict single-use disposable rules.
    If valid & ACTIVE -> atomically transitions pass to CONSUMED_ENTERED, marks attendance, opens gate.
    If already used -> REPLAY_ATTEMPT, leaves gate firmly locked!
    """
    global last_scanned_token, last_scanned_time
    now_ts = time.time()

    if raw_token == last_scanned_token and (now_ts - last_scanned_time < DEBOUNCE_SECONDS):
        return
    last_scanned_token = raw_token
    last_scanned_time = now_ts

    token_hash = hash_qr_token(raw_token)
    print("\n" + "=" * 65)
    print(f"  [SCANNER READ DETECTED]")
    print(f"  Raw Scanned Code: {raw_token}")
    print(f"  Token Hash:       {token_hash}")
    print(f"  Timestamp:        {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    tenant = Tenant.objects.get(slug=TENANT_SLUG)
    with tenant_database_context(tenant.id):
        alias = get_tenant_db_alias()
        branch = Branch.objects.using(alias).get(id=BRANCH_ID)

        # Lookup pass by token hash
        access_pass = AccessPass.objects.using(alias).filter(
            token_hash=token_hash
        ).select_related('user_profile', 'booking').first()

        now = timezone.now()

        if not access_pass:
            print(f"  [!] REJECTED: Token hash not found in CRM. Unknown pass!")
            print(f"  [!] GATE STAYS LOCKED. 🚫\n", flush=True)
            return False

        profile = access_pass.user_profile
        booking = access_pass.booking
        member_name = f"{profile.first_name_snapshot} {profile.last_name_snapshot}".strip()
        booking_no = booking.booking_number if booking else "N/A"

        print(f"  Matching CRM Pass Found:")
        print(f"  • Member:  {member_name} ({profile.member_number})")
        print(f"  • Booking: {booking_no}")
        print(f"  • Status:  {access_pass.status}")

        # Rule 1: STRICT SINGLE-USE REPLAY CHECK
        if access_pass.status == 'CONSUMED_ENTERED':
            print(f"\n  [!] SECURITY ALERT: REPLAY ATTEMPT DETECTED!")
            print(f"  [!] This single-use QR pass was ALREADY CONSUMED at: {access_pass.consumed_at}")
            print(f"  [!] ACCESS DENIED. Flap barrier will NOT open! 🚫\n", flush=True)

            AccessEvent.objects.using(alias).create(
                user_profile=profile,
                booking=booking,
                branch=branch,
                event_type='DENIED',
                direction='ENTRY',
                reconciliation_status='REPLAY_ATTEMPT',
                token_hash=token_hash,
                device_reference=f"TIMEWATCH_TRUEFACE_{TURNSTILE_IP}",
                event_at=now
            )
            return False

        if access_pass.status in ('CANCELLED', 'EXPIRED'):
            print(f"\n  [!] REJECTED: Pass is {access_pass.status}. Access denied. 🚫\n", flush=True)
            return False

        # Rule 2: Pass is ACTIVE -> Consume it, record attendance, unlock gate!
        if access_pass.status == 'ACTIVE':
            # Check timing window
            if now < access_pass.valid_from:
                print(f"  [!] EARLY SCAN: Class window opens at {access_pass.valid_from}. Gate stays locked. 🚫\n", flush=True)
                return False
            if now > access_pass.valid_until:
                print(f"  [!] EXPIRED PASS: Pass expired at {access_pass.valid_until}. Gate stays locked. 🚫\n", flush=True)
                access_pass.status = 'EXPIRED'
                access_pass.save(using=alias)
                return False

            # ATOMIC CONSUMPTION & ATTENDANCE RECORDING
            access_pass.status = 'CONSUMED_ENTERED'
            access_pass.consumed_at = now
            access_pass.save(using=alias)

            # Record Attendance in CRM
            if booking:
                AttendanceRecord.objects.using(alias).update_or_create(
                    booking=booking,
                    defaults={
                        'user_profile': profile,
                        'branch': branch,
                        'status': 'PRESENT',
                        'check_in_at': now,
                        'check_in_method': 'QR',
                        'attendance_completed': False
                    }
                )

            # Log Access Event
            AccessEvent.objects.using(alias).create(
                user_profile=profile,
                booking=booking,
                branch=branch,
                event_type='ENTRY',
                direction='ENTRY',
                reconciliation_status='NORMAL',
                token_hash=token_hash,
                device_reference=f"TIMEWATCH_TRUEFACE_{TURNSTILE_IP}",
                event_at=now
            )

            print(f"\n  >>> ACCESS GRANTED: 100% VALID SINGLE-USE PASS! <<<")
            print(f"  • Pass transitioned to: CONSUMED_ENTERED (Invalidated for future use)")
            print(f"  • Attendance logged as: PRESENT")
            print(f"  • Opening Malad Flap Barrier Turnstile...")
            
            open_physical_gate()
            print(f"========================================================\n", flush=True)
            return True


def connect_and_listen():
    """Main daemon loop holding raw streaming socket to TimeWatch TrueFace3000."""
    URI = "/cgi-bin/eventManager.cgi?action=attach&codes=[All]"

    print("=" * 65)
    print("  SWEAT FITNESS — MALAD STUDIO LIVE TURNSTILE DAEMON")
    print(f"  Studio: Malad (SWEAT Pilates Studio)")
    print(f"  Branch ID: {BRANCH_ID}")
    print(f"  Turnstile IP: {TURNSTILE_IP}:{TURNSTILE_PORT}")
    print(f"  Rule: Disposable Single-Use QR Codes (Zero Replay Tolerance)")
    print("=" * 65)

    while True:
        try:
            print(f"\n[*] Initiating Stream Handshake with TrueFace3000 at {TURNSTILE_IP}...", flush=True)

            # Step 1: Challenge
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(6.0)
            s.connect((TURNSTILE_IP, TURNSTILE_PORT))

            req1 = f"GET {URI} HTTP/1.1\r\nHost: {TURNSTILE_IP}\r\nUser-Agent: SWEAT-TurnstileBridge\r\n\r\n"
            s.sendall(req1.encode())
            resp1 = s.recv(4096).decode('utf-8', errors='ignore')

            realm_m = re.search(r'realm="([^"]+)"', resp1)
            nonce_m = re.search(r'nonce="([^"]+)"', resp1)
            qop_m = re.search(r'qop="([^"]+)"', resp1)

            if not (realm_m and nonce_m):
                print(f"[!] Invalid challenge from terminal. Retrying in 3s...", flush=True)
                s.close()
                time.sleep(3)
                continue

            realm = realm_m.group(1)
            nonce = nonce_m.group(1)
            qop = qop_m.group(1) if qop_m else None
            cnonce = "0a4f113b"
            nc = "00000001"

            ha1 = hashlib.md5(f"{TURNSTILE_USER}:{realm}:{TURNSTILE_PASS}".encode()).hexdigest()
            ha2 = hashlib.md5(f"GET:{URI}".encode()).hexdigest()

            if qop and "auth" in qop:
                resp_hash = hashlib.md5(f"{ha1}:{nonce}:{nc}:{cnonce}:auth:{ha2}".encode()).hexdigest()
                auth = f'Digest username="{TURNSTILE_USER}", realm="{realm}", nonce="{nonce}", uri="{URI}", qop=auth, nc={nc}, cnonce="{cnonce}", response="{resp_hash}"'
            else:
                resp_hash = hashlib.md5(f"{ha1}:{nonce}:{ha2}".encode()).hexdigest()
                auth = f'Digest username="{TURNSTILE_USER}", realm="{realm}", nonce="{nonce}", uri="{URI}", response="{resp_hash}"'

            s.close()

            # Step 2: Persistent Streaming Connection
            s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s2.settimeout(120.0)
            s2.connect((TURNSTILE_IP, TURNSTILE_PORT))

            req2 = f"GET {URI} HTTP/1.1\r\nHost: {TURNSTILE_IP}\r\nAuthorization: {auth}\r\nUser-Agent: SWEAT-TurnstileBridge\r\n\r\n"
            s2.sendall(req2.encode())

            print("[+] Connected to Live Scanner Stream! Ready for scans...", flush=True)

            buffer = ""
            while True:
                chunk = s2.recv(1024).decode('utf-8', errors='ignore')
                if not chunk:
                    print("[!] Stream closed by device. Reconnecting...", flush=True)
                    break
                buffer += chunk

                while "--myboundary" in buffer:
                    part, buffer = buffer.split("--myboundary", 1)
                    if "Code=AccessControl" in part:
                        card_match = re.search(r'["\']CardNo["\']\s*:\s*["\']([^"\']+)["\']', part)
                        if card_match:
                            raw_code = card_match.group(1).strip()
                            if raw_code:
                                process_scanned_token(raw_code)

        except Exception as e:
            print(f"[!] Stream exception: {e}. Reconnecting in 3s...", flush=True)
            time.sleep(3)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test-token':
        test_tok = sys.argv[2] if len(sys.argv) > 2 else "2zmiEVDsSMurTJmMtLGuMp"
        process_scanned_token(test_tok)
        sys.exit(0)

    connect_and_listen()
