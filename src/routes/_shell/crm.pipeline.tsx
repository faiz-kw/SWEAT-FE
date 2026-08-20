import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/pipeline")({
  head: () => ({
    meta: [
      { title: "Lead Pipeline · PerformanceOS Admin" },
      { name: "description", content: "Lead Pipeline workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Lead Pipeline · PerformanceOS Admin" },
      { property: "og:description", content: "Lead Pipeline workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/pipeline" />,
});
