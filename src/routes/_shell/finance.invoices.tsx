import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/finance/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · PerformanceOS Admin" },
      { name: "description", content: "Invoices workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Invoices · PerformanceOS Admin" },
      { property: "og:description", content: "Invoices workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/finance/invoices" />,
});
