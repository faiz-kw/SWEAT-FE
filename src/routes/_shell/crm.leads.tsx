import { createFileRoute } from "@tanstack/react-router";
import { LeadsWorkspace } from "@/components/crm/LeadsWorkspace";

export const Route = createFileRoute("/_shell/crm/leads")({
  head: () => ({
    meta: [
      { title: "Leads · PerformanceOS Admin" },
      { name: "description", content: "Leads workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Leads · PerformanceOS Admin" },
      { property: "og:description", content: "Leads workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <LeadsWorkspace />,
});

