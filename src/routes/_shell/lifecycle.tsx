import { createFileRoute } from "@tanstack/react-router";

import { Lifecycle } from "@/modules/Lifecycle";

export const Route = createFileRoute("/_shell/lifecycle")({
  head: () => ({
    meta: [
      { title: "Member Lifecycle · PerformanceOS Admin" },
      {
        name: "description",
        content:
          "End-to-end member journey from lead and AI calling through trial, assessment, program, training and renewal.",
      },
      { property: "og:title", content: "Member Lifecycle · PerformanceOS Admin" },
      {
        property: "og:description",
        content: "Lead to renewal lifecycle intelligence across CRM, operations and finance records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lifecycle,
});
