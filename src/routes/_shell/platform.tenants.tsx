import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants · PerformanceOS Admin" },
      { name: "description", content: "Tenants workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Tenants · PerformanceOS Admin" },
      { property: "og:description", content: "Tenants workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/tenants" />,
});
