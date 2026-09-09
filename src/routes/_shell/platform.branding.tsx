import { createFileRoute } from "@tanstack/react-router";
import { BrandingWorkspace } from "@/components/platform/BrandingWorkspace";

export const Route = createFileRoute("/_shell/platform/branding")({
  head: () => ({
    meta: [
      { title: "White Label & Brand Customization · PerformanceOS Admin" },
      { name: "description", content: "Custom domains, themes, logos, and white-label branding." },
    ],
  }),
  component: BrandingWorkspace,
});
