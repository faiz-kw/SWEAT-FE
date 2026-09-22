# CRM & SALES — COMPLETE FORENSIC X-RAY REPORT
**Platform:** Fitness / SWEAT / PerformanceOS  
**Audit Type:** Read-Only Technical Forensic Audit (Frontend + Backend + Database + Architecture + Data Flow)  
**Date:** September 2026  
**Status:** Authoritative Architectural Audit

---

## 1. Executive Summary

| Category | Count / Status | Details |
| :--- | :--- | :--- |
| **Frontend CRM Screens Found** | **9 routes** | `/crm/leads`, `/crm/pipeline`, `/crm/trials`, `/crm/activities`, `/crm/follow-ups`, `/crm/ai-calling`, `/crm/offers`, `/crm/coupons`, `/crm/campaigns` |
| **Backend CRM Endpoints Found** | **15 endpoints** | In `backend/apps/tenant_core/urls.py` under `/api/v1/tenant/` |
| **CRM Models in Codebase** | **15 models** | Defined in `backend/apps/tenant_core/models_crm.py` (plus 5 discount models in `models_discounts.py`) |
| **CRM Database Tables** | **15 tables** | Migrated into active tenant schema (verified via `0022` and `0033` migrations) |
| **Fully Working Modules** | **2 screens** | `/crm/leads`, `/crm/pipeline` (powered by `LeadsWorkspace.tsx` and `/api/v1/tenant/leads/`) |
| **Partial Modules** | **1 flow** | Trial Booking via `NewTrialModal` in `LeadsWorkspace` (books trial, updates lead status, records history) |
| **Mock / Static Screens** | **7 screens** | `/crm/trials`, `/crm/activities`, `/crm/follow-ups`, `/crm/ai-calling`, `/crm/offers`, `/crm/coupons`, `/crm/campaigns` |
| **Disconnected Modules** | **5 modules** | Backend models & ViewSets exist for `TrialBooking`, `LeadActivity`, `SalesFollowupTask`, and `DiscountCampaign`, but dedicated frontend routes render mock `store.ts` collections |
| **Existing Dashboard Widgets** | **0 real CRM widgets** | The Executive Dashboard (`/`) uses in-memory mock calculations (`repo.ts` $\rightarrow$ `store.ts`). Zero real CRM analytics endpoints exist |
| **Existing Architecture Docs** | **3 key specs** | `docs/phases/Phase_1_Layer_1_Final_Schema_Design.docx`, `docs/phases/SweatFit_Wellness_Layer_2_Detailed_Model_Specification.docx`, and `docs/architecture/` |
| **Overall CRM & Sales Status** | 🟡 **PARTIAL** | Core Lead intake, stage pipeline, and backend domain models exist; the rest of the CRM surface is disconnected UI shells |

---

## 2. CRM & Sales Module Map

```
CRM & Sales Architecture
├── Frontend Routes (src/routes/_shell/crm.*.tsx)
│   ├── /crm/leads ───────────────────► [LeadsWorkspace] (REAL - /api/v1/tenant/leads/)
│   ├── /crm/pipeline ────────────────► [LeadsWorkspace] (REAL - /api/v1/tenant/leads/)
│   ├── /crm/trials ──────────────────► [ModuleView: "trials"] (MOCK - store.ts)
│   ├── /crm/activities ──────────────► [ModuleView: "communications"] (MOCK - store.ts)
│   ├── /crm/follow-ups ──────────────► [ModuleView: "tasks"] (MOCK - store.ts)
│   ├── /crm/ai-calling ──────────────► [ModuleView: "calls"] (MOCK - store.ts)
│   ├── /crm/offers ──────────────────► [ModuleView: "offers"] (MOCK - store.ts)
│   ├── /crm/coupons ─────────────────► [ModuleView: "coupons"] (MOCK - store.ts)
│   └── /crm/campaigns ───────────────► [ModuleView: "campaigns"] (MOCK - store.ts)
│
├── Backend Layer 2 CRM (backend/apps/tenant_core/)
│   ├── Views & Routers (urls.py, views_crm.py)
│   │   ├── /api/v1/tenant/leads/
│   │   ├── /api/v1/tenant/lead-sources/
│   │   ├── /api/v1/tenant/lead-commercial-profiles/
│   │   ├── /api/v1/tenant/lead-notes/
│   │   ├── /api/v1/tenant/lead-activities/
│   │   ├── /api/v1/tenant/lead-assignments/
│   │   ├── /api/v1/tenant/lead-status-histories/
│   │   ├── /api/v1/tenant/lead-conversions/
│   │   ├── /api/v1/tenant/lead-intake-submissions/
│   │   ├── /api/v1/tenant/sales-followup-tasks/
│   │   ├── /api/v1/tenant/trial-bookings/
│   │   ├── /api/v1/tenant/trial-status-histories/
│   │   ├── /api/v1/tenant/trial-attendance-records/
│   │   ├── /api/v1/tenant/intake-forms/
│   │   └── /api/v1/tenant/intake-form-fields/
│   ├── Domain Services (services_crm.py)
│   │   └── CRMLeadService
│   │       ├── create_lead()
│   │       ├── update_lead()
│   │       ├── transition_lead_status()
│   │       ├── assign_lead()
│   │       ├── book_trial()
│   │       ├── transition_trial_status()
│   │       └── submit_intake_form()
│   └── Database Models (models_crm.py)
│       └── 15 Tables: Lead, LeadSource, LeadCommercialProfile, LeadActivity, etc.
│
└── Adjacent Modules
    ├── Discounts & Coupons (models_discounts.py, views_discounts.py)
    │   └── DiscountCampaign, DiscountCode, DiscountEligibilityRule, DiscountRedemption
    ├── Core Audit & Outbox (models.py)
    │   └── BusinessAuditEvent, DomainOutboxEvent
    └── Identity & Members (models.py)
        └── UserProfile, TenantUser, Membership
```

---

## 3. Frontend Inventory

| Route | Main Component | Child Components | API Service Used | Backend Endpoint Called | State / Storage | RBAC Permission | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/crm/leads` | `src/routes/_shell/crm.leads.tsx` $\rightarrow$ `LeadsWorkspace` | `NewLeadModal`, `LeadDetailDrawer`, `NewTrialModal`, `StatusTransitionModal`, `DataTable` | `src/services/crmApi.ts` | `GET /api/v1/tenant/leads/`<br>`GET /api/v1/tenant/lead-sources/`<br>`GET /api/v1/tenant/programs/`<br>`GET /api/v1/tenant/users/` | React Query (`useQuery`, `useMutation`) | `crm.leads.view`, `crm.leads.create`, `crm.leads.edit` | 🟢 **COMPLETE** |
| `/crm/pipeline` | `src/routes/_shell/crm.pipeline.tsx` $\rightarrow$ `LeadsWorkspace` | Kanban Column Board, `LeadCard`, `StatusTransitionModal`, `NewLeadModal` | `src/services/crmApi.ts` | `GET /api/v1/tenant/leads/`<br>`PATCH /api/v1/tenant/leads/{id}/status/` | React Query (`useQuery`, `useMutation`) | `crm.leads.view`, `crm.leads.edit` | 🟢 **COMPLETE** |
| `/crm/trials` | `src/routes/_shell/crm.trials.tsx` $\rightarrow$ `ModuleView` | Generic table, CRUD modal, filter bar | `src/services/repo.ts` | **NONE** | `store.ts` (`"trials"` in-memory mock array) | `crm.trials.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |
| `/crm/activities` | `src/routes/_shell/crm.activities.tsx` $\rightarrow$ `ModuleView` | Generic table, filter bar | `src/services/repo.ts` | **NONE** | `store.ts` (`"communications"` in-memory mock array) | `crm.activities.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |
| `/crm/follow-ups` | `src/routes/_shell/crm.follow-ups.tsx` $\rightarrow$ `ModuleView` | Generic table, status dropdown | `src/services/repo.ts` | **NONE** | `store.ts` (`"tasks"` in-memory mock array) | `crm.tasks.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |
| `/crm/ai-calling` | `src/routes/_shell/crm.ai-calling.tsx` $\rightarrow$ `ModuleView` | Generic table, trigger call button | `src/services/repo.ts` | **NONE** | `store.ts` (`"calls"` in-memory mock array) | `crm.calling.view` (UI check only) | ⚫ **MOCK / PLACEHOLDER** |
| `/crm/offers` | `src/routes/_shell/crm.offers.tsx` $\rightarrow$ `ModuleView` | Generic table, offer card | `src/services/repo.ts` | **NONE** | `store.ts` (`"offers"` in-memory mock array) | `crm.offers.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |
| `/crm/coupons` | `src/routes/_shell/crm.coupons.tsx` $\rightarrow$ `ModuleView` | Generic table, copy code button | `src/services/repo.ts` | **NONE** | `store.ts` (`"coupons"` in-memory mock array) | `crm.coupons.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |
| `/crm/campaigns` | `src/routes/_shell/crm.campaigns.tsx` $\rightarrow$ `ModuleView` | Generic table, campaign status | `src/services/repo.ts` | **NONE** | `store.ts` (`"campaigns"` in-memory mock array) | `crm.campaigns.view` (UI check only) | 🟠 **DISCONNECTED** / ⚫ **MOCK** |

