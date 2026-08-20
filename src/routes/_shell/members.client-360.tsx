import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/members/client-360")({
  head: () => ({
    meta: [
      { title: "Client 360 · PerformanceOS Admin" },
      { name: "description", content: "Client 360 workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Client 360 · PerformanceOS Admin" },
      { property: "og:description", content: "Client 360 workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/members/client-360" />,
});
