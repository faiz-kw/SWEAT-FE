import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/live-sessions")({
  head: () => ({
    meta: [
      { title: "Live Session · PerformanceOS Admin" },
      { name: "description", content: "Live Session workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Live Session · PerformanceOS Admin" },
      { property: "og:description", content: "Live Session workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/live-sessions" />,
});
