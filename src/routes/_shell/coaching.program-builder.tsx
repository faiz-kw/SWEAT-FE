import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/coaching/program-builder")({
  head: () => ({
    meta: [
      { title: "Program Builder · PerformanceOS Admin" },
      { name: "description", content: "Program Builder workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Program Builder · PerformanceOS Admin" },
      { property: "og:description", content: "Program Builder workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/coaching/program-builder" />,
});
