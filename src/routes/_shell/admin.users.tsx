import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/admin/users")({
  head: () => ({
    meta: [
      { title: "Users · PerformanceOS Admin" },
      { name: "description", content: "Users workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Users · PerformanceOS Admin" },
      { property: "og:description", content: "Users workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/admin/users" />,
});
