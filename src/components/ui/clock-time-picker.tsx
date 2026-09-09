import * as React from "react";
import { Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClockTimePickerProps {
  /** Time string (24-hour e.g. "06:00" / "22:00" or 12-hour e.g. "06:28 PM") */
  value?: string;
  /** Callback returning standardized 24-hr format "HH:mm" and 12-hr format "hh:mm A" */
  onChange: (time24: string, time12: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Parse any time string into hour12, minute, period */
export function parseTimeToParts(timeStr?: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!timeStr) return { hour12: 6, minute: 0, period: "AM" };

  // 12-hr e.g. "06:28 PM" or "6:28pm"
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3].toUpperCase() as "AM" | "PM";
    if (h < 1) h = 12;
    if (h > 12) h = 12;
    return { hour12: h, minute: isNaN(m) ? 0 : m, period: p };
  }

  // 24-hr e.g. "22:00" or "06:30"
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const h24 = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour12: h12, minute: isNaN(m) ? 0 : m, period };
  }

  return { hour12: 6, minute: 0, period: "AM" };
}

/** Format hour12 + minute + period to 24-hr and 12-hr */
export function formatTimeParts(hour12: number, minute: number, period: "AM" | "PM"): { time24: string; time12: string } {
  let h24 = hour12;
  if (period === "AM") {
    if (h24 === 12) h24 = 0;
  } else {
    if (h24 !== 12) h24 += 12;
  }
  const h24Str = String(h24).padStart(2, "0");
  const mStr = String(minute).padStart(2, "0");
  const h12Str = String(hour12).padStart(2, "0");

  return {
    time24: `${h24Str}:${mStr}`,
    time12: `${h12Str}:${mStr} ${period}`,
  };
}

