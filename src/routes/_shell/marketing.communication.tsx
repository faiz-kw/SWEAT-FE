import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/marketing/communication")({
  head: () => ({
    meta: [
      { title: "Communication · PerformanceOS Admin" },
      { name: "description", content: "Communication workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Communication · PerformanceOS Admin" },
      { property: "og:description", content: "Communication workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/marketing/communication" />,
});
