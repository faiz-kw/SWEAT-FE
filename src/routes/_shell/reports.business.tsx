import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/business")({
  head: () => ({
    meta: [
      { title: "Business Reports · PerformanceOS Admin" },
      { name: "description", content: "Business Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Business Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Business Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/business" />,
});
