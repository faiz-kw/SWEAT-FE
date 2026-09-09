import { createFileRoute } from "@tanstack/react-router";
import { ServicesWorkspace } from "@/components/admin/ServicesWorkspace";

export const Route = createFileRoute("/_shell/admin/services")({
  head: () => ({
    meta: [
      { title: "Services & Offerings Catalog · PerformanceOS Admin" },
      { name: "description", content: "Personal training, pilates, spa, and studio offerings." },
    ],
  }),
  component: ServicesWorkspace,
});
