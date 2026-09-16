import { createFileRoute } from "@tanstack/react-router";
import { MembershipsWorkspace } from "@/components/memberships/MembershipsWorkspace";

export const Route = createFileRoute("/_shell/members/memberships")({
  head: () => ({
    meta: [
      { title: "Memberships · PerformanceOS Admin" },
      { name: "description", content: "Memberships workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Memberships · PerformanceOS Admin" },
      { property: "og:description", content: "Memberships workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <MembershipsWorkspace initialTab="memberships" />,
});
