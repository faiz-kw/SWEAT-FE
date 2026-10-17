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
  is_included_in_plan?: boolean;
  ineligible_reason?: string | null;
  allowed_package_name?: string | null;
  package_name?: string | null;
  user_has_booking: boolean;
  user_booking_id?: string | null;
  is_waitlist_open?: boolean;
  booking_state?: string;
  has_started?: boolean;
  has_ended?: boolean;
  is_in_progress?: boolean;
  is_bookable?: boolean;
  can_book?: boolean;
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
  location_name?: string;
  location_code?: string;
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

export interface MobileMembershipActionOptions {
  has_membership: boolean;
  active_membership: {
    id: string;
    membership_number: string;
    package_id?: string | null;
    package_name: string;
    package_version_id?: string | null;
    program_id?: string | null;
    program_name?: string | null;
    program_code?: string | null;
    branch_id?: string | null;
    branch_name?: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    days_remaining: number;
    total_sessions: number;
    remaining_sessions: number;
    used_sessions: number;
    is_frozen: boolean;
    parq_status?: string | null;
    parq_completed_at?: string | null;
  } | null;
  branches?: Array<{
    id: string;
    name: string;
    code?: string;
    city?: string;
    state?: string;
  }>;
  programs?: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
  renew_options: Array<{
    package_id: string;
    package_version_id: string;
    name?: string;
    package_name?: string;
    program_id: string;
    program_name: string;
    program_code?: string;
    duration_days: number;
    session_count?: number;
    session_credits?: number;
    base_price: number;
    tax_percent: number;
    tax_amount?: number;
    total_price: number;
    currency: string;
    is_current_package?: boolean;
  }>;
  upgrade_options: Array<{
    package_id: string;
    package_version_id: string;
    name?: string;
    package_name?: string;
    program_id: string;
    program_name: string;
    program_code?: string;
    duration_days: number;
    session_count?: number;
    session_credits?: number;
    base_price?: number;
    tax_percent?: number;
    tax_amount?: number;
    total_price: number;
    current_price?: number;
    price_difference: number;
    additional_sessions?: number;
    additional_days?: number;
    credits_gain?: number;
    currency: string;
  }>;
  extend_options: {
    enabled?: boolean;
    available_options?: Array<{
      days: number;
      base_fee: number;
      tax_pct: number;
      tax_amount: number;
      total_fee: number;
      name?: string;
    }>;
    available_days?: number[];
    requires_approval?: boolean;
    policy_note: string;
  };
  freeze_options: {
    enabled?: boolean;
    min_days: number;
    max_days: number;
    fee_fixed?: number;
    fee_per_day?: number;
    tax_pct?: number;
    requires_approval?: boolean;
    policy_note: string;
  };
  active_freeze?: {
    id: string;
    freeze_from: string;
    freeze_until: string;
    days: number;
    status: string;
    reason?: string;
  } | null;
  parq_info?: {
    has_completed_parq: boolean;
    submission_id: string | null;
    submitted_at: string | null;
    is_cleared: boolean;
    form_title?: string;
  };
  razorpay_key_id?: string;
  pending_requests?: Array<{
    id: string;
    request_type: string;
    status: string;
    created_at: string;
    payload: Record<string, any>;
  }>;
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

  // Membership Self-Service Lifecycle Actions
  getMembershipActions: (params?: { branch_id?: string }) =>
    api.get<MobileMembershipActionOptions>('/mobile/memberships/actions/', { params }),

  renewMembership: (data: {
    branch_id?: string;
    package_id?: string;
    package_version_id?: string;
    parq_decision?: string;
    existing_submission_id?: string;
    signature_data?: string;
    answers?: Record<string, any>;
  }) =>
    api.post<{
      order_id: string;
      order_number: string;
      razorpay_order_id?: string;
      status: string;
      total_amount?: number;
      amount?: number;
      amount_paise?: number;
      currency?: string;
      razorpay_key_id?: string;
      package_name: string;
      branch_name?: string;
      detail: string;
      requires_payment: boolean;
      is_active?: boolean;
    }>('/mobile/memberships/renew/', data),

  upgradeMembership: (data: {
    target_branch_id?: string;
    target_program_id?: string;
    target_package_id: string;
    target_package_version_id?: string;
    reason?: string;
    parq_decision?: string;
    existing_submission_id?: string;
    signature_data?: string;
    answers?: Record<string, any>;
  }) =>
    api.post<{
      detail: string;
      order_id?: string;
      order_number?: string;
      razorpay_order_id?: string;
      request_id?: string;
      status: string;
      target_package_name?: string;
      price_difference: number;
      amount?: number;
      amount_paise?: number;
      currency?: string;
      razorpay_key_id?: string;
      requires_payment?: boolean;
      breakdown?: {
        current_package_price: number;
        target_package_price: number;
        difference_base: number;
        difference_tax: number;
        total_payable: number;
      };
    }>('/mobile/memberships/upgrade/', data),

  extendMembership: (data: { days: number; reason?: string }) =>
    api.post<{
      detail: string;
      order_id?: string;
      order_number?: string;
      razorpay_order_id?: string;
      request_id?: string;
      status: string;
      requested_days?: number;
      days?: number;
      amount?: number;
      amount_paise?: number;
      currency?: string;
      razorpay_key_id?: string;
      current_end_date: string | null;
      new_end_date?: string | null;
      requires_payment?: boolean;
    }>('/mobile/memberships/extend/', data),

  freezeMembership: (data: { freeze_from: string; freeze_until: string; reason: string }) =>
    api.post<{
      detail: string;
      order_id?: string;
      order_number?: string;
      razorpay_order_id?: string;
      freeze_id?: string;
      request_id?: string;
      status: string;
      freeze_from: string;
      freeze_until: string;
      days: number;
      amount?: number;
      amount_paise?: number;
      currency?: string;
      razorpay_key_id?: string;
      new_end_date?: string | null;
      requires_payment?: boolean;
    }>('/mobile/memberships/freeze/', data),

  unfreezeMembership: (data?: { reason?: string }) =>
    api.post<{
      detail: string;
      status: string;
      membership_id: string;
    }>('/mobile/memberships/unfreeze/', data || {}),

  verifyCheckout: (data: {
    order_id: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    payment_id?: string;
  }) =>
    api.post<{
      detail: string;
      status: string;
      membership_id?: string;
      package_name?: string;
      start_date?: string;
      end_date?: string;
      order_number?: string;
      already_processed?: boolean;
    }>('/mobile/checkout/verify/', data),
};
