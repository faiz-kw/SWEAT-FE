import { createFileRoute } from "@tanstack/react-router";
import { RenewalsWorkspace } from "@/components/members/RenewalsWorkspace";

export const Route = createFileRoute("/_shell/members/renewals")({
  head: () => ({
    meta: [
      { title: "Renewals · PerformanceOS Admin" },
      { name: "description", content: "Authoritative renewals workspace in the PerformanceOS fitness business operating system." },
      { property: "og:title", content: "Renewals · PerformanceOS Admin" },
      { property: "og:description", content: "Authoritative renewals workspace in the PerformanceOS fitness business operating system." },
    ],
  }),
  component: () => <RenewalsWorkspace />,
});