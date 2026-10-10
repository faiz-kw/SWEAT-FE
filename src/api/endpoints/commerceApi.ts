/**
 * Layer 2 Phase 6 API Service: Module G (Commerce, Payments & Billing)
 * Zero mock data fallback — all responses come directly from authenticated tenant APIs.
 */

import { api } from '../client';
import {
  Order,
  OrderItem,
  PaymentTransaction,
  Refund,
  MemberInvoice,
  PaymentLink,
  CommerceSummary,
} from '../types/commerce';

export const commerceApi = {
  // --- Summary ---
  async getSummary(
    filters?:
      | string
      | {
          branch_id?: string;
          branch_ids?: string[];
          program_ids?: string[];
          package_ids?: string[];
          sales_user_ids?: string[];
          trainer_ids?: string[];
          date_from?: string;
          date_to?: string;
        }
  ): Promise<CommerceSummary> {
    let params: Record<string, string> = {};
    if (typeof filters === 'string') {
      if (filters && filters !== 'all') params.branch_id = filters;
    } else if (filters) {
      if (filters.branch_id && filters.branch_id !== 'all') params.branch_id = filters.branch_id;
      if (filters.branch_ids?.length) params.branch_ids = filters.branch_ids.join(',');
      if (filters.program_ids?.length) params.program_ids = filters.program_ids.join(',');
      if (filters.package_ids?.length) params.package_ids = filters.package_ids.join(',');
      if (filters.sales_user_ids?.length) params.sales_user_ids = filters.sales_user_ids.join(',');
      if (filters.trainer_ids?.length) params.trainer_ids = filters.trainer_ids.join(',');
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
    }
    const res = await api.get<CommerceSummary>('/tenant/orders/summary/', { params });
    return res.data;
  },

  // --- Orders ---
  async getOrders(filters?: {
    branch_id?: string;
    user_profile_id?: string;
    lead_id?: string;
    status?: string;
    search?: string;
  }): Promise<Order[]> {
    const res = await api.get<any>('/tenant/orders/', { params: filters });
    return res.data?.results || res.data || [];
  },

  async createOrder(data: Partial<Order> & { items_data?: any[] }): Promise<Order> {
    const res = await api.post<Order>('/tenant/orders/', data);
    return res.data;
  },

  async recordPayment(
    orderId: string,
    paymentData: {
      amount: string | number;
      provider?: string;
      payment_method?: string;
      provider_transaction_id?: string;
      idempotency_key?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ payment: PaymentTransaction; invoice?: MemberInvoice }> {
    const res = await api.post<any>(`/tenant/orders/${orderId}/record-payment/`, paymentData);
    return res.data;
  },

  async createPaymentLink(
    orderId: string,
    options?: { expiry_hours?: number; provider?: string }
  ): Promise<PaymentLink> {
    const res = await api.post<PaymentLink>(
      `/tenant/orders/${orderId}/create-payment-link/`,
      options || {}
    );
    return res.data;
  },

  // --- Transactions ---
  async getTransactions(filters?: {
    order_id?: string;
    branch_id?: string;
    provider?: string;
    status?: string;
    search?: string;
  } | string): Promise<PaymentTransaction[]> {
    const params = typeof filters === 'string' ? { order_id: filters } : (filters || {});
    const res = await api.get<any>('/tenant/payment-transactions/', { params });
    return res.data?.results || res.data || [];
  },

  async processRefund(
    transactionId: string,
    data: { amount: string | number; reason_text?: string; reason_code?: string; provider_reference?: string }
  ): Promise<Refund> {
    const res = await api.post<Refund>(`/tenant/payment-transactions/${transactionId}/refund/`, data);
    return res.data;
  },

  // --- Cash Report ---
  async getCashReport(params?: {
    branch_id?: string;
    branch_ids?: string[] | string;
    date?: string;
    date_from?: string;
    date_to?: string;
    agent_id?: string;
    status?: string;
    search?: string;
  }): Promise<{
    branch_id: string | null;
    branch_name: string;
    date: string;
    total_transactions: number;
    total_physical_cash_recorded: string;
    approved_cash: string;
    pending_approval_cash: string;
    rejected_cash: string;
    agent_collections: Array<{
      agent_id: string;
      agent_name: string;
      physical_cash: string;
      approved_cash: string;
      pending_cash: string;
      rejected_cash: string;
      count: number;
    }>;
    transactions: PaymentTransaction[];
  }> {
    const queryParams: Record<string, string> = {};
    if (params) {
      if (params.branch_id) queryParams.branch_id = params.branch_id;
      if (Array.isArray(params.branch_ids) && params.branch_ids.length > 0) {
        queryParams.branch_ids = params.branch_ids.join(',');
      } else if (typeof params.branch_ids === 'string' && params.branch_ids) {
        queryParams.branch_ids = params.branch_ids;
      }
      if (params.date) queryParams.date = params.date;
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.agent_id) queryParams.agent_id = params.agent_id;
      if (params.status) queryParams.status = params.status;
      if (params.search) queryParams.search = params.search;
    }
    const res = await api.get<any>('/tenant/payment-transactions/cash-report/', { params: queryParams });
    return res.data;
  },

  // --- Invoices ---
  async getInvoices(filters?: { user_profile_id?: string; branch_id?: string }): Promise<MemberInvoice[]> {
    const res = await api.get<any>('/tenant/member-invoices/', { params: filters });
    return res.data?.results || res.data || [];
  },

  // --- Refunds ---
  async getRefunds(filters?: { branch_id?: string; status?: string; search?: string }): Promise<Refund[]> {
    const res = await api.get<any>('/tenant/refunds/', { params: filters });
    return res.data?.results || res.data || [];
  },
};
