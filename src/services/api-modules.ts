/**
 * api-modules.ts — API Service Layer for Django REST Backend
 * Connects frontend store collections to real backend endpoints with location scoping.
 */

import { api } from "./api";
import { type Row } from "@/services/store";

// ── Cached default location resolver ─────────────────────────────────
// Fetches the first real location from the backend once and caches it.
// Used as fallback when creating records without an explicit locationId.
let _defaultLocId: string | null = null;
async function getDefaultLocationId(): Promise<string> {
  if (_defaultLocId) return _defaultLocId;
  try {
    const res = await api.get<any>("/platform/locations/");
    const items: any[] = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
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

export function normalizeLead(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    locationId: item.location ?? item.locationId,
    location: item.location_name ?? item.location,
    name: item.name,
    phone: item.phone,
    email: item.email,
    source: item.source,
    interestedService: item.interested_service ?? item.interestedService,
    goal: item.goal,
    assignedTo: item.assigned_to_name || item.assignedTo || "Unassigned",
    assignedToId: item.assigned_to ?? item.assignedToId,
    stage: item.stage,
    status: item.status,
    score: item.score ?? 0,
    budget: item.budget !== undefined && item.budget !== null ? Number(item.budget) : 0,
    notes: item.notes ?? "",
    lastContactAt: item.last_contact_at ?? item.lastContactAt ?? new Date().toISOString(),
    nextFollowUpAt: item.next_follow_up_at ?? item.nextFollowUpAt ?? new Date().toISOString(),
    trialDate: item.trial_date ?? item.trialDate,
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    activities: item.activities ?? [],
  };
}

export async function fetchLeads(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any[]>(`/crm/leads/${query}`);
  return (res.data || []).map(normalizeLead);
}

export async function createLeadApi(values: Record<string, unknown>): Promise<Row> {
  const locationId = String(values["locationId"] ?? values["location"] ?? "") || await getDefaultLocationId();
  const payload: Record<string, unknown> = {
    name: values["name"],
    phone: values["phone"] ?? "",
    email: values["email"] ?? "",
    source: values["source"] ?? "Instagram",
    interested_service: values["interestedService"] ?? values["interested_service"] ?? "General Fitness",
    goal: values["goal"] ?? "Weight Loss",
    stage: values["stage"] ?? "New",
    status: values["status"] ?? "Open",
    score: values["score"] ? Number(values["score"]) : 50,
    budget: values["budget"] ? Number(values["budget"]) : 10000,
    notes: values["notes"] ?? "",
    location: locationId,
  };
  if (values["assignedToId"] || values["assigned_to"]) {
    payload["assigned_to"] = values["assignedToId"] ?? values["assigned_to"];
  }
  const res = await api.post<any>("/crm/leads/", payload);
  return normalizeLead(res.data);
}

export async function updateLeadApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("phone" in values) payload["phone"] = values["phone"];
  if ("email" in values) payload["email"] = values["email"];
  if ("source" in values) payload["source"] = values["source"];
  if ("interestedService" in values || "interested_service" in values) {
    payload["interested_service"] = values["interestedService"] ?? values["interested_service"];
  }
  if ("goal" in values) payload["goal"] = values["goal"];
  if ("stage" in values) payload["stage"] = values["stage"];
  if ("status" in values) payload["status"] = values["status"];
  if ("score" in values) payload["score"] = Number(values["score"]);
  if ("budget" in values) payload["budget"] = Number(values["budget"]);
  if ("notes" in values) payload["notes"] = values["notes"];
  if ("locationId" in values || "location" in values) {
    payload["location"] = values["locationId"] ?? values["location"];
  }
  if ("trialDate" in values || "trial_date" in values) {
    payload["trial_date"] = values["trialDate"] ?? values["trial_date"];
  }
  if ("assignedToId" in values || "assigned_to" in values) {
    payload["assigned_to"] = values["assignedToId"] ?? values["assigned_to"];
  }

  const res = await api.patch<any>(`/crm/leads/${id}/`, payload);
  return normalizeLead(res.data);
}

export async function logLeadActivityApi(
  leadId: string,
  activityType = "Note",
  summary = ""
): Promise<any> {
  const res = await api.post<any>(`/crm/leads/${leadId}/activities/`, {
    activity_type: activityType,
    summary,
  });
  return res.data;
}

export async function deleteLeadApi(id: string): Promise<void> {
  await api.delete(`/crm/leads/${id}/`);
}

export async function fetchLeadPipeline(locationId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any>(`/crm/leads/pipeline/${query}`);
  return res.data;
}

// ── 2. MEMBERS & CLIENT 360 ──────────────────────────────────────────

