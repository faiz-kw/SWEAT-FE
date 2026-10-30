/**
 * POS Machine API Client (Point of Sale Hardware Integration)
 * Directly communicates with backend POS orchestrator.
 */

import { api } from '../client';

export interface POSTerminal {
  id: string;
  name: string;
  terminal_id: string;
  device_serial_no: string;
  model_name?: string;
  status: string;
  is_default: boolean;
  provider_code: string;
  provider_name: string;
  branch_id: string;
  branch_name: string;
}

export interface POSInitiateResponse {
  success: boolean;
  transaction_id: string;
  external_ref_id: string;
  status: string;
  amount: string;
  currency: string;
  terminal_name: string;
  terminal_id: string;
  error_message?: string;
}

export interface POSStatusResponse {
  external_ref_id: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT' | 'VOIDED';
  amount: string;
  currency: string;
  payment_mode?: string;
  rrn?: string;
  auth_code?: string;
  card_network?: string;
  card_last4?: string;
  order_status?: string;
  error_message?: string;
  is_completed: boolean;
}

export const posApi = {
  async getTerminals(branchId?: string): Promise<{ terminals: POSTerminal[] }> {
    const params: Record<string, string> = {};
    if (branchId && branchId !== 'all') {
      params['branch_id'] = branchId;
    }
    const response = await api.get<{ terminals: POSTerminal[] }>('/pos/terminals/', { params });
    return response.data as { terminals: POSTerminal[] };
  },

  async initiatePayment(orderId: string, terminalId?: string): Promise<POSInitiateResponse> {
    const response = await api.post<POSInitiateResponse>('/pos/initiate/', {
      order_id: orderId,
      terminal_id: terminalId,
    });
    return response.data as POSInitiateResponse;
  },

  async checkStatus(externalRefId: string): Promise<POSStatusResponse> {
    const response = await api.get<POSStatusResponse>(`/pos/status/${externalRefId}/`);
    return response.data as POSStatusResponse;
  },

  async cancelPayment(externalRefId: string, reason?: string): Promise<{ success: boolean; status: string }> {
    const response = await api.post<{ success: boolean; status: string }>(`/pos/cancel/${externalRefId}/`, { reason });
    return response.data as { success: boolean; status: string };
  },
};
