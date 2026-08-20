import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/offers")({
  head: () => ({
    meta: [
      { title: "Offers · PerformanceOS Admin" },
      { name: "description", content: "Offers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Offers · PerformanceOS Admin" },
      { property: "og:description", content: "Offers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/offers" />,
});
