import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/classes")({
  head: () => ({
    meta: [
      { title: "Classes · PerformanceOS Admin" },
      { name: "description", content: "Classes workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Classes · PerformanceOS Admin" },
      { property: "og:description", content: "Classes workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/classes" />,
});
