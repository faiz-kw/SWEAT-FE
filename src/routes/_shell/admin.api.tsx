import { createFileRoute } from "@tanstack/react-router";
import { ApiWorkspace } from "@/components/admin/ApiWorkspace";

export const Route = createFileRoute("/_shell/admin/api")({
  head: () => ({
    meta: [
      { title: "Developer API & Webhooks · PerformanceOS Admin" },
      { name: "description", content: "API keys, HMAC signatures, and outbound webhook endpoints." },
    ],
  }),
  component: ApiWorkspace,
});
