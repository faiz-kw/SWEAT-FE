import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration · PerformanceOS Admin" },
      { name: "description", content: "Configuration workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Configuration · PerformanceOS Admin" },
      { property: "og:description", content: "Configuration workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/configuration" />,
});
