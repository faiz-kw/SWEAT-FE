/**
 * src/types/members.ts — Comprehensive Type Definitions for Member Directory, Member 360, Passbook & Finance
 */

export type MembershipLifecycleAction =
  | 'RENEW'
  | 'UPGRADE'
  | 'EXTEND'
  | 'FREEZE'
  | 'UNFREEZE'
  | 'TRANSFER'
  | 'CANCEL'
  | 'REJOIN'
  | 'ADJUST_ENTITLEMENT'
  | 'COLLECT_PAYMENT'
  | 'CHECK_IN';

export interface AvailableAction {
  action: MembershipLifecycleAction;
  label: string;
  eligible: boolean;
  reason?: string;
}

export interface MemberAlert {
  id: string;
  type: string;
  severity: 'warning' | 'destructive' | 'info';
  title: string;
  message: string;
  action?: MembershipLifecycleAction;
}

export interface Member {
  id: string;
  tenant_id?: string;
  member_number: string;
  name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  age: number;
  date_of_birth?: string;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'INACTIVE';
  membership_status: string;
  membership?: string;
  membership_id?: string;
  home_branch_id?: string;
  home_branch: string;
  location?: string;
  location_name?: string;
  program_id?: string;
  program_name: string;
  package_id?: string;
  package_name: string;
  package_version_name: string;
  start_date?: string | null;
  expiry_date?: string | null;
  home_sessions_remaining: number;
  cross_branch_sessions_remaining: number;
  outstanding_balance: number;
  assigned_trainer: string;
  joined_at: string;
  emergency_contact: string;
  source: string;
  fitness_goal?: string;
  health_score?: number;
  performance_score?: number;
  risk_level?: string;
  attendance_count_30d: number;
  last_visit: string;
  active_plan?: {
    id: string;
    plan_name: string;
    status: string;
    start_date: string;
    end_date: string;
  };
}

export interface MemberDirectoryResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Member[];
}

export interface ContractSnapshotData {
  id: string;
  package_name: string;
  purchase_price: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  currency: string;
  duration_value: number;
  duration_unit: string;
  start_date: string;
  end_date: string;
  entitlements_snapshot: any[];
}

export interface MembershipRecord {
  id: string;
  membership_number: string;
  package_name: string;
  package_version_name: string;
  program_name: string;
  status: string;
  start_date: string;
  end_date: string;
  home_branch: string;
  purchase_branch: string;
  activated_at?: string | null;
  contract_snapshot?: ContractSnapshotData | null;
}

export interface EntitlementBalance {
  id: string;
  entitlement_type: string;
  allocated: number | null;
  consumed: number;
  remaining: number | null;
  is_unlimited: boolean;
  status: string;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface EntitlementLedgerEntry {
  id: string;
  occurred_at: string;
  transaction_type: 'ALLOCATION' | 'CONSUMPTION' | 'REVERSAL' | 'ADJUSTMENT' | 'EXPIRY';
  entitlement_type: string;
  units: number;
  balance_after: number | null;
  reason: string;
  booking_id?: string | null;
  actor: string;
}

export interface TimelineEvent {
  id: string;
  category: 'CRM' | 'COMMERCE' | 'MEMBERSHIP' | 'ENTITLEMENT' | 'BOOKING' | 'ATTENDANCE' | 'AUDIT';
  event_type: string;
  title: string;
  description: string;
  occurred_at: string;
  actor: string;
  badge_color: string;
  metadata?: Record<string, any>;
}

export interface MemberBookingItem {
  id: string;
  booking_number: string;
  class_name: string;
  branch_name: string;
  status: string;
  booking_source: string;
  date_time: string;
  trainer_name: string;
}

export interface MemberAttendanceItem {
  id: string;
  date_time: string;
  branch_name: string;
  status: string;
  check_in_method: string;
  marked_by: string;
}

export interface MemberOrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface MemberOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  currency: string;
  created_at: string;
  items: MemberOrderItem[];
}

export interface MemberPayment {
  id: string;
  order_id?: string | null;
  order_number: string;
  provider: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string;
}

export interface MemberInvoiceItem {
  id: string;
  invoice_number: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  issued_at: string;
  download_url: string;
}

export interface MemberRefund {
  id: string;
  order_number: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface MemberIntakeSubmission {
  id: string;
  form_title: string;
  submitted_at: string;
  answers: Array<{
    question_id: string;
    question_text: string;
    question_type: string;
    answer: string;
  }>;
}

export interface Member360Data {
  member: Member;
  header: {
    name: string;
    member_number: string;
    status: string;
    home_branch: string;
    home_branch_id?: string | null;
    current_program: string;
    current_package: string;
    current_package_version: string;
    expiry_date: string | null;
    home_sessions_remaining: number;
    cross_branch_sessions_remaining: number;
    outstanding_balance: number;
    assigned_trainer: string;
    alerts: MemberAlert[];
    available_actions: AvailableAction[];
  };
  overview: {
    contact: {
      full_name: string;
      email: string;
      phone: string;
      gender: string;
      age: number;
      joined_at: string;
      emergency_contact: string;
      acquisition_source: string;
    };
    home_branch: {
      id?: string | null;
      name: string;
    };
    current_membership?: MembershipRecord | null;
    entitlement_summary: EntitlementBalance[];
    outstanding_balance: number;
    next_booking?: MemberBookingItem | null;
    assigned_trainer: string;
    alerts: MemberAlert[];
    recent_activities: TimelineEvent[];
  };
  timeline: TimelineEvent[];
  memberships: {
    active?: MembershipRecord | null;
    upcoming: MembershipRecord[];
    history: MembershipRecord[];
    freezes: Array<{
      id: string;
      freeze_from: string;
      freeze_until: string;
      days: number | null;
      status: string;
      reason: string;
      approved_by: string;
    }>;
    branch_history: Array<{
      id: string;
      from_branch: string | null;
      to_branch: string;
      change_type: string;
      reason: string;
      effective_at: string;
    }>;
    status_history: Array<{
      id: string;
      from_status: string | null;
      to_status: string;
      reason: string;
      changed_at: string;
    }>;
  };
  passbook: {
    balances: EntitlementBalance[];
    ledger: EntitlementLedgerEntry[];
  };
  bookings_and_attendance: {
    upcoming_bookings: MemberBookingItem[];
    past_bookings: MemberBookingItem[];
    attendance_records: MemberAttendanceItem[];
    stats: {
      visits_30d: number;
      last_visit: string;
      total_bookings: number;
    };
  };
  finance: {
    summary: {
      total_invoiced: number;
      total_paid: number;
      total_outstanding: number;
      total_refunded: number;
    };
    orders: MemberOrder[];
    payments: MemberPayment[];
    invoices: MemberInvoiceItem[];
    refunds: MemberRefund[];
  };
  health_and_forms: {
    submissions: MemberIntakeSubmission[];
  };
}
