import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/performance/movement")({
  head: () => ({
    meta: [
      { title: "Movement Intelligence · PerformanceOS Admin" },
      { name: "description", content: "Movement Intelligence workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Movement Intelligence · PerformanceOS Admin" },
      { property: "og:description", content: "Movement Intelligence workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/performance/movement" />,
});
