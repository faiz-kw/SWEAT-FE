import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/marketing/templates")({
  head: () => ({
    meta: [
      { title: "Templates · PerformanceOS Admin" },
      { name: "description", content: "Templates workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Templates · PerformanceOS Admin" },
      { property: "og:description", content: "Templates workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/marketing/templates" />,
});
