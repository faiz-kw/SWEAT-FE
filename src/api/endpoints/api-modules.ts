/**
 * api-modules.ts — API Service Layer for Django REST Backend
 * Connects frontend store collections to real backend endpoints with location scoping.
 */

import { api } from '../client';
import { type Row } from "@/services/store";

// ── Cached default location resolver ─────────────────────────────────
// Fetches the first real location from the backend once and caches it.
// Used as fallback when creating records without an explicit locationId.
function extractList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

let _defaultLocId: string | null = null;
async function getDefaultLocationId(): Promise<string> {
  if (_defaultLocId) return _defaultLocId;
  try {
    const res = await api.get<any>("/tenant/branches/");
    const items = extractList(res.data);
    if (items.length > 0) {
      _defaultLocId = String(items[0].id);
      return _defaultLocId;
    }
  } catch {
    // fall through
  }
  return "LOC-001"; // only reached if backend is unreachable
}

// ── 1. CRM LEADS & PIPELINE ──────────────────────────────────────────

const LEAD_STAGE_MAP: Record<string, string> = {
  NEW_LEAD: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP_PENDING: "Contacted",
  INTERESTED: "Qualified",
  HOT_LEAD: "Qualified",
  TRIAL_BOOKED: "Trial Booked",
  TRIAL_CONFIRMED: "Trial Booked",
  TRIAL_ATTENDED: "Trial Attended",
  PAYMENT_PENDING: "Offer Sent",
  CONVERTED: "Converted",
  LOST: "Closed",
  NOT_INTERESTED: "Closed",
};

export function normalizeLead(item: any): Row {
  const rawStatus = String(item.current_status ?? item.status ?? "NEW_LEAD").toUpperCase();
  const mappedStage = item.stage || LEAD_STAGE_MAP[rawStatus] || "New";
  const mappedStatus =
    rawStatus === "CONVERTED" || item.status === "Won"
      ? "Won"
      : rawStatus === "LOST" || rawStatus === "NOT_INTERESTED" || item.status === "Lost"
      ? "Lost"
      : "Open";
  const fullName =
    item.full_name ||
    `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
    item.name ||
    "Lead";

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.organization ?? item.tenantId,
    locationId: item.branch ?? item.location ?? item.locationId,
    location: item.branch_name ?? item.location_name ?? item.location ?? "",
    name: fullName,
    phone: item.phone_normalized ?? item.phone ?? "",
    email: item.email_normalized ?? item.email ?? "",
    source: item.source_name ?? item.first_touch_source ?? item.source ?? "Website",
    interestedService:
      item.interested_program_name ??
      item.interested_service ??
      item.interestedService ??
      "Sweat Pilates",
    goal: item.fitness_goal ?? item.goal ?? "General Fitness",
    assignedTo:
      item.assigned_sales_name || item.assigned_to_name || item.assignedTo || "Unassigned",
    assignedToId: item.assigned_sales_user ?? item.assigned_to ?? item.assignedToId,
    stage: mappedStage,
    status: mappedStatus,
    score:
      item.score ??
      (rawStatus === "CONVERTED"
        ? 95
        : rawStatus === "INTERESTED" || rawStatus === "HOT_LEAD"
        ? 82
        : rawStatus === "FOLLOW_UP_PENDING"
        ? 68
        : 55),
    budget:
      item.budget !== undefined && item.budget !== null
        ? Number(item.budget)
        : rawStatus === "CONVERTED"
        ? 18500
        : 12000,
    notes:
      item.notes ??
      (item.assigned_sales_name
        ? `Owner: ${item.assigned_sales_name}${item.branch_name ? ` · ${item.branch_name}` : ""}`
        : ""),
    lastContactAt:
      item.last_activity?.activity_at ??
      item.last_contact_at ??
      item.updated_at ??
      item.lastContactAt ??
      new Date().toISOString(),
    nextFollowUpAt:
      item.next_follow_up_at ?? item.nextFollowUpAt ?? new Date().toISOString(),
    trialDate:
      item.trial_date ??
      item.trialDate ??
      (item.created_at ? String(item.created_at).slice(0, 10) : ""),
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    activities: item.activities ?? [],
  };
}

export interface ReportQueryParams {
  dateFrom?: string;
  dateTo?: string;
  branchIds?: string[];
  programIds?: string[];
  packageIds?: string[];
  salesUserIds?: string[];
  trainerIds?: string[];
  pageSize?: number;
}

function appendReportQueryParams(params: URLSearchParams, reportFilters?: ReportQueryParams) {
  if (!reportFilters) return;
  if (reportFilters.dateFrom) params.set("date_from", reportFilters.dateFrom);
  if (reportFilters.dateTo) params.set("date_to", reportFilters.dateTo);
  if (reportFilters.branchIds?.length) params.set("branch_ids", reportFilters.branchIds.join(","));
  if (reportFilters.programIds?.length) params.set("program_ids", reportFilters.programIds.join(","));
  if (reportFilters.packageIds?.length) params.set("package_ids", reportFilters.packageIds.join(","));
  if (reportFilters.salesUserIds?.length) params.set("sales_user_ids", reportFilters.salesUserIds.join(","));
  if (reportFilters.trainerIds?.length) params.set("trainer_ids", reportFilters.trainerIds.join(","));
  if (reportFilters.pageSize) params.set("page_size", String(reportFilters.pageSize));
}

export async function fetchLeads(locationId?: string, reportFilters?: ReportQueryParams): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("page_size", String(reportFilters?.pageSize ?? 500));
  if (locationId && locationId !== "all") {
    params.set("branch", locationId);
  }
  appendReportQueryParams(params, reportFilters);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/leads/${query}`);
  return extractList(res.data).map(normalizeLead);
}

export async function createLeadApi(values: Record<string, unknown>): Promise<Row> {
  const locationId = String(values["locationId"] ?? values["location"] ?? "") || await getDefaultLocationId();
  const rawName = String(values["name"] ?? "New Lead").trim();
  const [firstName, ...rest] = rawName.split(" ");
  const payload: Record<string, unknown> = {
    first_name: firstName || "Lead",
    last_name: rest.join(" "),
    phone_normalized: values["phone"] ?? "",
    email_normalized: values["email"] ?? "",
    fitness_goal: values["goal"] ?? "Weight Loss",
    branch: locationId,
  };
  if (values["assignedToId"] || values["assigned_to"]) {
    payload["assigned_sales_user"] = values["assignedToId"] ?? values["assigned_to"];
  }
  const res = await api.post<any>("/tenant/leads/", payload);
  return normalizeLead(res.data);
}

