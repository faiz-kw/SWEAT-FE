import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import {
  Field as FieldRow,
  FieldGrid,
  KpiTile,
  MiniTable,
  PageBody,
  PageHeader,
  Section,
  Timeline,
} from "@/components/enterprise/Page";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { dateTime, inr, shortDate } from "@/components/enterprise/format";
import { Button } from "@/components/ui/button";
import { useModuleNavigate } from "@/modules/navigate";
import { activityFeed, collectionLabel, pathForCollection, timeOf } from "@/modules/related";
import { inferFields, pickStatusKey, pickTitleKey } from "@/modules/schema";
import { snapshot, useStoreVersion, type CollectionKey, type Row } from "@/services/store";

const MEMBER_ID = "MEM-0001";
const LEAD_ID = "LEAD-1001";

interface Stage {
  id: string;
  label: string;
  collection: CollectionKey;
  rows: Row[];
  summary: string;
}

function useLifecycle() {
  useStoreVersion();
  return React.useMemo(() => {
    const d = snapshot();
    const member = d.members.find((m) => m.id === MEMBER_ID);
    const lead = d.leads.find((l) => l.id === LEAD_ID) ?? d.leads[0];
    const byMember = (rows: Row[]) => rows.filter((r) => r["memberId"] === MEMBER_ID);
    const calls = d.calls.filter((c) => c["leadId"] === lead?.id || c["memberId"] === MEMBER_ID);
    const trials = d.trials.filter((t) => t["leadId"] === lead?.id);

    const stages: Stage[] = [
      {
        id: "lead",
        label: "1 · Lead captured",
        collection: "leads",
        rows: lead ? [lead] : [],
        summary: lead ? `${String(lead["source"])} · owner ${String(lead["assignedTo"])}` : "",
      },
      {
        id: "calls",
        label: "2 · AI calling",
        collection: "calls",
        rows: calls,
        summary: `${calls.length} Sarvam voice interaction(s)`,
      },
      {
        id: "trial",
        label: "3 · Trial",
        collection: "trials",
        rows: trials,
        summary: trials.length ? String(trials[0]!["status"]) : "No trial recorded",
      },
      {
        id: "assessment",
        label: "4 · Body assessment",
        collection: "assessments",
        rows: byMember(d.assessments),
        summary: `${byMember(d.assessments).length} assessment(s)`,
      },
      {
        id: "vision",
        label: "5 · Computer vision",
        collection: "visionAnalyses",
        rows: byMember(d.visionAnalyses),
        summary: `${byMember(d.visionAnalyses).length} movement scan(s)`,
      },
      {
        id: "program",
        label: "6 · Program & AI coach",
        collection: "aiCoachPlans",
        rows: byMember(d.aiCoachPlans),
        summary: `${byMember(d.aiCoachPlans).length} adaptive plan(s)`,
      },
      {
        id: "training",
        label: "7 · Training delivery",
        collection: "bookings",
        rows: byMember(d.bookings),
        summary: `${byMember(d.bookings).length} session booking(s)`,
      },
      {
        id: "nutrition",
        label: "8 · Nutrition",
        collection: "nutritionPlans",
        rows: byMember(d.nutritionPlans),
        summary: `${byMember(d.nutritionPlans).length} diet plan(s)`,
      },
      {
        id: "support",
        label: "9 · Support",
        collection: "supportTickets",
        rows: byMember(d.supportTickets),
        summary: `${byMember(d.supportTickets).length} ticket(s)`,
      },
      {
        id: "renewal",
        label: "10 · Payments & renewal",
        collection: "invoices",
        rows: byMember(d.invoices),
        summary: `${byMember(d.invoices).length} invoice(s)`,
      },
    ];

    return { member, lead, stages };
  }, []);
}

/**
 * Single-screen lifecycle for the demo member: lead → AI calling → trial →
 * assessment → program → training → renewal, with drilldown into each module.
 */
