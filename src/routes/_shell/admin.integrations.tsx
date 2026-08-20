import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations · PerformanceOS Admin" },
      { name: "description", content: "Integrations workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Integrations · PerformanceOS Admin" },
      { property: "og:description", content: "Integrations workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/integrations" />,
});
