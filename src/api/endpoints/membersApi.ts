/**
 * src/api/endpoints/membersApi.ts — Dedicated API Service for Members, Member 360, Passbook, Finance & Lifecycle Actions
 * Connects directly to backend tenant REST APIs. Zero mock business data.
 */

import { api } from '../client';
import type {
  Member,
  MemberDirectoryResponse,
  Member360Data,
  TimelineEvent,
  AvailableAction,
} from '@/types/members';

export interface MemberFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  location?: string;
  branch_id?: string;
  status?: string;
  program_id?: string;
  package_id?: string;
  quick_view?: 'all' | 'active' | 'expiring_soon' | 'expired' | 'frozen' | 'outstanding';
  format?: 'flat' | 'paginated';
}

export const membersApi = {
  /**
   * Fetch paginated and filtered member directory.
   */
  async getMembers(params?: MemberFilterParams): Promise<MemberDirectoryResponse> {
    const res = await api.get<any>('/tenant/members/', { params });
    if (Array.isArray(res.data)) {
      return {
        count: res.data.length,
        page: params?.page || 1,
        page_size: params?.page_size || res.data.length || 20,
        total_pages: 1,
        results: res.data,
      };
    }
    return {
      count: res.data?.count || 0,
      page: res.data?.page || 1,
      page_size: res.data?.page_size || 20,
      total_pages: res.data?.total_pages || 1,
      results: res.data?.results || [],
    };
  },

  /**
   * Fetch single member basic details.
   */
  async getMember(id: string): Promise<Member> {
    const res = await api.get<Member>(`/tenant/members/${id}/`);
    return res.data;
  },

  /**
   * Fetch complete 6-section authoritative Member 360 aggregate.
   */
  async getMember360(id: string): Promise<Member360Data> {
    const res = await api.get<Member360Data>(`/tenant/members/${id}/360/`);
    return res.data;
  },

  /**
   * Fetch unified chronological timeline.
   */
  async getMemberTimeline(id: string, limit: number = 100): Promise<TimelineEvent[]> {
    const res = await api.get<any>(`/tenant/members/${id}/timeline/`, { params: { limit } });
    return res.data?.results || res.data || [];
  },

  /**
   * Fetch backend-authoritative available actions.
   */
  async getAvailableActions(id: string): Promise<AvailableAction[]> {
    const res = await api.get<any>(`/tenant/members/${id}/available-actions/`);
    return res.data?.available_actions || [];
  },

  /**
   * Create new member (optionally linking from lead).
   */
  async createMember(data: {
    name: string;
    phone?: string;
    email?: string;
    gender?: string;
    status?: string;
    locationId?: string;
    emergencyContact?: string;
    fromLeadId?: string;
  }): Promise<Member> {
    const res = await api.post<Member>('/tenant/members/', data);
    return res.data;
  },

  /**
   * Update member profile.
   */
  async updateMember(id: string, data: Partial<Member>): Promise<Member> {
    const res = await api.patch<Member>(`/tenant/members/${id}/`, data);
    return res.data;
  },

  // --------------------------------------------------------------------------
  // LIFECYCLE ACTION ENDPOINTS
  // --------------------------------------------------------------------------

  async renewMembership(id: string, data: { months: number; reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/renew/`, data);
    return res.data;
  },

  async upgradeMembership(id: string, data: { package_id: string; package_version_id?: string; reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/upgrade/`, data);
    return res.data;
  },

  async extendMembership(id: string, data: { days: number; reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/extend/`, data);
    return res.data;
  },

  async freezeMembership(id: string, data: { freeze_from: string; freeze_until: string; reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/freeze/`, data);
    return res.data;
  },

  async unfreezeMembership(id: string, data?: { reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/unfreeze/`, data || {});
    return res.data;
  },

  async transferBranch(id: string, data: { branch_id: string; reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/transfer/`, data);
    return res.data;
  },

  async cancelMembership(id: string, data?: { reason?: string }): Promise<{ success: boolean; message: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/cancel/`, data || {});
    return res.data;
  },

  async rejoinMember(id: string, data: {
    package_id: string;
    package_version_id?: string;
    branch_id?: string;
    payment_amount?: number;
    payment_provider?: string;
    payment_method?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; membership_id: string; order_id: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/rejoin/`, data);
    return res.data;
  },

  async adjustEntitlement(id: string, data: {
    entitlement_type: string;
    units_delta: number;
    reason_code?: string;
    reason_text?: string;
  }): Promise<{ success: boolean; message: string; balance_after: number | null; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/adjust-entitlement/`, data);
    return res.data;
  },

  async collectOutstanding(id: string, data: {
    order_id?: string;
    amount?: number | string;
    provider?: string;
    payment_method?: string;
    idempotency_key?: string;
  }): Promise<{ success: boolean; message: string; transaction_id: string; invoice_id?: string; member: Member }> {
    const res = await api.post<any>(`/tenant/members/${id}/collect-outstanding/`, data);
    return res.data;
  },

  async checkInMember(id: string, data?: { branch_id?: string; method?: string }): Promise<any> {
    const res = await api.post<any>(`/tenant/members/${id}/check-in/`, data || {});
    return res.data;
  },

  async getPaymentMethods(): Promise<Array<{ id: string; label: string; provider: string; category: string }>> {
    const res = await api.get<{ payment_methods: Array<{ id: string; label: string; provider: string; category: string }> }>('/tenant/members/payment-methods/');
    return res.data?.payment_methods || [];
  },

  async getPlans(): Promise<any[]> {
    const res = await api.get<any[]>('/tenant/members/plans/');
    return res.data || [];
  },
};

