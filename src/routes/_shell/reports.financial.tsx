import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/financial")({
  head: () => ({
    meta: [
      { title: "Financial Reports · PerformanceOS Admin" },
      { name: "description", content: "Financial Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Financial Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Financial Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/financial" />,
});
