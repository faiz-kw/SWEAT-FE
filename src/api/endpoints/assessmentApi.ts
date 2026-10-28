import { api } from '../client';

export interface HealthScreeningData {
  feeling_well?: boolean;
  chest_pain?: 'NO' | 'YES' | 'PREFER_PRIVATE';
  fainting_dizziness?: boolean;
  unusual_breathlessness?: boolean;
  pain_affecting_movement?: string;
  physical_limitation_injury?: string;
  recent_surgery?: string;
  medical_exercise_restriction?: string;
  other_considerations?: string;
  medication_tolerance?: string;
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
  estimated_body_fat_pct?: number;
  waist_to_hip_ratio?: number;
}

export interface FunctionalTestsPayload {
  warm_up_observation?: {
    walking?: string;
    sit_to_stand?: string;
    squat_pattern?: string;
    overhead_reach?: string;
  };
  lower_body?: {
    test_name?: string;
    variation?: string;
    reps?: number;
    target_height_cm?: number;
    movement_quality?: string;
    pain_reported?: boolean;
    status?: string;
  };
  upper_body?: {
    pushup_variation?: string;
    pushup_reps?: number;
    pushup_quality?: string;
    pull_row_variation?: string;
    pull_row_reps?: number;
    pull_row_load_kg?: number;
    pull_row_quality?: string;
    grip_strength_left_kg?: number;
    grip_strength_right_kg?: number;
  };
  core?: {
    plank_variation?: string;
    hold_seconds?: number;
    stopping_reason?: string;
    quality?: string;
  };
  balance?: {
    single_leg_left_sec?: number;
    single_leg_right_sec?: number;
    support_used?: string;
    tandem_stance?: string;
  };
  mobility?: {
    ankle_knee_to_wall_left_cm?: number;
    ankle_knee_to_wall_right_cm?: number;
    shoulder_reach?: string;
    sit_and_reach_cm?: number;
    overhead_squat_mobility?: string;
  };
  cardio?: {
    protocol?: string;
    duration_minutes?: number;
    speed_kmh?: number;
    incline_pct?: number;
    distance_km?: number;
    recovery_hr_bpm?: number;
    rpe_scale?: number;
    talk_test?: string;
  };
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

export interface AssessmentSession {
  id: string;
  pairing_code: string;
  status: 'DRAFT' | 'TESTING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  member_name: string;
  member_phone: string;
  branch?: {
    id: string;
    name: string;
  };

  // Section 1: Profile & Goals
  assessment_type: string;
  training_experience: string;
  current_activity_level: string;
  preferred_training_style: string;
  target_goal: string;
  target_goal_display: string;
  stated_goal_outcome?: string;
  timeline_months: number;
  timeline_weeks: number;
  weekly_frequency: number;
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

  // Photos & Posture
  photo_front_url?: string;
  photo_side_url?: string;
  metrics?: {
    posture_score: number;
    shoulder_tilt_degrees: number;
    hip_tilt_degrees: number;
    forward_head_angle_degrees: number;
  };

  // Unlocked After Approval
  recommended_package?: {
    id?: string;
    name?: string;
    session_units?: number;
    price?: number;
    reason?: string;
  };
  alternatives?: Array<{
    id: string;
    name: string;
    sessions: number;
    price: number;
  }>;
  milestones?: {
    month_1?: string;
    month_2?: string;
    month_3?: string;
  };

  // Coach Prescriptions
  coach_strengths?: string;
  coach_areas_to_develop?: string;
  workout_prescription?: string;
  diet_prescription?: string;
  reassessment_interval_weeks?: number;
  reviewed_at?: string;
  created_at: string;
}

export const assessmentApi = {
  async startAssessment(payload: {
    member_name?: string;
    member_phone?: string;
    branch_id?: string;
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
    package_id?: string;
    bypass_paywall?: boolean;
  }): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>('/tenant/assessments/', {
      ...payload,
      bypass_paywall: payload.bypass_paywall ?? true,
    });
    return res.data;
  },

  async updateAssessment(id: string, payload: Partial<AssessmentSession> | any): Promise<AssessmentSession> {
    const res = await api.patch<AssessmentSession>(`/tenant/assessments/${id}/`, payload);
    return res.data;
  },

  async getAssessment(id: string): Promise<AssessmentSession> {
    const res = await api.get<AssessmentSession>(`/tenant/assessments/${id}/`);
    return res.data;
  },

  async capturePhotos(
    id: string,
    formData: FormData
  ): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>(`/tenant/assessments/${id}/capture/`, formData);
    return res.data;
  },

  async approveAndSend(
    id: string,
    payload: {
      coach_notes?: string;
      workout_prescription?: string;
      diet_prescription?: string;
      send_whatsapp?: boolean;
    }
  ): Promise<AssessmentSession> {
    const res = await api.post<AssessmentSession>(`/tenant/assessments/${id}/approve-and-send/`, {
      ...payload,
      send_whatsapp: payload.send_whatsapp ?? false, // WhatsApp dispatch is false per studio requirement
    });
    return res.data;
  },

  async pairDisplayScreen(code: string): Promise<any> {
    const res = await api.get<any>('/tenant/assessments/pair/', {
      params: { code },
    });
    return res.data;
  },
};
