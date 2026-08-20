import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/performance")({
  head: () => ({
    meta: [
      { title: "Performance Reports · PerformanceOS Admin" },
      { name: "description", content: "Performance Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Performance Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Performance Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/performance" />,
});