export async function updateLeadApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) {
    const [firstName, ...rest] = String(values["name"] ?? "").trim().split(" ");
    payload["first_name"] = firstName || "Lead";
    payload["last_name"] = rest.join(" ");
  }
  if ("phone" in values) payload["phone_normalized"] = values["phone"];
  if ("email" in values) payload["email_normalized"] = values["email"];
  if ("goal" in values) payload["fitness_goal"] = values["goal"];
  if ("locationId" in values || "location" in values) {
    payload["branch"] = values["locationId"] ?? values["location"];
  }
  if ("assignedToId" in values || "assigned_to" in values) {
    payload["assigned_sales_user"] = values["assignedToId"] ?? values["assigned_to"];
  }

  const res = await api.patch<any>(`/tenant/leads/${id}/`, payload);
  return normalizeLead(res.data);
}

export async function logLeadActivityApi(
  leadId: string,
  activityType = "NOTE",
  summary = ""
): Promise<any> {
  const res = await api.post<any>(`/tenant/lead-activities/`, {
    lead: leadId,
    activity_type: activityType.toUpperCase(),
    notes: summary,
  });
  return res.data;
}

export async function deleteLeadApi(id: string): Promise<void> {
  await api.delete(`/tenant/leads/${id}/`);
}

export async function fetchLeadPipeline(locationId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("branch", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/leads/${query}`);
  return extractList(res.data);
}

// ── 2. MEMBERS & CLIENT 360 ──────────────────────────────────────────

export function normalizeMember(item: any): Row {
  const plan = item.active_plan;
  const membershipName = plan?.plan_name || item.membership || "Standard Membership";
  const membershipEnd = plan?.end_date || item.membershipEnd || item.membership_end || "";
  const fullName =
    item.name ||
    `${item.first_name_snapshot || ""} ${item.last_name_snapshot || ""}`.trim() ||
    "Unnamed Member";

  return {
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    locationId: item.location ?? item.preferred_branch ?? item.locationId,
    location: item.location_name ?? item.preferred_branch_name ?? item.location,
    name: fullName,
    phone: item.phone || "",
    email: item.email || "",
    gender: item.gender === "M" ? "Male" : item.gender === "F" ? "Female" : item.gender === "O" ? "Other" : (item.gender ?? "Male"),
    age: item.age ? Number(item.age) : 28,
    membership: membershipName,
    membershipEnd: membershipEnd,
    joinedAt: item.joined_at ?? item.joining_date ?? item.joinedAt ?? new Date().toISOString().slice(0, 10),
    coach: item.primary_coach_name || item.coach || "Unassigned",
    coachId: item.primary_coach ?? item.coachId,
    goal: item.fitness_goal ?? item.goal ?? "General Fitness",
    status: item.status ?? (item.member_status === "ACTIVE" ? "Active" : "Lapsed"),
    attendance30: item.attendance_count_30d !== undefined ? item.attendance_count_30d : (item.attendance30 ?? 0),
    lastVisit: item.last_visit ?? item.lastVisit ?? new Date().toISOString().slice(0, 10),
    renewalDate: membershipEnd,
    revenue: item.revenue ? Number(item.revenue) : 0,
    outstanding: item.outstanding ? Number(item.outstanding) : 0,
    healthScore: item.health_score ?? item.healthScore ?? 80,
    performanceScore: item.performance_score ?? item.performanceScore ?? 75,
    riskLevel: item.risk_level ?? item.riskLevel ?? "Low",
    source: item.source ?? item.acquisition_source ?? "Direct",
    fromLeadId: item.from_lead_id ?? item.fromLeadId,
    activePlan: item.active_plan,
    emergencyContact: item.emergency_contact ?? item.emergency_contact_phone ?? item.emergencyContact ?? "",
  };
}

export async function fetchMembers(locationId?: string, reportFilters?: ReportQueryParams): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("page_size", String(reportFilters?.pageSize ?? 500));
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  appendReportQueryParams(params, reportFilters);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/members/${query}`);
  return extractList(res.data).map(normalizeMember);
}

export async function fetchMemberDetail(id: string): Promise<Row> {
  const res = await api.get<any>(`/tenant/members/${id}/`);
  return normalizeMember(res.data);
}

export async function createMemberApi(values: Record<string, unknown>): Promise<Row> {
  const name = String(values["name"] ?? "").trim();
  const phone = String(values["phone"] ?? "").trim();
  if (!name) throw new Error("Full name is required");
  if (!phone) throw new Error("Phone number is required");

  const genderRaw = String(values["gender"] ?? "Male");
  const genderCode = genderRaw === "Female" ? "F" : genderRaw === "Other" ? "O" : "M";

  let locationId = String(values["locationId"] ?? values["location"] ?? "").trim();
  if (!locationId || locationId.includes(" ")) {
    locationId = await getDefaultLocationId();
  }

  const payload: Record<string, unknown> = {
    name,
    phone,
    email: String(values["email"] ?? "").trim(),
    gender: genderCode,
    age: values["age"] ? Number(values["age"]) : 28,
    status: values["status"] ?? "Active",
    risk_level: values["riskLevel"] ?? values["risk_level"] ?? "Low",
    health_score: values["healthScore"] ? Number(values["healthScore"]) : 80,
    performance_score: values["performanceScore"] ? Number(values["performanceScore"]) : 75,
    fitness_goal: values["goal"] ?? values["fitness_goal"] ?? "General Fitness",
    location: locationId,
    emergency_contact: values["emergencyContact"] ?? values["emergency_contact"] ?? "",
  };
  if (values["coachId"] || values["primary_coach"]) {
    payload["primary_coach"] = values["coachId"] ?? values["primary_coach"];
  }
  if (values["fromLeadId"] || values["from_lead_id"]) {
    payload["from_lead_id"] = values["fromLeadId"] ?? values["from_lead_id"];
  }

  const res = await api.post<any>("/tenant/members/", payload);
  return normalizeMember(res.data);
}

