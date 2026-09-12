/**
 * api-platform.ts — API client for Platform (Super Admin) Endpoints
 * 100% Real REST Backend Architecture with PostgreSQL Persistence
 */

import { api } from "./api";
import { type Row } from "./store";

export interface TenantRow extends Row {
  name: string;
  slug: string;
  status: "Active" | "Suspended" | "Trial" | "Expired";
  tier: "Starter" | "Growth" | "Enterprise";
  plan?: string;
  plan_name?: string;
  contact_email?: string;
  phone?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  max_locations?: number;
  max_members?: number;
  members_count?: number;
  active_members_count?: number;
  total_paid_revenue?: number;
  pending_revenue?: number;
  enabled_modules?: string[];
  locations?: any[];
  branding?: any;
  usage?: any;
  created_at?: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalLocations: number;
  monthlyRecurringRevenue: number;
  currency: string;
}

export interface UsageSnapshot {
  date: string;
  members: number;
  storage_mb: number;
  ai_minutes: number;
  api_requests: number;
}

export interface TenantUsageRow {
  tenant: string;
  tenant_id: string;
  tenant_name: string;
  tenant_tier: string;
  plan_name?: string;
  active_members_count: number;
  locations_count: number;
  trainers_count: number;
  storage_used_mb: number;
  ai_minutes_used: number;
  api_requests_count: number;
  max_members: number;
  max_locations: number;
  max_trainers: number;
  max_ai_minutes: number;
  max_storage_mb: number;
  max_api_requests?: number;
  member_utilization_pct?: number;
  voice_utilization_pct?: number;
  storage_utilization_pct?: number;
  api_utilization_pct?: number;
  overall_utilization_pct?: number;
  status_label: string;
  status_tone?: "positive" | "warn" | "critical";
  billing_period?: string;
  historical_snapshots?: UsageSnapshot[];
  last_calculated_at: string;
}

export interface UsageSummaryMetrics {
  totalTenants?: number;
  activeManagedMembers: number;
  aiVoiceCallingMinutes: number;
  mediaStorageConsumedGB: number;
  totalApiRequests?: number;
  brandsNearingQuotaCount: number;
  brandsNearingQuotaText: string;
}

export interface SubscriptionItem {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantLogo: string;
  plan: string;
  tier: string;
  cycle: "Monthly" | "Annual";
  mrr: number;
  paymentMethod: string;
  status: "Active" | "Past Due" | "Trialing" | "Scheduled Renewal";
  nextBillingDate: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  baseAmount: number;
  gstAmount: number;
  date: string;
  status: "Paid" | "Processing" | "Failed";
  pdfUrl: string;
}

export interface OnboardTenantPayload {
  brand_name: string;
  slug?: string;
  tier: "Starter" | "Growth" | "Enterprise";
  plan_id?: string;
  currency: string;
  timezone: string;
  location_name: string;
  city: string;
  address?: string;
  admin_first_name: string;
  admin_last_name?: string;
  admin_email: string;
  admin_phone?: string;
  admin_password: string;
  enabled_modules?: string[];
}

export interface PlatformPlanRow extends Row {
  name: string;
  code: string;
  description: string;
  price_monthly: number | string;
  price_annual: number | string;
  currency: string;
  max_locations: number;
  max_members: number;
  max_trainers: number;
  ai_voice_minutes: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  tenants_count?: number;
}

export interface MarketplaceAppRow {
  id: string;
  name: string;
  category: "AI & Voice" | "Payments" | "Messaging" | "Access Control" | "Accounting";
  icon_text: string;
  developer: string;
  description: string;
  price_monthly: number | string;
  required_tier: "Starter" | "Growth" | "Enterprise";
  is_popular: boolean;
  is_active: boolean;
  is_installed: boolean;
  logo_storage_key?: string | null;
  logo_url?: string | null;
  installation_id?: string | null;
}

function extractList<T>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  return [];
}

// ── TENANTS ──────────────────────────────────────────────────────────

export async function fetchTenantsApi(): Promise<TenantRow[]> {
  const res = await api.get<any>("/platform/tenants/");
  return extractList<TenantRow>(res.data);
}

export async function fetchPlatformMetricsApi(): Promise<PlatformMetrics> {
  const res = await api.get<PlatformMetrics>("/platform/tenants/metrics/");
  return res.data;
}

export async function toggleTenantStatusApi(tenantId: string, newStatus: string): Promise<TenantRow> {
  const res = await api.post<TenantRow>(`/platform/tenants/${tenantId}/toggle-status/`, { status: newStatus });
  return res.data;
}

export async function updateTenantApi(tenantId: string, data: Partial<TenantRow>): Promise<TenantRow> {
  const res = await api.patch<TenantRow>(`/platform/tenants/${tenantId}/`, data);
  return res.data;
}

export async function fetchTenantDetailsApi(tenantId: string): Promise<TenantRow> {
  const res = await api.get<TenantRow>(`/platform/tenants/${tenantId}/`);
  return res.data;
}

