import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/security")({
  head: () => ({
    meta: [
      { title: "Security · PerformanceOS Admin" },
      { name: "description", content: "Security workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Security · PerformanceOS Admin" },
      { property: "og:description", content: "Security workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/security" />,
});
