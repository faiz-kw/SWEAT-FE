import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Download, ArrowUpRight, Calendar, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column, type FilterDef } from "@/components/enterprise/DataTable";
import { KpiTile, PageBody, PageHeader } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/contexts";
import { findNavItem } from "@/lib/nav";
import { formatCell, plainValue, sortValue } from "@/modules/cells";
import { RecordDetail } from "@/modules/RecordDetail";
import { RecordForm } from "@/modules/RecordForm";
import { moduleDef } from "@/modules/registry";
import { collectionLabel } from "@/modules/related";
import { inferFields, pickStatusKey } from "@/modules/schema";
import { useModuleNavigate, useModuleSearch } from "@/modules/navigate";
import {
  createRecord,
  deleteRecords,
  updateRecord,
  useCollection,
  type Row,
} from "@/services/store";
import { CashFlowReportPanel, type ReportFilters } from "@/components/commerce/CashFlowReportPanel";
import { fetchInvoices, fetchLeads, fetchMembers } from "@/api/endpoints/api-modules";

const PRIMARY_COLUMNS = 8;

const EMPTY_REPORT_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  branchIds: [],
  programIds: [],
  packageIds: [],
  salesUserIds: [],
  trainerIds: [],
};

function extractRowDateISO(r: Row): string {
  const raw =
    r["issuedAt"] ??
    r["issued_at"] ??
    r["joinedAt"] ??
    r["joining_date"] ??
    r["joined_at"] ??
    r["date"] ??
    r["assessment_date"] ??
    r["submitted_at"] ??
    r["createdAt"] ??
    r["created_at"] ??
    r["paidAt"] ??
    r["paid_at"] ??
    "";
  const str = String(raw || "").trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}

/**
 * Generic, schema-driven module workspace: filters, stage drilldown, record
 * detail with cross-module timeline, and full CRUD — for every collection.
 */
