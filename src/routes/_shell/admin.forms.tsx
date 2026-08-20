import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/forms")({
  head: () => ({
    meta: [
      { title: "Forms · PerformanceOS Admin" },
      { name: "description", content: "Forms workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Forms · PerformanceOS Admin" },
      { property: "og:description", content: "Forms workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/forms" />,
});
