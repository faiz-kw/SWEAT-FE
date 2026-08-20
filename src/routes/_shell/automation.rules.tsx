import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/automation/rules")({
  head: () => ({
    meta: [
      { title: "Rules · PerformanceOS Admin" },
      { name: "description", content: "Rules workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Rules · PerformanceOS Admin" },
      { property: "og:description", content: "Rules workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/automation/rules" />,
});
