/**
 * Deterministic demo data for the AI / intelligence / coaching modules.
 * Kept out of seed.ts so the base dataset stays stable, and built lazily so
 * nothing runs at module scope (edge-runtime safe).
 */

import { TENANT_ID, TODAY } from "./seed";
import type { ID, Scoped } from "./types";

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shift(days: number) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function dt(days: number, hour: number, minute = 0) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}
function pad(n: number, w = 3) {
  return String(n).padStart(w, "0");
}
function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}
function int(r: () => number, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

const LOCS = ["LOC-01", "LOC-02", "LOC-03"];
const PEOPLE = [
  "Rahul Sharma","Ananya Iyer","Vikram Reddy","Priya Nair","Karan Malhotra","Neha Desai",
  "Aditya Rao","Sanya Kapoor","Rohan Joshi","Meera Menon","Nikhil Verma","Divya Shetty",
];
const COACHES = [
  "Arjun Mehta","Sneha Kapoor","Ritika Bose","Devang Patel","Farah Khan","Ishaan Bhatia",
];

export interface AiCoachPlan extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  goal: string;
  model: string;
  planWeeks: number;
  weeklyLoad: string;
  adaptations: number;
  adherence: number;
  lastAdaptedAt: string;
  nextCheckIn: string;
  confidence: number;
  humanReview: "Approved" | "Pending" | "Not Required";
  status: "Active" | "Paused" | "Completed" | "Draft";
}

export interface CopilotInsight extends Scoped {
  id: ID;
  trainer: string;
  trainerId: ID;
  member: string;
  memberId: ID;
  insightType: "Load Warning" | "Progression" | "Retention Risk" | "Technique" | "Upsell";
  recommendation: string;
  priority: "High" | "Medium" | "Low";
  confidence: number;
  generatedAt: string;
  actedOn: boolean;
  outcome: string;
  status: "Open" | "Accepted" | "Dismissed" | "Completed";
}

export interface BiInsight extends Scoped {
  id: ID;
  title: string;
  domain: "Revenue" | "Retention" | "Acquisition" | "Utilisation" | "Staffing" | "Inventory";
  metric: string;
  currentValue: number;
  forecastValue: number;
  variance: number;
  window: string;
  driver: string;
  recommendation: string;
  owner: string;
  generatedAt: string;
  status: "New" | "Reviewed" | "Actioned" | "Dismissed";
}

export interface VisionAnalysis extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  exercise: string;
  capturedAt: string;
  camera: string;
  reps: number;
  formScore: number;
  romScore: number;
  tempoScore: number;
  faults: string;
  riskFlag: "None" | "Low" | "Moderate" | "High";
  reviewedBy: string;
  model: string;
  status: "Processed" | "Processing" | "Review Needed" | "Failed";
}

export interface LiveSession extends Scoped {
  id: ID;
  title: string;
  coach: string;
  coachId: ID;
  channel: "Zoom" | "In-App Live" | "WhatsApp Video" | "YouTube Live";
  scheduledAt: string;
  durationMin: number;
  enrolled: number;
  joined: number;
  avgHeartRate: number;
  engagement: number;
  recording: "Available" | "Processing" | "Not Recorded";
  status: "Scheduled" | "Live" | "Completed" | "Cancelled";
}

export interface GroupTracking extends Scoped {
  id: ID;
  className: string;
  trainer: string;
  studio: string;
  date: string;
  time: string;
  capacity: number;
  checkedIn: number;
  noShows: number;
  avgIntensity: number;
  avgCalories: number;
  devicesPaired: number;
  trackingMode: "Computer Vision" | "Heart Rate Belt" | "Manual";
  status: "Tracked" | "In Progress" | "Partial" | "Not Tracked";
}

