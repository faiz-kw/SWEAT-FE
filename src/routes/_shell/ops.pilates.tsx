import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/pilates")({
  head: () => ({
    meta: [
      { title: "Pilates · PerformanceOS Admin" },
      { name: "description", content: "Pilates workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Pilates · PerformanceOS Admin" },
      { property: "og:description", content: "Pilates workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/pilates" />,
});