export function ClockTimePicker({
  value,
  onChange,
  placeholder = "Select Time",
  disabled = false,
  className = "",
  id,
}: ClockTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const initialParts = React.useMemo(() => parseTimeToParts(value), [value]);

  const [selectedHour, setSelectedHour] = React.useState<number>(initialParts.hour12);
  const [selectedMinute, setSelectedMinute] = React.useState<number>(initialParts.minute);
  const [period, setPeriod] = React.useState<"AM" | "PM">(initialParts.period);
  const [mode, setMode] = React.useState<"hour" | "minute">("hour");

  // Keep internal state in sync with external value
  React.useEffect(() => {
    const parts = parseTimeToParts(value);
    setSelectedHour(parts.hour12);
    setSelectedMinute(parts.minute);
    setPeriod(parts.period);
  }, [value]);

  const clockRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleOpen = () => {
    if (disabled) return;
    const parts = parseTimeToParts(value);
    setSelectedHour(parts.hour12);
    setSelectedMinute(parts.minute);
    setPeriod(parts.period);
    setMode("hour");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSetTime = () => {
    const { time24, time12 } = formatTimeParts(selectedHour, selectedMinute, period);
    onChange(time24, time12);
    setIsOpen(false);
  };

  // Convert pointer (mouse/touch) clientX, clientY into clock selection
  const handlePointerCoords = React.useCallback(
    (clientX: number, clientY: number, isFinal: boolean = false) => {
      if (!clockRef.current) return;
      const rect = clockRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Angle from 12 o'clock in degrees [0, 360)
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      if (mode === "hour") {
        let h = Math.round(angle / 30);
        if (h === 0) h = 12;
        setSelectedHour(h);
        if (isFinal) {
          // Switch to minute after selecting hour
          setTimeout(() => setMode("minute"), 200);
        }
      } else {
        const m = Math.round(angle / 6) % 60;
        setSelectedMinute(m);
      }
    },
    [mode]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handlePointerCoords(e.clientX, e.clientY, false);
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handlePointerCoords(e.clientX, e.clientY, false);
    },
    [isDragging, handlePointerCoords]
  );

  const handleMouseUp = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      handlePointerCoords(e.clientX, e.clientY, true);
    },
    [isDragging, handlePointerCoords]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      handlePointerCoords(e.touches[0].clientX, e.touches[0].clientY, false);
    }
  };

  const handleTouchMove = React.useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      handlePointerCoords(e.touches[0].clientX, e.touches[0].clientY, false);
    },
    [isDragging, handlePointerCoords]
  );

  const handleTouchEnd = React.useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      if (e.changedTouches.length > 0) {
        handlePointerCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY, true);
      }
    },
    [isDragging, handlePointerCoords]
  );

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Radius for clock numbers (responsive: computed relative to center)
  const numbersRadius = 82;

  // Selected angle in degrees
  const activeAngle = mode === "hour" ? (selectedHour % 12) * 30 : selectedMinute * 6;

  // Formatted display strings
  const currentDisplay = value ? formatTimeParts(initialParts.hour12, initialParts.minute, initialParts.period).time12 : "";
  const hourDisplay = String(selectedHour).padStart(2, "0");
  const minuteDisplay = String(selectedMinute).padStart(2, "0");

  return (
    <div className={`relative ${className}`}>
      {/* Trigger input field matching the screenshot: e.g. [ 06:28 PM  (orange clock icon) ] */}
      <div
        id={id}
        onClick={handleOpen}
        className={`flex items-center justify-between w-full h-10 rounded-lg border border-border/80 bg-background px-3.5 text-sm font-mono shadow-2xs transition-all cursor-pointer select-none ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-muted/30"
            : "hover:border-[#e06d2d] focus:border-[#e06d2d] focus:ring-2 focus:ring-[#e06d2d]/20"
        }`}
      >
        <span className={currentDisplay ? "text-foreground font-semibold text-xs sm:text-sm tracking-wide" : "text-muted-foreground text-xs"}>
          {currentDisplay || placeholder}
        </span>
        <div className="flex items-center justify-center h-6 w-6 rounded-full text-[#e06d2d]">
          <Clock className="h-4 w-4" />
        </div>
      </div>

      {/* Clock Modal Popover — 100% responsive on mobile & desktop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-[310px] sm:max-w-[340px] rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-card-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Digital Time Box + AM/PM Toggle */}
            <div className="flex items-center justify-between gap-3">
              {/* Digital digits */}
              <div className="flex items-center gap-1.5 font-bold font-mono text-2xl sm:text-3xl text-foreground">
                <button
                  type="button"
                  onClick={() => setMode("hour")}
                  className={`px-2.5 py-0.5 rounded-lg transition-all ${
                    mode === "hour"
                      ? "bg-[#e06d2d] text-white shadow-sm"
                      : "text-foreground hover:bg-muted/70"
                  }`}
                >
                  {hourDisplay}
                </button>
                <span className="text-muted-foreground pb-0.5">:</span>
                <button
                  type="button"
                  onClick={() => setMode("minute")}
                  className={`px-2.5 py-0.5 rounded-lg transition-all ${
                    mode === "minute"
                      ? "bg-[#e06d2d] text-white shadow-sm"
                      : "text-foreground hover:bg-muted/70"
                  }`}
                >
                  {minuteDisplay}
                </button>
              </div>

              {/* AM / PM Toggle Box */}
              <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    period === "AM"
                      ? "bg-card text-[#e06d2d] font-bold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("PM")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    period === "PM"
                      ? "bg-card text-[#e06d2d] font-bold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Mode Subtitle */}
            <div className="text-center pt-1">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                {mode === "hour" ? "SELECT HOUR" : "SELECT MINUTE"}
              </span>
            </div>

            {/* Circular Dial Container */}
            <div className="flex justify-center py-2">
              <div
                ref={clockRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative w-[210px] h-[210px] sm:w-[230px] sm:h-[230px] rounded-full bg-muted/40 dark:bg-muted/20 border border-border/50 shadow-inner flex items-center justify-center cursor-pointer select-none touch-none"
              >
                {/* Center Pivot Point */}
                <div className="absolute z-20 w-3 h-3 rounded-full bg-[#e06d2d] shadow-xs" />

                {/* Pointer Hand / Stick */}
                <div
                  className="absolute z-10 origin-bottom"
                  style={{
                    width: "2px",
                    height: `${numbersRadius}px`,
                    bottom: "50%",
                    left: "calc(50% - 1px)",
                    transform: `rotate(${activeAngle}deg)`,
                    transformOrigin: "bottom center",
                    backgroundColor: "#e06d2d",
                  }}
                >
                  {/* Tip circle enclosing selected number */}
                  <div className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-[#e06d2d] text-white flex items-center justify-center font-bold text-xs shadow-md">
                    {mode === "hour" ? selectedHour : String(selectedMinute).padStart(2, "0")}
                  </div>
                </div>

                {/* Clock Numbers */}
                {mode === "hour"
                  ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                      const angleRad = ((h * 30 - 90) * Math.PI) / 180;
                      const x = Math.round(numbersRadius * Math.cos(angleRad));
                      const y = Math.round(numbersRadius * Math.sin(angleRad));
                      const isSelected = selectedHour === h;

                      return (
                        <div
                          key={h}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHour(h);
                            setTimeout(() => setMode("minute"), 200);
                          }}
                          className={`absolute w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-full transition-colors pointer-events-auto cursor-pointer ${
                            isSelected
                              ? "text-transparent"
                              : "text-foreground hover:bg-muted/80"
                          }`}
                          style={{
                            transform: `translate(${x}px, ${y}px)`,
                          }}
                        >
                          {h}
                        </div>
                      );
                    })
                  : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                      const angleRad = ((m * 6 - 90) * Math.PI) / 180;
                      const x = Math.round(numbersRadius * Math.cos(angleRad));
                      const y = Math.round(numbersRadius * Math.sin(angleRad));
                      const isSelected = selectedMinute === m;

                      return (
                        <div
                          key={m}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMinute(m);
                          }}
                          className={`absolute w-7 h-7 flex items-center justify-center text-[11px] font-semibold rounded-full transition-colors pointer-events-auto cursor-pointer ${
                            isSelected
                              ? "text-transparent"
                              : "text-foreground hover:bg-muted/80"
                          }`}
                          style={{
                            transform: `translate(${x}px, ${y}px)`,
                          }}
                        >
                          {String(m).padStart(2, "0")}
                        </div>
                      );
                    })}
              </div>
            </div>

            {/* Footer: Cancel & Set Time Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSetTime}
                className="bg-[#e06d2d] hover:bg-[#c95b1e] text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                Set Time
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
