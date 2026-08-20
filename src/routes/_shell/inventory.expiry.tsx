import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/inventory/expiry")({
  head: () => ({
    meta: [
      { title: "Expiry · PerformanceOS Admin" },
      { name: "description", content: "Expiry workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Expiry · PerformanceOS Admin" },
      { property: "og:description", content: "Expiry workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/inventory/expiry" />,
});
