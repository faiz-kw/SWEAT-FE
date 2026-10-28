import * as React from "react";
import { useAuth } from "@/contexts";
import { getAccessToken } from "@/api/auth/tokenManager";
import { InboundCallDrawer, type InboundCallPopupData } from "./InboundCallDrawer";
import { CallDispositionModal, type CallEndedData } from "./CallDispositionModal";
import { LeadDetailModal } from "@/components/crm/LeadDetailModal";
import { NewLeadModal } from "@/components/crm/NewLeadModal";
import { Member360Modal } from "@/components/members/modals/Member360Modal";
import { crmApi } from "@/api/endpoints/crmApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Web Audio API harmonic chime for incoming calls (no external assets needed)
function playHarmonicChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chord

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
    });
  } catch (err) {
    console.debug("[TelephonyManager] Audio chime unavailable:", err);
  }
}

export function TelephonyManager() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Active call popup & disposition
  const [activeCallPopup, setActiveCallPopup] = React.useState<InboundCallPopupData | null>(null);
  const [callEndedData, setCallEndedData] = React.useState<CallEndedData | null>(null);
  const [isDispositionOpen, setIsDispositionOpen] = React.useState<boolean>(false);

  // Modals state for Member, Lead, and New Prospect
  const [inspectMemberId, setInspectMemberId] = React.useState<string | null>(null);
  const [inspectMemberName, setInspectMemberName] = React.useState<string>("");
  const [inspectMemberNumber, setInspectMemberNumber] = React.useState<string>("");

  const [inspectLeadId, setInspectLeadId] = React.useState<string | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState<boolean>(false);
  const [newLeadPhone, setNewLeadPhone] = React.useState<string>("");

  // Fetch full Lead object when inspecting a lead
  const { data: fetchedLead } = useQuery({
    queryKey: ["lead-detail", inspectLeadId],
    queryFn: () => (inspectLeadId ? crmApi.getLead(inspectLeadId) : null),
    enabled: Boolean(inspectLeadId),
  });

  const lastPoppedSessionRef = React.useRef<string | null>(null);

  const handleIncomingCall = React.useCallback((data: InboundCallPopupData) => {
    if (!data || !data.session_id) return;
    if (lastPoppedSessionRef.current === data.session_id) return;
    lastPoppedSessionRef.current = data.session_id;

    console.log("[Telephony] Triggering incoming call popup:", data);
    setActiveCallPopup(data);
    playHarmonicChime();
    queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });

    // AUTOMATIC HIERARCHICAL MODAL DISPATCH:
    // 1. If caller is an existing Member -> open Member 360 Workspace Modal
    if (data.caller_type === "MEMBER" && data.member_id) {
      setInspectMemberId(data.member_id);
      setInspectMemberName(data.lead_name);
      setInspectMemberNumber(data.member_number || "");
      setInspectLeadId(null);
      setIsNewLeadOpen(false);
      toast.info(`Inbound Call: Member ${data.lead_name}`, {
        description: "Automatically opening Member 360 Profile...",
      });
    }
    // 2. If caller is an existing Lead -> open Lead 360 Modal
    else if (data.caller_type === "LEAD" && data.lead_id) {
      setInspectLeadId(String(data.lead_id));
      setInspectMemberId(null);
      setIsNewLeadOpen(false);
      toast.info(`Inbound Call: Lead ${data.lead_name}`, {
        description: "Automatically opening Lead 360 Profile...",
      });
    }
    // 3. If caller is New Prospect -> open Create Lead Modal
    else {
      setIsNewLeadOpen(true);
      setNewLeadPhone(data.caller_phone || "");
      setInspectMemberId(null);
      setInspectLeadId(null);
      toast.info(`Inbound Call: ${data.masked_phone}`, {
        description: "New caller detected. Opening Create Lead form...",
      });
    }
  }, [queryClient]);

  // Polling Fallback (every 2.5s) to guarantee screen-pop even if SSE reconnects
  useQuery({
    queryKey: ["active-inbound-call-poll"],
    queryFn: async () => {
      try {
        const token = getAccessToken();
        const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api/v1";
        const cleanBase = base.replace(/\/+$/, "");
        const res = await fetch(`${cleanBase}/tenant/crm/telephony/active/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json?.active && json?.session_id) {
          handleIncomingCall(json);
        }
        return json;
      } catch {
        return null;
      }
    },
    refetchInterval: 2500,
    enabled: Boolean(isAuthenticated && user),
  });

  React.useEffect(() => {
    if (!isAuthenticated || !user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const token = getAccessToken();
        const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api/v1";
        const cleanBase = base.replace(/\/+$/, "");
        const sseUrl = `${cleanBase}/tenant/crm/telephony/events/${token ? `?token=${encodeURIComponent(token)}` : ""}`;

        eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventSource.addEventListener("CONNECTED", (e: MessageEvent) => {
          console.debug("[Telephony SSE] Stream connected:", e.data);
          queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
        });

        // 1. Incoming Call Screen-Pop Event
        eventSource.addEventListener("INCOMING_CALL_POPUP", (e: MessageEvent) => {
          try {
            const data: InboundCallPopupData = JSON.parse(e.data);
            handleIncomingCall(data);
          } catch (parseErr) {
            console.error("Failed to parse incoming call payload:", parseErr);
          }
        });

        // 2. Call Ended -> Pop Mandatory Disposition Modal
        eventSource.addEventListener("CALL_ENDED", (e: MessageEvent) => {
          try {
            const data: CallEndedData = JSON.parse(e.data);
            console.log("[Telephony SSE] Call ended event:", data);
            setActiveCallPopup(null); // Dismiss incoming alert
            setCallEndedData(data);
            setIsDispositionOpen(true);
            queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
          } catch (parseErr) {
            console.error("Failed to parse call ended payload:", parseErr);
          }
        });

        // 3. Missed Call Event
        eventSource.addEventListener("MISSED_CALL", (e: MessageEvent) => {
          console.log("[Telephony SSE] Missed call notification:", e.data);
          queryClient.invalidateQueries({ queryKey: ["telephony-missed-calls"] });
          queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
        });

        eventSource.onerror = (err) => {
          console.debug("[Telephony SSE] Connection error/closed, retrying in 5s:", err);
          eventSource?.close();
          eventSource = null;
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.warn("[Telephony SSE] Failed to initialize SSE:", err);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [isAuthenticated, user, queryClient]);

  const handleOpenMember = (memberId: string) => {
    setInspectMemberId(memberId);
    setInspectLeadId(null);
    setIsNewLeadOpen(false);
  };

  const handleOpenLead = (leadId: string | number) => {
    setInspectLeadId(String(leadId));
    setInspectMemberId(null);
    setIsNewLeadOpen(false);
  };

  const handleOpenNewLead = (phone?: string) => {
    setIsNewLeadOpen(true);
    setNewLeadPhone(phone || "");
    setInspectMemberId(null);
    setInspectLeadId(null);
  };

  const handleDispositionComplete = () => {
    setIsDispositionOpen(false);
    setCallEndedData(null);
    queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["crm-dashboard"] });
  };

  return (
    <>
      {/* Real-Time Screen-Pop Notification */}
      <InboundCallDrawer
        call={activeCallPopup}
        onDismiss={() => setActiveCallPopup(null)}
        onOpenMember={handleOpenMember}
        onOpenLead={handleOpenLead}
        onOpenNewLead={handleOpenNewLead}
      />

      {/* Mandatory Post-Call Disposition Modal */}
      <CallDispositionModal
        isOpen={isDispositionOpen}
        callEndedData={callEndedData}
        onDispositionComplete={handleDispositionComplete}
      />

      {/* 1. Member 360 Workspace Modal for Existing Members */}
      {inspectMemberId && (
        <Member360Modal
          memberId={inspectMemberId}
          open={!!inspectMemberId}
          onOpenChange={(open) => {
            if (!open) setInspectMemberId(null);
          }}
          memberName={inspectMemberName}
          memberNumber={inspectMemberNumber}
        />
      )}

      {/* 2. Lead 360 Modal for Existing Leads */}
      {inspectLeadId && (
        <LeadDetailModal
          lead={fetchedLead || null}
          open={!!inspectLeadId}
          onOpenChange={(open) => {
            if (!open) setInspectLeadId(null);
          }}
        />
      )}

      {/* 3. Create Lead Modal for Brand New Callers */}
      <NewLeadModal
        open={isNewLeadOpen}
        onOpenChange={setIsNewLeadOpen}
        initialPhone={newLeadPhone}
        onSuccess={() => {
          setIsNewLeadOpen(false);
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }}
      />
    </>
  );
}
