import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/performance/progress")({
  head: () => ({
    meta: [
      { title: "Progress · PerformanceOS Admin" },
      { name: "description", content: "Progress workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Progress · PerformanceOS Admin" },
      { property: "og:description", content: "Progress workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/performance/progress" />,
});