export function normalizeMember(item: any): Row {
  const plan = item.active_plan;
  const membershipName = plan?.plan_name || item.membership || "Standard Membership";
  const membershipEnd = plan?.end_date || item.membershipEnd || item.membership_end || "";

  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    locationId: item.location ?? item.locationId,
    location: item.location_name ?? item.location,
    name: item.name,
    phone: item.phone,
    email: item.email,
    gender: item.gender === "M" ? "Male" : item.gender === "F" ? "Female" : item.gender === "O" ? "Other" : (item.gender ?? "Male"),
    age: item.age ?? 28,
    membership: membershipName,
    membershipEnd: membershipEnd,
    joinedAt: item.joined_at ?? item.joinedAt ?? new Date().toISOString(),
    coach: item.primary_coach_name || item.coach || "Unassigned",
    coachId: item.primary_coach ?? item.coachId,
    goal: item.fitness_goal ?? item.goal ?? "General Fitness",
    status: item.status ?? "Active",
    attendance30: item.attendance_count_30d !== undefined ? item.attendance_count_30d : (item.attendance30 ?? 0),
    lastVisit: item.last_visit ?? item.lastVisit ?? new Date().toISOString(),
    renewalDate: membershipEnd,
    revenue: item.revenue ? Number(item.revenue) : 0,
    outstanding: item.outstanding ? Number(item.outstanding) : 0,
    healthScore: item.health_score ?? item.healthScore ?? 80,
    performanceScore: item.performance_score ?? item.performanceScore ?? 75,
    riskLevel: item.risk_level ?? item.riskLevel ?? "Low",
    source: item.source ?? "Direct",
    fromLeadId: item.from_lead_id ?? item.fromLeadId,
    activePlan: item.active_plan,
    emergencyContact: item.emergency_contact ?? item.emergencyContact ?? "",
  };
}

export async function fetchMembers(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any[]>(`/members/${query}`);
  return (res.data || []).map(normalizeMember);
}

export async function fetchMemberDetail(id: string): Promise<Row> {
  const res = await api.get<any>(`/members/${id}/`);
  return normalizeMember(res.data);
}

export async function createMemberApi(values: Record<string, unknown>): Promise<Row> {
  // Map display gender values to backend single-char codes
  const genderRaw = String(values["gender"] ?? "Male");
  const genderCode = genderRaw === "Female" ? "F" : genderRaw === "Other" ? "O" : "M";

  // Resolve location: use provided value or fetch first real location from backend
  const locationId = String(values["locationId"] ?? values["location"] ?? "") || await getDefaultLocationId();

  const payload: Record<string, unknown> = {
    name: values["name"],
    phone: values["phone"] ?? "",
    email: values["email"] ?? "",
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

  const res = await api.post<any>("/members/", payload);
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

  const res = await api.patch<any>(`/members/${id}/`, payload);
  return normalizeMember(res.data);
}

export async function deleteMemberApi(id: string): Promise<void> {
  await api.delete(`/members/${id}/`);
}

// ── 3. MEMBERSHIP PLANS ──────────────────────────────────────────────

export function normalizePlan(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    service: item.category ?? item.service ?? "General Membership",
    category: item.category ?? item.service ?? "General Membership",
    months: item.duration_months ? Number(item.duration_months) : (item.months ?? 1),
    duration_months: item.duration_months ? Number(item.duration_months) : (item.months ?? 1),
    price: item.price ? Number(item.price) : 0,
    sessions: item.total_sessions ?? item.sessions ?? null,
    total_sessions: item.total_sessions ?? item.sessions ?? null,
    activeSubscribers: item.active_subscribers ?? item.activeSubscribers ?? 12,
    status: item.is_active !== undefined ? (item.is_active ? "Active" : "Retired") : (item.status ?? "Active"),
    isActive: item.is_active ?? true,
  };
}

export async function fetchPlans(): Promise<Row[]> {
  const res = await api.get<any[]>("/members/plans/");
  return (res.data || []).map(normalizePlan);
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
  const res = await api.post<any>("/members/plans/", payload);
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

  const res = await api.patch<any>(`/members/plans/${id}/`, payload);
  return normalizePlan(res.data);
}

export async function deletePlanApi(id: string): Promise<void> {
  await api.delete(`/members/plans/${id}/`);
}

// ── 4. ATTENDANCE & CHECK-IN ─────────────────────────────────────────

export async function checkInMemberApi(
  memberId: string,
  locationId = "LOC-001",
  method = "QR Code"
): Promise<{ success: boolean; message: string; record: any }> {
  const res = await api.post<any>(`/members/${memberId}/check-in/`, {
    location: locationId,
    method,
  });
  return res.data;
}

// ── 5. OPERATIONS CALENDAR ───────────────────────────────────────────