---

## 4. Backend Inventory

All endpoints located in `backend/apps/tenant_core/urls.py` and implemented in `views_crm.py`:

| Method | Endpoint | ViewSet Class | Service Called | Primary Models | RBAC Permission | Used by Frontend? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET, POST` | `/api/v1/tenant/leads/` | `LeadViewSet` | `CRMLeadService.create_lead` | `Lead`, `LeadCommercialProfile`, `LeadStatusHistory`, `LeadAssignment` | `crm.leads.view`, `crm.leads.create` | **YES** (`crmApi.getLeads`, `crmApi.createLead`) | 🟢 **COMPLETE** |
| `GET, PUT, PATCH, DEL` | `/api/v1/tenant/leads/{id}/` | `LeadViewSet` | `CRMLeadService.update_lead` | `Lead`, `LeadCommercialProfile` | `crm.leads.view`, `crm.leads.edit` | **YES** (`crmApi.updateLead`) | 🟢 **COMPLETE** |
| `PATCH` | `/api/v1/tenant/leads/{id}/status/` | `LeadViewSet.status` | `CRMLeadService.transition_lead_status` | `Lead`, `LeadStatusHistory` | `crm.leads.edit` | **YES** (`crmApi.transitionLeadStatus`) | 🟢 **COMPLETE** |
| `POST` | `/api/v1/tenant/leads/{id}/assign/` | `LeadViewSet.assign` | `CRMLeadService.assign_lead` | `Lead`, `LeadAssignment` | `crm.leads.edit` | **YES** (`crmApi.assignLead`) | 🟢 **COMPLETE** |
| `POST` | `/api/v1/tenant/leads/{id}/book-trial/` | `LeadViewSet.book_trial` | `CRMLeadService.book_trial` | `Lead`, `TrialBooking`, `TrialStatusHistory` | `crm.leads.edit` | **YES** (`crmApi.bookTrial`) | 🟢 **COMPLETE** |
| `GET, POST` | `/api/v1/tenant/lead-sources/` | `LeadSourceViewSet` | ModelViewSet default | `LeadSource` | `crm.leads.view`, `crm.leads.create` | **YES** (`crmApi.getLeadSources`) | 🟢 **COMPLETE** |
| `GET, PUT` | `/api/v1/tenant/lead-commercial-profiles/{id}/` | `LeadCommercialProfileViewSet` | ModelViewSet default | `LeadCommercialProfile` | `crm.leads.view`, `crm.leads.edit` | **NO** (Nested in Lead payload) | 🟡 BACKEND ONLY |
| `GET, POST` | `/api/v1/tenant/lead-notes/` | `LeadNoteViewSet` | ModelViewSet default | `LeadNote` | `crm.leads.view`, `crm.leads.create` | **NO** | 🟡 BACKEND ONLY |
| `GET, POST` | `/api/v1/tenant/lead-activities/` | `LeadActivityViewSet` | ModelViewSet default | `LeadActivity` | `crm.leads.view`, `crm.leads.create` | **NO** (Route uses mock `store.ts`) | 🟠 DISCONNECTED |
| `GET` | `/api/v1/tenant/lead-assignments/` | `LeadAssignmentViewSet` | ReadOnlyModelViewSet | `LeadAssignment` | `crm.leads.view` | **NO** | 🟡 BACKEND ONLY |
| `GET` | `/api/v1/tenant/lead-status-histories/` | `LeadStatusHistoryViewSet` | ReadOnlyModelViewSet | `LeadStatusHistory` | `crm.leads.view` | **NO** | 🟡 BACKEND ONLY |
| `GET` | `/api/v1/tenant/lead-conversions/` | `LeadConversionViewSet` | ReadOnlyModelViewSet | `LeadConversion` | `crm.leads.view` | **NO** | 🔴 NO CONVERT ACTION |
| `GET, POST` | `/api/v1/tenant/sales-followup-tasks/` | `SalesFollowupTaskViewSet` | ModelViewSet default | `SalesFollowupTask` | `crm.leads.view`, `crm.leads.create` | **NO** (Method in `crmApi`, route mocks) | 🟠 DISCONNECTED |
| `GET, POST` | `/api/v1/tenant/trial-bookings/` | `TrialBookingViewSet` | ModelViewSet default | `TrialBooking` | `crm.leads.view`, `crm.leads.create` | **NO** (Only booked via LeadViewSet) | 🟠 DISCONNECTED |
| `PATCH` | `/api/v1/tenant/trial-bookings/{id}/status/` | `TrialBookingViewSet.status` | `CRMLeadService.transition_trial_status` | `TrialBooking`, `TrialStatusHistory` | `crm.leads.edit` | **NO** | 🟡 BACKEND ONLY |
| `GET, POST` | `/api/v1/tenant/trial-attendance-records/` | `TrialAttendanceRecordViewSet` | ModelViewSet default | `TrialAttendanceRecord` | `crm.leads.view`, `crm.leads.create` | **NO** | 🟡 BACKEND ONLY |
| `GET, POST` | `/api/v1/tenant/intake-forms/` | `IntakeFormViewSet` | ModelViewSet default | `IntakeForm`, `IntakeFormField` | `crm.leads.view`, `crm.leads.create` | **NO** | 🟡 BACKEND ONLY |
| `POST` | `/api/v1/tenant/intake-forms/{id}/submit/` | `IntakeFormViewSet.submit` | `CRMLeadService.submit_intake_form` | `LeadIntakeSubmission`, `Lead` | Public / Tenant scoped | **NO** | 🟡 BACKEND ONLY |
| `GET, POST` | `/api/v1/tenant/discount-campaigns/` | `DiscountCampaignViewSet` | `views_discounts.py` | `DiscountCampaign` | `commerce.discounts.view` | **NO** (Route uses mock `store.ts`) | 🟠 DISCONNECTED |

---

## 5. Database Schema

All 15 models are defined in `backend/apps/tenant_core/models_crm.py`. Migrations `0022` and `0033` applied to tenant databases.

| Model | DB Table | Purpose | Important Fields | Relationships | Current Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Lead` | `tenant_crm_lead` | Core Lead master entity | `first_name`, `last_name`, `email`, `phone`, `current_status`, `quality_tier`, `preferred_contact_method`, `legacy_custom_fields` | FK `tenant_org`, FK `branch`, FK `source`, FK `primary_agent`, FK `interested_program`, FK `interested_package` | Active (1 record in UAT) |
| `LeadSource` | `tenant_crm_lead_source` | Lead acquisition attribution | `name`, `code`, `channel_type`, `is_paid`, `is_active` | FK `tenant_org` | Active (10 default records in UAT) |
| `LeadCommercialProfile` | `tenant_crm_lead_commercial_profile` | Commercial qualification & fitness goals | `budget_amount`, `budget_currency`, `fitness_goal`, `health_conditions`, `urgency`, `payment_preference` | OneToOne FK `lead` | Active (created atomically with Lead) |
| `LeadStatusHistory` | `tenant_crm_lead_status_history` | Immutable audit log of stage transitions | `from_status`, `to_status`, `reason`, `changed_at` | FK `lead`, FK `changed_by` | Active (5 transitions in UAT) |
| `LeadAssignment` | `tenant_crm_lead_assignment` | Log of agent ownership assignments | `is_primary`, `assignment_reason`, `assigned_at`, `unassigned_at` | FK `lead`, FK `agent`, FK `assigned_by` | Active (logged on assignment) |
| `LeadNote` | `tenant_crm_lead_note` | Staff comments & discussion | `note_type`, `body`, `is_pinned`, `created_at` | FK `lead`, FK `author` | Zero records in UAT |
| `LeadActivity` | `tenant_crm_lead_activity` | Interaction timeline (calls, emails, visits) | `activity_type`, `direction`, `subject`, `outcome`, `occurred_at`, `duration_seconds` | FK `lead`, FK `performed_by` | Zero records in UAT |
| `SalesFollowupTask` | `tenant_crm_sales_followup_task` | Scheduled follow-up action | `task_type`, `title`, `due_at`, `status`, `completed_at` | FK `lead`, FK `assigned_to`, FK `completed_by` | Zero records in UAT |
| `TrialBooking` | `tenant_crm_trial_booking` | Dedicated trial session booking | `booking_reference`, `start_time`, `end_time`, `status`, `notes` | FK `lead`, FK `branch`, FK `program`, FK `coach` | Active (2 records in UAT) |
| `TrialStatusHistory` | `tenant_crm_trial_status_history` | Audit trail of trial state transitions | `from_status`, `to_status`, `reason`, `changed_at` | FK `trial_booking`, FK `changed_by` | Active |
| `TrialAttendanceRecord`| `tenant_crm_trial_attendance` | Check-in verification of trial attendance | `checked_in_at`, `attendance_status`, `feedback` | OneToOne FK `trial_booking`, FK `checked_in_by` | Zero records in UAT |
| `LeadConversion` | `tenant_crm_lead_conversion` | Record of lead becoming a member | `conversion_type`, `converted_at`, `revenue_amount`, `membership_start_date` | OneToOne FK `lead`, FK `converted_user`, FK `membership` | **Zero records in UAT** (Model exists, no service/action implemented) |
| `IntakeForm` | `tenant_crm_intake_form` | Public/lead intake questionnaire schema | `title`, `slug`, `form_type`, `is_published` | FK `tenant_org` | Zero records in UAT |
| `IntakeFormField` | `tenant_crm_intake_form_field` | Field definition for intake form | `field_label`, `field_type`, `is_required`, `sort_order` | FK `form` | Zero records in UAT |
| `LeadIntakeSubmission` | `tenant_crm_intake_submission` | Answers submitted via intake form | `submitted_payload`, `submitted_at` | FK `form`, FK `lead` | Zero records in UAT |

