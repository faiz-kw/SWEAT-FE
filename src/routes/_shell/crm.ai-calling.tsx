import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/ai-calling")({
  head: () => ({
    meta: [
      { title: "AI Calling · PerformanceOS Admin" },
      { name: "description", content: "AI Calling workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "AI Calling · PerformanceOS Admin" },
      { property: "og:description", content: "AI Calling workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/ai-calling" />,
});
