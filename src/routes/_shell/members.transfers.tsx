import { createFileRoute } from "@tanstack/react-router";
import { TransfersWorkspace } from "@/components/members/TransfersWorkspace";

export const Route = createFileRoute("/_shell/members/transfers")({
  head: () => ({
    meta: [
      { title: "Transfers · PerformanceOS Admin" },
      { name: "description", content: "Authoritative branch transfers workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Transfers · PerformanceOS Admin" },
      { property: "og:description", content: "Authoritative branch transfers workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <TransfersWorkspace />,
});