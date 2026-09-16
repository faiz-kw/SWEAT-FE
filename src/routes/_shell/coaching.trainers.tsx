import { createFileRoute } from "@tanstack/react-router";
import { TrainersWorkspace } from "@/components/trainers/TrainersWorkspace";

export const Route = createFileRoute("/_shell/coaching/trainers")({
  head: () => ({
    meta: [
      { title: "Trainers & Workforce · PerformanceOS" },
      { name: "description", content: "Trainers and workforce workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trainers & Workforce · PerformanceOS" },
      { property: "og:description", content: "Trainers and workforce workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <TrainersWorkspace />,
});
