import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/crm/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons · PerformanceOS Admin" },
      { name: "description", content: "Coupons workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Coupons · PerformanceOS Admin" },
      { property: "og:description", content: "Coupons workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/crm/coupons" />,
});
