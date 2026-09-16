import { createFileRoute } from "@tanstack/react-router";
import { AppointmentsWorkspace } from "@/components/appointments/AppointmentsWorkspace";

export const Route = createFileRoute("/_shell/ops/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments · PerformanceOS Admin" },
      { name: "description", content: "Assessments workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Assessments · PerformanceOS Admin" },
      { property: "og:description", content: "Assessments workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <AppointmentsWorkspace />,
});

