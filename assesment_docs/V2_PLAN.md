# Assessment Module — V2 Implementation Plan: Continuous Fitness Management

**Date**: November 2026  
**Status**: Post-Phase-4 / V2 Execution Roadmap  
**Prerequisite**: Phase 1–4 completed, verified, and passing all quality and security gates  
**Standards**: Strict compliance with [`AGENTS.md`](file:///home/rc/Sweat-fitness/AGENTS.md) (Multi-tenant `.using(alias)`, `organization=org`, `@transaction.atomic`, `record_business_audit`, DRF serializers, modules <500 lines, React components <300 lines with zero `any` types).

---

## 1. Executive Summary & V2 Objective

Phases 1 through 4 established the institutional assessment foundation:
- 17-section multi-step assessment workflow
- Safety & Readiness Gate with medical deferral/cancellation lifecycles
- Provenance-aware metric logging (empty defaults, zero pre-filled dummy numbers)
- Accurate Mifflin-St Jeor metabolic math (RMR, TDEE, BMI disclaimers)
- 6-domain movement battery with decoupled adverse-event/symptom tracking
- Individual exercise progression tracking with quality rubrics
- Like-for-like reassessment comparison with non-equivalent protocol warnings
- Strict coach approval and member opt-in consent model
- Ephemeral, token-bound TV pairing display

**V2 transforms this point-in-time assessment engine into a continuous, closed-loop fitness management platform.**

```
                           ┌──────────────────────────┐
                           │   1. Initial Assessment  │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │  2. Baseline & Findings  │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │   3. Personalised Plan   │
                           │   (Training & Nutrition) │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │   4. Train & Log Data    │
                           │  (Attendance & Adherence)│
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │   5. Progress Tracking   │
                           │  (Metrics & Real Photos) │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │     6. Reassessment      │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │  7. Compare & Interpret  │
                           └─────────────┬────────────┘
                                         ▼
                           ┌──────────────────────────┐
                           │   8. Adjust Plan/Target  │
                           └─────────────┬────────────┘
                                         │
                                         └───────────────► (Repeat Loop)
```

---

## 2. V2 System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   Member Profile                       │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               V1 Core Assessment Engine                │
                    │        (PAR-Q Gate + Vitals + Movement Battery)        │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                 ┌──────────────────────────────┼────────────────────────────┐
                 ▼                              ▼                            ▼
        ┌──────────────────┐           ┌──────────────────┐        ┌──────────────────┐
        │ Findings Engine  │           │   Progression    │        │  Goal & Timeline │
        │ (Interpreted)    │           │     Tracking     │        │   Intelligence   │
        └────────┬─────────┘           └────────┬─────────┘        └────────┬─────────┘
                 │                              │                           │
                 └──────────────────────────────┼───────────────────────────┘
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                 Personalised Planning                  │
                    │      ┌─────────────────────┐   ┌─────────────────────┐ │
                    │      │    Training Plan    │   │   Nutrition Plan    │ │
                    │      │  (Phases, Exercises)│   │  (Macros, Hydration)│ │
                    │      └──────────┬──────────┘   └──────────┬──────────┘ │
                    └─────────────────┼─────────────────────────┼────────────┘
                                      ▼                         ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                 Execution & Adherence                  │
                    │             (Session Logs, Check-ins, CRM)             │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               Continuous Progress Monitor              │
                    │      (Metrics Trends, Real Progress Photos, IoT)       │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                Reassessment Comparison                 │
                    │          (Like-for-Like Protocols, Deltas)             │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │              Coach Command Center Dashboard            │
                    │          (Portfolio Alerts, Interventions)             │
                    └────────────────────────────────────────────────────────┘

  [Sidecar Extension Layers]
  ├── Phase 11: Transformation Preview (External Image Adapter, Anti-Hallucination Validation)
  ├── Phase 12: Modular AI/CV Observation Layer (Human Override Mandatory)
  └── Phase 13: Hardware & IoT Normalisation Layer (BLE / Smart Scale Adapters)
```

---

## 3. The 12 Non-Negotiable V2 Rules

1. **Never fabricate measurements**: Missing tests or unavailable devices must log `UNAVAILABLE` or `NOT_MEASURABLE`; never insert dummy or zero defaults.
2. **Never convert an estimate into a measured value**: Mifflin-St Jeor outputs, visual body fat estimations, and client reports must carry provenance metadata (`ESTIMATED` / `MEMBER_REPORTED`) and never masquerade as DEXA or caliper measurements.
3. **Never let AI override safety/readiness decisions**: If PAR-Q or physical testing triggers `DEFERRED` or `STOP_TEST`, no AI model or automated plan generator can clear the member. Only certified human coaches with medical clearance can advance the member.
4. **Never treat an AI transformation preview as an actual prediction**: Transformation images are strictly illustrative visualisations. They must bear mandatory disclaimers and never be marketed as expected, guaranteed, or medical outcomes.
5. **Never compare non-equivalent test protocols**: Reassessment comparisons between altered variations (e.g. Incline Push-Up vs Standard Push-Up) must suppress mathematical rep deltas and display an explicit non-equivalent warning.
6. **Never activate a training or nutrition plan without human coach approval**: Generated recommendations stay in `DRAFT` or `COACH_REVIEW` status. A certified staff member must explicitly approve and sign off before member dispatch.
7. **Never expose sensitive member data in TV display mode**: Studio screens pair via short-lived, token-bound codes and display only sanitized, opt-in exercise guidance payloads (no medical notes, PAR-Q history, or personal contact info).
8. **Never bypass multi-tenant isolation**: Every database query must specify `.using(alias)` with explicit `organization=org` scoping. Cross-tenant reads/writes are fatal violations.
9. **Never mix real progress photos with simulated transformation images**: Real member photos are encrypted, private records. AI previews are clearly tagged visual artifacts stored in a separate bucket partition.
10. **Never mutate raw assessment results when generating interpretations**: Raw test scores are immutable audit points. Findings and interpretations exist as independent relational entities linked via foreign keys.
11. **Every AI/CV observation must declare provenance, confidence, and model version**: Machine vision data must be logged as `AI_OBSERVATION` with confidence scores and require coach confirmation before entering baseline records.
12. **Every sensitive health, safety, and plan action must be audited**: State transitions, coach overrides, photo uploads, and plan approvals must record structured entries in `record_business_audit`.

---

## 4. Phase-by-Phase Execution Roadmap (Phases 5 to 16)

---

### Phase 5 — Assessment Interpretation & Findings Engine

#### Goal
Transform immutable raw assessment metrics into structured, coach-facing findings and prescriptive recommendations without altering underlying measurement data. Replace static text with an extensible, auditable findings engine.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_assessment_findings.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_assessment_interpretation.py`
- **Backend Services**: `backend/apps/tenant_core/services_assessment_interpretation.py`
- **Backend Views**: `backend/apps/tenant_core/views_assessment_findings.py`
- **Frontend Components**:
  - `src/components/assessment/findings/AssessmentFindingsView.tsx` (<280L)
  - `src/components/assessment/findings/FindingCard.tsx` (<220L)
  - `src/components/assessment/findings/CoachFindingOverrideModal.tsx` (<200L)
- **Tests**: `backend/tests/test_assessment_interpretation.py`

#### 2. Technical Specifications & Data Models
- **`AssessmentFinding` Model**:
  ```python
  class AssessmentFinding(BaseTenantModel):
      assessment = models.ForeignKey(MemberAssessment, on_delete=models.CASCADE, related_name='findings')
      domain = models.CharField(max_length=64)  # e.g. LOWER_BODY_STRENGTH, CARDIORESPIRATORY
      test_reference = models.CharField(max_length=64, blank=True)
      finding_type = models.CharField(max_length=64, choices=FindingType.choices)
      severity = models.CharField(max_length=32, choices=FindingSeverity.choices) # LOW, MODERATE, HIGH
      status = models.CharField(max_length=32, choices=FindingStatus.choices, default='ACTIVE') # ACTIVE, RESOLVED, SUPERSEDED
      baseline_result = models.CharField(max_length=128)
      capability_level = models.CharField(max_length=64) # DEVELOPING, COMPETENT, ADVANCED
      interpretation = models.TextField()
      recommended_action = models.TextField()
      coach_notes = models.TextField(blank=True)
      coach_override = models.BooleanField(default=False)
      coach_overridden_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
      source_protocol = models.JSONField(default=dict)
      source_data = models.JSONField(default=dict)
  ```
- **Finding Types**:
  `STRENGTH_LIMITATION`, `MOBILITY_LIMITATION`, `BALANCE_LIMITATION`, `CARDIO_LIMITATION`, `CORE_LIMITATION`, `MOVEMENT_QUALITY`, `ASYMMETRY`, `RECOVERY_CONCERN`, `ADHERENCE_CONCERN`, `SAFETY_CONCERN`, `NO_SIGNIFICANT_LIMITATION`.
- **Coach Override Flow**:
  Coaches can accept, modify, reject, or inject custom findings. Every change triggers `record_business_audit(action='ASSESSMENT_FINDING_OVERRIDE')`.
- **API Endpoints**:
  - `GET /api/v1/assessments/{id}/findings/`
  - `POST /api/v1/assessments/{id}/findings/override/`
  - `POST /api/v1/assessments/{id}/findings/custom/`

#### 3. Verification & Acceptance Criteria
- Unit tests verify findings generate cleanly from valid assessment scores.
- Unperformed or `UNAVAILABLE` tests do not trigger spurious limitations.
- Safety flags trigger high-severity alerts decoupled from performance capability.
- Coach edits persist with full audit metadata while preserving original system recommendations.

---

### Phase 6 — Personalised Training Plan

#### Goal
Bridge assessment findings directly to actionable, structured periodised training plans with complete traceability (*Assessment Finding $\rightarrow$ Selected Progression $\rightarrow$ Exercise Prescription $\rightarrow$ Reassessment Target*).

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_training_plan.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_training_plan.py`
- **Backend Services**: `backend/apps/tenant_core/services_training_plan.py`
- **Backend Views**: `backend/apps/tenant_core/views_training_plan.py`
- **Frontend Components**:
  - `src/components/training/TrainingPlanStudio.tsx` (<280L)
  - `src/components/training/TrainingWeekSchedule.tsx` (<260L)
  - `src/components/training/ExercisePrescriptionCard.tsx` (<240L)
  - `src/components/training/CoachApprovalBanner.tsx` (<150L)
- **Tests**: `backend/tests/test_training_plan.py`

#### 2. Technical Specifications & Data Models
- **`TrainingPlan` Model**:
  ```python
  class TrainingPlan(BaseTenantModel):
      member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='training_plans')
      assessment = models.ForeignKey(MemberAssessment, on_delete=models.SET_NULL, null=True, blank=True)
      goal = models.CharField(max_length=64)
      status = models.CharField(max_length=32, choices=TrainingPlanStatus.choices, default='DRAFT')
      # Statuses: DRAFT, COACH_REVIEW, APPROVED, ACTIVE, PAUSED, COMPLETED, CANCELLED
      start_date = models.DateField(null=True, blank=True)
      target_end_date = models.DateField(null=True, blank=True)
      frequency_per_week = models.IntegerField(default=3)
      session_duration_minutes = models.IntegerField(default=60)
      training_phase = models.CharField(max_length=64, default='HYPERTROPHY_FOUNDATION')
      coach_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
      coach_approved_at = models.DateTimeField(null=True, blank=True)
  ```
- **Child Hierarchy**:
  - `TrainingPlanWeek` (Week index, phase focus, volume target)
  - `TrainingPlanDay` (Day of week, split title, e.g. "Lower Body Foundation")
  - `TrainingPlanExercise` (Exercise, variation, target sets, reps, load, RPE, rest, tempo, warm-up, progression criteria, regression criteria, coach notes)
  - `TrainingPlanModification` (Real-time in-gym adjustments logged by coach or member)
- **API Endpoints**:
  - `POST /api/v1/assessments/{id}/training-plan/generate/`
  - `GET /api/v1/members/{id}/training-plans/`
  - `PATCH /api/v1/training-plans/{id}/`
  - `POST /api/v1/training-plans/{id}/approve/` (Strict RBAC: ORG_ADMIN or COACH only)
  - `POST /api/v1/training-plans/{id}/pause/`
  - `POST /api/v1/training-plans/{id}/complete/`

#### 3. Verification & Acceptance Criteria
- Generating a plan automatically maps diagnosed movement limitations to appropriate entry-level progressions.
- Plans remain in `DRAFT` or `COACH_REVIEW` until an authorized coach invokes `/approve/`.
- Attempting to activate an unapproved plan returns HTTP 400 with a descriptive error.
- Full test coverage verifies multi-tenant isolation and cascade integrity.

---

### Phase 7 — Personalised Nutrition Plan

#### Goal
Expand metabolic baselines (Mifflin-St Jeor RMR/TDEE) into a comprehensive nutritional prescription module supporting macronutrient distribution, hydration schedules, and dietary restrictions with strict provenance tracking.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_nutrition_plan.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_nutrition_plan.py`
- **Backend Services**: `backend/apps/tenant_core/services_nutrition_plan.py`
- **Backend Views**: `backend/apps/tenant_core/views_nutrition_plan.py`
- **Frontend Components**:
  - `src/components/nutrition/NutritionPlanStudio.tsx` (<280L)
  - `src/components/nutrition/MacroTargetBreakdown.tsx` (<220L)
  - `src/components/nutrition/MealTimingSchedule.tsx` (<240L)
  - `src/components/nutrition/NutritionAdherenceLogger.tsx` (<250L)
