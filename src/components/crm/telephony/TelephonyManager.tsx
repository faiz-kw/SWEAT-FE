import * as React from "react";
import { useAuth } from "@/contexts";
import { getAccessToken } from "@/api/auth/tokenManager";
import { InboundCallDrawer, type InboundCallPopupData } from "./InboundCallDrawer";
import { useWebRTCPhone } from "./WebRTCPhoneContext";
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
  const { callState, lastEndedCall, clearLastEndedCall, activeCall } = useWebRTCPhone();

  // Active call popup & disposition state (declared at top before effects)
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

  // Deduplication & tracking refs
  const disposedSessionsRef = React.useRef<Set<string>>(new Set());
  const isDispositionOpenRef = React.useRef<boolean>(false);
  const callEndedDataRef = React.useRef<CallEndedData | null>(null);
  const lastPoppedSessionRef = React.useRef<string | null>(null);
  const lastActiveCallPopupRef = React.useRef<InboundCallPopupData | null>(null);
  const pendingInboundProfileRef = React.useRef<InboundCallPopupData | null>(null);
  const prevCallStateRef = React.useRef(callState);

  React.useEffect(() => {
    isDispositionOpenRef.current = isDispositionOpen;
    callEndedDataRef.current = callEndedData;
  }, [isDispositionOpen, callEndedData]);

  // Handle in-browser WebRTC call termination -> Pop Mandatory Disposition Modal
  React.useEffect(() => {
    if (lastEndedCall) {
      console.log("[TelephonyManager] In-browser WebRTC call finished:", lastEndedCall);
      setActiveCallPopup(null);

      const activePopup = lastActiveCallPopupRef.current;
      const sessId = activePopup?.session_id || lastEndedCall.sessionId || `webrtc-${Date.now()}`;
      const realPhone = activePopup?.caller_phone || (lastEndedCall.remoteIdentity && !lastEndedCall.remoteIdentity.includes('9240954144') ? lastEndedCall.remoteIdentity : (activePopup?.caller_phone || lastEndedCall.remoteIdentity));

      // Ignore if this session or phone number was already disposed
      if (
        disposedSessionsRef.current.has(sessId) ||
        (realPhone && disposedSessionsRef.current.has(realPhone))
      ) {
        console.log("[TelephonyManager] Call session already disposed, skipping duplicate modal:", sessId);
        clearLastEndedCall();
        return;
      }

      setCallEndedData({
        session_id: sessId,
        lead_id: lastEndedCall.leadId || activePopup?.lead_id,
        lead_name: lastEndedCall.leadName || activePopup?.lead_name || lastEndedCall.displayName,
        member_id: lastEndedCall.memberId || activePopup?.member_id,
        caller_phone: realPhone,
        direction: lastEndedCall.direction,
        duration_seconds: lastEndedCall.durationSeconds,
      });
      setIsDispositionOpen(true);
      clearLastEndedCall();
      queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
    }
  }, [lastEndedCall, clearLastEndedCall, queryClient]);

  // Auto-dismiss incoming call drawer once picked up (CONNECTED) or when ringing stops (IDLE)
  // When call connects, automatically open the relevant Lead / Member / New Prospect intake modal
  React.useEffect(() => {
    const prevState = prevCallStateRef.current;
    prevCallStateRef.current = callState;

    if (callState === "CONNECTED") {
      if (activeCallPopup) {
        console.log("[TelephonyManager] Inbound call picked up/connected. Auto-dismissing drawer.");
        setActiveCallPopup(null);
      }

      // Auto-open caller record once connected so agent can log details during conversation
      if (pendingInboundProfileRef.current) {
        const caller = pendingInboundProfileRef.current;
        pendingInboundProfileRef.current = null;
        if (caller.caller_type === "LEAD" && caller.lead_id) {
          setInspectLeadId(String(caller.lead_id));
          setInspectMemberId(null);
          setIsNewLeadOpen(false);
        } else if (caller.caller_type === "MEMBER" && caller.member_id) {
          setInspectMemberId(String(caller.member_id));
          setInspectMemberName(caller.lead_name || "");
          setInspectMemberNumber(caller.member_number || "");
          setInspectLeadId(null);
          setIsNewLeadOpen(false);
        } else if (caller.caller_type === "NEW") {
          const cleanPhone = (caller.caller_phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
          setNewLeadPhone(cleanPhone || caller.caller_phone || "");
          setIsNewLeadOpen(true);
          setInspectLeadId(null);
          setInspectMemberId(null);
        }
      }
    } else if (prevState === "RINGING_INBOUND" && callState === "IDLE") {
      if (activeCallPopup) {
        console.log("[TelephonyManager] Inbound call stopped ringing (declined/missed). Auto-dismissing drawer.");
        setActiveCallPopup(null);
      }
      pendingInboundProfileRef.current = null;
    }
  }, [callState, activeCallPopup]);

  // Auto-dismiss sticky drawer after 30 seconds if call was unanswered or dismissed
  React.useEffect(() => {
    if (!activeCallPopup) return;
    const timer = setTimeout(() => {
      console.log("[TelephonyManager] Inbound call alert timed out after 30s. Auto-dismissing.");
      setActiveCallPopup(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [activeCallPopup]);

  // Fetch full Lead object when inspecting a lead
  const { data: fetchedLead } = useQuery({
    queryKey: ["lead-detail", inspectLeadId],
    queryFn: () => (inspectLeadId ? crmApi.getLead(inspectLeadId) : null),
    enabled: Boolean(inspectLeadId),
  });

  const handleIncomingCall = React.useCallback((data: InboundCallPopupData) => {
    if (!data || !data.session_id) return;
    if (lastPoppedSessionRef.current === data.session_id) return;
    lastPoppedSessionRef.current = data.session_id;

    console.log("[Telephony] Triggering incoming call popup:", data);
    setActiveCallPopup(data);
    lastActiveCallPopupRef.current = data;
    pendingInboundProfileRef.current = data;
    playHarmonicChime();
    queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });

    // Surface a crisp notification toast without blocking dialog backdrop
    toast.info(`Inbound Call: ${data.masked_phone || data.lead_name || data.caller_phone}`, {
      description: `${data.branch || "Studio"} · ${data.status || (data.caller_type === "NEW" ? "New Caller" : data.caller_type)}`,
    });
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
        } else if (json && json.active === false && activeCallPopup && callState !== "RINGING_INBOUND" && callState !== "CONNECTED" && activeCall?.direction !== "INBOUND") {
          console.log("[TelephonyManager] Backend reports call is no longer active. Closing drawer.");
          setActiveCallPopup(null);
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

            // Deduplication: if session or phone was already disposed, ignore
            if (
              (data.session_id && disposedSessionsRef.current.has(data.session_id)) ||
              (data.call_uuid && disposedSessionsRef.current.has(data.call_uuid)) ||
              (data.caller_phone && disposedSessionsRef.current.has(data.caller_phone))
            ) {
              console.log("[Telephony SSE] Skipping duplicate CALL_ENDED for already-disposed session:", data.session_id);
              return;
            }

            // If disposition modal is ALREADY open for this exact session or phone, do NOT pop twice
            if (
              isDispositionOpenRef.current &&
              (callEndedDataRef.current?.session_id === data.session_id ||
               (data.caller_phone && callEndedDataRef.current?.caller_phone === data.caller_phone))
            ) {
              console.log("[Telephony SSE] Disposition modal is already open for session:", data.session_id);
              return;
            }

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
    setActiveCallPopup(null);
    setInspectMemberId(memberId);
    setInspectLeadId(null);
    setIsNewLeadOpen(false);
  };

  const handleOpenLead = (leadId: string | number) => {
    setActiveCallPopup(null);
    setInspectLeadId(String(leadId));
    setInspectMemberId(null);
    setIsNewLeadOpen(false);
  };

  const handleOpenNewLead = (phone?: string) => {
    setActiveCallPopup(null);
    setIsNewLeadOpen(true);
    setNewLeadPhone(phone || "");
    setInspectMemberId(null);
    setInspectLeadId(null);
  };

  const handleDispositionComplete = () => {
    if (callEndedData?.session_id) {
      disposedSessionsRef.current.add(callEndedData.session_id);
    }
    if (callEndedData?.call_uuid) {
      disposedSessionsRef.current.add(callEndedData.call_uuid);
    }
    if (callEndedData?.caller_phone) {
      disposedSessionsRef.current.add(callEndedData.caller_phone);
    }

    setIsDispositionOpen(false);
    setCallEndedData(null);

    // Refresh all telephony and lead tables immediately
    queryClient.invalidateQueries({ queryKey: ["telephony-presence"] });
    queryClient.invalidateQueries({ queryKey: ["telephony-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["sales-recent-calls"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-summary-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["leads-summary-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["crm-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["crm-activities"] });
    queryClient.invalidateQueries({ queryKey: ["lead-timeline"] });
    queryClient.invalidateQueries({ queryKey: ["lead-activities"] });
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
