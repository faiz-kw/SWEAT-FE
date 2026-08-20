import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/nutrition/supplements")({
  head: () => ({
    meta: [
      { title: "Supplements · PerformanceOS Admin" },
      { name: "description", content: "Supplements workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Supplements · PerformanceOS Admin" },
      { property: "og:description", content: "Supplements workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/nutrition/supplements" />,
});
