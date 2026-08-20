import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/computer-vision")({
  head: () => ({
    meta: [
      { title: "Computer Vision · PerformanceOS Admin" },
      { name: "description", content: "Computer Vision workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Computer Vision · PerformanceOS Admin" },
      { property: "og:description", content: "Computer Vision workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/computer-vision" />,
});
