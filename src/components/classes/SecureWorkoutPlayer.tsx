import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Film, Maximize2, Minimize2, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

interface SecureWorkoutPlayerProps {
  embedUrl: string;
  title?: string;
  className?: string;
}

export const SecureWorkoutPlayer: React.FC<SecureWorkoutPlayerProps> = ({
  embedUrl,
  title = 'Workout Instructional Stream',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Strict Headless YouTube Configuration:
  // controls=0 completely strips native YouTube playbar, logo & copy link button
  const safeEmbedUrl = React.useMemo(() => {
    if (!embedUrl) return '';
    if (embedUrl.includes('youtube') || embedUrl.includes('youtu.be')) {
      const baseUrl = embedUrl.split('?')[0];
      const params = new URLSearchParams(embedUrl.includes('?') ? embedUrl.split('?')[1] : '');

      params.set('controls', '0');       // Completely remove YouTube's native bottom bar, logo & copy link button
      params.set('enablejsapi', '1');    // Enable YouTube JS API & postMessage commands
      params.set('rel', '0');            // No external recommendations
      params.set('modestbranding', '1'); // Suppress YouTube branding
      params.set('iv_load_policy', '3'); // Disable video annotations
      params.set('cc_load_policy', '0'); // Disable closed captions
      params.set('disablekb', '1');      // Disable YouTube native keyboard shortcuts so custom shortcuts take precedence
      params.set('fs', '0');             // Disable YouTube native fullscreen button
      params.set('playsinline', '1');    // Play inline on mobile/tablets

      return `${baseUrl}?${params.toString()}`;
    }
    return embedUrl;
  }, [embedUrl]);

  // Programmatically send commands to YouTube iframe via postMessage
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch {
        // Ignore cross-origin postMessage errors
      }
    }
  }, []);

  const showFeedback = useCallback((text: string) => {
    setFeedback(text);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 700);
  }, []);

  // Auto-hide controls after inactivity during active playback
  const resetHideTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Only auto-hide while playing; leave visible when paused so the trainer can resume easily
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, resetHideTimer]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      sendYouTubeCommand('pauseVideo');
      setIsPlaying(false);
      showFeedback('Paused');
    } else {
      sendYouTubeCommand('playVideo');
      setIsPlaying(true);
      showFeedback('Playing');
    }
    resetHideTimer();
  }, [isPlaying, sendYouTubeCommand, showFeedback, resetHideTimer]);

  const seekRelative = useCallback((seconds: number) => {
    const target = Math.max(0, Math.min(duration || 3600, currentTime + seconds));
    sendYouTubeCommand('seekTo', [target, true]);
    setCurrentTime(target);
    showFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    resetHideTimer();
  }, [currentTime, duration, sendYouTubeCommand, showFeedback, resetHideTimer]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    sendYouTubeCommand('seekTo', [targetTime, true]);
    setCurrentTime(targetTime);
    resetHideTimer();
  };

  const handleIframeLoad = () => {
    // Register listener so YouTube automatically sends back time and playback state
    sendYouTubeCommand('addEventListener', ['onStateChange']);
    sendYouTubeCommand('unloadModule', ['captions']);
    sendYouTubeCommand('unloadModule', ['cc']);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      } catch {}
    }
  };

  // Fullscreen toggle logic
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    const elem = containerRef.current as any;

    const fsElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    const isCurrentlyFullscreen = Boolean(
      (fsElement && (fsElement === elem || elem.contains(fsElement))) ||
      isFullscreen
    );

    if (!isCurrentlyFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
      setIsFullscreen(false);
    }
    resetHideTimer();
  }, [isFullscreen, resetHideTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      const isThisElement = Boolean(
        fsElement &&
        containerRef.current &&
        (fsElement === containerRef.current || containerRef.current.contains(fsElement))
      );
      setIsFullscreen(isThisElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Lock background scroll during fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // Keyboard shortcuts: Space = Play/Pause, Left/Right = Seek 10s, Esc = Exit Fullscreen, F = Toggle Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, isFullscreen]);

  // Listen to YouTube player status messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        // YouTube Player State: 1 = Playing, 2 = Paused, 0 = Ended, 3 = Buffering
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.playerState !== 'undefined') {
            setIsPlaying(data.info.playerState === 1);
          }
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
        }
      } catch {
        // Ignore non-JSON messages from browser extensions
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Poll current time periodically while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      sendYouTubeCommand('getCurrentTime');
      sendYouTubeCommand('getDuration');
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, sendYouTubeCommand]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black select-none transition-all duration-200 group ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] h-[100dvh] w-screen max-h-[100dvh] max-w-screen flex items-center justify-center rounded-none border-0 shadow-none'
          : 'aspect-video rounded-xl border border-border shadow-lg'
      } ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. 16:9 Video Stage: Preserves aspect ratio with zero distortion, zero zoom, zero cropping */}
      <div
        className={
          isFullscreen
            ? 'relative aspect-video max-w-full max-h-full flex items-center justify-center overflow-hidden'
            : 'absolute inset-0 overflow-hidden'
        }
        style={
          isFullscreen
            ? {
                width: 'min(100%, calc(100dvh * (16 / 9)), calc(100vh * (16 / 9)))',
                height: 'min(100%, calc(100vw * (9 / 16)))',
                maxWidth: '100vw',
                maxHeight: '100dvh',
                aspectRatio: '16 / 9',
              }
            : undefined
        }
      >
        {/* Headless YouTube Iframe: pointer-events-none completely blocks right-click, links & YouTube context menu */}
        <iframe
          ref={iframeRef}
          src={safeEmbedUrl}
          title={title}
          onLoad={handleIframeLoad}
          className="h-full w-full border-0 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
        />

        {/* Transparent Click Surface to Toggle Play/Pause on Video Click */}
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        />

        {/* 2. Visual Feedback Flash (e.g. Spacebar / Arrow Keys feedback) */}
        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none animate-in fade-in zoom-in-90 duration-150">
            <div className="bg-black/85 border border-white/20 px-6 py-3 rounded-full text-white text-base font-bold tracking-wide shadow-2xl backdrop-blur-md flex items-center gap-2">
              <span>{feedback}</span>
            </div>
          </div>
        )}

        {/* 3. Option B: TV / Studio Floating Center HUD */}
        <div
          className={`absolute inset-0 z-30 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
            isControlsVisible ? 'opacity-100' : 'opacity-0 cursor-none'
          }`}
        >
          {/* Top Bar: Title on Left, Exit Full Screen on Right */}
          <div className="w-full px-5 py-3.5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
            <div className="flex items-center gap-2.5 text-white max-w-[70%] truncate">
              <Film className="size-4 text-cyan-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide drop-shadow-sm truncate">
                {title}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-7 px-3 rounded-md bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 shadow-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="size-3 text-cyan-300 shrink-0" />
                  <span className="whitespace-nowrap">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="size-3 text-cyan-300 shrink-0" />
                  <span className="whitespace-nowrap">Full Screen</span>
                </>
              )}
            </button>
          </div>

          {/* Center Floating Controls: [-10s] [Play/Pause] [+10s] */}
          <div className="self-center flex items-center gap-6 sm:gap-10 pointer-events-auto">
            {/* -10s Seek Backward */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seekRelative(-10);
              }}
              className="size-12 sm:size-14 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 border border-white/25 text-white flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer backdrop-blur-md group"
              title="Rewind 10 seconds (Left Arrow)"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="size-5 sm:size-6 text-white group-hover:text-cyan-300 transition-colors" />
              <span className="text-[10px] font-bold text-white/90 -mt-0.5">10</span>
            </button>

            {/* Large Center Play / Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="size-16 sm:size-20 rounded-full bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:shadow-cyan-500/50"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="size-8 sm:size-10 fill-black" />
              ) : (
                <Play className="size-8 sm:size-10 fill-black translate-x-0.5" />
              )}
            </button>

            {/* +10s Seek Forward */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seekRelative(10);
              }}
              className="size-12 sm:size-14 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 border border-white/25 text-white flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer backdrop-blur-md group"
              title="Forward 10 seconds (Right Arrow)"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="size-5 sm:size-6 text-white group-hover:text-cyan-300 transition-colors" />
              <span className="text-[10px] font-bold text-white/90 -mt-0.5">10</span>
            </button>
          </div>

          {/* Bottom Bar: Timeline Progress Bar & Time Display */}
          <div className="w-full px-5 py-3.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-auto">
            {/* Clickable Progress Bar */}
            <div
              className="w-full h-2 hover:h-2.5 bg-white/20 rounded-full overflow-hidden cursor-pointer transition-all relative flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleSeek(e);
              }}
              title="Click to seek"
            >
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Time Stamp Display */}
            <div className="flex items-center justify-between text-2xs text-white/80 font-mono mt-2 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureWorkoutPlayer;
