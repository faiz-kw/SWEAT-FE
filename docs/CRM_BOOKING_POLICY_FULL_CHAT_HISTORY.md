# SWEAT CRM Booking Policy System & Testing Playbook

> **Conversation ID:** `055e1c6b-9f1f-4982-a5ee-ea91e88bb740`  
> **Total Conversational Turns:** 4

---

### 👤 User (Step 0)

```text
Please analyze our CRM’s Booking Policy module in complete detail, assuming I am the Sweat Owner, Mahek is the Sweat Owner, and I am Faiz, a Member.

Review the attached image carefully and explain the entire booking policy system from every available view, including all rules, settings, permissions, workflows, and configurations.

Please cover the following points in detail:

Complete Booking Policy Explanation: Explain every booking policy rule, what it does, why it exists, how it works, and how it affects the booking process.
Role-Based Access and Permissions: Explain the system from both perspectives:
Sweat Owner (Mahek): What can the owner view, create, edit, configure, enable, disable, or manage?
Member (Faiz): What can a member view, access, book, modify, or cancel? Which actions should be restricted?
UI Configuration: Determine whether booking policies can be configured directly through the UI. Identify which settings are editable, which are fixed, and whether any configuration options are missing.
Backend Integration: Verify whether the booking policies are properly connected to the backend and database. Explain whether changes made in the UI are persisted, whether the backend enforces the rules, and whether the booking flow actually respects the configured policies.
View-by-View Analysis: Review every relevant screen, page, tab, modal, form, and settings view. Explain the purpose of each component and how it interacts with the booking policy system.
Issues and Missing Functionality: Identify bugs, incorrect behavior, inconsistent UI elements, missing validations, permission issues, incomplete implementations, and any frontend or backend integration problems.
Security and Business Logic: Check whether members can bypass booking restrictions, access owner-only settings, or perform unauthorized actions. Verify that critical booking rules are enforced on the backend rather than relying only on frontend validation.
Enhancement Recommendations: Suggest improvements to the UI/UX
<truncated 1061 bytes>
, and items that require further investigation.
Explain everything in simple, practical language, as if you were guiding me through the CRM as both the owner and the member.
Provide concrete examples using Mahek as the Sweat Owner and Faiz as the Member to demonstrate how each rule should behave.
Finish with a prioritized list of recommended fixes and enhancements, starting with critical security and booking-integrity issues.

The goal is to understand the entire Booking Policy system, its configuration capabilities, role-based behavior, backend integration, current problems, and the improvements needed to make it reliable and production-ready.
```

---

### 🤖 Antigravity Assistant (Step 118)

# Deep-Dive Technical & Operational Audit: SWEAT CRM Booking Policy System

---

## Executive Summary & System Overview

