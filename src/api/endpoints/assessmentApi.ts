import { api } from '../client';

export type ProvenanceTag = 'MEASURED' | 'CALCULATED' | 'ESTIMATED' | 'MEMBER_REPORTED' | 'UNAVAILABLE';

export interface HealthScreeningData {
  heart_condition: boolean;
  chest_pain_activity: boolean;
  chest_pain_rest: boolean;
  dizziness_loss_of_balance: boolean;
  bone_joint_problem: boolean;
  blood_pressure_medication: boolean;
  unexplained_shortness_of_breath: boolean;
  recent_surgery_injury: boolean;
  pregnancy_or_postpartum: boolean;
  other_medical_condition: boolean;
  details?: Record<string, string>;
}

export interface VitalsData {
  height_cm?: number | null;
  weight_kg?: number | null;
  waist_cm?: number | null;
  resting_hr?: number | null;
  resting_bp?: string;
  bmi?: number | null;
  rmr_kcal?: number | null;
  tdee_kcal?: number | null;
  daily_calorie_target?: number | null;
  macros?: {
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    hydration_liters?: number;
    meal_guidance?: string;
  };
  provenance?: Record<string, ProvenanceTag>;
  disclaimers?: {
    bmi?: string;
    rmr?: string;
  };
}

export interface FunctionalTestItem {
  // Balance is timed per side and records whether support was used; the capability
  // evaluator reads these exact names.
  single_leg_left_sec?: number | null;
  single_leg_right_sec?: number | null;
  support_used?: string;
  protocol_version?: string;
  test_name?: string;
  variation?: string;
  reps?: number | null;
  load_kg?: number | null;
  hold_seconds?: number | null;
  movement_quality?: string;
  status?: 'VALID' | 'MODIFIED' | 'INCOMPLETE' | 'NOT_ASSESSED';
  symptoms?: string;
}

/** Section 4: how the member moves before any test is scored. */
export interface WarmUpObservation {
  walking?: string;
  sit_to_stand?: string;
  squat_pattern?: string;
  overhead_reach?: string;
  step_up?: string;
  warm_up_minutes?: number | null;
  symptoms?: string;
  status?: TestResultStatus;
}

/** Section 9. Screens are judgements; the two distances are optional measurements. */
export interface MobilityTests {
  shoulder_mobility?: string;
  ankle_knee_to_wall?: string;
  hamstring_reach?: string;
  overhead_reach?: string;
  squat_pattern?: string;
  ankle_left_cm?: number | null;
  ankle_right_cm?: number | null;
  sit_and_reach_cm?: number | null;
  symptoms?: string;
  protocol_version?: string;
  status?: TestResultStatus;
}

/** Section 10. A cardio result only means something beside the protocol that produced it. */
export interface CardiovascularTest {
  protocol?: string;
  duration_minutes?: number | null;
  speed_kmh?: number | null;
  incline_pct?: number | null;
  distance_m?: number | null;
  repetitions?: number | null;
  hr_before_bpm?: number | null;
  hr_after_bpm?: number | null;
  recovery_hr_bpm?: number | null;
  perceived_exertion?: number | null;
  talk_test?: string;
  stopping_reason?: string;
  symptoms?: string;
  protocol_version?: string;
  status?: TestResultStatus;
}

/** One input on a catalogue test. Drives a tablet form, so the kinds are deliberately few. */
export interface AssessmentTestField {
  key: string;
  label: string;
  type: 'number' | 'seconds' | 'select' | 'text' | 'bool';
  options?: string[];
  placeholder?: string;
  default?: string;
}

/** A test the battery can run, as served by the catalogue. */
export interface AssessmentTestDefinition {
  code: string;
  domain: string;
  name: string;
  section: string;
  difficulty: 'accessible' | 'scaled' | 'advanced';
  variations?: string[];
  fields: AssessmentTestField[];
  note?: string;
}

export interface AssessmentTestDomain {
  key: string;
  label: string;
  optional: boolean;
  tests: AssessmentTestDefinition[];
}

export interface AssessmentTestLibrary {
  protocol_version: string;
  status_options: string[];
  domains: AssessmentTestDomain[];
}

export type TestResultStatus = 'VALID' | 'MODIFIED' | 'INCOMPLETE' | 'NOT_ASSESSED';

export interface FunctionalTestsPayload {
  warm_up_observation?: WarmUpObservation;
  lower_body?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  upper_body?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  core?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  balance?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  mobility?: MobilityTests;
  cardiovascular?: CardiovascularTest;
}

