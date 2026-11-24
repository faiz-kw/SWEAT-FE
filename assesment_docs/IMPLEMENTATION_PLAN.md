# Assessment Module: Implementation Plan (v1 Production Scope)

**Date**: November 2026  
**Status**: Execution Roadmap  
**Standards**: Strict compliance with [`AGENTS.md`](file:///home/rc/Sweat-fitness/AGENTS.md) (Multi-tenant `.using(alias)`, `organization=org`, `@transaction.atomic`, `record_business_audit`, DRF serializers, modules <500 lines, React components <300 lines with zero `any` types).

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │          React Frontend (TanStack)            │
                      │  src/components/assessment/                   │
                      │  ├── AssessmentStudioWorkspace.tsx (Shell)   │
                      │  ├── steps/IntakeStep.tsx (<300L)            │
                      │  ├── steps/SafetyScreeningStep.tsx (<300L)   │
                      │  ├── steps/VitalsStep.tsx (<300L)            │
                      │  ├── steps/MovementBatteryStep.tsx (<300L)   │
                      │  ├── steps/ReviewSignOffStep.tsx (<300L)     │
                      │  └── steps/DisplayMirrorStep.tsx (<300L)     │
                      └───────────────────────┬───────────────────────┘
                                              │ Typed API Client
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │              DRF REST Endpoints               │
                      │  backend/apps/tenant_core/views_assessment.py │
                      │  └── AssessmentSessionViewSet (Thin Views)    │
                      └───────────────────────┬───────────────────────┘
                                              │ Validated Data
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │              DRF Serializers                  │
                      │  backend/apps/tenant_core/                    │
                      │  └── serializers_assessment.py                │
                      └───────────────────────┬───────────────────────┘
                                              │ Atomic Business Calls
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │               Service Layer                   │
                      │  backend/apps/tenant_core/                    │
                      │  ├── services_assessment.py (Orchestration)   │
                      │  ├── services_assessment_screening.py (Gate)  │
                      │  ├── services_assessment_metrics.py (Math)    │
                      │  └── services_assessment_progress.py (Compare)│
                      └───────────────────────┬───────────────────────┘
                                              │ Multi-tenant ORM .using(alias)
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │               Database Models                 │
                      │  backend/apps/tenant_core/                    │
                      │  ├── models_assessment.py                     │
                      │  │   ├── MemberAssessment                     │
                      │  │   └── AssessmentTestProgression (New)      │
                      │  └── migrations/0092_assessment_v1_alignment  │
                      └───────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema, Migrations & Core Models

### Goal
Establish the complete, normalized data model supporting the 17-section client specification, lifecycle state machine (`DEFERRED`, `CANCELLED`), protocol versioning, decoupled symptoms, data provenance enums, progression tracking, and opt-in consent compliance.

### 1. Files Affected
- **Modify**:
  - [`backend/apps/tenant_core/models_assessment.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/models_assessment.py)
- **Create**:
  - `backend/apps/tenant_core/migrations/0092_assessment_v1_alignment.py` (via `makemigrations`)
  - [`backend/tests/test_assessment_models.py`](file:///home/rc/Sweat-fitness/backend/tests/test_assessment_models.py)

### 2. Step-by-Step Tasks
1. **Update `MemberAssessment.STATUS_CHOICES`**:
   - Add `DEFERRED` ('Deferred Pending Medical Clearance / Clarification') and `CANCELLED` ('Cancelled Due to Symptoms or Safety Concerns').
   - Support standard lifecycle: `DRAFT`, `TESTING` (In Progress), `PENDING_REVIEW`, `APPROVED` (Completed), `DEFERRED`, `CANCELLED`.
2. **Update Consents Schema Defaults**:
   - Change defaults of `consent_body_measurements`, `consent_movement_photos`, `consent_ai_analysis` from `True` to `False` (strict GDPR/opt-in compliance).
   - Add `consent_secondary_use` (`BooleanField(default=False)`).
3. **Add Provenance Tagging & Screening Schemas**:
   - Formalize `measurement_metadata` structure to store explicit provenance per metric (`MEASURED`, `CALCULATED`, `ESTIMATED`, `MEMBER_REPORTED`, `UNAVAILABLE`).
   - Store full 10-question PAR-Q payload schema in `health_screening`.
4. **Decoupled Symptoms & Protocol Versioning**:
   - Add `symptoms_and_safety_events` (`JSONField(default=dict, blank=True)`) to decouple pain reports, dizziness, and adverse events from movement performance scores.
   - Add `previous_assessment` (`ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_assessments')`) for longitudinal tracking.
5. **Create `AssessmentTestProgression` Model**:
   - Dedicated model in `models_assessment.py` for Section 14 individual test progressions:
     - `id` (`UUIDField`), `assessment` (`ForeignKey(MemberAssessment)`), `user_profile` (`ForeignKey(UserProfile)`).
     - `exercise_name` (`CharField(max_length=100)`).
     - `current_variation` (`CharField(max_length=100)`), `current_load_kg` (`DecimalField`), `current_assistance` (`CharField`).
     - `current_reps_or_duration` (`CharField(max_length=50)`).
     - `movement_quality` (`CharField(max_length=50)`).
     - `reported_symptoms` (`TextField(blank=True)`).
     - `next_progression_target` (`CharField(max_length=100)`).
     - `progression_criteria` (`TextField()`).
     - `review_date` (`DateField(null=True, blank=True)`).
     - `coach_approved_by` (`ForeignKey(TenantUser, null=True, blank=True)`).
     - Multi-tenant fields: `organization` (`ForeignKey(Organization)`), `created_at`, `updated_at`.
6. **Generate & Review Migration**:
   - Run `python manage.py makemigrations tenant_core --name assessment_v1_alignment`.
   - Inspect generated migration to ensure no data loss, safe nullability, and non-destructive alters.

### 3. Verification Criteria & Test Commands
```bash
# Execute in backend/ with venv active
cd backend
python manage.py makemigrations --check --dry-run
python manage.py test tests.test_assessment_models --settings=config.settings
```
- **Criteria for Completion**:
  - `MemberAssessment` creates records with `DEFERRED` and `CANCELLED` statuses.
  - Consents default to `False`.
  - `AssessmentTestProgression` persists progression criteria linked to members.
  - Migration executes cleanly on tenant test databases with zero schema errors.

---

## Phase 2: Backend Serializers, Services, APIs & Unit/API Tests

### Goal
Decompose god-files, introduce DRF serializers, eliminate fake computer-vision stubs and stock image URLs, fix metabolic calculations with real member attributes, implement the Safety Gate logic, and deliver full test coverage.

### 1. Files Affected
- **Create**:
  - [`backend/apps/tenant_core/serializers_assessment.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/serializers_assessment.py) (<450 lines)
  - [`backend/apps/tenant_core/services_assessment_metrics.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/services_assessment_metrics.py) (<350 lines)
  - [`backend/apps/tenant_core/services_assessment_screening.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/services_assessment_screening.py) (<250 lines)
  - [`backend/apps/tenant_core/services_assessment_progress.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/services_assessment_progress.py) (<300 lines)
  - [`backend/tests/test_assessment_v1_services.py`](file:///home/rc/Sweat-fitness/backend/tests/test_assessment_v1_services.py)
  - [`backend/tests/test_assessment_v1_api.py`](file:///home/rc/Sweat-fitness/backend/tests/test_assessment_v1_api.py)
- **Modify**:
  - [`backend/apps/tenant_core/services_assessment.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/services_assessment.py) (Refactor down to <400 lines)
  - [`backend/apps/tenant_core/views_assessment.py`](file:///home/rc/Sweat-fitness/backend/apps/tenant_core/views_assessment.py) (Refactor down to <350 lines)

### 2. Step-by-Step Tasks
1. **Build `serializers_assessment.py`**:
   - `HealthScreeningSerializer`: Validates all 10 PAR-Q questions.
   - `VitalsMeasurementSerializer`: Validates biometrics with mandatory provenance tags.
   - `FunctionalTestItemSerializer`: Validates protocol version, variations, reps, load, quality, symptoms, and test status (`VALID`, `MODIFIED`, `INCOMPLETE`, `NOT_ASSESSED`).
   - `AssessmentTestProgressionSerializer`: Serializes progression targets and coach approval.
   - `MemberAssessmentDetailSerializer`: Replaces the manual `_serialize_assessment` dictionary builder with structured, validated output.
   - `MemberAssessmentWriteSerializer`: Handles validated intake, vitals updates, and coach sign-off payloads.
2. **Implement `services_assessment_screening.py`**:
   - `evaluate_safety_readiness(screening_data)`:
     - Scrutinizes answers to chest pain, fainting/dizziness, breathlessness, surgical restrictions.
     - Enforces gate rules: high-risk red flags automatically return `DEFER_MEDICAL_CLEARANCE` or `STOPPED_SAFETY_CONCERNS`.
     - Flags clinical escalation (minors, pregnancy, severe clinical symptoms).
3. **Implement `services_assessment_metrics.py`**:
   - Fix Mifflin-St Jeor calculation: resolve member's true age from `UserProfile.dob` and biological sex from profile.
   - Provide explicit disclaimers: `"Estimated via Mifflin-St Jeor formula with physical activity multiplier"`.
   - Remove fake CV metrics (`posture_score: 84.50`, fixed angles) and Unsplash stock photos.
   - Calculate BMI and display contextual screening disclaimer: `"BMI is a screening metric, not a direct measure of body fat or muscularity."`
4. **Implement `services_assessment_progress.py`**:
   - Like-for-like comparison engine:
     - Compare current assessment with `previous_assessment`.
     - Compare only identical protocols and variations.
     - If protocol or variation changed (e.g. knee push-up to floor push-up), flag as `non_equivalent_comparison: true` with a clear explanation note.
5. **Refactor `views_assessment.py`**:
   - Convert `create`, `partial_update`, and `retrieve` to use the new serializers and sub-services.
   - Strict RBAC on `approve_and_send`: Only authenticated users with `TRAINER`, `COACH`, or `ADMIN` roles can approve. Members receive HTTP 403.
   - Multi-tenant safety: Ensure all queries use `.using(alias)` and filter by `organization=org`.

### 3. Verification Criteria & Test Commands
```bash
# Execute in backend/
python manage.py test tests.test_assessment_v1_services --settings=config.settings
python manage.py test tests.test_assessment_v1_api --settings=config.settings
ruff check apps/tenant_core/serializers_assessment.py apps/tenant_core/services_assessment*.py apps/tenant_core/views_assessment.py
```
- **Criteria for Completion**:
  - All 10 screening questions validated; red flags return `DEFERRED` or `CANCELLED`.
  - RMR calculation produces dynamic values based on real member DOB and sex.
  - Zero hardcoded CV posture constants and zero Unsplash stock URLs in output.
  - Non-staff user attempting to approve an assessment receives HTTP 403 Forbidden.
  - All tests pass with zero regressions in multi-tenant test databases.

---

## Phase 3: Modular React Multi-Step Assessment Flow

### Goal
Break down the 1,366-line `AssessmentStudioWorkspace.tsx` into clean, maintainable, single-responsibility components (<300 lines each). Eliminate hardcoded dummy form defaults. Implement the strict 10-question Safety Gate in the UI, vitals logging with provenance dropdowns, adaptive test battery, and opt-in consents.

### 1. Files Affected
- **Create**:
  - `src/components/assessment/steps/AssessmentIntakeStep.tsx` (<280 lines)
  - `src/components/assessment/steps/AssessmentSafetyGateStep.tsx` (<280 lines)
  - `src/components/assessment/steps/AssessmentVitalsStep.tsx` (<280 lines)
  - `src/components/assessment/steps/AssessmentMovementStep.tsx` (<290 lines)
  - `src/components/assessment/steps/AssessmentGoalsStep.tsx` (<250 lines)
  - `src/components/assessment/steps/AssessmentReviewSignOffStep.tsx` (<280 lines)
  - `src/components/assessment/steps/AssessmentTvDisplayStep.tsx` (<260 lines)
  - `src/components/assessment/shared/ProvenanceSelect.tsx` (<120 lines)
  - `src/components/assessment/shared/SymptomLoggerModal.tsx` (<180 lines)
- **Modify**:
  - [`src/api/endpoints/assessmentApi.ts`](file:///home/rc/Sweat-fitness/src/api/endpoints/assessmentApi.ts) (Strict typing, no `any`, endpoints for progression & comparison)
  - [`src/components/assessment/AssessmentStudioWorkspace.tsx`](file:///home/rc/Sweat-fitness/src/components/assessment/AssessmentStudioWorkspace.tsx) (Refactor into a clean master orchestrator shell <250 lines)

### 2. Step-by-Step Tasks
1. **Update API Types in `assessmentApi.ts`**:
   - Define strict TypeScript interfaces: `HealthScreeningAnswers`, `BiometricMetricWithProvenance`, `FunctionalExerciseResult`, `TestProgressionRecord`, `ReassessmentComparison`.
   - Remove all `any` fallbacks.
2. **Build `AssessmentSafetyGateStep.tsx`**:
   - Render all 10 Section 2.1 PAR-Q readiness questions with explicit options (*Yes, No, Prefer to discuss privately*).
   - Reactive Safety Gate: If member answers "Yes" to chest pain, fainting, dizziness, or breathlessness, show a prominent **Safety Alert Banner**.
   - Provide coach outcome controls: *Cleared*, *Proceed with Modifications*, *Defer Pending Medical Clearance*, *Stop Assessment*.
   - If *Defer* or *Stop* is selected, block subsequent physical testing steps and transition session state.
3. **Build `AssessmentVitalsStep.tsx`**:
   - Form for height, weight, waist, resting HR/BP.
   - **Crucial**: Inputs initialize as empty/null. No pre-filled 168cm or 64kg dummy numbers.
   - Integrate `ProvenanceSelect.tsx` next to each metric (*Measured, Calculated, Estimated, Member-reported, Unavailable*).
   - Display real-time Mifflin-St Jeor RMR/TDEE calculation with visible estimation disclaimer.
4. **Build `AssessmentMovementStep.tsx`**:
   - Render the 6 core domains: Lower Body, Upper Body, Core, Balance, Mobility, Cardio.
   - Form inputs initialize clean without hardcoded reps or durations.
   - Each test includes: Protocol variation selector, target bench/incline height, assistance load, reps/duration, movement quality rubric, test status (*Valid, Modified, Incomplete, Not assessed*).
   - Decoupled symptom button opening `SymptomLoggerModal.tsx` to record pain location/severity independently.
5. **Build `AssessmentReviewSignOffStep.tsx`**:
   - Domain capability matrix summary (*Beginner, Developing, Established, Not assessed*).
   - Real catalog package recommendation display.
   - Separate opt-in consent checkboxes (defaulting unchecked):
     - [ ] Consent to body measurements
     - [ ] Consent to movement photos/videos
     - [ ] Consent to AI movement analysis
     - [ ] Consent to studio privacy policy secondary uses
   - Member digital acknowledgement statement.
   - Coach electronic approval button with confirmation dialog.
6. **Build `AssessmentTvDisplayStep.tsx`**:
   - Studio mirror presentation view connecting via pairing code.
   - Completely removes Unsplash stock images. Displays live approved milestones, posture ratings, and goals.

### 3. Verification Criteria & Test Commands
```bash
# Execute in workspace root
npx tsc --noEmit
npm run lint
npm run build
```
- **Criteria for Completion**:
  - `AssessmentStudioWorkspace.tsx` and all child step components are strictly under 300 lines each.
  - Zero TypeScript compile errors (`tsc --noEmit` exits with 0).
  - No inputs pre-fill fake measurements or exercise counts.
  - Answering "Yes" to chest pain successfully triggers the safety gate and prevents progression to physical testing.
  - Opt-in consent checkboxes start unchecked (`false`).

---

## Phase 4: Reassessment Dashboard, Progression Tracking & End-to-End Verification

### Goal
Build the Section 14 individual test progression management UI, implement the Section 15 like-for-like reassessment comparison dashboard, and perform complete end-to-end verification across both coach tablet and TV mirror modes.

### 1. Files Affected
- **Create**:
  - `src/components/assessment/reassessment/ReassessmentComparisonView.tsx` (<280 lines)
  - `src/components/assessment/reassessment/IndividualProgressionCard.tsx` (<220 lines)
  - `src/components/assessment/reassessment/NonEquivalentProtocolWarning.tsx` (<120 lines)
  - [`backend/tests/test_assessment_reassessment_flow.py`](file:///home/rc/Sweat-fitness/backend/tests/test_assessment_reassessment_flow.py)
- **Modify**:
  - [`src/routes/_shell/ops.assessments.tsx`](file:///home/rc/Sweat-fitness/src/routes/_shell/ops.assessments.tsx) (Add tabs for New Assessment, Reassessment Comparison, Active Progressions)

### 2. Step-by-Step Tasks
1. **Implement `IndividualProgressionCard.tsx`**:
   - Section 14 UI component displaying per-exercise progression cards.
   - Shows current baseline variation, movement quality rubric, coach-defined criteria for advancing, next progression target, and review date.
   - Allows coach to sign off on advancement only after criteria are verified.
2. **Implement `ReassessmentComparisonView.tsx`**:
   - Compares current assessment against selected baseline (`previous_assessment`).
   - Side-by-side metric tables (Weight, Waist, Resting HR, Push-up, Squat, Plank, Balance, Cardio).
   - If protocol or variation is identical, renders delta change (e.g. `+4 reps`, `-2.1 cm waist`).
   - If variation changed (e.g. wall push-up $\rightarrow$ high-incline push-up), displays `NonEquivalentProtocolWarning.tsx` with `"Protocol Progression: Not a direct mathematical comparison"`.
3. **End-to-End Verification Across User Roles**:
   - Verify coach intake workflow: create member $\rightarrow$ safety screen $\rightarrow$ vitals $\rightarrow$ movement tests $\rightarrow$ goals $\rightarrow$ sign-off.
   - Verify safety stop workflow: trigger chest pain $\rightarrow$ status becomes `DEFERRED` / `CANCELLED` $\rightarrow$ audit log recorded.
   - Verify member view: member logs into mobile/portal $\rightarrow$ sees only their own `APPROVED` assessment $\rightarrow$ unapproved draft is hidden.
   - Verify TV pairing: pair via 6-digit code $\rightarrow$ code expires after 4 hours $\rightarrow$ single-use consumption upon approved reveal $\rightarrow$ vitals and prescriptions hidden from public TV.

### 3. Verification Criteria & Test Commands
```bash
# 1. Backend test suite
cd backend
python manage.py test tests.test_assessment_security_fixes tests.test_assessment_models tests.test_assessment_v1_services tests.test_assessment_v1_api tests.test_assessment_reassessment_flow --settings=config.settings
ruff check apps/tenant_core/views_assessment.py apps/tenant_core/services_assessment*.py apps/tenant_core/serializers_assessment.py

# 2. Frontend verification
cd ..
npx tsc --noEmit
npm run lint
npm run build

# 3. Secret scan
git diff --cached | grep -iE "password|secret|api[_-]?key|token|otp" || true
```
- **Criteria for Completion**:
  - All backend Django tests pass (100% green).
  - Frontend builds with zero TypeScript errors or ESLint violations.
  - Side-by-side reassessment view accurately alerts on non-equivalent protocol changes.
  - Individual test progressions are independently tracked and updateable.
  - Secret scan returns clean.

---

## Phase Execution Checklist & Governance

| Phase | Description | Deliverables | Gate Condition |
|---|---|---|---|
| **Phase 1** | Database Schema & Core Models | `models_assessment.py`, migration `0092`, `test_assessment_models.py` | `makemigrations --check` clean, unit tests pass on tenant DB. |
| **Phase 2** | Serializers, Services, APIs & Tests | `serializers_assessment.py`, sub-services, thin views, API tests | 100% green API tests, no fake CV or Unsplash stock stubs, strict RBAC verified. |
| **Phase 3** | Modular React Flow (<300L Components) | Sub-step components, typed API client, reactive safety gate | Zero `any` types, zero TypeScript errors, blocking safety gate verified in UI. |
| **Phase 4** | Reassessment & E2E Verification | Reassessment comparison UI, progression cards, E2E test report | Complete 17-section flow verified, like-for-like warnings active, production ready. |

---

*This plan is locked and ready for execution. All implementation work will strictly follow the four phases in order upon approval.*
