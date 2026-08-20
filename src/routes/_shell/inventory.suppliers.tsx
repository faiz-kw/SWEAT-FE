import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers · PerformanceOS Admin" },
      { name: "description", content: "Suppliers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Suppliers · PerformanceOS Admin" },
      { property: "og:description", content: "Suppliers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/suppliers" />,
});
