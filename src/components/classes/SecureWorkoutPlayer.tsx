import React, { useRef, useState, useEffect } from 'react';
import { Film, Lock, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ensure embedUrl has fs=0 parameter to hide YouTube's native fullscreen button
  const safeEmbedUrl = React.useMemo(() => {
    if (!embedUrl) return '';
    if (embedUrl.includes('youtube') || embedUrl.includes('youtu.be')) {
      const sep = embedUrl.includes('?') ? '&' : '?';
      if (!embedUrl.includes('fs=')) {
        return `${embedUrl}${sep}fs=0`;
      }
    }
    return embedUrl;
  }, [embedUrl]);

  // Fullscreen change listener & ESC key support (scoped to this player container)
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
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
          // Graceful fallback to CSS fixed fullscreen if browser blocks API
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
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black select-none transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] h-screen w-screen max-h-screen max-w-screen flex items-center justify-center rounded-none border-0 shadow-none'
          : 'aspect-video rounded-xl border border-border shadow-lg'
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. 16:9 Video Stage with Security Shields pinned directly to the video frame */}
      <div
        className={
          isFullscreen
            ? 'relative aspect-video max-w-full max-h-full flex items-center justify-center overflow-hidden'
            : 'absolute inset-0 overflow-hidden'
        }
        style={
          isFullscreen
            ? {
                width: 'min(100vw, calc(100vh * (16 / 9)))',
                height: 'min(100vh, calc(100vw * (9 / 16)))',
                maxWidth: '100vw',
                maxHeight: '100vh',
                aspectRatio: '16 / 9',
              }
            : undefined
        }
      >
        <iframe
          src={safeEmbedUrl}
          title={title}
          className="h-full w-full border-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
        />

        {/* 2. Solid Top Security Bar: 100% Covers YouTube Title, Channel Avatar & Copy Link button */}
        <div
          className="absolute top-0 left-0 right-0 h-14 bg-black/95 border-b border-white/10 pointer-events-auto flex items-center justify-between px-3.5 z-20 shadow-md"
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-white text-xs font-semibold select-none truncate max-w-[55%] sm:max-w-[70%]">
            <Film className="size-4 text-cyan-400 shrink-0" />
            <span className="truncate">{title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-white/10 text-white/90 px-2.5 py-1 rounded-md border border-white/20 font-medium tracking-wide select-none hidden sm:flex items-center gap-1.5">
              <Lock className="size-3 text-cyan-300" /> Studio Player
            </span>

            {/* In-App Clean Prominent Full Screen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-8 px-3 rounded-md bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4 text-cyan-300 shrink-0" />
              ) : (
                <Maximize2 className="size-4 text-cyan-300 shrink-0" />
              )}
              <span className="text-white text-xs font-semibold whitespace-nowrap">
                {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Bottom-Left Security Shield: Blocks YouTube video watermark, end-card link & copy link icons */}
        <div
          className="absolute bottom-0 left-0 z-30 pointer-events-auto flex items-center gap-1.5 bg-black px-4 py-2.5 rounded-tr-xl border-t border-r border-white/15 shadow-2xl min-w-[140px] h-12 select-none cursor-default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onContextMenu={(e) => e.preventDefault()}
          title="Protected Stream"
        >
          <Lock className="size-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs text-white/90 font-medium tracking-wide">Protected</span>
        </div>

        {/* 4. Bottom-Right Expanded Shield: Completely covers YouTube Logo & 'Watch on YouTube' button */}
        <div
          className="absolute bottom-0 right-0 z-30 pointer-events-auto flex items-center justify-center gap-2 bg-black px-5 py-2.5 rounded-tl-xl border-t border-l border-white/15 shadow-2xl min-w-[210px] h-12 select-none cursor-default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onContextMenu={(e) => e.preventDefault()}
          title="Protected Studio Stream"
        >
          <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-white font-semibold tracking-wide">Studio Stream</span>
        </div>
      </div>
    </div>
  );
};

export default SecureWorkoutPlayer;
