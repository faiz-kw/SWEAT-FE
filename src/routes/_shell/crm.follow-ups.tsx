import { createFileRoute } from "@tanstack/react-router";
import { FollowUpsWorkspace } from "@/components/crm/FollowUpsWorkspace";

export const Route = createFileRoute("/_shell/crm/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups & Work Queue · PerformanceOS Admin" },
      { name: "description", content: "Agent work queue: overdue sales tasks, today's calls, and post-trial outreach." },
      { property: "og:title", content: "Follow-ups & Work Queue · PerformanceOS Admin" },
      { property: "og:description", content: "Agent work queue: overdue sales tasks, today's calls, and post-trial outreach." },
    ],
  }),
  component: () => <FollowUpsWorkspace />,
});
