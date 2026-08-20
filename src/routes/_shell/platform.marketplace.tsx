import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace · PerformanceOS Admin" },
      { name: "description", content: "Marketplace workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Marketplace · PerformanceOS Admin" },
      { property: "og:description", content: "Marketplace workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/marketplace" />,
});
