import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/stock")({
  head: () => ({
    meta: [
      { title: "Stock · PerformanceOS Admin" },
      { name: "description", content: "Stock workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Stock · PerformanceOS Admin" },
      { property: "og:description", content: "Stock workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/stock" />,
});
