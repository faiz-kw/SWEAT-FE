import { createFileRoute, redirect } from "@tanstack/react-router";
import { TrainersWorkspace } from "@/components/trainers/TrainersWorkspace";
import { getCurrentUser } from "@/services";
import { isTrainerUser } from "@/lib/nav";

export const Route = createFileRoute("/_shell/ops/trainers")({
  beforeLoad: () => {
    const user = getCurrentUser();
    if (user && isTrainerUser(user)) {
      throw redirect({ to: "/ops/calendar" });
    }
  },
  head: () => ({
    meta: [
      { title: "Trainers Operations · PerformanceOS" },
      { name: "description", content: "Trainers operations workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trainers Operations · PerformanceOS" },
      { property: "og:description", content: "Trainers operations workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <TrainersWorkspace />,
});
