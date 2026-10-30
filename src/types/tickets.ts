export type TicketCategory =
  | 'PASSPORT_PURCHASE'
  | 'MEMBERSHIP_INQUIRY'
  | 'CLASS_BOOKING'
  | 'BILLING_PAYMENT'
  | 'GENERAL_INQUIRY';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  organization: string;
  branch?: string | null;
  branch_name?: string | null;
  user_profile: string;
  member_name: string;
  member_phone: string;
  member_email: string;
  member_number?: string | null;
  active_package_name?: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  resolution_notes?: string;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TicketMetrics {
  total_open: number;
  total_in_progress: number;
  resolved_today: number;
  passport_requests_pending: number;
  total_tickets: number;
}

export interface TicketQueryParams {
  status?: string;
  category?: string;
  priority?: string;
  branch_id?: string;
  search?: string;
  member_id?: string;
  page?: number;
  page_size?: number;
}

export interface CreateTicketPayload {
  user_profile: string;
  branch?: string | null;
  category: TicketCategory;
  priority?: TicketPriority;
  subject: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
  resolution_notes?: string;
}