The SWEAT CRM Booking Policy system controls how class capacity is filled, protected, and monetized across studios. In this audit, we analyze the platform through two defined personas:
* **Mahek (Sweat Owner / Studio Executive)**: Sets policies, defines cancellation windows, manages financial penalties, overrides capacities, and monitors studio operations.
* **Faiz (Member #MEM-978E4D)**: Holds an active *"Sweat Pilates - 36 Sessions (Quarterly)"* contract with 36 credits at the Andheri Studio, booking workouts and managing reservations via the Member Web Portal.

Our inspection of the codebase across the frontend ([`ConfigurationWorkspace.tsx`](file:///F:/fitness-command-center/src/components/admin/ConfigurationWorkspace.tsx), [`BookingsWorkspace.tsx`](file:///F:/fitness-command-center/src/components/bookings/BookingsWorkspace.tsx), [`WebMemberPortalWorkspace.tsx`](file:///F:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx)) and backend ([`models_bookings.py`](file:///F:/fitness-command-center/backend/apps/tenant_core/models_bookings.py), [`services_booking_policy.py`](file:///F:/fitness-command-center/backend/apps/tenant_core/services_booking_policy.py), [`services_bookings.py`](file:///F:/fitness-command-center/backend/apps/tenant_core/services_bookings.py), [`views_bookings.py`](file:///F:/fitness-command-center/backend/apps/tenant_core/views_bookings.py), [`views_mobile.py`](file:///F:/fitness-command-center/backend/apps/tenant_core/views_mobile.py)) reveals a **dual-architecture system**:
1. **Administrative Business Configuration (`BookingPolicyConfig`)**: Controls auto-cancellation timers, cancellation/rescheduling deadlines, session credit consumption rules, late penalty fines, and notification channels.
2. **Granular Operational Policies (`BookingPolicySet` & `AttendancePolicySet`)**: Controls versioned FIFO waitlists, booking windows, attendance strik
<truncated 22324 bytes>
match the backend enum:
     ```typescript
     { id: "MEMBER", label: "Group Fitness Classes (Members)" },
     { id: "TRIAL", label: "Intro Trials" },
     { id: "PAY_PER_USE", label: "Drop-in Pay Per Use" },
     { id: "WALK_IN", label: "Front Desk Walk-ins" },
     ```
2. **Lock Down API Endpoint Security**:
   * In [`views_bookings.py:1223`](file:///F:/fitness-command-center/backend/apps/tenant_core/views_bookings.py#L1223), add strict permissions:
     ```python
     class BookingPolicyViewSet(viewsets.ViewSet):
         permission_classes = [RequireActiveTenantAndOrg, TenantRBACPermission]
         required_module = 'ops'
         required_submodule = 'bookings'
         required_permission = 'ops.bookings.edit'
     ```

#### Phase 2: Unify Booking Policy Data Models (Sprint 1)
3. **Bridge `BookingPolicyConfig` & `BookingPolicySet`**:
   * Update [`BookingPolicyService.save_policy`](file:///F:/fitness-command-center/backend/apps/tenant_core/services_booking_policy.py#L142) to automatically update or create the active default `BookingPolicySet`, ensuring `max_upcoming_bookings` and `max_reschedules` remain identical across both tables.
4. **Dynamic Passbook Display**:
   * Replace the hardcoded string in [`WebMemberPortalWorkspace.tsx:4849`](file:///F:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx#L4849) with the dynamic property from the active policy:
     ```tsx
     <span className="font-semibold text-foreground">
       Free refund up to {effectivePolicy?.cancellation_cutoff_hours || 2} hours prior to class commencement
     </span>
     ```

#### Phase 3: Operational Monitoring & Automation (Sprint 2)
5. **Verify Celery Beat Scheduler**:
   * Ensure `run_booking_auto_cancellation_task` runs on a 1-minute or 5-minute recurring cron in `celery.py` so Mahek never has to manually click "Run Auto-Cancel Check".
6. **Owner Audit Notification**:
   * Dispatch an automated WhatsApp/Email notification to Mahek when a class hits 100% capacity and waitlist begins accumulating.

---

### 👤 User (Step 176)

```text
Act as a Senior QA Engineer, SaaS Platform Architect, and Product Security Specialist with 20+ years of experience. I want you to create a complete, step-by-step testing guide for our CRM’s Booking Policy module, covering every rule, navigation path, user interaction, permission, and backend behavior from both the Member and Admin/Owner perspectives.

My goal is to personally test every feature and verify that the entire booking policy system works correctly, securely, and consistently.

1. Map the Entire Booking Policy Module

First, identify and document every screen, page, tab, submenu, settings panel, modal, button, dropdown, form, and navigation path related to booking policies.

Explain:

How to navigate to each screen from the beginning.
What each screen and control does.
Which actions are available to Members versus Admins/Owners.
How each screen connects to the booking workflow.
Which settings affect other screens or booking behaviors.
What the expected result should be after every action.

Do not skip hidden settings, secondary navigation paths, edge cases, or less obvious interactions.

2. Create Two Separate, Complete Testing Workflows
A. Member Testing — Faiz

Assume I am Faiz, a regular Member. Explain exactly how I should test the booking policy system without administrative privileges.

Cover:

Navigating to the booking section and viewing available booking options.
Viewing available schedules, slots, resources, or services, wherever applicable.
Attempting to book within the permitted booking window.
Testing bookings outside the allowed booking window.
Testing advance-booking limits and minimum-notice requirements.
Testing cancellation deadlines and cancellation restrictions.
Testing rescheduling rules and modification limits.
Testing booking duration, slot availability, capacity limits, and overlapping bookings.
Testing booking limits per member, day, week, or other configured period.
Testing restrictions based on membership status, role, elig
<truncated 7944 bytes>
vice.
Clearly distinguish verified functionality, failed tests, untested areas, and features that are not implemented.
Do not modify production data or perform destructive tests without explicit authorization. Use a safe test environment and test accounts wherever possible.
If you cannot access the CRM, source code, APIs, or database, tell me what access is required and provide the most useful test plan possible without pretending tests have been executed.

Final objective: Give me a complete, practical, end-to-end manual testing playbook that allows me to test every booking policy rule, every navigation path, every Member and Admin/Owner action, and every important frontend/backend interaction—so I can confidently determine what works, what fails, what is missing, and what must be fixed before the CRM is production-ready.
```

---

### 🤖 Antigravity Assistant (Step 177)

# SWEAT CRM: Booking Policy Module — Master QA Testing Playbook & Verification Guide
**Author**: Senior QA Engineer, SaaS Platform Architect & Product Security Specialist  
**Target Systems**: SWEAT Central CRM (`/admin`, `/ops`) & SWEAT Member Web Portal (`/portal` / `localhost:5173`)  
**Personas**:  
* **Admin / Studio Owner**: `Mahek` (Role: `ORG_ADMIN`, Scope: Global Studio Network)  
* **Member**: `Faiz Khan` (Member `#MEM-978E4D`, Active Contract: *Sweat Pilates - 36 Sessions (Quarterly)*, Branch: *SWEAT Andheri*)

---

## 1. Complete Module Navigation & UI Control Map

```mermaid
graph TD
    subgraph Admin_Portal["Admin / Owner Portal (Mahek)"]
        A0[Login: /admin or /ops] --> A1["Admin Navigation Sidebar"]
        A1 --> A2["Administration -> Configuration (/admin/configuration?tab=booking)"]
        A1 --> A3["Operations -> Bookings (/ops/bookings)"]
        
        A2 --> A2_1["Studio Location Dropdown (All Studios vs Branch)"]
        A2 --> A2_2["Auto-Release Unused Spots (Unpaid 15m / Unconfirmed 60m)"]
        A2 --> A2_3["Cancellation & Reschedule Deadlines (Cutoffs & Max Moves)"]
        A2 --> A2_4["Late Cancellation Rules & Penalties (Session Action & Fine ₹)"]
        A2 --> A2_5["Who Can Book & Booking Limits (Advance Days & Max Concurrent)"]
        A2 --> A2_6["Notification Channels (WhatsApp, In-App, SMS, Email)"]
        A2 --> A2_7["Run Auto-Cancel Check Button"]
        A2 --> A2_8["Save Changes Button (Header)"]

        A3 --> A3_1["Tab: Active Bookings (Roster View)"]
        A3 --> A3_2["Tab: Waitlist Queue (FIFO Roster)"]
        A3 --> A3_3["Tab: Booking Policies (1)"]
        A3_3 --> A3_4["Button: + Configure Policy Set"]
        A3_4 --> A3_5["Modal: Configure Booking Policy Set (Rules, Windows, Waitlist)"]
    end

    subgraph Member_Portal["Member Web Portal (Faiz Khan)"]
        M0[Login: /portal or localhost:5173] --> M1["Member Portal Workspace"]
        M1 --> M2["Tab: Studio Hub (/overview)"]
        M1 --> M3["Tab: Class Schedule & Booking (/schedule)"]
    
<truncated 27045 bytes>
tab on portal.
* **Observed Behavior**: Text still reads `"Free refund up to 2 hours prior to class commencement"`.
* **Expected Behavior**: Text dynamically displays `"Free refund up to 4 hours prior to class commencement"`.

---

## 9. Final Sign-Off & Go-Live Acceptance Checklist

Before declaring the SWEAT CRM Booking Policy Module **production-ready**, verify the following criteria:

### Critical (Blockers for Launch)
- [ ] **Security**: `BookingPolicyViewSet` rejects all non-admin JWT tokens with HTTP 403 Forbidden.
- [ ] **Data Integrity**: Concurrency tests verify that class capacity can never exceed 100% under rapid simultaneous clicks (no over-booking).
- [ ] **Core Workflow**: Fixing the `allowed_booking_types` enum ensures saving business settings never blocks member class bookings.
- [ ] **Passbook Accuracy**: Early cancellation restores session credits immediately; late cancellation forfeits credit without exception.

### High (Core Stability)
- [ ] **Automated Background Cancellation**: Celery beat worker executes `run_booking_auto_cancellation_task` periodically (every 5 minutes) without requiring manual button clicks.
- [ ] **Waitlist Promotion**: When a confirmed booking is cancelled, Position #1 on the waitlist is promoted to confirmed and receives an instant alert.
- [ ] **No-Show Enforcement**: Members incurring consecutive no-show strikes are automatically restricted to single-booking mode.

### Medium (Usability & Polish)
- [ ] **Dynamic Policy Text**: Passbook cancellation window string reflects the actual configured cutoff hours.
- [ ] **Branch Precedence**: Branch-specific override settings take priority over organization defaults for classes hosted at that branch.
- [ ] **Audit Trail**: Every policy update, auto-cancellation, and manual override writes an immutable record in `audit_events`.

### Low (Cosmetic & Minor)
- [ ] Mobile viewport responsiveness verified across iOS Safari and Android Chrome.
- [ ] Toast notification durations set to a readable 4 seconds across all interactions.

---

