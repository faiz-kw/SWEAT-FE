import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/marketing/audiences")({
  head: () => ({
    meta: [
      { title: "Audiences · PerformanceOS Admin" },
      { name: "description", content: "Audiences workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Audiences · PerformanceOS Admin" },
      { property: "og:description", content: "Audiences workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/marketing/audiences" />,
});
