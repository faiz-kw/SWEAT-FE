import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments · PerformanceOS Admin" },
      { name: "description", content: "Assessments workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Assessments · PerformanceOS Admin" },
      { property: "og:description", content: "Assessments workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/assessments" />,
});