export interface CapabilityMatrix {
  lower_body?: string;
  upper_body?: string;
  core?: string;
  balance?: string;
  mobility?: string;
  cardiovascular?: string;
  functional_movement?: string;
}

/** A row in the assessment register. Compact: the full record comes from retrieve. */
export interface AssessmentListRow {
  id: string;
  member_name: string;
  member_phone: string | null;
  member_id: string | null;
  lead_id: string | null;
  assessment_type: string;
  assessment_type_display: string;
  status: 'DRAFT' | 'TESTING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  status_display: string;
  screening_outcome: string;
  scan_status: ScanStatus;
  captures_taken: number;
  posture_score: number | null;
  branch: { id: string; name: string } | null;
  conducted_by: string | null;
  recommended_package: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssessmentRegisterSummary {
  total?: number;
  in_progress?: number;
  needs_review?: number;
  approved?: number;
  scan_failed?: number;
}

export interface AssessmentListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: AssessmentListRow[];
  summary?: AssessmentRegisterSummary;
}

export interface AssessmentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  bucket?: 'needs_review' | 'in_progress' | 'approved';
  status?: string;
  scan_status?: string;
  assessment_type?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

/** One view's verdict from the capture quality gate. */
export interface CaptureQualityVerdict {
  usable: boolean;
  reason?: string;
  warnings?: string[];
  person_count?: number;
  frame_coverage?: number;
}

export type ScanStatus =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'UNAVAILABLE'
  | 'SKIPPED_NO_CONSENT';

/**
 * Result of the four-view body scan.
 *
 * Every posture value is nullable on purpose: null means that angle was not measurable from
 * the captures provided, which is a different statement from a measured zero.
 */
export interface AssessmentScanState {
  assessment_id: string;
  status: ScanStatus;
  is_terminal: boolean;
  provider: string | null;
  model: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  views_submitted: string[];
  views_usable: string[];
  capture_quality: Partial<Record<'front' | 'back' | 'left' | 'right', CaptureQualityVerdict>>;
  warnings: string[];
  per_view: Record<string, Record<string, number>>;
  posture: {
    posture_score: number | null;
    shoulder_tilt_degrees: number | null;
    hip_tilt_degrees: number | null;
    forward_head_angle_degrees: number | null;
    lateral_shift_degrees: number | null;
    breakdown?: {
      score: number;
      method: string;
      scale: string;
      components: Array<{
        metric: string;
        value_degrees: number | null;
        penalty: number;
        status: 'within_tolerance' | 'outside_tolerance' | 'not_assessed';
      }>;
      interpretation_note: string;
    } | null;
  };
  circumference_estimates: {
    method?: string;
    confidence?: 'low' | 'medium' | 'high';
    source?: string;
    assumptions?: string[];
    unavailable_reason?: string;
    values?: Record<string, number>;
  };
  capture_conditions: Record<string, string>;
  measurement_metadata: Record<string, { source: string; method: string; confidence: string; note?: string }>;
}

export interface SymptomRecord {
  symptom_type: string;
  body_location: string;
  severity_scale: number; // 1-10
  stopping_reason?: string;
  timestamp?: string;
}

export interface AssessmentSession {
  id: string;
  pairing_code: string;
  status: 'DRAFT' | 'TESTING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'CANCELLED';
  member_name: string;
  member_phone: string;
  masked_phone?: string;
  branch?: string | {
    id: string;
    name: string;
  } | null;
  branch_detail?: {
    id: string;
    name: string;
  } | null;
  previous_assessment?: string | null;

  // Section 1: Profile & Goals
  assessment_type: string;
  training_experience: string;
  current_activity_level: string;
  preferred_training_style: string;
  target_goal: string;
  stated_goal_outcome?: string;
  target_timeline_months: number;
  target_timeline_weeks: number;
  weekly_frequency_days: number;
  perceived_barrier?: string;
  member_confidence_score?: number;
  user_notes?: string;

  // Section 2: Health Screening (PAR-Q)
  health_screening?: HealthScreeningData;
  screening_outcome: string;
  screening_coach_notes?: string;

  // Section 3: Vitals & Body Composition
  vitals?: VitalsData;

  // Sections 4-11: Movement Tests & Capability Matrix
  functional_tests?: FunctionalTestsPayload;
  capability_matrix?: CapabilityMatrix;
  symptoms_and_safety_events?: Record<string, SymptomRecord>;

