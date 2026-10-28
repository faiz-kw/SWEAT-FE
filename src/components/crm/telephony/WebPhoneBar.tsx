import * as React from "react";
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, X, Settings } from "lucide-react";
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
    isSupported,
  } = useWebRTCPhone();

  const [dialpadOpen, setDialpadOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [targetNumber, setTargetNumber] = React.useState("");

  if (!isSupported) return null;

  const isConnected = connectionStatus === "REGISTERED";
  const isInCall = callState === "CONNECTED";
  const isDialing = callState === "DIALING_OUTBOUND";
  const isRinging = callState === "RINGING_INBOUND";

  const handleDial = (digit: string) => {
    setTargetNumber((prev) => prev + digit);
    if (isInCall) {
      sendDTMF(digit);
    }
  };

  const handleStartCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNumber.trim()) return;
    const ok = await makeCall(targetNumber);
    if (ok) {
      setDialpadOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Active Call Floating Capsule */}
        {(isInCall || isDialing || isRinging) && activeCall && (
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 animate-in fade-in zoom-in duration-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {isRinging && <span>Incoming from {activeCall.displayName}...</span>}
              {isDialing && <span>Dialing {activeCall.displayName}...</span>}
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

            {(isInCall || isDialing) && (
              <div className="flex items-center gap-1 ml-1">
                {isInCall && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    title={activeCall.isMuted ? "Unmute" : "Mute"}
                    className={cn(
                      "h-6 w-6 p-0 rounded-full",
                      activeCall.isMuted ? "bg-rose-500/20 text-rose-500" : "hover:bg-emerald-500/20"
                    )}
                  >
                    {activeCall.isMuted ? <MicOff className="size-3.5 text-rose-500" /> : <Mic className="size-3.5" />}
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
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
              title={`WebPhone: ${connectionStatus}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-emerald-500" : connectionStatus === "CONNECTING" ? "bg-amber-500 animate-pulse" : "bg-rose-400"
                )}
              />
              <Phone className="size-3.5" />
              <span className="hidden md:inline font-semibold">WebPhone</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-68 p-3.5" align="end">
            <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Phone className="size-3.5 text-primary" />
                <span>SWEAT In-Browser Phone</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    isConnected ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"
                  )}
                >
                  {connectionStatus}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDialpadOpen(false);
                    setSettingsOpen(true);
                  }}
                  title="Telephony Settings"
                >
                  <Settings className="size-3.5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleStartCall} className="space-y-3">
              <div className="flex gap-1.5">
                <Input
                  type="tel"
                  placeholder="+91..."
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  className="h-9 text-sm font-mono tracking-wider"
                />
                {targetNumber && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setTargetNumber("")}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Dialpad Matrix */}
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    onClick={() => handleDial(d)}
                    className="h-9 text-sm font-semibold hover:bg-primary/10 active:scale-95 transition-transform"
                  >
                    {d}
                  </Button>
                ))}
              </div>

              <Button
                type="submit"
                disabled={!isConnected || !targetNumber.trim() || isInCall || isDialing}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-md shadow-emerald-600/20"
              >
                <PhoneCall className="size-3.5" /> Call via WebRTC
              </Button>

              {agentCredentials && (
                <div className="text-[10px] text-muted-foreground text-center pt-1 font-mono">
                  Caller ID: {agentCredentials.caller_id}
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
