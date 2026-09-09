import { createFileRoute } from "@tanstack/react-router";
import { TenantsWorkspace } from "@/components/platform/TenantsWorkspace";

export const Route = createFileRoute("/_shell/platform/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants & Organizations · PerformanceOS Admin" },
      { name: "description", content: "Global multi-tenant governance and organization management." },
    ],
  }),
  component: TenantsWorkspace,
});
