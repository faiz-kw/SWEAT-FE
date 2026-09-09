/**
 * api-admin.ts — API client for Administration & Configuration Endpoints
 * 100% Real REST Backend Architecture with PostgreSQL Persistence
 */

import { api } from "./api";
import { type Row } from "./store";

export interface AdminUserRow extends Row {
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  role_name?: string;
  tenant_id?: string;
  tenant_name?: string;
  active_location_id?: string;
  active_location_name?: string;
  allowed_locations?: any[];
  status: "Active" | "Inactive" | "Invited" | "Suspended";
  is_active: boolean;
  date_joined?: string;
}

export interface RoleDefRow extends Row {
  name: string;
  code: string;
  description: string;
  scope: "platform" | "tenant";
  is_system: boolean;
  tenant?: string;
  tenant_name?: string;
  users_count?: number;
  permissions?: { permission: { id: string; module: string; action: string; label: string; scope: "platform" | "tenant" }; granted: boolean }[];
  created_at?: string;
}

export interface PermissionDefRow {
  id: string;
  module: string;
  action: string;
  label: string;
  scope: "platform" | "tenant";
  description: string;
}

export interface LocationRow extends Row {
  name: string;
  city: string;
  address: string;
  phone: string;
  capacity: number;
  operating_hours: string;
  is_active: boolean;
  tenant?: string;       // tenant ID (PrimaryKey)
  tenant_name?: string;  // tenant display name (read-only from API)
  created_at?: string;
}

export interface ServiceRow extends Row {
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price: number;
  capacity: number;
  location?: string;
  location_name?: string;
  is_active: boolean;
}

export interface TenantSettingsData {
  currency: string;
  timezone?: string;
  tax_rate_gst: number;
  tax_id_number: string;
  booking_cancellation_window_hours: number;
  late_cancellation_fee: number;
  allow_guest_passes: boolean;
  guest_passes_per_month: number;
  membership_grace_period_days: number;
  allow_member_freeze: boolean;
  max_freeze_days_per_year: number;
  business_open_time: string;
  business_close_time: string;
}

export interface CustomFormRow extends Row {
  title: string;
  code: string;
  description: string;
  is_mandatory: boolean;
  fields_schema: any[];
  is_active: boolean;
}

export interface ApiKeyRow extends Row {
  name: string;
  key_prefix: string;
  raw_key?: string;
  webhook_url?: string;
  is_active: boolean;
  last_used_at?: string;
  created_at?: string;
}

