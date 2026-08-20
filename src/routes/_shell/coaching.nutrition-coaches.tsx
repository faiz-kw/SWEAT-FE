import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/coaching/nutrition-coaches")({
  head: () => ({
    meta: [
      { title: "Nutrition Coaches · PerformanceOS Admin" },
      { name: "description", content: "Nutrition Coaches workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Nutrition Coaches · PerformanceOS Admin" },
      { property: "og:description", content: "Nutrition Coaches workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/coaching/nutrition-coaches" />,
});
