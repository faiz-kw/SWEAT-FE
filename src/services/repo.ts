import { collection, type CollectionKey } from "@/services/store";
import { TENANT_ID, TODAY } from "@/types";
import type {
  Approval,
  Assessment,
  AuditLog,
  Booking,
  Call,
  Campaign,
  ClassDef,
  Communication,
  Complaint,
  Coupon,
  Integration,
  Invoice,
  Lead,
  Location,
  Member,
  MembershipPlan,
  NutritionPlan,
  Offer,
  Product,
  Program,
  Service,
  Task,
  Tenant,
  Trainer,
  Trial,
  User,
  Workflow,
} from "@/types";

/**
 * Service layer. Dynamically reads from reactive store collections
 * backed by real Django API endpoints.
 */

export interface ScopeFilter {
  tenantId?: string;
  locationId?: string | "all";
}

function getRows<T>(key: CollectionKey, f?: ScopeFilter): T[] {
  const rows = (collection(key) || []) as unknown as (T & { tenantId?: string; locationId?: string })[];
  const tenantId = f?.tenantId ?? TENANT_ID;
  return rows.filter(
    (row) =>
      (!row.tenantId || row.tenantId === tenantId) &&
      (!f?.locationId || f.locationId === "all" || !row.locationId || row.locationId === f.locationId),
  ) as T[];
}

export const repo = {
  tenants: () => (collection("tenants") || []) as unknown as Tenant[],
  locations: (f?: ScopeFilter) => getRows<Location>("locations", { ...f, locationId: "all" }),
  users: (f?: ScopeFilter) => getRows<User>("users", f),
  trainers: (f?: ScopeFilter) => getRows<Trainer>("trainers", f),
  services: (f?: ScopeFilter) => getRows<Service>("services", f),
  plans: (f?: ScopeFilter) => getRows<MembershipPlan>("plans", f),
  members: (f?: ScopeFilter) => getRows<Member>("members", f),
  leads: (f?: ScopeFilter) => getRows<Lead>("leads", f),
  calls: (f?: ScopeFilter) => getRows<Call>("calls", f),
  trials: (f?: ScopeFilter) => getRows<Trial>("trials", f),
  offers: (f?: ScopeFilter) => getRows<Offer>("offers", f),
  coupons: (f?: ScopeFilter) => getRows<Coupon>("coupons", f),
  classes: (f?: ScopeFilter) => getRows<ClassDef>("classes", f),
  bookings: (f?: ScopeFilter) => getRows<Booking>("bookings", f),
  assessments: (f?: ScopeFilter) => getRows<Assessment>("assessments", f),
  programs: (f?: ScopeFilter) => getRows<Program>("programs", f),
  nutritionPlans: (f?: ScopeFilter) => getRows<NutritionPlan>("nutritionPlans", f),
  products: (f?: ScopeFilter) => getRows<Product>("products", f),
  invoices: (f?: ScopeFilter) => getRows<Invoice>("invoices", f),
  complaints: (f?: ScopeFilter) => getRows<Complaint>("complaints", f),
  campaigns: (f?: ScopeFilter) => getRows<Campaign>("campaigns", f),
  communications: (f?: ScopeFilter) => getRows<Communication>("communications", f),
  workflows: (f?: ScopeFilter) => getRows<Workflow>("workflows", f),
  approvals: (f?: ScopeFilter) => getRows<Approval>("approvals", f),
  auditLogs: (f?: ScopeFilter) => getRows<AuditLog>("auditLogs", f),
  integrations: (f?: ScopeFilter) => getRows<Integration>("integrations", f),
  tasks: (f?: ScopeFilter) => getRows<Task>("tasks", f),

  member: (id: string) => (collection("members") as unknown as Member[]).find((m) => m.id === id),
  lead: (id: string) => (collection("leads") as unknown as Lead[]).find((l) => l.id === id),
  trial: (id: string) => (collection("trials") as unknown as Trial[]).find((t) => t.id === id),
  tenant: (id: string) => (collection("tenants") as unknown as Tenant[]).find((t) => t.id === id),
  trainer: (id: string) => (collection("trainers") as unknown as Trainer[]).find((t) => t.id === id),
};

