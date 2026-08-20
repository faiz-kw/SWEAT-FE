import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONE_MAP: Record<string, Tone> = {
  // generic
  active: "success",
  paid: "success",
  connected: "success",
  completed: "success",
  converted: "success",
  approved: "success",
  resolved: "success",
  won: "success",
  delivered: "success",
  read: "success",
  attended: "success",
  confirmed: "info",
  "in stock": "success",
  published: "success",
  granted: "success",
  available: "success",
  running: "success",
  low: "success",

  scheduled: "info",
  queued: "info",
  pending: "warning",
  "pending approval": "warning",
  "in progress": "info",
  processing: "info",
  draft: "neutral",
  new: "info",
  contacted: "info",
  qualified: "info",
  "trial booked": "accent",
  "trial attended": "accent",
  "offer sent": "accent",
  negotiation: "warning",
  waitlist: "warning",
  expiring: "warning",
  "review due": "warning",
  frozen: "info",
  paused: "neutral",
  invited: "info",
  medium: "warning",
  "partially paid": "warning",
  "low stock": "warning",
  trial: "info",
  escalated: "danger",
  overdue: "danger",
  lost: "danger",
  lapsed: "danger",
  cancelled: "neutral",
  "no show": "danger",
  failed: "danger",
  error: "danger",
  suspended: "danger",
  churned: "danger",
  rejected: "danger",
  critical: "danger",
  high: "danger",
  "out of stock": "danger",
  refunded: "neutral",
  disabled: "neutral",
  bounced: "danger",
  "not connected": "neutral",
  "not interested": "danger",
  interested: "success",
  callback: "warning",
  declined: "danger",
  "not recorded": "neutral",
  open: "info",
  done: "success",
  closed: "neutral",
  inactive: "neutral",
  "on leave": "warning",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  accent: "bg-accent text-accent-foreground border-primary/25",
};

export function StatusBadge({
  value,
  tone,
  dot = true,
  className,
}: {
  value: string;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const resolved = tone ?? TONE_MAP[value.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4",
        TONE_CLASS[resolved],
        className,
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />}
      {value}
    </span>
  );
}

export function ScoreBar({ value, label }: { value: number; label?: string }) {
  const tone = value >= 70 ? "bg-success" : value >= 45 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="num text-xs text-muted-foreground">{label ?? value}</span>
    </div>
  );
}
