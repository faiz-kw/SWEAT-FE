import { createFileRoute } from "@tanstack/react-router";

import { SectionOverview } from "@/modules/SectionOverview";

export const Route = createFileRoute("/_shell/overview/$section")({
  head: () => ({
    meta: [
      { title: "Module Overviews · PerformanceOS Admin" },
      {
        name: "description",
        content: "Status counts, recent records and quick actions for every operating module in the console.",
      },
      { property: "og:title", content: "Module Overviews · PerformanceOS Admin" },
      {
        property: "og:description",
        content: "Section-level operating overview across CRM, members, operations, finance and AI modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverviewRoute,
});

function OverviewRoute() {
  const { section } = Route.useParams();
  return <SectionOverview sectionId={section} />;
}
