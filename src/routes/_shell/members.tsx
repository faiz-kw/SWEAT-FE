import { createFileRoute } from "@tanstack/react-router";

import { MemberDirectoryWorkspace } from "@/components/members/MemberDirectoryWorkspace";

export const Route = createFileRoute("/_shell/members")({
  head: () => ({
    meta: [
      { title: "Member Directory · PerformanceOS" },
      { name: "description", content: "Authoritative Member Directory in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Member Directory · PerformanceOS" },
      { property: "og:description", content: "Authoritative Member Directory in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <MemberDirectoryWorkspace />,
});