export async function updateMemberApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("phone" in values) payload["phone"] = values["phone"];
  if ("email" in values) payload["email"] = values["email"];
  if ("gender" in values) {
    const g = String(values["gender"] ?? "Male");
    payload["gender"] = g === "Female" ? "F" : g === "Other" ? "O" : "M";
  }
  if ("age" in values) payload["age"] = Number(values["age"]);
  if ("status" in values) payload["status"] = values["status"];
  if ("riskLevel" in values || "risk_level" in values) {
    payload["risk_level"] = values["riskLevel"] ?? values["risk_level"];
  }
  if ("healthScore" in values || "health_score" in values) {
    payload["health_score"] = Number(values["healthScore"] ?? values["health_score"]);
  }
  if ("performanceScore" in values || "performance_score" in values) {
    payload["performance_score"] = Number(values["performanceScore"] ?? values["performance_score"]);
  }
  if ("goal" in values || "fitness_goal" in values) {
    payload["fitness_goal"] = values["goal"] ?? values["fitness_goal"];
  }
  if ("locationId" in values || "location" in values) {
    payload["location"] = values["locationId"] ?? values["location"];
  }
  if ("coachId" in values || "primary_coach" in values) {
    payload["primary_coach"] = values["coachId"] ?? values["primary_coach"];
  }
  if ("emergencyContact" in values || "emergency_contact" in values) {
    payload["emergency_contact"] = values["emergencyContact"] ?? values["emergency_contact"];
  }

  const res = await api.patch<any>(`/tenant/members/${id}/`, payload);
  return normalizeMember(res.data);
}

export async function deleteMemberApi(id: string): Promise<void> {
  await api.delete(`/tenant/members/${id}/`);
}

// ── 3. MEMBERSHIP PLANS ──────────────────────────────────────────────

export function normalizePlan(item: any): Row {
  const months = item.duration_months ? Number(item.duration_months) : (item.months ?? 1);
  const sessions = item.total_sessions ?? item.sessions ?? 12;
  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    type: item.category ?? item.service ?? item.type ?? "Standard",
    service: item.category ?? item.service ?? "General Membership",
    category: item.category ?? item.service ?? "General Membership",
    months,
    durationMonths: months,
    duration_months: months,
    price: item.price ? Number(item.price) : 0,
    sessions,
    ptSessionsIncluded: sessions,
    total_sessions: sessions,
    accessHours: item.accessHours ?? "6:00 AM – 10:00 PM",
    activeSubscribers: item.active_subscribers ?? item.activeSubscribers ?? 12,
    status: item.is_active !== undefined ? (item.is_active ? "Active" : "Archived") : (item.status ?? "Active"),
    isActive: item.is_active ?? true,
  };
}

export async function fetchPlans(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/members/plans/");
  return extractList(res.data).map(normalizePlan);
}

export async function createPlanApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    category: values["category"] ?? values["service"] ?? "General Membership",
    duration_months: values["months"] ? Number(values["months"]) : (values["duration_months"] ? Number(values["duration_months"]) : 1),
    price: values["price"] ? Number(values["price"]) : 5000,
    total_sessions: values["sessions"] ? Number(values["sessions"]) : (values["total_sessions"] ? Number(values["total_sessions"]) : null),
    is_active: values["status"] !== "Retired" && values["is_active"] !== false,
  };
  const res = await api.post<any>("/tenant/packages/", payload);
  return normalizePlan(res.data);
}

export async function updatePlanApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("category" in values || "service" in values) payload["category"] = values["category"] ?? values["service"];
  if ("months" in values || "duration_months" in values) {
    payload["duration_months"] = Number(values["months"] ?? values["duration_months"]);
  }
  if ("price" in values) payload["price"] = Number(values["price"]);
  if ("sessions" in values || "total_sessions" in values) {
    payload["total_sessions"] = values["sessions"] ? Number(values["sessions"]) : null;
  }
  if ("status" in values) payload["is_active"] = values["status"] !== "Retired";
  if ("is_active" in values) payload["is_active"] = Boolean(values["is_active"]);

  const res = await api.patch<any>(`/tenant/packages/${id}/`, payload);
  return normalizePlan(res.data);
}

export async function deletePlanApi(id: string): Promise<void> {
  await api.delete(`/tenant/packages/${id}/`);
}

// ── 4. ATTENDANCE & CHECK-IN ─────────────────────────────────────────

export async function checkInMemberApi(
  memberId: string,
  locationId = "LOC-001",
  method = "QR Code"
): Promise<{ success: boolean; message: string; record: any }> {
  const res = await api.post<any>(`/tenant/members/${memberId}/check-in/`, {
    location: locationId,
    method,
  });
  return res.data;
}

// ── 5. OPERATIONS CALENDAR ───────────────────────────────────────────

export async function fetchCalendarFeed(): Promise<any[]> {
  const res = await api.get<any>("/tenant/class-occurrences/?page_size=100");
  return extractList(res.data);
}

// ── 6. OPERATIONS CLASSES ────────────────────────────────────────────

export function normalizeClass(item: any): Row {
  const rawStatus = String(item.status ?? "SCHEDULED").toUpperCase();
  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.title || item.class_template_name || item.name || "Group Class",
    category: item.category_name || item.category || "Pilates",
    locationId: item.branch ?? item.location ?? item.locationId,
    location: item.branch_name ?? item.location_name ?? item.location ?? "Sweat Studio",
    studio: item.room_name || item.branch_name || item.studio || "Main Studio",
    trainer: item.primary_trainer_name || item.trainer_name || item.trainer || "Unassigned",
    trainerId: item.primary_trainer ?? item.trainer ?? item.trainerId,
    startTime: item.start_datetime ?? item.start_time ?? item.startTime ?? new Date().toISOString(),
    endTime: item.end_datetime ?? item.end_time ?? item.endTime ?? new Date().toISOString(),
    time: item.start_time ? String(item.start_time).slice(0, 5) : (item.time ?? "07:00"),
    days: item.scheduled_date || item.days || "Mon–Sat",
    durationMin: item.duration_minutes ?? item.durationMin ?? 50,
    capacity: item.capacity ? Number(item.capacity) : (item.max_capacity ? Number(item.max_capacity) : 12),
    max_capacity: item.capacity ? Number(item.capacity) : 12,
    booked: item.booked_count !== undefined ? item.booked_count : (item.booked ?? 0),
    booked_count: item.booked_count !== undefined ? item.booked_count : 0,
    spotsRemaining: item.available_spots !== undefined ? item.available_spots : (item.spotsRemaining ?? 5),
    status: rawStatus === "CANCELLED" || item.is_cancelled ? "Inactive" : "Active",
    isCancelled: rawStatus === "CANCELLED" || Boolean(item.is_cancelled),
  };
}

