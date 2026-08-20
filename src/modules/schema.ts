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
const HIDDEN = /^(tenantId)$/;

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

/** Derives the editable/displayable field schema for a collection from its rows. */
export function inferFields(rows: Row[]): Field[] {
  if (rows.length === 0) return [];
  const keys: string[] = [];
  for (const r of rows.slice(0, 40)) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);

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
        if (k !== "id" && distinct.length <= 12 && distinct.length < Math.max(3, rows.length / 2)) {
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
