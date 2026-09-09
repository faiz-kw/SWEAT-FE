import { createFileRoute } from "@tanstack/react-router";
import { PermissionsWorkspace } from "@/components/admin/PermissionsWorkspace";

export const Route = createFileRoute("/_shell/admin/permissions")({
  head: () => ({
    meta: [
      { title: "RBAC Permissions Matrix · PerformanceOS Admin" },
      { name: "description", content: "Granular capability matrix and role assignments." },
    ],
  }),
  component: PermissionsWorkspace,
});
