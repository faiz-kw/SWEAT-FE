import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds · PerformanceOS Admin" },
      { name: "description", content: "Refunds workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Refunds · PerformanceOS Admin" },
      { property: "og:description", content: "Refunds workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="refunds" />,
});