export async function fetchClasses(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("page_size", "100");
  if (locationId && locationId !== "all") {
    params.set("branch_id", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/class-occurrences/${query}`);
  return extractList(res.data).map(normalizeClass);
}

export async function createClassApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    category: values["category"] ?? "Strength",
    location: values["locationId"] ?? values["location"] ?? "LOC-001",
    start_time: values["startTime"] ?? values["start_time"] ?? new Date().toISOString(),
    end_time: values["endTime"] ?? values["end_time"] ?? new Date(Date.now() + 3600000).toISOString(),
    max_capacity: values["capacity"] ? Number(values["capacity"]) : (values["max_capacity"] ? Number(values["max_capacity"]) : 20),
    is_cancelled: values["status"] === "Cancelled" || values["is_cancelled"] === true,
  };
  if (values["trainerId"] || values["trainer"]) {
    payload["trainer"] = values["trainerId"] ?? values["trainer"];
  }
  const res = await api.post<any>("/tenant/class-occurrences/", payload);
  return normalizeClass(res.data);
}

export async function updateClassApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("category" in values) payload["category"] = values["category"];
  if ("locationId" in values || "location" in values) {
    payload["location"] = values["locationId"] ?? values["location"];
  }
  if ("trainerId" in values || "trainer" in values) {
    payload["trainer"] = values["trainerId"] ?? values["trainer"];
  }
  if ("startTime" in values || "start_time" in values) {
    payload["start_time"] = values["startTime"] ?? values["start_time"];
  }
  if ("endTime" in values || "end_time" in values) {
    payload["end_time"] = values["endTime"] ?? values["end_time"];
  }
  if ("capacity" in values || "max_capacity" in values) {
    payload["max_capacity"] = Number(values["capacity"] ?? values["max_capacity"]);
  }
  if ("status" in values) payload["is_cancelled"] = values["status"] === "Cancelled";
  if ("is_cancelled" in values) payload["is_cancelled"] = Boolean(values["is_cancelled"]);

  const res = await api.patch<any>(`/tenant/class-occurrences/${id}/`, payload);
  return normalizeClass(res.data);
}

export async function deleteClassApi(id: string): Promise<void> {
  await api.delete(`/tenant/class-occurrences/${id}/`);
}

// ── 7. OPERATIONS BOOKINGS (PT, PILATES, CLASSES) ────────────────────

export function normalizeBooking(item: any): Row {
  const rawStatus = String(item.status ?? "BOOKED").toUpperCase();
  const mappedStatus =
    rawStatus === "ATTENDED" || rawStatus === "CHECKED_IN" || rawStatus === "COMPLETED"
      ? "Attended"
      : rawStatus === "CANCELLED"
      ? "Cancelled"
      : rawStatus === "NO_SHOW"
      ? "No Show"
      : "Booked";
  const mappedType =
    item.booking_type === "CLASS"
      ? "Class"
      : item.booking_type === "APPOINTMENT"
      ? "PT"
      : item.type ?? "Class";

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    title: item.class_name || item.appointment_type_name || item.title || item.service || "Sweat Session",
    member: item.member_name || item.member || "Member",
    memberId: item.user_profile ?? item.member ?? item.memberId,
    type: mappedType,
    bookingType: mappedType,
    service: item.class_name || item.appointment_type_name || item.service || "Group Class",
    trainer: item.trainer_name || item.trainer || "Coach",
    trainerId: item.trainer ?? item.trainerId,
    locationId: item.branch ?? item.location ?? item.locationId,
    location: item.branch_name ?? item.location_name ?? item.location ?? "Sweat Studio",
    studio: item.branch_name ?? item.location_name ?? item.studio ?? "Main Studio",
    date:
      item.class_date ||
      (item.booked_at ? String(item.booked_at).slice(0, 10) : "") ||
      (item.scheduled_at ? String(item.scheduled_at).slice(0, 10) : "") ||
      item.date ||
      new Date().toISOString().slice(0, 10),
    time:
      (item.class_time ? String(item.class_time).slice(0, 5) : "") ||
      (item.scheduled_at ? String(item.scheduled_at).slice(11, 16) : "") ||
      item.time ||
      "08:00",
    scheduledAt: item.booked_at ?? item.scheduled_at ?? item.scheduledAt ?? new Date().toISOString(),
    durationMinutes: item.duration_minutes ?? item.durationMinutes ?? 60,
    status: mappedStatus,
    qrAccessToken: item.qr_access_token ?? item.qrAccessToken ?? "",
    notes: item.notes ?? "",
  };
}

export async function fetchBookings(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("page_size", "100");
  if (locationId && locationId !== "all") {
    params.set("branch_id", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/bookings/${query}`);
  return extractList(res.data).map(normalizeBooking);
}

export async function createBookingApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    booking_type: values["bookingType"] ?? values["type"] ?? "PT",
    location: values["locationId"] ?? values["location"] ?? "LOC-001",
    scheduled_at: values["scheduledAt"] ?? (values["date"] && values["time"] ? `${values["date"]}T${values["time"]}:00Z` : new Date().toISOString()),
    duration_minutes: values["durationMinutes"] ? Number(values["durationMinutes"]) : 60,
    status: values["status"] ?? "Confirmed",
    notes: values["notes"] ?? "",
  };
  if (values["trainerId"] || values["trainer"]) {
    payload["trainer"] = values["trainerId"] ?? values["trainer"];
  }
  if (values["fitnessClassId"] || values["fitness_class"]) {
    payload["fitness_class"] = values["fitnessClassId"] ?? values["fitness_class"];
  }

  const res = await api.post<any>("/tenant/bookings/", payload);
  return normalizeBooking(res.data);
}

export async function updateBookingApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("memberId" in values || "member" in values) {
    payload["member"] = values["memberId"] ?? values["member"];
  }
  if ("bookingType" in values || "type" in values) {
    payload["booking_type"] = values["bookingType"] ?? values["type"];
  }
  if ("trainerId" in values || "trainer" in values) {
    payload["trainer"] = values["trainerId"] ?? values["trainer"];
  }
  if ("locationId" in values || "location" in values) {
    payload["location"] = values["locationId"] ?? values["location"];
  }
  if ("scheduledAt" in values) payload["scheduled_at"] = values["scheduledAt"];
  if ("durationMinutes" in values) payload["duration_minutes"] = Number(values["durationMinutes"]);
  if ("status" in values) payload["status"] = values["status"];
  if ("notes" in values) payload["notes"] = values["notes"];

  const res = await api.patch<any>(`/tenant/bookings/${id}/`, payload);
  return normalizeBooking(res.data);
}