- **Tests**: `backend/tests/test_nutrition_plan.py`

#### 2. Technical Specifications & Data Models
- **`NutritionProfile` & `NutritionPlan` Models**:
  ```python
  class NutritionPlan(BaseTenantModel):
      member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='nutrition_plans')
      assessment = models.ForeignKey(MemberAssessment, null=True, blank=True, on_delete=models.SET_NULL)
      status = models.CharField(max_length=32, choices=NutritionPlanStatus.choices, default='DRAFT')
      # Statuses: DRAFT, COACH_REVIEW, APPROVED, ACTIVE, ARCHIVED
      diet_pattern = models.CharField(max_length=64) # BALANCED, HIGH_PROTEIN, PLANT_BASED, KETO, etc.
      allergies = models.JSONField(default=list)
      restrictions = models.JSONField(default=list)
      preferred_foods = models.JSONField(default=list)
      daily_calories_target = models.IntegerField()
      protein_grams = models.IntegerField()
      carbs_grams = models.IntegerField()
      fats_grams = models.IntegerField()
      fibre_grams = models.IntegerField(default=30)
      water_target_litres = models.DecimalField(max_digits=4, decimal_places=2, default=3.0)
      provenance = models.CharField(max_length=32, choices=ProvenanceChoice.choices)
      coach_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
      coach_approved_at = models.DateTimeField(null=True, blank=True)
  ```
