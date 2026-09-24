import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/coaching/program-builder")({
  beforeLoad: () => {
    throw redirect({ to: "/coaching/trainers" });
  },
});
