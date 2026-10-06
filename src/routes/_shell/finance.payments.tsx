import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/payments")({
  head: () => ({
    meta: [
      { title: "Payments · SWEAT Finance" },
      { name: "description", content: "Payments workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="payments" />,
});
