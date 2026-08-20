import * as React from "react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";

import { Field as FieldRow, FieldGrid, MiniTable, Section, Timeline } from "@/components/enterprise/Page";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { dateTime } from "@/components/enterprise/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCell } from "@/modules/cells";
import { useModuleNavigate } from "@/modules/navigate";
import { activityFeed, relatedGroups, timeOf } from "@/modules/related";
import { inferFields, pickStatusKey, pickTitleKey, type Field } from "@/modules/schema";
import type { CollectionKey, Row } from "@/services/store";

/**
 * Record drilldown: full field detail, every linked record across modules, and
 * a cross-module activity timeline with jump-to-module links.
 */
export function RecordDetail({
  open,
  onOpenChange,
  collection,
  fields,
  row,
  entity,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection: CollectionKey;
  fields: Field[];
  row: Row | undefined;
  entity: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const go = useModuleNavigate();
  const titleKey = pickTitleKey(fields);
  const statusKey = pickStatusKey(fields);

  const groups = React.useMemo(() => (row ? relatedGroups(collection, row) : []), [collection, row]);
  const feed = React.useMemo(() => (row ? activityFeed(collection, row) : []), [collection, row]);

  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[720px]">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-[15px]">{String(row[titleKey] ?? row.id)}</SheetTitle>
              <SheetDescription className="num text-xs">
                {entity} · {row.id}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {statusKey && <StatusBadge value={String(row[statusKey] ?? "—")} />}
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="detail" className="flex-1">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="detail" className="text-xs">
              Record
            </TabsTrigger>
            <TabsTrigger value="linked" className="text-xs">
              Linked ({groups.reduce((s, g) => s + g.rows.length, 0)})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              Activity ({feed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="space-y-3 p-4">
            <Section title="All fields">
              <FieldGrid cols={2}>
                {fields.map((f) => (
                  <FieldRow key={f.key} label={f.label} value={formatCell(f, row[f.key])} />
                ))}
              </FieldGrid>
            </Section>
          </TabsContent>

          <TabsContent value="linked" className="space-y-3 p-4">
            {groups.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No linked records in other modules yet.
              </p>
            )}
            {groups.map((g) => {
              const gFields = inferFields(g.rows);
              const gTitle = pickTitleKey(gFields);
              const gStatus = pickStatusKey(gFields);
              return (
                <Section
                  key={g.collection}
                  title={g.label}
                  description={`${g.rows.length} linked record(s)`}
                  padded={false}
                  actions={
                    g.path ? (
                      <Button size="sm" variant="ghost" onClick={() => go(g.path!, { focus: row.id })}>
                        Open module <ArrowUpRight className="ml-1 size-3.5" />
                      </Button>
                    ) : null
                  }
                >
                  <div className="px-2 pb-1">
                    <MiniTable
                      head={["Record", "When", "Status"]}
                      rows={g.rows.slice(0, 8).map((r) => ({
                        cells: [
                          <span key="t" className="font-medium">
                            {String(r[gTitle] ?? r.id)}
                          </span>,
                          <span key="w" className="num text-xs text-muted-foreground">
                            {timeOf(r) ? dateTime(timeOf(r)) : "—"}
                          </span>,
                          gStatus ? <StatusBadge key="s" value={String(r[gStatus] ?? "—")} /> : "—",
                        ],
                        ...(g.path ? { onClick: () => go(g.path!, { focus: r.id }) } : {}),
                      }))}
                    />
                  </div>
                </Section>
              );
            })}
          </TabsContent>

          <TabsContent value="timeline" className="p-4">
            <Section title="Cross-module activity">
              <Timeline
                items={feed.map((e) => ({
                  at: e.at ? dateTime(e.at) : "—",
                  title: e.title,
                  detail: [e.status, e.detail].filter(Boolean).join(" · "),
                  module: e.module,
                  actor: e.recordId,
                }))}
              />
            </Section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
