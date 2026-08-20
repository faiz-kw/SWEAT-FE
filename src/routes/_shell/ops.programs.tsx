import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/programs")({
  head: () => ({
    meta: [
      { title: "Programs · PerformanceOS Admin" },
      { name: "description", content: "Programs workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Programs · PerformanceOS Admin" },
      { property: "og:description", content: "Programs workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/programs" />,
});
