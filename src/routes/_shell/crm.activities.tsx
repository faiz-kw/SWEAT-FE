import { createFileRoute } from "@tanstack/react-router";
import { SalesActivitiesWorkspace } from "@/components/crm/SalesActivitiesWorkspace";

export const Route = createFileRoute("/_shell/crm/activities")({
  head: () => ({
    meta: [
      { title: "Sales Activities · PerformanceOS Admin" },
      { name: "description", content: "Real customer outreach logs, calls, WhatsApp touchpoints, and studio visits." },
      { property: "og:title", content: "Sales Activities · PerformanceOS Admin" },
      { property: "og:description", content: "Real customer outreach logs, calls, WhatsApp touchpoints, and studio visits." },
    ],
  }),
  component: () => <SalesActivitiesWorkspace />,
});
