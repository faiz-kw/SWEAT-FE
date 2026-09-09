import { createFileRoute } from "@tanstack/react-router";
import { RolesWorkspace } from "@/components/admin/RolesWorkspace";

export const Route = createFileRoute("/_shell/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Access Control · PerformanceOS Admin" },
      { name: "description", content: "Role definitions, permissions, and assigned capabilities." },
    ],
  }),
  component: RolesWorkspace,
});

