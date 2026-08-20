import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/personal-training")({
  head: () => ({
    meta: [
      { title: "Personal Training · PerformanceOS Admin" },
      { name: "description", content: "Personal Training workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Personal Training · PerformanceOS Admin" },
      { property: "og:description", content: "Personal Training workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/personal-training" />,
});
