import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/activities")({
  head: () => ({
    meta: [
      { title: "Sales Activities · PerformanceOS Admin" },
      { name: "description", content: "Sales Activities workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Sales Activities · PerformanceOS Admin" },
      { property: "og:description", content: "Sales Activities workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/activities" />,
});
