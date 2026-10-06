import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/outstanding")({
  head: () => ({
    meta: [
      { title: "Outstanding · SWEAT Finance" },
      { name: "description", content: "Outstanding workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="outstanding" />,
});
