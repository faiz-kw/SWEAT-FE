import * as React from "react";
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, X, Settings, Delete, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWebRTCPhone } from "./WebRTCPhoneContext";
import { TelephonySettingsModal } from "./TelephonySettingsModal";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const DIALPAD_KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

export function WebPhoneBar() {
  const {
    connectionStatus,
    callState,
    activeCall,
    agentCredentials,
    answerCall,
    declineCall,
    hangupCall,
    toggleMute,
    makeCall,
    sendDTMF,
    reconnectPhone,
    isSupported,
  } = useWebRTCPhone();

  const [dialpadOpen, setDialpadOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [targetNumber, setTargetNumber] = React.useState("");
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  if (!isSupported) return null;

  const isConnected = connectionStatus === "REGISTERED";
  const isInCall = callState === "CONNECTED";
  const isDialing = callState === "DIALING_OUTBOUND";
  const isRingingOutbound = callState === "RINGING_OUTBOUND";
  const isRinging = callState === "RINGING_INBOUND";
  const isConnecting = isDialing || isRingingOutbound;

  const handleNumberChange = (raw: string) => {
    // Only accept numbers
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    setTargetNumber(digits.slice(0, 10));
  };

  const handleDial = (digit: string) => {
    if (isInCall) {
      sendDTMF(digit);
      return;
    }
    // Dialler accepts only digits 0-9 and strictly up to 10 digits
    if (!/^\d$/.test(digit)) return;
    setTargetNumber((prev) => (prev.length < 10 ? prev + digit : prev));
  };

  const handleStartCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetNumber.length !== 10) {
      return;
    }
    const ok = await makeCall(targetNumber);
    if (ok) {
      setDialpadOpen(false);
    }
  };

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      if (reconnectPhone) {
        await reconnectPhone();
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Active Call Floating Capsule */}
        {(isInCall || isConnecting || isRinging) && activeCall && (
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 animate-in fade-in zoom-in duration-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {isRinging && <span>Incoming from {activeCall.displayName}...</span>}
              {isDialing && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <Loader2 className="size-3 animate-spin text-amber-500" />
                  Connecting to carrier...
                </span>
              )}
              {isRingingOutbound && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <PhoneCall className="size-3 text-emerald-500 animate-pulse" />
                  Ringing {activeCall.displayName}...
                </span>
              )}
              {isInCall && (
                <>
                  <Volume2 className="size-3.5 text-emerald-500 animate-pulse" />
                  <span>{activeCall.displayName}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {formatDuration(activeCall.durationSeconds)}
                  </span>
                </>
              )}
            </div>

            {/* Controls */}
            {isRinging && (
              <div className="flex items-center gap-1 ml-1">
                <Button
                  size="sm"
                  variant="default"
                  onClick={answerCall}
                  className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full gap-1"
                >
                  <PhoneCall className="size-3" /> Answer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={declineCall}
                  className="h-6 px-2 text-xs rounded-full"
                >
                  Decline
                </Button>
              </div>
            )}

            {(isInCall || isConnecting) && (
              <div className="flex items-center gap-1 ml-1">
                {isInCall && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    title={activeCall.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    className={cn(
                      "h-6 px-1.5 text-xs font-medium rounded-full gap-1 transition-colors cursor-pointer",
                      activeCall.isMuted
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 border border-rose-500/40"
                        : "hover:bg-emerald-500/20 text-foreground"
                    )}
                  >
                    {activeCall.isMuted ? (
                      <>
                        <MicOff className="size-3.5 text-rose-500" />
                        <span className="text-[10px] font-bold">Muted</span>
                      </>
                    ) : (
                      <>
                        <Mic className="size-3.5 text-emerald-500" />
                        <span className="text-[10px]">Mute</span>
                      </>
                    )}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={hangupCall}
                  title="Hang Up"
                  className="h-6 px-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full gap-1"
                >
                  <PhoneOff className="size-3" /> End
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dialer & Status Trigger */}
        <Popover open={dialpadOpen} onOpenChange={setDialpadOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 text-xs font-medium rounded-lg gap-1.5 border transition-all",
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  : connectionStatus === "CONNECTING"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              )}
              title={`WebPhone: ${connectionStatus}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-emerald-500" : connectionStatus === "CONNECTING" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                )}
              />
              <Phone className="size-3.5" />
              <span className="hidden md:inline font-semibold">WebPhone</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[340px] sm:w-[390px] p-6 rounded-2xl shadow-2xl border-border/80 bg-popover/98 backdrop-blur-xl z-[9999]" align="end">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="size-4" />
                </div>
                <span>SWEAT Softphone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    isConnected
                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400"
                      : connectionStatus === "CONNECTING"
                      ? "text-amber-600 border-amber-500/30 bg-amber-500/10"
                      : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                  )}
                >
                  {isConnected ? "Ready" : connectionStatus}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDialpadOpen(false);
                    setSettingsOpen(true);
                  }}
                  title="Telephony Settings"
                >
                  <Settings className="size-4" />
                </Button>
              </div>
            </div>

            {/* Offline Diagnostic & Reconnect Alert */}
            {!isConnected && (
              <div className={cn(
                "mb-3 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200",
                connectionStatus === "CONNECTING"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
              )}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="truncate font-semibold text-[11px]">
                    {connectionStatus === "CONNECTING" ? "Connecting to carrier..." : "Gateway unlinked or offline"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isReconnecting}
                  onClick={handleReconnect}
                  className="h-6 px-2 text-[11px] font-bold gap-1 rounded-md shrink-0 bg-background/90 hover:bg-background border-border/80 shadow-xs"
                >
                  <RefreshCw className={cn("size-3", isReconnecting && "animate-spin")} />
                  Retry
                </Button>
              </div>
            )}

            <form onSubmit={handleStartCall} className="space-y-3.5">
              {/* Dialpad Input (Strict 10-Digit Numeric Only) */}
              <div className="space-y-1">
                <div className="relative flex items-center">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={targetNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      handleNumberChange(e.clipboardData.getData("text"));
                    }}
                    className={cn(
                      "h-14 text-2xl font-mono tracking-wider font-extrabold text-center pr-10 rounded-xl bg-muted/40 border-border/70 focus-visible:ring-emerald-500 transition-colors",
                      targetNumber.length === 10 && "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                    )}
                  />
                  {targetNumber ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 size-9 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => setTargetNumber((prev) => prev.slice(0, -1))}
                      title="Backspace"
                    >
                      <Delete className="size-4" />
                    </Button>
                  ) : null}
                </div>

                {/* 10-Digit Validation Indicator */}
                <div className="flex items-center justify-between px-1 text-[11px] h-4">
                  {targetNumber.length === 0 ? (
                    <span className="text-muted-foreground">Accepts exactly 10-digit mobile number</span>
                  ) : targetNumber.length === 10 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Valid 10-digit number (+91 {targetNumber})
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Enter {10 - targetNumber.length} more digit{10 - targetNumber.length === 1 ? "" : "s"}
                    </span>
                  )}
                  <span className={cn(
                    "font-mono text-[10px] font-bold px-1.5 py-0.2 rounded",
                    targetNumber.length === 10
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {targetNumber.length}/10
                  </span>
                </div>
              </div>

              {/* 3x4 Dialpad Matrix */}
              <div className="grid grid-cols-3 gap-2 py-0.5">
                {DIALPAD_KEYS.map(({ digit, sub }) => (
                  <Button
                    key={digit}
                    type="button"
                    variant="outline"
                    onClick={() => handleDial(digit)}
                    className="h-14 rounded-xl flex flex-col items-center justify-center py-1 transition-all hover:bg-primary/10 active:scale-95 border-border/60 hover:border-primary/40 shadow-xs"
                  >
                    <span className="text-xl font-extrabold leading-none text-foreground">{digit}</span>
                    {sub ? (
                      <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase leading-none mt-1">
                        {sub}
                      </span>
                    ) : (
                      <span className="h-[9px] mt-1" />
                    )}
                  </Button>
                ))}
              </div>

              {/* Call Action Button (Strictly Enabled Only When 10 Digits Entered) */}
              <Button
                type="submit"
                disabled={!isConnected || targetNumber.length !== 10 || isInCall || isDialing}
                className={cn(
                  "w-full h-13 text-white font-extrabold gap-2 text-base rounded-xl transition-all shadow-lg active:scale-[0.98]",
                  targetNumber.length === 10 && isConnected && !isInCall && !isDialing
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer opacity-100"
                    : "bg-muted text-muted-foreground/60 shadow-none cursor-not-allowed opacity-50 border border-border/50"
                )}
              >
                <PhoneCall className="size-4" /> Call via WebRTC
              </Button>

              {/* Identity & Caller ID Footer */}
              {agentCredentials && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1 border-t border-border/40 font-mono">
                  <span>Caller ID: {agentCredentials.caller_id}</span>
                  <span className="truncate max-w-[150px]" title={agentCredentials.username}>
                    Endpoint: {agentCredentials.username}
                  </span>
                </div>
              )}
            </form>
          </PopoverContent>
        </Popover>
      </div>

      {/* Dynamic Telephony Configuration Modal */}
      <TelephonySettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
