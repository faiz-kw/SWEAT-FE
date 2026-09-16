import { createFileRoute } from "@tanstack/react-router";
import { TrainersWorkspace } from "@/components/trainers/TrainersWorkspace";

export const Route = createFileRoute("/_shell/ops/trainers")({
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