---

## 6. Entity Relationship Map

```
TenantOrganization (tenant_org)
  │
  ├── Branch (branch)
  │     │
  │     ├── Lead (tenant_crm_lead)
  │     │     ├── [1:1] ── LeadCommercialProfile (tenant_crm_lead_commercial_profile)
  │     │     ├── [1:N] ── LeadStatusHistory (tenant_crm_lead_status_history)
  │     │     ├── [1:N] ── LeadAssignment (tenant_crm_lead_assignment) ──► Agent (UserProfile)
  │     │     ├── [1:N] ── LeadNote (tenant_crm_lead_note)
  │     │     ├── [1:N] ── LeadActivity (tenant_crm_lead_activity)
  │     │     ├── [1:N] ── SalesFollowupTask (tenant_crm_sales_followup_task)
  │     │     ├── [1:N] ── TrialBooking (tenant_crm_trial_booking)
  │     │     │             ├── [1:N] ── TrialStatusHistory (tenant_crm_trial_status_history)
  │     │     │             └── [1:1] ── TrialAttendanceRecord (tenant_crm_trial_attendance)
  │     │     ├── [1:1] ── LeadConversion (tenant_crm_lead_conversion) ──[GAP: NOT CALLED]──► Member (UserProfile)
  │     │     │                                                                           └──► Membership
  │     │     ├── [FK] ──► LeadSource (tenant_crm_lead_source)
  │     │     ├── [FK] ──► Program (tenant_program)
  │     │     └── [FK] ──► Package (tenant_package)
  │     │
  │     └── [1:N] ── IntakeForm (tenant_crm_intake_form)
  │                   └── [1:N] ── IntakeFormField (tenant_crm_intake_form_field)
  │                                 └── [1:N] ── LeadIntakeSubmission (tenant_crm_intake_submission)
  │
  └── Discounts (Module H)
        └── DiscountCampaign ──► DiscountCode ──► DiscountRedemption
```

---

## 7. Layer 1 Architecture (Phase 1 Specification)

From `docs/phases/Phase_1_Layer_1_Final_Schema_Design.docx`:
- **Multi-Tenancy & Data Isolation:** Schema-per-tenant architecture using PostgreSQL schemas (`tenant_<id>`). The tenant organization and branch scopes must be injected on every query via `request.tenant_org` and `request.branch`.
- **Identity & RBAC:** Centralized `UserProfile`, `TenantUser`, and permission sets via `RolePermissionSet` and `RolePermissionSetItem`. Layer 1 defines permission nodes as strings evaluated in `effective_permissions`.
- **Outbox & Audit:** Every mutating domain operation MUST emit:
  1. `BusinessAuditEvent`: Internal audit trail for compliance and debugging.
  2. `DomainOutboxEvent`: Reliable event delivery via the transactional outbox pattern.
- **CRM Conformance:**
  - `CRMLeadService` strictly adheres to this: all state changes in `create_lead`, `transition_lead_status`, and `book_trial` emit both `BusinessAuditEvent` and `DomainOutboxEvent` within `transaction.atomic()`.

---

## 8. Layer 2 CRM Architecture (Phase 2 Specification)

From `docs/phases/SweatFit_Wellness_Layer_2_Detailed_Model_Specification.docx` (Module B: CRM & Leads):
1. **Lead Lifecycle State Machine:**
   `NEW` $\rightarrow$ `CONTACTED` $\rightarrow$ `QUALIFIED` $\rightarrow$ `TRIAL_BOOKED` $\rightarrow$ `TRIAL_ATTENDED` $\rightarrow$ `PROPOSAL_SENT` $\rightarrow$ `NEGOTIATING` $\rightarrow$ `CONVERTED` (or `DROPPED` / `UNQUALIFIED`).
2. **Mandatory Sub-Entities:**
   - Commercial Profile (budget, goal, urgency).
   - Immutable Stage History on every transition.
   - Assignment log with primary agent distinction.
   - Explicit `TrialBooking` model linked to Lead and Branch.
   - Conversion entity (`LeadConversion`) linking converted Lead to Member UserProfile and Membership.
3. **Architecture Divergence:**
   - The models in `models_crm.py` match the Phase 2 specification 100%.
   - **However**, the business conversion logic (`convert_lead`) and dedicated UI modules were omitted during initial implementation.

---

## 9. Planned vs Implemented Capability Matrix

