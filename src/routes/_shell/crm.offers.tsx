import { createFileRoute } from "@tanstack/react-router";
import { DiscountsWorkspace } from "@/components/discounts/DiscountsWorkspace";

export const Route = createFileRoute("/_shell/crm/offers")({
  head: () => ({
    meta: [
      { title: "Offers · PerformanceOS Admin" },
      { name: "description", content: "Offers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Offers · PerformanceOS Admin" },
      { property: "og:description", content: "Offers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => (
    <DiscountsWorkspace
      mode="offers"
      initialTab="rules"
      title="Offers & Dynamic Rules"
      subtitle="Configure automated member retention incentives, eligibility thresholds, and workout rewards."
    />
  ),
});

