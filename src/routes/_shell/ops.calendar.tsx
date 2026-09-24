import { createFileRoute } from "@tanstack/react-router";
import { CalendarWorkspace } from "@/components/calendar/CalendarWorkspace";

export const Route = createFileRoute("/_shell/ops/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar · PerformanceOS Admin" },
      { name: "description", content: "Calendar workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Calendar · PerformanceOS Admin" },
      { property: "og:description", content: "Calendar workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <CalendarWorkspace />,
});

