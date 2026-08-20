import { createFileRoute } from "@tanstack/react-router";

import { ModuleView } from "@/components/shell/ModuleView";

export const Route = createFileRoute("/_shell/ai/trainer-copilot")({
  head: () => ({
    meta: [
      { title: "Trainer Copilot · PerformanceOS Admin" },
      { name: "description", content: "Trainer Copilot workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Trainer Copilot · PerformanceOS Admin" },
      { property: "og:description", content: "Trainer Copilot workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <ModuleView path="/ai/trainer-copilot" />,
});
