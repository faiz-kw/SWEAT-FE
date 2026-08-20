import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles · PerformanceOS Admin" },
      { name: "description", content: "Roles workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Roles · PerformanceOS Admin" },
      { property: "og:description", content: "Roles workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/roles" />,
});