export async function fetchCalendarFeed(): Promise<any[]> {
  const res = await api.get<any[]>("/ops/calendar/");
  return res.data || [];
}

// ── 6. OPERATIONS CLASSES ────────────────────────────────────────────

export function normalizeClass(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    category: item.category,
    locationId: item.location ?? item.locationId,
    location: item.location_name ?? item.location,
    trainer: item.trainer_name || item.trainer || "Unassigned",
    trainerId: item.trainer ?? item.trainerId,
    startTime: item.start_time ?? item.startTime ?? new Date().toISOString(),
    endTime: item.end_time ?? item.endTime ?? new Date().toISOString(),
    capacity: item.max_capacity ? Number(item.max_capacity) : (item.capacity ?? 20),
    max_capacity: item.max_capacity ? Number(item.max_capacity) : 20,
    booked: item.booked_count !== undefined ? item.booked_count : (item.booked ?? 0),
    booked_count: item.booked_count !== undefined ? item.booked_count : 0,
    spotsRemaining: item.spots_remaining !== undefined ? item.spots_remaining : (item.spotsRemaining ?? 15),
    status: item.is_cancelled ? "Cancelled" : (item.status ?? "Scheduled"),
    isCancelled: item.is_cancelled ?? false,
  };
}

export async function fetchClasses(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any[]>(`/ops/classes/${query}`);
  return (res.data || []).map(normalizeClass);
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
  const res = await api.post<any>("/ops/classes/", payload);
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

  const res = await api.patch<any>(`/ops/classes/${id}/`, payload);
  return normalizeClass(res.data);
}

export async function deleteClassApi(id: string): Promise<void> {
  await api.delete(`/ops/classes/${id}/`);
}

// ── 7. OPERATIONS BOOKINGS (PT, PILATES, CLASSES) ────────────────────

export function normalizeBooking(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    type: item.booking_type ?? item.type ?? "PT",
    bookingType: item.booking_type ?? item.type ?? "PT",
    service: item.class_name || item.booking_type || item.service || "Personal Training",
    trainer: item.trainer_name || item.trainer || "Coach",
    trainerId: item.trainer ?? item.trainerId,
    locationId: item.location ?? item.locationId,
    location: item.location_name ?? item.location,
    date: item.scheduled_at ? item.scheduled_at.slice(0, 10) : (item.date ?? new Date().toISOString().slice(0, 10)),
    time: item.scheduled_at ? item.scheduled_at.slice(11, 16) : (item.time ?? "10:00"),
    scheduledAt: item.scheduled_at ?? item.scheduledAt ?? new Date().toISOString(),
    durationMinutes: item.duration_minutes ?? item.durationMinutes ?? 60,
    status: item.status ?? "Confirmed",
    qrAccessToken: item.qr_access_token ?? item.qrAccessToken ?? "",
    notes: item.notes ?? "",
  };
}

export async function fetchBookings(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any[]>(`/ops/bookings/${query}`);
  return (res.data || []).map(normalizeBooking);
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

  const res = await api.post<any>("/ops/bookings/", payload);
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

  const res = await api.patch<any>(`/ops/bookings/${id}/`, payload);
  return normalizeBooking(res.data);
}

export async function deleteBookingApi(id: string): Promise<void> {
  await api.delete(`/ops/bookings/${id}/`);
}

// ── 8. OPERATIONS & COACHING TRAINERS ────────────────────────────────

export function normalizeTrainer(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name || "Trainer",
    email: item.email ?? "",
    phone: item.phone ?? "",
    specialization: item.specialization ?? item.specialty ?? "Strength & Conditioning",
    specialty: item.specialization ?? item.specialty ?? "Strength & Conditioning",
    certification: item.certification ?? "CSCS, CPR",
    rating: item.rating ? Number(item.rating) : 4.8,
    hourlyRate: item.pt_hourly_rate ? Number(item.pt_hourly_rate) : (item.hourlyRate ?? 1500),
    pt_hourly_rate: item.pt_hourly_rate ? Number(item.pt_hourly_rate) : 1500,
    status: item.is_available !== false ? "Active" : "On Leave",
    isAvailable: item.is_available ?? true,
    locationId: item.locationId ?? "LOC-001",
  };
}

export async function fetchTrainers(): Promise<Row[]> {
  const res = await api.get<any[]>("/ops/trainers/");
  return (res.data || []).map(normalizeTrainer);
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
  const res = await api.post<any>("/ops/trainers/", payload);
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

  const res = await api.patch<any>(`/ops/trainers/${id}/`, payload);
  return normalizeTrainer(res.data);
}

export async function deleteTrainerApi(id: string): Promise<void> {
  await api.delete(`/ops/trainers/${id}/`);
}

