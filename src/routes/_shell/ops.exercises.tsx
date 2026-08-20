import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/exercises")({
  head: () => ({
    meta: [
      { title: "Exercises · PerformanceOS Admin" },
      { name: "description", content: "Exercises workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Exercises · PerformanceOS Admin" },
      { property: "og:description", content: "Exercises workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/exercises" />,
});
