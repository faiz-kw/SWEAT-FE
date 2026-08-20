import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/cs/at-risk")({
  head: () => ({
    meta: [
      { title: "At Risk · PerformanceOS Admin" },
      { name: "description", content: "At Risk workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "At Risk · PerformanceOS Admin" },
      { property: "og:description", content: "At Risk workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/cs/at-risk" />,
});