export interface CoachProfile extends Scoped {
  id: ID;
  name: string;
  coachType: "Online Coach" | "Nutrition Coach";
  specialization: string;
  certification: string;
  clients: number;
  capacity: number;
  timezone: string;
  responseHours: number;
  checkInsPerWeek: number;
  retention: number;
  rating: number;
  revenue: number;
  status: "Active" | "On Leave" | "Onboarding" | "Inactive";
}

export interface MlModel extends Scoped {
  id: ID;
  name: string;
  useCase: string;
  provider: "Sarvam" | "OpenAI" | "In-house" | "Google";
  version: string;
  trainedAt: string;
  accuracy: number;
  drift: number;
  requests30d: number;
  costPer1k: number;
  guardrails: string;
  owner: string;
  status: "Production" | "Shadow" | "Training" | "Retired";
}

export interface SupportTicket extends Scoped {
  id: ID;
  memberId: ID;
  member: string;
  channel: "App" | "WhatsApp" | "Front Desk" | "Email" | "Call";
  category: string;
  subject: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  assignedTo: string;
  createdAt: string;
  slaDue: string;
  firstResponseMin: number;
  escalations: number;
  satisfaction: number | null;
  status: "Open" | "In Progress" | "Escalated" | "Resolved" | "Closed";
}

export interface AiDataset {
  aiCoachPlans: AiCoachPlan[];
  copilotInsights: CopilotInsight[];
  biInsights: BiInsight[];
  visionAnalyses: VisionAnalysis[];
  liveSessions: LiveSession[];
  groupTracking: GroupTracking[];
  coaches: CoachProfile[];
  mlModels: MlModel[];
  supportTickets: SupportTicket[];
}

let cache: AiDataset | null = null;

