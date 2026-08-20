import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { dateTime, inr, shortDate } from "@/components/enterprise/format";
import type { Field } from "@/modules/schema";

const STATUSY = /^(status|stage|priority|riskLevel|riskFlag|outcome|intent|consent|humanReview|slaBreached)$/;

export function formatCell(field: Field, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (Array.isArray(value)) return value.join(", ");

  switch (field.type) {
    case "currency":
      return <span className="num">{inr(Number(value))}</span>;
    case "percent":
      return <span className="num">{Number(value)}%</span>;
    case "number":
      return <span className="num">{Number(value).toLocaleString("en-IN")}</span>;
    case "date":
      return <span className="num">{shortDate(String(value))}</span>;
    case "datetime":
      return <span className="num">{dateTime(String(value))}</span>;
    case "boolean":
      return <StatusBadge value={value ? "Yes" : "No"} />;
    case "enum":
      return STATUSY.test(field.key) ? <StatusBadge value={String(value)} /> : String(value);
    default:
      return String(value);
  }
}

export function sortValue(field: Field, value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value);
}

export function plainValue(field: Field, value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(" | ");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}