// ── 9. COACHING & ASSESSMENTS ────────────────────────────────────────

export function normalizeAssessment(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    trainer: item.assessed_by_name || item.trainer || "Coach",
    trainerId: item.assessed_by ?? item.trainerId,
    date: item.assessment_date ?? item.date ?? new Date().toISOString().slice(0, 10),
    assessmentType: item.assessment_type ?? item.assessmentType ?? "Initial Baseline",
    weight: item.weight_kg ? Number(item.weight_kg) : (item.weight ?? 75),
    weight_kg: item.weight_kg ? Number(item.weight_kg) : 75,
    height_cm: item.height_cm ? Number(item.height_cm) : 175,
    bmi: item.bmi ? Number(item.bmi) : 24.5,
    bodyFat: item.body_fat_pct ? Number(item.body_fat_pct) : (item.bodyFat ?? 18),
    body_fat_pct: item.body_fat_pct ? Number(item.body_fat_pct) : 18,
    muscle_mass_pct: item.muscle_mass_pct ? Number(item.muscle_mass_pct) : 38,
    squat_1rm: item.squat_1rm_kg ? Number(item.squat_1rm_kg) : 100,
    bench_1rm: item.bench_1rm_kg ? Number(item.bench_1rm_kg) : 80,
    deadlift_1rm: item.deadlift_1rm_kg ? Number(item.deadlift_1rm_kg) : 120,
    overallScore: item.overall_fitness_score ? Number(item.overall_fitness_score) : (item.overallScore ?? 80),
    overall_fitness_score: item.overall_fitness_score ? Number(item.overall_fitness_score) : 80,
    mobility: item.mobility_score ? Number(item.mobility_score) : 85,
    notes: item.trainer_summary || item.notes || "",
  };
}

export async function fetchAssessments(): Promise<Row[]> {
  const res = await api.get<any[]>("/coaching/assessments/");
  return (res.data || []).map(normalizeAssessment);
}

export async function createAssessmentApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    assessment_date: values["date"] ?? values["assessment_date"] ?? new Date().toISOString().slice(0, 10),
    assessment_type: values["assessmentType"] ?? values["assessment_type"] ?? "Periodic Check",
    weight_kg: values["weight"] ? Number(values["weight"]) : (values["weight_kg"] ? Number(values["weight_kg"]) : 75),
    height_cm: values["height_cm"] ? Number(values["height_cm"]) : 175,
    body_fat_pct: values["bodyFat"] ? Number(values["bodyFat"]) : (values["body_fat_pct"] ? Number(values["body_fat_pct"]) : 18),
    overall_fitness_score: values["overallScore"] ? Number(values["overallScore"]) : (values["overall_fitness_score"] ? Number(values["overall_fitness_score"]) : 80),
    trainer_summary: values["notes"] ?? values["trainer_summary"] ?? "",
  };
  if (values["trainerId"] || values["assessed_by"]) {
    payload["assessed_by"] = values["trainerId"] ?? values["assessed_by"];
  }
  const res = await api.post<any>("/coaching/assessments/", payload);
  return normalizeAssessment(res.data);
}

export async function updateAssessmentApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("weight" in values || "weight_kg" in values) {
    payload["weight_kg"] = Number(values["weight"] ?? values["weight_kg"]);
  }
  if ("bodyFat" in values || "body_fat_pct" in values) {
    payload["body_fat_pct"] = Number(values["bodyFat"] ?? values["body_fat_pct"]);
  }
  if ("overallScore" in values || "overall_fitness_score" in values) {
    payload["overall_fitness_score"] = Number(values["overallScore"] ?? values["overall_fitness_score"]);
  }
  if ("notes" in values || "trainer_summary" in values) {
    payload["trainer_summary"] = values["notes"] ?? values["trainer_summary"];
  }

  const res = await api.patch<any>(`/coaching/assessments/${id}/`, payload);
  return normalizeAssessment(res.data);
}

export async function deleteAssessmentApi(id: string): Promise<void> {
  await api.delete(`/coaching/assessments/${id}/`);
}

// ── 9B. EXERCISE LIBRARY ─────────────────────────────────────────────

export function normalizeExercise(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    category: item.category,
    primaryMuscle: item.primary_muscle ?? item.primaryMuscle ?? "Chest",
    primary_muscle: item.primary_muscle ?? item.primaryMuscle ?? "Chest",
    equipment: item.equipment ?? "Barbell",
    difficulty: item.difficulty ?? "Intermediate",
    movementPattern: item.movement_pattern ?? item.movementPattern ?? "Push",
    instructions: item.instructions ?? "",
    videoUrl: item.video_url ?? item.videoUrl ?? "",
  };
}

