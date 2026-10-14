import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Member360Workspace } from "@/components/members/Member360Workspace";

type Member360Search = {
  memberId?: string | undefined;
  tab?: string | undefined;
};

import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/members/client-360")({
  validateSearch: (search: Record<string, unknown>): Member360Search => {
    return {
      memberId: typeof search["memberId"] === "string" ? (search["memberId"] as string) : undefined,
      tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
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
  errorComponent: ({ error, reset }) => (
    <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[500px] text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Member Profile Error</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {error?.message || "An unexpected error occurred while loading this member's profile."}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        <Button onClick={() => reset()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  ),
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

  return <Member360Workspace memberId={search.memberId.trim()} initialTab={search.tab} />;
}

