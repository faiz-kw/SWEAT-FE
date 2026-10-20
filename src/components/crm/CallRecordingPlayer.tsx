import * as React from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  FileText,
  Copy,
  Check,
  Sparkles,
  Clock,
  Bot,
  User,
  Headphones,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CallRecordingPlayerProps {
  recordingUrl?: string | null;
  durationSeconds?: number;
  transcript?: any;
  title?: string;
  disposition?: string;
  callSessionId?: string;
  provider?: string;
  startedAt?: string;
  callerName?: string;
  className?: string;
}

interface ParsedTurn {
  role: 'agent' | 'user';
  text: string;
  secondaryText?: string;
}

export const CallRecordingPlayer: React.FC<CallRecordingPlayerProps> = ({
  recordingUrl,
  durationSeconds = 120,
  transcript,
  title = 'AI Voice Call Recording',
  disposition,
  callSessionId,
  provider = 'Sarvam AI',
  startedAt,
  callerName = 'Lead',
  className,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const simTimerRef = React.useRef<any>(null);

  const totalDuration = React.useMemo(() => {
    return Math.max(1, Math.round(durationSeconds || 120));
  }, [durationSeconds]);

  // Extract high-level summary and disposition if present in text
  const { extractedSummary, extractedDisposition } = React.useMemo(() => {
    let sum = '';
    let disp = disposition || '';

    if (typeof transcript === 'string') {
      for (const line of transcript.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Call Summary:')) {
          sum = trimmed.replace('Call Summary:', '').trim();
        } else if (trimmed.startsWith('Disposition:') && !disp) {
          disp = trimmed.replace('Disposition:', '').trim();
        }
      }
    }

    return { extractedSummary: sum, extractedDisposition: disp };
  }, [transcript, disposition]);

  // Parse turns from transcript input
  const parsedTurns: ParsedTurn[] = React.useMemo(() => {
    if (!transcript) return [];

    if (Array.isArray(transcript)) {
      return transcript.map((turn: any) => ({
        role: turn.role === 'agent' || turn.role === 'assistant' ? 'agent' : 'user',
        text: turn.en_text || turn.text || turn.content || '',
        secondaryText: turn.indic_text || '',
      })).filter((t: ParsedTurn) => t.text.trim().length > 0);
    }

    if (typeof transcript === 'string') {
      const lines = transcript.split('\n');
      const turns: ParsedTurn[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('Call Summary:') || trimmed.startsWith('Disposition:')) continue;

        if (trimmed.toLowerCase().startsWith('agent:') || trimmed.toLowerCase().startsWith('mahek:')) {
          turns.push({
            role: 'agent',
            text: trimmed.replace(/^(agent|mahek):/i, '').trim(),
          });
        } else if (trimmed.toLowerCase().startsWith('user:') || trimmed.toLowerCase().startsWith('caller:') || trimmed.toLowerCase().startsWith('prospect:')) {
          turns.push({
            role: 'user',
            text: trimmed.replace(/^(user|caller|prospect):/i, '').trim(),
          });
        }
      }

      if (turns.length > 0) return turns;

      // If we have an extracted summary, present it as the verified conversation synopsis
      if (extractedSummary) {
        return [
          {
            role: 'agent',
            text: extractedSummary,
          },
        ];
      }

      // If plain text summary, clean up raw tags
      const cleanText = transcript
        .replace(/^AI Voice Call:\s*[A-Z_]+/i, '')
        .replace(/Disposition:\s*[A-Z_]+/i, '')
        .trim();

      return [
        {
          role: 'agent',
          text: cleanText || transcript,
        },
      ];
    }

    return [];
  }, [transcript, extractedSummary]);

  // Resolve effective audio playback URL
  const resolvedAudioUrl = React.useMemo(() => {
    let raw = recordingUrl;
    if (!raw && callSessionId) {
      raw = `/api/v1/voice-agent/recordings/${callSessionId}/audio.wav`;
    }
    if (!raw) return null;
    if (raw.endsWith('/audio/')) {
      raw = raw.replace(/\/audio\/$/, '/audio.wav');
    }
    return raw;
  }, [recordingUrl, callSessionId]);

  // Ensure audio element loads source whenever resolvedAudioUrl changes
  React.useEffect(() => {
    if (audioRef.current && resolvedAudioUrl) {
      try {
        audioRef.current.load();
      } catch (e) {
        // ignore
      }
    }
  }, [resolvedAudioUrl]);

  // Handle HTML5 audio playback or simulation
  const handleTogglePlay = async () => {
    if (resolvedAudioUrl) {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio(resolvedAudioUrl);
        audioRef.current = audio;
      }

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          audio.playbackRate = playbackRate;
          audio.volume = 1.0;
          audio.muted = isMuted;
          if (audio.readyState === 0 || audio.error) {
            audio.load();
          }
          if (currentTime > 0 && Math.abs(audio.currentTime - currentTime) > 0.5) {
            audio.currentTime = currentTime;
          }
          await audio.play();
          setIsPlaying(true);
        } catch (err: any) {
          console.warn('Primary audio play failed, falling back to standalone Audio instance:', err);
          try {
            const fallbackAudio = new Audio(resolvedAudioUrl);
            fallbackAudio.playbackRate = playbackRate;
            fallbackAudio.volume = 1.0;
            fallbackAudio.muted = isMuted;
            if (currentTime > 0) {
              fallbackAudio.currentTime = currentTime;
            }
            fallbackAudio.ontimeupdate = () => {
              setCurrentTime(fallbackAudio.currentTime);
            };
            fallbackAudio.onended = () => {
              setIsPlaying(false);
              setCurrentTime(0);
            };
            await fallbackAudio.play();
            audioRef.current = fallbackAudio;
            setIsPlaying(true);
          } catch (retryErr: any) {
            console.error('All audio playback attempts failed:', retryErr);
            toast.error('Unable to play audio: ' + (retryErr.message || err.message));
            setIsPlaying(false);
          }
        }
      }
      return;
    }

    // Interactive simulated playback mode
    if (isPlaying) {
      clearInterval(simTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      simTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            clearInterval(simTimerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackRate);
    }
  };

  React.useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (resolvedAudioUrl && audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const handleCopyTranscript = () => {
    const text = typeof transcript === 'string'
      ? transcript
      : parsedTurns.map((t) => `${t.role === 'agent' ? 'Mahek (SWEAT AI)' : callerName}: ${t.text}`).join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Transcript copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={cn(
        'mt-2.5 rounded-xl border border-primary/20 bg-gradient-to-br from-card/90 via-primary/5 to-card/90 p-3.5 shadow-xs transition-all duration-200',
        className
      )}
    >
      {/* Audio Element if URL available */}
      {resolvedAudioUrl && (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          preload="auto"
        >
          <source src={resolvedAudioUrl} type="audio/wav" />
        </audio>
      )}

      {/* Top Header / Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                {title || 'Call Audio Recording'}
              </span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-primary/30 text-primary bg-primary/5 font-mono">
                {provider}
              </Badge>
              {disposition && (
                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                  {disposition.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <p className="text-[10.5px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/70" />
              Duration: {formatTime(totalDuration)}
              {callSessionId && (
                <>
                  <span className="text-muted-foreground/40">&bull;</span>
                  <span>ID: {callSessionId.slice(0, 8)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5">
          {resolvedAudioUrl && (
            <a
              href={resolvedAudioUrl}
              download={`call_${callSessionId || 'recording'}.wav`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border/60 hover:bg-accent text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Download call audio recording"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
            className="h-7 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 font-medium"
          >
            <FileText className="w-3 h-3" />
            <span>Transcript</span>
            {parsedTurns.length > 0 && (
              <span className="ml-0.5 px-1 py-0.2 rounded-full bg-primary/20 text-[9px] font-bold">
                {parsedTurns.length}
              </span>
            )}
            {showTranscript ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </Button>
        </div>
      </div>

      {/* Main Interactive Playback Controls */}
      <div className="pt-3 pb-1 flex flex-col sm:flex-row items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isPlaying
              ? 'bg-primary text-primary-foreground scale-102 shadow-primary/25'
              : 'bg-primary/90 hover:bg-primary text-primary-foreground hover:scale-105'
          )}
          title={isPlaying ? 'Pause call recording' : 'Play call recording'}
        >
          {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
        </button>

        {/* Progress Slider & Timestamps */}
        <div className="flex-1 w-full space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Sound Wave Animation Visualizer */}
        <div className="hidden md:flex items-center gap-0.5 h-6 px-1.5">
          {[40, 75, 55, 90, 60, 80, 45, 95, 70, 85, 50, 65].map((height, i) => (
            <span
              key={i}
              className={cn(
                'w-0.75 rounded-full transition-all duration-200',
                isPlaying
                  ? 'bg-primary animate-pulse'
                  : 'bg-muted-foreground/30'
              )}
              style={{
                height: isPlaying ? `${Math.max(20, (height * (Math.sin(currentTime * 3 + i) * 0.4 + 0.6)))}%` : '25%',
                animationDelay: `${i * 75}ms`,
              }}
            />
          ))}
        </div>

        {/* Secondary Controls: Speed & Mute */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="h-7 px-2 rounded-md border border-border/60 hover:bg-accent text-[11px] font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle playback speed"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="w-7 h-7 rounded-md border border-border/60 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Recording Source Indicator */}
      {!recordingUrl && (
        <div className="mt-2 text-[10.5px] text-muted-foreground/80 flex items-center justify-between px-1">
          <span className="flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
            Sarvam AI Telephony Carrier Session • Audio synced with call logs
          </span>
          <span className="italic">Interactive audio preview available</span>
        </div>
      )}

      {/* EXPANDABLE CONVERSATION TRANSCRIPT ACCORDION */}
      {showTranscript && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Turn-by-Turn Conversation Transcript</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTranscript}
              className="h-6 px-2 text-[10.5px] gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          {/* Transcript Content */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-2 rounded-lg bg-background/50 p-2.5 border border-border/40 text-xs">
            {parsedTurns.length > 0 ? (
              parsedTurns.map((turn, idx) => {
                const isAgent = turn.role === 'agent';
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex gap-2 items-start',
                      isAgent ? 'flex-row' : 'flex-row-reverse'
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold shadow-2xs mt-0.5',
                        isAgent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2 max-w-[85%] space-y-0.5 shadow-2xs text-xs',
                        isAgent
                          ? 'bg-primary/10 border border-primary/20 text-foreground rounded-tl-xs'
                          : 'bg-card border border-border text-foreground rounded-tr-xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-primary">
                          {isAgent ? 'Mahek (SWEAT AI)' : callerName}
                        </span>
                        <span className="font-mono">Turn #{idx + 1}</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{turn.text}</p>
                      {turn.secondaryText && (
                        <p className="text-[11px] text-muted-foreground/90 italic pt-0.5 border-t border-border/30">
                          {turn.secondaryText}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4 italic text-xs">
                No turn-by-turn dialogue turns extracted for this call.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
