import { getDataset, TENANT_ID, TODAY } from "@/data/types-bridge";

/**
 * Service layer. UI code only talks to these functions — never to the demo
 * dataset directly. Each function is async and filter-driven so it can be
 * swapped for a Rails/PostgreSQL endpoint without UI changes.
 */

export interface ScopeFilter {
  tenantId?: string;
  locationId?: string | "all";
}

function scope<T extends { tenantId: string; locationId?: string | undefined }>(
  rows: T[],
  f?: ScopeFilter,
): T[] {
  const tenantId = f?.tenantId ?? TENANT_ID;
  return rows.filter(
    (row) =>
      row.tenantId === tenantId &&
      (!f?.locationId || f.locationId === "all" || row.locationId === f.locationId),
  );
}

export const repo = {
  tenants: () => getDataset().tenants,
  locations: (f?: ScopeFilter) => scope(getDataset().locations, { ...f, locationId: "all" }),
  users: (f?: ScopeFilter) => scope(getDataset().users, f),
  trainers: (f?: ScopeFilter) => scope(getDataset().trainers, f),
  services: (f?: ScopeFilter) => scope(getDataset().services, f),
  plans: (f?: ScopeFilter) => scope(getDataset().plans, f),
  members: (f?: ScopeFilter) => scope(getDataset().members, f),
  leads: (f?: ScopeFilter) => scope(getDataset().leads, f),
  calls: (f?: ScopeFilter) => scope(getDataset().calls, f),
  trials: (f?: ScopeFilter) => scope(getDataset().trials, f),
  offers: (f?: ScopeFilter) => scope(getDataset().offers, f),
  coupons: (f?: ScopeFilter) => scope(getDataset().coupons, f),
  classes: (f?: ScopeFilter) => scope(getDataset().classes, f),
  bookings: (f?: ScopeFilter) => scope(getDataset().bookings, f),
  assessments: (f?: ScopeFilter) => scope(getDataset().assessments, f),
  exercises: (f?: ScopeFilter) => scope(getDataset().exercises, f),
  programs: (f?: ScopeFilter) => scope(getDataset().programs, f),
  nutritionPlans: (f?: ScopeFilter) => scope(getDataset().nutritionPlans, f),
  products: (f?: ScopeFilter) => scope(getDataset().products, f),
  invoices: (f?: ScopeFilter) => scope(getDataset().invoices, f),
  complaints: (f?: ScopeFilter) => scope(getDataset().complaints, f),
  campaigns: (f?: ScopeFilter) => scope(getDataset().campaigns, f),
  communications: (f?: ScopeFilter) => scope(getDataset().communications, f),
  workflows: (f?: ScopeFilter) => scope(getDataset().workflows, f),
  approvals: (f?: ScopeFilter) => scope(getDataset().approvals, f),
  auditLogs: (f?: ScopeFilter) => scope(getDataset().auditLogs, f),
  integrations: (f?: ScopeFilter) => scope(getDataset().integrations, f),
  tasks: (f?: ScopeFilter) => scope(getDataset().tasks, f),

  member: (id: string) => getDataset().members.find((m) => m.id === id),
  lead: (id: string) => getDataset().leads.find((l) => l.id === id),
  trial: (id: string) => getDataset().trials.find((t) => t.id === id),
  tenant: (id: string) => getDataset().tenants.find((t) => t.id === id),
  trainer: (id: string) => getDataset().trainers.find((t) => t.id === id),
};

/* ------------------------- derived business metrics ------------------------ */

const day = 86400000;
function daysFromToday(d: string) {
  return Math.round((new Date(d).getTime() - TODAY.getTime()) / day);
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
    .reduce((s, i) => s + i.paid, 0);
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paid), 0);
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
    const key = inv.issuedAt.slice(0, 7);
    const b = buckets.get(key);
    if (b) {
      b.revenue += inv.amount;
      b.collected += inv.paid;
    }
  }
  return [...buckets.values()];
}

export function leadFunnel(f?: ScopeFilter) {
  const leads = repo.leads(f);
  const stages = [
    "New","Contacted","Qualified","Trial Booked","Trial Attended","Offer Sent","Negotiation","Converted",
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
    const joined = members.filter((m) => m.joinedAt.slice(0, 7) === key).length;
    const churned = members.filter(
      (m) => (m.status === "Lapsed" || m.status === "Cancelled") && m.membershipEnd.slice(0, 7) === key,
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
    const row = byOwner.get(l.assignedTo) ?? { name: l.assignedTo, leads: 0, converted: 0, revenue: 0 };
    row.leads += 1;
    if (l.stage === "Converted") {
      row.converted += 1;
      row.revenue += l.budget;
    }
    byOwner.set(l.assignedTo, row);
  }
  return [...byOwner.values()]
    .map((r) => ({ ...r, rate: r.leads ? Math.round((r.converted / r.leads) * 100) : 0 }))
    .sort((a, b) => b.converted - a.converted);
}

export function trainerUtilization(f?: ScopeFilter) {
  return repo
    .trainers(f)
    .slice()
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 8)
    .map((t) => ({ name: t.name.split(" ")[0]!, utilization: t.utilization, sessions: t.ptSessions }));
}

export function expiringMemberships(f?: ScopeFilter) {
  return repo
    .members(f)
    .filter((m) => daysFromToday(m.membershipEnd) >= 0 && daysFromToday(m.membershipEnd) <= 30)
    .sort((a, b) => a.membershipEnd.localeCompare(b.membershipEnd));
}

export function todaySchedule(f?: ScopeFilter) {
  return repo
    .bookings(f)
    .filter((b) => daysFromToday(b.date) === 0)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function atRiskMembers(f?: ScopeFilter) {
  return repo
    .members(f)
    .filter((m) => m.riskLevel !== "Low")
    .sort((a, b) => a.healthScore - b.healthScore);
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
    avgDuration: done.length ? Math.round(done.reduce((s, c) => s + c.duration, 0) / done.length) : 0,
  };
}

export function financeSummary(f?: ScopeFilter) {
  const invoices = repo.invoices(f);
  const collected = invoices.reduce((s, i) => s + i.paid, 0);
  const billed = invoices.reduce((s, i) => s + i.amount, 0);
  return {
    billed,
    collected,
    outstanding: billed - collected,
    overdue: invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + (i.amount - i.paid), 0),
    refunded: invoices.filter((i) => i.status === "Refunded").reduce((s, i) => s + i.amount, 0),
    collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
  };
}

export function revenueByService(f?: ScopeFilter) {
  const invoices = repo.invoices(f);
  const map = new Map<string, number>();
  for (const i of invoices) map.set(i.service, (map.get(i.service) ?? 0) + i.paid);
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function lifecycleTimeline() {
  const d = getDataset();
  const lead = d.leads.find((l) => l.id === "LEAD-1001")!;
  const call = d.calls.find((c) => c.id === "CALL-0001")!;
  const trial = d.trials.find((t) => t.id === "TRL-001")!;
  return { lead, call, trial, member: d.members.find((m) => m.id === "MEM-0001")! };
}

export { daysFromToday };
