import { createFileRoute } from "@tanstack/react-router";
import { LeadsWorkspace } from "@/components/crm/LeadsWorkspace";

export const Route = createFileRoute("/_shell/crm/pipeline")({
  head: () => ({
    meta: [
      { title: "Visual Sales Pipeline · PerformanceOS Admin" },
      { name: "description", content: "Visual sales pipeline and deal Kanban board in PerformanceOS." },
      { property: "og:title", content: "Visual Sales Pipeline · PerformanceOS Admin" },
    ],
  }),
  component: () => <LeadsWorkspace initialViewMode="PIPELINE" />,
});
