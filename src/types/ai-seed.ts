import { TENANT_ID, TODAY } from "./seed";
import type { ID, Scoped } from "./types";

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
  humanReview: "Approved" | "Pending" | "Rejected" | "Not Required";
  status: "Active" | "Paused" | "Completed" | "Draft";
}

export interface CopilotInsight extends Scoped {
  id: ID;
  type: "Risk" | "Opportunity" | "Anomaly" | "Workflow";
  severity: "Critical" | "High" | "Medium" | "Low";
  targetType: "Member" | "Class" | "Trainer" | "Revenue" | "Inventory";
  targetId: ID;
  targetName: string;
  title: string;
  summary: string;
  suggestedAction: string;
  confidence: number;
  generatedAt: string;
  status: "Open" | "Dismissed" | "Executed";
}

export interface BiInsight extends Scoped {
  id: ID;
  category: "Revenue" | "Retention" | "Capacity" | "Staffing" | "Marketing";
  metric: string;
  trend: "Up" | "Down" | "Flat";
  delta: string;
  headline: string;
  detail: string;
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
  provider: "In-house" | "Sarvam" | "OpenAI" | "Google" | "Anthropic";
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

  cache = {
    aiCoachPlans: [],
    copilotInsights: [],
    biInsights: [],
    visionAnalyses: [],
    liveSessions: [],
    groupTracking: [],
    coaches: [],
    mlModels: [],
    supportTickets: [],
  };

  return cache;
}
