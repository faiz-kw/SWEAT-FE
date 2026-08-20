import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/nutrition/food-logs")({
  head: () => ({
    meta: [
      { title: "Food Logs · PerformanceOS Admin" },
      { name: "description", content: "Food Logs workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Food Logs · PerformanceOS Admin" },
      { property: "og:description", content: "Food Logs workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/nutrition/food-logs" />,
});
