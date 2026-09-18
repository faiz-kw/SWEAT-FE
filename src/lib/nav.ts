export type NavItem = {
  label: string;
  to: string;
  badgeKey?: "leads" | "atRisk" | "approvals" | "grievances";
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
  /** Controls role-based visibility:
   *  - 'all' (default): all authenticated users can see it
   *  - 'superadmin_only': only Platform Super Admins (no tenant) see this
   *  - 'tenant_only': only users with a tenant (not super admins) see this
   */
  visibility?: "all" | "superadmin_only" | "tenant_only";
};

/**
 * Filter NAV sections and their items based on the authenticated user's role.
 * - Super Admins (isSuperAdmin = true) see: Platform Core, Administration, + all tenant modules
 * - Tenant users (Admin, Manager, Trainer, etc.) see: all tenant modules EXCEPT Platform Core,
 *   and Administration with only tenant-applicable items.
 */
export function getFilteredNav(isSuperAdmin: boolean): NavSection[] {
  return NAV.filter((section) => {
    const vis = section.visibility ?? "all";
    if (vis === "all") return true;
    if (vis === "superadmin_only") return isSuperAdmin;
    if (vis === "tenant_only") return !isSuperAdmin;
    return true;
  })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const itemVis = item.visibility ?? "all";
        if (itemVis === "all") return true;
        if (itemVis === "superadmin_only") return isSuperAdmin;
        if (itemVis === "tenant_only") return !isSuperAdmin;
        return true;
      }),
    }))
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
      { label: "Leads", to: "/crm/leads", badgeKey: "leads" },
      { label: "Lead Pipeline", to: "/crm/pipeline" },
      { label: "AI Calling", to: "/crm/ai-calling" },
      { label: "Trial Management", to: "/crm/trials" },
      { label: "Sales Activities", to: "/crm/activities" },
      { label: "Follow-ups", to: "/crm/follow-ups" },
      { label: "Offers", to: "/crm/offers" },
      { label: "Coupons", to: "/crm/coupons" },
      { label: "Campaigns", to: "/crm/campaigns" },
    ],
  },
  {
    id: "members",
    label: "Members",
    icon: "Users",
    items: [
      { label: "All Members", to: "/members" },
      { label: "Client 360", to: "/members/client-360" },
      { label: "Memberships", to: "/members/memberships" },
      { label: "Renewals", to: "/members/renewals" },
      { label: "Freeze / Pause", to: "/members/freeze" },
      { label: "Transfers", to: "/members/transfers" },
      { label: "Attendance", to: "/members/attendance" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    icon: "CalendarRange",
    items: [
      { label: "Calendar", to: "/ops/calendar" },
      { label: "Classes", to: "/ops/classes" },
      { label: "Bookings", to: "/ops/bookings" },
      { label: "Personal Training", to: "/ops/personal-training" },
      { label: "Pilates", to: "/ops/pilates" },
      { label: "Assessments", to: "/ops/assessments" },
      { label: "Trainers", to: "/ops/trainers" },
      { label: "Programs", to: "/ops/programs" },
      { label: "Exercises", to: "/ops/exercises" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: "Activity",
    items: [
      { label: "Assessments", to: "/performance/assessments" },
      { label: "Performance Intelligence", to: "/performance/intelligence" },
      { label: "Progress", to: "/performance/progress" },
      { label: "Recovery", to: "/performance/recovery" },
      { label: "Movement Intelligence", to: "/performance/movement" },
    ],
  },
  {
    id: "ai",
    label: "AI & Intelligence",
    icon: "Sparkles",
    items: [
      { label: "AI Coach", to: "/ai/coach" },
      { label: "Trainer Copilot", to: "/ai/trainer-copilot" },
      { label: "AI Business Intelligence", to: "/ai/business-intelligence" },
      { label: "Computer Vision", to: "/ai/computer-vision" },
      { label: "Live Session", to: "/ai/live-sessions" },
      { label: "Group Class Tracking", to: "/ai/group-tracking" },
      { label: "AI/ML Administrator", to: "/ai/ml-admin" },
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    icon: "Dumbbell",
    items: [
      { label: "Trainers", to: "/coaching/trainers" },
      { label: "Online Coaches", to: "/coaching/online-coaches" },
      { label: "Nutrition Coaches", to: "/coaching/nutrition-coaches" },
      { label: "Exercise Library", to: "/coaching/exercise-library" },
      { label: "Program Builder", to: "/coaching/program-builder" },
    ],
  },
  {
    id: "support",
    label: "Support & Grievance",
    icon: "LifeBuoy",
    items: [
      { label: "Tickets", to: "/support/tickets" },
      { label: "Escalations", to: "/support/escalations" },
      { label: "SLA Monitor", to: "/support/sla" },
    ],
  },
  {
    id: "nutrition",
    label: "Nutrition",
    icon: "Apple",
    items: [
      { label: "Diet Plans", to: "/nutrition/diet-plans" },
      { label: "Consultations", to: "/nutrition/consultations" },
      { label: "Food Logs", to: "/nutrition/food-logs" },
      { label: "Supplements", to: "/nutrition/supplements" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "Package",
    items: [
      { label: "Products", to: "/inventory/products" },
      { label: "Stock", to: "/inventory/stock" },
      { label: "Purchases", to: "/inventory/purchases" },
      { label: "Suppliers", to: "/inventory/suppliers" },
      { label: "Stock Movement", to: "/inventory/movement" },
      { label: "Expiry", to: "/inventory/expiry" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Wallet",
    items: [
      { label: "Invoices", to: "/finance/invoices" },
      { label: "Payments", to: "/finance/payments" },
      { label: "Refunds", to: "/finance/refunds" },
      { label: "Outstanding", to: "/finance/outstanding" },
      { label: "Expenses", to: "/finance/expenses" },
      { label: "Revenue", to: "/finance/revenue" },
    ],
  },
  {
    id: "cs",
    label: "Customer Success",
    icon: "HeartPulse",
    items: [
      { label: "Member Health", to: "/cs/member-health" },
      { label: "At Risk", to: "/cs/at-risk", badgeKey: "atRisk" },
      { label: "Feedback", to: "/cs/feedback" },
      { label: "Grievances", to: "/cs/grievances", badgeKey: "grievances" },
      { label: "Retention", to: "/cs/retention" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "Megaphone",
    items: [
      { label: "Campaigns", to: "/marketing/campaigns" },
      { label: "Audiences", to: "/marketing/audiences" },
      { label: "Communication", to: "/marketing/communication" },
      { label: "Templates", to: "/marketing/templates" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    icon: "Workflow",
    items: [
      { label: "Workflows", to: "/automation/workflows" },
      { label: "Approvals", to: "/automation/approvals", badgeKey: "approvals" },
      { label: "Notifications", to: "/automation/notifications" },
      { label: "Rules", to: "/automation/rules" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "BarChart3",
    items: [
      { label: "Business Reports", to: "/reports/business" },
      { label: "Sales Reports", to: "/reports/sales" },
      { label: "Member Reports", to: "/reports/members" },
      { label: "Trainer Reports", to: "/reports/trainers" },
      { label: "Financial Reports", to: "/reports/financial" },
      { label: "Performance Reports", to: "/reports/performance" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: "Settings",
    items: [
      { label: "Users", to: "/admin/users" },
      { label: "Roles", to: "/admin/roles" },
      { label: "Permissions", to: "/admin/permissions" },
      { label: "Locations", to: "/admin/locations" },
      { label: "Services", to: "/admin/services", visibility: "superadmin_only" },
      { label: "Configuration", to: "/admin/configuration", visibility: "superadmin_only" },
      { label: "Forms", to: "/admin/forms", visibility: "superadmin_only" },
      { label: "Integrations", to: "/admin/integrations", visibility: "superadmin_only" },
      { label: "API", to: "/admin/api", visibility: "superadmin_only" },
      { label: "Audit Logs", to: "/admin/audit-logs" },
      { label: "Security", to: "/admin/security" },
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
  visibility?: "all" | "superadmin_only" | "tenant_only";
  sectionVisibility?: "all" | "superadmin_only" | "tenant_only";
}[] = NAV.flatMap((s) =>
  s.items.map((i) => ({
    section: s.label,
    sectionId: s.id,
    label: i.label,
    to: i.to,
    visibility: i.visibility,
    sectionVisibility: s.visibility,
  }))
);

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((i) => i.to === pathname);
}
