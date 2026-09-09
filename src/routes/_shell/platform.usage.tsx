import { createFileRoute } from "@tanstack/react-router";
import { UsageWorkspace } from "@/components/platform/UsageWorkspace";

export const Route = createFileRoute("/_shell/platform/usage")({
  head: () => ({
    meta: [
      { title: "Tenant Resource Usage · PerformanceOS Admin" },
      { name: "description", content: "Resource consumption and limits monitoring." },
    ],
  }),
  component: UsageWorkspace,
});
