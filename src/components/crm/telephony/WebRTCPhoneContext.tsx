import * as React from "react";
import * as JsSIP from "vobiz-jssip";
import { crmApi } from "@/api/endpoints/crmApi";
import { useAuth } from "@/contexts";
import { toast } from "sonner";
import { canAccessTelephony } from "@/lib/permissions";

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
  answerCall: (callInfo?: { caller_phone?: string; lead_name?: string; lead_id?: any; member_id?: any }) => void | Promise<void>;
  declineCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  makeCall: (targetPhone: string, contactName?: string, metadata?: CallMetadata) => Promise<boolean>;
  sendDTMF: (tone: string) => void;
  reconnectPhone: () => Promise<void>;
  isSupported: boolean;
}


const STUN_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }
];

const PREFERRED_CODECS = ["OPUS", "PCMU", "PCMA"];

/**
 * Transforms WebRTC SDP offers and answers for strict Vobiz / FreeSWITCH carrier compatibility.
 * Replaces .local mDNS ICE candidates with valid IP format so FreeSWITCH parser does not reject,
 * applies bandwidth constraints, and prioritizes OPUS / PCMU audio codecs.
 */
function cleanVobizSdp(sdp: string, isOffer: boolean): string {
  if (!sdp) return sdp;

  let result = sdp;

  // 1. Clean double-carriage returns from FreeSWITCH
  result = result.replace(/t=0 0\r\r/g, "t=0 0\r");

  // 2. Add bandwidth constraint b=AS:48000
  if (result.includes("a=mid:audio\r\n") && !result.includes("b=AS:")) {
    result = result.replace(/a=mid:audio\r\n/g, "a=mid:audio\r\nb=AS:48000\r\n");
  }

  // 3. Replace mDNS .local ICE candidates with valid routable IP (192.168.0.1) preserving strict CRLF
  // FreeSWITCH's SDP parser cannot parse .local hostnames and throws an error if left unreplaced.
  result = result.replace(
    /(a=candidate:\S+\s+\d+\s+\S+\s+\d+\s+)[^ \r\n]+\.local(\s+)/g,
    `$1192.168.0.1$2`
  );

  // 4. Codec reordering for OPUS / PCMU preference (only on outbound offers; answers must match offer codec list per RFC 3264)
  if (isOffer) {
    try {
      const mLineMatch = result.match(/m=audio\s+\d+\s+\S+\s+([\d ]+)/i);
      if (mLineMatch && mLineMatch[1]) {
        const allPts = mLineMatch[1].trim().split(/\s+/).filter(Boolean);
        const prefPts: string[] = [];

        PREFERRED_CODECS.forEach((codec) => {
          const reg = new RegExp(`a=rtpmap:(\\d+) ${codec}/`, "i");
          const m = result.match(reg);
          if (m && m[1] && allPts.includes(m[1]) && !prefPts.includes(m[1])) {
            prefPts.push(m[1]);
          }
        });

        // Keep telephone-event if present
        const telEventMatch = result.match(/a=rtpmap:(\d+) telephone-event\//i);
        if (telEventMatch && telEventMatch[1] && allPts.includes(telEventMatch[1]) && !prefPts.includes(telEventMatch[1])) {
          prefPts.push(telEventMatch[1]);
        }

        // Add remaining existing PTs
        allPts.forEach((pt) => {
          if (!prefPts.includes(pt)) {
            prefPts.push(pt);
          }
        });

        if (prefPts.length > 0) {
          result = result.replace(
            /(m=audio\s+\d+\s+\S+\s+)([\d ]+)/i,
            (_, prefix) => `${prefix}${prefPts.join(" ")}`
          );
        }
      }
    } catch (codecErr) {
      console.debug("[WebPhone] Codec preference adjustment skipped:", codecErr);
    }
  }

  return result;
}

export const DEFAULT_PHONE_CONTEXT: WebRTCPhoneContextValue = {
  connectionStatus: "DISCONNECTED",
  isRegistered: false,
  callState: "IDLE",
  activeCall: null,
  lastEndedCall: null,
  clearLastEndedCall: () => {},
  agentCredentials: null,
  answerCall: () => {},
  declineCall: () => {},
  hangupCall: () => {},
  toggleMute: () => {},
  makeCall: async () => false,
  sendDTMF: () => {},
  reconnectPhone: async () => {},
  isSupported: false,
};

const WebRTCPhoneContext = React.createContext<WebRTCPhoneContextValue>(DEFAULT_PHONE_CONTEXT);

// Ringback Audio Tone Helpers (Simulates phone ring cadence: 400Hz + 450Hz, 1.2s on, 2.2s off)
let ringbackAudioCtx: AudioContext | null = null;
let ringbackInterval: any = null;

function startRingbackTone() {
  try {
    stopRingbackTone();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    ringbackAudioCtx = new AudioContextClass();
    if (ringbackAudioCtx.state === "suspended") {
      void ringbackAudioCtx.resume();
    }

    const playToneBurst = () => {
      if (!ringbackAudioCtx || ringbackAudioCtx.state === "closed") return;
      const now = ringbackAudioCtx.currentTime;

      const osc1 = ringbackAudioCtx.createOscillator();
      const osc2 = ringbackAudioCtx.createOscillator();
      const gain = ringbackAudioCtx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(400, now);
      osc2.frequency.setValueAtTime(450, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain.gain.setValueAtTime(0.06, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ringbackAudioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    };

    playToneBurst();
    ringbackInterval = setInterval(playToneBurst, 3500);
  } catch (err) {
    console.debug("[WebPhone] Ringback tone audio notice:", err);
  }
}

function stopRingbackTone() {
  if (ringbackInterval) {
    clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
  if (ringbackAudioCtx && ringbackAudioCtx.state !== "closed") {
    try {
      void ringbackAudioCtx.close();
    } catch (_) {}
    ringbackAudioCtx = null;
  }
}

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
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const durationTimerRef = React.useRef<any | null>(null);
  const callDurationRef = React.useRef<number>(0);
  const pendingAnswerRef = React.useRef<boolean>(false);

  const clearLastEndedCall = React.useCallback(() => {
    setLastEndedCall(null);
  }, []);

  // Detect WebRTC browser support — client check ensures dialer buttons mount reliably
  const [isSupported, setIsSupported] = React.useState<boolean>(
    typeof window !== "undefined" && Boolean(window.RTCPeerConnection)
  );
  React.useEffect(() => {
    setIsSupported(Boolean(typeof window !== "undefined" && window.RTCPeerConnection));
  }, []);

  // Automated background presence heartbeat (every 45s) to guarantee rep stays AVAILABLE for inbound calls
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    const canUsePhone = canAccessTelephony(user);
    if (!canUsePhone) return;

    // Send initial presence heartbeat immediately on mount
    void crmApi.updateAgentPresence("AVAILABLE").catch(() => {});

    const heartbeatTimer = setInterval(() => {
      // Keep presence fresh while agent is IDLE (not currently on an active call)
      if (callState === "IDLE") {
        void crmApi.updateAgentPresence("AVAILABLE").catch(() => {});
      }
    }, 45000);

    return () => clearInterval(heartbeatTimer);
  }, [isAuthenticated, user, callState]);

  // Initialize hidden audio element for remote audio stream
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    let audioEl = document.getElementById("sweat-webrtc-remote-audio") as HTMLAudioElement | null;
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = "sweat-webrtc-remote-audio";
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.style.position = "fixed";
      audioEl.style.bottom = "-9999px";
      audioEl.style.right = "-9999px";
      audioEl.style.width = "1px";
      audioEl.style.height = "1px";
      audioEl.style.opacity = "0.01";
      audioEl.style.pointerEvents = "none";
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
  const attachRemoteStream = React.useCallback((session: any, streamOverride?: MediaStream) => {
    try {
      const connection = (session as any)?._connection || session?.connection;
      let stream = streamOverride;

      if (!stream && connection) {
        // 1. Try native getRemoteStreams()
        if (typeof connection.getRemoteStreams === "function") {
          const remoteStreams = connection.getRemoteStreams();
          if (remoteStreams && remoteStreams.length > 0 && remoteStreams[0].getAudioTracks().length > 0) {
            stream = remoteStreams[0];
          }
        }
        // 2. Fall back to assembling from receivers
        if (!stream && typeof connection.getReceivers === "function") {
          const remoteStream = new MediaStream();
          connection.getReceivers().forEach((receiver: any) => {
            if (receiver.track && receiver.track.kind === "audio") {
              remoteStream.addTrack(receiver.track);
            }
          });
          if (remoteStream.getAudioTracks().length > 0) {
            stream = remoteStream;
          }
        }
      }

      if (stream) {
        const audioEls = [
          document.getElementById("remoteAudio") as HTMLAudioElement | null,
          document.getElementById("sweat-webrtc-remote-audio") as HTMLAudioElement | null,
          remoteAudioRef.current,
        ].filter((el, idx, arr): el is HTMLAudioElement => Boolean(el) && arr.indexOf(el) === idx);

        audioEls.forEach((el) => {
          try {
            if (el.srcObject !== stream) {
              el.srcObject = stream;
            }
            el.volume = 1.0;
            el.muted = false;
            const p = el.play();
            if (p && typeof p.catch === "function") {
              p.catch((e) => {
                console.debug("[WebPhone] Audio play notice:", e);
              });
            }
          } catch (_) {}
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

      // Attach SDP transformation listener for Vobiz / FreeSWITCH carrier compatibility
      session.on("sdp", (evt: any) => {
        try {
          if (evt.originator === "remote") {
            // Remote offer/answer from carrier: ONLY fix FreeSWITCH double-CR, never alter codecs or candidates on remote SDP
            if (typeof evt.sdp === "string") {
              evt.sdp = evt.sdp.replace(/t=0 0\r\r/g, "t=0 0\r");
            }
          } else {
            // Local offer or answer generated by browser: sanitize .local mDNS candidates & apply bandwidth
            evt.sdp = cleanVobizSdp(evt.sdp, evt.type === "offer");
          }
        } catch (err) {
          console.warn("[WebPhone] Error in cleanVobizSdp:", err);
        }
      });

      // Fast ICE Gathering Dispatcher for Instant Answer Connections:
      // In JsSIP, session.answer() waits for ICE candidate gathering to finish before sending SIP 200 OK.
      // If we don't trigger data.ready(), it waits up to 10s for complete ICE gathering timeout.
      // Listening to 'icecandidate' and calling data.ready() on srflx or after 400ms ensures the
      // 200 OK is dispatched to Vobiz/FreeSWITCH within 400ms, establishing the call instantly!
      let iceReadyDispatched = false;
      let lastIceCandidateData: any = null;
      const iceFastTimer = setTimeout(() => {
        if (!iceReadyDispatched && lastIceCandidateData && typeof lastIceCandidateData.ready === "function") {
          iceReadyDispatched = true;
          console.log("[WebPhone] Fast ICE timer reached (400ms) - dispatching SIP 200 OK answer");
          try { lastIceCandidateData.ready(); } catch (_) {}
        }
      }, 400);

      session.on("icecandidate", (data: any) => {
        lastIceCandidateData = data;
        const candidateStr = data?.candidate?.candidate || "";
        if (candidateStr) {
          console.log("[WebPhone] ICE candidate gathered:", candidateStr);
        }
        if (typeof data?.ready === "function" && !iceReadyDispatched) {
          if (candidateStr.includes("srflx")) {
            iceReadyDispatched = true;
            clearTimeout(iceFastTimer);
            console.log("[WebPhone] Public srflx STUN candidate found - fast-dispatching 200 OK immediately!");
            try { data.ready(); } catch (_) {}
          }
        }
      });

      session.on("progress", () => {
        console.log(`[WebPhone] Call in progress / ringing (${direction})...`);
        if (direction === "OUTBOUND") {
          setCallState("RINGING_OUTBOUND");
        } else {
          setCallState("RINGING_INBOUND");
        }
        // Connect early media if remote telecom carrier sends ring audio
        attachRemoteStream(session);
      });

      session.on("accepted", () => {
        console.log("[WebPhone] Call accepted / connected.");
        stopRingbackTone();
        callDurationRef.current = 0;
        setCallState("CONNECTED");
        setActiveCall((prev) => ({
          direction,
          remoteIdentity: remoteNum,
          displayName: contactName || prev?.displayName || remoteNum,
          durationSeconds: 0,
          isMuted: false,
          metadata: metadata || prev?.metadata,
        }));
        attachRemoteStream(session);
      });

      session.on("confirmed", () => {
        console.log("[WebPhone] Call confirmed ACK received.");
        stopRingbackTone();
        setCallState("CONNECTED");
        attachRemoteStream(session);
      });

      session.on("ended", () => {
        stopRingbackTone();
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
          localStreamRef.current = null;
        }
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
        stopRingbackTone();
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
          localStreamRef.current = null;
        }
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

      // PeerConnection track and ICE event listeners (crucial for bidirectional audio)
      const setupPeerConnection = (pc: RTCPeerConnection) => {
        if (!pc || (pc as any)._sweatTracksBound) return;
        (pc as any)._sweatTracksBound = true;

        pc.addEventListener("track", (e: any) => {
          console.log("[WebPhone] RTCPeerConnection track received:", e.track?.kind, e.track?.id, "streams:", e.streams?.length);
          const stream = (e.streams && e.streams[0]) || new MediaStream([e.track]);
          attachRemoteStream(session, stream);
          if (e.track) {
            e.track.onunmute = () => {
              console.log("[WebPhone] Remote audio track unmuted!");
              attachRemoteStream(session, stream);
            };
          }
        });

        // Add legacy addstream listener for FreeSWITCH / gateway carrier compatibility
        pc.addEventListener("addstream", (e: any) => {
          console.log("[WebPhone] RTCPeerConnection legacy addstream event:", Boolean(e?.stream));
          if (e?.stream) {
            attachRemoteStream(session, e.stream);
          }
        });

        pc.addEventListener("iceconnectionstatechange", () => {
          console.log("[WebPhone] RTCPeerConnection ICE state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            attachRemoteStream(session);
          }
        });

        pc.addEventListener("connectionstatechange", () => {
          console.log("[WebPhone] RTCPeerConnection connectionState:", pc.connectionState);
          if (pc.connectionState === "connected") {
            attachRemoteStream(session);
          }
        });
      };

      if (session.connection) {
        setupPeerConnection(session.connection);
      }

      session.on("peerconnection", (data: any) => {
        const pc = data?.peerconnection || session.connection || (session as any)._connection;
        console.log("[WebPhone] Session peerconnection created:", Boolean(pc));
        if (pc) {
          setupPeerConnection(pc);
        }
      });
    },
    [attachRemoteStream]
  );

  // Initialize UA and register dynamically
  const setupPhone = React.useCallback(async () => {
    if (!isAuthenticated || !isSupported) return;

    // Only attempt to set up WebRTC phone if user has calling permissions in Permission Matrix
    const canUsePhone = canAccessTelephony(user);
    if (!canUsePhone) {
      setConnectionStatus('DISCONNECTED');
      return;
    }

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
          iceServers: STUN_ICE_SERVERS
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
          currentSessionRef.current = session;

          // Pre-clean double \r in SIP INVITE SDP before JsSIP parses it
          if (data.request && typeof data.request.body === "string") {
            data.request.body = data.request.body.replace(/t=0 0\r\r/g, "t=0 0\r");
          }

          const remoteCaller = session.remote_identity?.uri?.user || "Unknown Caller";
          console.log("[WebPhone] Incoming WebRTC call from:", remoteCaller);

          setCallState("RINGING_INBOUND");
          setActiveCall((prev) => ({
            direction: "INBOUND",
            remoteIdentity: remoteCaller,
            displayName: session.remote_identity?.display_name || prev?.displayName || remoteCaller,
            durationSeconds: 0,
            isMuted: false,
            metadata: prev?.metadata,
          }));

          bindSessionEvents(session, "INBOUND", remoteCaller);

          // Auto-answer if user already pressed Answer button during screen-pop
          if (pendingAnswerRef.current) {
            pendingAnswerRef.current = false;
            console.log("[WebPhone] Auto-answering pending incoming call on arrival of SIP session");
            void (async () => {
              try {
                let localStream: MediaStream | null = null;
                try {
                  localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                    },
                    video: false,
                  });
                } catch (micErr) {
                  console.warn("[WebPhone] Auto-answer getUserMedia notice:", micErr);
                }

                session.answer({
                  mediaStream: localStream || undefined,
                  mediaConstraints: { audio: true, video: false },
                  pcConfig: {
                    iceServers: STUN_ICE_SERVERS
                  }
                });
              } catch (ansErr) {
                console.error("[WebPhone] Auto-answer failed:", ansErr);
              }
            })();
          }
        }
      });

      ua.start();
      uaRef.current = ua;
    } catch (err) {
      console.warn("[WebPhone] Could not initialize WebRTC credentials:", err);
      setConnectionStatus("ERROR");
    }
  }, [isAuthenticated, user, isSupported, bindSessionEvents]);

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

  // Auto-recovery watchdog: If connectionStatus is stuck in CONNECTING for > 7s, auto-retry connection
  React.useEffect(() => {
    if (connectionStatus !== "CONNECTING") return;

    const timeout = setTimeout(() => {
      console.warn("[WebPhone] Connection watchdog: Still CONNECTING after 7s, triggering auto-reconnect...");
      void setupPhone();
    }, 7000);

    return () => clearTimeout(timeout);
  }, [connectionStatus, setupPhone]);

  // Answer call
  const answerCall = React.useCallback(
    async (callInfo?: { caller_phone?: string; lead_name?: string; lead_id?: any; member_id?: any }) => {
      const session = currentSessionRef.current;
      const canAnswer = session && !session.isEnded() && !session.isEstablished();

      if (canAnswer) {
        try {
          // 1. Explicitly acquire microphone audio stream with browser user gesture context
          let localStream: MediaStream | null = null;
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            localStreamRef.current = localStream;
            console.log(
              "[WebPhone] Local microphone stream acquired successfully:",
              localStream.getAudioTracks().map((t) => t.label).join(", ")
            );
          } catch (micErr) {
            console.warn("[WebPhone] getUserMedia error in answerCall:", micErr);
            toast.error("Microphone Access Required", {
              description: "Please allow microphone access in your browser to answer calls.",
            });
            return;
          }

          // 2. Preserve call display information and metadata immediately
          if (callInfo) {
            setActiveCall((prev) => ({
              direction: "INBOUND",
              remoteIdentity: callInfo.caller_phone || prev?.remoteIdentity || "Incoming Call",
              displayName: callInfo.lead_name || callInfo.caller_phone || prev?.displayName || "Incoming Call",
              durationSeconds: 0,
              isMuted: false,
              metadata: {
                leadId: callInfo.lead_id,
                leadName: callInfo.lead_name,
                memberId: callInfo.member_id,
              },
            }));
          }

          // 3. Answer session with pre-acquired mediaStream and STUN config
          session.answer({
            mediaStream: localStream,
            mediaConstraints: { audio: true, video: false },
            pcConfig: {
              iceServers: STUN_ICE_SERVERS
            }
          });

          // 4. Notify other open tabs
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
        if (callInfo) {
          setActiveCall({
            direction: "INBOUND",
            remoteIdentity: callInfo.caller_phone || "Incoming Call",
            displayName: callInfo.lead_name || callInfo.caller_phone || "Incoming Call",
            durationSeconds: 0,
            isMuted: false,
            metadata: {
              leadId: callInfo.lead_id,
              leadName: callInfo.lead_name,
              memberId: callInfo.member_id,
            },
          });
        }
        setCallState("RINGING_INBOUND");
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
            setCallState("IDLE");
            setActiveCall(null);
          }
        }, 25000);
      }
    },
    [attachRemoteStream]
  );

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

  // Toggle Mute (Track-Level WebRTC Muting)
  const toggleMute = React.useCallback(() => {
    const session = currentSessionRef.current;
    if (!session || callState !== "CONNECTED") return;
    try {
      const currentlyMuted = activeCall?.isMuted ?? false;
      const nextMuted = !currentlyMuted;

      // 1. Hardware/track level WebRTC muting across both RTCPeerConnection and local MediaStream
      const pc: RTCPeerConnection | null = (session as any)._connection || (session as any).connection;
      if (pc) {
        const senders = pc.getSenders ? pc.getSenders() : [];
        senders.forEach((sender: any) => {
          if (sender.track && sender.track.kind === "audio") {
            sender.track.enabled = !nextMuted;
          }
        });

        if (typeof (pc as any).getLocalStreams === "function") {
          const streams = (pc as any).getLocalStreams() || [];
          streams.forEach((stream: MediaStream) => {
            stream.getAudioTracks().forEach((track) => {
              track.enabled = !nextMuted;
            });
          });
        }
      }

      // Also ensure tracks on session's localMediaStream are enabled/disabled
      const localStream = (session as any)._localMediaStream;
      if (localStream && typeof localStream.getAudioTracks === "function") {
        localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
          track.enabled = !nextMuted;
        });
      }

      // 2. JsSIP session level mute
      try {
        if (nextMuted) {
          session.mute({ audio: true, video: false });
        } else {
          session.unmute({ audio: true, video: false });
        }
      } catch (sipErr) {
        console.debug("[WebPhone] JsSIP session mute notice:", sipErr);
      }

      setActiveCall((prev) => (prev ? { ...prev, isMuted: nextMuted } : null));
      if (nextMuted) {
        toast.info("Microphone Muted", { description: "Remote party cannot hear you." });
      } else {
        toast.info("Microphone Active", { description: "Remote party can hear you." });
      }
    } catch (err) {
      console.warn("[WebPhone] Mute toggle error:", err);
    }
  }, [callState, activeCall?.isMuted]);

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

      let cleanNumber = targetPhone.trim().replace(/[\s-]/g, "");
      if (!cleanNumber.startsWith("sip:")) {
        const rawDigits = cleanNumber.replace(/\D/g, "");
        if (rawDigits.length !== 10 && (rawDigits.length !== 12 || !rawDigits.startsWith("91"))) {
          toast.error("Invalid Number", {
            description: "Please enter a valid 10-digit mobile number.",
          });
          return false;
        }
        if (rawDigits.length === 10) {
          cleanNumber = `+91${rawDigits}`;
        } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
          cleanNumber = `+${rawDigits}`;
        }
      }
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

        startRingbackTone();

        const session = uaRef.current.call(sipTarget, {
          mediaConstraints: { audio: true, video: false },
          extraHeaders: [
            agentCredentials?.caller_id ? `X-Caller-ID: ${agentCredentials.caller_id}` : "",
          ].filter(Boolean),
          pcConfig: {
            iceServers: STUN_ICE_SERVERS
          }
        });

        // Fast Feedback: Transition state to RINGING_OUTBOUND after 1.5s so agent clearly sees
        // ringing status and hears ringback cadence without silent delay
        setTimeout(() => {
          if (currentSessionRef.current === session && !session.isEnded() && !session.isEstablished()) {
            setCallState((st) => (st === "DIALING_OUTBOUND" ? "RINGING_OUTBOUND" : st));
          }
        }, 1500);

        bindSessionEvents(session, "OUTBOUND", cleanNumber, contactName, metadata);
        return true;
      } catch (err) {
        stopRingbackTone();
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

export function useWebRTCPhone(): WebRTCPhoneContextValue {
  const context = React.useContext(WebRTCPhoneContext);
  return context || DEFAULT_PHONE_CONTEXT;
}
