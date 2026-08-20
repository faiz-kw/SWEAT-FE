import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/coaching/trainers")({
  head: () => ({
    meta: [
      { title: "Trainers · PerformanceOS Admin" },
      { name: "description", content: "Trainers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trainers · PerformanceOS Admin" },
      { property: "og:description", content: "Trainers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/coaching/trainers" />,
});
