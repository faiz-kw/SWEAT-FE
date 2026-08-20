import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/permissions")({
  head: () => ({
    meta: [
      { title: "Permissions · PerformanceOS Admin" },
      { name: "description", content: "Permissions workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Permissions · PerformanceOS Admin" },
      { property: "og:description", content: "Permissions workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/permissions" />,
});
