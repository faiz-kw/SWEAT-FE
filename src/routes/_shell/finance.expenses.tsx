import { createFileRoute } from "@tanstack/react-router";
import { CommerceWorkspace } from "@/components/commerce/CommerceWorkspace";

export const Route = createFileRoute("/_shell/finance/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses · SWEAT Finance" },
      { name: "description", content: "Expenses workspace in SWEAT Finance." },
    ],
  }),
  component: () => <CommerceWorkspace initialTab="expenses" />,
});
