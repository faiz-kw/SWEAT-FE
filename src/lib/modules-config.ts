import { NAV, type NavSection, type NavItem } from "./nav";

export interface SubmoduleDefinition {
  id: string;
  label: string;
  to: string;
  description?: string;
}

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
  isAddon?: boolean;
  submodules: SubmoduleDefinition[];
}

/**
 * Curated list of all configurable business modules and their submodules for PerformanceOS.
 */
export const FEATURE_MODULES_CATALOG: ModuleDefinition[] = [
  {
    id: "crm",
    label: "CRM & Sales Pipeline",
    description: "Lead capture, sales pipelines, trial bookings, and promotional campaign automation.",
    icon: "Target",
    badge: "HOT",
    submodules: [
      { id: "/crm/leads", label: "Leads & Enquiries", to: "/crm/leads", description: "Inbound and outbound prospect lead records." },
      { id: "/crm/pipeline", label: "Visual Sales Pipeline", to: "/crm/pipeline", description: "Kanban board of open deals and pipeline stages." },
      { id: "/crm/trials", label: "Trial Sessions", to: "/crm/trials", description: "Free and paid workout trial booking tracker." },
      { id: "/crm/activities", label: "Sales Activities", to: "/crm/activities", description: "Calls, meetings, and sales interaction logs." },
      { id: "/crm/follow-ups", label: "Task Follow-ups", to: "/crm/follow-ups", description: "Scheduled tasks and reminders for sales reps." },
      { id: "/crm/offers", label: "Special Offers", to: "/crm/offers", description: "Targeted promotional packages and deals." },
      { id: "/crm/coupons", label: "Discount Coupons", to: "/crm/coupons", description: "Promo code management and redemption rules." },
      { id: "/crm/setup", label: "CRM Setup", to: "/crm/setup", description: "Configurable lead sources, stage SLAs, trial reminders, and channels." },
    ],
  },
  {
    id: "members",
    label: "Member 360 & Lifecycle",
    description: "Complete membership profiles, check-ins, automated renewals, and freeze management.",
    icon: "Users",
    submodules: [
      { id: "/members", label: "Member Directory", to: "/members", description: "Search and manage all active, trial, and past members." },
      { id: "/members/client-360", label: "Client 360 Dossier", to: "/members/client-360", description: "Holistic member history across classes, purchases, and habits." },
      { id: "/members/memberships", label: "Membership Plans", to: "/members/memberships", description: "Active subscription packages and recurring terms." },
      { id: "/members/renewals", label: "Renewals Pipeline", to: "/members/renewals", description: "Expiring memberships and automated retention workflows." },
      { id: "/members/freeze", label: "Membership Freeze & Pause", to: "/members/freeze", description: "Medical and travel pause requests with compliance rules." },
      { id: "/members/transfers", label: "Branch Transfers", to: "/members/transfers", description: "Inter-studio and inter-location member transfers." },
      { id: "/members/attendance", label: "Access & Attendance", to: "/members/attendance", description: "Live RFID, QR, and turnstile check-in logs." },
    ],
  },
  {
    id: "ops",
    label: "Studio Operations & Scheduling",
    description: "Multi-studio class calendars, PT allocations, trainer rosters, and workout programs.",
    icon: "CalendarRange",
    submodules: [
      { id: "/ops/calendar", label: "Master Calendar", to: "/ops/calendar", description: "Unified visual schedule across all studios and rooms." },
      { id: "/ops/classes", label: "Group Fitness Classes", to: "/ops/classes", description: "HIIT, Spin, Zumba, and Strength group class rosters." },
      { id: "/ops/bookings", label: "Class Bookings", to: "/ops/bookings", description: "Client reservations, waitlists, and cancellation policies." },
      { id: "/ops/personal-training", label: "1-on-1 Personal Training", to: "/ops/personal-training", description: "Private trainer appointment scheduling and quotas." },
      { id: "/ops/assessments", label: "Body & Fitness Assessments", to: "/ops/assessments", description: "InBody, body fat %, and functional movement benchmarks." },
      { id: "/ops/trainers", label: "Trainer Roster & Shifts", to: "/ops/trainers", description: "Staff scheduling, payroll hours, and availability." },
      { id: "/ops/programs", label: "Workout Program Builder", to: "/ops/programs", description: "Structured multi-week workout and training templates." },
    ],
  },
  {
    id: "finance",
    label: "Invoicing & GST Billing",
    description: "POS billing, GST compliant tax invoices, payment gateways, and revenue ledger.",
    icon: "Wallet",
    submodules: [
      { id: "/finance/invoices", label: "Tax Invoices", to: "/finance/invoices", description: "GSTIN-compliant tax invoices and receipts." },
      { id: "/finance/payments", label: "Payment Collections", to: "/finance/payments", description: "UPI, Cards, Cash, and Netbanking transaction records." },
      { id: "/finance/refunds", label: "Refunds & Adjustments", to: "/finance/refunds", description: "Authorized refund processing and credit notes." },
      { id: "/finance/outstanding", label: "Outstanding Dues", to: "/finance/outstanding", description: "Overdue fee tracking and payment reminder triggers." },
      { id: "/finance/expenses", label: "Studio Expenses", to: "/finance/expenses", description: "Equipment maintenance, utilities, and vendor costs." },
      { id: "/finance/revenue", label: "Revenue Analytics", to: "/finance/revenue", description: "Monthly recurring revenue, cash flow, and tax reports." },
    ],
  },
  {
    id: "ai",
    label: "AI & Intelligence Suite",
    description: "Autonomous workout copilot, computer vision posture analysis, and predictive BI.",
    icon: "Sparkles",
    badge: "AI",
    isAddon: true,
    submodules: [
      { id: "/ai/coach", label: "AI Adaptive Coach", to: "/ai/coach", description: "Auto-generating progressive training programs." },
      { id: "/ai/trainer-copilot", label: "Trainer Copilot Insights", to: "/ai/trainer-copilot", description: "Live coaching recommendations served directly to trainers." },
      { id: "/ai/business-intelligence", label: "Predictive Business BI", to: "/ai/business-intelligence", description: "Churn prediction, peak capacity forecasting, and revenue insights." },
      { id: "/ai/computer-vision", label: "CV Movement & Form Analysis", to: "/ai/computer-vision", description: "Camera-based squat and deadlift biomechanics scoring." },
      { id: "/ai/live-sessions", label: "Live Telemetry Sessions", to: "/ai/live-sessions", description: "Heart rate and wearable IoT live telemetry streaming." },
      { id: "/ai/group-tracking", label: "Group Class Heart Rate Display", to: "/ai/group-tracking", description: "Gym-floor screen displaying heart rate zones." },
    ],
  },
  {
    id: "nutrition",
    label: "Nutrition & Diet Planning",
    description: "Macronutrient meal planners, clinical diet logs, and supplement dispensaries.",
    icon: "Apple",
    submodules: [
      { id: "/nutrition/diet-plans", label: "Custom Meal & Macro Plans", to: "/nutrition/diet-plans", description: "Calorie & macronutrient targets per goal." },
      { id: "/nutrition/consultations", label: "Dietician Consultations", to: "/nutrition/consultations", description: "Clinical nutritionist appointment records." },
      { id: "/nutrition/food-logs", label: "Member Food Logging", to: "/nutrition/food-logs", description: "Daily nutrition and hydration compliance checks." },
      { id: "/nutrition/supplements", label: "Supplement Dispensary", to: "/nutrition/supplements", description: "Whey protein, creatine, and recovery supplement tracking." },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Pro Shop POS",
    description: "Retail merchandise, supplement stocks, vendor orders, and batch expiry tracking.",
    icon: "Package",
    submodules: [
      { id: "/inventory/products", label: "Product Catalog", to: "/inventory/products", description: "Apparel, gear, supplements, and amenities." },
      { id: "/inventory/stock", label: "Live Stock Levels", to: "/inventory/stock", description: "Multi-location warehouse and pro-shop quantities." },
      { id: "/inventory/purchases", label: "Purchase Orders", to: "/inventory/purchases", description: "Vendor replenishment orders and receiving." },
      { id: "/inventory/movement", label: "Stock Movement Log", to: "/inventory/movement", description: "Audit trail of damaged, transferred, or sold units." },
      { id: "/inventory/expiry", label: "Expiry Tracking", to: "/inventory/expiry", description: "Batch expiration dates and markdown alerts." },
    ],
  },
  {
    id: "cs",
    label: "Customer Success & Retention",
    description: "Member health scoring, churn prediction, CSAT surveys, and grievances.",
    icon: "HeartPulse",
    submodules: [
      { id: "/cs/member-health", label: "Member Health Score", to: "/cs/member-health", description: "Engagement and visit frequency scoring." },
      { id: "/cs/at-risk", label: "At-Risk Retention Desk", to: "/cs/at-risk", description: "Intervention queue for members with declining attendance." },
      { id: "/cs/feedback", label: "CSAT & Net Promoter Score", to: "/cs/feedback", description: "Post-workout survey responses and ratings." },
      { id: "/cs/grievances", label: "Formal Complaints & Grievances", to: "/cs/grievances", description: "Facility, staff, and hygiene escalation tickets." },
      { id: "/cs/retention", label: "Win-back Campaigns", to: "/cs/retention", description: "Automated reactivation workflows." },
    ],
  },
  {
    id: "performance",
    label: "Athlete Performance & Tracking",
    description: "Workout telemetry, biomechanics scoring, wearable IoT, and leaderboards.",
    icon: "Activity",
    submodules: [
      { id: "/performance/workouts", label: "Workout Logging", to: "/performance/workouts", description: "Session logs, sets, reps, and RPE." },
      { id: "/performance/analytics", label: "Body Analytics", to: "/performance/analytics", description: "Volume, frequency, and progressive overload graphs." },
      { id: "/performance/wearables", label: "Wearable IoT", to: "/performance/wearables", description: "Garmin, Apple Health, and Whoop biometric sync." },
      { id: "/performance/leaderboards", label: "Leaderboards", to: "/performance/leaderboards", description: "Gym-floor rankings and challenge scores." },
      { id: "/performance/pr-tracker", label: "PR Tracker", to: "/performance/pr-tracker", description: "Personal records for compound lifts." },
    ],
  },
  {
    id: "coaching",
    label: "Coaching & Athlete Development",
    description: "Personal trainer allocations and coach directory.",
    icon: "Dumbbell",
    submodules: [
      { id: "/coaching/trainers", label: "Trainers Roster", to: "/coaching/trainers", description: "Certified coach directory and availability." },
      { id: "/coaching/online-coaches", label: "Online Coaches", to: "/coaching/online-coaches", description: "Remote training and digital check-ins." },
      { id: "/coaching/nutrition-coaches", label: "Nutrition Coaches", to: "/coaching/nutrition-coaches", description: "Certified nutritionists and meal consultants." },
    ],
  },
  {
    id: "support",
    label: "Support & Grievance Desk",
    description: "Help desk ticketing, issue escalation matrices, and SLA management.",
    icon: "LifeBuoy",
    submodules: [
      { id: "/support/tickets", label: "Support Tickets", to: "/support/tickets", description: "Member inquiries and service tickets." },
      { id: "/support/escalations", label: "Escalations Matrix", to: "/support/escalations", description: "High-priority grievance tracking." },
      { id: "/support/sla", label: "SLA Monitor", to: "/support/sla", description: "Resolution time compliance dashboards." },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Growth Engine",
    description: "Lead magnets, broadcast SMS/WhatsApp campaigns, reviews, and referral programs.",
    icon: "Megaphone",
    submodules: [
      { id: "/marketing/campaigns", label: "Broadcast Campaigns", to: "/marketing/campaigns", description: "Automated promotional broadcasts." },
      { id: "/marketing/lead-magnets", label: "Lead Magnets", to: "/marketing/lead-magnets", description: "Free passes, diet guides, and funnel assets." },
      { id: "/marketing/referrals", label: "Referral Program", to: "/marketing/referrals", description: "Member-get-member reward tracking." },
      { id: "/marketing/reviews", label: "Reviews & Reputation", to: "/marketing/reviews", description: "Google Business and Trustpilot review management." },
    ],
  },
  {
    id: "automation",
    label: "Workflow & Rule Automation",
    description: "Trigger-action workflows, automated member approvals, and webhook rules.",
    icon: "Workflow",
    submodules: [
      { id: "/automation/workflows", label: "Active Workflows", to: "/automation/workflows", description: "Visual trigger-action flow sequences." },
      { id: "/automation/triggers", label: "Event Triggers", to: "/automation/triggers", description: "Check-in, expiry, and payment event hooks." },
      { id: "/automation/approvals", label: "Manager Approvals", to: "/automation/approvals", description: "Refund, freeze, and discount approval queues." },
      { id: "/automation/notifications", label: "Notifications Log", to: "/automation/notifications", description: "Push, SMS, and WhatsApp sent delivery logs." },
      { id: "/automation/rules", label: "Business Rules Engine", to: "/automation/rules", description: "Access gating and automated billing rules." },
    ],
  },
  {
    id: "reports",
    label: "Analytics & Executive BI",
    description: "Deep business reporting, revenue cohort analytics, and athletic performance KPIs.",
    icon: "BarChart3",
    submodules: [
      { id: "/reports/business", label: "Business Reports", to: "/reports/business", description: "High-level studio performance and revenue overview." },
      { id: "/reports/sales", label: "Sales Reports", to: "/reports/sales", description: "Conversion rates, rep leaderboards, and pipeline velocity." },
      { id: "/reports/members", label: "Member Reports", to: "/reports/members", description: "Churn, retention, cohort, and attendance breakdowns." },
      { id: "/reports/trainers", label: "Trainer Reports", to: "/reports/trainers", description: "PT utilization, client ratings, and session delivery." },
      { id: "/reports/financial", label: "Financial Reports", to: "/reports/financial", description: "GST filing, expense summaries, and collection ledger." },
      { id: "/reports/performance", label: "Performance Reports", to: "/reports/performance", description: "Workout volume and member fitness milestone trends." },
    ],
  },
];

/** Set of all module IDs in the catalog for fast lookup */
const CATALOG_MODULE_IDS = new Set(FEATURE_MODULES_CATALOG.map((m) => m.id));

/** Canonical path aliases for submodules whose route path differs from DB submodule_code */
const SUBMODULE_PATH_ALIASES: Record<string, string[]> = {
  "/crm/setup": ["/crm/setup", "/crm/settings"],
  "/crm/settings": ["/crm/setup", "/crm/settings"],
};

/**
 * Returns all submodule paths belonging to a module ID.
 */
export function getSubmodulePathsForModule(moduleId: string): string[] {
  const mod = FEATURE_MODULES_CATALOG.find((m) => m.id === moduleId);
  if (!mod) return [];
  const paths = mod.submodules.map((s) => s.to);
  if (moduleId === "crm") {
    return Array.from(new Set([...paths, "/crm/settings"]));
  }
  return paths;
}

/**
 * Returns all default submodule paths across all modules.
 */
export function getAllDefaultSubmodulePaths(): string[] {
  return FEATURE_MODULES_CATALOG.flatMap((m) => m.submodules.map((s) => s.to));
}

/**
 * Checks if a specific nav item (submodule route) is enabled for the tenant.
 *
 * Semantics of enabledModules:
 *   null / undefined → Super Admin / unrestricted — allow everything
 *   []               → No modules provisioned — deny everything
 *   [...paths]       → Only allow explicitly listed module IDs and submodule paths
 *
 * @param enabledModules  The tenant's Tenant.enabled_modules value (from /me/ response).
 * @param submodulePath   The nav item's route path (e.g. "/crm/leads").
 * @param parentModuleId  The nav section's ID (e.g. "crm", "members", "ops").
 */
export function isSubmoduleAllowed(
  enabledModules: string[] | undefined | null,
  submodulePath: string,
  parentModuleId?: string
): boolean {
  // null / undefined = super admin / no restriction — allow everything
  if (enabledModules === null || enabledModules === undefined) return true;

  // Wildcard — allow everything
  if (enabledModules.includes("*") || enabledModules.includes("all")) return true;

  const candidatePaths = SUBMODULE_PATH_ALIASES[submodulePath] || [submodulePath];

  // Direct submodule path match (including canonical aliases)
  if (candidatePaths.some((p) => enabledModules.includes(p))) return true;

  // If the parent module ID is in the FEATURE_MODULES_CATALOG
  if (parentModuleId && CATALOG_MODULE_IDS.has(parentModuleId)) {
    // Parent module ID itself is in the list (e.g. "crm" means all CRM submodules)
    if (enabledModules.includes(parentModuleId)) {
      const parentSubmodules = getSubmodulePathsForModule(parentModuleId);
      // If no granular submodule overrides exist, all submodules of this module are allowed
      const hasGranularOverrides = enabledModules.some((item) =>
        parentSubmodules.includes(item) ||
        (SUBMODULE_PATH_ALIASES[item] && SUBMODULE_PATH_ALIASES[item].some((alt) => parentSubmodules.includes(alt)))
      );
      if (!hasGranularOverrides) return true;
      // Granular overrides exist — only allow if explicitly listed
      return candidatePaths.some((p) => enabledModules.includes(p));
    }
    // Module is in catalog but NOT in the tenant's provisioned list — deny
    return false;
  }

  // Nav section is NOT in the FEATURE_MODULES_CATALOG (e.g. "coaching", "support",
  // "performance", "marketing", "automation", "reports").
  // Check if any enabled entry is a path-prefix match for the item.
  if (enabledModules.some((entry) => entry.startsWith("/") && candidatePaths.some((cp) => cp.startsWith(entry)))) {
    return true;
  }

  // Default deny for uncatalogued sections not explicitly granted
  return false;
}

