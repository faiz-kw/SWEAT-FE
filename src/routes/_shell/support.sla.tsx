import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/support/sla")({
  head: () => ({
    meta: [
      { title: "SLA Monitor · PerformanceOS Admin" },
      { name: "description", content: "SLA Monitor workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "SLA Monitor · PerformanceOS Admin" },
      { property: "og:description", content: "SLA Monitor workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/support/sla" />,
});
