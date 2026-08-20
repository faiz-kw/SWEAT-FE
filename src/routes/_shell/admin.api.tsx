import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/api")({
  head: () => ({
    meta: [
      { title: "API · PerformanceOS Admin" },
      { name: "description", content: "API workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "API · PerformanceOS Admin" },
      { property: "og:description", content: "API workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/api" />,
});