/* ------------------------- derived business metrics ------------------------ */

const day = 86400000;
function daysFromToday(d?: string) {
  if (!d) return -9999;
  const t = new Date(d).getTime();
  if (isNaN(t)) return -9999;
  return Math.round((t - TODAY.getTime()) / day);
}

export function dashboardMetrics(f?: ScopeFilter) {
  const members = repo.members(f);
  const leads = repo.leads(f);
  const trials = repo.trials(f);
  const invoices = repo.invoices(f);
  const bookings = repo.bookings(f);

  const active = members.filter((m) => m.status === "Active" || m.status === "Expiring");
  const newMembers = members.filter((m) => daysFromToday(m.joinedAt) > -30);
  const newLeads = leads.filter((l) => daysFromToday(l.createdAt) > -30);
  const attended = trials.filter((t) =>
    ["Attended", "Completed", "Converted"].includes(t.status),
  );
  const converted = trials.filter((t) => t.converted);
  const revenue = invoices
    .filter((i) => daysFromToday(i.issuedAt) > -30)
    .reduce((s, i) => s + (Number(i.paid) || 0), 0);
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, (Number(i.amount) || 0) - (Number(i.paid) || 0)), 0);
  const renewalsDue = members.filter(
    (m) => daysFromToday(m.renewalDate) >= 0 && daysFromToday(m.renewalDate) <= 30,
  );

  return {
    activeMembers: active.length,
    newMembers: newMembers.length,
    newLeads: newLeads.length,
    trials: trials.length,
    trialConversion: attended.length ? Math.round((converted.length / attended.length) * 100) : 0,
    revenue,
    outstanding,
    renewalsDue: renewalsDue.length,
    atRisk: members.filter((m) => m.riskLevel === "High").length,
    todayClasses: bookings.filter((b) => b.type === "Class" && daysFromToday(b.date) === 0).length,
    todayPt: bookings.filter((b) => b.type === "PT" && daysFromToday(b.date) === 0).length,
  };
}

export function revenueTrend(f?: ScopeFilter) {
  const invoices = repo.invoices(f);
  const buckets = new Map<string, { month: string; revenue: number; collected: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(TODAY);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    buckets.set(key, {
      month: d.toLocaleString("en", { month: "short" }),
      revenue: 0,
      collected: 0,
    });
  }
  for (const inv of invoices) {
    if (!inv.issuedAt) continue;
    const key = inv.issuedAt.slice(0, 7);
    const b = buckets.get(key);
    if (b) {
      b.revenue += Number(inv.amount) || 0;
      b.collected += Number(inv.paid) || 0;
    }
  }
  return [...buckets.values()];
}

export function leadFunnel(f?: ScopeFilter) {
  const leads = repo.leads(f);
  const stages = [
    "New", "Contacted", "Qualified", "Trial Booked", "Trial Attended", "Offer Sent", "Negotiation", "Converted",
  ];
  return stages.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));
}

export function memberGrowth(f?: ScopeFilter) {
  const members = repo.members(f);
  const out: { month: string; joined: number; churned: number; net: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(TODAY);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const joined = members.filter((m) => m.joinedAt && m.joinedAt.slice(0, 7) === key).length;
    const churned = members.filter(
      (m) => (m.status === "Lapsed" || m.status === "Cancelled") && m.membershipEnd && m.membershipEnd.slice(0, 7) === key,
    ).length;
    out.push({
      month: d.toLocaleString("en", { month: "short" }),
      joined,
      churned,
      net: joined - churned,
    });
  }
  return out;
}