export async function fetchExercises(): Promise<Row[]> {
  const res = await api.get<any[]>("/coaching/exercises/");
  return (res.data || []).map(normalizeExercise);
}

export async function createExerciseApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    category: values["category"] ?? "Strength",
    primary_muscle: values["primaryMuscle"] ?? values["primary_muscle"] ?? "Chest",
    equipment: values["equipment"] ?? "Barbell",
    difficulty: values["difficulty"] ?? "Intermediate",
    movement_pattern: values["movementPattern"] ?? values["movement_pattern"] ?? "Push",
    instructions: values["instructions"] ?? "",
  };
  const res = await api.post<any>("/coaching/exercises/", payload);
  return normalizeExercise(res.data);
}

export async function updateExerciseApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("category" in values) payload["category"] = values["category"];
  if ("primaryMuscle" in values || "primary_muscle" in values) {
    payload["primary_muscle"] = values["primaryMuscle"] ?? values["primary_muscle"];
  }
  if ("equipment" in values) payload["equipment"] = values["equipment"];
  if ("difficulty" in values) payload["difficulty"] = values["difficulty"];
  if ("instructions" in values) payload["instructions"] = values["instructions"];

  const res = await api.patch<any>(`/coaching/exercises/${id}/`, payload);
  return normalizeExercise(res.data);
}

export async function deleteExerciseApi(id: string): Promise<void> {
  await api.delete(`/coaching/exercises/${id}/`);
}

// ── 9C. WORKOUT PROGRAMS ─────────────────────────────────────────────

export function normalizeProgram(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    name: item.name,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    trainer: item.trainer_name || item.trainer || "Coach",
    trainerId: item.trainer ?? item.trainerId,
    goal: item.goal ?? "Hypertrophy",
    weeks: item.duration_weeks ? Number(item.duration_weeks) : (item.weeks ?? 12),
    duration_weeks: item.duration_weeks ? Number(item.duration_weeks) : 12,
    daysPerWeek: item.days_per_week ? Number(item.days_per_week) : (item.daysPerWeek ?? 4),
    days_per_week: item.days_per_week ? Number(item.days_per_week) : 4,
    status: item.is_active !== false ? "Active" : "Archived",
    isActive: item.is_active ?? true,
    startDate: item.start_date ?? item.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: item.end_date ?? item.endDate ?? new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10),
  };
}

export async function fetchPrograms(): Promise<Row[]> {
  const res = await api.get<any[]>("/coaching/programs/");
  return (res.data || []).map(normalizeProgram);
}

export async function createProgramApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    goal: values["goal"] ?? "Hypertrophy",
    duration_weeks: values["weeks"] ? Number(values["weeks"]) : (values["duration_weeks"] ? Number(values["duration_weeks"]) : 12),
    days_per_week: values["daysPerWeek"] ? Number(values["daysPerWeek"]) : (values["days_per_week"] ? Number(values["days_per_week"]) : 4),
    start_date: values["startDate"] ?? values["start_date"] ?? new Date().toISOString().slice(0, 10),
    end_date: values["endDate"] ?? values["end_date"] ?? new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10),
    is_active: values["status"] !== "Archived" && values["is_active"] !== false,
  };
  if (values["trainerId"] || values["trainer"]) {
    payload["trainer"] = values["trainerId"] ?? values["trainer"];
  }
  const res = await api.post<any>("/coaching/programs/", payload);
  return normalizeProgram(res.data);
}

export async function updateProgramApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("goal" in values) payload["goal"] = values["goal"];
  if ("weeks" in values || "duration_weeks" in values) {
    payload["duration_weeks"] = Number(values["weeks"] ?? values["duration_weeks"]);
  }
  if ("daysPerWeek" in values || "days_per_week" in values) {
    payload["days_per_week"] = Number(values["daysPerWeek"] ?? values["days_per_week"]);
  }
  if ("status" in values) payload["is_active"] = values["status"] !== "Archived";
  if ("is_active" in values) payload["is_active"] = Boolean(values["is_active"]);

  const res = await api.patch<any>(`/coaching/programs/${id}/`, payload);
  return normalizeProgram(res.data);
}

export async function deleteProgramApi(id: string): Promise<void> {
  await api.delete(`/coaching/programs/${id}/`);
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
  const res = await api.get<any[]>("/coaching/nutrition/");
  return (res.data || []).map(normalizeNutritionPlan);
}

