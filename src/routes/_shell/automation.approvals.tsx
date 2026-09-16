import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsWorkspace } from "@/components/approvals/ApprovalsWorkspace";

export const Route = createFileRoute("/_shell/automation/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals · PerformanceOS Admin" },
      { name: "description", content: "Approvals workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Approvals · PerformanceOS Admin" },
      { property: "og:description", content: "Approvals workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ApprovalsWorkspace initialTab="pending" />,
});
