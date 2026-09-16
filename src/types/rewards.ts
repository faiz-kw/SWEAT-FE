export interface ReferralProgram {
  id: string;
  organization: string;
  code: string;
  name: string;
  description?: string;
  valid_from: string;
  valid_until?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  configuration?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReferralIdentifier {
  id: string;
  organization: string;
  owner_user: string;
  owner_email?: string;
  referral_program?: string;
  identifier_type: 'MEMBER_REFERRAL_CODE' | 'TRAINER_CODE' | 'EMPLOYEE_CODE' | 'SALES_CODE';
  identifier_value: string;
  source_profile_type: 'MEMBER' | 'TRAINER' | 'EMPLOYEE' | 'SALES';
  source_profile_id?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  valid_from: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export type ReferralStatus =
  | 'INVITED'
  | 'REGISTERED'
  | 'QUALIFIED'
  | 'REWARDED'
  | 'REJECTED'
  | 'EXPIRED';

export interface Referral {
  id: string;
  referral_program: string;
  program_name?: string;
  referral_identifier: string;
  referrer_user: string;
  referrer_email?: string;
  referred_user?: string;
  referred_user_email?: string;
  identifier_used: string;
  referrer_type: 'MEMBER' | 'TRAINER' | 'EMPLOYEE' | 'SALES';
  referral_context: 'FRIEND' | 'MEMBER' | 'TRAINER' | 'EMPLOYEE' | 'SALES';
  referred_email?: string;
  referred_phone?: string;
  source: 'MOBILE_APP' | 'WEB' | 'FRONT_DESK' | 'QR' | 'LINK' | 'MANUAL' | 'CAMPAIGN';
  status: ReferralStatus;
  registered_at?: string;
  qualified_at?: string;
  rewarded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralQualificationRule {
  id: string;
  referral_program: string;
  qualification_event:
    | 'REGISTRATION'
    | 'FIRST_PURCHASE'
    | 'PAYMENT_SUCCESS'
    | 'MEMBERSHIP_ACTIVATED'
    | 'FIRST_CLASS_ATTENDED'
    | 'CUSTOM';
  minimum_order_amount?: string;
  package?: string;
  package_version?: string;
  branch?: string;
  valid_from: string;
  valid_until?: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface ReferralBenefitRule {
  id: string;
  referral_program: string;
  referrer_type: 'MEMBER' | 'TRAINER' | 'EMPLOYEE' | 'SALES' | 'ANY';
  beneficiary: 'REFERRER' | 'REFEREE' | 'BOTH';
  benefit_type:
    | 'PERCENTAGE_DISCOUNT'
    | 'FIXED_DISCOUNT'
    | 'POINTS'
    | 'CREDIT'
    | 'COUPON'
    | 'FREE_SESSION'
    | 'INCENTIVE';
  benefit_value: string;
  max_discount?: string;
  minimum_order_amount?: string;
  package?: string;
  branch?: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface RewardAccount {
  id: string;
  user_profile: string;
  user_name?: string;
  member_number?: string;
  points_balance: string;
  credit_balance: string;
  lifetime_earned: string;
  lifetime_redeemed: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface RewardLedger {
  id: string;
  reward_account: string;
  user_profile: string;
  user_name?: string;
  transaction_type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'REVERSAL' | 'ADJUSTMENT';
  reward_type: 'POINTS' | 'CREDIT' | 'COUPON' | 'FREE_SESSION' | 'INCENTIVE';
  quantity: string;
  referral?: string;
  order?: string;
  membership?: string;
  reason_code?: string;
  reason?: string;
  balance_after: string;
  expires_at?: string;
  created_at: string;
}

export interface OrderRewardRedemption {
  id: string;
  order: string;
  reward_account: string;
  reward_ledger: string;
  reward_type: string;
  units_redeemed: string;
  monetary_value: string;
  created_at: string;
}
