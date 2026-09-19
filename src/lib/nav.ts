import type { AuthUser } from "@/services";
import { hasPermission } from "./permissions";
import { isSubmoduleAllowed } from "./modules-config";

export type NavItem = {
  label: string;
  to: string;
  badgeKey?: "leads" | "atRisk" | "approvals" | "grievances";
  /** Required backend permission code to view this page */
  permission?: string;
  /** Controls role-based visibility:
   *  - 'all' (default): visible to all
   *  - 'superadmin_only': only Platform Super Admins see this
   *  - 'tenant_only': only tenant users see this
   */
  visibility?: "all" | "superadmin_only" | "tenant_only";
};

export type NavSection = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
  /** Required backend permission code to view this section */
  permission?: string;
  /** Controls role-based visibility:
   *  - 'all' (default): all authenticated users can see it
   *  - 'superadmin_only': only Platform Super Admins (no tenant) see this
   *  - 'tenant_only': only users with a tenant (not super admins) see this
   */
  visibility?: "all" | "superadmin_only" | "tenant_only";
};

/**
 * Filter NAV sections and their items based on:
 * 1. Super Admin vs. Tenant scope (visibility)
 * 2. Tenant's plan/provisioned modules (enabledModules)
 * 3. User's effective permissions (hasPermission)
 *
 * Automatic pruning: Any section with 0 visible children is automatically hidden.
 */
export function getFilteredNav(
  user: AuthUser | null | undefined,
  isSuperAdmin: boolean,
  enabledModules: string[] | null = null
): NavSection[] {
  // Fail closed if no user context
  if (!user && !isSuperAdmin) return [];

  return NAV.filter((section) => {
    // 1. Check section visibility flag
    const vis = section.visibility ?? "all";
    if (vis === "superadmin_only" && !isSuperAdmin) return false;
    if (vis === "tenant_only" && isSuperAdmin) return false;

    // 2. Check section permission if specified
    if (section.permission && !hasPermission(user, section.permission)) {
      return false;
    }

    return true;
  })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // 1. Check item visibility flag
        const itemVis = item.visibility ?? "all";
        if (itemVis === "superadmin_only" && !isSuperAdmin) return false;
        if (itemVis === "tenant_only" && isSuperAdmin) return false;

        // 2. Check tenant provisioned module restriction (skip for system sections)
        if (
          !isSuperAdmin &&
          section.id !== "dashboard" &&
          section.id !== "admin" &&
          section.id !== "platform"
        ) {
          if (!isSubmoduleAllowed(enabledModules, item.to, section.id)) {
            return false;
          }
        }

        // 3. Check granular effective user permission
        if (item.permission && !hasPermission(user, item.permission)) {
          return false;
        }

        return true;
      }),
    }))
    // Prune parent section if all children are inaccessible
    .filter((section) => section.items.length > 0);
}

/**
 * Single source of truth for the console navigation. Route files mirror these
 * paths exactly; the header breadcrumb and command palette read from here too.
 */
