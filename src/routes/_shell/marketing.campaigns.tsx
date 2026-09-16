import { createFileRoute } from "@tanstack/react-router";
import { RewardsWorkspace } from "@/components/rewards/RewardsWorkspace";

export const Route = createFileRoute("/_shell/marketing/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns & Rewards · PerformanceOS Admin" },
      { name: "description", content: "Campaigns and rewards workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Campaigns & Rewards · PerformanceOS Admin" },
      { property: "og:description", content: "Campaigns and rewards workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <RewardsWorkspace initialTab="referrals" />,
});
