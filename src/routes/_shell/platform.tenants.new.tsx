import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/platform/tenants/new")({
  head: () => ({
    meta: [
      { title: "Onboard Tenant · PerformanceOS Admin" },
      { name: "description", content: "Onboard Tenant workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Onboard Tenant · PerformanceOS Admin" },
      { property: "og:description", content: "Onboard Tenant workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/platform/tenants/new" />,
});
