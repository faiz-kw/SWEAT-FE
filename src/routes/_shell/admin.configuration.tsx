import { createFileRoute } from "@tanstack/react-router";
import { ConfigurationWorkspace } from "@/components/admin/ConfigurationWorkspace";

export const Route = createFileRoute("/_shell/admin/configuration")({
  head: () => ({
    meta: [
      { title: "Business Configuration & Policies · PerformanceOS Admin" },
      { name: "description", content: "Operating hours, GST tax rates, booking policies, and grace periods." },
    ],
  }),
  component: ConfigurationWorkspace,
});