export async function createNutritionPlanApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    diet_type: values["dietType"] ?? values["diet_type"] ?? "Non-Vegetarian",
    target_calories: values["calories"] ? Number(values["calories"]) : (values["target_calories"] ? Number(values["target_calories"]) : 2400),
    target_protein_g: values["protein"] ? Number(values["protein"]) : (values["target_protein_g"] ? Number(values["target_protein_g"]) : 160),
    target_carbs_g: values["carbs"] ? Number(values["carbs"]) : (values["target_carbs_g"] ? Number(values["target_carbs_g"]) : 250),
    target_fat_g: values["fat"] ? Number(values["fat"]) : (values["target_fat_g"] ? Number(values["target_fat_g"]) : 65),
    is_active: values["status"] !== "Archived" && values["is_active"] !== false,
  };
  if (values["trainerId"] || values["created_by"]) {
    payload["created_by"] = values["trainerId"] ?? values["created_by"];
  }
  const res = await api.post<any>("/coaching/nutrition/", payload);
  return normalizeNutritionPlan(res.data);
}

export async function updateNutritionPlanApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("dietType" in values || "diet_type" in values) {
    payload["diet_type"] = values["dietType"] ?? values["diet_type"];
  }
  if ("calories" in values || "target_calories" in values) {
    payload["target_calories"] = Number(values["calories"] ?? values["target_calories"]);
  }
  if ("protein" in values || "target_protein_g" in values) {
    payload["target_protein_g"] = Number(values["protein"] ?? values["target_protein_g"]);
  }
  if ("carbs" in values || "target_carbs_g" in values) {
    payload["target_carbs_g"] = Number(values["carbs"] ?? values["target_carbs_g"]);
  }
  if ("fat" in values || "target_fat_g" in values) {
    payload["target_fat_g"] = Number(values["fat"] ?? values["target_fat_g"]);
  }
  if ("status" in values) payload["is_active"] = values["status"] !== "Archived";
  if ("is_active" in values) payload["is_active"] = Boolean(values["is_active"]);

  const res = await api.patch<any>(`/coaching/nutrition/${id}/`, payload);
  return normalizeNutritionPlan(res.data);
}

export async function deleteNutritionPlanApi(id: string): Promise<void> {
  await api.delete(`/coaching/nutrition/${id}/`);
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
  const res = await api.get<any[]>("/coaching/food-database/");
  return (res.data || []).map(normalizeFoodItem);
}

export async function createFoodItemApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    name: values["name"],
    diet_type: values["dietType"] ?? values["diet_type"] ?? "Vegetarian",
    serving_unit: values["servingUnit"] ?? values["serving_unit"] ?? "100g",
    calories: values["calories"] ? Number(values["calories"]) : 150,
    protein_g: values["protein"] ? Number(values["protein"]) : (values["protein_g"] ? Number(values["protein_g"]) : 10),
    carbs_g: values["carbs"] ? Number(values["carbs"]) : (values["carbs_g"] ? Number(values["carbs_g"]) : 20),
    fat_g: values["fat"] ? Number(values["fat"]) : (values["fat_g"] ? Number(values["fat_g"]) : 5),
    fiber_g: values["fiber"] ? Number(values["fiber"]) : (values["fiber_g"] ? Number(values["fiber_g"]) : 3),
  };
  const res = await api.post<any>("/coaching/food-database/", payload);
  return normalizeFoodItem(res.data);
}

export async function updateFoodItemApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("name" in values) payload["name"] = values["name"];
  if ("dietType" in values || "diet_type" in values) {
    payload["diet_type"] = values["dietType"] ?? values["diet_type"];
  }
  if ("calories" in values) payload["calories"] = Number(values["calories"]);
  if ("protein" in values || "protein_g" in values) {
    payload["protein_g"] = Number(values["protein"] ?? values["protein_g"]);
  }
  if ("carbs" in values || "carbs_g" in values) {
    payload["carbs_g"] = Number(values["carbs"] ?? values["carbs_g"]);
  }
  if ("fat" in values || "fat_g" in values) {
    payload["fat_g"] = Number(values["fat"] ?? values["fat_g"]);
  }

  const res = await api.patch<any>(`/coaching/food-database/${id}/`, payload);
  return normalizeFoodItem(res.data);
}

export async function deleteFoodItemApi(id: string): Promise<void> {
  await api.delete(`/coaching/food-database/${id}/`);
}

// ── 12. FINANCE & INVOICES ───────────────────────────────────────────

