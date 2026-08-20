import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/support/escalations")({
  head: () => ({
    meta: [
      { title: "Escalations · PerformanceOS Admin" },
      { name: "description", content: "Escalations workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Escalations · PerformanceOS Admin" },
      { property: "og:description", content: "Escalations workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/support/escalations" />,
});
