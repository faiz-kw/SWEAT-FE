import * as React from "react";
import { Plus, Trash2, Download, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column, type FilterDef } from "@/components/enterprise/DataTable";
import { KpiTile, PageBody, PageHeader } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
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

const PRIMARY_COLUMNS = 8;

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

  const collectionKey = def?.collection ?? "members";
  const all = useCollection(collectionKey, locationId);
  const entity = nav?.label ?? collectionLabel(collectionKey);

  const fields = React.useMemo(() => inferFields(all), [all]);
  const statusKey = React.useMemo(() => pickStatusKey(fields), [fields]);

  const presetRows = React.useMemo(
    () => (def?.preset ? all.filter(def.preset.test) : all),
    [all, def],
  );

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

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | undefined>(undefined);
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
            {def.preset && <span className="text-muted-foreground">Preset: {def.preset.label}</span>}
            {stage && (
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => go(path, {})}
              >
                Stage filter: {stage} — clear
              </button>
            )}
            {focus && (
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => go(path, {})}
              >
                Focused on {focus} — clear
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
              className="hidden lg:inline-flex"
            >
              Section overview <ArrowUpRight className="ml-1 size-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1 size-3.5" /> New record
            </Button>
          </>
        }
      />

      <PageBody>
        {statusCounts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Total records" value={presetRows.length} hint="In current scope" />
            {statusCounts.map(([label, count]) => (
              <button key={label} className="text-left" onClick={() => go(path, { stage: label })}>
                <KpiTile label={label} value={count} hint="Click to drill down" />
              </button>
            ))}
          </div>
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
                toast.success(`${ids.length} record(s) exported`);
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
        entity={entity.replace(/s$/, "")}
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
        entity={entity.replace(/s$/, "")}
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
