import { api } from '../client';
import {
  Membership,
  MembershipContractSnapshot,
  MembershipEntitlement,
  MembershipEntitlementLedger,
  MembershipFreeze,
  MembershipRenewalPolicy,
  MembershipChangePolicy,
  MembershipChangeRequest,
} from '../types/memberships';

export const membershipsApi = {
  // Memberships
  getMemberships: async (params?: {
    user_profile_id?: string;
    branch_id?: string;
    status?: string;
  }): Promise<Membership[]> => {
    const res = await api.get('/tenant/memberships/', { params });
    return res.data.results || res.data;
  },

  getMembership: async (id: string): Promise<Membership> => {
    const res = await api.get(`/tenant/memberships/${id}/`);
    return res.data;
  },

  activateMembership: async (data: {
    order_id: string;
    order_item_id: string;
    start_date?: string;
  }): Promise<Membership> => {
    const res = await api.post('/tenant/memberships/activate/', data);
    return res.data;
  },

  consumeEntitlement: async (
    membershipId: string,
    data: {
      entitlement_type: string;
      units: string;
      booking_id?: string;
      reason_text?: string;
    }
  ): Promise<MembershipEntitlementLedger> => {
    const res = await api.post(`/tenant/memberships/${membershipId}/consume-entitlement/`, data);
    return res.data;
  },

  reverseEntitlement: async (
    membershipId: string,
    data: {
      entitlement_type: string;
      units: string;
      booking_id?: string;
      reason_text?: string;
    }
  ): Promise<MembershipEntitlementLedger> => {
    const res = await api.post(`/tenant/memberships/${membershipId}/reverse-entitlement/`, data);
    return res.data;
  },

  applyFreeze: async (
    membershipId: string,
    data: {
      freeze_from: string;
      freeze_until: string;
      reason_text?: string;
    }
  ): Promise<MembershipFreeze> => {
    const res = await api.post(`/tenant/memberships/${membershipId}/freeze/`, data);
    return res.data;
  },

  getContract: async (membershipId: string): Promise<MembershipContractSnapshot> => {
    const res = await api.get(`/tenant/memberships/${membershipId}/contract/`);
    return res.data;
  },

  // Entitlements
  getEntitlements: async (params?: { membership_id?: string }): Promise<MembershipEntitlement[]> => {
    const res = await api.get('/tenant/membership-entitlements/', { params });
    return res.data.results || res.data;
  },

  // Ledger
  getLedger: async (params?: { entitlement_id?: string }): Promise<MembershipEntitlementLedger[]> => {
    const res = await api.get('/tenant/membership-entitlement-ledgers/', { params });
    return res.data.results || res.data;
  },

  // Freezes
  getFreezes: async (params?: { membership_id?: string }): Promise<MembershipFreeze[]> => {
    const res = await api.get('/tenant/membership-freezes/', { params });
    return res.data.results || res.data;
  },

  // Renewal & Change Policies
  getRenewalPolicies: async (params?: { package_id?: string }): Promise<MembershipRenewalPolicy[]> => {
    const res = await api.get('/tenant/membership-renewal-policies/', { params });
    return res.data.results || res.data;
  },

  getChangePolicies: async (): Promise<MembershipChangePolicy[]> => {
    const res = await api.get('/tenant/membership-change-policies/');
    return res.data.results || res.data;
  },

  getChangeRequests: async (params?: { membership_id?: string }): Promise<MembershipChangeRequest[]> => {
    const res = await api.get('/tenant/membership-change-requests/', { params });
    return res.data.results || res.data;
  },
};
