import { createFileRoute } from "@tanstack/react-router";
import { CmsWorkspace } from "@/components/admin/CmsWorkspace";

export const Route = createFileRoute("/_shell/admin/cms")({
  head: () => ({
    meta: [
      { title: "Content Management (CMS) · PerformanceOS Admin" },
      { name: "description", content: "Manage home banners, category assets, and media library for app." },
    ],
  }),
  component: CmsWorkspace,
});