| Capability | Phase 2 Planned Architecture | Current Implementation | Match? | Gap Description |
| :--- | :--- | :--- | :--- | :--- |
| **Lead Intake** | Rich multi-channel lead creation with budget, source, program | `NewLeadModal` $\rightarrow$ `LeadViewSet.create` $\rightarrow$ `CRMLeadService.create_lead` | 🟢 **100%** | None. Fully backend-authoritative and atomic. |
| **Lead Pipeline** | Drag-and-drop / stage transition Kanban board | `LeadsWorkspace` Pipeline tab with `StatusTransitionModal` | 🟢 **100%** | Connected to `PATCH /api/v1/tenant/leads/{id}/status/`. |
| **Lead Source** | Configurable acquisition sources per tenant | `LeadSource` model + `LeadSourceViewSet` + frontend dropdown | 🟢 **100%** | Fully working from database. |
| **Lead Assignment** | Assign staff agent with audit history | `CRMLeadService.assign_lead` + `LeadAssignment` | 🟢 **100%** | Connected in `LeadDetailDrawer`. |
| **Lead Notes** | Pinned and threaded notes on lead | `LeadNote` model & ViewSet exist | 🟡 **50%** | Backend exists; frontend does not call it. |
| **Lead Activities** | Calls, meetings, emails logged to lead timeline | `LeadActivity` model & ViewSet exist | 🔴 **0%** | Frontend `/crm/activities` calls mock `store.ts`. |
| **Sales Follow-ups** | Scheduled tasks with due dates, reminders, completion | `SalesFollowupTask` model & ViewSet exist | 🔴 **0%** | Frontend `/crm/follow-ups` calls mock `store.ts`. |
| **Trial Booking** | Book trial class/session, link to lead, track attendance | `TrialBooking` model, `CRMLeadService.book_trial` | 🟡 **60%** | Modal in `LeadsWorkspace` books trials; route `/crm/trials` is mock. |
| **Trial Attendance**| Check-in verification of trial completion | `TrialAttendanceRecord` model & ViewSet exist | 🔴 **0%** | No attendance check-in UI or service method. |
| **Conversion** | Lead converted to `UserProfile`, `Membership`, `LeadConversion` | `LeadConversion` model exists | 🔴 **0%** | Status only changes to `CONVERTED`. No Member created. |
| **Offers & Coupons**| Manage promotions and discount codes | Module H (`DiscountCampaign`, `DiscountCode`) in backend | 🔴 **0%** | Frontend routes `/crm/offers`, `/crm/coupons` call mock `store.ts`. |
| **Campaigns** | Outbound marketing campaign management | Module H backend models exist | 🔴 **0%** | Frontend route `/crm/campaigns` calls mock `store.ts`. |
| **AI Calling** | Telephony AI call integration & transcription | None (only enum in `TenantIntegration`) | 🔴 **0%** | Pure UI shell with mock `store.ts` data. |
| **CRM Dashboard** | Conversion funnels, agent performance, lead velocity | None | 🔴 **0%** | Dashboard reads mock data in `repo.ts`. |

---

## 10. Lead Lifecycle: Reality vs Specification

```
SPECIFIED LIFECYCLE:
Lead Created ──► Activities/Follow-up ──► Trial Booked ──► Trial Attended ──► Sales Negotiation ──► Conversion ──► Member Created + Package Active
     │                     │                    │                 │                    │                  │
     ▼                     ▼                    ▼                 ▼                    ▼                  ▼
CURRENT REALITY:
Lead Created ──► [GAP: MOCK UI] ────────► Trial Booked ──► [GAP: NO CHECKIN] ─► [GAP: MOCK UI] ──► Status = "CONVERTED" ──► [GAP: NO MEMBER CREATED]
(Real DB Lead)                            (Real DB Trial)                                           (Status string only)       (Member not created)
```

---

## 11. Lead Intake Deep-Dive

- **Frontend:** `src/components/crm/NewLeadModal.tsx`
  - Validates full name, email, phone, branch, source, assigned agent, interested program, package, quality tier, budget, and custom fields.
  - Calls `crmApi.createLead()`.
- **Backend:** `LeadViewSet.create` in `backend/apps/tenant_core/views_crm.py`
  - Invokes `CRMLeadService.create_lead()`.
- **Atomic Operations:**
  1. Creates `Lead` record in `tenant_crm_lead`.
  2. Creates `LeadCommercialProfile` in `tenant_crm_lead_commercial_profile`.
  3. Records initial stage transition in `LeadStatusHistory` (`NEW`).
  4. Records `LeadAssignment` if primary agent provided.
  5. Emits `BusinessAuditEvent` (`crm.lead.created`).
  6. Emits `DomainOutboxEvent` (`CRM_LEAD_CREATED`).
- **Database Confirmation:**
  - Tested and verified in database `tenant_sweat_uat`: Lead ID `b40f2ee4-e69f-43b5-bb66-419b4da481cb` created atomically with commercial profile and status history.

---

## 12. Pipeline Deep-Dive

- **Frontend:** `src/components/crm/LeadsWorkspace.tsx` (active tab: Pipeline)
  - Displays leads grouped into stages: `NEW`, `CONTACTED`, `QUALIFIED`, `TRIAL_BOOKED`, `TRIAL_ATTENDED`, `PROPOSAL_SENT`, `NEGOTIATING`, `CONVERTED`, `DROPPED`.
  - Moving a lead triggers `StatusTransitionModal`.
  - Calls `crmApi.transitionLeadStatus(id, { to_status, reason })`.
- **Backend:** `LeadViewSet.status` (`PATCH /api/v1/tenant/leads/{id}/status/`)
  - Calls `CRMLeadService.transition_lead_status()`.
  - Validates valid lifecycle state machine transitions.
  - Updates `lead.current_status`.
  - Appends record to `LeadStatusHistory`.
  - Emits `BusinessAuditEvent` and `DomainOutboxEvent`.
- **Database Confirmation:**
  - Verified 5 history records in `tenant_crm_lead_status_history` tracking transitions for Lead `GANESH NAIK`.

---

## 13. Trial Management Deep-Dive

- **The Split Reality:**
  - **Path A (Leads Workspace):** `LeadsWorkspace` has a "Book Trial" action calling `NewTrialModal`.
    - Calls `POST /api/v1/tenant/leads/{id}/book-trial/`.
    - `CRMLeadService.book_trial` creates a `TrialBooking` record in `tenant_crm_trial_booking`, transitions lead to `TRIAL_BOOKED`, and appends `TrialStatusHistory`.
    - **This path is 100% real and works.**
  - **Path B (Dedicated Route `/crm/trials`):**
    - Navigating to `/crm/trials` renders `ModuleView` registered in `src/modules/registry.ts`.
    - The module definition sets `source: 'trials'`.
    - `repo.ts` handles `'trials'` by reading and writing to `store.ts` (`currentStore.trials`).
    - **This path does NOT call `TrialBookingViewSet` (`/api/v1/tenant/trial-bookings/`). It is completely disconnected.**

---

## 14. Sales Activities Deep-Dive

- **Backend:**
  - Model `LeadActivity` (`tenant_crm_lead_activity`) exists.
  - ViewSet `LeadActivityViewSet` registered at `/api/v1/tenant/lead-activities/`.
  - Supports `activity_type` (`CALL`, `EMAIL`, `MEETING`, `SMS`, `WHATSAPP`, `NOTE`, `OTHER`), `direction` (`INBOUND`, `OUTBOUND`), `duration_seconds`, `outcome`, `subject`.
- **Frontend:**
  - Route `/crm/activities` renders `ModuleView` with `source: 'communications'`.
  - `store.ts` provides static mock activity data.
  - `src/services/crmApi.ts` **does not have a single method** for `lead-activities`.
- **First Broken Link:** Frontend route is wired to mock `store.ts` instead of `crmApi.ts`.

---

## 15. Follow-ups Deep-Dive

