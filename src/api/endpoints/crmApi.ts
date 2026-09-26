/**
 * src/services/crmApi.ts — API Client for Layer 2 Module B: CRM, Leads & Trials
 */

import { api } from '../client';
import type {
  Lead,
  LeadSource,
  LeadStatusHistory,
  TrialBooking,
  TrialSlot,
  TrialSummaryCounts,
  TrialReminderSchedulePoint,
  BookTrialPayload,
  RescheduleTrialPayload,
  TrialConfirmationChannel,
  SalesFollowupTask,
  LeadStatus,
  LeadMetadata,
  EligibleAgent,
  ReferrerOption,
  DuplicateCheckResult,
  CreateLeadPayload,
  CRMStageSlaPolicy,
  CRMTrialReminderPolicy,
  CRMCommunicationChannel,
  NotificationTemplateItem,
  LeadAttribution,
  LeadTimelineEvent,
  LeadNote,
  LeadActivity,
  WorkQueueCounts,
  CreateActivityPayload,
  CreateFollowupPayload,
  CommunicationMessage,
  SendCommunicationPayload,
  AutomationWorkflow,
  AutomationWorkflowVersion,
  AutomationExecution,
  AutomationMetadata,
  AttentionQueueResponse,
  AttentionQueueMetrics,
  LeadAttentionFull,
  CRMAttentionPolicy,
  CRMAgentAssignmentConfig,
} from '@/types/crm';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface InAppNotification {
  id: string;
  organization: string;
  user: string;
  notification_type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  deep_link?: string;
  is_read: boolean;
  read_at?: string;
  idempotency_key?: string;
  created_at: string;
}

