import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/automation/workflows")({
  head: () => ({
    meta: [
      { title: "Workflows · PerformanceOS Admin" },
      { name: "description", content: "Workflows workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Workflows · PerformanceOS Admin" },
      { property: "og:description", content: "Workflows workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/automation/workflows" />,
});
