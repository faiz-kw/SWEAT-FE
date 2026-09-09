import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceWorkspace } from "@/components/platform/MarketplaceWorkspace";

export const Route = createFileRoute("/_shell/platform/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace & Integrations · PerformanceOS Admin" },
      { name: "description", content: "Third-party apps, telephony engines, and hardware connectors." },
    ],
  }),
  component: MarketplaceWorkspace,
});
