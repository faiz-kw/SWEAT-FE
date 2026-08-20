import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/coaching/exercise-library")({
  head: () => ({
    meta: [
      { title: "Exercise Library · PerformanceOS Admin" },
      { name: "description", content: "Exercise Library workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Exercise Library · PerformanceOS Admin" },
      { property: "og:description", content: "Exercise Library workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/coaching/exercise-library" />,
});
