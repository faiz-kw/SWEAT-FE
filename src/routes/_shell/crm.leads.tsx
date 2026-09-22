import { createFileRoute } from "@tanstack/react-router";
import { LeadsWorkspace } from "@/components/crm/LeadsWorkspace";

export const Route = createFileRoute("/_shell/crm/leads")({
  head: () => ({
    meta: [
      { title: "Leads & Prospects · PerformanceOS Admin" },
      { name: "description", content: "Commercial prospect directory and lead intake in PerformanceOS." },
      { property: "og:title", content: "Leads & Prospects · PerformanceOS Admin" },
    ],
  }),
  component: () => <LeadsWorkspace initialViewMode="LIST" />,
});
