import { api } from '../client';

export interface MobileMemberProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url?: string;
  membership_number?: string;
  home_branch?: {
    id: string;
    name: string;
    code: string;
  };
  onboarding_completed: boolean;
  parq_status?: string;
  role?: string;
}

export interface MobilePassbookCredit {
  id: string;
  package_name: string;
  package_type: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  valid_from: string;
  valid_until: string;
  days_remaining: number;
  status: string;
}

export interface MobileScheduleOccurrence {
  id: string;
  class_definition_id: string;
  class_name: string;
  category: string;
  category_id?: string;
  category_code?: string;
  description: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_spots: number;
  is_full: boolean;
  status: string;
  branch: {
    id: string;
    name: string;
    address?: string;
  };
  trainer: {
    id: string;
    name: string;
    designation: string;
    avatar_url: string;
    bio: string;
    specialties: string[];
    experience_years?: number;
  };
  is_included_in_plan: boolean;
  user_has_booking: boolean;
  user_booking_id?: string | null;
}

export interface MobileBooking {
  id: string;
  occurrence_id: string;
  class_name: string;
  category: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW' | 'WAITLISTED';
  booked_at: string;
  check_in_at?: string | null;
  branch: {
    id: string;
    name: string;
  };
  trainer: {
    name: string;
    avatar_url: string;
    designation: string;
  };
  can_reschedule?: boolean;
  can_cancel?: boolean;
}

export interface MobilePTAppointment {
  id: string;
  appointment_number: string;
  type_name: string;
  status: string;
  start_at: string;
  end_at: string;
  trainer_name: string;
  trainer_avatar: string;
  trainer_designation: string;
  branch_name: string;
  notes?: string;
}

export interface MobileTrainer {
  id: string;
  name: string;
  designation: string;
  avatar_url: string;
  bio: string;
  specialties: string[];
  experience_years?: number;
}

export interface MobileClassCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface MobileClassCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  display_order?: number;
  class_count?: number;
}

export interface MobileBranch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface MobilePackage {
  id: string;
  name: string;
  category: string;
  price: string | number;
  validity_days: number;
  session_count: number;
  description?: string;
  features?: string[];
}

export interface PARQQuestion {
  id: string;
  text: string;
  type: 'yes_no' | 'text' | 'number';
  category?: string;
  required?: boolean;
}

export interface PARQSurveyResponse {
  survey_id?: string;
  form_id?: string;
  form_name?: string;
  version_number?: number;
  agreement_title?: string;
  agreement_text?: string;
  is_completed: boolean;
  is_cleared: boolean;
  status_badge: string;
  saved_responses: Record<string, any>;
  questions: any[];
  sections?: any[];
  submission?: {
    id: string;
    submitted_at?: string | null;
    signer_identity?: string;
    signature_data?: string | null;
    form_name?: string;
    version_number?: number;
    submission_count?: number;
    is_edit?: boolean;
    revision_number?: number;
    agreement_accepted?: boolean;
  } | null;
}

export const mobileApi = {
  // Member Profile
  getProfile: () => api.get<MobileMemberProfile>('/mobile/me/'),
  updateProfile: (data: Partial<MobileMemberProfile>) => api.patch<MobileMemberProfile>('/mobile/me/', data),

  // Passbook / Credits / Packages
  getMyCredits: () => api.get<MobilePassbookCredit[]>('/mobile/credits/'),
  getPackages: () => api.get<MobilePackage[]>('/mobile/packages/'),

  // Branches & Studios
  getBranches: () => api.get<MobileBranch[]>('/mobile/branches/'),

  // Class Categories / Formats
  getCategories: () => api.get<MobileClassCategory[]>('/mobile/categories/'),

  // Class Schedule & Booking
  getSchedule: (params?: { date?: string; branch_id?: string; category?: string }) =>
    api.get<MobileScheduleOccurrence[]>('/mobile/schedule/', { params }),

  bookClass: (occurrenceId: string) =>
    api.post<{ detail: string; booking_id: string; remaining_credits: number }>(
      `/mobile/schedule/${occurrenceId}/book/`
    ),

  getMyBookings: () => api.get<MobileBooking[]>('/mobile/bookings/'),

  rescheduleBooking: (bookingId: string, newOccurrenceId: string) =>
    api.post<{ detail: string; booking_id: string; new_start_time: string }>(
      `/mobile/bookings/${bookingId}/reschedule/`,
      { new_occurrence_id: newOccurrenceId }
    ),

  cancelBooking: (bookingId: string) =>
    api.post<{ detail: string; refunded: boolean; remaining_credits: number }>(
      `/mobile/bookings/${bookingId}/cancel/`
    ),

  getQRPass: () =>
    api.get<{
      pass_id: string;
      member_name: string;
      membership_number: string;
      qr_payload: string;
      valid_until: string;
    }>('/mobile/qr-pass/'),

  // Personal Training (PT)
  getTrainers: () => api.get<MobileTrainer[]>('/mobile/trainers/'),
  getPTAppointments: () => api.get<MobilePTAppointment[]>('/mobile/pt/appointments/'),
  bookPTAppointment: (data: {
    trainer_id?: string;
    start_at: string;
    duration_minutes?: number;
    focus?: string;
    notes?: string;
  }) =>
    api.post<{ detail: string; appointment_id: string; appointment_number: string; start_at: string }>(
      '/mobile/pt/appointments/',
      data
    ),
  cancelPTAppointment: (appointmentId: string) =>
    api.post<{ detail: string }>(`/mobile/pt/appointments/${appointmentId}/cancel/`),

  // PAR-Q Health Questionnaire
  getPARQSurvey: () => api.get<PARQSurveyResponse>('/mobile/onboarding-survey/'),
  submitPARQSurvey: (payload: Record<string, any>) =>
    api.post<{ detail: string; is_cleared: boolean; message?: string; submission_id?: string; is_edit?: boolean; revision_number?: number }>(
      '/mobile/onboarding/submit/',
      payload
    ),
};
