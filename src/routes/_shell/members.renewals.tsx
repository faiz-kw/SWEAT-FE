import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/members/renewals")({
  head: () => ({
    meta: [
      { title: "Renewals · PerformanceOS Admin" },
      { name: "description", content: "Renewals workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Renewals · PerformanceOS Admin" },
      { property: "og:description", content: "Renewals workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/members/renewals" />,
});
