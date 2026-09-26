import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Member360Workspace } from "@/components/members/Member360Workspace";

type Member360Search = {
  memberId?: string;
};

export const Route = createFileRoute("/_shell/members/client-360")({
  validateSearch: (search: Record<string, unknown>): Member360Search => {
    return {
      memberId: typeof search.memberId === "string" ? search.memberId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Member 360 · PerformanceOS" },
      { name: "description", content: "Comprehensive Member 360 Workspace in PerformanceOS." },
      { property: "og:title", content: "Member 360 · PerformanceOS" },
      { property: "og:description", content: "Comprehensive Member 360 Workspace in PerformanceOS." },
    ],
  }),
  component: Member360RouteComponent,
});

function Member360RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!search.memberId || search.memberId.trim() === "") {
      navigate({ to: "/members", replace: true });
    }
  }, [search.memberId, navigate]);

  if (!search.memberId || search.memberId.trim() === "") {
    return null;
  }

  return <Member360Workspace memberId={search.memberId.trim()} />;
}
