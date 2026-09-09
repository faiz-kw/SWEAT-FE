import { createFileRoute } from "@tanstack/react-router";
import { LocationsWorkspace } from "@/components/admin/LocationsWorkspace";

export const Route = createFileRoute("/_shell/admin/locations")({
  head: () => ({
    meta: [
      { title: "Studio Locations & Branches · PerformanceOS Admin" },
      { name: "description", content: "Studio facilities, capacities, operating hours, and branch directory." },
    ],
  }),
  component: LocationsWorkspace,
});
