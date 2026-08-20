import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups · PerformanceOS Admin" },
      { name: "description", content: "Follow-ups workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Follow-ups · PerformanceOS Admin" },
      { property: "og:description", content: "Follow-ups workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/follow-ups" />,
});
