import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/support/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets · PerformanceOS Admin" },
      { name: "description", content: "Tickets workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Tickets · PerformanceOS Admin" },
      { property: "og:description", content: "Tickets workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/support/tickets" />,
});
