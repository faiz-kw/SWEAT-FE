export type BookingStatus =
  | 'DRAFT'
  | 'RESERVED'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'LATE_CANCELLED'
  | 'EXPIRED';

export type CheckInMethod =
  | 'MANUAL'
  | 'QR_CODE'
  | 'BARCODE'
  | 'NFC_RFID'
  | 'KIOSK'
  | 'BIOMETRIC'
  | 'APP_BLUETOOTH'
  | 'SYSTEM';

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'LEFT_EARLY'
  | 'NO_SHOW'
  | 'EXCUSED'
  | 'CANCELLED';

export interface Booking {
  id: string;
  booking_number: string;
  user_profile: string;
  user_profile_name?: string;
  user_profile_email?: string;
  occurrence: string;
  occurrence_title?: string;
  occurrence_start_at?: string;
  occurrence_end_at?: string;
  branch: string;
  branch_name?: string;
  membership?: string;
  entitlement?: string;
  booking_type: 'MEMBER' | 'GUEST' | 'DROP_IN' | 'COMPLIMENTARY' | 'STAFF';
  booking_source: 'WEB' | 'MOBILE_APP' | 'KIOSK' | 'FRONT_DESK' | 'INTEGRATION';
  status: BookingStatus;
  waitlist_position?: number;
  reserved_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  attended_at?: string;
  check_in_time?: string;
  check_in_method?: CheckInMethod;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingCancellationRule {
  id: string;
  booking_policy_set: string;
  name: string;
  cancellation_type: 'STANDARD' | 'LATE' | 'TREATED_AS_NO_SHOW';
  min_minutes_before_start: number;
  session_action: 'RESTORE' | 'FORFEIT' | 'PARTIAL_CREDIT' | 'NO_ACTION';
  penalty_fee_amount: string;
  priority: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface BookingPolicySet {
  id: string;
  organization: string;
  name: string;
  code: string;
  booking_window_days_in_advance: number;
  cancellation_cutoff_minutes: number;
  waitlist_capacity_limit: number;
  auto_promote_waitlist: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  cancellation_rules?: BookingCancellationRule[];
}

export interface AttendanceRecord {
  id: string;
  booking: string;
  booking_number?: string;
  user_profile: string;
  user_profile_name?: string;
  user_profile_email?: string;
  occurrence: string;
  occurrence_title?: string;
  branch: string;
  branch_name?: string;
  status: AttendanceStatus;
  check_in_time: string;
  check_out_time?: string;
  check_in_method: CheckInMethod;
  verification_status: 'VERIFIED' | 'FLAGGED' | 'MANUAL_OVERRIDE' | 'FAILED';
  verification_notes?: string;
  created_at: string;
}

export interface AccessEvent {
  id: string;
  user_profile?: string;
  user_profile_name?: string;
  branch: string;
  branch_name?: string;
  event_type: 'ENTRY' | 'EXIT' | 'DENIED' | 'EMERGENCY_EXIT';
  access_point_name: string;
  credential_type: 'RFID' | 'QR' | 'BARCODE' | 'BIOMETRIC' | 'PIN';
  status: 'GRANTED' | 'DENIED';
  denial_reason?: string;
  timestamp: string;
}

export interface MemberAttendanceState {
  id: string;
  user_profile: string;
  user_profile_name?: string;
  total_bookings: number;
  attended_count: number;
  no_show_count: number;
  late_cancel_count: number;
  current_consecutive_no_shows: number;
  current_strike_count: number;
  is_booking_suspended: boolean;
  suspended_until?: string;
  suspension_reason?: string;
  last_attended_at?: string;
  updated_at: string;
}

export interface AttendancePolicySet {
  id: string;
  organization: string;
  name: string;
  code: string;
  max_strikes_before_action: number;
  strike_reset_window_days: number;
  default_suspension_days: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export interface AttendancePenaltyRule {
  id: string;
  attendance_policy_set: string;
  name: string;
  penalty_action: 'WARNING' | 'SUSPEND_BOOKING' | 'CHARGE_FEE' | 'DOWNGRADE_TIER';
  threshold_strikes: number;
  penalty_amount: string;
  suspension_days: number;
  status: 'ACTIVE' | 'ARCHIVED';
}
