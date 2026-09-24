import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/ops/pilates")({
  beforeLoad: () => {
    throw redirect({ to: "/ops/classes" });
  },
  component: () => null,
});
