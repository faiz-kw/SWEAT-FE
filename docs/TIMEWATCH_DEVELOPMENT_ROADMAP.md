# Engineering Roadmap: TimeWatch Turnstile System (Standalone / Without CRM)

**Document ID:** ROADMAP-TW-AC-2026-V1  
**Target System:** Standalone Access Control & Hardware Verification Engine  
**Release Cycle:** Production Rollout & Post-Launch Hardening  

---

## Priority Framework (P0 - P3)

```
   [ P0: Immediate Go-Live ] -----> Hardware webhook configuration & bench scan
              |
              v
   [ P1: Security & Resiliency ] -> Shared secret authentication & Edge offline failover
              |
              v
   [ P2: Operational Visibility ] -> Turnstile telemetry dashboard & device health heartbeat
              |
              v
   [ P3: Advanced Capabilities ] -> Biometric face template synchronization & multi-gate zoning
```

---

## Detailed Task Breakdown

### Priority 0: Immediate Deployment & Go-Live (Current Sprint)

#### TASK-P0-01: Configure Remote Webhook on Physical TimeWatch Terminal
- **Priority:** **P0 (Blocker for Physical Unattended Operation)**
- **Description:** The TimeWatch TrueFace3000 terminal at the studio must be switched from `Local` protocol mode to `Remote/Cloud Webhook` mode. The technician must set the cloud URL: `https://api.sweatfitwellness.com/api/v1/tenant/access/turnstile/verify-punch/`.
- **Affected Components:** Device Web Management UI / TimeWatch Cloud Server Settings.
- **Dependencies:** TimeWatch hardware vendor or on-site deployment engineer.
- **Verification Steps:**
  1. Save endpoint in device web interface.
  2. Scan test pass `SWEAT_TEST_BENCH_PASS_001` on the physical camera.
  3. Verify green relay LED illuminates and turnstile arm unlocks for 5 seconds.
  4. Inspect server logs to confirm receipt of device serial number and timestamp.
- **Estimated Effort:** 30 minutes (on-site or remote device admin).

#### TASK-P0-02: End-to-End Real Member Ingress Validation
- **Priority:** **P0 (Critical Verification)**
- **Description:** Create a live test booking in the studio schedule, generate the member's QR pass via the member portal, scan the phone at the physical turnstile, and verify entry.
- **Affected Files:**
  - `src/components/member-portal/WebMemberPortalWorkspace.tsx`
  - `backend/apps/tenant_core/views_bookings.py`
- **Dependencies:** Successful completion of `TASK-P0-01`.
- **Verification Steps:**
  1. Open member portal on smartphone.
  2. Display QR code pass 10 minutes prior to test class.
  3. Scan at turnstile.
  4. Gate unlocks; database creates `AttendanceRecord` marked `PRESENT`.
  5. Attempt immediate second scan on same phone $\rightarrow$ Gate stays locked, emits error beep, logs `REPLAY_ATTEMPT`.
- **Estimated Effort:** 1 hour.

---

### Priority 1: Security Hardening & Edge Resiliency (Next Sprint)

#### TASK-P1-01: Device Secret Token / IP Allowlisting on Verify Endpoint
- **Priority:** **P1 (High)**
- **Description:** Protect the `TurnstileVerifyPunchView` against public DDoS or unauthorized simulation by enforcing either a shared header secret (`X-Device-Secret: <TOKEN>`) or an IP allowlist restricting inbound requests to studio broadband static IPs.
- **Affected Files:**
  - `backend/apps/tenant_core/views_bookings.py` (L1381)
  - `backend/config/settings.py`
- **Dependencies:** Confirmation of studio static IP addresses or device custom header capability.
- **Verification Steps:**
  1. Requests without matching device secret return HTTP `403 Forbidden`.
  2. Authorized device punches receive instant HTTP `200 OK`.
- **Estimated Effort:** 4 hours.

