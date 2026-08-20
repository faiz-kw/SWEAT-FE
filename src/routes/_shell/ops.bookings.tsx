import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ops/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings · PerformanceOS Admin" },
      { name: "description", content: "Bookings workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Bookings · PerformanceOS Admin" },
      { property: "og:description", content: "Bookings workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ops/bookings" />,
});
