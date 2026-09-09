import { createFileRoute } from "@tanstack/react-router";
import { UsersWorkspace } from "@/components/admin/UsersWorkspace";

export const Route = createFileRoute("/_shell/admin/users")({
  head: () => ({
    meta: [
      { title: "Staff & User Management · PerformanceOS Admin" },
      { name: "description", content: "Team members, roles, locations, and invitations." },
    ],
  }),
  component: UsersWorkspace,
});
