import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/admin/leave-approvals")({
  beforeLoad: () => {
    throw redirect({ to: "/automation/approvals" });
  },
});
