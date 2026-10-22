# SWEAT TimeWatch / Dahua Turnstile Edge Service

High-speed, offline-survivable access control edge service for gym front desk PCs. Interfaces with Dahua / TimeWatch smart turnstile controllers via local LAN and synchronizes with the SWEAT Multi-Tenant CRM running on **NeevCloud** (`https://fitness.vibecopilot.ai`).

---

## 1. System Architecture

```
                                  [ NeevCloud Production CRM ]
                                    https://fitness.vibecopilot.ai
                                              ▲         │
                           Bulk Ingest Events │         │ Active Passes Delta
                      (POST .../events/bulk/) │         │ (GET .../sync/?branch_id=...)
                                              │         ▼
┌─────────────────────────────────────────────┴─────────┴───────────────────────────────────────────┐
│ FRONT DESK WINDOWS PC (.NET 8 Background Windows Service)                                         │
│                                                                                                   │
│   ┌───────────────────────────┐                     ┌───────────────────────────┐                 │
│   │   passes.db (SQLite)      │                     │   outbox.db (SQLite)      │                 │
│   │   - 128-bit SHA-256 Hash  │                     │   - Scanned events queue  │                 │
│   │   - Validity window       │                     │   - Offline survivability │                 │
│   │   - Single-use state      │                     │   - Retries until acked   │                 │
│   └─────────────▲─────────────┘                     └─────────────▲─────────────┘                 │
│                 │                                                 │                               │
│                 └─────────────────┐             ┌─────────────────┘                               │
│                                   │             │                                                 │
│                        [ TurnstileWorker: <10ms Decision ]                                        │
│                                   │             │                                                 │
│                                   ▼             ▼                                                 │
│               [ Dahua NetSDK P/Invoke Interop (dhnetsdk.dll) ]                                    │
└───────────────────────────────────┬─────────────┬─────────────────────────────────────────────────┘
                                    │             │ Local LAN (TCP 37777)
               QR Scan Callback (8ms)│             │ Pulse Relay (SDK_CTRL_ACCESS_OPEN)
                                    ▼             ▼
                 ┌───────────────────────────────────────────────────┐
                 │    TimeWatch / Dahua Turnstile Controller         │
                 │    - IP: 192.168.1.108:37777                      │
                 │    - Optical Barcode/QR Reader (szCardNo)         │
                 │    - 22-char Base62 Token (128-bit CSPRNG)        │
                 └───────────────────────────────────────────────────┘
```

---

## 2. Prerequisites on Front Desk Windows PC

1. **Operating System:** Windows 10 / 11 / Server 2022 (x64)
2. **.NET Runtime:** [.NET 8.0 Runtime (x64)](https://dotnet.microsoft.com/download/dotnet/8.0)
3. **Turnstile Network:** Local Ethernet connection to turnstile controller on subnet `192.168.1.0/24`.
4. **Dahua SDK DLLs:** Place `dhnetsdk.dll`, `dhplay.dll`, and `dhconfigsdk.dll` into the service root folder (or alongside `Sweat.EdgeService.exe`).

---

## 3. Configuration (`appsettings.json`)

```json
{
  "EdgeConfig": {
    "BranchId": "f2a7b8c9-0000-0000-0000-000000000001",
    "NeevCloudBaseUrl": "https://fitness.vibecopilot.ai",
    "ApiKey": "YOUR_GYM_EDGE_API_KEY",
    "SyncIntervalSeconds": 30,
    "OfflineGraceHours": 24,
    "DataDirectory": "C:\\ProgramData\\SweatEdge\\data"
  },
  "Turnstile": {
    "IpAddress": "192.168.1.108",
    "Port": 37777,
    "Username": "admin",
    "Password": "admin_password",
    "DoorChannel": 0,
    "UnlockPulseMs": 3000,
    "SimulateHardware": false
  }
}
```

---

## 4. Compilation & Publishing

Run from the `edge_service/` directory:

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o C:\SweatEdgeService
```

---

## 5. Installing as a Windows Service

Open PowerShell as **Administrator**:

```powershell
# 1. Create the Windows Service
sc.exe create SweatEdgeService binPath= "C:\SweatEdgeService\Sweat.EdgeService.exe" start= auto DisplayName= "SWEAT Turnstile Edge Service"

# 2. Configure Failure Recovery (Auto-restart on crash)
sc.exe failure SweatEdgeService reset= 86400 actions= restart/5000/restart/10000/restart/60000

# 3. Start the Service
sc.exe start SweatEdgeService

# 4. Check Status
sc.exe query SweatEdgeService
```

---

## 6. Physical Gate 0 Verification Test Plan

| Step | Action | Expected Hardware Result | Edge Service Log | Cloud Audit Log |
|---|---|---|---|---|
| **1. Baseline Entry** | Member scans valid 22-char Base62 QR at turnstile | Relay clicks, green LED turns ON, turnstile unlocks for 3s | `[ACCESS GRANTED] Relay unlocked for Maya Sen` | `AttendanceRecord` created, status `PRESENT` |
| **2. Anti-Replay** | Second person immediately tries scanning the same QR screenshot | Turnstile stays locked, red LED flashes | `>>> [ACCESS DENIED] Status=REPLAY_ATTEMPT` | Logged as `DENIED`, `REPLAY_ATTEMPT` |
| **3. Offline Survivability** | Disconnect gym WAN broadband router cable | Turnstile continues unlocking for valid cached passes | `[CLOUD SYNC] Outbox push failed (offline/network unavailable)` | Events queued in `outbox.db` |
| **4. Auto-Reconciliation** | Reconnect gym WAN broadband router cable | Turnstile continues normal operation | `[CLOUD SYNC] Successfully synced X events to NeevCloud.` | All queued events backfilled with original `scanned_at` timestamp |
| **5. Exit Turnstile** | Member scans at exit reader when leaving studio | Exit turnstile unlocks | `>>> [ACCESS GRANTED] Exit registered` | `check_out_at` recorded, attendance marked completed |