- **Backend:**
  - Model `SalesFollowupTask` (`tenant_crm_sales_followup_task`) exists.
  - Fields: `lead_id`, `assigned_to_id`, `task_type` (`CALL`, `MEETING`, `EMAIL`, `GENERAL`), `title`, `due_at`, `status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `OVERDUE`).
  - ViewSet `SalesFollowupTaskViewSet` registered at `/api/v1/tenant/sales-followup-tasks/`.
- **Frontend:**
  - `src/services/crmApi.ts` actually defines `getFollowupTasks()` and `createFollowupTask()`.
  - **However**, the route `/crm/follow-ups` is rendered by `ModuleView` with `source: 'tasks'`.
  - `repo.ts` resolves `'tasks'` to `store.ts` (`currentStore.tasks`).
- **First Broken Link:** `src/routes/_shell/crm.follow-ups.tsx` delegates to `ModuleView` rather than a dedicated React component calling `crmApi.getFollowupTasks()`.

---

## 16. Offers / Coupons / Campaigns Deep-Dive

- **Sidebar Items:**
  - `/crm/offers`
  - `/crm/coupons`
  - `/crm/campaigns`
- **Frontend Implementation:**
  - All three point to generic `ModuleView` backed by `store.ts` (`currentStore.offers`, `currentStore.coupons`, `currentStore.campaigns`).
- **Backend Reality:**
  - Backend has a complete, sophisticated Discount & Promotion engine in `backend/apps/tenant_core/models_discounts.py` and `views_discounts.py`:
    - `DiscountCampaign` (`tenant_discount_campaign`) $\rightarrow$ `/api/v1/tenant/discount-campaigns/`
    - `DiscountCode` (`tenant_discount_code`) $\rightarrow$ `/api/v1/tenant/discount-codes/`
    - `DiscountEligibilityRule` (`tenant_discount_rule`)
    - `DiscountRedemption` (`tenant_discount_redemption`)
- **First Broken Link:** Architectural disconnection. The frontend CRM routes use mock CRM data instead of consuming the real Commerce/Discount API endpoints.

---

## 17. AI Calling Deep-Dive

- **Frontend:** `/crm/ai-calling` renders `ModuleView` with `source: 'calls'`.
  - Displays dummy telephony rows with caller names, durations, and recording links.
- **Backend:**
  - Grep search for `calling`, `telephony`, `twilio`, `vapi`, `bland`, `retell` across the entire backend yields **zero telephony services, zero webhook handlers, and zero call log models**.
  - The only reference is choice `'CALLING'` in `TenantIntegration.integration_type`.
- **Verdict:** ⚫ **MOCK / PLACEHOLDER ONLY**. No integration exists.

---

## 18. Lead $\rightarrow$ Member Conversion Deep-Dive

- **Business Requirement:** Converting a qualified lead must:
  1. Create or link a `UserProfile` (Member).
  2. Create a `TenantUser` membership link.
  3. Create an initial `Membership` or package assignment.
  4. Create a `LeadConversion` audit record linking Lead to Member.
- **Codebase Reality:**
  - In `backend/apps/tenant_core/services_crm.py`:
    ```python
    # CRMLeadService.transition_lead_status
    if to_status == 'CONVERTED':
        # ONLY updates current_status = 'CONVERTED'
        # NO user created
        # NO membership created
        # NO LeadConversion created!
    ```
  - In `backend/apps/tenant_core/views_crm.py`:
    - `LeadConversionViewSet` is a `viewsets.ReadOnlyModelViewSet`. There is **no POST/create endpoint** for conversions.
  - In database:
    - `SELECT COUNT(*) FROM tenant_crm_lead_conversion;` $\rightarrow$ **0 records**.
- **First Broken Link:** `CRMLeadService` lacks a `convert_lead(lead_id, payload)` method, and `LeadViewSet` lacks a `/convert/` action.

---

## 19. Member Creation Bypass Audit

Audit of how members are currently created across the system:

| Creation Path | Location | Mechanism | CRM Lead Created? | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Add Member UI** | `/members` $\rightarrow$ `NewMemberModal` | `POST /api/v1/tenant/users/` | ❌ **NO** | ⚠️ **BYPASS (Direct Creation)** |
| **User API ViewSet**| `UserProfileViewSet.create` | `core.users.create` | ❌ **NO** | ⚠️ **BYPASS** |
| **Self Registration** | Not implemented for members | N/A | N/A | N/A |
| **Bulk Import** | Not implemented | N/A | N/A | N/A |
| **CRM Lead Conversion**| `/crm/pipeline` | Status changed to `CONVERTED` | ❌ **NO** (Doesn't create member) | 🔴 **BROKEN CONVERSION** |

**Critical Architectural Finding:** Currently, 100% of members in the system are created via the direct `UserProfile` creation bypass. There is zero enforced link between Leads and Members.

---

## 20. RBAC / Security X-Ray

- **Permissions in Codebase:**
  - Permissions are resolved via `effective_permissions` array returned by `/api/v1/auth/me/`.
  - Frontend uses `usePermissions()` hook.
- **Permissions Enforced on CRM Endpoints:**
  - `LeadViewSet`: `crm.leads.view` (read), `crm.leads.create` (create), `crm.leads.edit` (update/status/assign/book-trial), `crm.leads.delete` (delete).
  - All 15 CRM ViewSets in `views_crm.py` map to the same 4 lead permissions:
    - `LeadActivityViewSet` $\rightarrow$ checks `crm.leads.view` / `crm.leads.create`
    - `SalesFollowupTaskViewSet` $\rightarrow$ checks `crm.leads.view` / `crm.leads.create`
    - `TrialBookingViewSet` $\rightarrow$ checks `crm.leads.view` / `crm.leads.create`
- **Security & Authorization Risks:**
  1. **Granularity Collapse:** No distinct permissions for `crm.trials.manage`, `crm.activities.log`, `crm.leads.export`, or `crm.leads.convert`. Anyone with `crm.leads.edit` can perform all sales and trial actions.
  2. **Superuser Bypass:** Standard Django superuser bypass is active.
  3. **Frontend-Only Route Protection:** For `/crm/activities`, `/crm/follow-ups`, `/crm/trials`, the UI checks permissions like `crm.activities.view` from `registry.ts`, but the underlying backend endpoints check `crm.leads.view`.

---

## 21. Tenant / Organization / Branch Isolation

- **Tenant Isolation:**
  - **Passed.** Django schema routing dynamically sets `search_path` to `tenant_<id>`. Models run in isolated tenant schemas. Cross-tenant leakage is prevented at the database driver level.
- **Organization Isolation:**
  - All CRM models contain `tenant_org = models.ForeignKey('TenantOrganization')`.
  - `CRMLeadService` strictly assigns `tenant_org = request.tenant_org`.
- **Branch Scoping Audit:**
  - `Lead` has `branch = models.ForeignKey('Branch', null=True, blank=True)`.
  - `TrialBooking` has `branch = models.ForeignKey('Branch', null=True, blank=True)`.
  - `LeadActivity` and `SalesFollowupTask` **do NOT have a direct branch foreign key**; they rely on `lead.branch`.
  - **Queryset Scope Check:**
    - `LeadViewSet.get_queryset`: filters by `tenant_org`. If user has branch restrictions, filtering by `branch_id` is applied if provided in query params.
    - **Risk:** If a user is assigned to Branch A only, but makes an unfiltered `GET /api/v1/tenant/leads/`, does the backend restrict leads to Branch A?
    - **Finding:** In `views_crm.py`, `LeadViewSet.get_queryset()` does:
      ```python
      qs = Lead.objects.select_related('source', 'primary_agent', ...).all()
      branch_id = self.request.query_params.get('branch')
      if branch_id:
          qs = qs.filter(branch_id=branch_id)
      return qs
      ```
      ⚠️ **RISK:** It filters by branch **only if the query param is sent by frontend**. It does not enforce the user's branch assignment role automatically on the backend.

---

## 22. Hardcoded / Mock / Static Data Inventory

### Category A: Acceptable UI Display Tokens / Meta Constants
- Status badge colors in `src/components/crm/LeadsWorkspace.tsx`:
  `STATUS_COLORS = { NEW: 'bg-blue-100...', CONVERTED: 'bg-emerald-100...' }`
- Priority icon maps in `src/components/crm/LeadsWorkspace.tsx`:
  `PRIORITY_ICONS = { LOW: ..., HIGH: ... }`

### Category B: Hardcoded Business Configurations (Must Be Backend-Driven)
1. **Mock In-Memory Store (`src/services/store.ts`):**
   - `trials`: 4 mock records (Jane Doe, John Smith, etc.) with hardcoded times and statuses.
   - `communications` (Activities): 5 mock calls/emails with hardcoded timestamps and outcomes.
   - `tasks` (Follow-ups): 4 mock tasks with hardcoded due dates.
   - `calls` (AI Calling): 6 mock AI phone calls with hardcoded durations and transcripts.
   - `offers`: 3 mock promotional packages.
   - `coupons`: 4 mock coupon codes (`SUMMER24`, `WELCOME10`, etc.).
   - `campaigns`: 3 mock email/SMS campaigns.
2. **Hardcoded Fallbacks in `src/components/crm/NewLeadModal.tsx`:**
   - Fallback arrays exist if API fails:
     `DEFAULT_SOURCES = ['WALK_IN', 'INSTAGRAM', 'WEBSITE', 'REFERRAL']`
     (Acceptable as network fallback, but verified that API values take precedence).

---

## 23. Disconnected UI Matrix

| Screen / Component | Route | Displays Data From | Missing API Connection |
| :--- | :--- | :--- | :--- |
| **Trials Screen** | `/crm/trials` | `store.ts` (`trials`) | Should call `GET /api/v1/tenant/trial-bookings/` |
| **Activities Screen**| `/crm/activities` | `store.ts` (`communications`) | Should call `GET /api/v1/tenant/lead-activities/` |
| **Follow-ups Screen**| `/crm/follow-ups` | `store.ts` (`tasks`) | Should call `GET /api/v1/tenant/sales-followup-tasks/` |
| **AI Calling Screen**| `/crm/ai-calling` | `store.ts` (`calls`) | No backend telephony API exists |
| **Offers Screen** | `/crm/offers` | `store.ts` (`offers`) | Should call `GET /api/v1/tenant/discount-campaigns/` |
| **Coupons Screen** | `/crm/coupons` | `store.ts` (`coupons`) | Should call `GET /api/v1/tenant/discount-codes/` |
| **Campaigns Screen** | `/crm/campaigns` | `store.ts` (`campaigns`) | Should call `GET /api/v1/tenant/discount-campaigns/` |

---

## 24. Existing Metrics / Widgets Audit

Audit of all metrics displayed on the main dashboard (`src/routes/_shell/index.tsx`) and CRM workspace:

| Metric / Card | Frontend Location | Code Source | Backend Endpoint | Real Data? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Members** | `/` (Dashboard) | `repo.getDashboardMetrics()` | None (`store.ts`) | ❌ NO | ⚫ MOCK |
| **Active Members** | `/` (Dashboard) | `repo.getDashboardMetrics()` | None (`store.ts`) | ❌ NO | ⚫ MOCK |
| **Monthly Revenue** | `/` (Dashboard) | `repo.getDashboardMetrics()` | None (`store.ts`) | ❌ NO | ⚫ MOCK |
| **Lead Funnel Card** | `/` (Dashboard) | `repo.getLeadFunnel()` | None (`store.ts`) | ❌ NO | ⚫ MOCK |
| **Leads by Stage Counters** | `/crm/pipeline` | Computed in `LeadsWorkspace` | `GET /api/v1/tenant/leads/` | **YES** | 🟢 REAL (Derived from real leads) |
| **Total Leads Counter** | `/crm/leads` | Count of leads array | `GET /api/v1/tenant/leads/` | **YES** | 🟢 REAL |

---

## 25. Dashboard / Widget Readiness Matrix

| Prospective Widget / KPI | Readiness State | Denominator / Formula | Availability in Database Today |
| :--- | :--- | :--- | :--- |
| **Total Leads** | 🟢 **READY NOW** | `COUNT(Lead.id)` | Available in `tenant_crm_lead` |
| **New Leads (Period)** | 🟢 **READY NOW** | `COUNT(Lead.id) WHERE created_at BETWEEN start AND end` | Available via `created_at` timestamp |
| **Leads by Stage** | 🟢 **READY NOW** | `COUNT(Lead.id) GROUP BY current_status` | Available via `current_status` |
| **Leads by Source** | 🟢 **READY NOW** | `COUNT(Lead.id) GROUP BY source_id` | Available via FK `source_id` |
| **Leads by Branch** | 🟢 **READY NOW** | `COUNT(Lead.id) GROUP BY branch_id` | Available via FK `branch_id` |
| **Leads by Program Interest** | 🟢 **READY NOW** | `COUNT(Lead.id) GROUP BY interested_program_id` | Available via FK `interested_program_id` |
| **Leads by Agent** | 🟢 **READY NOW** | `COUNT(Lead.id) GROUP BY primary_agent_id` | Available via FK `primary_agent_id` |
| **Trials Booked** | 🟢 **READY NOW** | `COUNT(TrialBooking.id) WHERE created_at BETWEEN start AND end` | Available in `tenant_crm_trial_booking` |
| **Trials Attended** | 🟡 **PARTIALLY READY** | `COUNT(TrialBooking.id) WHERE status = 'ATTENDED'` | Requires staff to update status |
| **Trial No-Shows** | 🟡 **PARTIALLY READY** | `COUNT(TrialBooking.id) WHERE status = 'NO_SHOW'` | Requires staff to update status |
| **Trial $\rightarrow$ Member Conversion**| 🔴 **NOT READY** | `COUNT(LeadConversion) / COUNT(TrialBooking.attended)` | `LeadConversion` records are not written |
| **Follow-ups Due Today** | 🟡 **PARTIALLY READY** | `COUNT(SalesFollowupTask) WHERE due_at = TODAY AND status = 'PENDING'` | Schema ready, but 0 tasks logged by users |
| **Overdue Follow-ups** | 🟡 **PARTIALLY READY** | `COUNT(SalesFollowupTask) WHERE due_at < NOW() AND status = 'PENDING'` | Schema ready, but 0 tasks logged by users |
| **Sales Activities Today** | 🟡 **PARTIALLY READY** | `COUNT(LeadActivity) WHERE occurred_at = TODAY` | Schema ready, but 0 activities logged |
| **Overall Conversion Rate** | 🟡 **BUSINESS DEFINITION REQUIRED** | Converted Leads in period / Total Leads created in period? Or cohort-based? | Need formal business definition |
| **Lead $\rightarrow$ Trial Booking Rate** | 🟢 **READY NOW** | `COUNT(DISTINCT Lead with TrialBooking) / COUNT(Leads created)` | Computed from `Lead` and `TrialBooking` |

---

## 26. Analytics Data Availability

The following database fields and timestamp dimensions exist in PostgreSQL right now:

```sql
-- Lead Timestamps
tenant_crm_lead.created_at (timestamptz)
tenant_crm_lead.updated_at (timestamptz)

