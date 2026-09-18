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
} from "./types";

export const TENANT_ID = "TEN-001";
export const TODAY = new Date();

export interface Dataset {
  tenants: Tenant[];
  locations: Location[];
  users: User[];
  trainers: Trainer[];
  services: Service[];
  plans: MembershipPlan[];
  members: Member[];
  leads: Lead[];
  calls: Call[];
  trials: Trial[];
  offers: Offer[];
  coupons: Coupon[];
  classes: ClassDef[];
  bookings: Booking[];
  assessments: Assessment[];
  programs: Program[];
  nutritionPlans: NutritionPlan[];
  products: Product[];
  invoices: Invoice[];
  complaints: Complaint[];
  campaigns: Campaign[];
  communications: Communication[];
  workflows: Workflow[];
  approvals: Approval[];
  auditLogs: AuditLog[];
  integrations: Integration[];
  tasks: Task[];
}

let cache: Dataset | null = null;

export function getDataset(): Dataset {
  if (cache) return cache;

  cache = {
    tenants: [],
    locations: [],
    users: [],
    trainers: [],
    services: [],
    plans: [],
    members: [],
    leads: [],
    calls: [],
    trials: [],
    offers: [],
    coupons: [],
    classes: [],
    bookings: [],
    assessments: [],
    programs: [],
    nutritionPlans: [],
    products: [],
    invoices: [],
    complaints: [],
    campaigns: [],
    communications: [],
    workflows: [],
    approvals: [],
    auditLogs: [],
    integrations: [],
    tasks: [],
  };

  return cache;
}
