import type { Row } from "@/services/store";

export type FieldType = "text" | "textarea" | "number" | "currency" | "percent" | "date" | "datetime" | "boolean" | "enum";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

const CURRENCY = /(price|amount|revenue|mrr|paid|cost|budget|spend|outstanding|tax|salary|fee)/i;
const PERCENT = /(rate|adherence|utilization|utilisation|conversion|retention|accuracy|score|confidence|engagement|intensity)$/i;
const LONG_TEXT = /(summary|notes|feedback|recommendation|driver|subject|detail|description|address|guardrails|conditions|actions)/i;

export function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\bId\b/g, "ID")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function isDateStr(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isDateTimeStr(v: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(v);
}

export const DEFAULT_COLLECTION_FIELDS: Record<string, Field[]> = {
  leads: [
    { key: "name", label: "Full Name", type: "text", required: true },
    { key: "phone", label: "Phone", type: "text", required: true },
    { key: "email", label: "Email", type: "text" },
    { key: "source", label: "Source", type: "enum", options: ["Walk-in", "Instagram", "Google Ads", "Referral", "Website", "Meta Ads"] },
    { key: "interestedService", label: "Service", type: "enum", options: ["General Fitness", "Strength Training", "Personal Training", "Pilates Reformer", "Group Classes", "Nutrition Coaching"] },
    { key: "goal", label: "Goal", type: "enum", options: ["Weight Loss", "Fat Loss", "Strength", "Muscle Gain", "Mobility", "General Fitness"] },
    { key: "stage", label: "Stage", type: "enum", options: ["New", "Contacted", "Qualified", "Trial Booked", "Trial Attended", "Offer Sent", "Negotiation", "Converted"] },
    { key: "status", label: "Status", type: "enum", options: ["Open", "Won", "Lost", "Archived"] },
    { key: "score", label: "Lead Score", type: "number" },
    { key: "budget", label: "Budget", type: "currency" },
    { key: "trialDate", label: "Trial Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  trials: [
    { key: "lead", label: "Lead Name", type: "text", required: true },
    { key: "trialType", label: "Trial Session", type: "enum", options: ["1-on-1 Fitness Assessment", "Reformer Pilates Trial", "Strength & Conditioning Session", "HIIT Intro Class", "Yoga & Mobility Intro"] },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "time", label: "Time", type: "text" },
    { key: "trainer", label: "Trainer / Coach", type: "text" },
    { key: "status", label: "Status", type: "enum", options: ["Scheduled", "Attended", "No Show", "Cancelled"] },
    { key: "outcome", label: "Outcome", type: "enum", options: ["Pending", "Interested in Membership", "Needs Follow-up", "Not Interested", "Converted"] },
    { key: "recommendedProgram", label: "Recommended Program", type: "text" },
    { key: "feedback", label: "Feedback / Notes", type: "textarea" },
  ],
  members: [
    { key: "name",              label: "Full Name",          type: "text",    required: true },
    { key: "phone",             label: "Phone",              type: "text",    required: true },
    { key: "email",             label: "Email",              type: "text" },
    { key: "gender",            label: "Gender",             type: "enum",    options: ["Male", "Female", "Other"] },
    { key: "age",               label: "Age",                type: "number" },
    { key: "goal",              label: "Fitness Goal",       type: "enum",    options: ["Weight Loss", "Fat Loss", "Muscle Gain", "Strength", "Endurance", "Mobility", "General Fitness", "Sport Performance"] },
    { key: "status",            label: "Status",             type: "enum",    options: ["Active", "Expiring", "Frozen", "Lapsed", "Cancelled"] },
    { key: "riskLevel",         label: "Risk Level",         type: "enum",    options: ["Low", "Medium", "High"] },
    { key: "healthScore",       label: "Health Score (0–100)",  type: "number" },
    { key: "performanceScore",  label: "Performance Score (0–100)", type: "number" },
    { key: "emergencyContact",  label: "Emergency Contact",  type: "text" },
  ],
  plans: [
    { key: "name", label: "Plan Name", type: "text", required: true },
    { key: "type", label: "Plan Type", type: "enum", options: ["Standard", "Strength & Conditioning", "Personal Training", "Reformer Pilates", "Nutrition"] },
    { key: "durationMonths", label: "Duration (Months)", type: "number" },
    { key: "price", label: "Price", type: "currency" },
    { key: "accessHours", label: "Access Hours", type: "text" },
    { key: "ptSessionsIncluded", label: "PT Sessions Included", type: "number" },
    { key: "status", label: "Status", type: "enum", options: ["Active", "Archived"] },
  ],
  classes: [
    { key: "name", label: "Class Name", type: "text", required: true },
    { key: "category", label: "Category", type: "enum", options: ["HIIT", "Strength", "Pilates", "Yoga", "Mobility", "Boxing"] },
    { key: "trainer", label: "Trainer", type: "text" },
    { key: "studio", label: "Studio", type: "text" },
    { key: "capacity", label: "Capacity", type: "number" },
    { key: "durationMin", label: "Duration (Min)", type: "number" },
    { key: "time", label: "Time", type: "text" },
    { key: "days", label: "Days", type: "text" },
    { key: "status", label: "Status", type: "enum", options: ["Active", "Inactive"] },
  ],
  bookings: [
    { key: "title", label: "Session Title", type: "text", required: true },
    { key: "type", label: "Type", type: "enum", options: ["Class", "PT", "Pilates", "Assessment"] },
    { key: "member", label: "Member", type: "text" },
    { key: "trainer", label: "Trainer", type: "text" },
    { key: "studio", label: "Studio", type: "text" },
    { key: "date", label: "Date", type: "date" },
    { key: "time", label: "Time", type: "text" },
    { key: "status", label: "Status", type: "enum", options: ["Booked", "Attended", "No Show", "Cancelled"] },
  ],
  trainers: [
    { key: "name", label: "Trainer Name", type: "text", required: true },
    { key: "specialization", label: "Specialization", type: "text" },
    { key: "certification", label: "Certification", type: "text" },
    { key: "type", label: "Type", type: "enum", options: ["Strength", "Conditioning", "Pilates", "Nutrition"] },
    { key: "utilization", label: "Utilization", type: "percent" },
    { key: "ptSessions", label: "PT Sessions", type: "number" },
    { key: "rating", label: "Rating", type: "number" },
    { key: "status", label: "Status", type: "enum", options: ["Active", "On Leave", "Inactive"] },
  ],
  invoices: [
    { key: "invoiceNumber", label: "Invoice #", type: "text" },
    { key: "member", label: "Member", type: "text", required: true },
    { key: "service", label: "Service", type: "text" },
    { key: "amount", label: "Amount", type: "currency", required: true },
    { key: "paid", label: "Paid", type: "currency" },
    { key: "status", label: "Status", type: "enum", options: ["Paid", "Pending", "Overdue", "Partially Paid", "Refunded"] },
    { key: "issuedAt", label: "Issued Date", type: "date" },
    { key: "dueDate", label: "Due Date", type: "date" },
  ],
  coupons: [
    { key: "code", label: "Promo Code", type: "text", required: true },
    { key: "discountType", label: "Discount Type", type: "enum", options: ["Percentage", "Fixed Amount"] },
    { key: "discountValue", label: "Discount Value", type: "number" },
    { key: "maxUses", label: "Max Uses", type: "number" },
    { key: "usedCount", label: "Times Used", type: "number" },
    { key: "validUntil", label: "Valid Until", type: "date" },
    { key: "status", label: "Status", type: "enum", options: ["Active", "Expired", "Disabled"] },
  ],
  products: [
    { key: "name", label: "Product Name", type: "text", required: true },
    { key: "category", label: "Category", type: "enum", options: ["Supplements", "Apparel", "Equipment", "Beverages", "Snacks"] },
    { key: "sku", label: "SKU", type: "text" },
    { key: "price", label: "Retail Price", type: "currency" },
    { key: "cost", label: "Cost Price", type: "currency" },
    { key: "stock", label: "Current Stock", type: "number" },
    { key: "status", label: "Status", type: "enum", options: ["In Stock", "Low Stock", "Out of Stock"] },
  ],
  assessments: [
    { key: "member", label: "Member", type: "text", required: true },
    { key: "trainer", label: "Trainer", type: "text" },
    { key: "date", label: "Date", type: "date" },
    { key: "weightKg", label: "Weight (kg)", type: "number" },
    { key: "bodyFatPct", label: "Body Fat %", type: "percent" },
    { key: "postureScore", label: "Posture Score", type: "number" },
    { key: "status", label: "Status", type: "enum", options: ["Completed", "Pending Review", "Scheduled"] },
  ],
  nutritionPlans: [
    { key: "member", label: "Member", type: "text", required: true },
    { key: "coach", label: "Coach", type: "text" },
    { key: "dailyCalories", label: "Daily Calories", type: "number" },
    { key: "proteinG", label: "Protein (g)", type: "number" },
    { key: "carbsG", label: "Carbs (g)", type: "number" },
    { key: "fatsG", label: "Fats (g)", type: "number" },
    { key: "status", label: "Status", type: "enum", options: ["Active", "Review Due", "Completed", "Paused"] },
  ],
  supportTickets: [
    { key: "member", label: "Member", type: "text", required: true },
    { key: "subject", label: "Subject", type: "text", required: true },
    { key: "priority", label: "Priority", type: "enum", options: ["Low", "Medium", "High", "Critical"] },
    { key: "channel", label: "Channel", type: "enum", options: ["App", "WhatsApp", "Front Desk", "Email", "Call"] },
    { key: "status", label: "Status", type: "enum", options: ["Open", "In Progress", "Escalated", "Resolved", "Closed"] },
  ],
};

const NEVER_ENUM = /(name|phone|email|contact|address|id|title|sku|notes|feedback|description|url|code|password)/i;
const HIDDEN = /^(tenantId|tenant_id|createdAt|updatedAt|deletedAt|__v)$/i;

/** Derives the editable/displayable field schema for a collection from its rows or default fallbacks. */
export function inferFields(rows: Row[], collectionKey?: string): Field[] {
  // Always use explicit curated schema if available for the collection
  if (collectionKey && DEFAULT_COLLECTION_FIELDS[collectionKey]) {
    return DEFAULT_COLLECTION_FIELDS[collectionKey]!;
  }

  if (rows.length === 0) {
    return [
      { key: "name", label: "Name", type: "text" },
      { key: "status", label: "Status", type: "enum", options: ["Active", "Inactive", "Pending"] },
      { key: "createdAt", label: "Created At", type: "date" },
    ];
  }

  const keys: string[] = [];
  for (const r of rows.slice(0, 40)) {
    for (const k of Object.keys(r)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }

  return keys
    .filter((k) => !HIDDEN.test(k))
    .map((k) => {
      const values = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
      const sample = values[0];
      const label = humanize(k);

      if (typeof sample === "boolean") return { key: k, label, type: "boolean" as const };
      if (typeof sample === "number") {
        if (CURRENCY.test(k)) return { key: k, label, type: "currency" as const };
        if (PERCENT.test(k)) return { key: k, label, type: "percent" as const };
        return { key: k, label, type: "number" as const };
      }
      if (Array.isArray(sample)) return { key: k, label, type: "textarea" as const };
      if (typeof sample === "string") {
        if (isDateTimeStr(sample)) return { key: k, label, type: "datetime" as const };
        if (isDateStr(sample)) return { key: k, label, type: "date" as const };
        const distinct = [...new Set(values.map((v) => String(v)))];
        if (!NEVER_ENUM.test(k) && distinct.length > 1 && distinct.length <= 12 && distinct.length < Math.max(3, rows.length / 2)) {
          return { key: k, label, type: "enum" as const, options: distinct.sort() };
        }
        if (LONG_TEXT.test(k)) return { key: k, label, type: "textarea" as const };
      }
      return { key: k, label, type: "text" as const };
    });
}

const STATUS_CANDIDATES = ["status", "stage", "priority", "riskLevel", "riskFlag", "humanReview"];

export function pickStatusKey(fields: Field[]) {
  for (const c of STATUS_CANDIDATES) if (fields.some((f) => f.key === c)) return c;
  return undefined;
}

const TITLE_CANDIDATES = ["name", "title", "member", "contact", "lead", "code", "subject", "className", "sku", "user"];

export function pickTitleKey(fields: Field[]) {
  for (const c of TITLE_CANDIDATES) if (fields.some((f) => f.key === c)) return c;
  return "id";
}
