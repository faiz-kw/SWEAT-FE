import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/trainers")({
  head: () => ({
    meta: [
      { title: "Trainer Reports · PerformanceOS Admin" },
      { name: "description", content: "Trainer Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trainer Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Trainer Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/trainers" />,
});
