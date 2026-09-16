import { createFileRoute } from "@tanstack/react-router";
import { RewardsWorkspace } from "@/components/rewards/RewardsWorkspace";

export const Route = createFileRoute("/_shell/crm/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns & Referrals · PerformanceOS Admin" },
      { name: "description", content: "Campaigns and referral engine in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Campaigns & Referrals · PerformanceOS Admin" },
      { property: "og:description", content: "Campaigns and referral engine in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <RewardsWorkspace initialTab="programs" />,
});
