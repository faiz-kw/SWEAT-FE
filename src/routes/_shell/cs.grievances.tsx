import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/cs/grievances")({
  head: () => ({
    meta: [
      { title: "Grievances · PerformanceOS Admin" },
      { name: "description", content: "Grievances workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Grievances · PerformanceOS Admin" },
      { property: "og:description", content: "Grievances workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/cs/grievances" />,
});