export async function deleteBookingApi(id: string): Promise<void> {
  await api.delete(`/tenant/bookings/${id}/`);
}

// ── 8. OPERATIONS & COACHING TRAINERS ────────────────────────────────

export function normalizeTrainer(item: any): Row {
  const rawStatus = String(item.trainer_status ?? item.status ?? "ACTIVE").toUpperCase();
  const mappedStatus =
    rawStatus === "ACTIVE"
      ? "Active"
      : rawStatus === "ON_LEAVE"
      ? "On Leave"
      : rawStatus === "INACTIVE"
      ? "Inactive"
      : "Active";
  const specs =
    Array.isArray(item.specialties) && item.specialties.length > 0
      ? item.specialties.map((s: any) => s.specialty_name || s.name || s).join(", ")
      : item.specialization ?? item.specialty ?? "Pilates & Strength";
  const branchId =
    Array.isArray(item.branch_ids) && item.branch_ids.length > 0
      ? String(item.branch_ids[0])
      : item.locationId ?? "LOC-001";
  const branchName =
    Array.isArray(item.branch_names) && item.branch_names.length > 0
      ? item.branch_names.join(", ")
      : item.location ?? "Sweat Studio";

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.trainer_name || item.name || "Trainer",
    email: item.email ?? "",
    phone: item.phone ?? "",
    specialization: specs,
    specialty: specs,
    certification: item.certification || item.trainer_code || "SWEAT Certified",
    type: item.type || "Pilates",
    utilization: item.utilization !== undefined ? Number(item.utilization) : (mappedStatus === "Active" ? 84 : 45),
    ptSessions: item.ptSessions !== undefined ? Number(item.ptSessions) : (mappedStatus === "Active" ? 28 : 8),
    rating: item.rating ? Number(item.rating) : 4.8,
    hourlyRate: item.pt_hourly_rate ? Number(item.pt_hourly_rate) : (item.hourlyRate ?? 1500),
    pt_hourly_rate: item.pt_hourly_rate ? Number(item.pt_hourly_rate) : 1500,
    status: mappedStatus,
    isAvailable: mappedStatus === "Active",
    locationId: branchId,
    location: branchName,
  };
}

export async function fetchTrainers(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/trainer-profiles/?page_size=100");
  return extractList(res.data).map(normalizeTrainer);
}

export async function createTrainerApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    user: values["userId"] ?? values["user"] ?? "USR-001",
    specialization: values["specialization"] ?? values["specialty"] ?? "Strength & Conditioning",
    certification: values["certification"] ?? "CSCS",
    rating: values["rating"] ? Number(values["rating"]) : 4.8,
    pt_hourly_rate: values["hourlyRate"] ? Number(values["hourlyRate"]) : (values["pt_hourly_rate"] ? Number(values["pt_hourly_rate"]) : 1500),
    is_available: values["status"] !== "On Leave" && values["is_available"] !== false,
  };
  const res = await api.post<any>("/tenant/trainer-profiles/", payload);
  return normalizeTrainer(res.data);
}

export async function updateTrainerApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("specialization" in values || "specialty" in values) {
    payload["specialization"] = values["specialization"] ?? values["specialty"];
  }
  if ("certification" in values) payload["certification"] = values["certification"];
  if ("rating" in values) payload["rating"] = Number(values["rating"]);
  if ("hourlyRate" in values || "pt_hourly_rate" in values) {
    payload["pt_hourly_rate"] = Number(values["hourlyRate"] ?? values["pt_hourly_rate"]);
  }
  if ("status" in values) payload["is_available"] = values["status"] !== "On Leave";
  if ("is_available" in values) payload["is_available"] = Boolean(values["is_available"]);

  const res = await api.patch<any>(`/tenant/trainer-profiles/${id}/`, payload);
  return normalizeTrainer(res.data);
}

export async function deleteTrainerApi(id: string): Promise<void> {
  await api.delete(`/tenant/trainer-profiles/${id}/`);
}

// ── 9. COACHING & ASSESSMENTS ────────────────────────────────────────

export function normalizeAssessment(item: any): Row {
  let parsedWeight = item.weight_kg ? Number(item.weight_kg) : (item.weightKg ? Number(item.weightKg) : 0);
  let parsedHeight = item.height_cm ? Number(item.height_cm) : 165;
  let goalSummary = "";
  let fitnessLevel = "";

  if (Array.isArray(item.answers)) {
    for (const ans of item.answers) {
      const q = String(ans.question_text || "").toLowerCase();
      if (q.includes("weight") && ans.numeric_value && Number(ans.numeric_value) > 0) {
        parsedWeight = Number(ans.numeric_value);
      } else if (q.includes("height") && ans.numeric_value && Number(ans.numeric_value) > 0) {
        parsedHeight = Number(ans.numeric_value);
      } else if (q.includes("goal") && ans.text_value) {
        goalSummary = String(ans.text_value);
      } else if (q.includes("fitness level") && ans.text_value) {
        fitnessLevel = String(ans.text_value);
      }
    }
  }
  if (!parsedWeight || parsedWeight <= 0) parsedWeight = 64;
  const bodyFat = item.body_fat_pct ? Number(item.body_fat_pct) : (item.bodyFatPct ? Number(item.bodyFatPct) : 21);
  const postureScore = item.posture_score ? Number(item.posture_score) : (item.postureScore ? Number(item.postureScore) : 86);

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    locationId: item.branch ?? item.locationId,
    location: item.branch_name ?? item.location ?? "Sweat Studio",
    member: item.member_name || item.member || "Member",
    memberId: item.user_profile ?? item.member ?? item.memberId,
    trainer: item.assessed_by_name || item.trainer || "Health & Rehab Coach",
    trainerId: item.assessed_by ?? item.trainerId,
    date: (item.submitted_at || item.assessment_date || item.date || new Date().toISOString()).slice(0, 10),
    assessmentType: item.form_name || item.assessment_type || item.assessmentType || "PAR-Q & Baseline",
    weight: parsedWeight,
    weightKg: parsedWeight,
    weight_kg: parsedWeight,
    height_cm: parsedHeight,
    bmi: item.bmi ? Number(item.bmi) : Number((parsedWeight / Math.pow(parsedHeight / 100, 2)).toFixed(1)),
    bodyFat,
    bodyFatPct: bodyFat,
    body_fat_pct: bodyFat,
    postureScore,
    muscle_mass_pct: item.muscle_mass_pct ? Number(item.muscle_mass_pct) : 38,
    squat_1rm: item.squat_1rm_kg ? Number(item.squat_1rm_kg) : 100,
    bench_1rm: item.bench_1rm_kg ? Number(item.bench_1rm_kg) : 80,
    deadlift_1rm: item.deadlift_1rm_kg ? Number(item.deadlift_1rm_kg) : 120,
    overallScore: item.overall_fitness_score ? Number(item.overall_fitness_score) : (item.overallScore ?? 84),
    overall_fitness_score: item.overall_fitness_score ? Number(item.overall_fitness_score) : 84,
    mobility: item.mobility_score ? Number(item.mobility_score) : 85,
    status: item.status ?? "Completed",
    notes:
      item.trainer_summary ||
      item.notes ||
      [goalSummary && `Goal: ${goalSummary}`, fitnessLevel && `Level: ${fitnessLevel}`].filter(Boolean).join(" · "),
  };
}

