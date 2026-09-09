import { createFileRoute } from "@tanstack/react-router";
import { PlansWorkspace } from "@/components/platform/PlansWorkspace";

export const Route = createFileRoute("/_shell/platform/plans")({
  head: () => ({
    meta: [
      { title: "SaaS Plans & Modules · PerformanceOS Admin" },
      { name: "description", content: "Platform subscription plans and feature quotas." },
    ],
  }),
  component: PlansWorkspace,
});