export interface AuditLogRow extends Row {
  user_email: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SecurityPolicyData {
  enforce_mfa: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  require_special_character: boolean;
  max_failed_attempts_lockout: number;
  ip_whitelist: string[];
}

// ── USERS ─────────────────────────────────────────────────────────────

export async function fetchUsersApi(role?: string, location?: string, search?: string, tenantId?: string): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  if (role && role !== "all") params.set("role", role);
  if (location && location !== "all") params.set("location", location);
  if (search) params.set("search", search);
  if (tenantId && tenantId !== "all") params.set("tenant", tenantId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<AdminUserRow[]>(`/users/users/${query}`);
  return res.data || [];
}

export async function createUserApi(payload: Record<string, unknown>): Promise<AdminUserRow> {
  const res = await api.post<AdminUserRow>("/users/users/", payload);
  return res.data;
}

export async function updateUserApi(userId: string, payload: Record<string, unknown>): Promise<AdminUserRow> {
  const res = await api.patch<AdminUserRow>(`/users/users/${userId}/`, payload);
  return res.data;
}

export async function deleteUserApi(userId: string): Promise<void> {
  await api.delete(`/users/users/${userId}/`);
}

export async function toggleUserActiveApi(userId: string): Promise<AdminUserRow> {
  const res = await api.post<AdminUserRow>(`/users/users/${userId}/toggle-active/`);
  return res.data;
}

export async function inviteUserApi(payload: { email: string; first_name: string; last_name?: string; phone?: string; role: string; location_ids?: string[]; tenant_id?: string }): Promise<any> {
  const res = await api.post<any>("/users/invite/", payload);
  return res.data;
}

// ── ROLES & PERMISSIONS ───────────────────────────────────────────────

export async function fetchRolesApi(tenantId?: string, scope?: string): Promise<RoleDefRow[]> {
  const params = new URLSearchParams();
  if (tenantId && tenantId !== "all") params.set("tenant", tenantId);
  if (scope && scope !== "all") params.set("scope", scope);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<RoleDefRow[]>(`/users/roles/${query}`);
  return res.data || [];
}

export async function fetchPermissionsApi(module?: string, scope?: string): Promise<PermissionDefRow[]> {
  const params = new URLSearchParams();
  if (module && module !== "all") params.set("module", module);
  if (scope && scope !== "all") params.set("scope", scope);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<PermissionDefRow[]>(`/users/permissions/${query}`);
  return res.data || [];
}

export async function createRoleApi(payload: {
  name: string;
  code?: string;
  scope?: "platform" | "tenant";
  tenant?: string;
  description?: string;
  permissions?: { permission_id: string; granted: boolean }[];
}): Promise<RoleDefRow> {
  const code = payload.code || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const res = await api.post<RoleDefRow>("/users/roles/", {
    ...payload,
    code,
    description: payload.description || "",
  });
  return res.data;
}

export async function deleteRoleApi(roleId: string): Promise<void> {
  await api.delete(`/users/roles/${roleId}/`);
}

export async function updateRolePermissionsApi(roleId: string, permissions: { permission_id: string; granted: boolean }[]): Promise<any> {
  const res = await api.post<any>(`/users/roles/${roleId}/update-permissions/`, { permissions });
  return res.data;
}

// ── LOCATIONS ─────────────────────────────────────────────────────────

export async function fetchLocationsApi(tenantId?: string): Promise<LocationRow[]> {
  const params = tenantId ? `?tenant=${tenantId}` : '';
  const res = await api.get<LocationRow[]>(`/platform/locations/${params}`);
  return res.data || [];
}

export async function fetchTenantsForDropdownApi(): Promise<{ id: string; name: string }[]> {
  const res = await api.get<any[]>('/platform/tenants/?ordering=name');
  return (res.data || []).map((t: any) => ({ id: t.id, name: t.name }));
}

export async function createLocationApi(payload: Partial<LocationRow>): Promise<LocationRow> {
  const res = await api.post<LocationRow>("/platform/locations/", payload);
  return res.data;
}

export async function updateLocationApi(locationId: string, payload: Partial<LocationRow>): Promise<LocationRow> {
  const res = await api.patch<LocationRow>(`/platform/locations/${locationId}/`, payload);
  return res.data;
}

export async function deleteLocationApi(locationId: string): Promise<void> {
  await api.delete(`/platform/locations/${locationId}/`);
}

// ── SERVICES ──────────────────────────────────────────────────────────

export async function fetchServicesApi(): Promise<ServiceRow[]> {
  const res = await api.get<ServiceRow[]>("/admin-config/services/");
  return res.data || [];
}

export async function createServiceApi(payload: Partial<ServiceRow>): Promise<ServiceRow> {
  const res = await api.post<ServiceRow>("/admin-config/services/", payload);
  return res.data;
}

export async function updateServiceApi(serviceId: string, payload: Partial<ServiceRow>): Promise<ServiceRow> {
  const res = await api.patch<ServiceRow>(`/admin-config/services/${serviceId}/`, payload);
  return res.data;
}

export async function deleteServiceApi(serviceId: string): Promise<void> {
  await api.delete(`/admin-config/services/${serviceId}/`);
}

// ── TENANT CONFIGURATION ──────────────────────────────────────────────

export async function fetchTenantSettingsApi(): Promise<TenantSettingsData> {
  const res = await api.get<TenantSettingsData>("/admin-config/settings/current/");
  return res.data;
}

export async function updateTenantSettingsApi(payload: Partial<TenantSettingsData>): Promise<TenantSettingsData> {
  const res = await api.put<TenantSettingsData>("/admin-config/settings/current/", payload);
  return res.data;
}

// ── CUSTOM FORMS ──────────────────────────────────────────────────────

export async function fetchCustomFormsApi(): Promise<CustomFormRow[]> {
  const res = await api.get<CustomFormRow[]>("/admin-config/forms/");
  return res.data || [];
}

export async function createCustomFormApi(payload: Partial<CustomFormRow>): Promise<CustomFormRow> {
  const res = await api.post<CustomFormRow>("/admin-config/forms/", payload);
  return res.data;
}

export async function updateCustomFormApi(formId: string, payload: Partial<CustomFormRow>): Promise<CustomFormRow> {
  const res = await api.patch<CustomFormRow>(`/admin-config/forms/${formId}/`, payload);
  return res.data;
}

export async function deleteCustomFormApi(formId: string): Promise<void> {
  await api.delete(`/admin-config/forms/${formId}/`);
}

// ── AUDIT LOGS ────────────────────────────────────────────────────────

export async function fetchAuditLogsApi(action?: string, module?: string): Promise<AuditLogRow[]> {
  const params = new URLSearchParams();
  if (action && action !== "all") params.set("action", action);
  if (module && module !== "all") params.set("module", module);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<AuditLogRow[]>(`/admin-config/audit-logs/${query}`);
  return res.data || [];
}

// ── API KEYS & WEBHOOKS ───────────────────────────────────────────────

export async function fetchApiKeysApi(): Promise<ApiKeyRow[]> {
  const res = await api.get<ApiKeyRow[]>("/admin-config/api-keys/");
  return res.data || [];
}

export async function createApiKeyApi(name: string, webhook_url?: string): Promise<ApiKeyRow> {
  const res = await api.post<ApiKeyRow>("/admin-config/api-keys/", { name, webhook_url });
  return res.data;
}

export async function deleteApiKeyApi(keyId: string): Promise<void> {
  await api.delete(`/admin-config/api-keys/${keyId}/`);
}

// ── SECURITY POLICIES ─────────────────────────────────────────────────

export async function fetchSecurityPolicyApi(): Promise<SecurityPolicyData> {
  const res = await api.get<SecurityPolicyData>("/admin-config/security-policy/current/");
  return res.data;
}

export async function updateSecurityPolicyApi(payload: Partial<SecurityPolicyData>): Promise<SecurityPolicyData> {
  const res = await api.put<SecurityPolicyData>("/admin-config/security-policy/current/", payload);
  return res.data;
}
