import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/members")({
  head: () => ({
    meta: [
      { title: "All Members · PerformanceOS Admin" },
      { name: "description", content: "All Members workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "All Members · PerformanceOS Admin" },
      { property: "og:description", content: "All Members workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/members" />,
});
