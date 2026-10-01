import { createFileRoute } from "@tanstack/react-router";

import { FormsWorkspace } from "@/components/admin/FormsWorkspace";

export const Route = createFileRoute("/_shell/admin/forms")({
  head: () => ({
    meta: [
      { title: "Forms & Assessments · PerformanceOS Admin" },
      { name: "description", content: "Forms and dynamic questionnaires workspace in PerformanceOS." },
      { property: "og:title", content: "Forms & Assessments · PerformanceOS Admin" },
      { property: "og:description", content: "Forms and dynamic questionnaires workspace in PerformanceOS." },
    ],
  }),
  component: () => <FormsWorkspace />,
});