- **`NutritionAdherenceRecord`**:
  Tracks logged daily intake (calories, protein, water, meals completed, adherence %) with explicit provenance (`MEMBER_LOGGED`, `ESTIMATED`).
- **API Endpoints**:
  - `POST /api/v1/assessments/{id}/nutrition-plan/generate/`
  - `GET /api/v1/members/{id}/nutrition-plans/`
  - `PATCH /api/v1/nutrition-plans/{id}/`
  - `POST /api/v1/nutrition-plans/{id}/approve/`
  - `POST /api/v1/nutrition-plans/{id}/adherence/`

#### 3. Verification & Acceptance Criteria
- Nutrition plans accurately calculate macro splits anchored to goal calorie targets.
- Allergies and food restrictions flagged in intake are strictly respected in recommendations.
- Estimated intakes are explicitly separated from measured intakes in database queries.

---

### Phase 8 — Continuous Progress Tracking

#### Goal
Provide longitudinal tracking between formal reassessments, enabling high-frequency check-ins (body weight, circumference, subjective fatigue, sleep, hydration) and performance trend visualisations.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_progress_tracking.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_progress_tracking.py`
- **Backend Services**: `backend/apps/tenant_core/services_progress_tracking.py`
- **Backend Views**: `backend/apps/tenant_core/views_progress_tracking.py`
- **Frontend Components**:
  - `src/components/progress/ProgressDashboard.tsx` (<280L)
  - `src/components/progress/MetricTrendChart.tsx` (<250L)
  - `src/components/progress/AdherenceRecoveryCard.tsx` (<220L)
  - `src/components/progress/CheckInModal.tsx` (<240L)
- **Tests**: `backend/tests/test_progress_tracking.py`

#### 2. Technical Specifications & Data Models
- **`MemberProgressMetric` & `ProgressMetricEntry` Models**:
  ```python
  class ProgressMetricEntry(BaseTenantModel):
      member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='progress_entries')
      metric_type = models.CharField(max_length=64) # BODY_WEIGHT, WAIST_CIRCUMFERENCE, RESTING_HR, etc.
      value = models.DecimalField(max_digits=8, decimal_places=2)
      unit = models.CharField(max_length=16) # KG, CM, BPM, SECONDS, REPS
      date = models.DateField(default=timezone.now)
      provenance = models.CharField(max_length=32, choices=ProvenanceChoice.choices)
      protocol_notes = models.TextField(blank=True)
      source_device = models.CharField(max_length=64, blank=True)
  ```
- **`ProgressCheckIn` Model**:
  Logs subjective wellness factors (Sleep Quality 1–5, Muscle Soreness 1–5, Stress 1–5, Training Energy 1–5, Hydration Litres).
- **API Endpoints**:
  - `GET /api/v1/members/{id}/progress/trends/` (Returns timeseries filtered by metric and date window)
  - `POST /api/v1/members/{id}/progress/metric/`
  - `POST /api/v1/members/{id}/progress/check-in/`

#### 3. Verification & Acceptance Criteria
- Timeseries endpoints return strictly formatted date/value arrays for TanStack/Recharts.
- Provenance tags are mandatory on all metric submissions; submissions without provenance fail validation.
- Unit conversion integrity (lbs to kg, inches to cm) is verified by test suites.

---

### Phase 9 — Standardised Progress Photos & Private Storage

#### Goal
Implement authenticated, secure progress-photo capture and tracking adhering to clinical photo standards (Front, Side, Back) completely isolated from simulated transformation images.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_progress_photos.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_progress_photos.py`
- **Backend Services**: `backend/apps/tenant_core/services_progress_photos.py`
- **Backend Views**: `backend/apps/tenant_core/views_progress_photos.py`
- **Frontend Components**:
  - `src/components/photos/ProgressPhotoGallery.tsx` (<280L)
  - `src/components/photos/StandardizedCaptureGuide.tsx` (<240L)
  - `src/components/photos/PhotoComparisonSlider.tsx` (<220L)
  - `src/components/photos/ConsentManagementDialog.tsx` (<180L)
