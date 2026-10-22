import React, { useRef, useState, useEffect } from 'react';
import { Film, Lock, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-lg select-none ${
        isFullscreen ? 'rounded-none border-0 h-screen w-screen max-h-screen' : ''
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Sandboxed Iframe with 4% zoom to crop outer border artifacts */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src={safeEmbedUrl}
          title={title}
          className="h-full w-full border-0 pointer-events-auto transform scale-[1.04] origin-center"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>

      {/* 2. Solid Top Security Bar: 100% Covers YouTube Title, Channel Avatar & Copy Link button */}
      <div
        className="absolute top-0 left-0 right-0 h-14 bg-black/95 border-b border-white/10 pointer-events-auto flex items-center justify-between px-3.5 z-20 shadow-md"
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white text-xs font-semibold select-none truncate max-w-[65%] sm:max-w-[75%]">
          <Film className="size-3.5 text-primary shrink-0" />
          <span className="truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] bg-white/10 text-white/90 px-2 py-0.5 rounded border border-white/15 font-medium tracking-wide select-none hidden sm:flex items-center gap-1">
            <Lock className="size-2.5 text-primary" /> Studio Player
          </span>

          {/* In-App Clean Fullscreen Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 px-2 text-white/90 hover:text-white hover:bg-white/15 text-xs gap-1 font-semibold border border-white/10 bg-white/5"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5 text-primary" /> : <Maximize2 className="size-3.5 text-primary" />}
            <span className="hidden xs:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </Button>
        </div>
      </div>

      {/* 3. Bottom-Left Shield: Covers & Blocks YouTube's Copy Link (🔗) icon */}
      <div
        className="absolute bottom-2.5 left-2.5 z-20 pointer-events-auto w-16 h-10 bg-black/95 rounded-lg border border-white/10 shadow-lg flex items-center justify-center cursor-default"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="text-[9px] text-white/60 font-mono tracking-wider font-semibold">SWEAT</span>
      </div>

      {/* 4. Bottom-Right Expanded Shield: 100% Covers YouTube Logo & 'Watch on YouTube' button */}
      <div
        className="absolute bottom-2.5 right-2.5 z-20 pointer-events-auto flex items-center gap-1.5 bg-black/95 px-3.5 py-1.5 rounded-lg border border-white/15 shadow-xl select-none cursor-default"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => e.preventDefault()}
        title="Protected Studio Stream"
      >
        <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
        <span className="text-[11px] text-white font-semibold tracking-wide">Studio Stream</span>
      </div>
    </div>
  );
};
export default SecureWorkoutPlayer;
