import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/business-intelligence")({
  head: () => ({
    meta: [
      { title: "AI Business Intelligence · PerformanceOS Admin" },
      { name: "description", content: "AI Business Intelligence workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "AI Business Intelligence · PerformanceOS Admin" },
      { property: "og:description", content: "AI Business Intelligence workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/business-intelligence" />,
});
