import { createFileRoute } from "@tanstack/react-router";
import { TenantOnboardingWizard } from "@/components/platform/TenantOnboardingWizard";

export const Route = createFileRoute("/_shell/platform/onboard")({
  head: () => ({
    meta: [
      { title: "Onboard Tenant Organization · PerformanceOS Admin" },
      { name: "description", content: "Interactive multi-step tenant provisioning wizard." },
    ],
  }),
  component: TenantOnboardingWizard,
});
