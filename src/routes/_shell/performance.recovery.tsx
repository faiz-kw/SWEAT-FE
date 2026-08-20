import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/performance/recovery")({
  head: () => ({
    meta: [
      { title: "Recovery · PerformanceOS Admin" },
      { name: "description", content: "Recovery workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Recovery · PerformanceOS Admin" },
      { property: "og:description", content: "Recovery workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/performance/recovery" />,
});