#### TASK-P1-02: Automated Offline Edge Failover Daemon (Mode B Packaging)
- **Priority:** **P1 (High)**
- **Description:** If studio internet connectivity is unreliable, package the lightweight C# .NET Edge Service into a self-healing Windows Service. The service polls `GET /api/v1/access-control/sync/` every 5 minutes to cache daily hashes in memory, answering Dahua NetSDK events locally in $< 50\text{ms}$ during cloud outages, and syncing offline events back via `POST /api/v1/access-control/events/bulk/` upon reconnection.
- **Affected Files:**
  - `backend/apps/tenant_core/views_bookings.py` (L1230-L1338)
  - `edge_service/` (Local C# project directory)
- **Dependencies:** Dedicated front-desk mini PC at studio.
- **Verification Steps:**
  1. Disconnect studio router WAN cable.
  2. Present active member QR pass $\rightarrow$ Edge daemon validates hash from memory and triggers relay in $< 50\text{ms}$.
  3. Reconnect WAN cable $\rightarrow$ Edge daemon flushes recorded punches to cloud.
- **Estimated Effort:** 2 days.

---

### Priority 2: Operational Visibility & Device Health (Sprint +2)

#### TASK-P2-01: Admin Turnstile Telemetry & Live Access Monitor
- **Priority:** **P2 (Medium)**
- **Description:** Build a real-time turnstile monitoring widget in the staff operations view displaying live ingress/egress activity, recent gate unlock decisions, and anti-passback rejection alerts.
- **Affected Files:**
  - `src/components/operations/TurnstileOperationsMonitor.tsx` (New component)
  - `backend/apps/tenant_core/views_bookings.py`
- **Dependencies:** `AccessEvent` model.
- **Verification Steps:**
  1. Trigger test scan at turnstile.
  2. Operations dashboard updates within 1 second via WebSocket or polling, showing member avatar, name, and unlock status.
- **Estimated Effort:** 1.5 days.

#### TASK-P2-02: Terminal Heartbeat & Keepalive Health Monitoring
- **Priority:** **P2 (Medium)**
- **Description:** Implement a periodic ping/heartbeat endpoint (`POST /api/v1/tenant/access/turnstile/heartbeat/`) that records device online status, hardware temperature, memory usage, and optical reader status. If a terminal fails to report for $> 5$ minutes, an automated alert is triggered for studio managers.
- **Affected Files:**
  - `backend/apps/tenant_core/models_attendance.py` (New `AccessDevice` table)
  - `backend/apps/tenant_core/views_bookings.py`
- **Dependencies:** Device cron or heartbeat scheduler.
- **Verification Steps:**
  1. Turn off device power.
  2. Verify system raises alert "Turnstile Offline at SWEAT Malad" after 5 minutes.
- **Estimated Effort:** 1 day.

---

### Priority 3: Advanced Hardware Capabilities (Future Quarters)

#### TASK-P3-01: Biometric Face Template Synchronization
- **Priority:** **P3 (Low / Enhancement)**
- **Description:** Extend access control to support facial recognition entry without smartphones. When a member enrolls their photo during onboarding, convert and push the facial feature vector directly to the TimeWatch TrueFace3000 via Dahua NetSDK (`CLIENT_StartFindFaceInfo` / `CLIENT_DoFindFaceInfo`).
- **Affected Files:**
  - `backend/apps/tenant_core/services_biometrics.py`
  - On-site Edge Daemon.
- **Dependencies:** Dahua NetSDK binary libraries and high-resolution member selfie images.
- **Verification Steps:**
  1. Member enrolls photo.
  2. Member walks up to turnstile without phone $\rightarrow$ Terminal recognizes face and unlocks gate.
- **Estimated Effort:** 5 days.

#### TASK-P3-02: Multi-Zone Anti-Passback & Turnstile Interlocking
- **Priority:** **P3 (Low / Multi-Gate)**
- **Description:** For larger multi-level fitness clubs with separate gym floor, locker room, and reformer studio gates, enforce zone-based access control rules preventing a user from entering Zone B without having first passed Zone A.
- **Affected Files:**
  - `backend/apps/tenant_core/models_attendance.py`
  - `backend/apps/tenant_core/services_bookings.py`
- **Dependencies:** Multiple turnstile devices installed per branch.
- **Verification Steps:**
  1. Attempt to scan into reformer room without checking in at main gate $\rightarrow$ System rejects with `ZONE_SEQUENCE_VIOLATION`.
- **Estimated Effort:** 3 days.

---

## Summary Roadmap Schedule

| Milestone | Target Horizon | Core Deliverable | Primary Owner |
| :--- | :--- | :--- | :--- |
| **Milestone 1** | Immediate (Day 1) | Webhook URL input on hardware terminal & bench scan | TimeWatch Vendor / Technician |
| **Milestone 2** | Immediate (Day 2) | Full live member test (entry $\rightarrow$ workout $\rightarrow$ exit) | QA Lead & Studio Operations |
| **Milestone 3** | Sprint +1 | Device secret authentication & IP allowlisting | Backend Lead |
| **Milestone 4** | Sprint +2 | Live Turnstile Telemetry Monitoring Dashboard | Frontend Lead |
| **Milestone 5** | Future | Biometric Facial Recognition via NetSDK | Systems Architect |
