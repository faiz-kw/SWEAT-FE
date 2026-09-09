import { createFileRoute } from "@tanstack/react-router";
import { BillingWorkspace } from "@/components/platform/BillingWorkspace";

export const Route = createFileRoute("/_shell/platform/billing")({
  head: () => ({
    meta: [
      { title: "Subscription Billing & Revenue · PerformanceOS Admin" },
      { name: "description", content: "Platform subscription revenue, recurring billing, and GST invoices." },
    ],
  }),
  component: BillingWorkspace,
});
