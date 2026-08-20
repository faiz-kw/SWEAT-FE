import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/products")({
  head: () => ({
    meta: [
      { title: "Products · PerformanceOS Admin" },
      { name: "description", content: "Products workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Products · PerformanceOS Admin" },
      { property: "og:description", content: "Products workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/products" />,
});
