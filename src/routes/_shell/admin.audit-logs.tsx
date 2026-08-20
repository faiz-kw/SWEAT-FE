import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs · PerformanceOS Admin" },
      { name: "description", content: "Audit Logs workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Audit Logs · PerformanceOS Admin" },
      { property: "og:description", content: "Audit Logs workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/audit-logs" />,
});
