import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Bot, 
  PhoneCall, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Database, 
  Info,
  CheckCircle2,
  Users
} from "lucide-react";
import { CRMPageHeader } from "@/components/crm/common/CRMPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_shell/crm/ai-calling")({
  head: () => ({
    meta: [
      { title: "AI Voice Calling · SWEAT CRM" },
      { name: "description", content: "Sarvam AI Voice calling engine status, operational guardrails, and lead calling controls." },
      { property: "og:title", content: "AI Voice Calling · SWEAT CRM" },
    ],
  }),
  component: AICallingPage,
});

function AICallingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <CRMPageHeader
        title="Sarvam AI Voice Calling"
        subtitle="Single-contact conversational outbound calling powered by Sarvam AI Voice Agents."
        icon={PhoneCall}
        badgeText="Lead 360 Integrated"
        actions={
          <Button
            asChild
            size="sm"
            className="gap-2 font-semibold shadow-xs"
          >
            <Link to="/crm/leads">
              <Users className="w-4 h-4" />
              <span>Open Leads Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        }
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Readiness Banner */}
        <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-sm">Deployment & Configuration Notice</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm mt-1 leading-relaxed">
            The frontend calling interface is active in <strong>Lead 360</strong>. However, the backend database migration (<code className="font-mono bg-muted/60 px-1 py-0.5 rounded text-xs">0055_crm_call_session</code>) and live Sarvam provider telephony credentials are pending production deployment. Attempting calls will safely return standard status codes (<code className="font-mono text-xs">503 Migration Pending</code> or <code className="font-mono text-xs">400 Provider Unconfigured</code>).
          </AlertDescription>
        </Alert>

        {/* 3-Column Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: How Calling Works */}
          <Card className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  Manual Trigger Ready
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Manual Lead 360 Calling</CardTitle>
              <CardDescription className="text-xs">
                Staff-directed single outbound calls via Sarvam Voice Agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground flex-1">
              <p>
                To initiate an AI call with a lead:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-foreground/80">
                <li>Navigate to <strong>CRM &rarr; Leads</strong>.</li>
                <li>Click on any lead record to open <strong>Lead 360</strong>.</li>
                <li>Click the <strong>Call with AI</strong> action in the top header.</li>
                <li>Review the recipient phone number and confirm the call.</li>
              </ol>
              <div className="pt-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium gap-1.5"
                >
                  <Link to="/crm/leads">
                    <Users className="w-3.5 h-3.5" />
                    View Leads List
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Call History Status */}
          <Card className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                  Per-Lead History Only
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Call Session History</CardTitle>
              <CardDescription className="text-xs">
                Real-time activity logs and lifecycle timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground flex-1">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1 text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Global Call Queue Not Yet Available
                </div>
                <p>
                  A tenant-wide aggregate call history API is not yet provisioned on the backend. Call history is not fabricated here.
                </p>
              </div>
              <p className="text-xs">
                All initiated calls produce verified <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">VOICE_CALL</code> records within each individual contact&apos;s <strong>Unified Timeline</strong> in Lead 360, complete with Session ID, status, and provider attempt reference.
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Safety Guardrails */}
          <Card className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30">
                  Strict Compliance
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Safety & Compliance Guardrails</CardTitle>
              <CardDescription className="text-xs">
                Protection against unconsented or duplicate calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground flex-1">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">No Automatic Calling:</strong>
                  <span className="text-xs block text-muted-foreground">All calls require manual human initiation. Background or bulk triggers are prohibited.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">Consent & DNC Enforcement:</strong>
                  <span className="text-xs block text-muted-foreground">Opted-out or Do-Not-Contact leads are automatically disabled and rejected.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">Concurrency & Idempotency:</strong>
                  <span className="text-xs block text-muted-foreground">Concurrent duplicate calls to the same lead return 409 Conflict; replays are safe.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Architecture & API Details */}
        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Technical Architecture & Integration Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Backend Endpoint</span>
                <span className="font-mono font-medium text-foreground text-xs">POST /api/v1/tenant/leads/&#123;id&#125;/call/</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Required RBAC Permission</span>
                <span className="font-mono font-medium text-foreground text-xs">crm.leads.edit</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Webhook Endpoint</span>
                <span className="font-mono font-medium text-foreground text-xs">POST /api/v1/communication/webhook/sarvam/</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Tenant Migration</span>
                <span className="font-mono font-medium text-amber-600 dark:text-amber-400 text-xs">0055_crm_call_session (Pending)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
