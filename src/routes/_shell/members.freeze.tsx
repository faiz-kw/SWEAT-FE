import { createFileRoute } from "@tanstack/react-router";
import { MembershipsWorkspace } from "@/components/memberships/MembershipsWorkspace";

export const Route = createFileRoute("/_shell/members/freeze")({
  head: () => ({
    meta: [
      { title: "Freeze / Pause · PerformanceOS Admin" },
      { name: "description", content: "Freeze / Pause workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Freeze / Pause · PerformanceOS Admin" },
      { property: "og:description", content: "Freeze / Pause workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <MembershipsWorkspace initialTab="freezes" />,
});
