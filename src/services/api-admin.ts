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
  scope: "ORG" | "BRANCH" | "platform" | "tenant";
  is_system: boolean;
  is_active?: boolean;
  tenant?: string;
  tenant_name?: string;
  users_count?: number;
  permission_set_id?: string;
  permissions?: { permission_id?: string; permission_code?: string; permission?: { id: string; module: string; action: string; label: string; scope?: string }; granted: boolean }[];
  module_access?: { module_code: string; can_access: boolean; is_visible: boolean }[];
  submodule_access?: { module_code: string; submodule_code: string; can_access: boolean; is_visible: boolean }[];
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

function toArray<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

// ── USERS ─────────────────────────────────────────────────────────────

export async function fetchUsersApi(role?: string, location?: string, search?: string, tenantId?: string): Promise<AdminUserRow[]> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("pos_user_profile") : null;
  let isPlatform = false;
  try {
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.userType === "platform" || (!parsed.tenantId && parsed.isSuperAdmin)) {
        isPlatform = true;
      }
    }
  } catch {}

  const params = new URLSearchParams();
  if (role && role !== "all") params.set("role", role);
  if (location && location !== "all") params.set("location", location);
  if (search) params.set("search", search);

  if (isPlatform) {
    if (tenantId && tenantId !== "all") {
      // Control-plane cross-tenant staff endpoint
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<any>(`/platform/tenants/${tenantId}/staff/${query}`);
      return toArray<AdminUserRow>(res.data);
    } else {
      // Platform users
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<any>(`/platform/platform-users/${query}`);
      return toArray<AdminUserRow>(res.data);
    }
  }

  // Tenant mode
  if (tenantId && tenantId !== "all") params.set("tenant", tenantId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/users/${query}`);
  return toArray<AdminUserRow>(res.data);
}

export async function createUserApi(payload: Record<string, unknown>): Promise<AdminUserRow> {
  const res = await api.post<AdminUserRow>("/tenant/users/", payload);
  return res.data;
}

export async function updateUserApi(userId: string, payload: Record<string, unknown>): Promise<AdminUserRow> {
  const res = await api.patch<AdminUserRow>(`/tenant/users/${userId}/`, payload);
  return res.data;
}

export async function deleteUserApi(userId: string): Promise<void> {
  await api.delete(`/tenant/users/${userId}/`);
}

export async function toggleUserActiveApi(userId: string): Promise<AdminUserRow> {
  const res = await api.post<AdminUserRow>(`/tenant/users/${userId}/toggle-active/`);
  return res.data;
}

export async function inviteUserApi(payload: {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: string;
  role_id?: string;
  department_id?: string;
  password?: string;
  location_ids?: string[];
  tenant_id?: string;
}): Promise<any> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("pos_user_profile") : null;
  let isTenant = false;
  try {
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.user_type === "tenant" || (parsed.tenantId && !parsed.isSuperAdmin)) {
        isTenant = true;
      }
    }
  } catch {}

  if (isTenant || !payload.tenant_id) {
    const locId = payload.location_ids?.[0];
    return await createUserApi({
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name || "",
      phone: payload.phone || "",
      role: payload.role,
      role_id: payload.role_id,
      department_id: payload.department_id,
      branch: locId,
      branch_id: locId,
      home_branch: locId,
      password: payload.password || "",
      status: payload.password ? "ACTIVE" : "INVITED",
    });
  }

  const res = await api.post<any>("/users/invite/", payload);
  return res.data;
}

// ── ROLES & PERMISSIONS ───────────────────────────────────────────────

export async function fetchRolesApi(tenantId?: string, scope?: string): Promise<RoleDefRow[]> {
  const params = new URLSearchParams();
  if (tenantId && tenantId !== "all") params.set("tenant", tenantId);
  if (scope && scope !== "all") params.set("scope", scope);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/roles/${query}`);
  return toArray<RoleDefRow>(res.data);
}

