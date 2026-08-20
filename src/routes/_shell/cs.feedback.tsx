import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/cs/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback · PerformanceOS Admin" },
      { name: "description", content: "Feedback workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Feedback · PerformanceOS Admin" },
      { property: "og:description", content: "Feedback workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/cs/feedback" />,
});
