import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/payments")({
  head: () => ({
    meta: [
      { title: "Payments · PerformanceOS Admin" },
      { name: "description", content: "Payments workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Payments · PerformanceOS Admin" },
      { property: "og:description", content: "Payments workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <CommerceWorkspace />,
});

