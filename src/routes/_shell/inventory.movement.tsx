import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/movement")({
  head: () => ({
    meta: [
      { title: "Stock Movement · PerformanceOS Admin" },
      { name: "description", content: "Stock Movement workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Stock Movement · PerformanceOS Admin" },
      { property: "og:description", content: "Stock Movement workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/movement" />,
});