export function normalizeInvoice(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    locationId: item.location ?? item.locationId,
    location: item.location_name ?? item.location,
    description: item.description ?? "Membership Plan Subscription",
    subtotal: item.subtotal ? Number(item.subtotal) : (item.amount ? Number(item.amount) : 5000),
    discount: item.discount_amount ? Number(item.discount_amount) : (item.discount ? Number(item.discount) : 0),
    discount_amount: item.discount_amount ? Number(item.discount_amount) : 0,
    tax: item.tax_amount ? Number(item.tax_amount) : (item.tax ? Number(item.tax) : 0),
    tax_amount: item.tax_amount ? Number(item.tax_amount) : 0,
    amount: item.total_amount ? Number(item.total_amount) : (item.amount ? Number(item.amount) : 5000),
    total: item.total_amount ? Number(item.total_amount) : (item.total ? Number(item.total) : 5000),
    total_amount: item.total_amount ? Number(item.total_amount) : 5000,
    status: item.status ?? "Draft",
    dueDate: item.due_date ?? item.dueDate ?? new Date().toISOString().slice(0, 10),
    due_date: item.due_date ?? item.dueDate ?? new Date().toISOString().slice(0, 10),
    paidAt: item.paid_at ?? item.paidAt ?? null,
    paid_at: item.paid_at ?? item.paidAt ?? null,
    coupon: item.coupon_code ?? item.coupon ?? null,
  };
}

export async function fetchInvoices(locationId?: string): Promise<Row[]> {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") {
    params.set("location", locationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get<any[]>(`/finance/invoices/${query}`);
  return (res.data || []).map(normalizeInvoice);
}

export async function createInvoiceApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    member: values["memberId"] ?? values["member"] ?? "MEM-001",
    location: values["locationId"] ?? values["location"] ?? "LOC-001",
    description: values["description"] ?? "Fitness Services Invoice",
    subtotal: values["subtotal"] ? Number(values["subtotal"]) : (values["amount"] ? Number(values["amount"]) : 5000),
    status: values["status"] ?? "Draft",
    due_date: values["dueDate"] ?? values["due_date"] ?? new Date().toISOString().slice(0, 10),
  };
  if (values["subscriptionId"] || values["subscription"]) {
    payload["subscription"] = values["subscriptionId"] ?? values["subscription"];
  }
  if (values["couponId"] || values["coupon"]) {
    payload["coupon"] = values["couponId"] ?? values["coupon"];
  }
  const res = await api.post<any>("/finance/invoices/", payload);
  return normalizeInvoice(res.data);
}

export async function updateInvoiceApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("description" in values) payload["description"] = values["description"];
  if ("status" in values) payload["status"] = values["status"];
  if ("subtotal" in values || "amount" in values) {
    payload["subtotal"] = Number(values["subtotal"] ?? values["amount"]);
  }
  if ("dueDate" in values || "due_date" in values) {
    payload["due_date"] = values["dueDate"] ?? values["due_date"];
  }

  const res = await api.patch<any>(`/finance/invoices/${id}/`, payload);
  return normalizeInvoice(res.data);
}

export async function deleteInvoiceApi(id: string): Promise<void> {
  await api.delete(`/finance/invoices/${id}/`);
}

// ── 13. FINANCE & PAYMENTS ───────────────────────────────────────────

export function normalizePayment(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    invoiceId: item.invoice ?? item.invoiceId,
    member: item.member_name || item.member || "Member",
    memberId: item.member ?? item.memberId,
    amount: item.amount ? Number(item.amount) : 0,
    method: item.payment_method ?? item.method ?? "Razorpay",
    payment_method: item.payment_method ?? item.method ?? "Razorpay",
    txId: item.transaction_id ?? item.txId ?? "",
    transaction_id: item.transaction_id ?? item.txId ?? "",
    status: item.status ?? "Success",
    date: item.paid_at ? item.paid_at.slice(0, 10) : (item.date ?? new Date().toISOString().slice(0, 10)),
    paidAt: item.paid_at ?? item.paidAt ?? new Date().toISOString(),
    paid_at: item.paid_at ?? item.paidAt ?? new Date().toISOString(),
  };
}

export async function fetchPayments(): Promise<Row[]> {
  const res = await api.get<any[]>("/finance/payments/");
  return (res.data || []).map(normalizePayment);
}

export async function createPaymentApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    invoice: values["invoiceId"] ?? values["invoice"] ?? "INV-001",
    amount: values["amount"] ? Number(values["amount"]) : 5000,
    payment_method: values["method"] ?? values["payment_method"] ?? "Razorpay",
    transaction_id: values["txId"] ?? values["transaction_id"] ?? `tx_${Date.now()}`,
    status: values["status"] ?? "Success",
  };
  const res = await api.post<any>("/finance/payments/", payload);
  return normalizePayment(res.data);
}

export async function updatePaymentApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("amount" in values) payload["amount"] = Number(values["amount"]);
  if ("status" in values) payload["status"] = values["status"];
  if ("method" in values || "payment_method" in values) {
    payload["payment_method"] = values["method"] ?? values["payment_method"];
  }

  const res = await api.patch<any>(`/finance/payments/${id}/`, payload);
  return normalizePayment(res.data);
}

