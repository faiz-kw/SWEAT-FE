import { createFileRoute } from "@tanstack/react-router";
import { PhoneCall } from "lucide-react";
import { CRMUnconfiguredView } from "@/components/crm/common/CRMUnconfiguredView";

export const Route = createFileRoute("/_shell/crm/ai-calling")({
  head: () => ({
    meta: [
      { title: "AI Calling · PerformanceOS Admin" },
      { name: "description", content: "AI Voice Calling agent integration in PerformanceOS." },
      { property: "og:title", content: "AI Calling · PerformanceOS Admin" },
    ],
  }),
  component: () => (
    <CRMUnconfiguredView
      title="Autonomous AI Voice Calling"
      subtitle="Outbound voice bot for lead qualification, instant enquiry follow-ups, and trial attendance confirmation."
      icon={PhoneCall}
      badgeText="Provider Setup Required"
      heading="Voice AI Engine Not Configured"
      description="Autonomous AI outbound calling requires an active Sarvam AI voice provider integration and telephony gateway. Once provisioned in Platform Integrations, conversational voice workflows can be triggered directly from the CRM."
      note="No live voice telephony trunk is connected for this tenant. Direct manual calling and WhatsApp messaging remain available across Leads and Trial Management."
      actionText="Return to Leads"
      actionTo="/crm/leads"
    />
  ),
});