  // Catalog Recommendation
  recommended_package?: {
    id?: string;
    name?: string;
    session_units?: number;
    price?: number;
    reason?: string;
  } | null;
  alternatives?: Array<{
    id: string;
    name: string;
    sessions: number;
    price: number;
  }>;

  // Consents (Section 16 - Default False)
  consent_body_measurements: boolean;
  consent_movement_photos: boolean;
  consent_ai_analysis: boolean;
  consent_secondary_use: boolean;
  consent_notice_version: string;

  // Governance & Sign-Offs
  member_acknowledged_at?: string | null;
  coach_signed_off_at?: string | null;
  coach_signed_off_by?: string | null;
  signed_off_by_name?: string;
  reassessment_due_date?: string | null;

  // Coach Prescriptions
  coach_strengths?: string;
  coach_areas_to_develop?: string;
  workout_prescription?: string;
  diet_prescription?: string;
  reassessment_interval_weeks?: number;

  // Media
  photo_front_url?: string;
  photo_side_url?: string;

  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReassessmentComparison {
  has_baseline: boolean;
  current_assessment_id?: string;
  previous_assessment_id?: string;
  previous_date?: string | null;
  current_date?: string | null;
  vitals_comparison: Record<string, { previous?: number | null; current?: number | null; delta?: number | null }>;
  movement_comparisons: Array<{
    domain: string;
    test_title: string;
    previous_variation?: string | null;
    current_variation: string;
    non_equivalent_comparison: boolean;
    comparison_note: string;
    previous_reps?: number | null;
    current_reps?: number | null;
    reps_delta?: number | null;
    previous_load_kg?: number | null;
    current_load_kg?: number | null;
    load_delta?: number | null;
    previous_quality?: string | null;
    current_quality?: string | null;
  }>;
  capability_comparison: Record<string, { previous: string; current: string }>;
}

export interface TestProgressionRecord {
  id: string;
  assessment?: string | null;
  user_profile: string;
  exercise_name: string;
  current_variation: string;
  current_load_kg?: number | null;
  current_assistance?: string;
  current_reps_or_duration?: string;
  movement_quality?: string;
  reported_symptoms?: string;
  next_progression_target?: string;
  progression_criteria?: string;
  review_date?: string | null;
  coach_approved_by?: string | null;
  coach_approved_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DisplayScreenSummary {
  id: string;
  status: string;
  member_name: string;
  is_approved: boolean;
  connected: boolean;
  target_goal?: string;
  stated_goal_outcome?: string;
  timeline_weeks?: number;
  timeline_months?: number;
  capability_matrix?: CapabilityMatrix;
  recommended_package?: {
    name: string;
    session_units: number;
    price: number;
    reason?: string;
  };
}

export const assessmentApi = {
  async startAssessment(payload: {
    user_profile_id?: string;
    member_name?: string;
    member_phone?: string;
    branch_id?: string;
    previous_assessment_id?: string;
    assessment_type?: string;
    training_experience?: string;
    current_activity_level?: string;
    preferred_training_style?: string;
    target_goal: string;
    stated_goal_outcome?: string;
    target_timeline_weeks?: number;
    target_timeline_months?: number;
    weekly_frequency_days: number;
    perceived_barrier?: string;
    member_confidence_score?: number;
    user_notes?: string;
    health_screening?: HealthScreeningData;
    screening_outcome?: string;
    screening_coach_notes?: string;
    measured_height_cm?: number | null;
    measured_weight_kg?: number | null;
    waist_circumference_cm?: number | null;
    resting_heart_rate_bpm?: number | null;
    resting_blood_pressure?: string;
    functional_tests_payload?: FunctionalTestsPayload;
    symptoms_and_safety_events?: Record<string, SymptomRecord>;
    package_id?: string;
    consent_body_measurements?: boolean;
    consent_movement_photos?: boolean;
    consent_ai_analysis?: boolean;
    consent_secondary_use?: boolean;
    consent_notice_version?: string;
  }): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>('/tenant/assessments/', payload);
    return res.data;
  },

