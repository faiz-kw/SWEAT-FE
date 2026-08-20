import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/usage")({
  head: () => ({
    meta: [
      { title: "Usage · PerformanceOS Admin" },
      { name: "description", content: "Usage workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Usage · PerformanceOS Admin" },
      { property: "og:description", content: "Usage workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/usage" />,
});
