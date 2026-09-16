import { createFileRoute } from "@tanstack/react-router";
import { DiscountsWorkspace } from "@/components/discounts/DiscountsWorkspace";

export const Route = createFileRoute("/_shell/crm/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons · PerformanceOS Admin" },
      { name: "description", content: "Coupons workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Coupons · PerformanceOS Admin" },
      { property: "og:description", content: "Coupons workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <DiscountsWorkspace initialTab="campaigns" />,
});

