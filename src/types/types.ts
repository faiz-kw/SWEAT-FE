/**
 * Platform entity model. Every tenant-owned entity carries `tenantId`;
 * location-scoped entities also carry `locationId`. These shapes mirror the
 * intended Rails/PostgreSQL API contract so the service layer can swap the
 * demo dataset for real endpoints without touching UI code.
 */

export type ID = string;

export interface Scoped {
  tenantId: ID;
  locationId?: ID | undefined;
}

export type TenantStatus = "Active" | "Trial" | "Suspended" | "Churned";

export interface Tenant {
  id: ID;
  name: string;
  plan: "Starter" | "Professional" | "Premium" | "Enterprise";
  locations: number;
  members: number;
  users: number;
  mrr: number;
  status: TenantStatus;
  modules: string[];
  createdAt: string;
  lastActivityAt: string;
  brandColor: string;
  domain: string;
  appName: string;
}

export interface Location extends Scoped {
  id: ID;
  name: string;
  city: string;
  address: string;
  capacity: number;
  studios: number;
  manager: string;
  status: "Active" | "Inactive";
  openingHours: string;
}

export type RoleName =
  | "Super Admin"
  | "Tenant Owner"
  | "Admin"
  | "Manager"
  | "Sales"
  | "Front Desk"
  | "Trainer"
  | "Pilates Instructor"
  | "Nutrition Coach"
  | "Finance"
  | "Inventory"
  | "Marketing"
  | "Customer Success";

export type PermissionAction =
  | "View"
  | "Create"
  | "Edit"
  | "Delete"
  | "Approve"
  | "Export"
  | "Configure"
  | "API";

export interface User extends Scoped {
  id: ID;
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  scope: "Global" | "Location";
  status: "Active" | "Invited" | "Disabled";
  lastLoginAt: string;
  createdAt: string;
}

export interface Trainer extends Scoped {
  id: ID;
  name: string;
  specialization: string;
  certification: string;
  availability: string;
  classesPerWeek: number;
  ptSessions: number;
  members: number;
  utilization: number;
  revenue: number;
  rating: number;
  status: "Active" | "On Leave" | "Inactive";
  type: "Strength" | "Conditioning" | "Pilates" | "Nutrition";
}

export interface Service extends Scoped {
  id: ID;
  name: string;
  category: "Membership" | "PT" | "Pilates" | "Nutrition" | "Assessment";
  price: number;
  duration: number;
  taxRate: number;
  status: "Active" | "Draft" | "Retired";
}

export interface MembershipPlan extends Scoped {
  id: ID;
  name: string;
  service: string;
  months: number;
  price: number;
  sessions: number | null;
  activeSubscribers: number;
  status: "Active" | "Draft" | "Retired";
}

export type MemberStatus = "Active" | "Expiring" | "Frozen" | "Lapsed" | "Cancelled";

export interface Member extends Scoped {
  id: ID;
  name: string;
  phone: string;
  email: string;
  gender: "M" | "F";
  age: number;
  membership: string;
  membershipEnd: string;
  joinedAt: string;
  coach: string;
  coachId: ID;
  goal: string;
  status: MemberStatus;
  attendance30: number;
  lastVisit: string;
  renewalDate: string;
  revenue: number;
  outstanding: number;
  healthScore: number;
  performanceScore: number;
  riskLevel: "Low" | "Medium" | "High";
  source: string;
  fromLeadId?: ID | undefined;
}

export type LeadStage =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Trial Booked"
  | "Trial Attended"
  | "Offer Sent"
  | "Negotiation"
  | "Converted"
  | "Lost";

export interface Lead extends Scoped {
  id: ID;
  name: string;
  phone: string;
  email: string;
  source: string;
  interestedService: string;
  goal: string;
  assignedTo: string;
  assignedToId: ID;
  stage: LeadStage;
  lastContactAt: string;
  nextFollowUpAt: string;
  trialDate: string | null;
  score: number;
  status: "Open" | "Won" | "Lost";
  createdAt: string;
  budget: number;
  notes: string;
}

export type CallType =
  | "Pre-Sales"
  | "Trial Booking"
  | "Trial Reminder"
  | "Trial Follow-up"
  | "Membership Renewal"
  | "Reactivation"
  | "Feedback";

export interface Call extends Scoped {
  id: ID;
  leadId?: ID | undefined;
  memberId?: ID | undefined;
  contact: string;
  phone: string;
  callType: CallType;
  assignedTo: string;
  scheduledAt: string;
  status: "Queued" | "In Progress" | "Completed" | "Failed";
  outcome:
    | "Connected"
    | "Not Connected"
    | "Interested"
    | "Trial Booked"
    | "Not Interested"
    | "Callback"
    | "Pending";
  nextAction: string;
  duration: number;
  provider: "Sarvam Voice" | "Twilio Voice" | "Manual";
  summary: string;
  intent: "High" | "Medium" | "Low" | "Unknown";
  recording: "Available" | "Processing" | "Not Recorded";
  consent: "Granted" | "Pending" | "Declined";
}

export type TrialStatus =
  | "Booked"
  | "Confirmed"
  | "Attended"
  | "No Show"
  | "Cancelled"
  | "Completed"
  | "Converted"
  | "Lost";

export interface Trial extends Scoped {
  id: ID;
  leadId: ID;
  lead: string;
  trialType: string;
  date: string;
  time: string;
  trainer: string;
  trainerId: ID;
  status: TrialStatus;
  source: string;
  outcome: string;
  converted: boolean;
  trainerRating: number;
  recommendedProgram: string;
  recommendedMembership: string;
  experience: string;
  feedback: string;
}

