import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Search,
  SlidersHorizontal,
  X,
  Inbox,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  sortValue?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => string | number;
  hideByDefault?: boolean;
  sticky?: boolean;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: string[];
  match: (row: T, value: string) => boolean;
}

export interface BulkAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  getId,
  searchKeys,
  filters = [],
  bulkActions = [],
  onBulkAction,
  onRowClick,
  rowActions,
  toolbar,
  pageSize = 25,
  emptyLabel = "No records match the current filters.",
  exportName = "export",
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  searchKeys?: (row: T) => string;
  filters?: FilterDef<T>[];
  bulkActions?: BulkAction[];
  onBulkAction?: (label: string, ids: string[]) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  toolbar?: React.ReactNode;
  pageSize?: number;
  emptyLabel?: string;
  exportName?: string;
  dense?: boolean;
}) {

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [active, setActive] = React.useState<Record<string, string>>({});
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(pageSize);
  const [hidden, setHidden] = React.useState<Set<string>>(
    new Set(columns.filter((c) => c.hideByDefault).map((c) => c.key)),
  );

  const visible = columns.filter((c) => !hidden.has(c.key));

  const filtered = React.useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchKeys) out = out.filter((r) => searchKeys(r).toLowerCase().includes(q));
    for (const f of filters) {
      const v = active[f.key];
      if (v && v !== "all") out = out.filter((r) => f.match(r, v));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const get = col.sortValue ?? col.value ?? ((r: T) => String((r as Record<string, unknown>)[col.key] ?? ""));
        out = [...out].sort((a, b) => {
          const av = get(a);
          const bv = get(b);
          const res = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? res : -res;
        });
      }
    }
    return out;
  }, [rows, query, active, sort, filters, columns, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const pageRows = filtered.slice((current - 1) * size, current * size);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(getId(r)));
  const activeFilterCount = Object.values(active).filter((v) => v && v !== "all").length;

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const cols = visible;
    const head = cols.map((c) => c.header).join(",");
    const body = filtered
      .map((r) =>
        cols
          .map((c) => {
            const v = c.value ? c.value(r) : ((r as Record<string, unknown>)[c.key] ?? "");
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`, { description: `${exportName}.csv` });
  }

  return (
    <div className="flex min-h-0 flex-col rounded-md border border-border bg-surface">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2.5 py-2">
        {/* search — grows to fill available space */}
        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="h-8 pl-7 text-[13px] w-full"
          />
        </div>

        {/* filters — hidden on mobile, shown sm+ inline; on mobile use the dropdown */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <Select
              key={f.key}
              value={active[f.key] ?? "all"}
              onValueChange={(v) => {
                setActive((p) => ({ ...p, [f.key]: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[7.5rem] gap-1 text-[13px]">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.label}: All</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setActive({})}>
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* mobile filters dropdown */}
        {filters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "sm:hidden h-8 px-2 text-xs",
                  activeFilterCount > 0 && "border-primary text-primary",
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-xs">Filter by</DropdownMenuLabel>
              {filters.map((f) => (
                <div key={f.key} className="px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{f.label}</p>
                  <Select
                    value={active[f.key] ?? "all"}
                    onValueChange={(v) => {
                      setActive((p) => ({ ...p, [f.key]: v }));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-full text-[12px]">
                      <SelectValue placeholder={`All ${f.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {f.options.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {activeFilterCount > 0 && (
                <div className="px-2 pb-1.5">
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setActive({})}>
                    <X className="size-3.5" /> Clear all
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* right-side toolbar actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                <Columns3 className="size-3.5" />
                <span className="hidden sm:inline ml-1">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Visible columns</DropdownMenuLabel>
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.has(c.key)}
                  onCheckedChange={(v) =>
                    setHidden((prev) => {
                      const next = new Set(prev);
                      if (v) next.delete(c.key);
                      else next.add(c.key);
                      return next;
                    })
                  }
                  className="text-xs"
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={exportCsv}>
            <Download className="size-3.5" />
            <span className="hidden sm:inline ml-1">Export</span>
          </Button>
        </div>
      </div>

      {/* bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/60 px-2.5 py-1.5">
          <span className="num text-xs font-medium text-accent-foreground">{selected.size} selected</span>
          {bulkActions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.destructive ? "destructive" : "outline"}
              className="h-7 bg-surface px-2 text-xs"
              onClick={() => {
                const ids = [...selected];
                if (onBulkAction) onBulkAction(a.label, ids);
                else
                  toast.success(`${a.label} · ${ids.length} record(s)`, {
                    description: "Queued as a bulk operation.",
                  });
                setSelected(new Set());
              }}

            >
              {a.icon && <a.icon className="size-3.5" />}
              {a.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* table */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[600px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
            <tr className="border-b border-border">
              {bulkActions.length > 0 && (
                <th className="w-8 px-2 py-1.5">
                  <Checkbox
                    checked={allOnPage}
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        pageRows.forEach((r) => (v ? next.add(getId(r)) : next.delete(getId(r))));
                        return next;
                      });
                    }}
                    className="size-3.5"
                    aria-label="Select all rows on page"
                  />
                </th>
              )}
              {visible.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    "select-none whitespace-nowrap border-r border-border/60 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    (c.sortValue || c.value) && "cursor-pointer hover:text-foreground",
                  )}
                  onClick={() => {
                    if (!c.sortValue && !c.value) return;
                    setSort((prev) =>
                      prev?.key === c.key
                        ? { key: c.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                        : { key: c.key, dir: "asc" },
                    );
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {sort?.key === c.key &&
                      (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </span>
                </th>
              ))}
              {rowActions && <th className="w-10 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const id = getId(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "group border-b border-border/70 last:border-b-0 hover:bg-accent/40",
                    onRowClick && "cursor-pointer",
                    selected.has(id) && "bg-accent/50",
                  )}
                  style={{ height: dense ? undefined : "var(--row-h)" }}
                >
                  {bulkActions.length > 0 && (
                    <td className="px-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(id)}
                        onCheckedChange={() => toggleRow(id)}
                        className="size-3.5"
                        aria-label={`Select ${id}`}
                      />
                    </td>
                  )}
                  {visible.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-2.5 align-middle",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                      )}
                      style={{ paddingTop: "var(--cell-py)", paddingBottom: "var(--cell-py)" }}
                    >
                      {c.render
                        ? c.render(row)
                        : String(
                            (c.value ? c.value(row) : (row as Record<string, unknown>)[c.key]) ?? "—",
                          )}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-1 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={visible.length + (bulkActions.length ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500/15 via-emerald-500/10 to-primary/20 text-primary border border-primary/20 shadow-xs">
                      <Inbox className="size-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">No records found</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {emptyLabel || "No records match the current filter criteria or location scope."}
                      </p>
                    </div>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => setActive({})}
                      >
                        <X className="size-3.5" /> Clear Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground">
        <span className="num shrink-0">
          {filtered.length === 0 ? 0 : (current - 1) * size + 1}–{Math.min(current * size, filtered.length)}{" "}
          <span className="hidden xs:inline">of {filtered.length}</span>
        </span>
        <span className="hidden lg:inline">· {rows.length} total records</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-7 w-[5rem] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / pg
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="num px-1 min-w-[3rem] text-center">
              {current} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
