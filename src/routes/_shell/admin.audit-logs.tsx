import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsWorkspace } from "@/components/admin/AuditLogsWorkspace";

export const Route = createFileRoute("/_shell/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs & Security Stream · PerformanceOS Admin" },
      { name: "description", content: "Cryptographically timestamped action logs and IP tracking." },
    ],
  }),
  component: AuditLogsWorkspace,
});
