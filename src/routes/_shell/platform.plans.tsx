import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Modules · PerformanceOS Admin" },
      { name: "description", content: "Plans & Modules workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Plans & Modules · PerformanceOS Admin" },
      { property: "og:description", content: "Plans & Modules workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/plans" />,
});
