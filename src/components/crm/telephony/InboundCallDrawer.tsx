import * as React from "react";
import { PhoneCall, User, MapPin, FileText, ExternalLink, X, Headphones, UserCheck, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebRTCPhone } from "./WebRTCPhoneContext";
import { PhoneOff } from "lucide-react";

export interface InboundCallPopupData {
  session_id: string;
  call_uuid: string;
  caller_type: 'MEMBER' | 'LEAD' | 'NEW';
  member_id?: string | null;
  member_number?: string | null;
  lead_id?: string | number | null;
  caller_phone?: string;
  masked_phone: string;
  lead_name: string;
  branch: string;
  status: string;
  membership_package?: string | null;
  last_note?: string;
  auto_open?: boolean;
}

interface InboundCallDrawerProps {
  call: InboundCallPopupData | null;
  onDismiss: () => void;
  onOpenMember: (memberId: string) => void;
  onOpenLead: (leadId: string | number) => void;
  onOpenNewLead: (phone?: string) => void;
}

export function InboundCallDrawer({
  call,
  onDismiss,
  onOpenMember,
  onOpenLead,
  onOpenNewLead,
}: InboundCallDrawerProps) {
  if (!call) return null;

  const { callState, answerCall, declineCall, hangupCall, activeCall } = useWebRTCPhone();
  const isMember = call.caller_type === 'MEMBER';
  const isLead = call.caller_type === 'LEAD';
  const isNew = call.caller_type === 'NEW';
  const isRinging = callState === 'RINGING_INBOUND';
  const isInCall = callState === 'CONNECTED';

  return (
    <div
      className="fixed top-16 right-3 sm:right-6 left-3 sm:left-auto sm:w-[420px] max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl border-2 border-emerald-500/40 bg-card/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-emerald-500/10 text-card-foreground overflow-hidden animate-in slide-in-from-top-4 duration-300"
      role="alert"
      aria-live="assertive"
    >
      {/* Top Banner: Pulsing Call Indicator */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
            <PhoneCall className="size-4 text-emerald-500 animate-bounce" />
            <span>
              {isMember ? "Incoming Member Call" : (isLead ? "Incoming Lead Call" : "Incoming Inbound Call")}
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Dismiss alert"
          aria-label="Dismiss alert"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Prospect / Member Context */}
      <div className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-base text-foreground flex items-center gap-1.5 min-w-0">
              {isMember ? (
                <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <User className="size-4 text-primary shrink-0" />
              )}
              <span className="truncate" title={call.lead_name}>{call.lead_name}</span>
            </div>
            <div className="text-xs font-mono text-muted-foreground tracking-wider mt-0.5">
              {call.masked_phone}
            </div>
          </div>
          <Badge
            variant="outline"
            title={call.status}
            className={`max-w-[170px] truncate text-[11px] font-semibold shrink-0 py-0.5 px-2 ${
              isMember
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : isLead
                ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span className="truncate">{call.status}</span>
          </Badge>
        </div>

        {/* Location / Branch */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate font-medium">{call.branch || "General Inquiries"}</span>
        </div>

        {/* Recent Note / Context Excerpt */}
        {call.last_note ? (
          <div className="rounded-xl bg-muted/50 p-2.5 border border-border/50 text-xs">
            <div className="flex items-center gap-1 font-semibold text-muted-foreground mb-1">
              <FileText className="size-3" />
              <span>Last Interaction Note:</span>
            </div>
            <p className="line-clamp-2 text-foreground/90 italic">"{call.last_note}"</p>
          </div>
        ) : null}

        {/* In-Browser WebRTC Direct Call Controls */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Headphones className="size-4 shrink-0 text-emerald-600 animate-pulse" />
            <span>{isInCall ? "WebRTC Call Connected" : (isRinging ? "Ringing in Browser..." : "Ready to answer in Browser")}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isInCall ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={hangupCall}
                className="h-7 px-3 text-xs font-bold gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                <PhoneOff className="size-3" /> Hang Up
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={answerCall}
                  className="h-7 px-3 text-xs font-bold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30"
                >
                  <PhoneCall className="size-3" /> Answer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={declineCall}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-500"
                >
                  Decline
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="text-xs font-semibold h-8"
        >
          Dismiss
        </Button>

        {isMember && call.member_id && (
          <Button
            size="sm"
            onClick={() => onOpenMember(call.member_id!)}
            className="text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          >
            <UserCheck className="size-3.5" />
            Open Member 360
          </Button>
        )}

        {isLead && call.lead_id && (
          <Button
            size="sm"
            onClick={() => onOpenLead(call.lead_id!)}
            className="text-xs font-bold gap-1.5 h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
          >
            <ExternalLink className="size-3.5" />
            Open Lead Profile
          </Button>
        )}

        {isNew && (
          <Button
            size="sm"
            onClick={() => onOpenNewLead(call.caller_phone)}
            className="text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          >
            <UserPlus className="size-3.5" />
            Create Lead
          </Button>
        )}
      </div>
    </div>
  );
}