export async function deletePaymentApi(id: string): Promise<void> {
  await api.delete(`/finance/payments/${id}/`);
}

// ── 14. FINANCE & COUPONS ────────────────────────────────────────────

export function normalizeCoupon(item: any): Row {
  return {
    ...item,
    id: item.id,
    tenantId: item.tenant_id ?? item.tenantId,
    code: item.code,
    description: item.description ?? "",
    type: item.discount_type ?? item.type ?? "Percentage",
    discount_type: item.discount_type ?? item.type ?? "Percentage",
    value: item.discount_value ? Number(item.discount_value) : (item.value ?? 10),
    discount_value: item.discount_value ? Number(item.discount_value) : 10,
    minOrder: item.min_order_amount ? Number(item.min_order_amount) : (item.minOrder ?? 0),
    min_order_amount: item.min_order_amount ? Number(item.min_order_amount) : 0,
    maxDiscount: item.max_discount_amount ? Number(item.max_discount_amount) : (item.maxDiscount ?? null),
    max_discount_amount: item.max_discount_amount ? Number(item.max_discount_amount) : null,
    validFrom: item.valid_from ?? item.validFrom ?? new Date().toISOString().slice(0, 10),
    valid_from: item.valid_from ?? item.validFrom ?? new Date().toISOString().slice(0, 10),
    validUntil: item.valid_until ?? item.validUntil ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    valid_until: item.valid_until ?? item.validUntil ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    usageLimit: item.usage_limit ?? item.usageLimit ?? 100,
    usage_limit: item.usage_limit ?? item.usageLimit ?? 100,
    timesUsed: item.times_used ?? item.timesUsed ?? 0,
    times_used: item.times_used ?? item.timesUsed ?? 0,
    status: item.is_active !== false ? "Active" : "Expired",
    isActive: item.is_active ?? true,
  };
}

export async function fetchCoupons(): Promise<Row[]> {
  const res = await api.get<any[]>("/finance/coupons/");
  return (res.data || []).map(normalizeCoupon);
}

export async function createCouponApi(values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {
    code: values["code"],
    description: values["description"] ?? "",
    discount_type: values["type"] ?? values["discount_type"] ?? "Percentage",
    discount_value: values["value"] ? Number(values["value"]) : (values["discount_value"] ? Number(values["discount_value"]) : 10),
    min_order_amount: values["minOrder"] ? Number(values["minOrder"]) : (values["min_order_amount"] ? Number(values["min_order_amount"]) : 0),
    max_discount_amount: values["maxDiscount"] ? Number(values["maxDiscount"]) : (values["max_discount_amount"] ? Number(values["max_discount_amount"]) : null),
    valid_from: values["validFrom"] ?? values["valid_from"] ?? new Date().toISOString().slice(0, 10),
    valid_until: values["validUntil"] ?? values["valid_until"] ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    usage_limit: values["usageLimit"] ? Number(values["usageLimit"]) : (values["usage_limit"] ? Number(values["usage_limit"]) : 100),
    is_active: values["status"] !== "Expired" && values["is_active"] !== false,
  };
  const res = await api.post<any>("/finance/coupons/", payload);
  return normalizeCoupon(res.data);
}

export async function updateCouponApi(id: string, values: Record<string, unknown>): Promise<Row> {
  const payload: Record<string, unknown> = {};
  if ("code" in values) payload["code"] = values["code"];
  if ("description" in values) payload["description"] = values["description"];
  if ("type" in values || "discount_type" in values) {
    payload["discount_type"] = values["type"] ?? values["discount_type"];
  }
  if ("value" in values || "discount_value" in values) {
    payload["discount_value"] = Number(values["value"] ?? values["discount_value"]);
  }
  if ("status" in values) payload["is_active"] = values["status"] !== "Expired";
  if ("is_active" in values) payload["is_active"] = Boolean(values["is_active"]);

  const res = await api.patch<any>(`/finance/coupons/${id}/`, payload);
  return normalizeCoupon(res.data);
}

export async function deleteCouponApi(id: string): Promise<void> {
  await api.delete(`/finance/coupons/${id}/`);
}

// ── 15. MASTER INTEGRATIONS LAYER ────────────────────────────────────

export async function fetchIntegrationStatus(): Promise<Row[]> {
  const res = await api.get<{ integration_layer: string; adapters: Record<string, { name: string; status: string; purpose: string }> }>("/integrations/status/");
  if (!res.data || !res.data.adapters) return [];
  return Object.entries(res.data.adapters).map(([key, item]) => ({
    id: `INT-${key.toUpperCase()}`,
    name: item.name,
    category: item.purpose,
    status: item.status,
    type: "Webhook / API",
    lastSync: new Date().toISOString(),
  }));
}