export async function impersonateTenantApi(tenantId: string): Promise<{
  access: string;
  user: any;
  tenant: TenantRow;
  message: string;
}> {
  const res = await api.post<any>(`/platform/tenants/${tenantId}/impersonate/`, {});
  return res.data;
}

export async function exitImpersonateApi(): Promise<{
  access: string;
  user: any;
  message: string;
}> {
  const res = await api.post<any>("/platform/tenants/exit-impersonate/", {});
  return res.data;
}

export async function onboardTenantApi(payload: OnboardTenantPayload): Promise<any> {
  const res = await api.post<any>("/platform/onboard/", payload);
  return res.data;
}

// ── PLANS ────────────────────────────────────────────────────────────

export async function fetchPlatformPlansApi(): Promise<PlatformPlanRow[]> {
  const res = await api.get<any>("/platform/plans/");
  return extractList<PlatformPlanRow>(res.data);
}

export async function createPlatformPlanApi(payload: Partial<PlatformPlanRow>): Promise<PlatformPlanRow> {
  const res = await api.post<PlatformPlanRow>("/platform/plans/", payload);
  return res.data;
}

export async function updatePlatformPlanApi(planId: string, payload: Partial<PlatformPlanRow>): Promise<PlatformPlanRow> {
  const res = await api.patch<PlatformPlanRow>(`/platform/plans/${planId}/`, payload);
  return res.data;
}

export async function deletePlatformPlanApi(planId: string): Promise<void> {
  await api.delete(`/platform/plans/${planId}/`);
}

// ── USAGE & LIMITS ────────────────────────────────────────────────────

export async function fetchTenantUsageApi(tier?: string, search?: string): Promise<TenantUsageRow[]> {
  const params = new URLSearchParams();
  if (tier && tier !== "all") params.set("tier", tier);
  if (search) params.set("search", search);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/platform/usage/${query}`);
  return extractList<TenantUsageRow>(res.data);
}

export async function fetchTenantUsageSummaryApi(): Promise<UsageSummaryMetrics> {
  const res = await api.get<UsageSummaryMetrics>("/platform/usage/summary/");
  return res.data;
}

export async function fetchTenantUsageDetailsApi(tenantId: string): Promise<TenantUsageRow> {
  const res = await api.get<TenantUsageRow>(`/platform/usage/${tenantId}/details/`);
  return res.data;
}

// ── MARKETPLACE APPS ──────────────────────────────────────────────────

export async function fetchMarketplaceAppsApi(category?: string): Promise<MarketplaceAppRow[]> {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/platform/marketplace/${query}`);
  return extractList<MarketplaceAppRow>(res.data);
}

export async function toggleMarketplaceAppInstallationApi(appId: string, tenantId?: string): Promise<{
  app_id: string;
  app_name: string;
  is_installed: boolean;
  message: string;
}> {
  const res = await api.post<any>(`/platform/marketplace/${appId}/toggle-install/`, { tenant_id: tenantId });
  return res.data;
}

// ── BILLING & INVOICES ────────────────────────────────────────────────

export async function fetchPlatformSubscriptionsApi(): Promise<SubscriptionItem[]> {
  const res = await api.get<any>("/platform/subscriptions/");
  return extractList<SubscriptionItem>(res.data);
}

export async function fetchPlatformInvoicesApi(): Promise<InvoiceItem[]> {
  const res = await api.get<any>("/platform/invoices/");
  return extractList<InvoiceItem>(res.data);
}

// ── BRANDING ─────────────────────────────────────────────────────────

export interface TenantBrandingData {
  tenant?: string;
  app_name: string;
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color?: string;
  accent_color: string;
  theme_preset_code?: string;
  theme_tokens?: Record<string, any> | null;
  custom_domain?: string;
  cname_verified?: boolean;
  email_footer?: string;
  support_email?: string;
  support_phone?: string;
  logo_storage_key?: string | null;
  favicon_storage_key?: string | null;
  login_logo_key?: string | null;
  login_background_key?: string | null;
  email_logo_key?: string | null;
  remove_watermark?: boolean;
  login_tagline?: string;
  updated_at?: string;
}

export interface DnsVerificationResult {
  success: boolean;
  custom_domain: string;
  cname_verified: boolean;
  cname_target: string;
  txt_verification: string;
  ssl_status: string;
  message: string;
}

export async function fetchTenantBrandingApi(tenantId: string): Promise<TenantBrandingData> {
  const res = await api.get<TenantBrandingData>(`/platform/branding/${tenantId}/`);
  return res.data;
}

export async function updateTenantBrandingApi(tenantId: string, branding: Partial<TenantBrandingData>): Promise<TenantBrandingData> {
  const res = await api.patch<TenantBrandingData>(`/platform/branding/${tenantId}/`, branding);
  return res.data;
}

export async function verifyTenantDnsApi(tenantId: string, domain: string): Promise<DnsVerificationResult> {
  const res = await api.post<DnsVerificationResult>(`/platform/branding/${tenantId}/verify-dns/`, { domain });
  return res.data;
}


