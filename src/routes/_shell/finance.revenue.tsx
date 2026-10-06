import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue · SWEAT Finance" },
      { name: "description", content: "Revenue workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="revenue" />,
});
