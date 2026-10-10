import { createFileRoute } from "@tanstack/react-router";
import { WODContentLibraryWorkspace } from "@/components/wod/WODContentLibraryWorkspace";

export const Route = createFileRoute("/_shell/wod/content-library")({
  head: () => ({
    meta: [
      { title: "WOD Content Library · PerformanceOS Admin" },
      {
        name: "description",
        content: "Admin-only Workout of the Day (WOD) Content Library, configurable multi-group tags, video storage, and Excel import.",
      },
      { property: "og:title", content: "WOD Content Library · PerformanceOS Admin" },
    ],
  }),
  component: () => <WODContentLibraryWorkspace />,
});