export const crmApi = {
  getLeads: async (params?: {
    current_status?: string;
    search?: string;
    branch_id?: string;
    lead_source_id?: string;
    campaign?: string;
    platform?: string;
    sla_status?: string;
    program_id?: string;
    assigned_sales_user_id?: string;
    assigned_to_me?: boolean;
    unassigned?: boolean;
  }): Promise<Lead[]> => {
    const query = new URLSearchParams();
    if (params?.assigned_to_me) {
      query.append('assigned_to_me', 'true');
    }
    if (params?.unassigned) {
      query.append('unassigned', 'true');
    }
    if (params?.current_status && params.current_status !== 'ALL') {
      query.append('current_status', params.current_status);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    if (params?.branch_id) {
      query.append('branch_id', params.branch_id);
    }
    if (params?.lead_source_id) {
      query.append('lead_source_id', params.lead_source_id);
    }
    if (params?.campaign) {
      query.append('campaign', params.campaign);
    }
    if (params?.platform) {
      query.append('platform', params.platform);
    }
    if (params?.sla_status) {
      query.append('sla_status', params.sla_status);
    }
    if (params?.program_id) {
      query.append('program_id', params.program_id);
    }
    if (params?.assigned_sales_user_id) {
      query.append('assigned_sales_user_id', params.assigned_sales_user_id);
    }
    const qStr = query.toString();
    const endpoint = `/tenant/leads/${qStr ? `?${qStr}` : ''}`;
    const res = await api.get<PaginatedResponse<Lead> | Lead[]>(endpoint);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getLeadTimeline: async (leadId: string, limit = 50): Promise<LeadTimelineEvent[]> => {
    const res = await api.get<LeadTimelineEvent[]>(`/tenant/leads/${leadId}/timeline/?limit=${limit}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getLeadAttributions: async (leadId: string): Promise<LeadAttribution[]> => {
    const res = await api.get<LeadAttribution[]>(`/tenant/leads/${leadId}/attributions/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  createLeadAttribution: async (leadId: string, payload: Partial<LeadAttribution>): Promise<LeadAttribution> => {
    const res = await api.post<LeadAttribution>(`/tenant/leads/${leadId}/attributions/`, payload);
    return res.data;
  },

  getLead: async (id: string): Promise<Lead> => {
    const res = await api.get<Lead>(`/tenant/leads/${id}/`);
    return res.data;
  },

  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const res = await api.post<Lead>('/tenant/leads/', payload);
    return res.data;
  },

  updateLead: async (leadId: string, payload: Partial<CreateLeadPayload>): Promise<Lead> => {
    const res = await api.patch<Lead>(`/tenant/leads/${leadId}/`, payload);
    return res.data;
  },

  getMetadata: async (): Promise<LeadMetadata> => {
    const res = await api.get<LeadMetadata>('/tenant/leads/metadata/');
    return res.data;
  },

  getEligibleAgents: async (branchId?: string, includeUnavailable: boolean = true): Promise<EligibleAgent[]> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    if (includeUnavailable) params.append('include_unavailable', 'true');
    const qStr = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<EligibleAgent[]>(`/tenant/leads/eligible-agents/${qStr}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  searchReferrers: async (query: string): Promise<ReferrerOption[]> => {
    if (!query || query.length < 2) return [];
    const res = await api.get<ReferrerOption[]>(`/tenant/leads/search-referrers/?query=${encodeURIComponent(query)}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  checkDuplicates: async (payload: { phone?: string; email?: string; exclude_id?: string }): Promise<DuplicateCheckResult> => {
    const res = await api.post<DuplicateCheckResult>('/tenant/leads/check-duplicates/', payload);
    return res.data;
  },

  getBranches: async (): Promise<Array<{ id: string; name: string; code?: string }>> => {
    const res = await api.get<any>('/tenant/branches/');
    return res.data?.results || res.data || [];
  },

  getPrograms: async (branchId?: string): Promise<Array<{ id: string; name: string; code?: string }>> => {
    const params = new URLSearchParams();
    params.append('status', 'ACTIVE');
    if (branchId) params.append('branch_id', branchId);
    const res = await api.get<any>(`/tenant/programs/?${params.toString()}`);
    return res.data?.results || res.data || [];
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

  getLeadSources: async (params?: { active_only?: boolean; status?: string }): Promise<LeadSource[]> => {
    const query = new URLSearchParams();
    if (params?.active_only) query.append('active_only', 'true');
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString();
    const res = await api.get<PaginatedResponse<LeadSource> | LeadSource[]>(
      `/tenant/lead-sources/${qStr ? `?${qStr}` : ''}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  createLeadSource: async (payload: { name: string; source_type: string; code?: string; status?: string }): Promise<LeadSource> => {
    const res = await api.post<LeadSource>('/tenant/lead-sources/', payload);
    return res.data;
  },

  updateLeadSource: async (id: string, payload: Partial<{ name: string; source_type: string; status: 'ACTIVE' | 'INACTIVE' }>): Promise<LeadSource> => {
    const res = await api.patch<LeadSource>(`/tenant/lead-sources/${id}/`, payload);
    return res.data;
  },

  getSlaPolicies: async (): Promise<CRMStageSlaPolicy[]> => {
    const res = await api.get<PaginatedResponse<CRMStageSlaPolicy> | CRMStageSlaPolicy[]>('/tenant/crm/sla-policies/');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  updateSlaPolicy: async (id: string, payload: Partial<CRMStageSlaPolicy>): Promise<CRMStageSlaPolicy> => {
    const res = await api.patch<CRMStageSlaPolicy>(`/tenant/crm/sla-policies/${id}/`, payload);
    return res.data;
  },

  getTrialReminderPolicy: async (): Promise<CRMTrialReminderPolicy> => {
    const res = await api.get<CRMTrialReminderPolicy>('/tenant/crm/trial-reminder-policy/');
    return res.data;
  },

  updateTrialReminderPolicy: async (payload: Partial<CRMTrialReminderPolicy>): Promise<CRMTrialReminderPolicy> => {
    const res = await api.post<CRMTrialReminderPolicy>('/tenant/crm/trial-reminder-policy/', payload);
    return res.data;
  },

  getCommunicationChannels: async (): Promise<CRMCommunicationChannel[]> => {
    const res = await api.get<CRMCommunicationChannel[]>('/tenant/crm/channels/');
    return Array.isArray(res.data) ? res.data : [];
  },

  getNotificationTemplates: async (): Promise<NotificationTemplateItem[]> => {
    const res = await api.get<PaginatedResponse<NotificationTemplateItem> | NotificationTemplateItem[]>('/tenant/notification-templates/');
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

  getFollowupTasks: async (params?: {
    lead_id?: string;
    status?: string;
    priority?: string;
    task_type?: string;
    branch_id?: string;
    assigned_to_user_id?: string;
    due_filter?: 'overdue' | 'today' | 'upcoming' | 'high_priority' | 'completed' | string;
    is_overdue?: boolean;
    search?: string;
  } | string): Promise<SalesFollowupTask[]> => {
    let qStr = '';
    if (typeof params === 'string') {
      qStr = params ? `?lead_id=${params}` : '';
    } else if (params) {
      const sp = new URLSearchParams();
      if (params.lead_id) sp.append('lead_id', params.lead_id);
      if (params.status) sp.append('status', params.status);
      if (params.priority) sp.append('priority', params.priority);
      if (params.task_type) sp.append('task_type', params.task_type);
      if (params.branch_id) sp.append('branch_id', params.branch_id);
      if (params.assigned_to_user_id) sp.append('assigned_to_user_id', params.assigned_to_user_id);
      if (params.due_filter) sp.append('due_filter', params.due_filter);
      if (params.is_overdue !== undefined) sp.append('is_overdue', String(params.is_overdue));
      if (params.search) sp.append('search', params.search);
      const s = sp.toString();
      if (s) qStr = `?${s}`;
    }

    const res = await api.get<PaginatedResponse<SalesFollowupTask> | SalesFollowupTask[]>(
      `/tenant/sales-followup-tasks/${qStr}`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  createFollowupTask: async (payload: CreateFollowupPayload): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>('/tenant/sales-followup-tasks/', payload);
    return res.data;
  },

  completeFollowupTask: async (
    id: string,
    payload: { outcome?: string; next_followup_at?: string; log_activity?: boolean }
  ): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/sales-followup-tasks/${id}/complete/`, payload);
    return res.data;
  },

  rescheduleFollowupTask: async (
    id: string,
    payload: { due_at: string; reason?: string }
  ): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/sales-followup-tasks/${id}/reschedule/`, payload);
    return res.data;
  },

  cancelFollowupTask: async (id: string, payload?: { reason?: string }): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/sales-followup-tasks/${id}/cancel/`, payload || {});
    return res.data;
  },

  getWorkQueueCounts: async (params?: {
    assigned_to_user_id?: string;
    branch_id?: string;
  }): Promise<WorkQueueCounts> => {
    const sp = new URLSearchParams();
    if (params?.assigned_to_user_id) sp.append('assigned_to_user_id', params.assigned_to_user_id);
    if (params?.branch_id) sp.append('branch_id', params.branch_id);
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<{ counts: WorkQueueCounts }>(`/tenant/sales-followup-tasks/work-queue/${qStr}`);
    return res.data.counts;
  },

  getActivities: async (params?: {
    lead_id?: string;
    activity_type?: string;
    performed_by_user_id?: string;
    branch_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<LeadActivity[]> => {
    const sp = new URLSearchParams();
    if (params?.lead_id) sp.append('lead_id', params.lead_id);
    if (params?.activity_type) sp.append('activity_type', params.activity_type);
    if (params?.performed_by_user_id) sp.append('performed_by_user_id', params.performed_by_user_id);
    if (params?.branch_id) sp.append('branch_id', params.branch_id);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    if (params?.search) sp.append('search', params.search);
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<PaginatedResponse<LeadActivity> | LeadActivity[]>(`/tenant/lead-activities/${qStr}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  createActivity: async (payload: CreateActivityPayload): Promise<LeadActivity> => {
    const res = await api.post<LeadActivity>('/tenant/lead-activities/', payload);
    return res.data;
  },

  getLeadActivities: async (leadId: string): Promise<LeadActivity[]> => {
    const res = await api.get<LeadActivity[]>(`/tenant/leads/${leadId}/activities/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  createLeadActivity: async (leadId: string, payload: Partial<CreateActivityPayload>): Promise<LeadActivity> => {
    const res = await api.post<LeadActivity>(`/tenant/leads/${leadId}/activities/`, payload);
    return res.data;
  },

  getLeadFollowups: async (leadId: string): Promise<SalesFollowupTask[]> => {
    const res = await api.get<SalesFollowupTask[]>(`/tenant/leads/${leadId}/followups/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  createLeadFollowup: async (leadId: string, payload: Partial<CreateFollowupPayload>): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/leads/${leadId}/followups/`, payload);
    return res.data;
  },

  getLeadNotes: async (leadId: string): Promise<LeadNote[]> => {
    const res = await api.get<PaginatedResponse<LeadNote> | LeadNote[]>(`/tenant/lead-notes/?lead_id=${leadId}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  createLeadNote: async (leadId: string, content: string, isPinned = false): Promise<LeadNote> => {
    const res = await api.post<LeadNote>('/tenant/lead-notes/', {
      lead: leadId,
      content,
      is_pinned: isPinned,
    });
    return res.data;
  },

  // ==========================================
  // PHASE 4: TRIAL MANAGEMENT API
  // ==========================================
  getTrialBookings: async (params?: {
    status?: string;
    confirmation_status?: string;
    branch_id?: string;
    lead_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<TrialBooking[]> => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.confirmation_status) sp.append('confirmation_status', params.confirmation_status);
    if (params?.branch_id) sp.append('branch_id', params.branch_id);
    if (params?.lead_id) sp.append('lead_id', params.lead_id);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    if (params?.search) sp.append('search', params.search);
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<PaginatedResponse<TrialBooking> | TrialBooking[]>(`/tenant/trial-bookings/${qStr}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data.results ?? [];
  },

  getTrialSummaryCounts: async (params?: { branch_id?: string }): Promise<TrialSummaryCounts> => {
    const sp = new URLSearchParams();
    if (params?.branch_id) sp.append('branch_id', params.branch_id);
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<{ counts: TrialSummaryCounts }>(`/tenant/trial-bookings/summary_counts/${qStr}`);
    return res.data.counts;
  },

  getAvailableTrialSlots: async (params: {
    branch_id: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    program_id?: string;
    class_category?: string;
    lead_id?: string;
  }): Promise<TrialSlot[]> => {
    const sp = new URLSearchParams();
    sp.append('branch_id', params.branch_id);
    if (params.date) sp.append('date', params.date);
    if (params.date_from) sp.append('date_from', params.date_from);
    if (params.date_to) sp.append('date_to', params.date_to);
    if (params.program_id) sp.append('program_id', params.program_id);
    if (params.class_category) sp.append('class_category', params.class_category);
    if (params.lead_id) sp.append('lead_id', params.lead_id);
    const res = await api.get<{ slots: TrialSlot[] }>(`/tenant/trial-bookings/available_slots/?${sp.toString()}`);
    return res.data.slots || [];
  },

  bookTrial: async (payload: BookTrialPayload): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>('/tenant/trial-bookings/', payload);
    return res.data;
  },

  confirmTrial: async (id: string, channel: TrialConfirmationChannel = 'MANUAL', notes?: string): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/trial-bookings/${id}/confirm/`, {
      channel,
      notes,
    });
    return res.data;
  },

  requestRescheduleTrial: async (id: string, notes?: string): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/trial-bookings/${id}/request_reschedule/`, {
      notes,
    });
    return res.data;
  },

  rescheduleTrial: async (id: string, payload: RescheduleTrialPayload): Promise<{ old_trial: TrialBooking; new_trial: TrialBooking }> => {
    const res = await api.post<{ old_trial: TrialBooking; new_trial: TrialBooking }>(`/tenant/trial-bookings/${id}/reschedule/`, payload);
    return res.data;
  },

  cancelTrial: async (id: string, reason: string, notes?: string): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/trial-bookings/${id}/cancel/`, {
      cancellation_reason: reason,
      notes,
    });
    return res.data;
  },

  markTrialAttended: async (id: string, notes?: string): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/trial-bookings/${id}/mark_attended/`, {
      notes,
    });
    return res.data;
  },

  markTrialNoShow: async (id: string, notes?: string): Promise<TrialBooking> => {
    const res = await api.post<TrialBooking>(`/tenant/trial-bookings/${id}/mark_no_show/`, {
      notes,
    });
    return res.data;
  },

  getTrialReminderSchedule: async (id: string): Promise<TrialReminderSchedulePoint[]> => {
    const res = await api.get<{ reminder_schedule: TrialReminderSchedulePoint[] }>(`/tenant/trial-bookings/${id}/reminder_schedule/`);
    return res.data.reminder_schedule || [];
  },

  getLeadTrials: async (leadId: string): Promise<TrialBooking[]> => {
    const res = await api.get<TrialBooking[]>(`/tenant/leads/${leadId}/trials/`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getCommunications: async (params?: {
    lead_id?: string;
    channel?: string;
    direction?: string;
    status?: string;
    search?: string;
  }): Promise<CommunicationMessage[]> => {
    const query = new URLSearchParams();
    if (params?.lead_id) query.append('lead_id', params.lead_id);
    if (params?.channel && params.channel !== 'ALL') query.append('channel', params.channel);
    if (params?.direction && params.direction !== 'ALL') query.append('direction', params.direction);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const endpoint = `/tenant/crm/communications/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<CommunicationMessage[] | PaginatedResponse<CommunicationMessage>>(endpoint);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray((res.data as any).results)) return (res.data as any).results;
    return [];
  },

  sendCommunication: async (payload: SendCommunicationPayload): Promise<CommunicationMessage> => {
    const res = await api.post<CommunicationMessage>('/tenant/crm/communications/send/', payload);
    return res.data;
  },

  getCommunicationChannels: async (): Promise<CRMCommunicationChannel[]> => {
    const res = await api.get<CRMCommunicationChannel[]>('/tenant/crm/channels/');
    return Array.isArray(res.data) ? res.data : [];
  },

  getNotificationTemplates: async (channel?: string): Promise<NotificationTemplateItem[]> => {
    const query = channel ? `?channel=${channel}` : '';
    const res = await api.get<NotificationTemplateItem[] | PaginatedResponse<NotificationTemplateItem>>(`/tenant/notification-templates/${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray((res.data as any).results)) return (res.data as any).results;
    return [];
  },

  // =========================================================================
  // Follow-up Tasks & Work Queue (Phase 3)
  // =========================================================================
  getFollowupTasks: async (params?: {
    view?: string;
    assigned_to?: string;
    branch_id?: string;
    search?: string;
  }): Promise<SalesFollowupTask[]> => {
    const query = new URLSearchParams();
    if (params?.view && params.view !== 'all') query.append('due_filter', params.view);
    if (params?.assigned_to && params.assigned_to !== 'ALL') query.append('assigned_to', params.assigned_to);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    if (params?.search) query.append('search', params.search);
    const endpoint = `/tenant/sales-followup-tasks/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<SalesFollowupTask[] | PaginatedResponse<SalesFollowupTask>>(endpoint);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray((res.data as any).results)) return (res.data as any).results;
    return [];
  },

  getFollowupWorkQueueCounts: async (params?: { assigned_to?: string; branch_id?: string }): Promise<WorkQueueCounts['counts']> => {
    const query = new URLSearchParams();
    if (params?.assigned_to && params.assigned_to !== 'ALL') query.append('assigned_to', params.assigned_to);
    if (params?.branch_id) query.append('branch_id', params.branch_id);
    const endpoint = `/tenant/sales-followup-tasks/work-queue/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<{ counts: WorkQueueCounts['counts'] }>(endpoint);
    return res.data.counts;
  },

  createFollowupTask: async (payload: {
    lead: string;
    task_type: string;
    priority?: string;
    due_at: string;
    outcome?: string;
    assigned_to?: string;
  }): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>('/tenant/sales-followup-tasks/', payload);
    return res.data;
  },

  completeFollowupTask: async (id: string, outcome?: string, log_activity?: boolean): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/sales-followup-tasks/${id}/complete/`, {
      outcome,
      log_activity,
    });
    return res.data;
  },

  rescheduleFollowupTask: async (id: string, due_at: string, reason?: string): Promise<SalesFollowupTask> => {
    const res = await api.post<SalesFollowupTask>(`/tenant/sales-followup-tasks/${id}/reschedule/`, {
      due_at,
      reason,
    });
    return res.data;
  },

  // =========================================================================
  // Automation Engine (Phase 6)
  // =========================================================================
  getAutomationWorkflows: async (params?: { trigger?: string; is_active?: boolean; status?: string }): Promise<AutomationWorkflow[]> => {
    const query = new URLSearchParams();
    if (params?.trigger) query.append('trigger', params.trigger);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.status) query.append('status', params.status);
    const endpoint = `/tenant/automation/workflows/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<AutomationWorkflow[] | PaginatedResponse<AutomationWorkflow>>(endpoint);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray((res.data as any).results)) return (res.data as any).results;
    return [];
  },

  getAutomationWorkflow: async (id: string): Promise<AutomationWorkflow> => {
    const res = await api.get<AutomationWorkflow>(`/tenant/automation/workflows/${id}/`);
    return res.data;
  },

  createAutomationWorkflow: async (data: {
    name: string;
    description?: string;
    trigger_type: string;
    trigger_config?: any;
    steps_definition?: any[];
  }): Promise<AutomationWorkflow> => {
    const res = await api.post<AutomationWorkflow>('/tenant/automation/workflows/', data);
    return res.data;
  },

  createWorkflowDraft: async (id: string): Promise<AutomationWorkflowVersion> => {
    const res = await api.post<AutomationWorkflowVersion>(`/tenant/automation/workflows/${id}/create-draft/`);
    return res.data;
  },

  updateWorkflowDraft: async (id: string, data: {
    name?: string;
    description?: string;
    trigger_type?: string;
    trigger_config?: any;
    steps_definition?: any[];
  }): Promise<AutomationWorkflow> => {
    const res = await api.post<AutomationWorkflow>(`/tenant/automation/workflows/${id}/update-draft/`, data);
    return res.data;
  },

  publishWorkflow: async (id: string): Promise<AutomationWorkflow> => {
    const res = await api.post<AutomationWorkflow>(`/tenant/automation/workflows/${id}/publish/`);
    return res.data;
  },

  activateWorkflow: async (id: string): Promise<{ status: string; is_active: boolean }> => {
    const res = await api.post<{ status: string; is_active: boolean }>(`/tenant/automation/workflows/${id}/activate/`);
    return res.data;
  },

  deactivateWorkflow: async (id: string): Promise<{ status: string; is_active: boolean }> => {
    const res = await api.post<{ status: string; is_active: boolean }>(`/tenant/automation/workflows/${id}/deactivate/`);
    return res.data;
  },

  duplicateWorkflow: async (id: string): Promise<AutomationWorkflow> => {
    const res = await api.post<AutomationWorkflow>(`/tenant/automation/workflows/${id}/duplicate/`);
    return res.data;
  },

  getAutomationMetadata: async (): Promise<AutomationMetadata> => {
    const res = await api.get<AutomationMetadata>('/tenant/automation/workflows/metadata/');
    return res.data;
  },

  getAutomationExecutions: async (params?: { workflow_id?: string; status?: string }): Promise<AutomationExecution[]> => {
    const query = new URLSearchParams();
    if (params?.workflow_id) query.append('workflow_id', params.workflow_id);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    const endpoint = `/tenant/automation/executions/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<AutomationExecution[] | PaginatedResponse<AutomationExecution>>(endpoint);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray((res.data as any).results)) return (res.data as any).results;
    return [];
  },

  getAutomationExecution: async (id: string): Promise<AutomationExecution> => {
    const res = await api.get<AutomationExecution>(`/tenant/automation/executions/${id}/`);
    return res.data;
  },

  retryAutomationExecution: async (id: string): Promise<AutomationExecution> => {
    const res = await api.post<AutomationExecution>(`/tenant/automation/executions/${id}/retry/`);
    return res.data;
  },

  // =========================================================================
  // Phase 7: Stuck Lead & Next Best Action Endpoints
  // =========================================================================
  getAttentionQueue: async (params?: {
    branch?: string;
    assigned_to?: string;
    stage?: string;
    reason?: string;
    severity?: string;
    source?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AttentionQueueResponse> => {
    const query = new URLSearchParams();
    if (params?.branch && params.branch !== 'ALL') query.append('branch', params.branch);
    if (params?.assigned_to && params.assigned_to !== 'ALL') query.append('assigned_to', params.assigned_to);
    if (params?.stage && params.stage !== 'ALL') query.append('stage', params.stage);
    if (params?.reason && params.reason !== 'ALL') query.append('reason', params.reason);
    if (params?.severity && params.severity !== 'ALL') query.append('severity', params.severity);
    if (params?.source && params.source !== 'ALL') query.append('source', params.source);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.page_size) query.append('page_size', String(params.page_size));

    const endpoint = `/tenant/leads/attention/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<AttentionQueueResponse>(endpoint);
    return res.data;
  },

  getAttentionMetrics: async (params?: { branch?: string }): Promise<AttentionQueueMetrics> => {
    const query = new URLSearchParams();
    if (params?.branch && params.branch !== 'ALL') query.append('branch', params.branch);
    const endpoint = `/tenant/leads/attention/metrics/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<AttentionQueueMetrics>(endpoint);
    return res.data;
  },

  getLeadNextAction: async (leadId: string): Promise<LeadAttentionFull> => {
    const res = await api.get<LeadAttentionFull>(`/tenant/leads/${leadId}/next-action/`);
    return res.data;
  },

  scanSlaBreaches: async (): Promise<{ status: string; emitted_events_count: number }> => {
    const res = await api.post<{ status: string; emitted_events_count: number }>('/tenant/leads/scan-sla-breaches/');
    return res.data;
  },

  getAttentionPolicy: async (): Promise<CRMAttentionPolicy> => {
    const res = await api.get<CRMAttentionPolicy[] | PaginatedResponse<CRMAttentionPolicy>>('/tenant/crm/attention-policy/');
    let list: CRMAttentionPolicy[] = [];
    if (Array.isArray(res.data)) list = res.data;
    else if (res.data && Array.isArray((res.data as any).results)) list = (res.data as any).results;
    if (list.length > 0) return list[0];
    throw new Error('Attention policy not found');
  },

  updateAttentionPolicy: async (id: string, payload: Partial<CRMAttentionPolicy>): Promise<CRMAttentionPolicy> => {
    const res = await api.patch<CRMAttentionPolicy>(`/tenant/crm/attention-policy/${id}/`, payload);
    return res.data;
  },

  getAgentAssignmentConfig: async (): Promise<CRMAgentAssignmentConfig> => {
    const res = await api.get<CRMAgentAssignmentConfig>('/tenant/crm/agent-assignment-config/');
    return res.data;
  },

  updateAgentAssignmentConfig: async (payload: Partial<CRMAgentAssignmentConfig>): Promise<CRMAgentAssignmentConfig> => {
    const res = await api.post<CRMAgentAssignmentConfig>('/tenant/crm/agent-assignment-config/', payload);
    return res.data;
  },

  // =========================================================================
  // Phase 8: Lead → Member Conversion
  // =========================================================================

  getConversionEligibility: async (leadId: string): Promise<import('@/types/crm').ConversionEligibility> => {
    const res = await api.get<import('@/types/crm').ConversionEligibility>(
      `/tenant/leads/${leadId}/conversion-eligibility/`
    );
    return res.data;
  },

  getConversionQuote: async (
    leadId: string,
    params: {
      package_version_id: string;
      branch_id: string;
      coupon_code?: string;
    }
  ): Promise<import('@/types/crm').ConversionQuote> => {
    const res = await api.post<import('@/types/crm').ConversionQuote>(
      `/tenant/leads/${leadId}/conversion-quote/`,
      params
    );
    return res.data;
  },

  executeConversion: async (
    leadId: string,
    payload: import('@/types/crm').ConversionPayload
  ): Promise<import('@/types/crm').ConversionResult> => {
    const res = await api.post<import('@/types/crm').ConversionResult>(
      `/tenant/leads/${leadId}/convert/`,
      payload
    );
    return res.data;
  },

  // Catalog browsing for the conversion wizard package picker
  getCatalogPrograms: async (): Promise<import('@/types/crm').CatalogProgram[]> => {
    const res = await api.get<any>('/tenant/programs/?status=ACTIVE&page_size=200');
    if (Array.isArray(res.data)) return res.data;
    return res.data?.results ?? [];
  },

  getCatalogPackageVersions: async (params?: {
    program_id?: string;
    status?: string;
  }): Promise<import('@/types/crm').CatalogPackageVersion[]> => {
    const query = new URLSearchParams();
    if (params?.program_id) query.append('program_id', params.program_id);
    query.append('status', params?.status ?? 'ACTIVE');
    query.append('page_size', '200');
    const res = await api.get<any>(`/tenant/package-versions/?${query.toString()}`);
    if (Array.isArray(res.data)) return res.data;
    return res.data?.results ?? [];
  },

  // ==========================================
  // PHASE 9: OFFERS, COUPONS & CAMPAIGN COMMERCIAL INTEGRATION
  // ==========================================

  getCampaignPerformance: async (params?: {
    branch_id?: string;
    platform?: string;
    source?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<import('@/types/crm').CampaignPerformanceResponse> => {
    const sp = new URLSearchParams();
    if (params?.branch_id && params.branch_id !== 'ALL') sp.append('branch_id', params.branch_id);
    if (params?.platform && params.platform !== 'ALL') sp.append('platform', params.platform);
    if (params?.source && params.source !== 'ALL') sp.append('source', params.source);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    if (params?.search) sp.append('search', params.search);
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<import('@/types/crm').CampaignPerformanceResponse>(`/tenant/crm/campaigns/${qStr}`);
    return res.data;
  },

  getCampaignDrilldownLeads: async (params: {
    campaign_name?: string;
    platform?: string;
  }): Promise<import('@/types/crm').Lead[]> => {
    const sp = new URLSearchParams();
    if (params.campaign_name) sp.append('campaign_name', params.campaign_name);
    if (params.platform) sp.append('platform', params.platform);
    const res = await api.get<any>(`/tenant/crm/campaigns/leads/?${sp.toString()}`);
    if (Array.isArray(res.data)) return res.data;
    return res.data?.results ?? [];
  },

  getCampaignDrilldownConversions: async (params: {
    campaign_name?: string;
    platform?: string;
  }): Promise<import('@/types/crm').CampaignDrilldownConversion[]> => {
    const sp = new URLSearchParams();
    if (params.campaign_name) sp.append('campaign_name', params.campaign_name);
    if (params.platform) sp.append('platform', params.platform);
    const res = await api.get<import('@/types/crm').CampaignDrilldownConversion[]>(
      `/tenant/crm/campaigns/conversions/?${sp.toString()}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  getCampaignDrilldownRevenue: async (params: {
    campaign_name?: string;
    platform?: string;
  }): Promise<import('@/types/crm').CampaignDrilldownRevenue[]> => {
    const sp = new URLSearchParams();
    if (params.campaign_name) sp.append('campaign_name', params.campaign_name);
    if (params.platform) sp.append('platform', params.platform);
    const res = await api.get<import('@/types/crm').CampaignDrilldownRevenue[]>(
      `/tenant/crm/campaigns/revenue/?${sp.toString()}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  getCampaignDrilldownRedemptions: async (params: {
    campaign_name?: string;
  }): Promise<any[]> => {
    const sp = new URLSearchParams();
    if (params.campaign_name) sp.append('campaign_name', params.campaign_name);
    const res = await api.get<any[]>(`/tenant/crm/campaigns/redemptions/?${sp.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getLeadOffers: async (leadId: string): Promise<import('@/types/crm').LeadOffersResponse> => {
    const res = await api.get<import('@/types/crm').LeadOffersResponse>(`/tenant/leads/${leadId}/offers/`);
    return res.data;
  },

  getDashboardMetrics: async (params?: Partial<import('@/types/crm').CRMDashboardFilters>): Promise<import('@/types/crm').CRMDashboardResponse> => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
          sp.append(k, String(v));
        }
      });
    }
    const queryStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<import('@/types/crm').CRMDashboardResponse>(`/tenant/crm/dashboard/${queryStr}`);
    return res.data;
  },

  getNotifications: async (params?: { unread?: boolean }): Promise<InAppNotification[]> => {
    const sp = new URLSearchParams();
    if (params?.unread) sp.append('unread', 'true');
    const qStr = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get<PaginatedResponse<InAppNotification> | InAppNotification[]>(`/tenant/in-app-notifications/${qStr}`);
    if (Array.isArray(res.data)) return res.data;
    return (res.data as PaginatedResponse<InAppNotification>)?.results || [];
  },

  getUnreadNotificationCount: async (): Promise<number> => {
    const res = await api.get<{ unread_count: number }>('/tenant/in-app-notifications/unread-count/');
    return res.data?.unread_count || 0;
  },

  markNotificationRead: async (id: string): Promise<InAppNotification> => {
    const res = await api.post<InAppNotification>(`/tenant/in-app-notifications/${id}/mark-read/`);
    return res.data;
  },

  markAllNotificationsRead: async (): Promise<number> => {
    const res = await api.post<{ marked_read: number }>('/tenant/in-app-notifications/mark-all-read/');
    return res.data?.marked_read || 0;
  },
};


