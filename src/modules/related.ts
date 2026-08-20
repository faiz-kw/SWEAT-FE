import { MODULES } from "@/modules/registry";
import { pickTitleKey, inferFields, humanize } from "@/modules/schema";
import { COLLECTION_KEYS, snapshot, type CollectionKey, type Row } from "@/services/store";

const TIME_KEYS = [
  "at",
  "createdAt",
  "sentAt",
  "scheduledAt",
  "raisedAt",
  "issuedAt",
  "date",
  "joinedAt",
  "lastRunAt",
  "start",
  "startedAt",
  "validFrom",
  "lastSyncAt",
  "dueAt",
  "reviewDue",
];

const LINK_KEYS = [
  "memberId",
  "leadId",
  "trainerId",
  "coachId",
  "assignedToId",
  "relatedId",
  "fromLeadId",
  "sessionId",
  "classId",
];

export const COLLECTION_LABELS: Partial<Record<CollectionKey, string>> = {
  aiCoachPlans: "AI Coach Plans",
  copilotInsights: "Trainer Copilot",
  biInsights: "Business Intelligence",
  visionAnalyses: "Computer Vision",
  liveSessions: "Live Sessions",
  groupTracking: "Group Class Tracking",
  coaches: "Coaches",
  mlModels: "ML Models",
  supportTickets: "Support Tickets",
  nutritionPlans: "Nutrition Plans",
  auditLogs: "Audit Logs",
  plans: "Membership Plans",
};

export function collectionLabel(key: CollectionKey) {
  return COLLECTION_LABELS[key] ?? humanize(key);
}

/** First module route that surfaces a collection — used for drilldown links. */
export function pathForCollection(key: CollectionKey): string | undefined {
  for (const [path, def] of Object.entries(MODULES)) {
    if (def.collection === key && !def.preset) return path;
  }
  for (const [path, def] of Object.entries(MODULES)) if (def.collection === key) return path;
  return undefined;
}

export function timeOf(row: Row): string {
  for (const k of TIME_KEYS) {
    const v = row[k];
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  }
  return "";
}

export function titleOf(rows: Row[], row: Row): string {
  const key = pickTitleKey(inferFields(rows.length ? rows : [row]));
  return String(row[key] ?? row.id);
}

function identities(row: Row) {
  const ids = new Set<string>([row.id]);
  for (const k of LINK_KEYS) {
    const v = row[k];
    if (typeof v === "string") ids.add(v);
  }
  return ids;
}

export interface RelatedGroup {
  collection: CollectionKey;
  label: string;
  path: string | undefined;
  rows: Row[];
}

/** All records across every collection that reference this record. */
export function relatedGroups(source: CollectionKey, row: Row): RelatedGroup[] {
  const ids = identities(row);
  const out: RelatedGroup[] = [];
  const data = snapshot();
  for (const key of COLLECTION_KEYS) {
    if (key === source) continue;
    const rows = data[key].filter((r) => {
      for (const k of LINK_KEYS) {
        const v = r[k];
        if (typeof v === "string" && ids.has(v)) return true;
      }
      return false;
    });
    if (rows.length) {
      out.push({ collection: key, label: collectionLabel(key), path: pathForCollection(key), rows: rows.slice(0, 50) });
    }
  }
  return out.sort((a, b) => b.rows.length - a.rows.length);
}

export interface ActivityEntry {
  id: string;
  at: string;
  collection: CollectionKey;
  module: string;
  title: string;
  detail: string;
  status: string;
  path: string | undefined;
  recordId: string;
}

/** Cross-module activity feed for one entity (member, lead, trainer, …). */
export function activityFeed(source: CollectionKey, row: Row, limit = 60): ActivityEntry[] {
  const groups = relatedGroups(source, row);
  const entries: ActivityEntry[] = [];
  for (const g of groups) {
    for (const r of g.rows) {
      const fields = inferFields(g.rows);
      const titleKey = pickTitleKey(fields);
      const status = String(r["status"] ?? r["stage"] ?? r["outcome"] ?? "");
      const detailKey = ["summary", "notes", "feedback", "subject", "title", "service", "planName", "template"].find(
        (k) => typeof r[k] === "string",
      );
      entries.push({
        id: `${g.collection}-${r.id}`,
        at: timeOf(r),
        collection: g.collection,
        module: g.label,
        title: String(r[titleKey] ?? r.id),
        detail: detailKey ? String(r[detailKey]) : "",
        status,
        path: g.path,
        recordId: r.id,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
