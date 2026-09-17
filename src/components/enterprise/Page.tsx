import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  meta,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const effectiveSubtitle = subtitle || description;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 bg-surface/60 backdrop-blur-md px-5 py-4">
      <div className="min-w-0">
        <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-foreground">{title}</h1>
        {effectiveSubtitle && <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{effectiveSubtitle}</p>}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 space-y-5 p-4 sm:p-5", className)}>{children}</div>;
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card shadow-xs backdrop-blur-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 bg-muted/20 rounded-t-xl">
          <div className="min-w-0">
            {title && <h2 className="truncate text-xs sm:text-sm font-bold text-foreground">{title}</h2>}
            {description && <p className="truncate text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-4")}>{children}</div>
    </section>
  );
}

export function KpiTile({
  label,
  title,
  value,
  delta,
  change,
  hint,
  badge,
  tone = "neutral",
  variant,
}: {
  label?: string;
  title?: string;
  value: string | number;
  delta?: string;
  change?: string;
  hint?: string;
  badge?: { text: string; variant?: string };
  tone?: "neutral" | "positive" | "negative" | "warning" | "default" | "warn";
  variant?: "neutral" | "positive" | "negative" | "warning" | "default" | "warn";
}) {
  const effectiveLabel = label || title || "";
  const effectiveDelta = delta || change || (badge ? badge.text : undefined);
  const effectiveTone = variant || tone;

  const isPos = effectiveTone === "positive" || badge?.variant === "success";
  const isNeg = effectiveTone === "negative" || badge?.variant === "danger";
  const isWarn = effectiveTone === "warning" || effectiveTone === "warn" || badge?.variant === "warning";
  const isInfo = badge?.variant === "info";

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-xs hover:border-primary/30 transition-all flex flex-col justify-between min-w-0">
      <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate" title={effectiveLabel}>
        {effectiveLabel}
      </div>
      <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2 min-w-0">
        <span className="num text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
          {value}
        </span>
        {effectiveDelta && (
          <span
            className={cn(
              "num text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md truncate max-w-full",
              isPos && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              isNeg && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              isWarn && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              isInfo && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              !isPos && !isNeg && !isWarn && !isInfo && "bg-muted text-muted-foreground"
            )}
            title={effectiveDelta}
          >
            {effectiveDelta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 truncate text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <dl
      className="grid gap-x-4 gap-y-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </dl>
  );
}

export function Timeline({
  items,
}: {
  items: { at: string; title: string; detail?: string; actor?: string; module?: string }[];
}) {
  return (
    <ol className="relative space-y-3 pl-4">
      <span className="absolute left-[5px] top-1 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden />
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-4 top-1 size-[9px] rounded-full border-2 border-surface bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium">{it.title}</span>
            {it.module && (
              <span className="rounded border border-border bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                {it.module}
              </span>
            )}
          </div>
          {it.detail && <p className="mt-0.5 text-xs text-muted-foreground">{it.detail}</p>}
          <p className="num mt-0.5 text-[11px] text-muted-foreground">
            {it.at}
            {it.actor ? ` · ${it.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function MiniTable({
  head,
  rows,
}: {
  head: string[];
  rows: (React.ReactNode[] | { cells: React.ReactNode[]; onClick?: () => void })[];
}) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-border">
          {head.map((h, i) => (
            <th
              key={h}
              className={cn(
                "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                i > 0 && i === head.length - 1 && "text-right",
              )}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const cells = Array.isArray(r) ? r : r.cells;
          const onClick = Array.isArray(r) ? undefined : r.onClick;
          return (
            <tr
              key={i}
              onClick={onClick}
              className={cn("border-b border-border/60 last:border-0", onClick && "cursor-pointer hover:bg-accent/40")}
            >
              {cells.map((c, j) => (
                <td
                  key={j}
                  className={cn("px-2 py-1.5 align-middle", j > 0 && j === cells.length - 1 && "text-right")}
                >
                  {c}
                </td>
              ))}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={head.length} className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing to show.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
