import { createFileRoute } from "@tanstack/react-router";
import { LeadsWorkspace } from "@/components/crm/LeadsWorkspace";

type LeadsSearch = {
  lead_id?: string;
  search?: string;
  status?: string;
};

export const Route = createFileRoute("/_shell/crm/leads")({
  validateSearch: (search: Record<string, unknown>): LeadsSearch => ({
    lead_id: typeof search.lead_id === 'string' ? search.lead_id : undefined,
    search: typeof search.search === 'string' ? search.search : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leads & Prospects · PerformanceOS Admin" },
      { name: "description", content: "Commercial prospect directory and lead intake in PerformanceOS." },
      { property: "og:title", content: "Leads & Prospects · PerformanceOS Admin" },
    ],
  }),
  component: () => <LeadsWorkspace initialViewMode="LIST" />,
});
