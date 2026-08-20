import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach · PerformanceOS Admin" },
      { name: "description", content: "AI Coach workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "AI Coach · PerformanceOS Admin" },
      { property: "og:description", content: "AI Coach workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/coach" />,
});