export function getAiDataset(): AiDataset {
  if (cache) return cache;
  const r = rng(730521);

  const aiCoachPlans: AiCoachPlan[] = Array.from({ length: 26 }, (_, i) => {
    const member = i === 0 ? "Rahul Sharma" : pick(r, PEOPLE);
    return {
      id: `AIC-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      memberId: i === 0 ? "MEM-0001" : `MEM-${pad(int(r, 2, 180), 4)}`,
      member,
      goal: pick(r, ["Fat Loss", "Strength", "Muscle Gain", "Mobility", "Athletic Performance"]),
      model: pick(r, ["coach-adapt-v3", "coach-adapt-v2", "hybrid-periodiser-v1"]),
      planWeeks: pick(r, [8, 12, 16]),
      weeklyLoad: `${int(r, 3, 6)} sessions · ${int(r, 240, 520)} TSS`,
      adaptations: int(r, 1, 24),
      adherence: int(r, 54, 98),
      lastAdaptedAt: dt(-int(r, 0, 9), int(r, 6, 20)),
      nextCheckIn: shift(int(r, 1, 14)),
      confidence: int(r, 62, 97),
      humanReview: pick(r, ["Approved", "Pending", "Not Required"] as AiCoachPlan["humanReview"][]),
      status: i === 0 ? "Active" : pick(r, ["Active", "Active", "Paused", "Completed", "Draft"] as AiCoachPlan["status"][]),
    };
  });

  const copilotInsights: CopilotInsight[] = Array.from({ length: 30 }, (_, i) => ({
    id: `CPI-${pad(i + 1)}`,
    tenantId: TENANT_ID,
    locationId: LOCS[i % 3],
    trainer: pick(r, COACHES),
    trainerId: `TRN-${pad(int(r, 1, 18))}`,
    member: i === 0 ? "Rahul Sharma" : pick(r, PEOPLE),
    memberId: i === 0 ? "MEM-0001" : `MEM-${pad(int(r, 2, 180), 4)}`,
    insightType: pick(r, [
      "Load Warning","Progression","Retention Risk","Technique","Upsell",
    ] as CopilotInsight["insightType"][]),
    recommendation: pick(r, [
      "Reduce squat volume 20% this week — ACWR above 1.5",
      "Progress bench to 4×6 @ 72.5kg, last set RPE 7",
      "Attendance down 40% in 14 days — book a check-in call",
      "Hip shift detected on right side; cue tempo eccentric",
      "Ready for Pilates add-on based on mobility gains",
    ]),
    priority: pick(r, ["High", "Medium", "Low"] as CopilotInsight["priority"][]),
    confidence: int(r, 58, 96),
    generatedAt: dt(-int(r, 0, 6), int(r, 6, 21), int(r, 0, 59)),
    actedOn: r() > 0.55,
    outcome: pick(r, ["Program updated", "Call booked", "No change", "Escalated to manager", "Pending"]),
    status: pick(r, ["Open", "Accepted", "Dismissed", "Completed"] as CopilotInsight["status"][]),
  }));

  const biInsights: BiInsight[] = Array.from({ length: 22 }, (_, i) => {
    const current = int(r, 40, 100);
    const forecast = current + int(r, -18, 22);
    return {
      id: `BIQ-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      title: pick(r, [
        "PT attach rate slipping at Andheri",
        "Renewal window conversion improving",
        "Pilates studio utilisation below target",
        "Cash collection lag on autopay cohort",
        "Trainer overtime trending up",
        "Supplement stock-outs cost revenue",
      ]),
      domain: pick(r, [
        "Revenue","Retention","Acquisition","Utilisation","Staffing","Inventory",
      ] as BiInsight["domain"][]),
      metric: pick(r, ["Attach rate %", "Renewal %", "Utilisation %", "Collection %", "Overtime hrs", "Fill rate %"]),
      currentValue: current,
      forecastValue: forecast,
      variance: forecast - current,
      window: pick(r, ["Next 30 days", "Next 60 days", "This quarter"]),
      driver: pick(r, [
        "Front-desk staffing gap in evening peak",
        "AI calling coverage increased 2.4×",
        "Two reformer slots unsold on weekdays",
        "Card mandates expiring in bulk",
      ]),
      recommendation: pick(r, [
        "Reassign two sales reps to evening shift",
        "Extend renewal offer window to 21 days",
        "Launch weekday reformer bundle",
        "Trigger mandate-renewal WhatsApp campaign",
      ]),
      owner: pick(r, ["Aarav Menon", "Sneha Kapoor", "Karan Malhotra"]),
      generatedAt: dt(-int(r, 0, 5), int(r, 5, 9)),
      status: pick(r, ["New", "Reviewed", "Actioned", "Dismissed"] as BiInsight["status"][]),
    };
  });

  const visionAnalyses: VisionAnalysis[] = Array.from({ length: 28 }, (_, i) => ({
    id: `CV-${pad(i + 1)}`,
    tenantId: TENANT_ID,
    locationId: LOCS[i % 3],
    memberId: i === 0 ? "MEM-0001" : `MEM-${pad(int(r, 2, 180), 4)}`,
    member: i === 0 ? "Rahul Sharma" : pick(r, PEOPLE),
    exercise: pick(r, ["Back Squat", "Deadlift", "Overhead Press", "Split Squat", "Row", "Hip Hinge Screen"]),
    capturedAt: dt(-int(r, 0, 10), int(r, 6, 21), int(r, 0, 59)),
    camera: pick(r, ["Rig Cam 1", "Rig Cam 2", "Studio Cam", "Mobile Capture"]),
    reps: int(r, 5, 30),
    formScore: int(r, 52, 98),
    romScore: int(r, 50, 97),
    tempoScore: int(r, 48, 96),
    faults: pick(r, ["Knee valgus", "Lumbar flexion", "Bar path drift", "Asymmetric drive", "None detected"]),
    riskFlag: pick(r, ["None", "Low", "Moderate", "High"] as VisionAnalysis["riskFlag"][]),
    reviewedBy: pick(r, [...COACHES, "—"]),
    model: pick(r, ["pose-3d-v4", "pose-3d-v3", "lift-classifier-v2"]),
    status: pick(r, ["Processed", "Processed", "Processing", "Review Needed", "Failed"] as VisionAnalysis["status"][]),
  }));

  const liveSessions: LiveSession[] = Array.from({ length: 24 }, (_, i) => {
    const enrolled = int(r, 8, 60);
    const joined = Math.max(3, enrolled - int(r, 0, 18));
    return {
      id: `LIVE-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      title: pick(r, [
        "Live HIIT 30","Online Strength Block A","Mobility Reset","Reformer Flow Live",
        "Nutrition Q&A","Marathon Prep Live",
      ]),
      coach: pick(r, COACHES),
      coachId: `TRN-${pad(int(r, 1, 18))}`,
      channel: pick(r, ["Zoom", "In-App Live", "WhatsApp Video", "YouTube Live"] as LiveSession["channel"][]),
      scheduledAt: dt(int(r, -6, 6), int(r, 6, 20), pick(r, [0, 30])),
      durationMin: pick(r, [30, 45, 60]),
      enrolled,
      joined,
      avgHeartRate: int(r, 108, 158),
      engagement: Math.round((joined / enrolled) * 100),
      recording: pick(r, ["Available", "Processing", "Not Recorded"] as LiveSession["recording"][]),
      status: pick(r, ["Scheduled", "Live", "Completed", "Completed", "Cancelled"] as LiveSession["status"][]),
    };
  });

  const groupTracking: GroupTracking[] = Array.from({ length: 26 }, (_, i) => {
    const capacity = int(r, 12, 32);
    const checkedIn = int(r, 5, capacity);
    return {
      id: `GCT-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      className: pick(r, ["Strength Circuit", "HIIT 45", "Reformer Pilates", "Mobility Flow", "Spin Interval"]),
      trainer: pick(r, COACHES),
      studio: pick(r, ["Studio 1", "Studio 2", "Reformer Room", "Turf Zone"]),
      date: shift(int(r, -8, 3)),
      time: `${pad(int(r, 6, 20), 2)}:${pick(r, ["00", "30"])}`,
      capacity,
      checkedIn,
      noShows: Math.max(0, int(r, 0, 6)),
      avgIntensity: int(r, 55, 92),
      avgCalories: int(r, 260, 620),
      devicesPaired: int(r, 0, checkedIn),
      trackingMode: pick(r, ["Computer Vision", "Heart Rate Belt", "Manual"] as GroupTracking["trackingMode"][]),
      status: pick(r, ["Tracked", "Tracked", "In Progress", "Partial", "Not Tracked"] as GroupTracking["status"][]),
    };
  });

  const coaches: CoachProfile[] = Array.from({ length: 18 }, (_, i) => {
    const coachType: CoachProfile["coachType"] = i % 2 === 0 ? "Online Coach" : "Nutrition Coach";
    const clients = int(r, 8, 64);
    return {
      id: `CCH-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      name: `${pick(r, ["Arjun", "Sneha", "Ritika", "Devang", "Farah", "Ishaan", "Tanvi", "Rohit"])} ${pick(r, ["Mehta", "Kapoor", "Bose", "Patel", "Khan", "Bhatia", "Rao", "Nair"])}`,
      coachType,
      specialization:
        coachType === "Online Coach"
          ? pick(r, ["Hybrid Strength", "Fat Loss", "Marathon", "Postnatal", "Kettlebell"])
          : pick(r, ["Clinical Nutrition", "Sports Nutrition", "PCOS & Hormonal", "Diabetes Reversal", "Weight Management"]),
      certification: coachType === "Online Coach" ? pick(r, ["NSCA CSCS", "ACSM CPT", "ISSA Elite"]) : pick(r, ["RD (India)", "MSc Dietetics", "PN Level 2"]),
      clients,
      capacity: clients + int(r, 2, 20),
      timezone: pick(r, ["IST", "IST", "GST", "SGT"]),
      responseHours: int(r, 1, 24),
      checkInsPerWeek: int(r, 1, 4),
      retention: int(r, 58, 96),
      rating: Number((3.6 + r() * 1.4).toFixed(1)),
      revenue: int(r, 40000, 420000),
      status: pick(r, ["Active", "Active", "Active", "On Leave", "Onboarding", "Inactive"] as CoachProfile["status"][]),
    };
  });

  const mlModels: MlModel[] = [
    ["Lead Intent Scorer", "Score inbound leads for conversion likelihood", "In-house"],
    ["Sarvam Voice Agent", "Outbound AI calling in Hindi/English", "Sarvam"],
    ["Churn Risk Model", "Predict 60-day member churn", "In-house"],
    ["Pose Estimation 3D", "Computer-vision form scoring", "In-house"],
    ["Program Adaptation Engine", "AI coach weekly plan adaptation", "In-house"],
    ["Nutrition Plan Generator", "Macro plan drafting from goals", "OpenAI"],
    ["Support Triage Classifier", "Route grievances by category and SLA", "OpenAI"],
    ["Demand Forecaster", "Class demand and staffing forecast", "Google"],
  ].map((m, i) => ({
    id: `MDL-${pad(i + 1)}`,
    tenantId: TENANT_ID,
    name: m[0]!,
    useCase: m[1]!,
    provider: m[2] as MlModel["provider"],
    version: `v${int(r, 1, 4)}.${int(r, 0, 9)}`,
    trainedAt: shift(-int(r, 5, 120)),
    accuracy: int(r, 74, 96),
    drift: Number((r() * 4).toFixed(2)),
    requests30d: int(r, 2000, 240000),
    costPer1k: Number((r() * 18 + 1).toFixed(2)),
    guardrails: pick(r, ["PII redaction, consent gate", "Human review on low confidence", "Rate limited, audit logged"]),
    owner: pick(r, ["Platform AI Team", "Aarav Menon", "Data Science"]),
    status: pick(r, ["Production", "Production", "Shadow", "Training", "Retired"] as MlModel["status"][]),
  }));

  const supportTickets: SupportTicket[] = Array.from({ length: 32 }, (_, i) => {
    const created = int(r, -18, 0);
    return {
      id: `TKT-${pad(i + 1)}`,
      tenantId: TENANT_ID,
      locationId: LOCS[i % 3],
      memberId: i === 0 ? "MEM-0001" : `MEM-${pad(int(r, 2, 180), 4)}`,
      member: i === 0 ? "Rahul Sharma" : pick(r, PEOPLE),
      channel: pick(r, ["App", "WhatsApp", "Front Desk", "Email", "Call"] as SupportTicket["channel"][]),
      category: pick(r, ["Billing", "Trainer Change", "Equipment", "Cleanliness", "App Issue", "Class Booking", "Freeze Request"]),
      subject: pick(r, [
        "Autopay charged twice this month",
        "Requesting trainer change for evening slot",
        "Reformer spring needs replacement",
        "App not syncing workout logs",
        "Class waitlist never cleared",
      ]),
      priority: pick(r, ["Critical", "High", "Medium", "Low"] as SupportTicket["priority"][]),
      assignedTo: pick(r, ["Ritika Bose", "Farah Khan", "Sneha Kapoor", "Aarav Menon"]),
      createdAt: dt(created, int(r, 7, 20)),
      slaDue: dt(created + int(r, 1, 3), int(r, 7, 20)),
      firstResponseMin: int(r, 4, 480),
      escalations: int(r, 0, 3),
      satisfaction: r() > 0.4 ? int(r, 2, 5) : null,
      status: pick(r, ["Open", "In Progress", "Escalated", "Resolved", "Closed"] as SupportTicket["status"][]),
    };
  });

  cache = {
    aiCoachPlans,
    copilotInsights,
    biInsights,
    visionAnalyses,
    liveSessions,
    groupTracking,
    coaches,
    mlModels,
    supportTickets,
  };
  return cache;
}
