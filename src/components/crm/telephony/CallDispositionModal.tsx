import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneOff, Clock, ShieldCheck, Calendar, CheckCircle2, MessageSquare, Send, Sparkles } from "lucide-react";
import { crmApi } from "@/api/endpoints/crmApi";
import { toast } from "sonner";

export interface CallEndedData {
  session_id: string;
  lead_id?: string | number | null;
  duration?: number;
  bill_duration?: number;
  is_meaningful?: boolean;
  recording_url?: string;
  lead_name?: string;
}

interface CallDispositionModalProps {
  callEndedData: CallEndedData | null;
  isOpen: boolean;
  onDispositionComplete: () => void;
}

const DISPOSITION_OPTIONS = [
  { value: "TRIAL_BOOKED", label: "🌟 Trial Booked (Advances to Trial Scheduled)", color: "text-emerald-500 font-bold" },
  { value: "CALLBACK_REQUESTED", label: "📞 Callback Requested", color: "text-blue-500 font-semibold" },
  { value: "INTERESTED", label: "🔥 Interested / High Intent Prospect", color: "text-amber-500 font-semibold" },
  { value: "FOLLOW_UP_NEEDED", label: "⏳ Follow-up Needed (Thinking it over)", color: "text-indigo-500" },
  { value: "PRICE_OBJECTION", label: "💸 Price Objection / Budget Constraint", color: "text-orange-500" },
  { value: "LOCATION_OBJECTION", label: "📍 Location / Travel Distance Objection", color: "text-orange-500" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested / Dropped", color: "text-rose-500" },
  { value: "NO_ANSWER", label: "📵 No Answer / Unreachable", color: "text-muted-foreground" },
  { value: "BUSY", label: "⚠️ Busy / Call Rejected", color: "text-muted-foreground" },
  { value: "SWITCHED_OFF", label: "📵 Switched Off / Network Unavailable", color: "text-muted-foreground" },
  { value: "WRONG_NUMBER", label: "🚫 Wrong / Invalid Number", color: "text-red-500" },
];

export function CallDispositionModal({
  callEndedData,
  isOpen,
  onDispositionComplete,
}: CallDispositionModalProps) {
  const [disposition, setDisposition] = React.useState<string>("TRIAL_BOOKED");
  const [notes, setNotes] = React.useState<string>("");
  const [followupDate, setFollowupDate] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [sendWhatsApp, setSendWhatsApp] = React.useState<boolean>(true);
  const [whatsappMsg, setWhatsappMsg] = React.useState<string>("");

  const leadFirstName = React.useMemo(() => {
    return callEndedData?.lead_name?.split(' ')[0] || 'there';
  }, [callEndedData?.lead_name]);

  // Set default WhatsApp message whenever lead changes
  React.useEffect(() => {
    setWhatsappMsg(
      `Hi ${leadFirstName}, I tried reaching you from SWEAT Elite regarding your fitness inquiry. When is a convenient time to speak?`
    );
  }, [leadFirstName]);

  // Check if disposition is an unanswered / busy scenario
  const isUnansweredOutcome = React.useMemo(() => {
    return ["NO_ANSWER", "BUSY", "SWITCHED_OFF", "CALLBACK_REQUESTED"].includes(disposition);
  }, [disposition]);

  // Automatically enable WhatsApp toggle when user chooses No Answer or Busy
  React.useEffect(() => {
    if (isUnansweredOutcome) {
      setSendWhatsApp(true);
    }
  }, [isUnansweredOutcome]);

  // Format seconds to mm:ss
  const formatDuration = (totalSeconds?: number) => {
    if (!totalSeconds || totalSeconds <= 0) return "0s";
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const rawSeconds = callEndedData?.duration ?? 0;
  const billSeconds = callEndedData?.bill_duration ?? (Math.ceil((rawSeconds || 1) / 60) * 60);
  const isMeaningful = callEndedData?.is_meaningful ?? (rawSeconds >= 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callEndedData?.session_id) {
      toast.error("No active call session ID found.");
      return;
    }
    if (!disposition) {
      toast.error("Please select a call disposition outcome.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await crmApi.submitDisposition({
        session_id: callEndedData.session_id,
        disposition,
        disposition_notes: notes.trim(),
        followup_date: followupDate ? new Date(followupDate).toISOString() : undefined,
        send_whatsapp: isUnansweredOutcome ? sendWhatsApp : false,
        whatsapp_message: isUnansweredOutcome && sendWhatsApp ? whatsappMsg.trim() : undefined,
      });

      if (res.whatsapp_sent) {
        toast.success(
          `Call logged and WhatsApp follow-up delivered to ${leadFirstName}! Presence reset to Available.`
        );
      } else {
        toast.success("Call disposition logged. Softphone presence reset to Available.");
      }

      setNotes("");
      setFollowupDate("");
      onDispositionComplete();
    } catch (err: any) {
      console.error("Failed to submit call disposition:", err);
      toast.error(err?.response?.data?.error || err.message || "Failed to submit disposition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !callEndedData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-card p-4 sm:p-6 shadow-2xl text-card-foreground"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <PhoneOff className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Call Concluded · Mandatory Disposition
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Logged in WRAP-UP mode. Enter the call outcome before returning to Available.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Call Summary Metrics Strip */}
        <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-muted/40 p-3 border border-border/60 text-center my-1">
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Talk Time</div>
            <div className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
              <Clock className="size-3 text-primary" />
              {formatDuration(rawSeconds)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Billable Pulse</div>
            <div className="text-sm font-bold text-foreground">
              {formatDuration(billSeconds)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Meaningful?</div>
            <div>
              {isMeaningful ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  Yes (≥30s)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                  Short (&lt;30s)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Lead Context info */}
        {callEndedData.lead_name && (
          <div className="text-xs font-semibold text-foreground flex items-center justify-between px-1">
            <span className="text-muted-foreground">Prospect / Lead:</span>
            <span className="font-bold text-primary">{callEndedData.lead_name}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Outcome / Disposition Select */}
          <div className="space-y-1.5">
            <Label htmlFor="disposition-select" className="text-xs font-bold text-foreground flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary" />
              Call Outcome / Disposition <span className="text-rose-500">*</span>
            </Label>
            <Select value={disposition} onValueChange={setDisposition}>
              <SelectTrigger id="disposition-select" className="h-10 text-xs rounded-xl font-medium">
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {DISPOSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={`text-xs py-2 ${opt.color}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up Date/Time (conditional or optional) */}
          {(disposition === "CALLBACK_REQUESTED" || disposition === "FOLLOW_UP_NEEDED" || disposition === "INTERESTED") && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label htmlFor="followup-datetime" className="text-xs font-bold text-foreground flex items-center gap-1">
                <Calendar className="size-3.5 text-blue-500" />
                Schedule Follow-up Date & Time
              </Label>
              <Input
                id="followup-datetime"
                type="datetime-local"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          )}

          {/* Automated WhatsApp Follow-up Card on Unanswered / Busy */}
          {isUnansweredOutcome && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <MessageSquare className="size-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Automated WhatsApp Outreach
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Gupshup / Meta Template: <code className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">sweat_call_missed_followup</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Switch
                    id="send-wa-switch"
                    checked={sendWhatsApp}
                    onCheckedChange={setSendWhatsApp}
                  />
                  <Label htmlFor="send-wa-switch" className="text-[11px] font-semibold cursor-pointer">
                    {sendWhatsApp ? "Auto-Send" : "Skip"}
                  </Label>
                </div>
              </div>

              {sendWhatsApp && (
                <div className="space-y-1.5 pt-1 border-t border-emerald-500/20">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Message to {leadFirstName}:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">1-Click Delivery</span>
                  </div>
                  <Textarea
                    rows={2}
                    value={whatsappMsg}
                    onChange={(e) => setWhatsappMsg(e.target.value)}
                    className="resize-none text-xs rounded-lg bg-background/80 border-emerald-500/30 focus-visible:ring-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Detailed Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="disposition-notes" className="text-xs font-bold text-foreground">
              Conversation Summary &amp; Next Steps
            </Label>
            <Textarea
              id="disposition-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call rang with no answer. Sent automated WhatsApp follow-up..."
              className="resize-none text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button
              type="submit"
              disabled={isSubmitting || !disposition}
              className="w-full h-10 font-bold text-xs gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              {isSubmitting 
                ? "Logging Outcome & Dispatching..." 
                : isUnansweredOutcome && sendWhatsApp
                ? "Save Disposition & Send WhatsApp"
                : "Save Disposition & Set Status Available"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
