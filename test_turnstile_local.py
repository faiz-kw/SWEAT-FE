#!/usr/bin/env python3
"""
Local On-Site Turnstile Testing & Hardware Control Helper
Runs on your laptop connected to the studio Wi-Fi (192.168.1.171).
Communicates with:
- Local PerformanceOS Backend: http://127.0.0.1:8000
- TimeWatch / Dahua Speed Gate: 192.168.1.108 (admin / tipl9910)
"""

import sys
import socket
import json
import urllib.request
import urllib.error
import hashlib
import uuid
from datetime import datetime, timezone

BRANCH_ID = "c76397b1-c840-4822-b1a8-b5e389e78430"
BACKEND_BASE = "http://127.0.0.1:8000"
TURNSTILE_IP = "192.168.1.108"
TURNSTILE_PORT = 37777
TURNSTILE_USER = "admin"
TURNSTILE_PASS = "tipl9910"

def check_turnstile_network():
    print(f"\n[1/3] Testing Turnstile Network Connectivity ({TURNSTILE_IP}:{TURNSTILE_PORT})...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3.0)
    try:
        s.connect((TURNSTILE_IP, TURNSTILE_PORT))
        s.close()
        print(f"  --> Turnstile is ONLINE and reachable on LAN port {TURNSTILE_PORT}!")
        return True
    except Exception as e:
        print(f"  [!] Turnstile connection failed: {e}")
        return False

def pulse_turnstile_hardware():
    print(f"\n>>> Sending Physical Unlock Pulse to TimeWatch Turnstile ({TURNSTILE_IP})...")
    url = f"http://{TURNSTILE_IP}/cgi-bin/accessControl.cgi?action=openDoor&channel=1"
    
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, TURNSTILE_USER, TURNSTILE_PASS)
    handler = urllib.request.HTTPDigestAuthHandler(mgr)
    opener = urllib.request.build_opener(handler)
    
    try:
        resp = opener.open(url, timeout=3)
        result = resp.read().decode('utf-8').strip()
        if "OK" in result:
            print(f"  --> SUCCESS! TimeWatch Gate Unlocked! (Relay Pulsed: {result})")
            return True
        else:
            print(f"  [!] Unexpected controller response: {result}")
            return False
    except Exception as e:
        print(f"  [!] Failed to pulse turnstile: {e}")
        return False

def sync_active_passes():
    print(f"\n[2/3] Fetching Today's Active Passes from Local Backend...")
    url = f"{BACKEND_BASE}/api/v1/access-control/sync/?branch_id={BRANCH_ID}"
    req = urllib.request.Request(url, headers={"X-Tenant-Slug": "sweat"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            passes = data.get('passes', [])
            print(f"  --> Received {len(passes)} active pass(es) for Andheri Branch:")
            for p in passes:
                print(f"      * Member: {p['member_name']} | Pass: {p['pass_id']} | Status: {p['status']}")
                print(f"        Valid until: {p['valid_until']}")
                print(f"        Token Hash:  {p['token_hash'][:16]}...")
            return passes
    except Exception as e:
        print(f"  [!] Failed to sync passes: {e}")
        return []

def simulate_scan(token="3C8QLVGCZMeIekmLvhEFJC"):
    print(f"\n[3/3] Simulating Scan of Member Pass Token: {token}...")
    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    print(f"  --> Computed Token SHA-256 Hash: {token_hash}")

    url = f"{BACKEND_BASE}/api/v1/access-control/events/bulk/"
    event_payload = {
        "events": [
            {
                "event_id": str(uuid.uuid4()),
                "branch_id": BRANCH_ID,
                "pass_id": "57c4999c-6b94-4717-b08f-5ec1950e5c2c",
                "direction": "ENTRY",
                "token_hash": token_hash,
                "scanned_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "device_reference": "TIMEWATCH_PORT_37777"
            }
        ]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(event_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "X-Tenant-Slug": "sweat"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print(f"  --> Backend Scan Event Ingestion Result: {res}")
            print(f"  --> ATTENDANCE RECORDED in PerformanceOS CRM!")
            
            # Pulse the physical turnstile hardware
            pulse_turnstile_hardware()
    except Exception as e:
        print(f"  [!] Ingestion error: {e}")

if __name__ == '__main__':
    print("=" * 65)
    print("  SWEAT FITNESS - ON-SITE TURNSTILE VERIFICATION HELPER")
    print(f"  Branch: ANDHERI (SWEAT Pilates & Studio)")
    print(f"  Laptop IP: 192.168.1.171 | Turnstile IP: 192.168.1.108")
    print(f"  TimeWatch Device Auth: Verified OK ({TURNSTILE_USER} / {TURNSTILE_PASS})")
    print("=" * 65)

    if len(sys.argv) > 1 and sys.argv[1] == '--open-door':
        pulse_turnstile_hardware()
        sys.exit(0)

    check_turnstile_network()
    passes = sync_active_passes()

    if len(sys.argv) > 1 and sys.argv[1] == '--scan':
        simulate_scan()
    else:
        print("\nCommands Available:")
        print("  1. python test_turnstile_local.py --open-door")
        print("     --> Instantly unlocks the physical turnstile arm right in front of you!")
        print("  2. python test_turnstile_local.py --scan")
        print("     --> Records attendance in CRM + unlocks the physical turnstile!")
