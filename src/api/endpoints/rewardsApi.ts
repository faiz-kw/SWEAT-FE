import { api } from '../client';
import {
  ReferralProgram,
  ReferralIdentifier,
  Referral,
  ReferralQualificationRule,
  ReferralBenefitRule,
  RewardAccount,
  RewardLedger,
  OrderRewardRedemption,
} from '../types/rewards';

export const rewardsApi = {
  // Referral Programs
  getPrograms: async (): Promise<ReferralProgram[]> => {
    const res = await api.get('/tenant/referral-programs/');
    return res.data.results || res.data;
  },

  createProgram: async (data: Partial<ReferralProgram>): Promise<ReferralProgram> => {
    const res = await api.post('/tenant/referral-programs/', data);
    return res.data;
  },

  // Referral Identifiers (Codes)
  getIdentifiers: async (params?: { owner_user_id?: string }): Promise<ReferralIdentifier[]> => {
    const res = await api.get('/tenant/referral-identifiers/', { params });
    return res.data.results || res.data;
  },

  generateIdentifier: async (data: {
    program_id: string;
    owner_user_id: string;
    identifier_type?: string;
    custom_code?: string;
  }): Promise<ReferralIdentifier> => {
    const res = await api.post('/tenant/referral-identifiers/generate/', data);
    return res.data;
  },

  // Referrals
  getReferrals: async (params?: { program_id?: string; status?: string }): Promise<Referral[]> => {
    const res = await api.get('/tenant/referrals/', { params });
    return res.data.results || res.data;
  },

  registerReferral: async (data: {
    identifier_value: string;
    referred_user_id?: string;
    referred_email?: string;
    referred_phone?: string;
    source?: string;
  }): Promise<Referral> => {
    const res = await api.post('/tenant/referrals/register/', data);
    return res.data;
  },

  qualifyReferral: async (referralId: string, data?: { event_type?: string; order_id?: string }): Promise<Referral> => {
    const res = await api.post(`/tenant/referrals/${referralId}/qualify/`, data || {});
    return res.data;
  },

  // Rules
  getQualificationRules: async (): Promise<ReferralQualificationRule[]> => {
    const res = await api.get('/tenant/referral-qualification-rules/');
    return res.data.results || res.data;
  },

  getBenefitRules: async (): Promise<ReferralBenefitRule[]> => {
    const res = await api.get('/tenant/referral-benefit-rules/');
    return res.data.results || res.data;
  },

  // Reward Accounts
  getRewardAccounts: async (params?: { user_profile_id?: string }): Promise<RewardAccount[]> => {
    const res = await api.get('/tenant/reward-accounts/', { params });
    return res.data.results || res.data;
  },

  // Reward Ledgers
  getRewardLedgers: async (params?: { user_profile_id?: string }): Promise<RewardLedger[]> => {
    const res = await api.get('/tenant/reward-ledgers/', { params });
    return res.data.results || res.data;
  },

  earnRewards: async (data: {
    user_profile_id: string;
    reward_type: string;
    quantity: string;
    reason_code?: string;
    reason?: string;
  }): Promise<RewardLedger> => {
    const res = await api.post('/tenant/reward-ledgers/earn/', data);
    return res.data;
  },

  redeemRewards: async (data: {
    user_profile_id: string;
    reward_type: string;
    quantity: string;
    reason_code?: string;
    reason?: string;
  }): Promise<RewardLedger> => {
    const res = await api.post('/tenant/reward-ledgers/redeem/', data);
    return res.data;
  },

  // Order Redemptions
  getOrderRedemptions: async (): Promise<OrderRewardRedemption[]> => {
    const res = await api.get('/tenant/order-reward-redemptions/');
    return res.data.results || res.data;
  },
};
