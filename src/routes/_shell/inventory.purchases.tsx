import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases · PerformanceOS Admin" },
      { name: "description", content: "Purchases workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Purchases · PerformanceOS Admin" },
      { property: "og:description", content: "Purchases workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/purchases" />,
});
