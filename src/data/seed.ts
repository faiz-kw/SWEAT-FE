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
  Exercise,
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

/* -------------------------------------------------------------------------
 * Deterministic demo dataset.
 * Built lazily (never at module scope) so it is safe in the edge runtime.
 * ---------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TENANT_ID = "TEN-001";
export const TODAY = new Date("2026-08-20T00:00:00Z");

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shift(days: number, from: Date = TODAY) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function dtShift(days: number, hour: number, minute = 0) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

const FIRST_M = [
  "Rahul","Arjun","Vikram","Aditya","Karan","Rohan","Siddharth","Nikhil","Aman","Varun",
  "Kabir","Dev","Ishaan","Manav","Yash","Raghav","Aryan","Sameer","Tarun","Zoheb",
];
const FIRST_F = [
  "Ananya","Priya","Neha","Sanya","Meera","Divya","Kavya","Riya","Aisha","Tara",
  "Ishita","Nandini","Shreya","Pooja","Anjali","Sneha","Rhea","Naina","Simran","Trisha",
];
const LAST = [
  "Sharma","Mehta","Kapoor","Iyer","Reddy","Nair","Desai","Malhotra","Chopra","Bose",
  "Rao","Joshi","Patel","Singh","Verma","Khanna","Menon","Shetty","Bhatia","Gupta",
];

const GOALS = [
  "Fat Loss","Strength","Muscle Gain","Mobility","Rehab","General Fitness","Athletic Performance","Post-natal",
];
const SOURCES = [
  "Walk-in","Instagram","Google Ads","Referral","Website","Meta Ads","Corporate Tie-up","Event",
];
const SERVICES_LIST = [
  "Strength Training","Personal Training","Pilates Reformer","Group Classes","Nutrition Coaching","Performance Program",
];

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}
function int(r: () => number, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}
function pad(n: number, w = 4) {
  return String(n).padStart(w, "0");
}

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
  exercises: Exercise[];
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
  const r = mulberry32(20260820);

  /* ---------------- tenants ---------------- */
  const tenantNames: [string, Tenant["plan"], Tenant["status"], number, number, number][] = [
    ["Elevate Fitness", "Enterprise", "Active", 3, 1284, 42],
    ["Iron Yard Strength Co.", "Premium", "Active", 2, 640, 21],
    ["Reform Pilates Studio", "Professional", "Active", 1, 288, 11],
    ["PulseFit Chain", "Premium", "Suspended", 4, 902, 28],
    ["Anaerobic Athletics", "Starter", "Trial", 1, 74, 5],
  ];
  const modulesAll = [
    "CRM","Booking","Memberships","AI Calling","Nutrition","Inventory","Finance","Performance","Marketing","Automation",
  ];
  const tenants: Tenant[] = tenantNames.map((t, i) => ({
    id: `TEN-${pad(i + 1, 3)}`,
    name: t[0],
    plan: t[1],
    status: t[2],
    locations: t[3],
    members: t[4],
    users: t[5],
    mrr: [289000, 164000, 74000, 198000, 24000][i]!,
    modules: modulesAll.slice(0, [10, 8, 6, 8, 4][i]!),
    createdAt: shift(-[820, 540, 300, 690, 26][i]!),
    lastActivityAt: dtShift(0, 7 + i),
    brandColor: ["#0f766e", "#1d4ed8", "#9333ea", "#dc2626", "#059669"][i]!,
    domain: ["elevate.performanceos.app","ironyard.performanceos.app","reform.performanceos.app","pulsefit.performanceos.app","anaerobic.performanceos.app"][i]!,
    appName: ["Elevate Member","Iron Yard","Reform","PulseFit","Anaerobic"][i]!,
  }));

  /* ---------------- locations ---------------- */
  const locations: Location[] = [
    ["LOC-01", "Bandra", "Mumbai", "Linking Road, Bandra West", 420, 4, "Nikhil Verma"],
    ["LOC-02", "Andheri", "Mumbai", "Veera Desai Road, Andheri West", 360, 3, "Sneha Kapoor"],
    ["LOC-03", "Powai", "Mumbai", "Hiranandani Gardens, Powai", 280, 3, "Karan Malhotra"],
  ].map((l) => ({
    id: l[0] as string,
    tenantId: TENANT_ID,
    name: l[1] as string,
    city: l[2] as string,
    address: l[3] as string,
    capacity: l[4] as number,
    studios: l[5] as number,
    manager: l[6] as string,
    status: "Active" as const,
    openingHours: "05:30 – 23:00",
  }));
  const locIds = locations.map((l) => l.id);

  /* ---------------- users ---------------- */
  const roleMix: User["role"][] = [
    "Tenant Owner","Admin","Manager","Manager","Sales","Sales","Sales","Sales","Front Desk","Front Desk",
    "Trainer","Trainer","Pilates Instructor","Nutrition Coach","Finance","Finance","Inventory","Marketing",
    "Customer Success","Customer Success","Admin","Manager","Sales","Front Desk",
  ];
  const users: User[] = roleMix.map((role, i) => {
    const fn = i % 2 === 0 ? pick(r, FIRST_M) : pick(r, FIRST_F);
    const name = `${fn} ${pick(r, LAST)}`;
    return {
      id: `USR-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: role === "Tenant Owner" || role === "Admin" ? undefined : locIds[i % 3],
      name,
      email: `${fn.toLowerCase()}.${i}@elevatefitness.in`,
      phone: `+91 98${int(r, 100, 999)}${int(r, 10000, 99999)}`,
      role,
      scope: role === "Tenant Owner" || role === "Admin" ? "Global" : "Location",
      status: i === 20 ? "Invited" : i === 23 ? "Disabled" : "Active",
      lastLoginAt: dtShift(-int(r, 0, 9), int(r, 7, 20), int(r, 0, 59)),
      createdAt: shift(-int(r, 60, 700)),
    };
  });
  const salesTeam = users.filter((u) => u.role === "Sales");

  /* ---------------- trainers ---------------- */
  const specs = [
    ["Strength & Conditioning", "NSCA CSCS", "Strength"],
    ["Olympic Lifting", "IWF Level 2", "Strength"],
    ["Hypertrophy", "ACE CPT", "Strength"],
    ["Metabolic Conditioning", "ACSM CPT", "Conditioning"],
    ["Reformer Pilates", "BASI Comprehensive", "Pilates"],
    ["Mat Pilates", "STOTT Certified", "Pilates"],
    ["Sports Nutrition", "ISSN Diploma", "Nutrition"],
    ["Rehab & Mobility", "FMS Level 2", "Conditioning"],
  ];
  const trainers: Trainer[] = Array.from({ length: 20 }, (_, i) => {
    const s = specs[i % specs.length]!;
    const util = int(r, 48, 96);
    return {
      id: `TRN-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      name: `${i % 2 === 0 ? pick(r, FIRST_M) : pick(r, FIRST_F)} ${pick(r, LAST)}`,
      specialization: s[0]!,
      certification: s[1]!,
      type: s[2] as Trainer["type"],
      availability: pick(r, ["Mon–Sat 06:00–14:00", "Mon–Sat 14:00–22:00", "Tue–Sun 07:00–15:00"]),
      classesPerWeek: int(r, 4, 18),
      ptSessions: int(r, 10, 46),
      members: int(r, 8, 38),
      utilization: util,
      revenue: int(r, 120, 640) * 1000,
      rating: Number((3.9 + r() * 1.1).toFixed(1)),
      status: i === 17 ? "On Leave" : "Active",
    };
  });
  trainers[0]!.name = "Vikram Iyer";
  trainers[0]!.specialization = "Strength & Conditioning";

  /* ---------------- services & plans ---------------- */
  const services: Service[] = [
    ["Gym Membership", "Membership", 3500, 30, 18],
    ["Personal Training", "PT", 1800, 60, 18],
    ["Pilates Reformer", "Pilates", 1500, 55, 18],
    ["Nutrition Coaching", "Nutrition", 4500, 45, 18],
    ["Performance Assessment", "Assessment", 2500, 75, 18],
    ["Group Classes", "Membership", 2800, 45, 18],
  ].map((s, i) => ({
    id: `SVC-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: s[0] as string,
    category: s[1] as Service["category"],
    price: s[2] as number,
    duration: s[3] as number,
    taxRate: s[4] as number,
    status: "Active" as const,
  }));

  const plans: MembershipPlan[] = [
    ["Monthly Gym", "Gym Membership", 1, 3500, null, 214],
    ["Quarterly Gym", "Gym Membership", 3, 9000, null, 168],
    ["Half-Yearly Gym", "Gym Membership", 6, 16000, null, 122],
    ["Annual Gym", "Gym Membership", 12, 28000, null, 96],
    ["PT 12 Pack", "Personal Training", 3, 19800, 12, 74],
    ["PT 24 Pack", "Personal Training", 6, 37200, 24, 41],
    ["Pilates 8 Pack", "Pilates Reformer", 2, 11200, 8, 63],
    ["12 Week Strength Program", "Performance Program", 3, 24500, 36, 58],
  ].map((p, i) => ({
    id: `PLN-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: p[0] as string,
    service: p[1] as string,
    months: p[2] as number,
    price: p[3] as number,
    sessions: p[4] as number | null,
    activeSubscribers: p[5] as number,
    status: "Active" as const,
  }));

  /* ---------------- members ---------------- */
  const members: Member[] = Array.from({ length: 124 }, (_, i) => {
    const female = r() > 0.52;
    const name = `${female ? pick(r, FIRST_F) : pick(r, FIRST_M)} ${pick(r, LAST)}`;
    const plan = pick(r, plans);
    const endDays = int(r, -70, 240);
    const att = int(r, 0, 22);
    const health = Math.max(12, Math.min(98, 40 + att * 2 + int(r, -12, 18)));
    const status: Member["status"] =
      endDays < 0 ? (r() > 0.5 ? "Lapsed" : "Cancelled") : endDays < 21 ? "Expiring" : att === 0 ? "Frozen" : "Active";
    const trainer = pick(r, trainers);
    return {
      id: `MEM-${pad(i + 2)}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      name,
      phone: `+91 9${int(r, 100000000, 999999999)}`,
      email: `${name.split(" ")[0]!.toLowerCase()}${i}@mail.com`,
      gender: female ? "F" : "M",
      age: int(r, 19, 58),
      membership: plan.name,
      membershipEnd: shift(endDays),
      joinedAt: shift(-int(r, 20, 900)),
      coach: trainer.name,
      coachId: trainer.id,
      goal: pick(r, GOALS),
      status,
      attendance30: att,
      lastVisit: shift(-int(r, 0, 40)),
      renewalDate: shift(endDays),
      revenue: plan.price + int(r, 0, 12) * 1500,
      outstanding: r() > 0.82 ? int(r, 1, 14) * 500 : 0,
      healthScore: health,
      performanceScore: int(r, 38, 96),
      riskLevel: health < 45 ? "High" : health < 65 ? "Medium" : "Low",
      source: pick(r, SOURCES),
    };
  });

  // Demo lifecycle hero member (converted from lead LEAD-1001).
  members.unshift({
    id: "MEM-0001",
    tenantId: TENANT_ID,
    locationId: "LOC-01",
    name: "Rahul Sharma",
    phone: "+91 98200 41122",
    email: "rahul.sharma@mail.com",
    gender: "M",
    age: 31,
    membership: "12 Week Strength Program",
    membershipEnd: shift(74),
    joinedAt: shift(-16),
    coach: trainers[0]!.name,
    coachId: trainers[0]!.id,
    goal: "Strength",
    status: "Active",
    attendance30: 14,
    lastVisit: shift(-1),
    renewalDate: shift(74),
    revenue: 24500,
    outstanding: 0,
    healthScore: 86,
    performanceScore: 72,
    riskLevel: "Low",
    source: "Instagram",
    fromLeadId: "LEAD-1001",
  });

  /* ---------------- leads ---------------- */
  const stages: Lead["stage"][] = [
    "New","Contacted","Qualified","Trial Booked","Trial Attended","Offer Sent","Negotiation","Converted","Lost",
  ];
  const leads: Lead[] = Array.from({ length: 41 }, (_, i) => {
    const female = r() > 0.5;
    const name = `${female ? pick(r, FIRST_F) : pick(r, FIRST_M)} ${pick(r, LAST)}`;
    const stage = stages[Math.min(stages.length - 1, Math.floor(r() * 9))]!;
    const owner = pick(r, salesTeam);
    const hasTrial = ["Trial Booked", "Trial Attended", "Offer Sent", "Negotiation", "Converted"].includes(stage);
    return {
      id: `LEAD-${1002 + i}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      name,
      phone: `+91 9${int(r, 100000000, 999999999)}`,
      email: `${name.split(" ")[0]!.toLowerCase()}.${i}@mail.com`,
      source: pick(r, SOURCES),
      interestedService: pick(r, SERVICES_LIST),
      goal: pick(r, GOALS),
      assignedTo: owner.name,
      assignedToId: owner.id,
      stage,
      lastContactAt: shift(-int(r, 0, 12)),
      nextFollowUpAt: shift(int(r, -3, 9)),
      trialDate: hasTrial ? shift(int(r, -12, 8)) : null,
      score: int(r, 18, 97),
      status: stage === "Converted" ? "Won" : stage === "Lost" ? "Lost" : "Open",
      createdAt: shift(-int(r, 1, 45)),
      budget: int(r, 3, 30) * 1000,
      notes: pick(r, [
        "Prefers early morning slots.",
        "Comparing with a studio nearby.",
        "Wants trainer with rehab experience.",
        "Corporate discount requested.",
        "Travelling until next week.",
      ]),
    };
  });

  leads.unshift({
    id: "LEAD-1001",
    tenantId: TENANT_ID,
    locationId: "LOC-01",
    name: "Rahul Sharma",
    phone: "+91 98200 41122",
    email: "rahul.sharma@mail.com",
    source: "Instagram",
    interestedService: "Strength Training",
    goal: "Strength",
    assignedTo: salesTeam[0]!.name,
    assignedToId: salesTeam[0]!.id,
    stage: "Converted",
    lastContactAt: shift(-17),
    nextFollowUpAt: shift(58),
    trialDate: shift(-22),
    score: 92,
    status: "Won",
    createdAt: shift(-29),
    budget: 25000,
    notes:
      "High intent from first AI call. Trial on Saturday 10:00 with Vikram Iyer. Converted to 12 Week Strength Program with WELCOME10.",
  });

  /* ---------------- AI calls ---------------- */
  const callTypes: Call["callType"][] = [
    "Pre-Sales","Trial Booking","Trial Reminder","Trial Follow-up","Membership Renewal","Reactivation","Feedback",
  ];
  const calls: Call[] = Array.from({ length: 64 }, (_, i) => {
    const lead = pick(r, leads);
    const outcome = pick(r, [
      "Connected","Not Connected","Interested","Trial Booked","Not Interested","Callback","Pending",
    ] as Call["outcome"][]);
    const status: Call["status"] =
      outcome === "Pending" ? (r() > 0.5 ? "Queued" : "In Progress") : r() > 0.06 ? "Completed" : "Failed";
    return {
      id: `CALL-${pad(i + 2)}`,
      tenantId: TENANT_ID,
      locationId: lead.locationId,
      leadId: lead.id,
      contact: lead.name,
      phone: lead.phone,
      callType: callTypes[i % callTypes.length]!,
      assignedTo: r() > 0.35 ? "AI Agent · Sarvam" : pick(r, salesTeam).name,
      scheduledAt: dtShift(int(r, -6, 2), int(r, 9, 19), pick(r, [0, 15, 30, 45])),
      status,
      outcome,
      nextAction: pick(r, [
        "Book trial","Send offer","Retry in 24h","Schedule callback","Assign to sales","Close as lost","Send WhatsApp brochure",
      ]),
      duration: status === "Completed" ? int(r, 25, 320) : 0,
      provider: r() > 0.25 ? "Sarvam Voice" : r() > 0.5 ? "Twilio Voice" : "Manual",
      summary: pick(r, [
        "Lead asked about morning batch availability and monthly pricing.",
        "Number unreachable, voicemail left with callback link.",
        "Interested in strength coaching, requested a weekend trial.",
        "Wants to compare PT packs before deciding.",
        "Confirmed trial attendance for Saturday.",
      ]),
      intent: pick(r, ["High", "Medium", "Low", "Unknown"] as Call["intent"][]),
      recording: status === "Completed" ? (r() > 0.15 ? "Available" : "Processing") : "Not Recorded",
      consent: r() > 0.1 ? "Granted" : r() > 0.5 ? "Pending" : "Declined",
    };
  });
  calls.unshift({
    id: "CALL-0001",
    tenantId: TENANT_ID,
    locationId: "LOC-01",
    leadId: "LEAD-1001",
    contact: "Rahul Sharma",
    phone: "+91 98200 41122",
    callType: "Pre-Sales",
    assignedTo: "AI Agent · Sarvam",
    scheduledAt: dtShift(-28, 11, 15),
    status: "Completed",
    outcome: "Trial Booked",
    nextAction: "Confirm Saturday 10:00 trial with Vikram Iyer",
    duration: 214,
    provider: "Sarvam Voice",
    summary:
      "Connected. Rahul wants structured strength training 4x/week, previously trained 2 years. Booked Saturday 10:00 strength trial at Bandra.",
    intent: "High",
    recording: "Available",
    consent: "Granted",
  });

  /* ---------------- trials ---------------- */
  const trialStatuses: Trial["status"][] = [
    "Booked","Confirmed","Attended","No Show","Cancelled","Completed","Converted","Lost",
  ];
  const trials: Trial[] = Array.from({ length: 21 }, (_, i) => {
    const lead = leads[(i * 2 + 1) % leads.length]!;
    const st = trialStatuses[i % trialStatuses.length]!;
    const trainer = pick(r, trainers);
    return {
      id: `TRL-${pad(i + 2, 3)}`,
      tenantId: TENANT_ID,
      locationId: lead.locationId,
      leadId: lead.id,
      lead: lead.name,
      trialType: pick(r, ["Strength Trial", "Pilates Trial", "Group Class Trial", "PT Trial", "Assessment Trial"]),
      date: shift(int(r, -14, 10)),
      time: pick(r, ["07:00", "08:30", "10:00", "17:30", "19:00"]),
      trainer: trainer.name,
      trainerId: trainer.id,
      status: st,
      source: lead.source,
      outcome: pick(r, ["Interested", "Needs follow-up", "Price sensitive", "Ready to join", "Not a fit"]),
      converted: st === "Converted",
      trainerRating: int(r, 3, 5),
      recommendedProgram: pick(r, ["12 Week Strength Program", "8 Week Fat Loss", "Pilates Foundation", "Mobility Reset"]),
      recommendedMembership: pick(r, plans).name,
      experience: pick(r, ["Beginner", "1-2 years", "3+ years", "Returning after break"]),
      feedback: pick(r, [
        "Good movement quality, needs hip mobility work.",
        "Strong base, motivated by measurable targets.",
        "Deconditioned, start with 3 sessions per week.",
        "Prefers small group over 1:1.",
      ]),
    };
  });
  trials.unshift({
    id: "TRL-001",
    tenantId: TENANT_ID,
    locationId: "LOC-01",
    leadId: "LEAD-1001",
    lead: "Rahul Sharma",
    trialType: "Strength Trial",
    date: shift(-22),
    time: "10:00",
    trainer: trainers[0]!.name,
    trainerId: trainers[0]!.id,
    status: "Converted",
    source: "Instagram",
    outcome: "Ready to join",
    converted: true,
    trainerRating: 5,
    recommendedProgram: "12 Week Strength Program",
    recommendedMembership: "12 Week Strength Program",
    experience: "1-2 years",
    feedback:
      "Excellent squat pattern, limited thoracic rotation. High intent, responds well to progressive overload. Recommend 12 Week Strength Program with a free performance assessment as incentive.",
  });

  /* ---------------- offers & coupons ---------------- */
  const offerTypes: Offer["type"][] = [
    "Membership","PT","Pilates","Nutrition","Bundle","Trial Conversion","Renewal","Reactivation","Referral",
  ];
  const offers: Offer[] = Array.from({ length: 15 }, (_, i) => {
    const usage = int(r, 4, 180);
    return {
      id: `OFR-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: r() > 0.5 ? locIds[i % 3] : undefined,
      name: [
        "Free Performance Assessment","Monsoon Strength Bundle","PT Pack Upgrade","Pilates Intro 3 Sessions",
        "Nutrition + Gym Combo","Trial-to-Member 15%","Renewal Loyalty 10%","Win-back 20%","Refer & Earn 1 Month",
        "Corporate Wellness Pack","Annual Prepay Advantage","Student Strength Plan","Couple Membership",
        "Early Bird Batch Offer","Assessment + Program Bundle",
      ][i]!,
      type: offerTypes[i % offerTypes.length]!,
      service: pick(r, SERVICES_LIST),
      start: shift(-int(r, 5, 90)),
      end: shift(int(r, -10, 120)),
      usage,
      usageLimit: usage + int(r, 10, 200),
      conversion: int(r, 8, 62),
      revenue: usage * int(r, 1500, 9000),
      discount: pick(r, ["10%", "15%", "20%", "₹2,000 off", "₹5,000 off", "Free add-on"]),
      benefit: pick(r, ["Free assessment", "1 extra month", "2 PT sessions", "Nutrition consult", "Merch kit"]),
      approvalRequired: r() > 0.6,
      status: pick(r, ["Active", "Active", "Scheduled", "Expired", "Pending Approval", "Draft"] as Offer["status"][]),
      eligibility: pick(r, ["New members", "Existing members", "Trial attendees", "Lapsed members", "All"]),
    };
  });
  offers[0]!.status = "Active";
  offers[0]!.type = "Trial Conversion";
  offers[0]!.eligibility = "Trial attendees";
  offers[0]!.benefit = "Free performance assessment";

  const couponTypes: Coupon["type"][] = [
    "Percentage","Fixed Amount","Free Session","Free Assessment","Upgrade","Bundle","Referral",
  ];
  const coupons: Coupon[] = Array.from({ length: 20 }, (_, i) => {
    const usage = int(r, 2, 240);
    return {
      id: `CPN-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      code: [
        "WELCOME10","STRONG20","PILATES1","FITFAM15","RENEW10","COMEBACK25","REFER500","ANNUAL3000","CORP12","STUDENT15",
        "MONSOON10","EARLYBIRD","ASSESSFREE","UPGRADEPT","BUNDLE20","TRIAL2MEM","NUTRI500","POWER25","FLEX10","LOYAL5",
      ][i]!,
      campaign: pick(r, ["Monsoon Push", "Trial Conversion", "Renewal Drive", "Win-back", "Referral Engine", "Corporate"]),
      type: couponTypes[i % couponTypes.length]!,
      discount: pick(r, ["10%", "15%", "20%", "25%", "₹500", "₹3,000", "1 free session"]),
      validFrom: shift(-int(r, 10, 120)),
      validUntil: shift(int(r, -15, 150)),
      usage,
      limit: usage + int(r, 20, 400),
      revenue: usage * int(r, 900, 6000),
      audience: pick(r, ["New Members", "Existing Members", "All"] as Coupon["audience"][]),
      minAmount: pick(r, [0, 2000, 5000, 10000]),
      status: pick(r, ["Active", "Active", "Scheduled", "Expired", "Disabled"] as Coupon["status"][]),
    };
  });
  coupons[0]!.status = "Active";
  coupons[0]!.campaign = "Trial Conversion";
  coupons[0]!.audience = "New Members";

  /* ---------------- classes & bookings ---------------- */
  const classTypes = ["Strength", "Conditioning", "Bootcamp", "Pilates", "Mobility", "Performance"];
  const classes: ClassDef[] = Array.from({ length: 30 }, (_, i) => {
    const t = trainers[i % trainers.length]!;
    const cap = int(r, 8, 28);
    return {
      id: `CLS-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      name: `${classTypes[i % classTypes.length]} ${pick(r, ["Express", "Foundation", "Advanced", "Circuit", "Flow"])}`,
      type: classTypes[i % classTypes.length]!,
      studio: `Studio ${pick(r, ["A", "B", "C"])}`,
      trainer: t.name,
      trainerId: t.id,
      capacity: cap,
      booked: Math.min(cap, int(r, 3, cap + 4)),
      schedule: pick(r, ["Mon/Wed/Fri 07:00", "Tue/Thu 18:30", "Mon–Fri 06:00", "Sat/Sun 09:00", "Mon/Thu 19:30"]),
      duration: pick(r, [45, 50, 55, 60]),
      status: r() > 0.09 ? "Active" : "Paused",
    };
  });

  const bookingTypes: Booking["type"][] = ["Class", "PT", "Pilates", "Assessment", "Nutrition"];
  const bookings: Booking[] = Array.from({ length: 68 }, (_, i) => {
    const m = pick(r, members);
    const t = trainers[i % trainers.length]!;
    const type = bookingTypes[i % bookingTypes.length]!;
    const cls = pick(r, classes);
    const day = int(r, -2, 6);
    return {
      id: `BKG-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: m.locationId,
      memberId: m.id,
      member: m.name,
      type,
      title: type === "Class" ? cls.name : type === "PT" ? "PT Session" : type === "Pilates" ? "Reformer Session" : type === "Assessment" ? "Performance Assessment" : "Nutrition Consult",
      date: shift(day),
      time: pick(r, ["06:00", "07:00", "08:30", "10:00", "12:00", "17:30", "18:30", "19:30"]),
      trainer: t.name,
      trainerId: t.id,
      status: day < 0 ? pick(r, ["Attended", "No Show", "Cancelled"] as Booking["status"][]) : pick(r, ["Confirmed", "Confirmed", "Waitlist"] as Booking["status"][]),
      capacity: type === "Class" ? cls.capacity : 1,
      booked: type === "Class" ? cls.booked : 1,
      source: pick(r, ["App", "Front Desk", "Sales", "Auto"] as Booking["source"][]),
    };
  });

  /* ---------------- assessments / programs / exercises ---------------- */
  const assessments: Assessment[] = Array.from({ length: 34 }, (_, i) => {
    const m = members[i * 3]!;
    const st = i < 3 ? "Completed" : pick(r, ["Scheduled", "Completed", "Completed", "Overdue"] as Assessment["status"][]);
    const strength = int(r, 40, 95);
    const mobility = int(r, 35, 92);
    const conditioning = int(r, 38, 94);
    const movement = int(r, 40, 96);
    return {
      id: `ASM-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: m.locationId,
      memberId: m.id,
      member: m.name,
      type: pick(r, ["Baseline Assessment", "Performance Assessment", "Movement Screen", "Body Composition", "Re-assessment"]),
      date: shift(int(r, -60, 14)),
      trainer: m.coach,
      status: st,
      strength,
      mobility,
      conditioning,
      movement,
      posture: int(r, 40, 95),
      bodyFat: Number((12 + r() * 22).toFixed(1)),
      weight: int(r, 48, 104),
      score: Math.round((strength + mobility + conditioning + movement) / 4),
    };
  });
  assessments[0]!.member = "Rahul Sharma";
  assessments[0]!.memberId = "MEM-0001";
  assessments[0]!.type = "Baseline Assessment";
  assessments[0]!.date = shift(-14);
  assessments[0]!.status = "Completed";

  const exercises: Exercise[] = [
    ["Back Squat", "Squat", "Barbell", "Quads"],["Front Squat", "Squat", "Barbell", "Quads"],
    ["Deadlift", "Hinge", "Barbell", "Posterior Chain"],["Romanian Deadlift", "Hinge", "Barbell", "Hamstrings"],
    ["Bench Press", "Horizontal Push", "Barbell", "Chest"],["Incline DB Press", "Horizontal Push", "Dumbbell", "Chest"],
    ["Overhead Press", "Vertical Push", "Barbell", "Shoulders"],["Pull-up", "Vertical Pull", "Bodyweight", "Lats"],
    ["Barbell Row", "Horizontal Pull", "Barbell", "Back"],["Split Squat", "Lunge", "Dumbbell", "Quads"],
    ["Hip Thrust", "Hinge", "Barbell", "Glutes"],["Farmer Carry", "Carry", "Dumbbell", "Grip"],
    ["Reformer Footwork", "Pilates", "Reformer", "Legs"],["Reformer Long Stretch", "Pilates", "Reformer", "Core"],
    ["Assault Bike Intervals", "Conditioning", "Machine", "Full Body"],["Sled Push", "Conditioning", "Sled", "Full Body"],
    ["Copenhagen Plank", "Core", "Bodyweight", "Adductors"],["Pallof Press", "Core", "Cable", "Core"],
    ["Turkish Get-up", "Full Body", "Kettlebell", "Full Body"],["90/90 Hip Switch", "Mobility", "Bodyweight", "Hips"],
    ["Thoracic Opener", "Mobility", "Foam Roller", "T-Spine"],["Nordic Curl", "Hinge", "Bodyweight", "Hamstrings"],
    ["Lat Pulldown", "Vertical Pull", "Cable", "Lats"],["Cable Row", "Horizontal Pull", "Cable", "Back"],
    ["Box Jump", "Plyometric", "Box", "Legs"],["Med Ball Slam", "Plyometric", "Med Ball", "Full Body"],
    ["Ski Erg Intervals", "Conditioning", "Machine", "Full Body"],["Calf Raise", "Isolation", "Machine", "Calves"],
    ["Face Pull", "Isolation", "Cable", "Rear Delts"],["Plank Series", "Core", "Bodyweight", "Core"],
  ].map((e, i) => ({
    id: `EXR-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: e[0]!,
    pattern: e[1]!,
    equipment: e[2]!,
    primaryMuscle: e[3]!,
    level: pick(r, ["Beginner", "Intermediate", "Advanced"] as Exercise["level"][]),
    usedInPrograms: int(r, 1, 9),
  }));

  const programs: Program[] = [
    ["12 Week Strength Program", "Strength", 12, 4, 58],
    ["8 Week Fat Loss", "Fat Loss", 8, 5, 74],
    ["Pilates Foundation", "Mobility", 6, 3, 41],
    ["Mobility Reset", "Mobility", 4, 3, 22],
    ["Athletic Performance Block", "Athletic Performance", 10, 4, 18],
    ["Post-natal Return", "Rehab", 8, 3, 12],
    ["Hypertrophy Phase 2", "Muscle Gain", 10, 5, 33],
    ["Beginner Onboarding", "General Fitness", 4, 3, 96],
    ["Conditioning Engine", "Conditioning", 6, 4, 27],
    ["Powerbuilding Hybrid", "Strength", 12, 4, 15],
  ].map((p, i) => ({
    id: `PRG-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: p[0] as string,
    goal: p[1] as string,
    weeks: p[2] as number,
    sessionsPerWeek: p[3] as number,
    assignedMembers: p[4] as number,
    version: `v${int(r, 1, 4)}.${int(r, 0, 9)}`,
    owner: trainers[i % trainers.length]!.name,
    status: i > 7 ? "Draft" : "Published",
    level: pick(r, ["Beginner", "Intermediate", "Advanced"]),
  }));

  /* ---------------- nutrition ---------------- */
  const nutritionPlans: NutritionPlan[] = Array.from({ length: 22 }, (_, i) => {
    const m = members[i * 5 + 1]!;
    return {
      id: `NUT-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: m.locationId,
      memberId: m.id,
      member: m.name,
      coach: pick(r, trainers.filter((t) => t.type === "Nutrition")).name,
      planName: pick(r, ["Fat Loss 1600", "Recomp 2200", "Muscle Gain 2800", "Maintenance 2000", "Vegetarian High Protein"]),
      calories: pick(r, [1600, 1800, 2000, 2200, 2600, 2800]),
      protein: int(r, 90, 190),
      carbs: int(r, 120, 320),
      fat: int(r, 40, 90),
      adherence: int(r, 34, 98),
      reviewDue: shift(int(r, -8, 30)),
      status: pick(r, ["Active", "Active", "Review Due", "Completed"] as NutritionPlan["status"][]),
    };
  });

  /* ---------------- inventory ---------------- */
  const suppliers = ["NutraSource India", "PeakSupps", "GymGear Co.", "HydroLife", "FlexEquip", "PureWhey Ltd", "VitalBrands", "ProGear"];
  const products: Product[] = Array.from({ length: 26 }, (_, i) => {
    const cost = int(r, 180, 3400);
    const stock = int(r, 0, 180);
    const reorder = int(r, 12, 40);
    return {
      id: `PRD-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      sku: `SKU-${pad(1000 + i, 4)}`,
      name: [
        "Whey Protein 1kg","Whey Isolate 2kg","Creatine 250g","BCAA 300g","Pre-Workout 300g","Multivitamin 60",
        "Fish Oil 90","Shaker Bottle","Lifting Belt","Wrist Wraps","Knee Sleeves","Resistance Band Set",
        "Yoga Mat","Pilates Ring","Foam Roller","Massage Gun","Electrolyte Sachets","Protein Bar Box",
        "Gym Towel","Water Bottle 1L","Chalk Block","Lifting Straps","Grip Ball","Ankle Straps",
        "Mass Gainer 3kg","Collagen 300g",
      ][i]!,
      category: pick(r, ["Supplements", "Accessories", "Apparel", "Equipment"]),
      supplier: pick(r, suppliers),
      costPrice: cost,
      sellPrice: Math.round(cost * 1.42),
      stock,
      reorderLevel: reorder,
      batch: `B${int(r, 2024, 2026)}-${int(r, 100, 999)}`,
      expiry: shift(int(r, -20, 500)),
      status: stock === 0 ? "Out of Stock" : stock < reorder ? "Low Stock" : "In Stock",
    };
  });

  /* ---------------- finance ---------------- */
  const invoices: Invoice[] = Array.from({ length: 112 }, (_, i) => {
    const m = members[i % members.length]!;
    const amount = pick(r, [3500, 9000, 16000, 28000, 19800, 11200, 24500, 4500]);
    const paidRatio = r();
    const paid = paidRatio > 0.78 ? Math.round(amount * 0.5) : paidRatio > 0.06 ? amount : 0;
    const issued = int(r, -180, -1);
    return {
      id: `INV-${pad(20000 + i, 5)}`,
      tenantId: TENANT_ID,
      locationId: m.locationId,
      memberId: m.id,
      member: m.name,
      service: pick(r, SERVICES_LIST),
      issuedAt: shift(issued),
      dueAt: shift(issued + 15),
      amount,
      tax: Math.round(amount * 0.18),
      paid,
      method: pick(r, ["UPI", "Card", "Cash", "Bank Transfer", "Autopay"] as Invoice["method"][]),
      status:
        paid === 0
          ? issued + 15 < 0
            ? "Overdue"
            : "Pending"
          : paid < amount
            ? "Partially Paid"
            : r() > 0.97
              ? "Refunded"
              : "Paid",
    };
  });

  /* ---------------- customer success ---------------- */
  const complaints: Complaint[] = Array.from({ length: 22 }, (_, i) => {
    const m = pick(r, members);
    const created = int(r, -30, 0);
    const status = pick(r, ["Open", "In Progress", "Escalated", "Resolved", "Resolved", "Closed"] as Complaint["status"][]);
    const resolved = status === "Resolved" || status === "Closed";
    return {
      id: `GRV-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: m.locationId,
      memberId: m.id,
      member: m.name,
      category: pick(r, ["Cleanliness", "Equipment", "Trainer Conduct", "Billing", "Class Capacity", "App Issue", "Locker Room"]),
      priority: pick(r, ["Critical", "High", "Medium", "Low"] as Complaint["priority"][]),
      assignedTo: pick(r, users.filter((u) => u.role === "Customer Success" || u.role === "Manager")).name,
      slaDue: shift(created + int(r, 1, 5)),
      slaBreached: r() > 0.75,
      status,
      createdAt: shift(created),
      resolvedAt: resolved ? shift(created + int(r, 1, 6)) : null,
      satisfaction: resolved ? int(r, 2, 5) : null,
      summary: pick(r, [
        "AC not working in Studio B during evening slot.",
        "Charged twice for the same PT pack.",
        "Class was full despite confirmed booking.",
        "Requested trainer change after schedule conflict.",
        "Shower area needs maintenance.",
      ]),
    };
  });

  /* ---------------- marketing & comms ---------------- */
  const campaigns: Campaign[] = Array.from({ length: 12 }, (_, i) => {
    const sent = int(r, 400, 12000);
    const leadsGen = int(r, 20, 420);
    const conv = int(r, 3, Math.max(4, Math.round(leadsGen * 0.32)));
    const spend = int(r, 8, 160) * 1000;
    return {
      id: `CMP-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      name: [
        "Monsoon Membership Push","Trial Conversion Nudge","Renewal Reminder Series","Win-back Lapsed 90d",
        "Referral Engine","Corporate Wellness Outreach","Pilates Launch Bandra","Strength Program Waitlist",
        "Nutrition Add-on Upsell","Festive Prepay","New Year Intake","Weekend Bootcamp Promo",
      ][i]!,
      channel: pick(r, ["WhatsApp", "Email", "SMS", "Meta Ads", "Google Ads", "Push"] as Campaign["channel"][]),
      audience: pick(r, ["Lapsed 90d", "Active members", "Trial attendees", "Cold leads", "Corporate list", "All members"]),
      sent,
      delivered: Math.round(sent * (0.86 + r() * 0.12)),
      opened: Math.round(sent * (0.2 + r() * 0.45)),
      leads: leadsGen,
      conversions: conv,
      spend,
      revenue: conv * int(r, 6000, 26000),
      status: pick(r, ["Running", "Scheduled", "Completed", "Paused"] as Campaign["status"][]),
      start: shift(-int(r, 2, 120)),
    };
  });

  const communications: Communication[] = Array.from({ length: 46 }, (_, i) => {
    const person = i % 2 === 0 ? pick(r, members).name : pick(r, leads).name;
    return {
      id: `MSG-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      contact: person,
      channel: pick(r, ["WhatsApp", "Email", "SMS", "Push", "Voice"] as Communication["channel"][]),
      template: pick(r, [
        "Trial Reminder","Renewal Due D-7","Welcome Onboarding","Payment Receipt","Class Cancelled",
        "Offer: Free Assessment","Win-back 20%","Feedback Request",
      ]),
      direction: r() > 0.82 ? "Inbound" : "Outbound",
      sentAt: dtShift(-int(r, 0, 10), int(r, 8, 21), int(r, 0, 59)),
      status: pick(r, ["Delivered", "Read", "Read", "Failed", "Queued", "Bounced"] as Communication["status"][]),
      module: pick(r, ["CRM", "Membership", "Finance", "Booking", "Customer Success"]),
    };
  });

  /* ---------------- automation ---------------- */
  const workflows: Workflow[] = [
    ["New Lead → AI Call", "Lead created", "Source is digital", ["Create AI call task", "Notify sales owner"]],
    ["Trial Booked → Reminder", "Trial booked", "Trial in next 24h", ["WhatsApp reminder", "SMS reminder"]],
    ["Trial Completed → Sales Task", "Trial marked attended", "Feedback submitted", ["Create sales task", "Score lead"]],
    ["High Intent → Recommended Offer", "Trial completed", "Interest = High", ["Generate offer", "Request approval", "Send offer"]],
    ["Membership Expiring → Renewal", "Membership D-14", "Auto-renew off", ["Renewal task", "WhatsApp offer", "Escalate D-3"]],
    ["Member Inactive → Reactivation", "No visit 21 days", "Status = Active", ["AI reactivation call", "CS task"]],
    ["Payment Overdue → Dunning", "Invoice overdue", "Amount > ₹1,000", ["Email reminder", "SMS", "Front-desk task"]],
    ["Complaint Critical → Escalate", "Complaint created", "Priority = Critical", ["Notify manager", "SLA timer 4h"]],
    ["Low Stock → Purchase Request", "Stock < reorder", "Category = Supplements", ["Draft PO", "Approval request"]],
  ].map((w, i) => ({
    id: `WFL-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: w[0] as string,
    trigger: w[1] as string,
    conditions: w[2] as string,
    actions: w[3] as string[],
    runs: int(r, 40, 2400),
    successRate: int(r, 82, 100),
    lastRunAt: dtShift(0, int(r, 6, 20), int(r, 0, 59)),
    status: i === 8 ? "Draft" : i === 5 ? "Paused" : "Active",
    owner: pick(r, users).name,
  }));

  const approvals: Approval[] = Array.from({ length: 16 }, (_, i) => {
    const type = (["Discount","Offer","Refund","Membership Transfer","Expense","Purchase","Coupon","Special Pricing"] as Approval["type"][])[i % 8]!;
    return {
      id: `APR-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: locIds[i % 3],
      type,
      requestedBy: pick(r, users).name,
      subject: pick(r, [
        "20% discount on Annual Gym for corporate lead",
        "Refund for duplicate PT charge",
        "Transfer membership to spouse",
        "Purchase order — Whey Protein 40 units",
        "Special pricing for referral cluster",
        "New coupon FESTIVE20",
      ]),
      amount: int(r, 1, 60) * 1000,
      approver: pick(r, users.filter((u) => u.role === "Manager" || u.role === "Admin" || u.role === "Tenant Owner")).name,
      raisedAt: dtShift(-int(r, 0, 6), int(r, 9, 19)),
      status: pick(r, ["Pending", "Pending", "Approved", "Rejected"] as Approval["status"][]),
      ageHours: int(r, 1, 96),
    };
  });

  const auditLogs: AuditLog[] = Array.from({ length: 48 }, (_, i) => {
    const u = pick(r, users);
    return {
      id: `AUD-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      user: u.name,
      tenant: "Elevate Fitness",
      module: pick(r, ["CRM", "Members", "Finance", "Inventory", "Administration", "Automation", "Offers"]),
      action: pick(r, ["Updated record", "Created record", "Deleted record", "Approved request", "Exported data", "Changed permission", "Logged in"]),
      at: dtShift(-int(r, 0, 5), int(r, 7, 22), int(r, 0, 59)),
      ip: `10.${int(r, 0, 40)}.${int(r, 0, 255)}.${int(r, 2, 254)}`,
      oldValue: pick(r, ["Stage: Qualified", "Price: ₹28,000", "Role: Sales", "Status: Active", "—"]),
      newValue: pick(r, ["Stage: Trial Booked", "Price: ₹26,500", "Role: Manager", "Status: Frozen", "Created"]),
    };
  });

  const integrations: Integration[] = [
    ["Razorpay", "Payments", "Razorpay", "Connected"],
    ["Stripe", "Payments", "Stripe", "Not Connected"],
    ["WhatsApp Business", "Messaging", "Meta Cloud API", "Connected"],
    ["SMS Gateway", "Messaging", "MSG91", "Connected"],
    ["Transactional Email", "Messaging", "Resend", "Connected"],
    ["Sarvam Voice AI", "Voice AI", "Sarvam", "Connected"],
    ["Twilio Voice", "Voice AI", "Twilio", "Not Connected"],
    ["Wearables Sync", "Wearables", "Terra API", "Error"],
    ["Accounting", "Accounting", "Zoho Books", "Connected"],
    ["Access Control", "Hardware", "ESSL Biometric", "Connected"],
    ["Analytics", "Analytics", "PostHog", "Connected"],
    ["Google Calendar", "Calendar", "Google", "Not Connected"],
  ].map((n, i) => ({
    id: `INT-${pad(i + 1, 3)}`,
    tenantId: TENANT_ID,
    name: n[0]!,
    category: n[1]!,
    provider: n[2]!,
    status: n[3] as Integration["status"],
    lastSyncAt: dtShift(-int(r, 0, 3), int(r, 1, 22), int(r, 0, 59)),
    events: int(r, 0, 48000),
  }));

  const tasks: Task[] = Array.from({ length: 28 }, (_, i) => {
    const lead = pick(r, leads);
    const due = int(r, -3, 6);
    return {
      id: `TSK-${pad(i + 1, 3)}`,
      tenantId: TENANT_ID,
      locationId: lead.locationId,
      title: pick(r, [
        "Call back regarding PT pricing",
        "Send WhatsApp offer",
        "Confirm trial slot",
        "Collect outstanding payment",
        "Schedule progress review",
        "Renewal conversation",
      ]),
      relatedTo: lead.name,
      relatedId: lead.id,
      type: pick(r, ["Call", "WhatsApp", "Visit", "Email", "Review"] as Task["type"][]),
      owner: pick(r, salesTeam).name,
      dueAt: shift(due),
      priority: pick(r, ["High", "Medium", "Low"] as Task["priority"][]),
      status: due < 0 ? "Overdue" : r() > 0.7 ? "Done" : "Open",
    };
  });

  cache = {
    tenants, locations, users, trainers, services, plans, members, leads, calls, trials, offers, coupons,
    classes, bookings, assessments, exercises, programs, nutritionPlans, products, invoices, complaints,
    campaigns, communications, workflows, approvals, auditLogs, integrations, tasks,
  };
  return cache;
}
