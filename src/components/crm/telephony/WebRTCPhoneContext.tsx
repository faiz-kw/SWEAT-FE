import * as React from "react";
import * as JsSIP from "jssip";
import { crmApi } from "@/api/endpoints/crmApi";
import { useAuth } from "@/contexts";
import { toast } from "sonner";

export type WebPhoneConnectionStatus = "DISCONNECTED" | "CONNECTING" | "REGISTERED" | "ERROR";
export type WebPhoneCallState = "IDLE" | "RINGING_INBOUND" | "DIALING_OUTBOUND" | "CONNECTED";

export interface CallMetadata {
  leadId?: string | number | null;
  leadName?: string;
  memberId?: string | null;
  sessionId?: string;
}

export interface ActiveCallInfo {
  direction: "INBOUND" | "OUTBOUND";
  remoteIdentity: string;
  displayName?: string;
  durationSeconds: number;
  isMuted: boolean;
  sessionId?: string;
  metadata?: CallMetadata;
}

export interface EndedCallInfo {
  direction: "INBOUND" | "OUTBOUND";
  remoteIdentity: string;
  displayName: string;
  durationSeconds: number;
  endedAt: string;
  sessionId?: string;
  leadId?: string | number | null;
  leadName?: string;
  memberId?: string | null;
}

interface WebRTCPhoneContextValue {
  connectionStatus: WebPhoneConnectionStatus;
  isRegistered: boolean;
  callState: WebPhoneCallState;
  activeCall: ActiveCallInfo | null;
  lastEndedCall: EndedCallInfo | null;
  clearLastEndedCall: () => void;
  agentCredentials: {
    username: string;
    sip_domain: string;
    caller_id: string;
    display_name: string;
  } | null;
  answerCall: () => void;
  declineCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  makeCall: (targetPhone: string, contactName?: string, metadata?: CallMetadata) => Promise<boolean>;
  sendDTMF: (tone: string) => void;
  reconnectPhone: () => Promise<void>;
  isSupported: boolean;
}

const WebRTCPhoneContext = React.createContext<WebRTCPhoneContextValue | undefined>(undefined);

