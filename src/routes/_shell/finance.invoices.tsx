import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · SWEAT Finance" },
      { name: "description", content: "Invoices workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="invoices" />,
});
