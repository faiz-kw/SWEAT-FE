import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/billing")({
  head: () => ({
    meta: [
      { title: "Subscription Billing · PerformanceOS Admin" },
      { name: "description", content: "Subscription Billing workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Subscription Billing · PerformanceOS Admin" },
      { property: "og:description", content: "Subscription Billing workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/billing" />,
});
