# Assessment Module: Comprehensive Gap Analysis (v1 Scope)

**Date**: November 2026  
**Status**: Formal Gap Analysis & Architectural Mapping  
**Rule Adherence**: Planning and analysis only. No application code has been modified.

---

## 1. Executive Summary & v1 Scope Definition

Based on the client specification in [`assesment_docs/Assessment_Module_Client_Requirements_with_images/Assessment_Module_Client_Requirements.md`](file:///home/rc/Sweat-fitness/assesment_docs/Assessment_Module_Client_Requirements_with_images/Assessment_Module_Client_Requirements.md) (Part A Product Spec & Part B Coach Assessment Form) and the forensic codebase audit of `operation/assessment`, this document establishes the precise categorization of all requirements and components.

### Locked Scope Boundaries
- **IN SCOPE (v1 Core Release)**:
  1. Full 17-section coach-led assessment workflow.
  2. Strict 10-question Safety & Readiness Gate with `DEFERRED` and `CANCELLED` terminal/pause statuses.
  3. Mandatory data-source provenance tags (`Measured`, `Calculated`, `Estimated`, `Member-reported`, `Unavailable`) for all vitals and biometrics.
  4. Real member-based calculations for BMI, RMR (Mifflin-St Jeor using actual age/sex), and TDEE with visible estimation disclaimers.
  5. Adaptive 6-domain functional test battery with explicit protocol versioning and physical parameter tracking.
  6. Decoupled symptom and adverse event tracking (pain location/severity, dizziness, dyspnea) separated from performance scores.
  7. Individual test progression records (Section 14) with coach progression criteria.
  8. Strict like-for-like reassessment comparison engine (Section 15) with non-equivalent protocol divergence detection.
  9. Explicit opt-in consents (defaulting to `False`), authenticated coach/member sign-offs, and immutable audit logging.
- **OUT OF SCOPE (Deferred to v2 / Future Scope)**:
  - Camera-based 3D body scanning and volume extraction under Mode A (loose garments) or Mode B.
  - Generative AI transformation photo pipeline (4-step latent deformation and illustrative previews).
  - Automated computer-vision pose/joint-angle extraction and repetition counting.
  - Direct hardware BLE/IoT integration with smart scales or metabolic carts.
  - Complete removal of all simulated constants (posture score 84.50, tilt angles), dummy form defaults, and Unsplash stock milestone images.

---

## 2. Categorization of Requirements & Components

### Category A: Keep As-Is
*Existing infrastructure, migrations, security controls, and utilities that already comply with architectural standards and require no functional alteration.*

| Component / Utility | File Reference | Rationale & Spec Compliance |
|---|---|---|
| **Multi-Tenant Routing Engine** | `config/routers.py`, `config/tenant_middleware.py` | Handles multi-tenant database routing (`get_tenant_db_alias`, `set_tenant_db_alias`). Fully compliant with multi-tenant data isolation. |
| **Tenant Model Scoping** | `backend/apps/tenant_core/models_assessment.py` | `MemberAssessment` correctly binds ForeignKeys to `Organization` and `Branch` with `models.PROTECT`. |
| **Protected Media Infrastructure** | `backend/apps/tenant_core/services_media.py`, `backend/apps/tenant_core/views_media.py` | Media files under `/media/assessments/baseline/` are protected by `ProtectedMediaView` requiring cryptographic HMAC signature or authenticated ownership. |
| **Studio TV Pairing Endpoint Security** | `backend/apps/tenant_core/views_assessment.py:500-560`, `migrations/0089_assessment_pairing_code_expiry.py` | Commit `96348f9` secured pairing: POST only, single-use token consumption, 4-hour TTL, `PairingRedeemThrottle` (10/min), and strict exclusion of vitals/prescriptions in public TV view. |
| **Member Access Isolation** | `backend/apps/tenant_core/views_assessment.py:73-76` | Restricts `MEMBER` user types to retrieving only their own assessments in `APPROVED` status. |
| **Phone Number Masking** | `backend/apps/tenant_core/security_utils.py` | `mask_phone_if_restricted` masks sensitive member contact info for non-privileged staff roles. |
| **Reliability Audit Engine** | `backend/apps/tenant_core/services_reliability.py` | `record_business_audit(...)` function provides structured audit logging into `audit_business_events`. |
| **Catalog Package Matching Service** | `backend/apps/tenant_core/services_assessment.py:110-250` | `match_system_packages` accurately queries active `Package`, `PackageVersion`, and `PackagePrice` records matching goal and session frequency. |
| **Webcam Hardware Interface Modal** | `src/components/assessment/WebCameraCaptureModal.tsx` | Provides clean MediaDevices camera stream, device switching, and client-side photo capture. |
| **Shared Frontend Design Primitives** | `src/components/ui/` | Standard shadcn/ui primitives (`Button`, `Card`, `Badge`, `Dialog`, `Input`, `Select`, `Tabs`, `Sonner`, `Table`) in compliance with design system. |

---

### Category B: Refactor / Fix
*Existing components containing design defects, hardcoded assumptions, non-compliant defaults, or architectural violations that must be overhauled.*

| Target | Current Location | Defect / Non-Compliance | Required Remediation |
|---|---|---|---|
| **Metabolic Nutrition Plan Calculation** | `backend/apps/tenant_core/services_assessment.py:253-328` | Function hardcodes `age = 30` and `sex = 'FEMALE'` if not passed (`S:257-258`). Ignores member's actual date of birth and sex. | Dynamically resolve member age from `UserProfile.dob` / assessment date, and biological sex from profile. Provide visible disclaimers that output is an estimate. |
| **Consent Field Defaults** | `backend/apps/tenant_core/models_assessment.py:245-247` | `consent_body_measurements`, `consent_movement_photos`, `consent_ai_analysis` all default to `True` in schema. | Change schema default to `False`. Implement explicit, granular opt-in checkboxes on intake/sign-off forms. |
| **Status Lifecycle State Machine** | `backend/apps/tenant_core/models_assessment.py:94-100` | Uses `DRAFT`, `TESTING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`. Missing mandatory client states `DEFERRED` and `CANCELLED`. | Update `STATUS_CHOICES` to include `DEFERRED` (medical hold) and `CANCELLED` (safety stop / abort). Support `COMPLETED` alongside `APPROVED`. |
| **View Logic & Serialization** | `backend/apps/tenant_core/views_assessment.py:78-314`, `386-489` | Views parse raw `request.data` directly and format responses using a 103-line manual dictionary serializer `_serialize_assessment`. Violates DRF best practices. | Introduce proper DRF serializers (`MemberAssessmentDetailSerializer`, `MemberAssessmentWriteSerializer`, `SafetyScreeningSerializer`, `VitalsSerializer`). Keep views thin. |
| **God-File Service Architecture** | `backend/apps/tenant_core/services_assessment.py` (548 lines) | Service mixes entitlement checks, package matching, metabolic calculations, CV stubs, and approval dispatches. | Extract domain services under `services_assessment_*.py`: `services_assessment_metrics.py` (BMI/RMR/TDEE), `services_assessment_screening.py` (Safety Gate). |
| **Monolithic Frontend Workspace** | `src/components/assessment/AssessmentStudioWorkspace.tsx` (1,366 lines) | Massive component violating the <1,000 line rule. Holds all state, forms, tables, and modal triggers in one file. | Modularize into feature components under `src/components/assessment/` (<300 lines each): `IntakeStep`, `ScreeningStep`, `VitalsStep`, `MovementStep`, `ReviewStep`. |
| **Safety Gate UI Enforcement** | `src/components/assessment/AssessmentStudioWorkspace.tsx:79-90`, `679-682` | Only 4 questions rendered in UI. Other 6 questions auto-sent as `"No"`. No UI mechanism to defer or stop assessment upon affirmative high-risk answers. | Render all 10 questions. If high-risk questions (chest pain, fainting, dizziness) are affirmative, lock testing step and enforce `DEFERRED` or `CANCELLED` status. |
| **Frontend API Typing** | `src/api/endpoints/assessmentApi.ts` | Types contain optional fields with `any` fallback and missing provenance tags or progression types. | Update TypeScript interfaces to strictly match the enhanced 17-section backend model contract without `any`. |
| **Approval Authorization Gate** | `backend/apps/tenant_core/views_assessment.py:359-384` | Any authenticated user in tenant can trigger `approve_and_send`. | Enforce strict role check: only users with `TRAINER`, `COACH`, or `ADMIN` roles can approve. Members forbidden. |

---

### Category C: Remove
*Simulated data, fake computer vision algorithms, and hardcoded UI defaults that undermine data integrity and violate client trust.*

| Item to Remove | Location | Reason for Removal |
|---|---|---|
| **Hardcoded CV Posture Constants** | `backend/apps/tenant_core/services_assessment.py:427-448`, `views_assessment.py:341-348` | Hardcoded `posture_score: 84.50`, `shoulder_tilt_degrees: 1.8`, `hip_tilt_degrees: 1.2`, `forward_head_angle_degrees: 4.5`, `waist_to_hip_ratio: 0.78` and static note. Fabricated metrics presented as real measurements. |
| **Hardcoded Default Vitals in UI** | `src/components/assessment/AssessmentStudioWorkspace.tsx:96-100` | UI pre-fills `heightCm = 168`, `weightKg = 64`, `waistCm = 76`, `restingHr = 72`, `restingBp = '120/80'`. Submitting without typing logs fake vitals. |
| **Hardcoded Movement Test Values** | `src/components/assessment/AssessmentStudioWorkspace.tsx:111-119` | UI pre-fills `reps: 14`, `pushup_reps: 10`, `hold_seconds: 45`, `single_leg: 25/28`, etc., logging unperformed tests. |
| **Unsplash Stock Milestone Photos** | `backend/apps/tenant_core/views_assessment.py:350-352`, `AssessmentStudioWorkspace.tsx:481, 492, 503` | Hardcoded Unsplash stock images of random models (`photo-1518611012118...`, etc.) presented as Month 1/2/3 member milestone transformations. |
| **Bypass Paywall Flag Default** | `src/api/endpoints/assessmentApi.ts:209` | `bypass_paywall: true` hardcoded on every start assessment call without checking entitlement. |

---

### Category D: Add (Missing Requirements)
*New schema models, database fields, business services, and user interfaces required to fulfill the client specification in v1.*

| Feature / Entity | Type | Details & Specification Reference |
|---|---|---|
| **Data-Source Provenance Tags** | Model Field / Enums | Store explicit provenance tag per biometric entry: `MEASURED`, `CALCULATED`, `ESTIMATED`, `MEMBER_REPORTED`, `UNAVAILABLE` in `measurement_metadata`. |
| **10-Question Health Screening Model** | Structured Schema / Validation | Explicit JSON schema/serializer ensuring all 10 Section 2.1 questions are validated and stored with coach escalation notes. |
| **Protocol Versioning & Setup Parameters** | Model / Payload Schema | Store `protocol_id`, `protocol_version`, bench/chair height (`cm`), incline surface height (`cm`), load (`kg`), band tension, and grip orientation per test. |
| **Decoupled Symptom Tracking** | Model Field / Structure | Separate symptom records: pain location, pain severity (0–10), dizziness, dyspnea, adverse events, stopping reason (`Fatigue`, `Technique Limit`, `Discomfort`, `Safety Stop`). |
| **Test Validity Status Tracking** | Enum Field | Explicit status per test: `VALID`, `MODIFIED`, `INCOMPLETE`, `NOT_ASSESSED`. |
| **Individual Test Progression Records** | New Model `AssessmentTestProgression` | Section 14 records: exercise name, baseline variation, load/assistance, achieved reps/duration, movement quality rating, next target variation, progression criteria, review date, coach approval. |
| **Like-for-Like Reassessment Engine** | Service & UI | Section 15 engine: links to `previous_assessment`, compares identical variations, flags protocol divergence with `"Non-Equivalent Protocol / Variation Changed"` banner. |
| **Mutual Authenticated Sign-Off** | Schema Fields | Coach signature timestamp & user ID; member digital acknowledgement timestamp & verified ID. |
| **DRF Serializers Package** | Backend Code | `serializers_assessment.py` containing validated serializers for intake, vitals, movement tests, and detail representation. |
| **Modular React Multi-Step Components** | Frontend Components | Modular UI components in `src/components/assessment/` with clean TanStack Query hooks and reactive error handling. |

---

## 3. Summary Gap Matrix

```
┌─────────────────────────────────┬───────────┬──────────────┬──────────────┬──────────────┐
│ Requirement Domain              │ Spec Sect │ Current State│ Target v1    │ Action       │
├─────────────────────────────────┼───────────┼──────────────┼──────────────┼──────────────┤
│ 1. Status Lifecycle             │ Sec 17    │ 5 statuses   │ 7 statuses   │ Refactor     │
│ 2. Safety Gate (10 questions)   │ Sec 2     │ 4 in UI      │ 10 + Gate    │ Refactor/Add │
│ 3. Data-Source Provenance Tags  │ Sec 3     │ None         │ Mandatory    │ Add          │
│ 4. Vitals & Nutrition Math      │ Sec 3     │ Fake/Fixed   │ Real Member  │ Fix/Clean    │
│ 5. Adaptive Test Battery        │ Sec 5-11  │ Untyped JSON │ Versioned    │ Refactor/Add │
│ 6. Decoupled Symptoms           │ Sec 4-11  │ None         │ Dedicated    │ Add          │
│ 7. Individual Progressions      │ Sec 14    │ None         │ Model + UI   │ Add          │
│ 8. Reassessment Comparison      │ Sec 15    │ None         │ Like-for-Like│ Add          │
│ 9. Consents & Sign-Off          │ Sec 16    │ Default True │ Opt-in False │ Refactor/Add │
│ 10. Audit Logging               │ Sec 17    │ Partial      │ Full Trail   │ Keep/Extend  │
│ 11. Hardware / 3D Body CV       │ Part A    │ Fake Stubs   │ Out of Scope │ Remove       │
│ 12. Generative AI Images        │ Part A    │ Unsplash     │ Out of Scope │ Remove       │
└─────────────────────────────────┴───────────┴──────────────┴──────────────┴──────────────┘
```

This completes the gap analysis. All requirements are cleanly mapped to concrete architectural actions.
