import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/cs/retention")({
  head: () => ({
    meta: [
      { title: "Retention · PerformanceOS Admin" },
      { name: "description", content: "Retention workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Retention · PerformanceOS Admin" },
      { property: "og:description", content: "Retention workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/cs/retention" />,
});
