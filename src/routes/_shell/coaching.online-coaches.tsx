import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/coaching/online-coaches")({
  head: () => ({
    meta: [
      { title: "Online Coaches · PerformanceOS Admin" },
      { name: "description", content: "Online Coaches workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Online Coaches · PerformanceOS Admin" },
      { property: "og:description", content: "Online Coaches workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/coaching/online-coaches" />,
});
