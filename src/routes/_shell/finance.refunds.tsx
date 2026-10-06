import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds · SWEAT Finance" },
      { name: "description", content: "Refunds workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="refunds" />,
});
