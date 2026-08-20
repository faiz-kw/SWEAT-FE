# PerformanceOS Admin — Fitness Business Operating System

An internal enterprise back-office console (ERP + CRM), not a website. Dense desktop-first
application shell with left sidebar, top header, main workspace, right detail panels.
First pass runs on realistic in-app demo data (no backend), so every module is clickable and
demoable immediately. Cloud/Postgres can be layered in later without changing the UI.

## Scope of this build

All three slices, delivered in one pass:

1. **App shell + full navigation** — every sidebar item is a real route.
2. **Executive dashboard** — KPI row, revenue trend, lead funnel, trial conversion, member
   growth, expiring memberships, today's classes and PT, at-risk members, sales team
   performance, trainer utilization; date/location/trainer/service filters.
3. **Deep modules** (full tables, filters, bulk actions, detail drawers/pages):
   CRM Leads + Lead Pipeline (kanban), AI Calling console, Trial Management + conversion
   workflow, Offers, Coupons, Members, Client 360, Memberships/Renewals, Booking calendar,
   Classes, Trainers, Assessments, Programs, Nutrition, Inventory, Finance,
   Customer Success, Grievances, Marketing, Communication, Workflows, Approvals, Forms,
   Reports, Administration (Users, Roles, Permissions, Locations, Config, Integrations,
   API, Audit Logs, Security).
4. **Super Admin** — tenant list with all columns and row actions, tenant creation wizard
   (16 steps), plans/modules/usage/billing, impersonation affordance, white-label branding.
5. **Demo lifecycle** — the Rahul Sharma path (lead → AI call → trial booked → attended →
   coach feedback → recommended 12-week strength program → offer + WELCOME10 coupon →
   follow-up → converted member → assessment → program → progress → renewal) is wired with
   consistent IDs so it is traceable across every module it touches.

Remaining sidebar leaves that aren't in the deep list get a real table view driven by the
same demo dataset, at slightly shallower detail, and are filled out in follow-up passes.

## Design language

- Light enterprise surface: white / off-white / light grey, subtle green-blue accent,
  restrained status badge palette (neutral, info, success, warning, danger).
- Compact professional typography, tabular numerals in data columns.
- Table density level 3 of 5 — tight rows (~36px), no decorative padding, sticky headers,
  column dividers, hover row actions. A density toggle is available in the header.
- No hero sections, no marketing copy, no fitness photography, minimal rounding, no
  card-per-record layouts. Charts are small, gridded, and analytical.
- Collapsible sidebar with grouped sections, global search + command palette in the header,
  location switcher, notification tray, user menu.

## Technical approach

- TanStack Start file routes under `src/routes/`, flat dot-notation (e.g.
  `crm.leads.tsx`, `crm.leads.$leadId.tsx`, `admin.tenants.tsx`). Shared chrome lives in a
  layout route so the sidebar/header mount once.
- **Data layer isolated from UI**: `src/data/` holds typed entity models (Tenant, Location,
  User, Role, Member, Lead, Trainer, Service, Class, Booking, Membership, Assessment,
  Program, Exercise, Performance, NutritionPlan, Product, Inventory, Invoice, Payment,
  Offer, Coupon, Campaign, Call, Communication, Workflow, Notification, Complaint,
  Integration, AuditLog) each carrying `tenantId` and, where relevant, `locationId`.
  `src/services/` exposes async, API-shaped repository functions (`listLeads(filters)`,
  `getMember(id)`) that today read the demo dataset and later swap to real endpoints —
  no business logic in components.
- Demo dataset generated deterministically (seeded, built lazily — never at module scope):
  100+ members, 40 leads, 20 trainers, 30 classes, 50+ bookings, 20 trials, 15 offers,
  20 coupons, 100+ transactions, 3 locations under one tenant plus extra tenants for
  Super Admin.
- **Reusable enterprise component kit** in `src/components/ui-enterprise/`: DataTable
  (sorting, column visibility, pagination, row selection, bulk action toolbar, export),
  FilterBar, SidePanel/Drawer, Modal, Tabs, StatusBadge, KpiTile, Chart wrappers,
  Calendar, Kanban board, Wizard/Stepper, Timeline, Toolbar, EmptyState. Every module
  composes these, so all tables look and behave identically.
- RBAC modeled in data (roles × permissions matrix) and used to show/hide actions; real
  enforcement arrives with the backend.
- Charts via Recharts; tables via TanStack Table; toasts via sonner.
- `/` redirects into the console dashboard. Each route defines its own head metadata.

## Sequence

1. Design tokens, shell (sidebar + header + layout route), enterprise component kit.
2. Data models, seeded demo dataset, service layer.
3. Executive dashboard.
4. CRM cluster: Leads, Pipeline, AI Calling, Trials, conversion workflow, Offers, Coupons,
   Campaigns, Follow-ups.
5. Members cluster: list, Client 360, memberships, renewals, freeze/transfer, attendance.
6. Operations: calendar, classes, bookings, PT, Pilates, assessments, trainers, programs.
7. Performance, Nutrition, Inventory, Finance, Customer Success, Grievances, Marketing,
   Communication.
8. Automation (workflow builder, approvals, notifications, rules), Forms engine, Reports.
9. Administration + Super Admin tenant console and onboarding wizard.
10. Responsive pass (tablet, plus mobile quick actions: search, attendance, booking,
    follow-up, call, session notes, payment) and demo-lifecycle continuity check.
