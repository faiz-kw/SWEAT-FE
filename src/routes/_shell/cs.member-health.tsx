import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/cs/member-health")({
  head: () => ({
    meta: [
      { title: "Member Health · PerformanceOS Admin" },
      { name: "description", content: "Member Health workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Member Health · PerformanceOS Admin" },
      { property: "og:description", content: "Member Health workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/cs/member-health" />,
});