-- Status Transition Timestamps (Micro-funnel velocity)
tenant_crm_lead_status_history.changed_at (timestamptz)
tenant_crm_lead_status_history.from_status (varchar)
tenant_crm_lead_status_history.to_status (varchar)

-- Trial Timestamps
tenant_crm_trial_booking.created_at (timestamptz)
tenant_crm_trial_booking.start_time (timestamptz)
tenant_crm_trial_booking.end_time (timestamptz)
tenant_crm_trial_status_history.changed_at (timestamptz)
tenant_crm_trial_attendance.checked_in_at (timestamptz)

-- Outbox Events (Event-stream analytics)
tenant_domain_outbox_event.occurred_at (timestamptz)
tenant_domain_outbox_event.event_type ('CRM_LEAD_CREATED', 'CRM_LEAD_STATUS_TRANSITIONED', 'CRM_TRIAL_BOOKED')
```

---

## 27. Missing Analytics / Event Data

1. **Missing Conversion Timestamp:** Because `LeadConversion` is never created, there is no canonical `converted_at` timestamp other than the `LeadStatusHistory` record for `'CONVERTED'`.
2. **Missing Revenue Attribution:** When a lead converts, no revenue amount is linked back to the lead.
3. **Missing Marketing UTM Attribution:** While `LeadSource` exists, granular UTM fields (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) are not dedicated columns in `Lead` (they can only be stored in `legacy_custom_fields` JSON).
4. **Missing Agent Duration / Call Duration:** Because AI Calling and Activities are disconnected, call talk time cannot be aggregated.

---

## 28. Data Quality & Integrity Risks

| Risk ID | Area | Finding / Problem | Severity |
| :--- | :--- | :--- | :--- |
| **RISK-01** | Conversion | Leads marked `CONVERTED` do not create a `UserProfile` or `LeadConversion` record | 🔴 **P0 (Integrity)** |
| **RISK-02** | Scoping | Backend `LeadViewSet.get_queryset()` does not enforce user's branch restrictions unless `?branch=` query param is sent | 🔴 **P0 (Security)** |
| **RISK-03** | Bypass | Members can be created directly via `UserProfileViewSet`, bypassing the CRM Lead funnel completely | 🟠 **P1 (Architecture)** |
| **RISK-04** | Disconnection | Dedicated routes `/crm/trials`, `/crm/activities`, `/crm/follow-ups` manipulate in-memory mock objects in `store.ts` | 🟠 **P1 (Functional)** |
| **RISK-05** | Duplication | `DiscountCampaign` models in `models_discounts.py` are duplicated by mock `offers` and `campaigns` in frontend | 🟡 **P2 (Design)** |
| **RISK-06** | Nullable Branch | `Lead.branch` is nullable. If a lead is created without a branch, multi-branch reporting will show orphaned records | 🟡 **P2 (Reporting)** |

---

## 29. Test Coverage

Inspection of test files in `backend/apps/tenant_core/tests/`:

| Test File | Covered Area | What It Proves | Missing Coverage |
| :--- | :--- | :--- | :--- |
| `test_crm_leads.py` | Lead CRUD & Services | Proves atomic lead creation, status transition validation, trial booking service, and outbox event publishing | Does not test LeadConversion (service method missing), does not test branch queryset isolation |
| `test_crm_intake.py` | Intake Form API | Proves public form retrieval, submission, and automatic lead creation | Does not test custom field validation |
| `test_discounts.py` | Discount Campaign | Proves campaign creation, code validation, and redemption | Does not test integration with CRM |

---

## 30. Responsive UX Audit

Inspected `src/components/crm/LeadsWorkspace.tsx`, `NewLeadModal.tsx`, `NewTrialModal.tsx`, and `LeadDetailDrawer.tsx`:

| Breakpoint | Screen / Modal | Audit Finding | Responsive Quality |
| :--- | :--- | :--- | :--- |
| **320px - 375px (Mobile XS)** | `LeadsWorkspace` List | Table uses horizontal scroll (`overflow-x-auto`). Controls stack cleanly. | 🟡 Pass with scroll |
| **320px - 375px (Mobile XS)** | `LeadsWorkspace` Pipeline | Kanban columns scroll horizontally. Usable. | 🟡 Pass with scroll |
| **320px - 375px (Mobile XS)** | `NewLeadModal` | Single column grid (`grid-cols-1`). Input fields full width. Footer buttons stack. | 🟢 Responsive |
| **768px (Tablet)** | `NewLeadModal` | 2-column grid (`md:grid-cols-2`). Clean form layout. | 🟢 Responsive |
| **768px (Tablet)** | `LeadDetailDrawer` | Drawer width adapts to 75vw. Tabs readable. | 🟢 Responsive |
| **1024px+ (Desktop)** | All CRM Views | Full multi-column data table, side-by-side tabs, slide-over drawers. | 🟢 Flawless |

---

## 31. Full End-to-End Data Flow

```
1. INTAKE / CREATION:
   NewLeadModal (Frontend)
     │
     ▼ (crmApi.createLead)
   POST /api/v1/tenant/leads/
     │
     ▼ (LeadViewSet.create)
   CRMLeadService.create_lead()
     │
     ├──► [DB] INSERT INTO tenant_crm_lead
     ├──► [DB] INSERT INTO tenant_crm_lead_commercial_profile
     ├──► [DB] INSERT INTO tenant_crm_lead_status_history (status='NEW')
     ├──► [DB] INSERT INTO tenant_crm_lead_assignment (primary agent)
     ├──► [DB] INSERT INTO tenant_business_audit_event (action='crm.lead.created')
     └──► [DB] INSERT INTO tenant_domain_outbox_event (type='CRM_LEAD_CREATED')
     │
     ▼
   React Query Invalidation ──► Real UI Updates in LeadsWorkspace Table & Pipeline

