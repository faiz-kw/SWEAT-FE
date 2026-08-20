import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/services")({
  head: () => ({
    meta: [
      { title: "Services · PerformanceOS Admin" },
      { name: "description", content: "Services workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Services · PerformanceOS Admin" },
      { property: "og:description", content: "Services workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/services" />,
});
