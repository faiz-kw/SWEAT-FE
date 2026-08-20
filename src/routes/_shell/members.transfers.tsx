import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/members/transfers")({
  head: () => ({
    meta: [
      { title: "Transfers · PerformanceOS Admin" },
      { name: "description", content: "Transfers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Transfers · PerformanceOS Admin" },
      { property: "og:description", content: "Transfers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/members/transfers" />,
});
