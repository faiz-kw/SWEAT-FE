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

  // Fullscreen change listener & ESC key support (strictly scoped to this player container)
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
          ? 'fixed inset-0 z-[999999] h-screen w-screen max-h-screen max-w-screen flex flex-col justify-between rounded-none border-0 shadow-none'
          : 'aspect-video rounded-xl border border-border shadow-lg group'
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Header Bar: Dedicated row above video in Fullscreen (zero video obstruction); sleek gradient overlay in normal mode */}
      <div
        className={
          isFullscreen
            ? 'w-full shrink-0 h-12 sm:h-14 bg-black/95 border-b border-white/10 px-3.5 sm:px-5 flex items-center justify-between z-30 shadow-md pointer-events-auto'
            : 'absolute top-0 left-0 right-0 h-10 px-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto flex items-center justify-between z-20 transition-opacity duration-200'
        }
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold select-none truncate max-w-[50%] sm:max-w-[65%] drop-shadow-sm">
          <Film className="size-3.5 sm:size-4 text-cyan-400 shrink-0" />
          <span className="truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {isFullscreen && (
            <span className="text-[10px] sm:text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30 font-medium tracking-wide select-none hidden md:flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" /> Studio Stream
            </span>
          )}

          <span
            className={
              isFullscreen
                ? 'text-[10px] sm:text-xs bg-white/10 text-white/90 px-2.5 py-1 rounded-md border border-white/20 font-medium tracking-wide select-none hidden sm:flex items-center gap-1.5'
                : 'text-[10px] bg-black/60 text-white/90 px-2 py-0.5 rounded border border-white/20 font-medium tracking-wide select-none hidden sm:flex items-center gap-1 backdrop-blur-xs'
            }
          >
            <Lock className={isFullscreen ? 'size-3 text-cyan-300' : 'size-2.5 text-cyan-300'} /> Studio Player
          </span>

          {/* Full Screen / Exit Full Screen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={
              isFullscreen
                ? 'h-8 sm:h-9 px-3 rounded-md bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400'
                : 'h-7 px-2.5 rounded bg-black/70 hover:bg-black/90 active:bg-black text-white border border-white/30 shadow-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400 backdrop-blur-xs'
            }
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5 sm:size-4 text-cyan-300 shrink-0" />
            ) : (
              <Maximize2 className="size-3.5 text-cyan-300 shrink-0" />
            )}
            <span className="text-white text-xs font-semibold whitespace-nowrap">
              {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Video Stage: In fullscreen, occupies remaining vertical height without overlap; in standard mode, fills the 16:9 container */}
      <div
        className={
          isFullscreen
            ? 'flex-1 min-h-0 w-full flex items-center justify-center p-0 md:p-1 relative overflow-hidden bg-black'
            : 'absolute inset-0 w-full h-full flex items-center justify-center'
        }
      >
        <div
          className={
            isFullscreen
              ? 'relative aspect-video max-w-full max-h-full flex items-center justify-center shadow-2xl'
              : 'relative w-full h-full'
          }
          style={
            isFullscreen
              ? {
                  width: 'min(100vw, calc((100vh - 3.5rem) * (16 / 9)))',
                  height: 'min(calc(100vh - 3.5rem), calc(100vw * (9 / 16)))',
                  maxWidth: '100vw',
                  maxHeight: 'calc(100vh - 3.5rem)',
                  aspectRatio: '16 / 9',
                }
              : undefined
          }
        >
          {/* Sandboxed Iframe without zoom scaling to guarantee 100% full content visibility */}
          <iframe
            src={safeEmbedUrl}
            title={title}
            className="w-full h-full border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
          />

          {/* Discreet click-guard in bottom-right corner to block accidental navigation to external YouTube */}
          <div
            className={
              isFullscreen
                ? 'absolute bottom-0 right-0 w-24 h-8 z-20 pointer-events-auto cursor-default opacity-0'
                : 'absolute bottom-0 right-0 w-20 h-7 z-20 pointer-events-auto cursor-default opacity-0'
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onContextMenu={(e) => e.preventDefault()}
            title="Protected Studio Stream"
          />
        </div>
      </div>
    </div>
  );
};

export default SecureWorkoutPlayer;