  async updateAssessment(
    id: string,
    payload: Partial<{
      stated_goal_outcome?: string;
      target_goal?: string;
      target_timeline_weeks?: number;
      target_timeline_months?: number;
      weekly_frequency_days?: number;
      preferred_training_style?: string;
      health_screening?: HealthScreeningData;
      screening_outcome?: string;
      screening_coach_notes?: string;
      measured_height_cm?: number | null;
      measured_weight_kg?: number | null;
      waist_circumference_cm?: number | null;
      resting_heart_rate_bpm?: number | null;
      resting_blood_pressure?: string;
      functional_tests_payload?: FunctionalTestsPayload;
      symptoms_and_safety_events?: Record<string, SymptomRecord>;
      package_id?: string;
      coach_strengths?: string;
      coach_areas_to_develop?: string;
      workout_prescription?: string;
      diet_prescription?: string;
      consent_body_measurements?: boolean;
      consent_movement_photos?: boolean;
      consent_ai_analysis?: boolean;
      consent_secondary_use?: boolean;
      consent_notice_version?: string;
      member_acknowledged_at?: string;
    }>
  ): Promise<AssessmentSession> {
    const res = await api.patch<AssessmentSession>(`/tenant/assessments/${id}/`, payload);
    return res.data;
  },

  async getAssessment(id: string): Promise<AssessmentSession> {
    const res = await api.get<AssessmentSession>(`/tenant/assessments/${id}/`);
    return res.data;
  },

  async capturePhotos(id: string, formData: FormData): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>(`/tenant/assessments/${id}/capture/`, formData);
    return res.data;
  },

  /** The served test catalogue: every test the battery can run, with its fields. */
  async getTestLibrary(): Promise<AssessmentTestLibrary> {
    const res = await api.get<AssessmentTestLibrary>('/tenant/assessments/test-library/');
    return res.data;
  },

  /**
   * The assessment register: newest first, paged, filtered and searched server-side.
   */
  async listAssessments(params: AssessmentListParams = {}): Promise<AssessmentListResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
    });
    const qs = query.toString();
    const res = await api.get<AssessmentListResponse>(`/tenant/assessments/${qs ? `?${qs}` : ''}`);
    const data = res.data as any;
    // Tolerate an unpaginated array, so the UI does not depend on pagination being on.
    if (Array.isArray(data)) return { count: data.length, results: data };
    return { count: data?.count ?? 0, results: data?.results ?? [], summary: data?.summary, next: data?.next, previous: data?.previous };
  },

  /**
   * Current state of the body scan. Poll while `is_terminal` is false.
   */
  async getScanStatus(id: string): Promise<AssessmentScanState> {
    const res = await api.get<AssessmentScanState>(`/tenant/assessments/${id}/scan/`);
    return res.data;
  },

  /** Re-runs the analysis against the captures already stored on the assessment. */
  async rescan(id: string): Promise<AssessmentScanState> {
    const res = await api.post<AssessmentScanState>(`/tenant/assessments/${id}/rescan/`, {});
    return res.data;
  },

  async approveAndSend(
    id: string,
    payload: {
      coach_notes?: string;
      workout_prescription?: string;
      diet_prescription?: string;
      reassessment_interval_weeks?: number;
      send_whatsapp?: boolean;
      member_acknowledgement_name?: string;
      coach_sign_off_name?: string;
      agreed_first_milestone?: string;
      goal_review_date?: string;
    }
  ): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>(`/tenant/assessments/${id}/approve-and-send/`, {
      ...payload,
      send_whatsapp: payload.send_whatsapp ?? false,
    });
    return res.data;
  },

  async getComparison(id: string): Promise<ReassessmentComparison> {
    const res = await api.get<ReassessmentComparison>(`/tenant/assessments/${id}/comparison/`);
    return res.data;
  },

  async pairDisplayScreen(code: string): Promise<DisplayScreenSummary> {
    const res = await api.post<DisplayScreenSummary>('/tenant/assessments/pair/', { code });
    return res.data;
  },

  async getTestProgressions(params?: { user_profile_id?: string }): Promise<TestProgressionRecord[]> {
    const query = params?.user_profile_id ? `?user_profile_id=${encodeURIComponent(params.user_profile_id)}` : '';
    const res = await api.get<TestProgressionRecord[]>(`/tenant/assessment-progressions/${query}`);
    return res.data;
  },

  async createTestProgression(payload: Partial<TestProgressionRecord>): Promise<TestProgressionRecord> {
    const res = await api.post<TestProgressionRecord>('/tenant/assessment-progressions/', payload);
    return res.data;
  },

  async approveTestProgression(
    id: string,
    payload: { next_variation: string; criteria_met_notes?: string | undefined; review_date?: string | undefined }
  ): Promise<TestProgressionRecord> {
    const res = await api.post<TestProgressionRecord>(`/tenant/assessment-progressions/${id}/approve/`, payload);
    return res.data;
  },
};
