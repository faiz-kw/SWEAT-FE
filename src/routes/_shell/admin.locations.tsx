import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/locations")({
  head: () => ({
    meta: [
      { title: "Locations · PerformanceOS Admin" },
      { name: "description", content: "Locations workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Locations · PerformanceOS Admin" },
      { property: "og:description", content: "Locations workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/locations" />,
});