export function CrudModule({ path }: { path: string }) {
  const def = moduleDef(path);
  const nav = findNavItem(path);
  const { locationId } = useApp();
  const search = useModuleSearch();
  const go = useModuleNavigate();

  const isReportPage = path.startsWith("/reports/");
  const isCashFlowPanelReport =
    path === "/reports/financial" || path === "/reports/business" || path === "/reports/sales";

  const [reportFilters, setReportFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);

  React.useEffect(() => {
    setReportFilters(EMPTY_REPORT_FILTERS);
  }, [path]);

  const hasActiveReportFilters =
    isReportPage &&
    (Boolean(reportFilters.dateFrom) ||
      Boolean(reportFilters.dateTo) ||
      reportFilters.branchIds.length > 0 ||
      reportFilters.programIds.length > 0 ||
      reportFilters.packageIds.length > 0 ||
      reportFilters.salesUserIds.length > 0 ||
      reportFilters.trainerIds.length > 0);

  const collectionKey = def?.collection ?? "members";
  const storeRows = useCollection(collectionKey, locationId);

  const { data: filteredBackendRows } = useQuery({
    queryKey: [
      "report-filtered-collection",
      collectionKey,
      locationId,
      reportFilters.dateFrom,
      reportFilters.dateTo,
      reportFilters.branchIds,
      reportFilters.programIds,
      reportFilters.packageIds,
      reportFilters.salesUserIds,
      reportFilters.trainerIds,
    ],
    queryFn: async () => {
      const queryOpts = { ...reportFilters, pageSize: 1000 };
      if (collectionKey === "invoices") return fetchInvoices(locationId, queryOpts);
      if (collectionKey === "leads") return fetchLeads(locationId, queryOpts);
      if (collectionKey === "members") return fetchMembers(locationId, queryOpts);
      return null;
    },
    enabled:
      isReportPage &&
      (collectionKey === "invoices" || collectionKey === "leads" || collectionKey === "members"),
  });

  const all = React.useMemo(() => {
    if (isReportPage && Array.isArray(filteredBackendRows)) {
      return filteredBackendRows;
    }
    return storeRows;
  }, [isReportPage, filteredBackendRows, storeRows]);

  const entity = nav?.label ?? collectionLabel(collectionKey);

  const fields = React.useMemo(
    () => inferFields(all.length > 0 ? all : storeRows, collectionKey),
    [all, storeRows, collectionKey],
  );
  const statusKey = React.useMemo(() => pickStatusKey(fields), [fields]);

  const presetRows = React.useMemo(() => {
    let base = def?.preset ? all.filter(def.preset.test) : all;
    if (!isReportPage) return base;

    if (reportFilters.branchIds.length > 0) {
      base = base.filter((r) => {
        const bId = String(r["locationId"] ?? r["branch"] ?? r["preferred_branch"] ?? "");
        return !bId || reportFilters.branchIds.includes(bId);
      });
    }

    if (reportFilters.dateFrom || reportFilters.dateTo) {
      base = base.filter((r) => {
        const rowDate = extractRowDateISO(r);
        if (!rowDate) return true;
        if (reportFilters.dateFrom && rowDate < reportFilters.dateFrom) return false;
        if (reportFilters.dateTo && rowDate > reportFilters.dateTo) return false;
        return true;
      });
    }

    return base;
  }, [all, def, isReportPage, reportFilters]);

  const stage = search["stage"];
  const focus = search["focus"];

  const rows = React.useMemo(() => {
    let out = presetRows;
    if (stage && statusKey) out = out.filter((r) => String(r[statusKey] ?? "") === stage);
    if (focus) {
      const hit = out.filter(
        (r) =>
          r.id === focus ||
          r["memberId"] === focus ||
          r["leadId"] === focus ||
          r["trainerId"] === focus ||
          r["relatedId"] === focus,
      );
      if (hit.length) out = hit;
    }
    return out;
  }, [presetRows, stage, statusKey, focus]);

  const applyReportDatePreset = (preset: "all" | "this_month" | "last_3m" | "last_6m" | "this_year") => {
    if (preset === "all") {
      setReportFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
      return;
    }
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    if (preset === "this_month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;
      setReportFilters((prev) => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
    } else if (preset === "last_3m") {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;
      setReportFilters((prev) => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
    } else if (preset === "last_6m") {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;
      setReportFilters((prev) => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
    } else if (preset === "this_year") {
      setReportFilters((prev) => ({ ...prev, dateFrom: `${now.getFullYear()}-01-01`, dateTo: toStr }));
    }
  };

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | undefined>(undefined);

  // Quick action from the section overview: ?create=1 opens the new-record form.
  React.useEffect(() => {
    if (search["create"]) {
      setEditing(undefined);
      setFormOpen(true);
    }
  }, [search]);
  const [detailId, setDetailId] = React.useState<string | undefined>(undefined);
  const detailRow = rows.find((r) => r.id === detailId) ?? presetRows.find((r) => r.id === detailId);

  const columns: Column<Row>[] = React.useMemo(
    () =>
      fields.map((f, i) => ({
        key: f.key,
        header: f.label,
        align: f.type === "currency" || f.type === "number" || f.type === "percent" ? "right" : "left",
        render: (row: Row) => formatCell(f, row[f.key]),
        sortValue: (row: Row) => sortValue(f, row[f.key]),
        value: (row: Row) => plainValue(f, row[f.key]),
        hideByDefault: i >= PRIMARY_COLUMNS,
      })),
    [fields],
  );

  const filters: FilterDef<Row>[] = React.useMemo(
    () =>
      fields
        .filter((f) => f.type === "enum" && (f.options?.length ?? 0) > 1)
        .slice(0, 5)
        .map((f) => ({
          key: f.key,
          label: f.label,
          options: f.options ?? [],
          match: (row: Row, value: string) => String(row[f.key] ?? "") === value,
        })),
    [fields],
  );

  const statusCounts = React.useMemo(() => {
    if (!statusKey) return [];
    const map = new Map<string, number>();
    for (const r of presetRows) {
      const v = String(r[statusKey] ?? "—");
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [presetRows, statusKey]);

  const searchKeys = React.useCallback(
    (row: Row) =>
      fields
        .slice(0, 12)
        .map((f) => String(row[f.key] ?? ""))
        .join(" "),
    [fields],
  );

  if (!def) {
    return (
      <>
        <PageHeader title={nav?.label ?? path} subtitle="Module not mapped to a dataset yet." />
      </>
    );
  }

  const singularEntity = entity
    .replace(/^All\s+/i, "")
    .replace(/ies$/i, "y")
    .replace(/es$/i, "")
    .replace(/s$/i, "");

  return (
    <>
      <PageHeader
        title={entity}
        subtitle={def.hint ?? `${nav?.section ?? "Console"} · ${collectionLabel(collectionKey)} records`}
        meta={
          <>
            <span className="text-muted-foreground">
              Showing <span className="num font-semibold text-foreground">{rows.length}</span> of{" "}
              <span className="num">{presetRows.length}</span>
            </span>
            {def.preset && <span className="hidden sm:inline text-muted-foreground">Preset: {def.preset.label}</span>}
            {stage && (
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => go(path, {})}
              >
                Stage: {stage} — clear
              </button>
            )}
            {focus && (
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => go(path, {})}
              >
                Focus: {focus} — clear
              </button>
            )}
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => go(`/overview/${nav?.sectionId ?? "crm"}`)}
              className="hidden xl:inline-flex"
            >
              Overview <ArrowUpRight className="ml-1 size-3.5" />
            </Button>
            {!path.startsWith("/reports/") && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1 size-3.5" /> New {singularEntity.toLowerCase()}
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        {isCashFlowPanelReport ? (
          <CashFlowReportPanel
            defaultTab={
              path === "/reports/financial"
                ? "cash_flow"
                : path === "/reports/business"
                ? "branches_programs"
                : "sales_trainers"
            }
            onFiltersChange={setReportFilters}
          />
        ) : (
          <>
            {isReportPage && (
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Calendar className="size-3.5 text-primary" />
                    <span>From:</span>
                    <Input
                      type="date"
                      value={reportFilters.dateFrom}
                      onChange={(e) =>
                        setReportFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                      className="h-8 w-36 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span>To:</span>
                    <Input
                      type="date"
                      value={reportFilters.dateTo}
                      onChange={(e) =>
                        setReportFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                      }
                      className="h-8 w-36 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 border-l border-border pl-2">
                    {[
                      { id: "all", label: "All Time" },
                      { id: "this_month", label: "This Month" },
                      { id: "last_3m", label: "3M" },
                      { id: "last_6m", label: "6M" },
                      { id: "this_year", label: "This Year" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyReportDatePreset(p.id as any)}
                        className="px-2 py-1 rounded text-[11px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {hasActiveReportFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportFilters(EMPTY_REPORT_FILTERS)}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  >
                    <RotateCcw className="size-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            )}
            {statusCounts.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiTile label="Total records" value={presetRows.length} hint="In current scope" />
                {statusCounts.map(([label, count]) => (
                  <button key={label} className="text-left" onClick={() => go(path, { stage: label })}>
                    <KpiTile label={label} value={count} hint="Click to drill down" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="rounded-md border border-border bg-surface">
          <DataTable<Row>
            rows={rows}
            columns={columns}
            getId={(r) => r.id}
            searchKeys={searchKeys}
            filters={filters}
            exportName={collectionKey}
            emptyLabel="No records match the current filters."
            onRowClick={(r) => setDetailId(r.id)}
            bulkActions={[
              { label: "Export selected", icon: Download },
              { label: "Delete", icon: Trash2, destructive: true },
            ]}
            onBulkAction={(label, ids) => {
              if (label === "Delete") {
                deleteRecords(collectionKey, ids);
                toast.success(`${ids.length} record(s) deleted`);
              } else {
                const selectedRows = rows.filter((r) => ids.includes(r.id));
                const head = columns.map((c) => c.header).join(",");
                const body = selectedRows
                  .map((r) =>
                    columns
                      .map((c) => {
                        const v = c.value ? c.value(r) : (r[c.key] ?? "");
                        return `"${String(v).replace(/"/g, '""')}"`;
                      })
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${collectionKey}-selected.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported ${ids.length} record(s)`, { description: `${collectionKey}-selected.csv` });
              }
            }}
          />
        </div>
      </PageBody>

      <RecordForm
        open={formOpen}
        onOpenChange={setFormOpen}
        fields={fields}
        row={editing}
        entity={singularEntity}
        onSubmit={(values) => {
          if (editing) {
            updateRecord(collectionKey, editing.id, values);
            toast.success("Record updated");
          } else {
            const created = createRecord(collectionKey, values);
            toast.success(`Record ${created.id} created`);
          }
        }}
      />

      <RecordDetail
        open={Boolean(detailId)}
        onOpenChange={(v) => !v && setDetailId(undefined)}
        collection={collectionKey}
        fields={fields}
        row={detailRow}
        entity={singularEntity}
        onEdit={() => {
          setEditing(detailRow);
          setDetailId(undefined);
          setFormOpen(true);
        }}
        onDelete={() => {
          if (detailRow) {
            deleteRecords(collectionKey, [detailRow.id]);
            toast.success("Record deleted");
          }
          setDetailId(undefined);
        }}
      />
    </>
  );
}
