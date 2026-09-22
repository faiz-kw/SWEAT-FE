export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
export type CodeStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type RuleType = 'COUPON' | 'AUTO_DISCOUNT' | 'OFFER' | 'UPGRADE_OFFER' | 'CROSS_SELL' | 'RENEWAL' | 'REJOIN';
export type EvaluationMode = 'ALL_CONDITIONS' | 'ANY_CONDITION';
export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'BETWEEN'
  | 'EXISTS'
  | 'NOT_EXISTS';

export type ActionType =
  | 'SHOW_COUPON'
  | 'APPLY_COUPON'
  | 'APPLY_PERCENTAGE_DISCOUNT'
  | 'APPLY_FIXED_DISCOUNT'
  | 'SHOW_OFFER'
  | 'ALLOW_UPGRADE_PRICE'
  | 'GENERATE_COUPON';

export interface DiscountCode {
  id: string;
  campaign: string;
  campaign_name?: string;
  code: string;
  branch?: string | null;
  branch_name?: string | null;
  package?: string | null;
  package_name?: string | null;
  status: CodeStatus;
  computed_status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'USAGE_EXHAUSTED' | 'INACTIVE';
  redemption_count?: number;
  usage_remaining?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCampaign {
  id: string;
  organization: string;
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: string;
  max_discount?: string | null;
  minimum_order_amount?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  valid_from: string;
  valid_until?: string | null;
  status: CampaignStatus;
  computed_status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'USAGE_EXHAUSTED' | 'INACTIVE';
  usage_remaining?: number | null;
  configuration?: Record<string, any>;
  codes?: DiscountCode[];
  redemption_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DiscountRuleCondition {
  id: string;
  discount_eligibility_rule: string;
  condition_type: string;
  operator: ConditionOperator;
  numeric_value?: string | null;
  text_value?: string | null;
  boolean_value?: boolean | null;
  reference_type?: string | null;
  reference_id?: string | null;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface DiscountRuleAction {
  id: string;
  discount_eligibility_rule: string;
  action_type: ActionType;
  discount_campaign?: string | null;
  discount_code?: string | null;
  discount_percentage?: string | null;
  discount_amount?: string | null;
  maximum_discount?: string | null;
  message?: string | null;
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountEligibilityRule {
  id: string;
  organization: string;
  name: string;
  description?: string | null;
  rule_type: RuleType;
  source_package?: string | null;
  source_package_name?: string | null;
  source_package_version?: string | null;
  target_package?: string | null;
  target_package_name?: string | null;
  target_package_version?: string | null;
  branch?: string | null;
  branch_name?: string | null;
  priority: number;
  evaluation_mode: EvaluationMode;
  rule_behavior: string;
  valid_from: string;
  valid_until?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  created_by_user?: string | null;
  conditions: DiscountRuleCondition[];
  actions: DiscountRuleAction[];
  created_at: string;
  updated_at: string;
}

export interface DiscountRedemption {
  id: string;
  discount_code?: string | null;
  code_str?: string | null;
  campaign: string;
  campaign_name?: string | null;
  eligibility_rule?: string | null;
  user_profile: string;
  member_name?: string;
  order: string;
  discount_amount: string;
  eligibility_snapshot?: Record<string, any>;
  redeemed_at: string;
  created_at: string;
}

export interface CouponValidationResult {
  is_valid: boolean;
  reason?: string;
  code_id?: string;
  code?: string;
  campaign_id?: string;
  campaign_name?: string;
  discount_type?: DiscountType;
  discount_value?: string;
  discount_amount?: string;
  final_subtotal?: string;
}

export interface DynamicOffer {
  rule_id: string;
  rule_name: string;
  rule_type: RuleType;
  action_type: ActionType;
  message: string;
  discount_percentage?: string | null;
  discount_amount?: string | null;
  maximum_discount?: string | null;
  auto_apply: boolean;
  priority: number;
}
