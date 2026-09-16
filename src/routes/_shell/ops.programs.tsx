import { createFileRoute } from "@tanstack/react-router";
import { PackagesWorkspace } from "@/components/catalog/PackagesWorkspace";

export const Route = createFileRoute("/_shell/ops/programs")({
  head: () => ({
    meta: [
      { title: "Programs & Packages · PerformanceOS Admin" },
      { name: "description", content: "Programs and commercial packages in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Programs & Packages · PerformanceOS Admin" },
      { property: "og:description", content: "Programs and commercial packages in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <PackagesWorkspace />,
});

