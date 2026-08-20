import { createFileRoute } from "@tanstack/react-router";

import { FunnelBars, TrendChart } from "@/components/enterprise/Charts";
import { dashboardMetrics, leadFunnel, revenueTrend } from "@/services/repo";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard · PerformanceOS Admin" },
      {
        name: "description",
        content: "Revenue, membership and lead funnel performance across all fitness locations.",
      },
      { property: "og:title", content: "Executive Dashboard · PerformanceOS Admin" },
      {
        property: "og:description",
        content: "Revenue, membership and lead funnel performance across all fitness locations.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const metrics = dashboardMetrics();
  const trend = revenueTrend() as unknown as Record<string, unknown>[];
  const funnel = leadFunnel() as unknown as { stage: string; count: number }[];
  const tiles = Object.entries(metrics).slice(0, 8);

  return (
    <div className="p-3">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Console</div>
        <h1 className="text-[16px] font-semibold">Executive Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map(([key, value]) => (
          <div key={key} className="rounded-md border border-border bg-surface p-2.5">
            <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              {key.replace(/([A-Z])/g, " $1")}
            </div>
            <div className="num mt-1 text-[18px] font-semibold">
              {typeof value === "number" ? value.toLocaleString("en-IN") : String(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-surface p-2.5 lg:col-span-2">
          <h2 className="mb-2 text-[13px] font-semibold">Revenue trend</h2>
          <TrendChart
            data={trend}
            xKey={Object.keys(trend[0] ?? { month: "" })[0] ?? "month"}
            series={[
              {
                key: Object.keys(trend[0] ?? { revenue: 0 }).find((k) => k !== "month") ?? "revenue",
                label: "Revenue",
                color: "var(--color-chart-1)",
              },
            ]}
          />
        </section>
        <section className="rounded-md border border-border bg-surface p-2.5">
          <h2 className="mb-2 text-[13px] font-semibold">Lead funnel</h2>
          <FunnelBars data={funnel} />
        </section>
      </div>
    </div>
  );
}
