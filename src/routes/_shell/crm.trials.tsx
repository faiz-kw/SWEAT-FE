import { createFileRoute } from "@tanstack/react-router";
import { TrialManagementWorkspace } from "@/components/crm/TrialManagementWorkspace";

export const Route = createFileRoute("/_shell/crm/trials")({
  head: () => ({
    meta: [
      { title: "Trial Management · PerformanceOS Admin" },
      { name: "description", content: "Trial Management workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trial Management · PerformanceOS Admin" },
      { property: "og:description", content: "Trial Management workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <TrialManagementWorkspace />,
});

