import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 space-y-3 p-4", className)}>{children}</div>;
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
    <section className={cn("rounded-md border border-border bg-surface", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13px] font-semibold">{title}</h2>}
            {description && <p className="truncate text-[11px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-3")}>{children}</div>
    </section>
  );
}

export function KpiTile({
  label,
  value,
  delta,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const deltaTone =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning-foreground"
          : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="num text-xl font-semibold tracking-tight text-foreground">{value}</span>
        {delta && <span className={cn("num text-[11px] font-medium", deltaTone)}>{delta}</span>}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium">{value ?? "—"}</dd>
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
