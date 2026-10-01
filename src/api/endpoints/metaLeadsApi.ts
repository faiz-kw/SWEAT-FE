import { api } from '../client';

export type MetaMapping = {
  id: string;
  name: string;
  page_id: string;
  form_id: string;
  is_active: boolean;
  version: number;
  field_mappings: Record<string, string>;
  field_defaults?: Record<string, string>;
  branch_mode: 'FIXED' | 'ANSWER';
  branch: string | null;
  branch_field: string;
  branch_answers: Record<string, string>;
  unmatched_branch_policy?: 'HOLD' | 'FALLBACK_BRANCH';
  fallback_branch?: string | null;
  lead_source: string;
  initial_stage?: string;
  repeat_policy: 'REVIEW' | 'CREATE_NEW';
  assignment_mode?: 'TENANT_POLICY' | 'SPECIFIC_USER';
  assigned_sales_user?: string | null;
  create_followup_task?: boolean;
  followup_task_type?: string;
  followup_due_hours?: number;
  updated_at: string;
};

export type MappingInput = Omit<MetaMapping, 'id' | 'version' | 'updated_at'> & { expected_version?: number };

export type MetaImport = {
  id: string;
  mode: string;
  page_id: string;
  form_id: string;
  external_lead_id: string;
  status: string;
  lead: string | null;
  mapping_version: number | null;
  attempt_count: number;
  error_code: string;
  error_message: string;
  received_at: string;
  processed_at: string | null;
  duplicate_delivery?: boolean;
  field_data?: { name: string; values: string[] }[];
  mapping_snapshot?: Record<string, unknown>;
};

export type MetaAuditHistoryItem = {
  id: string;
  action_code: string;
  occurred_at: string;
  actor_name: string;
  actor_type: string;
  version?: number;
  is_active?: boolean;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
};

type Choice = { value: string; label: string };

export type MetaMetadata = {
  connection_status: string;
  live_available: boolean;
  simulator_enabled: boolean;
  simulator_requirement: string;
  destination_fields: Choice[];
  branch_modes: Choice[];
  unmatched_branch_policies?: Choice[];
  repeat_policies: Choice[];
  initial_stages?: Choice[];
  assignment_modes?: Choice[];
  task_types?: Choice[];
  branches: { id: string; name: string; code?: string }[];
  lead_sources: { id: string; name: string }[];
  eligible_users?: { id: string; name: string; email: string }[];
  tenant_assignment_policy?: {
    mode_allowed: string;
    auto_strategy: string;
    allow_unassigned_fallback: boolean;
    require_branch_match: boolean;
  };
  phone_validation: string;
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export const metaLeadsApi = {
  metadata: async () => (await api.get<MetaMetadata>('/tenant/meta-lead-mappings/metadata/')).data,
  mappings: async (page = 1) => (await api.get<Page<MetaMapping>>('/tenant/meta-lead-mappings/', { params: { page } })).data,
  save: async (payload: MappingInput, id?: string) => id
    ? (await api.patch<MetaMapping>(`/tenant/meta-lead-mappings/${id}/`, payload)).data
    : (await api.post<MetaMapping>('/tenant/meta-lead-mappings/', payload)).data,
  toggleActive: async (id: string, is_active: boolean, expected_version: number) =>
    (await api.patch<MetaMapping>(`/tenant/meta-lead-mappings/${id}/`, { is_active, expected_version })).data,
  auditHistory: async (id: string) =>
    (await api.get<{ results: MetaAuditHistoryItem[] }>(`/tenant/meta-lead-mappings/${id}/audit-history/`)).data,
  imports: async (page = 1, status?: string) =>
    (await api.get<Page<MetaImport>>('/tenant/meta-lead-imports/', { params: { page, ...(status ? { status } : {}) } })).data,
  detail: async (id: string) => (await api.get<MetaImport>(`/tenant/meta-lead-imports/${id}/`)).data,
  simulate: async (payload: { page_id: string; form_id: string; external_lead_id: string; field_data: { name: string; values: string[] }[] }) =>
    (await api.post<MetaImport>('/tenant/meta-lead-imports/simulate/', payload)).data,
  retry: async (id: string) => (await api.post<MetaImport>(`/tenant/meta-lead-imports/${id}/retry/`, {})).data,
};
