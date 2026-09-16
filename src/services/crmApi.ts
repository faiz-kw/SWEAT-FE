/**
 * src/services/crmApi.ts — API Client for Layer 2 Module B: CRM, Leads & Trials
 */

import { api } from './api';
import type { Lead, LeadSource, LeadStatusHistory, TrialBooking, SalesFollowupTask, LeadStatus } from '@/types/crm';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const crmApi = {
  getLeads: async (params?: { current_status?: string; search?: string; branch_id?: string }): Promise<Lead[]> => {
    const query = new URLSearchParams();
    if (params?.current_status && params.current_status !== 'ALL') {
      query.append('current_status', params.current_status);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    if (params?.branch_id) {
      query.append('branch_id', params.branch_id);
    }
    const qStr = query.toString();
    const endpoint = `/tenant/leads/${qStr ? `?${qStr}` : ''}`;
    const res = await api.get<PaginatedResponse<Lead> | Lead[]>(endpoint);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getLead: async (id: string): Promise<Lead> => {
    const res = await api.get<Lead>(`/tenant/leads/${id}/`);
    return res.data;
  },

  createLead: async (payload: {
    first_name: string;
    last_name: string;
    phone_normalized?: string;
    email_normalized?: string;
    company_name?: string;
    lead_source?: string;
    branch?: string;
  }): Promise<Lead> => {
    const res = await api.post<Lead>('/tenant/leads/', payload);
    return res.data;
  },

  transitionStatus: async (
    leadId: string,
    payload: { new_status: LeadStatus; reason_code?: string; reason_text?: string }
  ): Promise<Lead> => {
    const res = await api.post<Lead>(`/tenant/leads/${leadId}/transition-status/`, payload);
    return res.data;
  },

  bookTrial: async (
    leadId: string,
    payload: {
      branch_id: string;
      scheduled_start: string;
      scheduled_end: string;
      assigned_trainer_profile_id?: string;
      trial_type?: string;
    }
  ): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/leads/${leadId}/book-trial/`, payload);
    return res.data;
  },

  getLeadSources: async (): Promise<LeadSource[]> => {
    const res = await api.get<PaginatedResponse<LeadSource> | LeadSource[]>('/tenant/lead-sources/');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getTrialBookings: async (params?: { status?: string; branch_id?: string }): Promise<TrialBooking[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    const qStr = query.toString();
    const res = await api.get<PaginatedResponse<TrialBooking> | TrialBooking[]>(
      `/tenant/trial-bookings/${qStr ? `?${qStr}` : ''}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getFollowupTasks: async (leadId?: string): Promise<SalesFollowupTask[]> => {
    const qStr = leadId ? `?lead_id=${leadId}` : '';
    const res = await api.get<PaginatedResponse<SalesFollowupTask> | SalesFollowupTask[]>(
      `/tenant/sales-followup-tasks/${qStr}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },
};