export function Lifecycle() {
  const { member, lead, stages } = useLifecycle();
  const go = useModuleNavigate();
  const [active, setActive] = React.useState<string>("lead");

  const stage = stages.find((s) => s.id === active) ?? stages[0]!;
  const stageFields = React.useMemo(() => inferFields(stage.rows), [stage]);
  const titleKey = pickTitleKey(stageFields);
  const statusKey = pickStatusKey(stageFields);
  const feed = React.useMemo(() => (member ? activityFeed("members", member) : []), [member]);

  const revenue = stages.find((s) => s.id === "renewal")?.rows.reduce((t, r) => t + Number(r["paid"] ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title={`Member Lifecycle · ${String(member?.["name"] ?? "Rahul Sharma")}`}
        subtitle="End-to-end journey with every originating record linked back to its module."
        meta={
          <>
            <span className="num text-muted-foreground">{member?.id ?? MEMBER_ID}</span>
            <span className="text-muted-foreground">Lead {String(lead?.id ?? LEAD_ID)}</span>
            {member?.["status"] ? <StatusBadge value={String(member["status"])} /> : null}
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => go("/members/client-360", { focus: MEMBER_ID })}>
            Open Client 360 <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        }
      />

      <PageBody>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Membership" value={String(member?.["membership"] ?? "—")} hint="Current plan" />
          <KpiTile label="Lifetime paid" value={inr(revenue, true)} hint="Collected invoices" />
          <KpiTile label="Health score" value={Number(member?.["healthScore"] ?? 0)} hint="Engagement model" />
          <KpiTile label="Attendance 30d" value={Number(member?.["attendance30"] ?? 0)} hint="Sessions attended" />
          <KpiTile label="Renewal" value={shortDate(String(member?.["renewalDate"] ?? ""))} hint="Next due" />
          <KpiTile
            label="Risk"
            value={String(member?.["riskLevel"] ?? "—")}
            tone={member?.["riskLevel"] === "High" ? "negative" : "positive"}
            hint="Retention model"
          />
        </div>

        <Section title="Lifecycle stages" description="Select a stage to inspect its originating records.">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={
                  "rounded-md border px-2.5 py-2 text-left transition-colors " +
                  (active === s.id
                    ? "border-primary bg-accent"
                    : "border-border bg-surface hover:bg-accent/50")
                }
              >
                <div className="text-[12px] font-semibold">{s.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.summary}</div>
                <div className="num mt-1 text-[11px] text-muted-foreground">
                  {collectionLabel(s.collection)} · {s.rows.length}
                </div>
              </button>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Section
            title={`${stage.label} — records`}
            description={collectionLabel(stage.collection)}
            padded={false}
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => go(pathForCollection(stage.collection) ?? "/", { focus: MEMBER_ID })}
              >
                Open module <ArrowUpRight className="ml-1 size-3.5" />
              </Button>
            }
          >
            <div className="px-2 py-1">
              <MiniTable
                head={["Record", "When", "Status"]}
                rows={stage.rows.map((r) => ({
                  cells: [
                    <span key="t" className="font-medium">{String(r[titleKey] ?? r.id)}</span>,
                    <span key="w" className="num text-xs text-muted-foreground">
                      {timeOf(r) ? dateTime(timeOf(r)) : "—"}
                    </span>,
                    statusKey ? <StatusBadge key="s" value={String(r[statusKey] ?? "—")} /> : "—",
                  ],
                  onClick: () =>
                    go(pathForCollection(stage.collection) ?? "/", { focus: r.id }),
                }))}
              />
            </div>
            {stage.rows[0] && (
              <div className="border-t border-border p-3">
                <FieldGrid cols={2}>
                  {stageFields.slice(0, 10).map((f) => (
                    <FieldRow key={f.key} label={f.label} value={String(stage.rows[0]![f.key] ?? "—")} />
                  ))}
                </FieldGrid>
              </div>
            )}
          </Section>

          <Section title="Cross-module activity timeline" description="Every record that touched this member.">
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
        </div>
      </PageBody>
    </>
  );
}
