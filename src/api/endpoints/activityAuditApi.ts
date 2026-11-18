/**
 * activityAuditApi.ts — Canonical Centralized Activity & Audit Logging Client
 * Completely dynamic, zero hardcoding, fulfilling the 9-Point Contract.
 */

import { api } from '../client';

export interface FieldChange {
  field_name: string;
  field_label: string;
  old_value: any;
  new_value: any;
}

export interface ActivityAuditLog {
  id: string;
  occurred_at: string;
  occurred_at_ist: string;
  organization_id?: string | undefined;
  branch_id?: string | undefined;
  branch_name: string;
  actor_type: string;
  actor_id?: string | undefined;
  actor_email: string;
  actor_name: string;
  actor_role: string;
  actor_display: string;
  action_code: string;
  action_category: string;
  action_verb: string;
  module: string;
  submodule: string;
  entity_type: string;
  entity_id?: string | undefined;
  entity_name: string;
  before_state?: Record<string, any> | null | undefined;
  after_state?: Record<string, any> | null | undefined;
  field_changes?: FieldChange[] | null | undefined;
  field_changes_count: number;
  event_description: string;
  reason?: string | undefined;
  remarks?: string | undefined;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  error_code?: string | undefined;
  error_message?: string | undefined;
  metadata?: Record<string, any> | null | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  request_id?: string | undefined;
  correlation_id?: string | undefined;
  source_channel: string;
  created_at: string;
}

export interface ActivityFiltersResponse {
  modules: string[];
  categories: string[];
  actor_types: string[];
  source_channels: string[];
  results: string[];
  branches: { id: string; name: string; code?: string | undefined; status?: string | undefined }[];
  actors: { actor_id?: string | undefined; actor_name: string; actor_email: string; actor_role?: string | undefined; actor_type?: string | undefined }[];
  kpis: {
    total_activities: number;
    security_events: number;
    commercial_mutations: number;
    failed_operations: number;
  };
}

export interface ActivityQueryParams {
  page?: number | undefined;
  page_size?: number | undefined;
  search?: string | undefined;
  module?: string | undefined;
  category?: string | undefined;
  action_category?: string | undefined;
  actor_type?: string | undefined;
  actor_id?: string | undefined;
  actor_email?: string | undefined;
  result?: string | undefined;
  branch_id?: string | undefined;
  source_channel?: string | undefined;
  entity_type?: string | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export function buildActivityQueryParams(params?: ActivityQueryParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params) {
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.search) query.set('search', params.search);
    if (params.module && params.module !== 'ALL') query.set('module', params.module);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.action_category && params.action_category !== 'ALL') query.set('action_category', params.action_category);
    if (params.actor_type && params.actor_type !== 'ALL') query.set('actor_type', params.actor_type);
    if (params.actor_id && params.actor_id !== 'ALL') query.set('actor_id', params.actor_id);
    if (params.actor_email && params.actor_email !== 'ALL') query.set('actor_email', params.actor_email);
    if (params.result && params.result !== 'ALL') query.set('result', params.result);
    if (params.branch_id && params.branch_id !== 'ALL') query.set('branch_id', params.branch_id);
    if (params.source_channel && params.source_channel !== 'ALL') query.set('source_channel', params.source_channel);
    if (params.entity_type) query.set('entity_type', params.entity_type);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
  }
  return query;
}

export async function fetchActivityLogsApi(
  params?: ActivityQueryParams
): Promise<PaginatedResponse<ActivityAuditLog>> {
  const query = buildActivityQueryParams(params);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await api.get<any>(`/tenant/activity-logs/${qs}`);
  if (Array.isArray(res.data)) {
    return {
      count: res.data.length,
      results: res.data,
    };
  }
  return {
    count: res.data.count || 0,
    next: res.data.next,
    previous: res.data.previous,
    results: res.data.results || [],
  };
}

export async function fetchActivityFiltersApi(): Promise<ActivityFiltersResponse> {
  const res = await api.get<ActivityFiltersResponse>('/tenant/activity-logs/filters/');
  return res.data;
}

export async function fetchActivityLogDetailApi(id: string): Promise<ActivityAuditLog> {
  const res = await api.get<ActivityAuditLog>(`/tenant/activity-logs/${id}/`);
  return res.data;
}

export async function exportActivityLogsCsvApi(params?: ActivityQueryParams): Promise<Blob> {
  const exportParams: ActivityQueryParams = { ...params };
  delete exportParams.page;
  delete exportParams.page_size;
  const query = buildActivityQueryParams(exportParams);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return api.downloadBlob(`/tenant/activity-logs/export/${qs}`);
}

export function getActivityExportUrl(params?: ActivityQueryParams): string {
  const exportParams: ActivityQueryParams = { ...params };
  delete exportParams.page;
  delete exportParams.page_size;
  const query = buildActivityQueryParams(exportParams);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return `/api/v1/tenant/activity-logs/export/${qs}`;
}
