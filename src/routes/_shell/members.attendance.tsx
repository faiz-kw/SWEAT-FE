import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/members/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance · PerformanceOS Admin" },
      { name: "description", content: "Attendance workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Attendance · PerformanceOS Admin" },
      { property: "og:description", content: "Attendance workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/members/attendance" />,
});