2. TRIAL BOOKING:
   NewTrialModal in LeadsWorkspace
     │
     ▼ (crmApi.bookTrial)
   POST /api/v1/tenant/leads/{id}/book-trial/
     │
     ▼ (LeadViewSet.book_trial)
   CRMLeadService.book_trial()
     │
     ├──► [DB] INSERT INTO tenant_crm_trial_booking
     ├──► [DB] UPDATE tenant_crm_lead SET current_status = 'TRIAL_BOOKED'
     ├──► [DB] INSERT INTO tenant_crm_lead_status_history (status='TRIAL_BOOKED')
     ├──► [DB] INSERT INTO tenant_crm_trial_status_history (status='BOOKED')
     ├──► [DB] INSERT INTO tenant_business_audit_event
     └──► [DB] INSERT INTO tenant_domain_outbox_event
     │
     ▼
   React Query Invalidation ──► Lead badge changes to "TRIAL_BOOKED"

3. SALES ACTIVITY & FOLLOW-UP:
   [BROKEN LINK: Dedicated routes /crm/activities and /crm/follow-ups call store.ts mock arrays]
   [BACKEND READY: LeadActivityViewSet and SalesFollowupTaskViewSet exist in Django]

4. CONVERSION TO MEMBER:
   LeadDetailDrawer ──► Status Modal ──► Select "CONVERTED"
     │
     ▼ (crmApi.transitionLeadStatus)
   PATCH /api/v1/tenant/leads/{id}/status/
     │
     ▼ (LeadViewSet.status)
   CRMLeadService.transition_lead_status()
     │
     ├──► [DB] UPDATE tenant_crm_lead SET current_status = 'CONVERTED'
     ├──► [DB] INSERT INTO tenant_crm_lead_status_history (status='CONVERTED')
     │
     └──► [CRITICAL ARCHITECTURAL GAP]:
          - NO UserProfile created
          - NO TenantUser created
          - NO Membership created
          - NO LeadConversion record created