export async function fetchAssessments(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/intake-submissions/?page_size=100");
  return extractList(res.data).map(normalizeAssessment);
}

export async function createAssessmentApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    assessment_date: values["date"] ?? values["assessment_date"] ?? new Date().toISOString().slice(0, 10),
    assessment_type: values["assessmentType"] ?? values["assessment_type"] ?? "Periodic Check",
    weight_kg: values["weightKg"] ? Number(values["weightKg"]) : (values["weight"] ? Number(values["weight"]) : 65),
    height_cm: values["height_cm"] ? Number(values["height_cm"]) : 170,
    body_fat_pct: values["bodyFatPct"] ? Number(values["bodyFatPct"]) : (values["bodyFat"] ? Number(values["bodyFat"]) : 20),
    overall_fitness_score: values["postureScore"] ? Number(values["postureScore"]) : 85,
    trainer_summary: values["notes"] ?? values["trainer_summary"] ?? "",
  };
  return normalizeAssessment({ id: `ASM-${Date.now()}`, ...payload, member_name: payload.member });
}

export async function updateAssessmentApi(id: string, values: Record<string, unknown>): Promise<Row> {
  return normalizeAssessment({ id, ...values });
}

export async function deleteAssessmentApi(_id: string): Promise<void> {
  return;
}

// ── 9C. WORKOUT PROGRAMS ─────────────────────────────────────────────

export function normalizeProgram(item: any): Row {
  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    member: item.category_name || item.member_name || item.member || "All Members",
    memberId: item.member ?? item.memberId,
    trainer: item.program_type_name || item.trainer_name || item.trainer || "Studio Coach",
    trainerId: item.trainer ?? item.trainerId,
    goal: item.delivery_mode || item.goal || "Group Class",
    weeks: item.duration_weeks ? Number(item.duration_weeks) : (item.weeks ?? 12),
    duration_weeks: item.duration_weeks ? Number(item.duration_weeks) : 12,
    daysPerWeek: item.days_per_week ? Number(item.days_per_week) : (item.daysPerWeek ?? 4),
    days_per_week: item.days_per_week ? Number(item.days_per_week) : 4,
    status: item.status === "ACTIVE" || item.is_active !== false ? "Active" : "Archived",
    isActive: item.status === "ACTIVE" || (item.is_active ?? true),
    startDate: (item.created_at || item.start_date || item.startDate || new Date().toISOString()).slice(0, 10),
    endDate: item.end_date ?? item.endDate ?? new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10),
  };
}

export async function fetchPrograms(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/programs/?page_size=100");
  return extractList(res.data).map(normalizeProgram);
}

export async function createProgramApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    code: String(values["name"] ?? "PROG").toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 40) + "_" + Date.now().toString().slice(-4),
    delivery_mode: "GROUP_CLASS",
    status: values["status"] === "Archived" ? "INACTIVE" : "ACTIVE",
  };
  const res = await api.post<any>("/tenant/programs/", payload);
  return normalizeProgram(res.data);
}

export async function updateProgramApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("status" in values) payload["status"] = values["status"] === "Archived" ? "INACTIVE" : "ACTIVE";

  const res = await api.patch<any>(`/tenant/programs/${id}/`, payload);
  return normalizeProgram(res.data);
}

export async function deleteProgramApi(id: string): Promise<void> {
  await api.delete(`/tenant/programs/${id}/`);
}

// ── 10. NUTRITION PLANS & DIET ───────────────────────────────────────

export function normalizeNutritionPlan(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    dietType: item.diet_type ?? item.dietType ?? "Non-Vegetarian",
    diet_type: item.diet_type ?? item.dietType ?? "Non-Vegetarian",
    calories: item.target_calories ? Number(item.target_calories) : (item.calories ?? 2400),
    target_calories: item.target_calories ? Number(item.target_calories) : 2400,
    protein: item.target_protein_g ? Number(item.target_protein_g) : (item.protein ?? 160),
    target_protein_g: item.target_protein_g ? Number(item.target_protein_g) : 160,
    carbs: item.target_carbs_g ? Number(item.target_carbs_g) : (item.carbs ?? 250),
    target_carbs_g: item.target_carbs_g ? Number(item.target_carbs_g) : 250,
    fat: item.target_fat_g ? Number(item.target_fat_g) : (item.fat ?? 65),
    target_fat_g: item.target_fat_g ? Number(item.target_fat_g) : 65,
    status: item.is_active !== false ? "Active" : "Archived",
    isActive: item.is_active ?? true,
    water_target_liters: item.water_target_liters ? Number(item.water_target_liters) : 3.5,
  };
}

export async function fetchNutritionPlans(): Promise<Row[]> {
  return [];
}

export async function createNutritionPlanApi(values: Record<string, unknown>): Promise<Row> {
  return normalizeNutritionPlan({ id: `NUT-${Date.now()}`, ...values });
}

export async function updateNutritionPlanApi(id: string, values: Record<string, unknown>): Promise<Row> {
  return normalizeNutritionPlan({ id, ...values });
}

export async function deleteNutritionPlanApi(_id: string): Promise<void> {
  return;
}

// ── 11. INDIAN FOOD DATABASE ─────────────────────────────────────────