- **Tests**: `backend/tests/test_progress_photos.py`

#### 2. Technical Specifications & Security Architecture
- **`ProgressPhoto` Model**:
  ```python
  class ProgressPhoto(BaseTenantModel):
      member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='progress_photos')
      assessment = models.ForeignKey(MemberAssessment, null=True, blank=True, on_delete=models.SET_NULL)
      capture_date = models.DateField(default=timezone.now)
      view_angle = models.CharField(max_length=16, choices=[('FRONT', 'Front'), ('SIDE', 'Side'), ('BACK', 'Back')])
      storage_key = models.CharField(max_length=512) # S3/Private bucket object key
      content_type = models.CharField(max_length=64, default='image/jpeg')
      file_size_bytes = models.BigIntegerField()
      member_consent_tracking = models.BooleanField(default=False)
      marketing_consent = models.BooleanField(default=False)
      capture_guidance_version = models.CharField(max_length=32, default='v1.0_standard')
  ```
- **Storage & Privacy Constraints**:
  - Photos stored in private, non-public cloud buckets (`fitness-tenant-vault/{org_id}/photos/{member_id}/`).
  - Pre-signed GET URLs with a strict 15-minute expiration time. Zero raw or public URLs.
  - No body measurements derived from photographs unless certified 3D optical scanning hardware is attached. If missing, save `NOT_MEASURABLE`.
