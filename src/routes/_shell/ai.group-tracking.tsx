import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/group-tracking")({
  head: () => ({
    meta: [
      { title: "Group Class Tracking · PerformanceOS Admin" },
      { name: "description", content: "Group Class Tracking workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Group Class Tracking · PerformanceOS Admin" },
      { property: "og:description", content: "Group Class Tracking workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/group-tracking" />,
});
