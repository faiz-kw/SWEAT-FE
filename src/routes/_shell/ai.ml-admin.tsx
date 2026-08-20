import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/ml-admin")({
  head: () => ({
    meta: [
      { title: "AI/ML Administrator · PerformanceOS Admin" },
      { name: "description", content: "AI/ML Administrator workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "AI/ML Administrator · PerformanceOS Admin" },
      { property: "og:description", content: "AI/ML Administrator workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/ml-admin" />,
});
