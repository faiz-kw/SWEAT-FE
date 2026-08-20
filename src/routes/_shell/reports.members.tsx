import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/reports/members")({
  head: () => ({
    meta: [
      { title: "Member Reports · PerformanceOS Admin" },
      { name: "description", content: "Member Reports workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Member Reports · PerformanceOS Admin" },
      { property: "og:description", content: "Member Reports workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/reports/members" />,
});
