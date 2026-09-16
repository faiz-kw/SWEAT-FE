export type MembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'FROZEN'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'TERMINATED';

export type FreezeStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type EntitlementStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'INACTIVE';

export type LedgerTransactionType =
  | 'ALLOCATION'
  | 'CONSUMPTION'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'EXPIRY';

export interface MembershipContractSnapshot {
  id: string;
  membership: string;
  package: string;
  package_version: string;
  package_price?: string | null;
  package_name_snapshot: string;
  purchase_price: string;
  discount_amount: string;
  tax_amount: string;
  final_amount: string;
  currency: string;
  duration_value: number;
  duration_unit: string;
  start_date: string;
  end_date: string;
  entitlements_snapshot: Array<{
    id?: string;
    entitlement_type: string;
    reference_type?: string | null;
    reference_id?: string | null;
    allocated_units?: string | null;
    is_unlimited?: boolean;
  }>;
  class_access_snapshot?: any[];
  purchase_branch: string;
  terms_document_version_ids?: string[];
  applicable_policy_versions?: Record<string, any>;
  source_order?: string | null;
  source_order_item?: string | null;
  created_at: string;
}

export interface MembershipEntitlementLedger {
  id: string;
  membership_entitlement: string;
  transaction_type: LedgerTransactionType;
  units: string;
  booking_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reason_code?: string | null;
  reason_text?: string | null;
  balance_after?: string | null;
  created_by_user?: string | null;
  created_at: string;
}

export interface MembershipEntitlement {
  id: string;
  membership: string;
  source_definition?: string | null;
  entitlement_type: string;
  reference_type?: string | null;
  reference_id?: string | null;
  allocated_units?: string | null;
  consumed_units: string;
  remaining_units?: string | null;
  is_unlimited: boolean;
  valid_from: string;
  valid_until?: string | null;
  status: EntitlementStatus;
  created_at: string;
  updated_at: string;
}

export interface MembershipBranchHistory {
  id: string;
  membership: string;
  from_branch?: string | null;
  from_branch_name?: string | null;
  to_branch: string;
  to_branch_name?: string | null;
  change_type: string;
  reason?: string | null;
  effective_at: string;
  changed_by_user?: string | null;
  created_at: string;
}

export interface MembershipStatusHistory {
  id: string;
  membership: string;
  from_status?: string | null;
  to_status: string;
  reason_code?: string | null;
  reason_text?: string | null;
  changed_by_user?: string | null;
  changed_at: string;
  created_at: string;
}

export interface MembershipFreeze {
  id: string;
  membership: string;
  freeze_from: string;
  freeze_until: string;
  reason_code?: string | null;
  reason_text?: string | null;
  extend_membership_days?: number | null;
  status: FreezeStatus;
  approved_by_user?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRenewalPolicy {
  id: string;
  package: string;
  package_name?: string;
  package_version?: string | null;
  version_number: number;
  renewal_pricing_mode: string;
  renewal_entitlement_mode: string;
  grace_days?: number | null;
  configuration?: Record<string, any>;
  effective_from: string;
  effective_until?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  created_at: string;
  updated_at: string;
}

export interface MembershipChangePolicyRule {
  id: string;
  membership_change_policy: string;
  change_type: string;
  rule_name: string;
  min_membership_age_days?: number | null;
  max_membership_age_days?: number | null;
  min_remaining_days?: number | null;
  max_remaining_days?: number | null;
  min_remaining_sessions?: string | null;
  notice_period_days?: number | null;
  effective_mode: string;
  pricing_mode: string;
  unused_session_handling: string;
  validity_handling: string;
  refund_mode: string;
  cancellation_fee_type: string;
  cancellation_fee_value?: string | null;
  requires_payment: boolean;
  requires_manager_approval: boolean;
  requires_member_confirmation: boolean;
  requires_terms_acceptance: boolean;
  target_package?: string | null;
  target_package_name?: string | null;
  target_package_version?: string | null;
  priority: number;
  configuration?: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface MembershipChangePolicy {
  id: string;
  organization: string;
  branch?: string | null;
  program?: string | null;
  package?: string | null;
  package_version?: string | null;
  policy_name: string;
  version_number: number;
  rule_behavior: string;
  effective_from: string;
  effective_until?: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'RETIRED';
  created_by_user?: string | null;
  rules: MembershipChangePolicyRule[];
  created_at: string;
  updated_at: string;
}

export interface MembershipChangeRequest {
  id: string;
  membership: string;
  membership_change_policy: string;
  membership_change_policy_rule: string;
  policy_version_number: number;
  change_type: string;
  current_package: string;
  current_package_name?: string;
  current_package_version: string;
  target_package?: string | null;
  target_package_name?: string | null;
  target_package_version?: string | null;
  effective_mode_applied: string;
  pricing_mode_applied: string;
  remaining_sessions_snapshot?: string | null;
  remaining_days_snapshot?: number | null;
  original_remaining_value?: string | null;
  credit_amount: string;
  refund_amount: string;
  penalty_amount: string;
  additional_amount: string;
  final_amount_payable: string;
  source_order?: string | null;
  status: 'REQUESTED' | 'QUOTED' | 'PAYMENT_PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'CANCELLED';
  requested_by_user?: string | null;
  approved_by_user?: string | null;
  requested_at: string;
  approved_at?: string | null;
  applied_at?: string | null;
  reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPackageHistory {
  id: string;
  membership: string;
  from_package?: string | null;
  from_package_name?: string | null;
  from_package_version?: string | null;
  to_package: string;
  to_package_name?: string | null;
  to_package_version: string;
  change_type: string;
  effective_at: string;
  order?: string | null;
  membership_change_request?: string | null;
  changed_by_user?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  user_profile: string;
  member_name?: string;
  program?: string | null;
  package: string;
  package_name?: string;
  package_version: string;
  package_price?: string | null;
  source_order?: string | null;
  source_order_item?: string | null;
  purchase_branch: string;
  purchase_branch_name?: string;
  home_branch: string;
  home_branch_name?: string;
  membership_number: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  activated_at?: string | null;
  cancelled_at?: string | null;
  legacy_reference?: string | null;
  contract_snapshot?: MembershipContractSnapshot;
  entitlements?: MembershipEntitlement[];
  created_at: string;
  updated_at: string;
}
