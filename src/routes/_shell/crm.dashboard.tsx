import { createFileRoute } from "@tanstack/react-router";
import { CRMDashboardWorkspace } from "@/components/crm/CRMDashboardWorkspace";

export const Route = createFileRoute("/_shell/crm/dashboard")({
  head: () => ({
    meta: [
      { title: "CRM Dashboard & Sales Analytics · PerformanceOS Admin" },
      { name: "description", content: "Authoritative CRM dashboard, lead funnel, campaign attribution, and sales analytics." },
      { property: "og:title", content: "CRM Dashboard & Sales Analytics · PerformanceOS Admin" },
    ],
  }),
  component: () => <CRMDashboardWorkspace />,
});
