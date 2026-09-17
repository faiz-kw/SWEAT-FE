import { api } from './api';
import {
  DiscountCampaign,
  DiscountCode,
  DiscountEligibilityRule,
  DiscountRuleCondition,
  DiscountRuleAction,
  DiscountRedemption,
  CouponValidationResult,
  DynamicOffer,
} from '../types/discounts';

export const discountsApi = {
  // Campaigns
  getCampaigns: async (params?: { status?: string }): Promise<DiscountCampaign[]> => {
    const res = await api.get('/tenant/discount-campaigns/', { params });
    return res.data.results || res.data;
  },

  getCampaign: async (id: string): Promise<DiscountCampaign> => {
    const res = await api.get(`/tenant/discount-campaigns/${id}/`);
    return res.data;
  },

  createCampaign: async (data: Partial<DiscountCampaign>): Promise<DiscountCampaign> => {
    const res = await api.post('/tenant/discount-campaigns/', data);
    return res.data;
  },

  updateCampaign: async (id: string, data: Partial<DiscountCampaign>): Promise<DiscountCampaign> => {
    const res = await api.patch(`/tenant/discount-campaigns/${id}/`, data);
    return res.data;
  },

  generateCode: async (
    campaignId: string,
    data: { code?: string; branch_id?: string; package_id?: string }
  ): Promise<DiscountCode> => {
    const res = await api.post(`/tenant/discount-campaigns/${campaignId}/generate-code/`, data);
    return res.data;
  },

  validateCoupon: async (data: {
    code: string;
    user_profile_id: string;
    order_subtotal: string;
    branch_id?: string;
    package_id?: string;
  }): Promise<CouponValidationResult> => {
    const res = await api.post('/tenant/discount-campaigns/validate-coupon/', data);
    return res.data;
  },

  evaluateOffers: async (data: {
    user_profile_id: string;
    branch_id?: string;
    target_package_id?: string;
    current_package_id?: string;
    sessions_consumed?: number;
    sessions_remaining?: number;
    usage_percentage?: number;
    package_age_days?: number;
  }): Promise<{ offers: DynamicOffer[]; count: number }> => {
    const res = await api.post('/tenant/discount-campaigns/evaluate-offers/', data);
    return res.data;
  },

  // Codes
  getCodes: async (params?: { campaign_id?: string }): Promise<DiscountCode[]> => {
    const res = await api.get('/tenant/discount-codes/', { params });
    return res.data.results || res.data;
  },

  // Eligibility Rules
  getEligibilityRules: async (): Promise<DiscountEligibilityRule[]> => {
    const res = await api.get('/tenant/discount-eligibility-rules/');
    return res.data.results || res.data;
  },

  createEligibilityRule: async (data: Partial<DiscountEligibilityRule>): Promise<DiscountEligibilityRule> => {
    const res = await api.post('/tenant/discount-eligibility-rules/', data);
    return res.data;
  },

  addRuleCondition: async (ruleId: string, data: Partial<DiscountRuleCondition>): Promise<DiscountRuleCondition> => {
    const res = await api.post(`/tenant/discount-eligibility-rules/${ruleId}/add-condition/`, data);
    return res.data;
  },

  addRuleAction: async (ruleId: string, data: Partial<DiscountRuleAction>): Promise<DiscountRuleAction> => {
    const res = await api.post(`/tenant/discount-eligibility-rules/${ruleId}/add-action/`, data);
    return res.data;
  },

  // Redemptions
  getRedemptions: async (params?: { campaign_id?: string; order_id?: string }): Promise<DiscountRedemption[]> => {
    const res = await api.get('/tenant/discount-redemptions/', { params });
    return res.data.results || res.data;
  },

  redeemCoupon: async (data: {
    code: string;
    order_id: string;
    user_profile_id: string;
  }): Promise<DiscountRedemption> => {
    const res = await api.post('/tenant/discount-redemptions/redeem/', data);
    return res.data;
  },
};
