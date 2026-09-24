import type { CollectionKey, Row } from "@/services/store";

/**
 * Maps every console route to a collection in the store, plus an optional
 * preset filter that narrows the collection for that module. Everything else
 * (fields, columns, filters, CRUD form) is derived from the data schema, so a
 * module only needs one line here.
 */
export interface ModuleDef {
  collection: CollectionKey;
  preset?: { label: string; test: (r: Row) => boolean };
  hint?: string;
}


function preset(label: string, key: string, ...values: unknown[]) {
  return { label, test: (r: Row) => values.includes(r[key]) };
}


export const MODULES: Record<string, ModuleDef> = {
  /* CRM & Sales */
  "/crm/leads": { collection: "leads", hint: "Inbound and outbound lead records with owner, score and stage." },
  "/crm/pipeline": { collection: "leads", preset: { label: "Open pipeline", test: (r) => r["status"] === "Open" } },
  "/crm/ai-calling": { collection: "calls", hint: "Sarvam voice-agent call queue, outcomes and consent." },
  "/crm/trials": { collection: "trials" },
  "/crm/activities": { collection: "communications" },
  "/crm/follow-ups": { collection: "tasks" },
  "/crm/offers": { collection: "offers" },
  "/crm/coupons": { collection: "coupons" },
  "/crm/campaigns": { collection: "campaigns" },

  /* Members */
  "/members": { collection: "members" },
  "/members/client-360": { collection: "members", hint: "Open a member to see the full cross-module record." },
  "/members/memberships": { collection: "plans" },
  "/members/renewals": { collection: "members", preset: preset("Renewal window", "status", "Expiring") },
  "/members/freeze": { collection: "members", preset: preset("Frozen", "status", "Frozen") },
  "/members/transfers": { collection: "members" },
  "/members/attendance": { collection: "bookings", preset: preset("Attended", "status", "Attended") },

  /* Operations */
  "/ops/calendar": { collection: "bookings" },
  "/ops/classes": { collection: "classes" },
  "/ops/bookings": { collection: "bookings" },
  "/ops/personal-training": { collection: "bookings", preset: preset("PT sessions", "type", "PT") },
  "/ops/assessments": { collection: "assessments" },
  "/ops/trainers": { collection: "trainers" },
  "/ops/programs": { collection: "programs" },

  /* Performance */
  "/performance/assessments": { collection: "assessments" },
  "/performance/intelligence": { collection: "biInsights" },
  "/performance/progress": { collection: "assessments", preset: preset("Completed", "status", "Completed") },
  "/performance/recovery": { collection: "assessments" },
  "/performance/movement": { collection: "visionAnalyses" },

  /* Nutrition */
  "/nutrition/diet-plans": { collection: "nutritionPlans" },
  "/nutrition/consultations": { collection: "nutritionPlans", preset: preset("Review due", "status", "Review Due") },
  "/nutrition/food-logs": { collection: "nutritionPlans", preset: preset("Active plans", "status", "Active") },
  "/nutrition/supplements": { collection: "products" },

  /* Inventory */
  "/inventory/products": { collection: "products" },
  "/inventory/stock": { collection: "products" },
  "/inventory/purchases": { collection: "products" },
  "/inventory/suppliers": { collection: "products" },
  "/inventory/movement": { collection: "products" },
  "/inventory/expiry": { collection: "products" },

  /* Finance */
  "/finance/invoices": { collection: "invoices" },
  "/finance/payments": { collection: "invoices", preset: preset("Settled", "status", "Paid", "Partially Paid") },
  "/finance/refunds": { collection: "invoices", preset: preset("Refunded", "status", "Refunded") },
  "/finance/outstanding": { collection: "invoices", preset: preset("Unpaid", "status", "Overdue", "Pending", "Partially Paid") },
  "/finance/expenses": { collection: "products" },
  "/finance/revenue": { collection: "invoices" },

  /* Customer Success */
  "/cs/member-health": { collection: "members" },
  "/cs/at-risk": { collection: "members", preset: preset("At risk", "riskLevel", "High", "Medium") },
  "/cs/feedback": { collection: "supportTickets", preset: { label: "With CSAT", test: (r) => r["satisfaction"] != null } },
  "/cs/grievances": { collection: "complaints" },
  "/cs/retention": { collection: "members" },

  /* Support & Grievance */
  "/support/tickets": { collection: "supportTickets" },
  "/support/escalations": { collection: "supportTickets", preset: preset("Escalated", "status", "Escalated") },
  "/support/sla": { collection: "complaints", preset: { label: "SLA breached", test: (r) => r["slaBreached"] === true } },

  /* AI & Intelligence */
  "/ai/coach": { collection: "aiCoachPlans", hint: "AI-generated adaptive training plans with human review gates." },
  "/ai/trainer-copilot": { collection: "copilotInsights", hint: "Session-level recommendations served to trainers." },
  "/ai/business-intelligence": { collection: "biInsights" },
  "/ai/computer-vision": { collection: "visionAnalyses" },
  "/ai/live-sessions": { collection: "liveSessions" },
  "/ai/group-tracking": { collection: "groupTracking" },
  "/ai/ml-admin": { collection: "mlModels", hint: "Platform AI/ML administration: models, drift, guardrails and cost." },

  /* Coaching */
  "/coaching/online-coaches": { collection: "coaches", preset: preset("Online coaches", "coachType", "Online Coach") },
  "/coaching/nutrition-coaches": { collection: "coaches", preset: preset("Nutrition coaches", "coachType", "Nutrition Coach") },
  "/coaching/program-builder": { collection: "programs" },
  "/coaching/trainers": { collection: "trainers" },

  /* Marketing */
  "/marketing/campaigns": { collection: "campaigns" },
  "/marketing/audiences": { collection: "campaigns" },
  "/marketing/communication": { collection: "communications" },
  "/marketing/templates": { collection: "communications" },

  /* Automation */
  "/automation/workflows": { collection: "workflows" },
  "/automation/approvals": { collection: "approvals" },
  "/automation/notifications": { collection: "communications" },
  "/automation/rules": { collection: "workflows" },

  /* Reports */
  "/reports/business": { collection: "invoices" },
  "/reports/sales": { collection: "leads" },
  "/reports/members": { collection: "members" },
  "/reports/trainers": { collection: "trainers" },
  "/reports/financial": { collection: "invoices" },
  "/reports/performance": { collection: "assessments" },

  /* Administration */
  "/admin/users": { collection: "users" },
  "/admin/roles": { collection: "users" },
  "/admin/permissions": { collection: "users" },
  "/admin/locations": { collection: "locations" },
  "/admin/services": { collection: "services" },
  "/admin/configuration": { collection: "integrations" },
  "/admin/forms": { collection: "services" },
  "/admin/integrations": { collection: "integrations" },
  "/admin/api": { collection: "integrations" },
  "/admin/audit-logs": { collection: "auditLogs" },
  "/admin/security": { collection: "auditLogs" },

  /* Platform */
  "/platform/tenants": { collection: "tenants" },
  "/platform/onboard": { collection: "tenants", hint: "Onboard new tenant organization, configure initial branding and subscription tier." },
  "/platform/plans": { collection: "plans" },
  "/platform/usage": { collection: "tenants" },
  "/platform/billing": { collection: "tenants" },
  "/platform/marketplace": { collection: "integrations" },
  "/platform/branding": { collection: "tenants" },
};

export function moduleDef(path: string): ModuleDef | undefined {
  return MODULES[path];
}
