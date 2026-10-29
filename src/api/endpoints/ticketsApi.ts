import { api } from '../client';
import type {
  SupportTicket,
  TicketMetrics,
  TicketQueryParams,
  CreateTicketPayload,
  UpdateTicketPayload,
} from '@/types/tickets';

export const ticketsApi = {
  async getTickets(params?: TicketQueryParams): Promise<{ results: SupportTicket[]; count: number }> {
    const res = await api.get<any>('/tenant/tickets/', { params });
    const data = res.data;
    if (Array.isArray(data)) {
      return { results: data, count: data.length };
    }
    return {
      results: data?.results || [],
      count: data?.count || (data?.results ? data.results.length : 0),
    };
  },

  async getTicket(id: string): Promise<SupportTicket> {
    const res = await api.get<SupportTicket>(`/tenant/tickets/${id}/`);
    return res.data;
  },

  async createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
    const res = await api.post<SupportTicket>('/tenant/tickets/', payload);
    return res.data;
  },

  async updateTicket(id: string, payload: UpdateTicketPayload): Promise<SupportTicket> {
    const res = await api.patch<SupportTicket>(`/tenant/tickets/${id}/`, payload);
    return res.data;
  },

  async resolveTicket(id: string, resolution_notes?: string): Promise<SupportTicket> {
    const res = await api.post<SupportTicket>(`/tenant/tickets/${id}/resolve/`, { resolution_notes });
    return res.data;
  },

  async deleteTicket(id: string): Promise<void> {
    await api.delete(`/tenant/tickets/${id}/`);
  },

  async getMetrics(): Promise<TicketMetrics> {
    const res = await api.get<TicketMetrics>('/tenant/tickets/metrics/');
    return res.data;
  },
};
