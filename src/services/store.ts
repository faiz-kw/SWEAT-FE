import * as React from "react";

import { getAiDataset } from "@/data/ai-seed";
import { TENANT_ID, getDataset } from "@/data/seed";

/**
 * Mutable in-memory store on top of the deterministic demo dataset.
 * Every module reads/writes through here, so CRUD in one module is visible in
 * the overview grids, timelines and lifecycle view immediately. Swapping this
 * for API calls later does not touch UI code.
 */

export type Row = Record<string, unknown> & { id: string };
export type CollectionKey = keyof Collections;

export interface Collections {
  tenants: Row[];
  locations: Row[];
  users: Row[];
  trainers: Row[];
  services: Row[];
  plans: Row[];
  members: Row[];
  leads: Row[];
  calls: Row[];
  trials: Row[];
  offers: Row[];
  coupons: Row[];
  classes: Row[];
  bookings: Row[];
  assessments: Row[];
  exercises: Row[];
  programs: Row[];
  nutritionPlans: Row[];
  products: Row[];
  invoices: Row[];
  complaints: Row[];
  campaigns: Row[];
  communications: Row[];
  workflows: Row[];
  approvals: Row[];
  auditLogs: Row[];
  integrations: Row[];
  tasks: Row[];
  aiCoachPlans: Row[];
  copilotInsights: Row[];
  biInsights: Row[];
  visionAnalyses: Row[];
  liveSessions: Row[];
  groupTracking: Row[];
  coaches: Row[];
  mlModels: Row[];
  supportTickets: Row[];
}

const ID_PREFIX: Partial<Record<CollectionKey, string>> = {
  members: "MEM",
  leads: "LEAD",
  calls: "CALL",
  trials: "TRL",
  invoices: "INV",
  bookings: "BKG",
  supportTickets: "TKT",
  aiCoachPlans: "AIC",
  copilotInsights: "CPI",
  biInsights: "BIQ",
  visionAnalyses: "CV",
  liveSessions: "LIVE",
  groupTracking: "GCT",
  coaches: "CCH",
  mlModels: "MDL",
};

let data: Collections | null = null;
const listeners = new Set<() => void>();
let version = 0;

function build(): Collections {
  const d = getDataset() as unknown as Record<string, Row[]>;
  const ai = getAiDataset() as unknown as Record<string, Row[]>;
  const next = {} as Record<string, Row[]>;
  for (const [k, v] of Object.entries({ ...d, ...ai })) next[k] = v.map((r) => ({ ...r }));
  const c = next as unknown as Collections;
  linkLifecycle(c);
  return c;
}

/** Guarantees the Rahul Sharma demo journey has records in every module. */
function linkLifecycle(c: Collections) {
  const attach = (key: CollectionKey, count: number, patch: Record<string, unknown>) => {
    const rows = c[key];
    let done = 0;
    for (const row of rows) {
      if (row["memberId"] === "MEM-0001") done += 1;
    }
    for (const row of rows) {
      if (done >= count) break;
      if (row["memberId"] && row["memberId"] !== "MEM-0001") {
        Object.assign(row, { memberId: "MEM-0001", member: "Rahul Sharma", ...patch });
        done += 1;
      }
    }
  };
  attach("bookings", 3, {});
  attach("invoices", 2, {});
  attach("nutritionPlans", 1, {});
  attach("supportTickets", 1, {});
  attach("visionAnalyses", 2, {});
  const prog = c.programs[0];
  if (prog) Object.assign(prog, { status: "Published" });
}

export function getCollections(): Collections {
  if (!data) data = build();
  return data;
}

export function collection(key: CollectionKey): Row[] {
  return getCollections()[key];
}

/** Read-only view of every collection — used by cross-module timelines. */
export function snapshot(): Collections {
  return getCollections();
}

export const COLLECTION_KEYS = Object.keys(getCollections()) as CollectionKey[];


function emit() {
  version += 1;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function nextId(key: CollectionKey) {
  const rows = collection(key);
  const prefix = ID_PREFIX[key] ?? key.slice(0, 3).toUpperCase();
  const width = key === "members" || key === "leads" ? 4 : 3;
  let max = 0;
  for (const r of rows) {
    const n = Number(String(r.id).replace(/\D+/g, ""));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

export function createRecord(key: CollectionKey, values: Record<string, unknown>) {
  const rows = collection(key);
  const row: Row = { tenantId: TENANT_ID, ...values, id: nextId(key) };
  rows.unshift(row);
  emit();
  return row;
}

export function updateRecord(key: CollectionKey, id: string, values: Record<string, unknown>) {
  const rows = collection(key);
  const row = rows.find((r) => r.id === id);
  if (row) Object.assign(row, values);
  emit();
  return row;
}

export function deleteRecords(key: CollectionKey, ids: string[]) {
  const rows = collection(key);
  const set = new Set(ids);
  for (let i = rows.length - 1; i >= 0; i--) if (set.has(rows[i]!.id)) rows.splice(i, 1);
  emit();
}

/** Reactive read of one collection, scoped by tenant + location. */
export function useCollection(key: CollectionKey, locationId?: string): Row[] {
  const v = React.useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  return React.useMemo(() => {
    void v;
    return collection(key).filter(
      (r) =>
        (r["tenantId"] === undefined || r["tenantId"] === TENANT_ID || key === "tenants") &&
        (!locationId || locationId === "all" || r["locationId"] === undefined || r["locationId"] === locationId),
    );
  }, [key, locationId, v]);
}

/** Reactive store version — use to re-render derived/aggregate views. */
export function useStoreVersion() {
  return React.useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
