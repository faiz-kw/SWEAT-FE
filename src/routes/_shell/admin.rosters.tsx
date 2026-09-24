import { createFileRoute } from "@tanstack/react-router";
import { WorkforceRostersWorkspace } from "@/components/admin/WorkforceRostersWorkspace";

export const Route = createFileRoute("/_shell/admin/rosters")({
  head: () => ({
    meta: [
      { title: "Staff Rosters & Shift Scheduling · PerformanceOS Admin" },
      { name: "description", content: "Manage staff recurring work shifts, week-offs, and multi-branch allocations." },
    ],
  }),
  component: WorkforceRostersWorkspace,
});