export const NAV: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    items: [
      { label: "Executive Dashboard", to: "/" },
      { label: "Member Lifecycle", to: "/lifecycle" },
      { label: "Module Overviews", to: "/overview/all" },
    ],
  },
  {
    id: "crm",
    label: "CRM & Sales",
    icon: "Target",
    items: [
      { label: "Leads", to: "/crm/leads", badgeKey: "leads", permission: "crm.leads.view" },
      { label: "Lead Pipeline", to: "/crm/pipeline", permission: "crm.pipeline.view" },
      { label: "AI Calling", to: "/crm/ai-calling", permission: "crm.ai-calling.view" },
      { label: "Trial Management", to: "/crm/trials", permission: "crm.trials.view" },
      { label: "Sales Activities", to: "/crm/activities", permission: "crm.pipeline.view" },
      { label: "Follow-ups", to: "/crm/follow-ups", permission: "crm.follow-ups.view" },
      { label: "Offers", to: "/crm/offers", permission: "crm.campaigns.view" },
      { label: "Coupons", to: "/crm/coupons", permission: "crm.campaigns.view" },
      { label: "Campaigns", to: "/crm/campaigns", permission: "crm.campaigns.view" },
    ],
  },
  {
    id: "members",
    label: "Members",
    icon: "Users",
    items: [
      { label: "All Members", to: "/members", permission: "members.client-360.view" },
      { label: "Client 360", to: "/members/client-360", permission: "members.client-360.view" },
      { label: "Memberships", to: "/members/memberships", permission: "members.memberships.view" },
      { label: "Renewals", to: "/members/renewals", permission: "members.renewals.view" },
      { label: "Freeze / Pause", to: "/members/freeze", permission: "members.freeze.view" },
      { label: "Transfers", to: "/members/transfers", permission: "members.transfers.view" },
      { label: "Attendance", to: "/members/attendance", permission: "members.attendance.view" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    icon: "CalendarRange",
    items: [
      { label: "Calendar", to: "/ops/calendar", permission: "ops.calendar.view" },
      { label: "Classes", to: "/ops/classes", permission: "ops.classes.view" },
      { label: "Bookings", to: "/ops/bookings", permission: "ops.bookings.view" },
      { label: "Personal Training", to: "/ops/personal-training", permission: "ops.personal-training.view" },
      { label: "Pilates", to: "/ops/pilates", permission: "ops.pilates.view" },
      { label: "Assessments", to: "/ops/assessments", permission: "performance.analytics.view" },
      { label: "Trainers", to: "/ops/trainers", permission: "ops.trainers.view" },
      { label: "Programs", to: "/ops/programs", permission: "core.settings.view" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: "Activity",
    items: [
      { label: "Assessments", to: "/performance/assessments", permission: "performance.analytics.view" },
      { label: "Performance Intelligence", to: "/performance/intelligence", permission: "performance.analytics.view" },
      { label: "Progress", to: "/performance/progress", permission: "performance.workouts.view" },
      { label: "Recovery", to: "/performance/recovery", permission: "performance.wearables.view" },
      { label: "Movement Intelligence", to: "/performance/movement", permission: "performance.workouts.view" },
    ],
  },
  {
    id: "ai",
    label: "AI & Intelligence",
    icon: "Sparkles",
    items: [
      { label: "AI Coach", to: "/ai/coach", permission: "ai.coach.view" },
      { label: "Trainer Copilot", to: "/ai/trainer-copilot", permission: "ai.trainer-copilot.view" },
      { label: "AI Business Intelligence", to: "/ai/business-intelligence", permission: "ai.business-intelligence.view" },
      { label: "Computer Vision", to: "/ai/computer-vision", permission: "ai.computer-vision.view" },
      { label: "Live Session", to: "/ai/live-sessions", permission: "ai.live-sessions.view" },
      { label: "Group Class Tracking", to: "/ai/group-tracking", permission: "ai.live-sessions.view" },
      { label: "AI/ML Administrator", to: "/ai/ml-admin", permission: "ai.business-intelligence.view" },
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    icon: "Dumbbell",
    items: [
      { label: "Trainers", to: "/coaching/trainers", permission: "coaching.trainers.view" },
      { label: "Online Coaches", to: "/coaching/online-coaches", permission: "coaching.online-coaches.view" },
      { label: "Nutrition Coaches", to: "/coaching/nutrition-coaches", permission: "coaching.nutrition-coaches.view" },
      { label: "Program Builder", to: "/coaching/program-builder", permission: "coaching.program-builder.view" },
    ],
  },
  {
    id: "support",
    label: "Support & Grievance",
    icon: "LifeBuoy",
    items: [
      { label: "Tickets", to: "/support/tickets", permission: "support.tickets.view" },
      { label: "Escalations", to: "/support/escalations", permission: "support.escalations.view" },
      { label: "SLA Monitor", to: "/support/sla", permission: "support.sla.view" },
    ],
  },
  {
    id: "nutrition",
    label: "Nutrition",
    icon: "Apple",
    items: [
      { label: "Diet Plans", to: "/nutrition/diet-plans", permission: "nutrition.diet-plans.view" },
      { label: "Consultations", to: "/nutrition/consultations", permission: "nutrition.consultations.view" },
      { label: "Food Logs", to: "/nutrition/food-logs", permission: "nutrition.food-logs.view" },
      { label: "Supplements", to: "/nutrition/supplements", permission: "nutrition.supplements.view" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "Package",
    items: [
      { label: "Products", to: "/inventory/products", permission: "inventory.products.view" },
      { label: "Stock", to: "/inventory/stock", permission: "inventory.stock.view" },
      { label: "Purchases", to: "/inventory/purchases", permission: "inventory.purchases.view" },
      { label: "Suppliers", to: "/inventory/suppliers", permission: "inventory.purchases.view" },
      { label: "Stock Movement", to: "/inventory/movement", permission: "inventory.stock.view" },
      { label: "Expiry", to: "/inventory/expiry", permission: "inventory.expiry.view" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Wallet",
    items: [
      { label: "Invoices", to: "/finance/invoices", permission: "finance.invoices.view" },
      { label: "Payments", to: "/finance/payments", permission: "finance.payments.view" },
      { label: "Refunds", to: "/finance/refunds", permission: "finance.refunds.view" },
      { label: "Outstanding", to: "/finance/outstanding", permission: "finance.outstanding.view" },
      { label: "Expenses", to: "/finance/expenses", permission: "finance.expenses.view" },
      { label: "Revenue", to: "/finance/revenue", permission: "finance.revenue.view" },
    ],
  },
  {
    id: "cs",
    label: "Customer Success",
    icon: "HeartPulse",
    items: [
      { label: "Member Health", to: "/cs/member-health", permission: "cs.member-health.view" },
      { label: "At Risk", to: "/cs/at-risk", badgeKey: "atRisk", permission: "cs.at-risk.view" },
      { label: "Feedback", to: "/cs/feedback", permission: "cs.feedback.view" },
      { label: "Grievances", to: "/cs/grievances", badgeKey: "grievances", permission: "cs.grievances.view" },
      { label: "Retention", to: "/cs/retention", permission: "cs.member-health.view" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "Megaphone",
    items: [
      { label: "Campaigns", to: "/marketing/campaigns", permission: "marketing.campaigns.view" },
      { label: "Audiences", to: "/marketing/audiences", permission: "marketing.campaigns.view" },
      { label: "Communication", to: "/marketing/communication", permission: "marketing.campaigns.view" },
      { label: "Templates", to: "/marketing/templates", permission: "marketing.campaigns.view" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    icon: "Workflow",
    items: [
      { label: "Workflows", to: "/automation/workflows", permission: "automation.workflows.view" },
      { label: "Approvals", to: "/automation/approvals", badgeKey: "approvals", permission: "automation.approvals.view" },
      { label: "Notifications", to: "/automation/notifications", permission: "automation.notifications.view" },
      { label: "Rules", to: "/automation/rules", permission: "automation.rules.view" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "BarChart3",
    items: [
      { label: "Business Reports", to: "/reports/business", permission: "reports.business.view" },
      { label: "Sales Reports", to: "/reports/sales", permission: "reports.sales.view" },
      { label: "Member Reports", to: "/reports/members", permission: "reports.members.view" },
      { label: "Trainer Reports", to: "/reports/trainers", permission: "reports.trainers.view" },
      { label: "Financial Reports", to: "/reports/financial", permission: "reports.financial.view" },
      { label: "Performance Reports", to: "/reports/performance", permission: "reports.performance.view" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: "Settings",
    items: [
      { label: "Users", to: "/admin/users", permission: "core.users.view" },
      { label: "Roles", to: "/admin/roles", permission: "core.roles.view" },
      { label: "Permissions", to: "/admin/permissions", permission: "core.permissions.view" },
      { label: "Locations", to: "/admin/locations", permission: "core.settings.view" },
      { label: "Services", to: "/admin/services", visibility: "superadmin_only" },
      { label: "Configuration", to: "/admin/configuration", visibility: "superadmin_only" },
      { label: "Forms", to: "/admin/forms", visibility: "superadmin_only" },
      { label: "Integrations", to: "/admin/integrations", visibility: "superadmin_only" },
      { label: "API", to: "/admin/api", visibility: "superadmin_only" },
      { label: "Audit Logs", to: "/admin/audit-logs", permission: "core.audit.view" },
      { label: "Security", to: "/admin/security", permission: "core.security.view" },
    ],
  },
  {
    id: "platform",
    label: "Platform Core",
    icon: "Building2",
    visibility: "superadmin_only",
    items: [
      { label: "Tenants", to: "/platform/tenants" },
      { label: "Onboard Tenant", to: "/platform/onboard" },
      { label: "Plans & Modules", to: "/platform/plans" },
      { label: "Usage", to: "/platform/usage" },
      { label: "Subscription Billing", to: "/platform/billing" },
      { label: "Marketplace", to: "/platform/marketplace" },
      { label: "White Label", to: "/platform/branding" },
    ],
  },
];

export const ALL_NAV_ITEMS: {
  section: string;
  sectionId: string;
  label: string;
  to: string;
  permission?: string;
  visibility?: "all" | "superadmin_only" | "tenant_only";
  sectionVisibility?: "all" | "superadmin_only" | "tenant_only";
}[] = NAV.flatMap((s) =>
  s.items.map((i) => ({
    section: s.label,
    sectionId: s.id,
    label: i.label,
    to: i.to,
    permission: i.permission,
    visibility: i.visibility,
    sectionVisibility: s.visibility,
  }))
);

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((i) => i.to === pathname);
}
