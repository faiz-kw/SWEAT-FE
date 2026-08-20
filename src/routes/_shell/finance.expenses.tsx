import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/finance/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses · PerformanceOS Admin" },
      { name: "description", content: "Expenses workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Expenses · PerformanceOS Admin" },
      { property: "og:description", content: "Expenses workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/finance/expenses" />,
});
