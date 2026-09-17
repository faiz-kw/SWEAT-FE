import { createFileRoute } from "@tanstack/react-router";

import { FunnelBars, TrendChart } from "@/components/enterprise/Charts";
import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
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
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Executive Dashboard"
        description="Real-time multi-location revenue metrics, active memberships, class attendance, and acquisition funnel."
      />

      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6">
          {tiles.map(([key, value]) => (
            <KpiTile
              key={key}
              title={key.replace(/([A-Z])/g, " $1")}
              value={typeof value === "number" ? value.toLocaleString("en-IN") : String(value)}
            />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs lg:col-span-2">
            <h2 className="mb-3 text-sm sm:text-base font-semibold text-foreground">Revenue Trend</h2>
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
          <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="mb-3 text-sm sm:text-base font-semibold text-foreground">Lead Funnel</h2>
            <FunnelBars data={funnel} />
          </section>
        </div>
      </PageBody>
    </div>
  );
}
