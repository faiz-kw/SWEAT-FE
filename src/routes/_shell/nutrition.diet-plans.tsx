import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/nutrition/diet-plans")({
  head: () => ({
    meta: [
      { title: "Diet Plans · PerformanceOS Admin" },
      { name: "description", content: "Diet Plans workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Diet Plans · PerformanceOS Admin" },
      { property: "og:description", content: "Diet Plans workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/nutrition/diet-plans" />,
});