- **API Endpoints**:
  - `POST /api/v1/members/{id}/photos/presign-upload/`
  - `POST /api/v1/members/{id}/photos/confirm/`
  - `GET /api/v1/members/{id}/photos/`
  - `DELETE /api/v1/members/{id}/photos/{photo_id}/`

#### 3. Verification & Acceptance Criteria
- Unauthorized access attempts to image URLs return HTTP 401/403.
- Pre-signed URLs expire after the designated window.
- Members can withdraw marketing consent without affecting active fitness tracking photos.

---

### Phase 10 — Goal & Timeline Intelligence

#### Goal
Deliver mathematical timeline estimations anchored to real baseline performance, training volume, expected adherence, and historical progress. Prohibit ungrounded or speculative completion dates.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_fitness_goals.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_fitness_goals.py`
- **Backend Services**: `backend/apps/tenant_core/services_goal_timeline.py`
- **Backend Views**: `backend/apps/tenant_core/views_fitness_goals.py`
- **Frontend Components**:
  - `src/components/goals/GoalManagementStudio.tsx` (<270L)
  - `src/components/goals/TimelineConfidenceGauge.tsx` (<210L)
  - `src/components/goals/MilestoneScheduleCard.tsx` (<220L)
- **Tests**: `backend/tests/test_goal_timeline.py`

#### 2. Technical Specifications & Estimation Engine
- **`MemberFitnessGoal` Model**:
  ```python
  class MemberFitnessGoal(BaseTenantModel):
      member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='fitness_goals')
      goal_type = models.CharField(max_length=64) # FAT_LOSS, MUSCLE_GAIN, RECOMPOSITION, STRENGTH, ENDURANCE
      target_metric = models.CharField(max_length=64) # BODY_WEIGHT_KG, SQUAT_1RM_KG, etc.
      baseline_value = models.DecimalField(max_digits=8, decimal_places=2)
      target_value = models.DecimalField(max_digits=8, decimal_places=2)
      unit = models.CharField(max_length=16)
      target_date = models.DateField(null=True, blank=True)
      status = models.CharField(max_length=32, choices=GoalStatus.choices, default='IN_PROGRESS')
  ```
- **Timeline Engine (`services_goal_timeline.py`)**:
  - Takes: `baseline_value`, `target_value`, `training_frequency`, `historical_adherence_rate`, `movement_capability_level`.
  - Computes physiological rate-of-change boundaries (e.g. realistic safe fat loss: 0.5%–1.0% body weight/week; natural muscular hypertrophy: 0.25–0.5 kg/month depending on training age).
  - Returns: Estimated date range, confidence score (LOW, MODERATE, HIGH), and explicit physiological assumptions.
- **API Endpoints**:
  - `GET/POST /api/v1/members/{id}/goals/`
  - `POST /api/v1/members/{id}/goals/{goal_id}/estimate-timeline/`

#### 3. Verification & Acceptance Criteria
- Engine flags physiologically unsafe or unrealistic goal timelines (e.g. 15 kg fat loss in 3 weeks) with safety warnings.
- Output explicitly enumerates the dependencies required to maintain the timeline (sessions/week, adherence %).

---

### Phase 11 — Transformation Preview (AI Adapter & Identity Guard)

#### Goal
Provide an illustrative AI-assisted visualization of projected body-composition changes using a pluggable provider adapter. Enforce strict anatomical, identity-preservation, and anti-hallucination validation gates.

#### 1. Files Affected / Created
- **Backend Adapters**: `backend/apps/tenant_core/adapters/ai_transformation_adapter.py`
- **Backend Models**: `backend/apps/tenant_core/models_transformation_preview.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_transformation_preview.py`
- **Backend Services**: `backend/apps/tenant_core/services_transformation_preview.py`
- **Backend Views**: `backend/apps/tenant_core/views_transformation_preview.py`
- **Frontend Components**:
  - `src/components/transformation/TransformationStudio.tsx` (<280L)
  - `src/components/transformation/TransformationValidationBanner.tsx` (<180L)
  - `src/components/transformation/MandatoryDisclaimerFooter.tsx` (<120L)
- **Tests**: `backend/tests/test_transformation_service.py`

#### 2. Technical Specifications & Validation Engine
- **Pluggable Architecture**:
  The transformation service interfaces exclusively through `BaseTransformationProvider` interface. Supports swapping or mocking providers without modifying business logic.
- **Identity & Anatomy Validation Gate**:
  Before persisting or displaying any generated image, the validation pipeline verifies:
  1. Face and facial landmark consistency (identity preserved).
  2. Pose, camera angle, and background consistency.
  3. Limb count and anatomical integrity (zero extra limbs, missing fingers, or warped joints).
  4. Anatomical realism of muscular definition or body fat reduction.
- **Mandatory UI Disclaimer**:
  Every view displaying an AI preview must permanently show:
  > *“Illustrative AI-generated visualisation. This image is not a prediction or guarantee of future results.”*
- **API Endpoints**:
  - `POST /api/v1/members/{id}/transformation-preview/generate/`
  - `GET /api/v1/members/{id}/transformation-preview/`
  - `POST /api/v1/transformation-preview/{id}/flag-invalid/`

#### 3. Verification & Acceptance Criteria
- Unit tests mock external providers and assert that failed validation correctly flags the record as `REJECTED_ANATOMICAL_ANOMALY`.
- Test asserts that transformation previews are never returned in public or TV mirror payloads.

---

### Phase 12 — Advanced AI/CV Observation Layer (Optional & Modular)

#### Goal
Deliver an optional computer-vision layer for real-time rep counting, joint-angle estimation, and tempo tracking during functional tests. Enforce human-in-the-loop verification where AI output is strictly classified as an observation until confirmed by a coach.

#### 1. Files Affected / Created
- **Backend Models**: `backend/apps/tenant_core/models_movement_ai.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_movement_ai.py`
- **Backend Services**: `backend/apps/tenant_core/services_movement_ai.py`
- **Backend Views**: `backend/apps/tenant_core/views_movement_ai.py`
- **Frontend Components**:
  - `src/components/movement_ai/PoseObservationCanvas.tsx` (<280L)
  - `src/components/movement_ai/CoachAiConfirmationDialog.tsx` (<220L)
  - `src/components/movement_ai/JointAngleVisualizer.tsx` (<240L)
- **Tests**: `backend/tests/test_movement_ai.py`

#### 2. Technical Specifications & Data Models
- **`MovementAiObservation` Model**:
  ```python
  class MovementAiObservation(BaseTenantModel):
      assessment = models.ForeignKey(MemberAssessment, on_delete=models.CASCADE, related_name='ai_observations')
      exercise_key = models.CharField(max_length=64)
      model_identifier = models.CharField(max_length=64) # e.g. "mediapipe-pose-v2"
      model_version = models.CharField(max_length=32)
      confidence_score = models.DecimalField(max_digits=4, decimal_places=3)
      detected_reps = models.IntegerField()
      observed_tempo = models.CharField(max_length=32, blank=True)
      joint_angles_timeseries = models.JSONField(default=dict)
      coach_review_status = models.CharField(max_length=32, choices=ReviewStatus.choices, default='PENDING')
      # PENDING, ACCEPTED, MODIFIED, REJECTED
      reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
  ```
- **Human-in-the-Loop Protocol**:
  An AI observation never writes directly to `MemberAssessment` score fields. A coach must click **Confirm** or **Adjust** in the UI to commit the verified reps.
- **API Endpoints**:
  - `POST /api/v1/assessments/{id}/movement-ai/log-observation/`
  - `POST /api/v1/movement-ai/{id}/review/`

#### 3. Verification & Acceptance Criteria
- Tests confirm that unconfirmed AI observations do not appear in official reassessment comparison cards.
- The system handles low confidence scores (<0.70) by prompting the coach for manual scoring.

---

### Phase 13 — Hardware & IoT Telemetry Layer (Device Abstraction)

#### Goal
Create an extensible hardware abstraction layer to ingest real-time biometric telemetry (BLE heart rate monitors, smart scales, connected ergometers) without leaking vendor-specific protocols into core assessment models.

#### 1. Files Affected / Created
- **Backend Adapters**: `backend/apps/tenant_core/integrations/iot_base_adapter.py`
- **Backend Services**: `backend/apps/tenant_core/services_iot_telemetry.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_iot_telemetry.py`
- **Backend Views**: `backend/apps/tenant_core/views_iot_telemetry.py`
- **Frontend Components**:
  - `src/components/iot/DevicePairingManager.tsx` (<260L)
  - `src/components/iot/LiveTelemetryFeed.tsx` (<240L)
  - `src/components/iot/DeviceProvenanceBadge.tsx` (<120L)
- **Tests**: `backend/tests/test_iot_integrations.py`

#### 2. Technical Specifications & Integration Architecture
- **Adapter Pipeline**:
  `Raw Device Payload` $\rightarrow$ `Vendor Adapter (Polar, InBody, Concept2)` $\rightarrow$ `Normalised Biomarker Event` $\rightarrow$ `Provenance Tagging` $\rightarrow$ `Assessment / Progress Record`.
- **Supported Biomarkers**:
  Continuous Heart Rate (BPM), Heart Rate Recovery (HRR 60s), Impedance-Derived Lean Mass, Raw Wattage / Pace.
- **Fallback Guarantee**:
  If a device drops connection during an assessment, the system seamlessly falls back to manual coach input without data loss.
- **API Endpoints**:
  - `POST /api/v1/iot/telemetry/ingest/`
  - `GET /api/v1/iot/devices/active/`

#### 3. Verification & Acceptance Criteria
- Integration tests simulate telemetry dropouts and verify robust fallback to manual logging.
- Telemetry measurements carry provenance `DEVICE_SYNCED` with MAC/device identifier hashes.

---

### Phase 14 — Advanced Analytics & Coach Command Center

#### Goal
Equip gym operators and personal trainers with a bird’s-eye portfolio command center to monitor member progression, detect adherence drop-offs, flag reassessments due, and action interventions before churn occurs.

#### 1. Files Affected / Created
- **Backend Services**: `backend/apps/tenant_core/services_coach_command_center.py`
- **Backend Serializers**: `backend/apps/tenant_core/serializers_coach_command_center.py`
- **Backend Views**: `backend/apps/tenant_core/views_coach_command_center.py`
- **Frontend Components**:
  - `src/components/command_center/CoachCommandCenterDashboard.tsx` (<280L)
  - `src/components/command_center/MemberAttentionCard.tsx` (<220L)
  - `src/components/command_center/PortfolioSummaryMetrics.tsx` (<240L)
  - `src/components/command_center/MemberJourneyTimeline.tsx` (<260L)
- **Tests**: `backend/tests/test_coach_command_center.py`

#### 2. Technical Specifications & Attention Indicators
- **Portfolio Indicators**:
  - **Reassessments Due**: Members at day 45–60 of an active training cycle.
  - **Adherence Declining**: Training session attendance drop >30% over 14 rolling days.
  - **Performance Plateau**: Zero load or rep progression over 3 consecutive microcycles.
  - **Safety/Symptom Flag**: Member reported joint pain or discomfort during check-ins.
  - **Unapproved Plans**: Plans sitting in `DRAFT` or `COACH_REVIEW` >48 hours.
- **API Endpoints**:
  - `GET /api/v1/coach/command-center/summary/`
  - `GET /api/v1/coach/command-center/alerts/`
  - `GET /api/v1/members/{id}/journey/` (Consolidated timeline: Assessments, Findings, Plans, Progress, Photos)

#### 3. Verification & Acceptance Criteria
- Queries execute performant aggregations utilizing existing database indexes without N+1 overhead.
- Coaches only see members assigned to their roster or within their authorized tenant scope.

---

### Phase 15 — V2 Security, Privacy & Business Audit Governance

#### Goal
Harden the expanded V2 platform against multi-tenant leaks, unauthorized access to sensitive biometric data and photos, and provide comprehensive business audit tracking for all critical state changes.

#### 1. Files Affected / Created
- **Backend Audit**: `backend/apps/tenant_core/services_v2_audit.py`
- **Backend Middleware / Permissions**: `backend/apps/tenant_core/permissions_v2.py`
- **Tests**: `backend/tests/test_v2_security_governance.py`

#### 2. Access Control & Privacy Specifications
- **Role Permissions Matrix**:
  | Action | Member | Assigned Coach | Org Admin | Studio TV |
  |---|---|---|---|---|
  | View Own Assessment | ✅ (Approved only) | ✅ | ✅ | ❌ |
  | View Photos | ✅ (Own photos) | ✅ | ✅ | ❌ |
  | Approve Training Plan | ❌ | ✅ | ✅ | ❌ |
  | Approve Nutrition Plan | ❌ | ✅ | ✅ | ❌ |
  | View TV Exercise Payload | ❌ | ❌ | ❌ | ✅ (Token-bound) |
  | Trigger AI Transformation | ❌ | ✅ | ✅ | ❌ |
- **Audit Logging Protocol**:
  All V2 state changes call `record_business_audit(user=request.user, organization=request.org, action=..., details=...)`.
  Mandatory audit points:
  - `ASSESSMENT_FINDING_OVERRIDE`
  - `TRAINING_PLAN_APPROVED`
  - `NUTRITION_PLAN_APPROVED`
  - `PROGRESS_PHOTO_UPLOADED`
  - `PROGRESS_PHOTO_DELETED`
  - `TRANSFORMATION_PREVIEW_GENERATED`
  - `AI_OBSERVATION_REVIEWED`

#### 3. Verification & Acceptance Criteria
- Comprehensive test matrix validates that no role can access cross-tenant or unauthorized endpoints.
- Deleting a progress photo permanently removes the private cloud object and records an audit trail.

---

### Phase 16 — V2 Quality Gates, Automated Testing & Production Readiness

#### Goal
Conduct end-to-end verification across the entire multi-tenant stack, guaranteeing zero regressions in V1 features and 100% adherence to all code quality, typing, linting, and security standards.

#### 1. Verification Commands & Test Matrix
- **Backend Django Test Suite**:
  ```bash
  cd backend
  python manage.py test \
    tests.test_assessment_models \
    tests.test_assessment_v1_services \
    tests.test_assessment_v1_api \
    tests.test_assessment_reassessment_flow \
    tests.test_assessment_interpretation \
    tests.test_training_plan \
    tests.test_nutrition_plan \
    tests.test_progress_tracking \
    tests.test_progress_photos \
    tests.test_goal_timeline \
    tests.test_transformation_service \
    tests.test_movement_ai \
    tests.test_iot_integrations \
    tests.test_coach_command_center \
    tests.test_v2_security_governance \
    -v 2 --keepdb --noinput --settings=config.settings
  ```
- **Backend Quality & Linting Checks**:
  ```bash
  ruff check apps/tenant_core/
  python manage.py makemigrations --check --dry-run
  ```
- **Frontend Type & Linting Verification**:
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run build
  ```