export function salesTeamPerformance(f?: ScopeFilter) {
  const leads = repo.leads(f);
  const byOwner = new Map<string, { name: string; leads: number; converted: number; revenue: number }>();
  for (const l of leads) {
    const ownerName = l.assignedTo || "Unassigned";
    const row = byOwner.get(ownerName) ?? { name: ownerName, leads: 0, converted: 0, revenue: 0 };
    row.leads += 1;
    if (l.stage === "Converted") {
      row.converted += 1;
      row.revenue += Number(l.budget) || 0;
    }
    byOwner.set(ownerName, row);
  }
  return [...byOwner.values()]
    .map((r) => ({ ...r, rate: r.leads ? Math.round((r.converted / r.leads) * 100) : 0 }))
    .sort((a, b) => b.converted - a.converted);
}

export function trainerUtilization(f?: ScopeFilter) {
  return repo
    .trainers(f)
    .slice()
    .sort((a, b) => (b.utilization || 0) - (a.utilization || 0))
    .slice(0, 8)
    .map((t) => ({
      name: (t.name || "Trainer").split(" ")[0]!,
      utilization: t.utilization || 0,
      sessions: t.ptSessions || 0,
    }));
}

export function expiringMemberships(f?: ScopeFilter) {
  return repo
    .members(f)
    .filter((m) => daysFromToday(m.membershipEnd) >= 0 && daysFromToday(m.membershipEnd) <= 30)
    .sort((a, b) => (a.membershipEnd || "").localeCompare(b.membershipEnd || ""));
}

export function todaySchedule(f?: ScopeFilter) {
  return repo
    .bookings(f)
    .filter((b) => daysFromToday(b.date) === 0)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

export function atRiskMembers(f?: ScopeFilter) {
  return repo
    .members(f)
    .filter((m) => m.riskLevel !== "Low")
    .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0));
}

export function aiCallingStats(f?: ScopeFilter) {
  const calls = repo.calls(f);
  const connected = calls.filter((c) =>
    ["Connected", "Interested", "Trial Booked"].includes(c.outcome),
  );
  const done = calls.filter((c) => c.status === "Completed");
  return {
    total: calls.length,
    connected: connected.length,
    notConnected: calls.filter((c) => c.outcome === "Not Connected").length,
    interested: calls.filter((c) => c.outcome === "Interested").length,
    trialBooked: calls.filter((c) => c.outcome === "Trial Booked").length,
    conversion: calls.length ? Math.round((calls.filter((c) => c.outcome === "Trial Booked").length / calls.length) * 100) : 0,
    avgDuration: done.length ? Math.round(done.reduce((s, c) => s + (c.duration || 0), 0) / done.length) : 0,
  };
}

export function financeSummary(f?: ScopeFilter) {
  const invoices = repo.invoices(f);
  const collected = invoices.reduce((s, i) => s + (Number(i.paid) || 0), 0);
  const billed = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return {
    billed,
    collected,
    outstanding: billed - collected,
    overdue: invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + ((Number(i.amount) || 0) - (Number(i.paid) || 0)), 0),
    refunded: invoices.filter((i) => i.status === "Refunded").reduce((s, i) => s + (Number(i.amount) || 0), 0),
    collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
  };
}

export function revenueByService(f?: ScopeFilter) {
  const invoices = repo.invoices(f);
  const map = new Map<string, number>();
  for (const i of invoices) map.set(i.service, (map.get(i.service) ?? 0) + (Number(i.paid) || 0));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function lifecycleTimeline() {
  const leads = repo.leads();
  const calls = repo.calls();
  const trials = repo.trials();
  const members = repo.members();
  return {
    lead: leads[0] ?? { id: "LEAD-NEW", name: "No Leads Yet", stage: "New" },
    call: calls[0] ?? { id: "CALL-NEW", outcome: "Pending", duration: 0 },
    trial: trials[0] ?? { id: "TRL-NEW", status: "Scheduled" },
    member: members[0] ?? { id: "MEM-NEW", name: "No Members Yet", status: "Active" },
  };
}

export { daysFromToday };
