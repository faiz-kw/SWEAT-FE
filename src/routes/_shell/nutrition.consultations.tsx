import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/nutrition/consultations")({
  head: () => ({
    meta: [
      { title: "Consultations · PerformanceOS Admin" },
      { name: "description", content: "Consultations workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Consultations · PerformanceOS Admin" },
      { property: "og:description", content: "Consultations workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/nutrition/consultations" />,
});
