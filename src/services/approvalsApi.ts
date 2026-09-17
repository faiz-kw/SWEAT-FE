import { api } from './api';
import { ApprovalRequest, ApprovalAction } from '../types/approvals';

export const approvalsApi = {
  getRequests: async (params?: {
    status?: string;
    request_type?: string;
  }): Promise<ApprovalRequest[]> => {
    const res = await api.get('/tenant/approval-requests/', { params });
    return res.data.results || res.data;
  },

  getRequest: async (id: string): Promise<ApprovalRequest> => {
    const res = await api.get(`/tenant/approval-requests/${id}/`);
    return res.data;
  },

  createRequest: async (data: {
    request_type: string;
    entity_type: string;
    entity_id: string;
    requested_payload?: Record<string, any>;
    required_approvals?: number;
  }): Promise<ApprovalRequest> => {
    const res = await api.post('/tenant/approval-requests/', data);
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
    const res = await api.post(`/tenant/approval-requests/${requestId}/act/`, data);
    return res.data;
  },

  getActions: async (): Promise<ApprovalAction[]> => {
    const res = await api.get('/tenant/approval-actions/');
    return res.data.results || res.data;
  },
};
