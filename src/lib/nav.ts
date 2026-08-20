export type NavItem = {
  label: string;
  to: string;
  badgeKey?: "leads" | "atRisk" | "approvals" | "grievances";
};

export type NavSection = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

/**
 * Single source of truth for the console navigation. Route files mirror these
 * paths exactly; the header breadcrumb and command palette read from here too.
 */
export const NAV: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    items: [{ label: "Executive Dashboard", to: "/" }],
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
      { label: "Services", to: "/admin/services" },
      { label: "Configuration", to: "/admin/configuration" },
      { label: "Forms", to: "/admin/forms" },
      { label: "Integrations", to: "/admin/integrations" },
      { label: "API", to: "/admin/api" },
      { label: "Audit Logs", to: "/admin/audit-logs" },
      { label: "Security", to: "/admin/security" },
    ],
  },
  {
    id: "platform",
    label: "Platform (Super Admin)",
    icon: "Building2",
    items: [
      { label: "Tenants", to: "/platform/tenants" },
      { label: "Onboard Tenant", to: "/platform/tenants/new" },
      { label: "Plans & Modules", to: "/platform/plans" },
      { label: "Usage", to: "/platform/usage" },
      { label: "Subscription Billing", to: "/platform/billing" },
      { label: "Marketplace", to: "/platform/marketplace" },
      { label: "White Label", to: "/platform/branding" },
    ],
  },
];

export const ALL_NAV_ITEMS: { section: string; label: string; to: string }[] = NAV.flatMap((s) =>
  s.items.map((i) => ({ section: s.label, label: i.label, to: i.to })),
);

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((i) => i.to === pathname);
}