export interface Offer extends Scoped {
  id: ID;
  name: string;
  type:
    | "Membership"
    | "PT"
    | "Pilates"
    | "Nutrition"
    | "Bundle"
    | "Trial Conversion"
    | "Renewal"
    | "Reactivation"
    | "Referral";
  service: string;
  start: string;
  end: string;
  usage: number;
  usageLimit: number;
  conversion: number;
  revenue: number;
  discount: string;
  benefit: string;
  approvalRequired: boolean;
  status: "Active" | "Scheduled" | "Expired" | "Pending Approval" | "Draft";
  eligibility: string;
}

export interface Coupon extends Scoped {
  id: ID;
  code: string;
  campaign: string;
  type:
    | "Percentage"
    | "Fixed Amount"
    | "Free Session"
    | "Free Assessment"
    | "Upgrade"
    | "Bundle"
    | "Referral";
  discount: string;
  validFrom: string;
  validUntil: string;
  usage: number;
  limit: number;
  revenue: number;
  audience: "New Members" | "Existing Members" | "All";
  minAmount: number;
  status: "Active" | "Scheduled" | "Expired" | "Disabled";
}

export interface ClassDef extends Scoped {
  id: ID;
  name: string;
  type: string;
  studio: string;
  trainer: string;
  trainerId: ID;
  capacity: number;
  booked: number;
  schedule: string;
  duration: number;
  status: "Active" | "Paused";
}

export type BookingType = "Class" | "PT" | "Pilates" | "Assessment" | "Nutrition";

export interface Booking extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  type: BookingType;
  title: string;
  date: string;
  time: string;
  trainer: string;
  trainerId: ID;
  status: "Confirmed" | "Attended" | "Waitlist" | "Cancelled" | "No Show";
  capacity: number;
  booked: number;
  source: "App" | "Front Desk" | "Sales" | "Auto";
}

export interface Assessment extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  type: string;
  date: string;
  trainer: string;
  status: "Scheduled" | "Completed" | "Overdue";
  strength: number;
  mobility: number;
  conditioning: number;
  movement: number;
  posture: number;
  bodyFat: number;
  weight: number;
  score: number;
}

export interface Exercise extends Scoped {
  id: ID;
  name: string;
  pattern: string;
  equipment: string;
  primaryMuscle: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  usedInPrograms: number;
}

export interface Program extends Scoped {
  id: ID;
  name: string;
  goal: string;
  weeks: number;
  sessionsPerWeek: number;
  version: string;
  assignedMembers: number;
  owner: string;
  status: "Published" | "Draft" | "Archived";
  level: string;
}

export interface NutritionPlan extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  coach: string;
  planName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  adherence: number;
  reviewDue: string;
  status: "Active" | "Review Due" | "Completed";
}

export interface Product extends Scoped {
  id: ID;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  reorderLevel: number;
  batch: string;
  expiry: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface Invoice extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  service: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  tax: number;
  paid: number;
  method: "UPI" | "Card" | "Cash" | "Bank Transfer" | "Autopay";
  status: "Paid" | "Partially Paid" | "Overdue" | "Pending" | "Refunded";
}

export interface Complaint extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  assignedTo: string;
  slaDue: string;
  slaBreached: boolean;
  status: "Open" | "In Progress" | "Escalated" | "Resolved" | "Closed";
  createdAt: string;
  resolvedAt: string | null;
  satisfaction: number | null;
  summary: string;
}

export interface Campaign extends Scoped {
  id: ID;
  name: string;
  channel: "WhatsApp" | "Email" | "SMS" | "Meta Ads" | "Google Ads" | "Push";
  audience: string;
  sent: number;
  delivered: number;
  opened: number;
  leads: number;
  conversions: number;
  spend: number;
  revenue: number;
  status: "Running" | "Scheduled" | "Completed" | "Paused";
  start: string;
}

export interface Communication extends Scoped {
  id: ID;
  contact: string;
  channel: "WhatsApp" | "Email" | "SMS" | "Push" | "Voice";
  template: string;
  direction: "Outbound" | "Inbound";
  sentAt: string;
  status: "Delivered" | "Read" | "Failed" | "Queued" | "Bounced";
  module: string;
}

export interface Workflow extends Scoped {
  id: ID;
  name: string;
  trigger: string;
  conditions: string;
  actions: string[];
  runs: number;
  successRate: number;
  lastRunAt: string;
  status: "Active" | "Paused" | "Draft";
  owner: string;
}

export interface Approval extends Scoped {
  id: ID;
  type:
    | "Discount"
    | "Offer"
    | "Refund"
    | "Membership Transfer"
    | "Expense"
    | "Purchase"
    | "Coupon"
    | "Special Pricing";
  requestedBy: string;
  subject: string;
  amount: number;
  approver: string;
  raisedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  ageHours: number;
}

export interface AuditLog extends Scoped {
  id: ID;
  user: string;
  tenant: string;
  module: string;
  action: string;
  at: string;
  ip: string;
  oldValue: string;
  newValue: string;
}

export interface Integration extends Scoped {
  id: ID;
  name: string;
  category: string;
  provider: string;
  status: "Connected" | "Not Connected" | "Error";
  lastSyncAt: string;
  events: number;
}

export interface Task extends Scoped {
  id: ID;
  title: string;
  relatedTo: string;
  relatedId: ID;
  type: "Call" | "WhatsApp" | "Visit" | "Email" | "Review";
  owner: string;
  dueAt: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "Done" | "Overdue";
}

export interface TimelineEvent {
  id: ID;
  at: string;
  actor: string;
  module: string;
  title: string;
  detail?: string;
}
