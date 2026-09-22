import { createFileRoute } from "@tanstack/react-router";
import { CRMSettingsWorkspace } from "@/components/crm/settings/CRMSettingsWorkspace";

export const Route = createFileRoute("/_shell/crm/setup")({
  head: () => ({
    meta: [
      { title: "CRM Setup · PerformanceOS Admin" },
      { name: "description", content: "Tenant CRM setup: configurable lead sources, stage SLAs, trial reminders, and communication policies." },
      { property: "og:title", content: "CRM Setup · PerformanceOS Admin" },
      { property: "og:description", content: "Tenant CRM setup: configurable lead sources, stage SLAs, trial reminders, and communication policies." },
    ],
  }),
  component: () => <CRMSettingsWorkspace />,
});