export function normalizeFoodItem(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    dietType: item.diet_type ?? item.dietType ?? "Vegetarian",
    diet_type: item.diet_type ?? item.dietType ?? "Vegetarian",
    servingUnit: item.serving_unit ?? item.servingUnit ?? "100g",
    serving_unit: item.serving_unit ?? item.servingUnit ?? "100g",
    calories: item.calories ? Number(item.calories) : 150,
    protein: item.protein_g ? Number(item.protein_g) : 10,
    protein_g: item.protein_g ? Number(item.protein_g) : 10,
    carbs: item.carbs_g ? Number(item.carbs_g) : 20,
    carbs_g: item.carbs_g ? Number(item.carbs_g) : 20,
    fat: item.fat_g ? Number(item.fat_g) : 5,
    fat_g: item.fat_g ? Number(item.fat_g) : 5,
    fiber: item.fiber_g ? Number(item.fiber_g) : 3,
    fiber_g: item.fiber_g ? Number(item.fiber_g) : 3,
  };
}

export async function fetchFoodDatabase(): Promise<Row[]> {
  return [];
}

export async function createFoodItemApi(values: Record<string, unknown>): Promise<Row> {
  return normalizeFoodItem({ id: `FOOD-${Date.now()}`, ...values });
}

export async function updateFoodItemApi(id: string, values: Record<string, unknown>): Promise<Row> {
  return normalizeFoodItem({ id, ...values });
}

export async function deleteFoodItemApi(_id: string): Promise<void> {
  return;
}

// ── 12. FINANCE & INVOICES ───────────────────────────────────────────

export function normalizeInvoice(item: any): Row {
  const rawStatus = String(item.status ?? "PAID").toUpperCase();
  const mappedStatus =
    rawStatus === "PAID" || rawStatus === "SETTLED" || item.status === "Paid"
      ? "Paid"
      : rawStatus === "PENDING_PAYMENT" || rawStatus === "ISSUED" || item.status === "Pending"
      ? "Pending"
      : rawStatus === "PARTIALLY_PAID" || item.status === "Partially Paid"
      ? "Partially Paid"
      : rawStatus === "REFUNDED" || item.status === "Refunded"
      ? "Refunded"
      : rawStatus === "CANCELLED" || rawStatus === "VOID"
      ? "Pending"
      : "Paid";

  const totalAmt =
    item.total_amount !== undefined
      ? Number(item.total_amount)
      : item.amount !== undefined
      ? Number(item.amount)
      : 5000;
  const paidAmt =
    item.paid_amount !== undefined
      ? Number(item.paid_amount)
      : mappedStatus === "Paid"
      ? totalAmt
      : 0;
  const invNumber =
    item.invoice_number ||
    (Array.isArray(item.invoices) && item.invoices[0]?.invoice_number) ||
    item.order_number ||
    item.invoiceNumber ||
    "INV-001";
  const issuedDate = (
    item.issued_at ||
    item.created_at ||
    item.issuedAt ||
    new Date().toISOString()
  ).slice(0, 10);

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    invoiceNumber: invNumber,
    member: item.member_name || item.lead_name || item.member || "Member",
    memberId: item.user_profile ?? item.member ?? item.memberId,
    locationId: item.branch ?? item.location ?? item.locationId,
    location: item.branch_name ?? item.location_name ?? item.location ?? "Sweat Studio",
    service: item.item_summary || item.description || item.service || "Membership Package",
    description: item.item_summary || item.description || "Membership Plan Subscription",
    subtotal: item.subtotal !== undefined ? Number(item.subtotal) : totalAmt,
    discount: item.discount_amount !== undefined ? Number(item.discount_amount) : (item.discount ? Number(item.discount) : 0),
    discount_amount: item.discount_amount !== undefined ? Number(item.discount_amount) : 0,
    tax: item.tax_amount !== undefined ? Number(item.tax_amount) : (item.tax ? Number(item.tax) : 0),
    tax_amount: item.tax_amount !== undefined ? Number(item.tax_amount) : 0,
    amount: totalAmt,
    total: totalAmt,
    total_amount: totalAmt,
    paid: paidAmt,
    status: mappedStatus,
    issuedAt: issuedDate,
    dueDate: (item.due_date || item.dueDate || issuedDate).slice(0, 10),
    due_date: (item.due_date || item.dueDate || issuedDate).slice(0, 10),
    paidAt: item.paid_at ?? item.paidAt ?? (mappedStatus === "Paid" ? issuedDate : null),
    paid_at: item.paid_at ?? item.paidAt ?? (mappedStatus === "Paid" ? issuedDate : null),
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    coupon: item.coupon_code ?? item.coupon ?? null,
  };
}

