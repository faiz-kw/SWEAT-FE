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
          <AlertTitle className="font-semibold text-sm">Calling Setup in Progress</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm mt-1 leading-relaxed">
            AI calling controls are ready in <strong>Lead 360</strong>. Telephone line and system connections are currently being set up. You can view lead details and check permissions now, but calls cannot be placed until setup is complete.
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
                  Ready to Use
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Calling a Lead</CardTitle>
              <CardDescription className="text-xs">
                How staff can place an individual AI call from the lead profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground flex-1">
              <p>
                Follow these simple steps to start a call:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-foreground/80">
                <li>Go to <strong>CRM &rarr; Leads</strong>.</li>
                <li>Click on any person to open their profile.</li>
                <li>Click the <strong>Call with AI</strong> button at the top.</li>
                <li>Check permission status and confirm before calling.</li>
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
                    Open Leads List
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
                  Saved on Profile
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Call Records &amp; History</CardTitle>
              <CardDescription className="text-xs">
                Where to review call outcomes and staff notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground flex-1">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1 text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Logged Directly on Each Lead
                </div>
                <p>
                  Every call placed is automatically recorded on the person&apos;s activity timeline.
                </p>
              </div>
              <p className="text-xs">
                Open any lead in <strong>Lead 360</strong> to see call timestamps, AI conversation summaries, and outcomes under their <strong>Timeline</strong> tab.
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
                  Protected
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold mt-3">Call Safety Rules</CardTitle>
              <CardDescription className="text-xs">
                Built-in protections to ensure respectful communication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground flex-1">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">Permission to Call:</strong>
                  <span className="text-xs block text-muted-foreground">Calls are only allowed when the person has given permission. Ask before calling.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">Do Not Contact Respected:</strong>
                  <span className="text-xs block text-muted-foreground">Anyone marked Do Not Contact is automatically blocked from receiving calls.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground text-xs">No Spam or Duplicate Calls:</strong>
                  <span className="text-xs block text-muted-foreground">Calls require staff initiation and duplicate calls to the same person are prevented.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Details */}
        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Service Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Provider</span>
                <span className="font-semibold text-foreground text-xs">Sarvam AI Voice</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Staff Access</span>
                <span className="font-medium text-foreground text-xs">Lead Edit Permission</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Call Logging</span>
                <span className="font-medium text-foreground text-xs">Automatic Timeline Sync</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-muted-foreground block text-[11px]">Line Status</span>
                <span className="font-medium text-amber-600 dark:text-amber-400 text-xs">Setup in Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
