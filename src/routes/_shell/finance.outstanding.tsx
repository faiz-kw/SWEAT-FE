import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/finance/outstanding")({
  head: () => ({
    meta: [
      { title: "Outstanding · PerformanceOS Admin" },
      { name: "description", content: "Outstanding workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Outstanding · PerformanceOS Admin" },
      { property: "og:description", content: "Outstanding workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/finance/outstanding" />,
});