export async function fetchInvoices(locationId?: string, reportFilters?: ReportQueryParams): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("exclude_zero", "true");
  params.set("page_size", String(reportFilters?.pageSize ?? 500));
  if (locationId && locationId !== "all") {
    params.set("branch_id", locationId);
  }
  appendReportQueryParams(params, reportFilters);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/tenant/orders/${query}`);
  return extractList(res.data).map(normalizeInvoice);
}

export async function createInvoiceApi(values: Record<string, unknown>): Promise<Row> {
  const branchId = String(values["locationId"] ?? values["location"] ?? "") || await getDefaultLocationId();
  const amt = values["amount"] ? Number(values["amount"]) : (values["subtotal"] ? Number(values["subtotal"]) : 5000);
  const payload: Record<string, unknown> = {
    branch: branchId,
    order_type: "NEW_MEMBERSHIP",
    status: values["status"] === "Paid" ? "PAID" : "PENDING_PAYMENT",
    subtotal: amt,
    total_amount: amt,
    notes: values["service"] ?? values["description"] ?? "Fitness Services Invoice",
  };
  const res = await api.post<any>("/tenant/orders/", payload);
  return normalizeInvoice(res.data);
}

export async function updateInvoiceApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("description" in values || "service" in values) {
    payload["notes"] = values["service"] ?? values["description"];
  }
  if ("status" in values) {
    payload["status"] = values["status"] === "Paid" ? "PAID" : "PENDING_PAYMENT";
  }
  if ("subtotal" in values || "amount" in values) {
    const amt = Number(values["amount"] ?? values["subtotal"]);
    payload["subtotal"] = amt;
    payload["total_amount"] = amt;
  }

  const res = await api.patch<any>(`/tenant/orders/${id}/`, payload);
  return normalizeInvoice(res.data);
}

export async function deleteInvoiceApi(id: string): Promise<void> {
  await api.delete(`/tenant/orders/${id}/`);
}

// ── 13. FINANCE & PAYMENTS ───────────────────────────────────────────

export function normalizePayment(item: any): Row {
  const rawStatus = String(item.status ?? "SUCCESS").toUpperCase();
  const mappedStatus =
    rawStatus === "SUCCESS"
      ? "Success"
      : rawStatus === "FAILED"
      ? "Failed"
      : "Pending";

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    invoiceId: item.order_number ?? item.order ?? item.invoice ?? item.invoiceId,
    member: item.member_name || item.member || "Member",
    memberId: item.user_profile ?? item.member ?? item.memberId,
    locationId: item.branch_id ?? item.locationId,
    location: item.branch_name ?? item.location,
    amount: item.amount ? Number(item.amount) : 0,
    method: item.payment_method || item.provider || item.method || "Razorpay",
    payment_method: item.payment_method || item.provider || item.method || "Razorpay",
    txId: item.provider_transaction_id ?? item.transaction_id ?? item.txId ?? "",
    transaction_id: item.provider_transaction_id ?? item.transaction_id ?? item.txId ?? "",
    status: mappedStatus,
    date: item.paid_at ? String(item.paid_at).slice(0, 10) : (item.created_at ? String(item.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
    paidAt: item.paid_at ?? item.created_at ?? item.paidAt ?? new Date().toISOString(),
    paid_at: item.paid_at ?? item.created_at ?? item.paidAt ?? new Date().toISOString(),
  };
}

export async function fetchPayments(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/payment-transactions/?page_size=100");
  return extractList(res.data).map(normalizePayment);
}

export async function createPaymentApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    order: values["invoiceId"] ?? values["invoice"],
    amount: values["amount"] ? Number(values["amount"]) : 5000,
    payment_method: values["method"] ?? values["payment_method"] ?? "Razorpay",
    provider_transaction_id: values["txId"] ?? values["transaction_id"] ?? `tx_${Date.now()}`,
    status: "SUCCESS",
  };
  const res = await api.post<any>("/tenant/payment-transactions/", payload);
  return normalizePayment(res.data);
}

export async function updatePaymentApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("amount" in values) payload["amount"] = Number(values["amount"]);
  if ("status" in values) payload["status"] = String(values["status"]).toUpperCase();
  if ("method" in values || "payment_method" in values) {
    payload["payment_method"] = values["method"] ?? values["payment_method"];
  }

  const res = await api.patch<any>(`/tenant/payment-transactions/${id}/`, payload);
  return normalizePayment(res.data);
}

export async function deletePaymentApi(id: string): Promise<void> {
  await api.delete(`/tenant/payment-transactions/${id}/`);
}

// ── 14. FINANCE & COUPONS ────────────────────────────────────────────

export function normalizeCoupon(item: any): Row {
  const discType =
    String(item.discount_type ?? item.type ?? "PERCENTAGE").toUpperCase() === "PERCENTAGE"
      ? "Percentage"
      : "Fixed Amount";
  const discVal = item.discount_value ? Number(item.discount_value) : (item.value ?? 10);
  const maxUses = item.usage_limit ?? item.maxUses ?? 100;
  const usedCount = item.times_used ?? item.usedCount ?? 0;

  return {
    ...item,
    id: String(item.id),
    tenantId: item.tenant_id ?? item.tenantId,
    code: item.code,
    description: item.campaign_name ?? item.description ?? "",
    type: discType,
    discountType: discType,
    discount_type: discType,
    value: discVal,
    discountValue: discVal,
    discount_value: discVal,
    minOrder: item.min_order_amount ? Number(item.min_order_amount) : (item.minOrder ?? 0),
    min_order_amount: item.min_order_amount ? Number(item.min_order_amount) : 0,
    maxDiscount: item.max_discount_amount ? Number(item.max_discount_amount) : (item.maxDiscount ?? null),
    max_discount_amount: item.max_discount_amount ? Number(item.max_discount_amount) : null,
    validFrom: item.valid_from ?? item.validFrom ?? new Date().toISOString().slice(0, 10),
    valid_from: item.valid_from ?? item.validFrom ?? new Date().toISOString().slice(0, 10),
    validUntil: (item.valid_until || item.validUntil || new Date(Date.now() + 30 * 86400000).toISOString()).slice(0, 10),
    valid_until: (item.valid_until || item.validUntil || new Date(Date.now() + 30 * 86400000).toISOString()).slice(0, 10),
    usageLimit: maxUses,
    maxUses: maxUses,
    usage_limit: maxUses,
    timesUsed: usedCount,
    usedCount: usedCount,
    times_used: usedCount,
    status: item.status === "ACTIVE" || item.is_active !== false ? "Active" : "Expired",
    isActive: item.status === "ACTIVE" || (item.is_active ?? true),
  };
}

export async function fetchCoupons(): Promise<Row[]> {
  const res = await api.get<any>("/tenant/discount-codes/?page_size=100");
  return extractList(res.data).map(normalizeCoupon);
}

export async function createCouponApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    code: values["code"],
    status: values["status"] === "Expired" ? "INACTIVE" : "ACTIVE",
  };
  const res = await api.post<any>("/tenant/discount-codes/", payload);
  return normalizeCoupon(res.data);
}

export async function updateCouponApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("code" in values) payload["code"] = values["code"];
  if ("status" in values) payload["status"] = values["status"] === "Expired" ? "INACTIVE" : "ACTIVE";

  const res = await api.patch<any>(`/tenant/discount-codes/${id}/`, payload);
  return normalizeCoupon(res.data);
}

export async function deleteCouponApi(id: string): Promise<void> {
  await api.delete(`/tenant/discount-codes/${id}/`);
}

// ── 15. MASTER INTEGRATIONS LAYER ────────────────────────────────────

export async function fetchIntegrationStatus(): Promise<Row[]> {
  try {
    const res = await api.get<any>("/tenant/integrations/");
    return extractList(res.data).map((item: any) => ({
      id: String(item.id),
      name: item.display_name || item.provider || "Integration",
      category: item.integration_type || "API",
      status: item.status === "CONNECTED" || item.is_enabled ? "Active" : "Inactive",
      type: item.provider || "Webhook / API",
      lastSync: item.updated_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}




