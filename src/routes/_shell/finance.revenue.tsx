import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/finance/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue · PerformanceOS Admin" },
      { name: "description", content: "Revenue workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Revenue · PerformanceOS Admin" },
      { property: "og:description", content: "Revenue workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/finance/revenue" />,
});
