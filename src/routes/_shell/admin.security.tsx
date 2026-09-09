import { createFileRoute } from "@tanstack/react-router";
import { SecurityWorkspace } from "@/components/admin/SecurityWorkspace";

export const Route = createFileRoute("/_shell/admin/security")({
  head: () => ({
    meta: [
      { title: "Security Policies & Access Control · PerformanceOS Admin" },
      { name: "description", content: "2FA requirements, session timeouts, and lockout rules." },
    ],
  }),
  component: SecurityWorkspace,
});
