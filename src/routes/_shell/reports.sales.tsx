import { createFileRoute } from "@tanstack/react-router";
import { TelephonyAnalyticsDashboard } from "@/components/crm/telephony/TelephonyAnalyticsDashboard";

export const Route = createFileRoute("/_shell/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales Calling Reports & Leaderboard – PerformanceOS Admin" },
      { name: "description", content: "Comprehensive Sales Telephony Calling Reports, Rep Leaderboard, and Connect Rate Analytics." },
      { property: "og:title", content: "Sales Calling Reports & Leaderboard – PerformanceOS Admin" },
      { property: "og:description", content: "Comprehensive Sales Telephony Calling Reports, Rep Leaderboard, and Connect Rate Analytics." },
    ],
  }),
  component: () => <TelephonyAnalyticsDashboard />,
});
