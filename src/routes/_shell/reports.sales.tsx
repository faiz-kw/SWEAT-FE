import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales Reports · PerformanceOS Admin" },
      { name: "description", content: "Sales Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Sales Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Sales Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/sales" />,
});
