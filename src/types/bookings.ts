export type BookingStatus =
  | 'RESERVED'
  | 'WAITLISTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type BookingType =
  | 'MEMBER'
  | 'TRIAL'
  | 'WALK_IN'
  | 'COMPLIMENTARY'
  | 'PAY_PER_USE';

export type BookingSource =
  | 'WEB'
  | 'MOBILE_APP'
  | 'FRONT_DESK'
  | 'ADMIN'
  | 'KIOSK'
  | 'QR'
  | 'API'
  | 'MIGRATION'
  | 'OTHER';

export type WaitlistEventType =
  | 'JOINED'
  | 'POSITION_CHANGED'
  | 'PROMOTION_OFFERED'
  | 'PROMOTED'
  | 'PROMOTION_ACCEPTED'
  | 'PROMOTION_EXPIRED'
  | 'AUTO_CANCELLED'
  | 'MANUALLY_CANCELLED';

export type WaitlistPromotionMode = 'FIFO' | 'PRIORITY' | 'MANUAL';

export type RuleBehavior = 'CONTRACTUAL' | 'OPERATIONAL' | 'TRANSACTIONAL';

export type PolicyStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'RETIRED';

export interface BookingStatusHistory {
  id: string;
  from_status?: string | null;
  to_status: string;
  reason_code?: string | null;
  reason_text?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
}

export interface BookingReschedule {
  id: string;
  reschedule_number: number;
  from_class_name?: string;
  to_class_name?: string;
  from_occurrence_date?: string;
  to_occurrence_date?: string;
  reason_code?: string | null;
  reason_text?: string | null;
  rescheduled_by_name?: string | null;
  rescheduled_at: string;
}

export interface BookingCancellation {
  id: string;
  reason_code: string;
  reason_text?: string | null;
  minutes_before_class: number;
  treated_as_no_show: boolean;
  session_action_applied: 'RESTORE' | 'CONSUME' | 'NO_ACTION';
  session_units_applied: string | number;
  within_cutoff: boolean;
  cancelled_by_name?: string | null;
  cancelled_at: string;
}

export interface BookingWaitlistEvent {
  id: string;
  event_type: WaitlistEventType;
  old_position?: number | null;
  new_position?: number | null;
  reason?: string | null;
  triggered_by_type: 'SYSTEM' | 'USER' | 'ADMIN';
  created_at: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  user_profile: string;
  member_name?: string;
  member_email?: string;
  member_phone?: string;
  member_number?: string;
  occurrence: string;
  class_name?: string;
  occurrence_date?: string;
  start_at?: string;
  end_at?: string;
  start_time?: string;
  end_time?: string;
  branch: string;
  branch_name?: string;
  membership?: string | null;
  package_name?: string | null;
  entitlement?: string | null;
  entitlement_name?: string | null;
  booking_type: BookingType | string;
  booking_source: BookingSource | string;
  status: BookingStatus | string;
  is_trial?: boolean;
  lead_id?: string | null;
  confirmation_status?: string | null;
  occurrence_title?: string;
  occurrence_start_at?: string;
  user_profile_name?: string;
  user_profile_email?: string;
  waitlist_position?: number | null;
  booked_at: string;
  cancelled_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  reschedules?: BookingReschedule[];
  status_history?: BookingStatusHistory[];
  cancellations?: BookingCancellation[];
  waitlist_events?: BookingWaitlistEvent[];
}

export interface BookingPolicySet {
  id: string;
  organization: string;
  branch?: string | null;
  program?: string | null;
  class_template?: string | null;
  occurrence?: string | null;
  version_number: number;
  rule_behavior: RuleBehavior;
  effective_from: string;
  effective_until?: string | null;
  max_upcoming_bookings: number;
  booking_open_minutes_before?: number | null;
  booking_close_minutes_before?: number | null;
  allow_waitlist: boolean;
  waitlist_capacity?: number | null;
  waitlist_close_minutes_before?: number | null;
  waitlist_auto_cancel_minutes_before?: number | null;
  auto_waitlist_promotion: boolean;
  waitlist_promotion_mode: WaitlistPromotionMode;
  waitlist_confirmation_required: boolean;
  waitlist_confirmation_minutes?: number | null;
  max_reschedules?: number | null;
  late_entry_minutes?: number | null;
  allow_trial: boolean;
  max_trial_bookings?: number | null;
  allow_cross_branch: boolean;
  require_parq: boolean;
  status: PolicyStatus;
  created_at?: string;
  updated_at?: string;
}

export interface BookingCancellationRule {
  id: string;
  booking_policy_set?: string | null;
  organization: string;
  branch?: string | null;
  program?: string | null;
  class_template?: string | null;
  rule_name: string;
  min_minutes_before?: number | null;
  max_minutes_before?: number | null;
  cancellation_type: 'EARLY_CANCEL' | 'LATE_CANCEL_REWARDED' | 'LAST_MINUTE_CANCEL' | 'TREATED_AS_NO_SHOW';
  session_action: 'RESTORE' | 'CONSUME' | 'NO_ACTION';
  reward_type: 'NONE' | 'POINTS' | 'CREDIT';
  reward_value?: string | number | null;
  priority: number;
  valid_from: string;
  valid_until?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AttendanceRecord {
  id: string;
  booking: string;
  booking_number?: string;
  member_name?: string;
  member_email?: string;
  class_name?: string;
  branch_name?: string;
  status: 'PRESENT' | 'LATE' | 'NO_SHOW' | 'CANCELLED';
  check_in_status: 'SUCCESSFUL' | 'FAILED';
  check_in_method: string;
  check_in_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberAttendanceState {
  id: string;
  user_profile: string;
  member_name?: string;
  member_email?: string;
  attendance_policy_set: string;
  consecutive_no_show_count: number;
  active_no_show_count: number;
  current_max_advance_bookings: number;
  booking_mode: 'NORMAL' | 'SINGLE_BOOKING' | 'SUSPENDED';
  restriction_started_at?: string | null;
  restriction_reason?: string | null;
  last_no_show_at?: string | null;
  last_successful_attendance_at?: string | null;
  updated_at: string;
}
