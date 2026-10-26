import { api } from '../client';

export interface AssessmentEligibility {
  eligible: boolean;
  reason?: string;
  remaining_credits?: number;
  package_name?: string;
  membership_id?: string;
  is_unlimited?: boolean;
}

export interface AssessmentSession {
  id: string;
  pairing_code: string;
  status: 'DRAFT' | 'PHOTOS_CAPTURED' | 'ANALYZING' | 'PENDING_REVIEW' | 'APPROVED' | 'DISPATCHED' | 'REJECTED';
  member_name: string;
  member_phone: string;
  branch?: {
    id: string;
    name: string;
  };
  target_goal: string;
  target_goal_display: string;
  timeline_months: number;
  weekly_frequency: number;
  user_notes?: string;
  photo_front_url?: string;
  photo_side_url?: string;
  metrics?: {
    posture_score: number;
    shoulder_tilt_degrees: number;
    hip_tilt_degrees: number;
    estimated_body_fat_pct: number;
    waist_to_hip_ratio: number;
  };
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
  coach_notes?: string;
  workout_prescription?: string;
  diet_prescription?: string;
  reviewed_at?: string;
  whatsapp_status?: string;
  created_at: string;
}

export const assessmentApi = {
  async checkEligibility(branchId?: string): Promise<AssessmentEligibility> {
    const res = await api.get<AssessmentEligibility>('/mobile/assessment/eligibility/', {
      params: branchId ? { branch_id: branchId } : undefined,
    });
    return res.data;
  },

  async startAssessment(payload: {
    target_goal: string;
    target_timeline_months: number;
    weekly_frequency_days: number;
    member_name?: string;
    member_phone?: string;
    branch_id?: string;
    user_notes?: string;
    user_profile_id?: string;
    package_id?: string;
    bypass_paywall?: boolean;
  }): Promise<any> {
    const res = await api.post<any>('/tenant/assessments/', {
      ...payload,
      bypass_paywall: payload.bypass_paywall ?? true,
    });
    return res.data;
  },

  async getAssessment(id: string): Promise<AssessmentSession> {
    const res = await api.get<AssessmentSession>(`/tenant/assessments/${id}/`);
    return res.data;
  },

  async capturePhotos(
    id: string,
    formData: FormData
  ): Promise<{
    status: string;
    metrics: any;
    posture_score: number;
    milestones: any;
    recommended_package: any;
  }> {
    const res = await api.post<any>(`/tenant/assessments/${id}/capture/`, formData);
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
  ): Promise<any> {
    const res = await api.post<any>(`/tenant/assessments/${id}/approve-and-send/`, payload);
    return res.data;
  },

  async pairDisplayScreen(code: string): Promise<any> {
    const res = await api.get<any>('/tenant/assessments/pair/', {
      params: { code },
    });
    return res.data;
  },
};
