import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/marketing/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns · PerformanceOS Admin" },
      { name: "description", content: "Campaigns workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Campaigns · PerformanceOS Admin" },
      { property: "og:description", content: "Campaigns workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/marketing/campaigns" />,
});
