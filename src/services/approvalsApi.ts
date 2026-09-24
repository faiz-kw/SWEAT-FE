import { api } from './api';
import { ApprovalRequest, ApprovalAction } from '../types/approvals';

export const approvalsApi = {
  getRequests: async (params?: {
    status?: string;
    request_type?: string;
    requested_by_user_id?: string;
    entity_id?: string;
    entity_type?: string;
  }): Promise<ApprovalRequest[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.request_type) query.append('request_type', params.request_type);
    if (params?.requested_by_user_id) query.append('requested_by_user_id', params.requested_by_user_id);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await api.get<any>(`/tenant/approval-requests/${queryString}`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  },

  getApprovalRequests: async (params?: {
    status?: string;
    request_type?: string;
    requested_by_user_id?: string;
    entity_id?: string;
    entity_type?: string;
  }): Promise<ApprovalRequest[]> => {
    return approvalsApi.getRequests(params);
  },

  getRequest: async (id: string): Promise<ApprovalRequest> => {
    const res = await api.get<ApprovalRequest>(`/tenant/approval-requests/${id}/`);
    return res.data;
  },

  createRequest: async (data: {
    request_type: string;
    entity_type: string;
    entity_id: string;
    requested_payload?: Record<string, any>;
    required_approvals?: number;
  }): Promise<ApprovalRequest> => {
    const res = await api.post<ApprovalRequest>('/tenant/approval-requests/', data);
    return res.data;
  },

  actOnRequest: async (
    requestId: string,
    data: {
      action: 'APPROVED' | 'REJECTED';
      comment?: string;
      allow_self_approval?: boolean;
    }
  ): Promise<ApprovalAction> => {
    const res = await api.post<ApprovalAction>(`/tenant/approval-requests/${requestId}/act/`, data);
    return res.data;
  },

  submitDecision: async (
    requestId: string,
    data: {
      action: 'APPROVED' | 'REJECTED';
      comment?: string;
      allow_self_approval?: boolean;
    }
  ): Promise<ApprovalAction> => {
    return approvalsApi.actOnRequest(requestId, data);
  },

  getActions: async (): Promise<ApprovalAction[]> => {
    const res = await api.get<any>('/tenant/approval-actions/');
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  },

  getApprovalActions: async (): Promise<ApprovalAction[]> => {
    return approvalsApi.getActions();
  },
};
