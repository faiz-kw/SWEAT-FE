import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/performance/intelligence")({
  head: () => ({
    meta: [
      { title: "Performance Intelligence · PerformanceOS Admin" },
      { name: "description", content: "Performance Intelligence workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Performance Intelligence · PerformanceOS Admin" },
      { property: "og:description", content: "Performance Intelligence workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/performance/intelligence" />,
});