export function WebRTCPhoneProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const [connectionStatus, setConnectionStatus] = React.useState<WebPhoneConnectionStatus>("DISCONNECTED");
  const [callState, setCallState] = React.useState<WebPhoneCallState>("IDLE");
  const [activeCall, setActiveCall] = React.useState<ActiveCallInfo | null>(null);
  const [lastEndedCall, setLastEndedCall] = React.useState<EndedCallInfo | null>(null);
  const [agentCredentials, setAgentCredentials] = React.useState<WebRTCPhoneContextValue["agentCredentials"]>(null);

  const uaRef = React.useRef<JsSIP.UA | null>(null);
  const currentSessionRef = React.useRef<any | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const durationTimerRef = React.useRef<any | null>(null);
  const callDurationRef = React.useRef<number>(0);
  const pendingAnswerRef = React.useRef<boolean>(false);

  const clearLastEndedCall = React.useCallback(() => {
    setLastEndedCall(null);
  }, []);

  // Detect WebRTC browser support � must be client-only (no SSR) to avoid hydration mismatch.
  const [isSupported, setIsSupported] = React.useState(false);
  React.useEffect(() => {
    setIsSupported(Boolean(typeof window !== "undefined" && window.RTCPeerConnection && navigator.mediaDevices));
  }, []);

  // Initialize hidden audio element for remote audio stream
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    let audioEl = document.getElementById("sweat-webrtc-remote-audio") as HTMLAudioElement | null;
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = "sweat-webrtc-remote-audio";
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
    }
    remoteAudioRef.current = audioEl;

    return () => {
      if (audioEl && audioEl.parentNode) {
        audioEl.parentNode.removeChild(audioEl);
      }
    };
  }, []);

  // Multi-tab broadcast channel to avoid multiple tabs fighting for the same SIP session
  React.useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("sweat_webrtc_phone_channel");

    channel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type === "CALL_ANSWERED_ELSEWHERE" && currentSessionRef.current) {
        // Another CRM tab answered, release local ringing state
        setCallState("IDLE");
        setActiveCall(null);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Duration timer
  React.useEffect(() => {
    if (callState === "CONNECTED") {
      durationTimerRef.current = setInterval(() => {
        callDurationRef.current += 1;
        setActiveCall((prev) => (prev ? { ...prev, durationSeconds: callDurationRef.current } : null));
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callState]);

  // Attach remote stream to audio element
  const attachRemoteStream = React.useCallback((session: any) => {
    try {
      const connection = session.connection;
      if (!connection) return;

      const remoteStream = new MediaStream();
      connection.getReceivers().forEach((receiver: any) => {
        if (receiver.track) {
          remoteStream.addTrack(receiver.track);
        }
      });

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((e) => {
          console.debug("[WebPhone] Audio play failed or blocked by autoplay policy:", e);
        });
      }
    } catch (err) {
      console.warn("[WebPhone] Failed to attach remote audio stream:", err);
    }
  }, []);

  // Bind session event handlers
  const bindSessionEvents = React.useCallback(
    (
      session: any,
      direction: "INBOUND" | "OUTBOUND",
      remoteNum: string,
      contactName?: string,
      metadata?: CallMetadata
    ) => {
      currentSessionRef.current = session;

      session.on("progress", () => {
        console.log("[WebPhone] Call in progress...");
      });

      session.on("accepted", () => {
        console.log("[WebPhone] Call accepted / connected.");
        callDurationRef.current = 0;
        setCallState("CONNECTED");
        setActiveCall({
          direction,
          remoteIdentity: remoteNum,
          displayName: contactName || remoteNum,
          durationSeconds: 0,
          isMuted: false,
          metadata,
        });
        attachRemoteStream(session);
      });

      session.on("confirmed", () => {
        console.log("[WebPhone] Call confirmed ACK received.");
        attachRemoteStream(session);
      });

      session.on("ended", () => {
        const finalSecs = callDurationRef.current;
        console.log("[WebPhone] Call ended cleanly. Duration:", finalSecs);
        const endedPayload: EndedCallInfo = {
          direction,
          remoteIdentity: remoteNum,
          displayName: contactName || remoteNum,
          durationSeconds: finalSecs,
          endedAt: new Date().toISOString(),
          sessionId: session?.id || session?.request?.call_id || `webrtc-${Date.now()}`,
          leadId: metadata?.leadId,
          leadName: metadata?.leadName || contactName,
          memberId: metadata?.memberId,
        };
        setLastEndedCall(endedPayload);
        setCallState("IDLE");
        setActiveCall(null);
        currentSessionRef.current = null;
        callDurationRef.current = 0;
      });

      session.on("failed", (e: any) => {
        const finalSecs = callDurationRef.current;
        console.warn("[WebPhone] Call failed:", e?.cause || "Unknown cause");
        const endedPayload: EndedCallInfo = {
          direction,
          remoteIdentity: remoteNum,
          displayName: contactName || remoteNum,
          durationSeconds: finalSecs,
          endedAt: new Date().toISOString(),
          sessionId: session?.id || session?.request?.call_id || `webrtc-${Date.now()}`,
          leadId: metadata?.leadId,
          leadName: metadata?.leadName || contactName,
          memberId: metadata?.memberId,
        };
        setLastEndedCall(endedPayload);
        setCallState("IDLE");
        setActiveCall(null);
        currentSessionRef.current = null;
        callDurationRef.current = 0;
        void crmApi.updateAgentPresence("AVAILABLE").catch(() => {});
        toast.error("Call Ended", {
          description: e?.cause || "Connection terminated.",
        });
      });

      // PeerConnection track event fallback
      if (session.connection) {
        session.connection.addEventListener("track", (e: any) => {
          if (remoteAudioRef.current && e.streams && e.streams[0]) {
            remoteAudioRef.current.srcObject = e.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        });
      }
    },
    [attachRemoteStream]
  );

  // Initialize UA and register dynamically
  const setupPhone = React.useCallback(async () => {
    if (!isAuthenticated || !isSupported) return;

    try {
      if (uaRef.current) {
        try {
          uaRef.current.stop();
        } catch (_) {}
        uaRef.current = null;
      }

      setConnectionStatus("CONNECTING");

      // Enable verbose JsSIP debug output to console for instant troubleshooting
      if (typeof window !== "undefined") {
        try {
          JsSIP.debug.enable("JsSIP:*");
        } catch (_) {}
      }

      const creds = await crmApi.getWebRTCCredentials();

      setAgentCredentials({
        username: creds.username,
        sip_domain: creds.sip_domain,
        caller_id: creds.caller_id,
        display_name: creds.display_name,
      });

      const targetWss = creds.wss_url?.includes(':5063') ? creds.wss_url : (creds.wss_url?.replace(/:443$/, '') + ':5063');
      const socket = new JsSIP.WebSocketInterface(targetWss);
      const endpointPassword = creds.password || creds.sip_password || 'Sweat@2026!';
      const cleanDomain = creds.sip_domain || 'registrar.vobiz.ai';
      const cleanUri = `${creds.username}@${cleanDomain}`;

      const configuration: any = {
        sockets: [socket],
        uri: cleanUri,
        password: endpointPassword,
        display_name: creds.display_name,
        register: true,
        register_expires: 120,
        session_timers: false,
        pcConfig: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
          ]
        }
      };

      const ua = new JsSIP.UA(configuration);

      ua.on("connected", () => {
        setConnectionStatus("CONNECTING");
      });

      ua.on("registered", () => {
        console.log("[WebPhone] Successfully registered to Vobiz WebRTC gateway as", creds.username);
        setConnectionStatus("REGISTERED");
      });

      ua.on("unregistered", () => {
        setConnectionStatus("DISCONNECTED");
      });

      ua.on("registrationFailed", (data: any) => {
        console.warn("[WebPhone] Registration failed. Cause:", data?.cause, "Response:", data?.response?.status_code, data?.response?.reason_phrase);
        setConnectionStatus("ERROR");
      });

      ua.on("newRTCSession", (data: any) => {
        const session = data.session;
        if (session.direction === "incoming") {
          const remoteCaller = session.remote_identity?.uri?.user || "Unknown Caller";
          console.log("[WebPhone] Incoming WebRTC call from:", remoteCaller);

          setCallState("RINGING_INBOUND");
          setActiveCall({
            direction: "INBOUND",
            remoteIdentity: remoteCaller,
            displayName: session.remote_identity?.display_name || remoteCaller,
            durationSeconds: 0,
            isMuted: false,
          });

          bindSessionEvents(session, "INBOUND", remoteCaller);

          // Auto-answer if user already pressed Answer button during screen-pop
          if (pendingAnswerRef.current) {
            pendingAnswerRef.current = false;
            console.log("[WebPhone] Auto-answering pending incoming call on arrival of SIP session");
            try {
              session.answer({
                mediaConstraints: { audio: true, video: false },
                pcConfig: {
                  iceServers: [
                    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
                  ]
                }
              });
            } catch (ansErr) {
              console.error("[WebPhone] Auto-answer failed:", ansErr);
            }
          }
        }
      });

      ua.start();
      uaRef.current = ua;
    } catch (err) {
      console.warn("[WebPhone] Could not initialize WebRTC credentials:", err);
      setConnectionStatus("ERROR");
    }
  }, [isAuthenticated, isSupported, bindSessionEvents]);

  React.useEffect(() => {
    void setupPhone();

    return () => {
      if (uaRef.current) {
        try {
          uaRef.current.stop();
        } catch (_) {}
        uaRef.current = null;
      }
    };
  }, [setupPhone]);

  // Answer call
  const answerCall = React.useCallback(() => {
    const session = currentSessionRef.current;
    const canAnswer = session && !session.isEnded() && !session.isEstablished();

    if (canAnswer) {
      try {
        session.answer({
          mediaConstraints: { audio: true, video: false },
        });

        // Notify other open tabs
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          try {
            const ch = new BroadcastChannel("sweat_webrtc_phone_channel");
            ch.postMessage({ type: "CALL_ANSWERED_ELSEWHERE" });
            ch.close();
          } catch (_) {}
        }
      } catch (err) {
        console.error("[WebPhone] Failed to answer call:", err);
        toast.error("Could not answer call", {
          description: "Please check microphone permissions in your browser.",
        });
      }
    } else {
      console.log("[WebPhone] answerCall clicked while session is syncing. Arming pending answer for incoming INVITE.");
      pendingAnswerRef.current = true;
      toast.info("Connecting call...", {
        description: "Establishing audio connection with customer...",
        duration: 3000,
      });
      setTimeout(() => {
        if (pendingAnswerRef.current && !currentSessionRef.current) {
          pendingAnswerRef.current = false;
          toast.warning("Softphone Session Not Connected", {
            description: "No incoming audio stream received yet. Please ensure your WebPhone status is Available.",
          });
        }
      }, 7000);
    }
  }, []);

  // Decline call
  const declineCall = React.useCallback(() => {
    if (currentSessionRef.current) {
      try {
        currentSessionRef.current.terminate({
          status_code: 486,
          reason_phrase: "Busy Here",
        });
      } catch (_) {}
    }
    setCallState("IDLE");
    setActiveCall(null);
    currentSessionRef.current = null;
    void crmApi.updateAgentPresence("AVAILABLE").catch(() => {});
  }, []);

  // Hangup active call
  const hangupCall = React.useCallback(() => {
    if (currentSessionRef.current) {
      try {
        currentSessionRef.current.terminate();
      } catch (_) {}
    }
    setCallState("IDLE");
    setActiveCall(null);
    currentSessionRef.current = null;
  }, []);

  // Toggle Mute
  const toggleMute = React.useCallback(() => {
    if (!currentSessionRef.current || callState !== "CONNECTED") return;
    try {
      const isCurrentlyMuted = currentSessionRef.current.isMuted().audio;
      if (isCurrentlyMuted) {
        currentSessionRef.current.unmute({ audio: true });
        setActiveCall((prev) => (prev ? { ...prev, isMuted: false } : null));
        toast.info("Microphone unmuted");
      } else {
        currentSessionRef.current.mute({ audio: true });
        setActiveCall((prev) => (prev ? { ...prev, isMuted: true } : null));
        toast.info("Microphone muted");
      }
    } catch (err) {
      console.warn("[WebPhone] Mute toggle error:", err);
    }
  }, [callState]);

  // Place Outbound Call
  const makeCall = React.useCallback(
    async (targetPhone: string, contactName?: string, metadata?: CallMetadata): Promise<boolean> => {
      if (!uaRef.current || connectionStatus !== "REGISTERED") {
        toast.error("Phone Not Ready", {
          description: "WebPhone is still registering with carrier. Please try again in a few seconds.",
        });
        return false;
      }

      if (callState !== "IDLE") {
        toast.error("Line Busy", {
          description: "You are already on an active or ringing call.",
        });
        return false;
      }

      const cleanNumber = targetPhone.replace(/[\s-]/g, "");
      const sipTarget = cleanNumber.startsWith("sip:")
        ? cleanNumber
        : `sip:${cleanNumber}@${agentCredentials?.sip_domain || "registrar.vobiz.ai"}`;

      try {
        setCallState("DIALING_OUTBOUND");
        setActiveCall({
          direction: "OUTBOUND",
          remoteIdentity: cleanNumber,
          displayName: contactName || cleanNumber,
          durationSeconds: 0,
          isMuted: false,
        });

        const session = uaRef.current.call(sipTarget, {
          mediaConstraints: { audio: true, video: false },
          extraHeaders: [
            agentCredentials?.caller_id ? `X-Caller-ID: ${agentCredentials.caller_id}` : "",
          ].filter(Boolean),
        });

        bindSessionEvents(session, "OUTBOUND", cleanNumber, contactName, metadata);
        return true;
      } catch (err) {
        console.error("[WebPhone] Outbound call error:", err);
        setCallState("IDLE");
        setActiveCall(null);
        toast.error("Call Failed", {
          description: "Could not initiate outbound WebRTC call.",
        });
        return false;
      }
    },
    [connectionStatus, callState, agentCredentials, bindSessionEvents]
  );

  // Send DTMF tones
  const sendDTMF = React.useCallback((tone: string) => {
    if (currentSessionRef.current && currentSessionRef.current.sendDTMF) {
      try {
        currentSessionRef.current.sendDTMF(tone);
      } catch (e) {
        console.warn("[WebPhone] DTMF error:", e);
      }
    }
  }, []);

  const value = React.useMemo<WebRTCPhoneContextValue>(
    () => ({
      connectionStatus,
      isRegistered: connectionStatus === "REGISTERED",
      callState,
      activeCall,
      lastEndedCall,
      clearLastEndedCall,
      agentCredentials,
      answerCall,
      declineCall,
      hangupCall,
      toggleMute,
      makeCall,
      sendDTMF,
      reconnectPhone: setupPhone,
      isSupported,
    }),
    [
      connectionStatus,
      callState,
      activeCall,
      lastEndedCall,
      clearLastEndedCall,
      agentCredentials,
      answerCall,
      declineCall,
      hangupCall,
      toggleMute,
      makeCall,
      sendDTMF,
      setupPhone,
      isSupported,
    ]
  );

  return <WebRTCPhoneContext.Provider value={value}>{children}</WebRTCPhoneContext.Provider>;
}

export function useWebRTCPhone() {
  const context = React.useContext(WebRTCPhoneContext);
  if (!context) {
    throw new Error("useWebRTCPhone must be used within a WebRTCPhoneProvider");
  }
  return context;
}