- **Security & Secret Scan**:
  ```bash
  git diff --cached | grep -iE "password|secret|api[_-]?key|token|otp" || true
  ```

---

## 5. V2 Implementation Governance Table

| Phase | Capability | Primary Deliverables | Acceptance Metric |
|---|---|---|---|
| **Phase 5** | Interpretation & Findings Engine | `models_assessment_findings.py`, `services_assessment_interpretation.py`, Findings UI | Raw data decoupled from findings; coach override auditable |
| **Phase 6** | Personalised Training Plan | `models_training_plan.py`, `services_training_plan.py`, Plan Studio UI | Findings map to progressions; human coach approval required |
| **Phase 7** | Personalised Nutrition Plan | `models_nutrition_plan.py`, `services_nutrition_plan.py`, Macro Target UI | Mifflin-St Jeor math expanded to actionable macros & hydration |
| **Phase 8** | Continuous Progress Tracking | `models_progress_tracking.py`, Timeseries Trends UI, Check-in Modal | Longitudinal check-ins between reassessments; full provenance |
| **Phase 9** | Standardised Progress Photos | `models_progress_photos.py`, Private S3 Storage, Photo Slider UI | Pre-signed private URLs; zero derived measurements from photos |
| **Phase 10** | Goal & Timeline Intelligence | `models_fitness_goals.py`, Rate-of-change Timeline Engine | Physiological validation; no AI-hallucinated timelines |
| **Phase 11** | Transformation Preview | Pluggable AI Adapter, Identity & Anatomy Validation Gate | Anti-hallucination checks; mandatory persistent disclaimers |
| **Phase 12** | Advanced AI/CV Observation Layer | Pluggable Pose CV Service, Coach Confirmation Modal | Human-in-the-loop mandatory; AI output labeled observation |
| **Phase 13** | Hardware & IoT Telemetry | Biometric Telemetry Service, Device Adapters (BLE/Scales) | Normalised payloads; graceful fallback to manual coach logging |
| **Phase 14** | Coach Command Center | Portfolio Summary Dashboard, Attention Indicators | Early churn & plateau detection; sub-100ms aggregated queries |
| **Phase 15** | Security, Privacy & Governance | Pre-signed URL enforcement, Granular RBAC, Audit Logging | Zero cross-tenant leaks; complete state change audit trail |
| **Phase 16** | Quality Gates & Production Ready | Full E2E Test Suite, Zero TypeScript `any`, Clean Production Build | 100% test pass rate; zero build or lint warnings |

