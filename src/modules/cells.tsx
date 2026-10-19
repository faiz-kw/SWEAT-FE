import { ImageIcon, Video } from "lucide-react";
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
    case "image":
      return (
        <div className="flex items-center gap-2">
          {String(value).startsWith("data:") || String(value).startsWith("http") ? (
            <img
              src={String(value)}
              alt=""
              className="h-6 w-6 rounded object-cover border border-border"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="truncate max-w-[120px] text-xs text-muted-foreground">
            {String(value).startsWith("data:") ? "Image file" : String(value)}
          </span>
        </div>
      );
    case "video":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
          <Video className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">
            {String(value).startsWith("data:") ? "Video file" : String(value)}
          </span>
        </span>
      );
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
