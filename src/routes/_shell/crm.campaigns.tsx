import { createFileRoute } from "@tanstack/react-router";
import { CampaignsWorkspace } from "@/components/crm/CampaignsWorkspace";

export const Route = createFileRoute("/_shell/crm/campaigns")({
  head: () => ({
    meta: [
      { title: "Marketing Campaigns · PerformanceOS Admin" },
      { name: "description", content: "Marketing acquisition campaign attribution and revenue performance in PerformanceOS." },
      { property: "og:title", content: "Marketing Campaigns · PerformanceOS Admin" },
    ],
  }),
  component: () => <CampaignsWorkspace />,
});
