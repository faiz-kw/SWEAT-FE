import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/branding")({
  head: () => ({
    meta: [
      { title: "White Label · PerformanceOS Admin" },
      { name: "description", content: "White Label workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "White Label · PerformanceOS Admin" },
      { property: "og:description", content: "White Label workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/branding" />,
});