---

## 6. Definition of Done for V2

The V2 Continuous Fitness Management System is complete only when:
1. **The Core Loop Works End-to-End**:
   *Assessment $\rightarrow$ Safety Clearance $\rightarrow$ Measured Baseline $\rightarrow$ Interpretation Findings $\rightarrow$ Goals $\rightarrow$ Training Plan $\rightarrow$ Nutrition Plan $\rightarrow$ Coach Sign-Off $\rightarrow$ Member Training $\rightarrow$ Continuous Progress Tracking $\rightarrow$ Progress Photos $\rightarrow$ Reassessment $\rightarrow$ Like-for-Like Comparison $\rightarrow$ Updated Findings $\rightarrow$ Plan Adjustment $\rightarrow$ Repeat.*
2. **AI Visualisation is Separated & Guarded**:
   *Approved Photo $\rightarrow$ Transformation Preview $\rightarrow$ Anatomical Validation $\rightarrow$ Illustrative Visualisation $\rightarrow$ Mandatory Disclaimer.*
3. **Engineering Standards**:
   - Zero Django migration conflicts (`makemigrations --check --dry-run`).
   - Zero TypeScript `any` types.
   - All backend modules strictly under 500 lines.
   - All React components strictly under 300 lines.
   - 100% passing tests across all tenant databases.