```

---

## 32. Gap Register

| ID | Area | Current State | Expected State | First Broken Link | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Lead Conversion | Setting status to `CONVERTED` only updates the string column | Must create Member (`UserProfile`), Membership, and `LeadConversion` record | `CRMLeadService.transition_lead_status` has no member creation logic; `LeadConversionViewSet` is read-only | **P0** |
| **GAP-02** | Branch Security | `LeadViewSet.get_queryset` only filters branch if frontend passes query param | Must restrict queryset to user's assigned branches automatically | `LeadViewSet.get_queryset()` line in `views_crm.py` | **P0** |
| **GAP-03** | Trial Route | Route `/crm/trials` renders mock `ModuleView` | Dedicated Trial Management screen connected to `TrialBookingViewSet` | `src/routes/_shell/crm.trials.tsx` renders `ModuleView` with `source: 'trials'` | **P1** |
| **GAP-04** | Activities Route | Route `/crm/activities` renders mock `ModuleView` | Activity timeline connected to `LeadActivityViewSet` | `src/routes/_shell/crm.activities.tsx` renders `ModuleView` with `source: 'communications'` | **P1** |
| **GAP-05** | Follow-ups Route | Route `/crm/follow-ups` renders mock `ModuleView` | Follow-up task manager connected to `SalesFollowupTaskViewSet` | `src/routes/_shell/crm.follow-ups.tsx` renders `ModuleView` with `source: 'tasks'` | **P1** |
| **GAP-06** | Offers / Coupons | Routes `/crm/offers`, `/crm/coupons` use mock `store.ts` | Connected to backend Module H (`DiscountCampaignViewSet`, `DiscountCodeViewSet`) | Frontend routes use `ModuleView` instead of calling Commerce/Discount APIs | **P1** |
| **GAP-07** | Direct Member Bypass | `NewMemberModal` creates `UserProfile` directly with no lead reference | All members must originate as Leads or require an explicit lead link | `src/components/members/NewMemberModal.tsx` calls `POST /api/v1/tenant/users/` | **P1** |
| **GAP-08** | CRM Dashboard | Main dashboard displays mock statistics from `repo.ts` | Real-time CRM KPI endpoints computing lead counts, funnels, and conversion rates | Backend has no CRM dashboard aggregation endpoint | **P2** |
| **GAP-09** | AI Calling | UI shell with mock calls | Real telephony integration or clear label as coming soon | Backend has no calling models or webhook services | **P2** |
| **GAP-10** | Lead Detail Notes | Lead notes cannot be added from frontend | Tab in `LeadDetailDrawer` calling `LeadNoteViewSet` | `LeadDetailDrawer` has no note-taking UI component | **P2** |

---

## 33. What Can Be Reused (High-Value Assets)

1. **`CRMLeadService` (`backend/apps/tenant_core/services_crm.py`):** Excellent, clean service architecture handling atomic transactions, audit logs, and outbox events.
2. **`LeadsWorkspace.tsx` & `NewLeadModal.tsx` (`src/components/crm/`):** Robust, fully responsive, backend-authoritative lead intake and pipeline management.
3. **`models_crm.py` (`backend/apps/tenant_core/models_crm.py`):** All 15 database tables are already migrated and ready for use.
4. **`views_discounts.py` & `models_discounts.py`:** Complete Module H discount engine ready to power Offers and Coupons.
5. **`crmApi.ts` (`src/services/crmApi.ts`):** Already has types and API client functions for leads, lead sources, and follow-up tasks.

---

## 34. What Should NOT Be Duplicated

1. **Do NOT create new models for Offers/Coupons:** Module H (`DiscountCampaign`, `DiscountCode`) already exists. Connect the CRM routes directly to `views_discounts.py`.
2. **Do NOT create a second Trial model:** `TrialBooking` (`tenant_crm_trial_booking`) is complete with status history and attendance tracking.
3. **Do NOT create separate task engines:** `SalesFollowupTask` (`tenant_crm_sales_followup_task`) is purpose-built for CRM follow-ups.
4. **Do NOT bypass Outbox/Audit:** Any new CRM mutations must use `BusinessAuditEvent` and `DomainOutboxEvent` as established in `CRMLeadService`.

---

## 35. Recommended Future Architecture

```
                                RECOMMENDED TARGET ARCHITECTURE

[ FRONTEND CRM LAYER ]
  ├── /crm/leads ──────────► LeadsWorkspace ──────────────► /api/v1/tenant/leads/
  ├── /crm/pipeline ───────► LeadsWorkspace (Pipeline) ───► /api/v1/tenant/leads/{id}/status/
  ├── /crm/trials ─────────► [NEW] TrialsWorkspace ───────► /api/v1/tenant/trial-bookings/
  ├── /crm/activities ─────► [NEW] ActivitiesTimeline ────► /api/v1/tenant/lead-activities/
  ├── /crm/follow-ups ─────► [NEW] FollowupTaskManager ───► /api/v1/tenant/sales-followup-tasks/
  ├── /crm/offers ─────────► [CONNECT] OffersPage ────────► /api/v1/tenant/discount-campaigns/
  ├── /crm/coupons ────────► [CONNECT] CouponsPage ───────► /api/v1/tenant/discount-codes/
  ├── /crm/campaigns ──────► [CONNECT] CampaignsPage ─────► /api/v1/tenant/discount-campaigns/
  └── /crm/dashboard ──────► [NEW] CRMDashboardWidget ────► /api/v1/tenant/crm/metrics/

[ BACKEND SERVICE & DATA LAYER ]
  ├── CRMLeadService
  │     ├── [COMPLETE] convert_lead(lead_id, payload)
  │     │     ├── Atomic UserProfile creation
  │     │     ├── TenantUser assignment (Role: Member)
  │     │     ├── Membership creation (Package assignment)
  │     │     ├── LeadConversion record creation
  │     │     └── Outbox: 'CRM_LEAD_CONVERTED'
  │     │
  │     └── [COMPLETE] checkin_trial(trial_id, attendance_payload)
  │           ├── TrialAttendanceRecord creation
  │           └── TrialBooking status = 'ATTENDED'
  │
  └── CRMMetricsService [NEW]
        ├── get_lead_funnel_metrics()
        ├── get_conversion_rate_metrics()
        └── get_agent_performance_metrics()
```

### Strategic Action Plan
- **KEEP:** `LeadsWorkspace`, `NewLeadModal`, `CRMLeadService`, `models_crm.py`, `models_discounts.py`.
- **CONNECT:** Point `/crm/offers` and `/crm/coupons` to existing `views_discounts.py`.
- **COMPLETE:** Implement `CRMLeadService.convert_lead` to bridge Leads to Members, and replace `ModuleView` in `/crm/trials`, `/crm/activities`, and `/crm/follow-ups` with components connected to existing ViewSets.
- **NEW:** Build a dedicated `CRMMetricsService` to provide real aggregation endpoints for the Executive and CRM Dashboards.

---

## 36. Final Verdict

| Module / Area | Verdict | Summary Evaluation |
| :--- | :---: | :--- |
| **CRM Lead Intake** | 🟢 **COMPLETE** | Production-ready, backend-authoritative, atomic creation with audit and outbox. |
| **Lead Pipeline** | 🟢 **COMPLETE** | Live stage transitions with validation and history logging. |
| **Trial Management** | 🟡 **PARTIAL** | Booking works via Lead modal, but dedicated `/crm/trials` screen is a disconnected mock view. |
| **Sales Activities** | 🟠 **DISCONNECTED** | Backend model and ViewSet exist; frontend route is disconnected and uses mock store. |
| **Follow-ups** | 🟠 **DISCONNECTED** | Backend model and ViewSet exist; frontend route is disconnected and uses mock store. |
| **AI Calling** | ⚫ **MOCK / PLACEHOLDER** | Pure UI shell; zero backend telephony services or data models exist. |
| **Offers** | 🟠 **DISCONNECTED** | Backend Module H exists; frontend uses mock `store.ts`. |
| **Coupons** | 🟠 **DISCONNECTED** | Backend Module H exists; frontend uses mock `store.ts`. |
| **Campaigns** | 🟠 **DISCONNECTED** | Backend Module H exists; frontend uses mock `store.ts`. |
| **Lead $\rightarrow$ Member Conversion** | 🔴 **MISSING / BROKEN** | Changing status to `CONVERTED` does not create a Member or `LeadConversion` record. |
| **CRM RBAC** | 🟡 **PARTIAL** | Basic permissions function, but lack sub-module granularity and automatic branch query filtering. |
| **CRM Analytics Readiness** | 🟡 **PARTIAL** | DB timestamps and outbox events exist for historical metrics, but conversion revenue is missing. |
| **CRM Dashboard / Widget Layer** | ⚫ **MOCK DATA DRIVEN** | Executive dashboard displays mock numbers; zero backend CRM metrics endpoints exist. |
| **OVERALL CRM & SALES** | 🟡 **PARTIAL** | Strong Lead Intake and Schema foundation; mid-funnel screens and conversion bridging remain disconnected. |

---

*Report compiled forensically via direct codebase inspection, schema verification, and database telemetry.*