export async function fetchPermissionsApi(module?: string, scope?: string): Promise<PermissionDefRow[]> {
  const params = new URLSearchParams();
  if (module && module !== "all") params.set("module", module);
  if (scope && scope !== "all") params.set("scope", scope);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/permissions/${query}`);
  return toArray<PermissionDefRow>(res.data);
}

export async function createRoleApi(payload: {
  name: string;
  code?: string;
  scope?: "ORG" | "BRANCH" | "platform" | "tenant";
  tenant?: string;
  description?: string;
  permissions?: { permission_id: string; granted: boolean }[];
}): Promise<RoleDefRow> {
  const code = payload.code || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  let backendScope = 'BRANCH';
  if (payload.scope === 'ORG' || payload.scope === 'platform') {
    backendScope = 'ORG';
  } else if (payload.scope === 'BRANCH' || payload.scope === 'tenant') {
    backendScope = 'BRANCH';
  }

  const res = await api.post<RoleDefRow>("/tenant/roles/", {
    name: payload.name,
    code,
    description: payload.description || "",
    scope: backendScope,
  });

  if (payload.permissions && payload.permissions.length > 0 && res.data?.id) {
    try {
      await updateRolePermissionsApi(res.data.id, payload.permissions);
    } catch {}
  }

  return res.data;
}

export async function updateRoleApi(roleId: string, payload: Partial<RoleDefRow>): Promise<RoleDefRow> {
  const res = await api.patch<RoleDefRow>(`/tenant/roles/${roleId}/`, payload);
  return res.data;
}

export async function toggleRoleActiveApi(roleId: string, isActive: boolean): Promise<RoleDefRow> {
  const res = await api.patch<RoleDefRow>(`/tenant/roles/${roleId}/`, { is_active: isActive });
  return res.data;
}

export async function deleteRoleApi(roleId: string): Promise<void> {
  await api.delete(`/tenant/roles/${roleId}/`);
}

export async function updateRolePermissionsApi(
  roleId: string,
  permissions: { permission_id?: string; permission_code?: string; granted: boolean }[],
  options?: { module_access?: any[]; submodule_access?: any[] }
): Promise<any> {
  const payload = {
    permissions,
    ...(options?.module_access ? { module_access: options.module_access } : {}),
    ...(options?.submodule_access ? { submodule_access: options.submodule_access } : {}),
  };
  const res = await api.post<any>(`/tenant/roles/${roleId}/update-permissions/`, payload);
  return res.data;
}

// ── LOCATIONS & BRANCHES ──────────────────────────────────────────────

export async function fetchBranchesApi(): Promise<{ id: string; name: string; code: string; is_active?: boolean }[]> {
  const res = await api.get<any>('/tenant/branches/');
  return toArray<any>(res.data).map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    is_active: b.is_active ?? (b.status === 'ACTIVE'),
  }));
}

export async function fetchDepartmentsApi(): Promise<{ id: string; name: string; code: string }[]> {
  const res = await api.get<any>('/tenant/departments/');
  return toArray<any>(res.data).map((d: any) => ({
    id: d.id,
    name: d.name,
    code: d.code,
  }));
}

export async function fetchLocationsApi(tenantId?: string): Promise<LocationRow[]> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('pos_user_profile') : null;
  let isTenant = false;
  try {
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.user_type === 'tenant' || (parsed.tenantId && !parsed.isSuperAdmin)) {
        isTenant = true;
      }
    }
  } catch {}

  // In tenant session, query tenant branches endpoint (prevents 403 on /platform/locations/)
  if (isTenant) {
    try {
      const res = await api.get<any>('/tenant/branches/');
      return toArray<any>(res.data).map((b: any) => ({
        id: b.id,
        name: b.name,
        city: b.city || b.address || 'Studio',
        address: b.address || '',
        phone: b.phone || '',
        capacity: b.capacity || 100,
        operating_hours: b.operating_hours || '06:00 - 22:00',
        is_active: b.is_active ?? (b.status === 'ACTIVE'),
        created_at: b.created_at,
      }));
    } catch {
      return [];
    }
  }

  const params = tenantId ? `?tenant=${tenantId}` : '';
  const res = await api.get<any>(`/platform/locations/${params}`);
  return toArray<LocationRow>(res.data);
}

export async function fetchTenantsForDropdownApi(): Promise<{ id: string; name: string }[]> {
  const res = await api.get<any>('/platform/tenants/?ordering=name');
  return toArray<any>(res.data).map((t: any) => ({ id: t.id, name: t.name }));
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
  const res = await api.get<TenantSettingsData>("/tenant/organization-settings/current/");
  return res.data;
}

export async function updateTenantSettingsApi(payload: Partial<TenantSettingsData>): Promise<TenantSettingsData> {
  const res = await api.put<TenantSettingsData>("/tenant/organization-settings/current/", payload);
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
  const res = await api.get<AuditLogRow[]>(`/tenant/audit-events/${query}`);
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

// ── SESSION REVOCATION ────────────────────────────────────────────────

export interface RevokeSessionsResponse {
  message: string;
  revoked_count: number;
  revoked_at: number;
}

export async function revokeAllSessionsApi(targetUserId?: string): Promise<RevokeSessionsResponse> {
  const payload = targetUserId ? { target_user_id: targetUserId } : {};
  const res = await api.post<RevokeSessionsResponse>("/auth/sessions/revoke-all/", payload);
  return res.data;
}
