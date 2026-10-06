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
  async getSummary(branchId?: string): Promise<CommerceSummary> {
    const params = branchId ? { branch_id: branchId } : {};
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
    date?: string;
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
    const res = await api.get<any>('/tenant/payment-transactions/cash-report/', { params });
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
