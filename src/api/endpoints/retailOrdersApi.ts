/**
 * retailOrdersApi.ts — API Service Layer for Retail Orders, Reservations & Fulfillment
 * Communicates with /api/v1/tenant/retail-orders/
 * Zero mock fallback: reflects real server-side state.
 */

import { api } from '../client';

export interface RetailOrderItem {
  id: string;
  product?: string | null;
  product_name_snapshot: string;
  sku_snapshot?: string;
  unit_price: string | number;
  quantity: number;
  tax_rate?: string | number;
  tax_amount?: string | number;
  discount_amount?: string | number;
  total_price: string | number;
}

export interface RetailOrder {
  id: string;
  order_number: string;
  user_profile?: string | null;
  user_profile_name?: string;
  user_profile_phone?: string;
  user_profile_email?: string;
  branch?: string | null;
  branch_name?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | string;
  fulfillment_status: 'UNFULFILLED' | 'READY_FOR_PICKUP' | 'FULFILLED' | 'CANCELLED' | string;
  fulfilled_at?: string | null;
  fulfilled_by_user?: string | null;
  fulfilled_by_name?: string | null;
  subtotal_amount: string | number;
  tax_amount: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  currency: string;
  order_source: string;
  order_type: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  items: RetailOrderItem[];
  payments?: any[];
}

export interface RetailOrderFilters {
  branch?: string;
  status?: string;
  fulfillment_status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}

export const retailOrdersApi = {
  /**
   * List all retail orders for the current tenant with optional filters
   */
  async getRetailOrders(filters?: RetailOrderFilters): Promise<RetailOrder[]> {
    const params: Record<string, string> = {};
    if (filters?.branch && filters.branch !== 'all') params.branch = filters.branch;
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    if (filters?.fulfillment_status && filters.fulfillment_status !== 'all') {
      params.fulfillment_status = filters.fulfillment_status;
    }
    if (filters?.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.page) params.page = String(filters.page);

    const res = await api.get<any>('/tenant/retail-orders/', { params });
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  /**
   * Retrieve retail order details including full item snapshots and payment records
   */
  async getRetailOrder(id: string): Promise<RetailOrder> {
    const res = await api.get<RetailOrder>(`/tenant/retail-orders/${id}/`);
    return res.data;
  },

  /**
   * Update fulfillment status (READY_FOR_PICKUP or FULFILLED)
   */
  async fulfillOrder(
    id: string,
    fulfillmentStatus: 'READY_FOR_PICKUP' | 'FULFILLED',
    notes?: string
  ): Promise<RetailOrder> {
    const res = await api.post<RetailOrder>(`/tenant/retail-orders/${id}/fulfill/`, {
      fulfillment_status: fulfillmentStatus,
      notes,
    });
    return res.data;
  },

  /**
   * Create a new retail order and reserve stock
   */
  async createRetailOrder(payload: {
    user_profile_id: string;
    branch_id: string;
    items: { product_id: string; quantity: number }[];
    notes?: string;
    source?: string;
  }): Promise<RetailOrder> {
    const res = await api.post<RetailOrder>('/tenant/retail-orders/', payload);
    return res.data;
  },

  /**
   * Confirm payment with Razorpay verification
   */
  async confirmPayment(
    id: string,
    payload: {
      razorpay_payment_id: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      is_sandbox_simulation?: boolean;
    }
  ): Promise<any> {
    const res = await api.post<any>(`/tenant/retail-orders/${id}/confirm-payment/`, payload);
    return res.data;
  },

  /**
   * Cancel retail order and release held reservations
   */
  async cancelOrder(id: string, reason?: string): Promise<any> {
    const res = await api.post<any>(`/tenant/retail-orders/${id}/cancel/`, { reason });
    return res.data;
  },
};
