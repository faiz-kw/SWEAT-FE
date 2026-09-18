import * as React from "react";
import { ArrowUpRight, Plus } from "lucide-react";

import { KpiTile, MiniTable, PageBody, PageHeader, Section } from "@/components/enterprise/Page";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { dateTime } from "@/components/enterprise/format";
import { Button } from "@/components/ui/button";
import { NAV, getFilteredNav } from "@/lib/nav";
import { useApp, useAuth } from "@/contexts";
import { useModuleNavigate } from "@/modules/navigate";
import { moduleDef } from "@/modules/registry";
import { timeOf } from "@/modules/related";
import { inferFields, pickStatusKey, pickTitleKey } from "@/modules/schema";
import { snapshot, useStoreVersion, type Row } from "@/services/store";

interface ModuleCard {
  label: string;
  to: string;
  total: number;
  counts: [string, number][];
  statusKey: string | undefined;
  recent: { row: Row; title: string; status: string; at: string }[];
}

function buildCard(label: string, to: string, locationId: string): ModuleCard | null {
  const def = moduleDef(to);
  if (!def) return null;
  const data = snapshot();
  let rows = data[def.collection].filter(
    (r) => !locationId || locationId === "all" || r["locationId"] === undefined || r["locationId"] === locationId,
  );
  if (def.preset) rows = rows.filter(def.preset.test);

  const fields = inferFields(rows);
  const statusKey = pickStatusKey(fields);
  const titleKey = pickTitleKey(fields);

  const map = new Map<string, number>();
  if (statusKey) for (const r of rows) {
    const v = String(r[statusKey] ?? "—");
    map.set(v, (map.get(v) ?? 0) + 1);
  }

  const recent = rows
    .slice()
    .sort((a, b) => timeOf(b).localeCompare(timeOf(a)))
    .slice(0, 4)
    .map((row) => ({
      row,
      title: String(row[titleKey] ?? row.id),
      status: statusKey ? String(row[statusKey] ?? "—") : "",
      at: timeOf(row),
    }));

  return {
    label,
    to,
    total: rows.length,
    counts: [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    statusKey,
    recent,
  };
}

/**
 * Overview grid for a sidebar section: per-module status counts, recent items
 * and quick actions that deep-link into the module with the stage pre-filtered.
 */
export function SectionOverview({ sectionId }: { sectionId: string }) {
  const { locationId } = useApp();
  const { user } = useAuth();
  useStoreVersion();
  const go = useModuleNavigate();

  const isSuperAdmin = !!(user?.isSuperAdmin) || user?.role === "Super Admin";

  const sections = React.useMemo(() => {
    const filtered = getFilteredNav(isSuperAdmin);
    return (sectionId === "all" ? filtered : filtered.filter((s) => s.id === sectionId)).filter(
      (s) => s.id !== "dashboard"
    );
  }, [sectionId, isSuperAdmin]);

  const cards = React.useMemo(
    () =>
      sections.map((s) => ({
        section: s,
        modules: s.items
          .map((i) => buildCard(i.label, i.to, locationId))
          .filter((c): c is ModuleCard => c !== null),
      })),
    [sections, locationId],
  );

  const title = sectionId === "all" ? "Module Overviews" : (sections[0]?.label ?? "Overview");
  const totalRecords = cards.reduce((s, g) => s + g.modules.reduce((t, m) => t + m.total, 0), 0);

  return (
    <>
      <PageHeader
        title={title}
        subtitle="Status counts, recent records and quick actions for every module in scope."
        meta={
          <>
            <span className="text-muted-foreground">
              Modules <span className="num font-semibold text-foreground">{cards.reduce((s, g) => s + g.modules.length, 0)}</span>
            </span>
            <span className="text-muted-foreground">
              Records <span className="num font-semibold text-foreground">{totalRecords.toLocaleString("en-IN")}</span>
            </span>
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => go("/lifecycle")}>
            Member lifecycle <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        }
      />

      <PageBody>
        {cards.map(({ section, modules }) => (
          <section key={section.id} className="space-y-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </h2>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
              {modules.map((m) => (
                <Section
                  key={m.to}
                  title={m.label}
                  description={`${m.total} record(s)`}
                  padded={false}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" onClick={() => go(m.to)}>
                        Open
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => go(m.to, { create: "1" })}>
                        <Plus className="size-3.5" />
                      </Button>
                    </>
                  }
                >
                  <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
                    {m.counts.length === 0 && (
                      <span className="text-[11px] text-muted-foreground">No status breakdown</span>
                    )}
                    {m.counts.map(([label, count]) => (
                      <button
                        key={label}
                        onClick={() => go(m.to, { stage: label })}
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] hover:bg-accent"
                      >
                        {label}
                        <span className="num font-semibold">{count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="px-2 py-1">
                    <MiniTable
                      head={["Recent", "When", "Status"]}
                      rows={m.recent.map((r) => ({
                        cells: [
                          <span key="t" className="font-medium">{r.title}</span>,
                          <span key="w" className="num text-xs text-muted-foreground">
                            {r.at ? dateTime(r.at) : "—"}
                          </span>,
                          r.status ? <StatusBadge key="s" value={r.status} /> : "—",
                        ],
                        onClick: () => go(m.to, { focus: r.row.id }),
                      }))}
                    />
                  </div>
                </Section>
              ))}
            </div>
          </section>
        ))}
      </PageBody>
    </>
  );
}
