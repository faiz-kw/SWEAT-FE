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

export interface FunctionalTestsPayload {
  lower_body?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  upper_body?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  core?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  balance?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  mobility?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
  cardiovascular?: FunctionalTestItem | { assessed_tests?: FunctionalTestItem[] };
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

  async approveAndSend(
    id: string,
    payload: {
      coach_notes?: string;
      workout_prescription?: string;
      diet_prescription?: string;
      reassessment_interval_weeks?: number;
      send_whatsapp?: boolean;
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
    payload: { next_variation: string; criteria_met_notes?: string; review_date?: string }
  ): Promise<TestProgressionRecord> {
    const res = await api.post<TestProgressionRecord>(`/tenant/assessment-progressions/${id}/approve/`, payload);
    return res.data;
  },
};
