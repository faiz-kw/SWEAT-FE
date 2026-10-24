#!/usr/bin/env python3
"""
SWEAT On-Site Turnstile Real-Time Event Bridge Daemon
Runs locally on studio network:
- Subscribes to Dahua / TimeWatch speed gate event stream at 192.168.1.108
- When turnstile camera scans a member's QR code or RFID card:
  - Validates pass dynamically against local PerformanceOS CRM (/api/v1/access-control/events/bulk/)
  - If valid: pulses turnstile hardware to unlock flaps and records attendance as PRESENT
  - If re-scan / replay / invalid: refuses unlock command so gate stays LOCKED
  - Reflects in Client 360 Admin Panel in real time!
"""

import sys
import time
import json
import uuid
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone

BRANCH_ID = "c76397b1-c840-4822-b1a8-b5e389e78430"
BACKEND_URL = "http://127.0.0.1:8000/api/v1/access-control/events/bulk/"
TURNSTILE_IP = "192.168.1.108"
TURNSTILE_USER = "admin"
TURNSTILE_PASS = "tipl9910"

# Debounce to prevent multiple physical reads within 3 seconds for the exact same token
last_processed_token = None
last_processed_time = 0
DEBOUNCE_SECONDS = 3.0

def open_turnstile_gate():
    """Sends physical relay pulse to Dahua/TimeWatch turnstile controller over LAN."""
    url = f"http://{TURNSTILE_IP}/cgi-bin/accessControl.cgi?action=openDoor&channel=1"
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, TURNSTILE_USER, TURNSTILE_PASS)
    handler = urllib.request.HTTPDigestAuthHandler(mgr)
    opener = urllib.request.build_opener(handler)
    try:
        resp = opener.open(url, timeout=3)
        res = resp.read().decode('utf-8').strip()
        print(f"  --> [GATE HARDWARE] Unlock relay pulsed successfully: {res}", flush=True)
        return True
    except Exception as e:
        print(f"  [!] Failed to pulse turnstile relay: {e}", flush=True)
        return False

def send_attendance_to_crm(card_no: str, direction: str = "ENTRY"):
    global last_processed_token, last_processed_time
    now = time.time()
    if card_no == last_processed_token and (now - last_processed_time < DEBOUNCE_SECONDS):
        print(f"[*] Debounced duplicate read for {card_no} within {DEBOUNCE_SECONDS}s.", flush=True)
        return False
    last_processed_token = card_no
    last_processed_time = now

    event_payload = {
        "events": [
            {
                "event_id": str(uuid.uuid4()),
                "branch_id": BRANCH_ID,
                "direction": direction,
                "raw_token": card_no,
                "device_reference": f"TIMEWATCH_{direction}_{TURNSTILE_IP}",
                "scanned_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "reconciliation_status": "NORMAL"
            }
        ]
    }

    req = urllib.request.Request(
        BACKEND_URL,
        data=json.dumps(event_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "X-Tenant-Slug": "sweat"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            
            is_approved = False
            reconciliation = "UNKNOWN"
            for r in results:
                status = r.get('status')
                event_type = r.get('event_type')
                reconciliation = r.get('reconciliation_status', 'NORMAL')
                if status == 'PROCESSED' and event_type in ('ENTRY', 'EXIT'):
                    is_approved = True
                    break

            print(f"\n========================================================")
            print(f"  >>> SCAN PROCESSED BY CRM <<<")
            print(f"  Scanned Token / Payload: {card_no}")
            print(f"  Direction: {direction}")
            print(f"  Reconciliation: {reconciliation}")
            print(f"  Backend Ingest Response: {data}")

            if is_approved:
                print(f"  --> VALID ACCESS! Pulsing Turnstile Gate Open...")
                open_turnstile_gate()
            else:
                print(f"  [!] ACCESS DENIED ({reconciliation})! Gate stays LOCKED.")
            print(f"========================================================\n", flush=True)
            return is_approved
    except Exception as e:
        print(f"[!] Error forwarding event to CRM: {e}", flush=True)
        return False

def listen_loop():
    url = f"http://{TURNSTILE_IP}/cgi-bin/eventManager.cgi?action=attach&codes=[All]"
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, TURNSTILE_USER, TURNSTILE_PASS)
    handler = urllib.request.HTTPDigestAuthHandler(mgr)
    opener = urllib.request.build_opener(handler)

    print("=" * 65)
    print("  SWEAT TIMEWATCH LIVE TURNSTILE EVENT BRIDGE")
    print(f"  Listening to Turnstile: {TURNSTILE_IP}:80 / 37777")
    print(f"  Forwarding to CRM: {BACKEND_URL}")
    print("  Zero hardcoding: Pure dynamic QR token validation via CRM")
    print("=" * 65)

    while True:
        try:
            print(f"\n[*] Connecting to Turnstile Event Stream ({url})...", flush=True)
            with opener.open(url, timeout=300) as resp:
                print(f"[+] Connected! Ready for live member scans at the turnstile...\n", flush=True)
                buffer = b""
                while True:
                    chunk = resp.read(256)
                    if not chunk:
                        break
                    buffer += chunk
                    while b"\r\n\r\n" in buffer or b"\n\n" in buffer:
                        sep = b"\r\n\r\n" if b"\r\n\r\n" in buffer else b"\n\n"
                        part, buffer = buffer.split(sep, 1)
                        decoded = part.decode('utf-8', errors='ignore').strip()
                        if not decoded or "Code=" not in decoded:
                            continue

                        # Process ONLY real AccessControl events from the optical camera / RFID reader
                        if "Code=AccessControl" in decoded:
                            card_match = re.search(r'["\']CardNo["\']\s*:\s*["\']([^"\']+)["\']', decoded)
                            if card_match:
                                card = card_match.group(1).strip()
                                if card:
                                    dir_match = re.search(r'["\']Direction["\']\s*:\s*["\']?(\d+)["\']?', decoded)
                                    direction = "EXIT" if (dir_match and dir_match.group(1) == "1") else "ENTRY"
                                    print(f"\n[DAHUA SCAN EVENT DETECTED] Scanned Code: {card} | Direction: {direction}")
                                    send_attendance_to_crm(card_no=card, direction=direction)

        except Exception as e:
            print(f"[!] Stream disconnected ({e}). Reconnecting in 3s...", flush=True)
            time.sleep(3)

if __name__ == '__main__':
    listen_loop()
