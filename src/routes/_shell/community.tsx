import { createFileRoute } from "@tanstack/react-router";
import { AdminCommunityWorkspace } from "@/components/community/AdminCommunityWorkspace";

export const Route = createFileRoute("/_shell/community")({
  head: () => ({
    meta: [
      { title: "Community Hub & Content Moderation · PerformanceOS Admin" },
      {
        name: "description",
        content: "Multi-tenant Community Hub, transformation post approvals, abuse moderation queue, and member suggestions.",
      },
      { property: "og:title", content: "Community Hub · PerformanceOS Admin" },
    ],
  }),
  component: () => <AdminCommunityWorkspace />,
});
