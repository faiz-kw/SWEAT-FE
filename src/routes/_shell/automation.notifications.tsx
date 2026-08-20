import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/automation/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · PerformanceOS Admin" },
      { name: "description", content: "Notifications workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Notifications · PerformanceOS Admin" },
      { property: "og:description", content: "Notifications workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/automation/notifications" />,
});
