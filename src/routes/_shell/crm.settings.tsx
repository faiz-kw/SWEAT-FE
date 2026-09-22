import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/crm/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/crm/setup" });
  },
  component: () => null,
});

