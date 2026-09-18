import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BranchScheduleTimePickerProps {
  value: string; // "HH:MM" (24h format)
  onChange: (val: string) => void;
  minTime?: string; // "HH:MM" e.g. "06:00"
  maxTime?: string; // "HH:MM" e.g. "22:00"
  label: string;
  disabled?: boolean;
  isEndTime?: boolean;
  startTime?: string; // For calculating quick +45m, +60m duration shortcuts
  operatingWindowText?: string;
}

// Convert "HH:MM" to minutes from midnight
export function toMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Convert minutes from midnight to "HH:MM" (24h)
export function fromMinutes(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Format "HH:MM" to "hh:mm A" for display
export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const BranchScheduleTimePicker: React.FC<BranchScheduleTimePickerProps> = ({
  value,
  onChange,
  minTime = '00:00',
  maxTime = '23:59',
  label,
  disabled = false,
  isEndTime = false,
  startTime,
  operatingWindowText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const minMins = toMinutes(minTime) ?? 0;
  const maxMins = toMinutes(maxTime) ?? 1439;
  const currentMins = toMinutes(value);

  // Parse 24h into 12h parts dynamically from current value or branch opening time
  const effectiveInitialMins = currentMins !== null ? currentMins : (minMins > 0 ? minMins : 480);
  const initialH24 = Math.floor(effectiveInitialMins / 60);
  const initialMinute = effectiveInitialMins % 60;
  const initialAmPm: 'AM' | 'PM' = initialH24 >= 12 ? 'PM' : 'AM';
  const initialHour12 = initialH24 % 12 === 0 ? 12 : initialH24 % 12;

  const [selectedHour, setSelectedHour] = useState(initialHour12);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>(initialAmPm);

  // Sync state when external value changes
  useEffect(() => {
    if (currentMins !== null) {
      const h24 = Math.floor(currentMins / 60);
      setSelectedMinute(currentMins % 60);
      setSelectedAmPm(h24 >= 12 ? 'PM' : 'AM');
      setSelectedHour(h24 % 12 === 0 ? 12 : h24 % 12);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleApplyTime = (h12: number, min: number, ampm: 'AM' | 'PM') => {
    let h24 = h12 % 12;
    if (ampm === 'PM') h24 += 12;
    const targetMins = h24 * 60 + min;

    // Constrain to min/max
    const clampedMins = Math.max(minMins, Math.min(maxMins, targetMins));
    onChange(fromMinutes(clampedMins));
    setIsOpen(false);
  };

  const isTimeValid = (mins: number) => {
    return mins >= minMins && mins <= maxMins;
  };

  // Preset slots for quick clicking
  const quickSlots: string[] = [];
  const startSlot = Math.ceil(minMins / 30) * 30;
  for (let m = startSlot; m <= maxMins; m += 30) {
    if (isEndTime && startTime) {
      const startMins = toMinutes(startTime) ?? 0;
      if (m <= startMins) continue;
    }
    quickSlots.push(fromMinutes(m));
  }

  // Check if current value violates operating hours
  const isOutOfRange = currentMins !== null && (currentMins < minMins || currentMins > maxMins);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all ${
          isOutOfRange
            ? 'border-destructive/60 bg-destructive/5 text-destructive'
            : isOpen
            ? 'border-primary ring-1 ring-primary/30 bg-background text-foreground'
            : 'border-border bg-background text-foreground hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`size-3.5 ${isOutOfRange ? 'text-destructive' : 'text-primary'}`} />
          <span className="font-medium">{value ? formatTime12h(value) : 'Select time'}</span>
        </div>
        <ChevronDown className="size-3 text-muted-foreground transition-transform" />
      </button>

      {isOutOfRange && (
        <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
          <AlertCircle className="size-2.5" />
          Outside branch operating window ({formatTime12h(minTime)} – {formatTime12h(maxTime)})
        </p>
      )}

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div className={`absolute z-50 mt-1.5 w-72 sm:w-80 p-3 bg-popover text-popover-foreground rounded-xl border border-border shadow-2xl animate-in fade-in-50 zoom-in-95 ${
          isEndTime ? 'right-0 sm:right-0' : 'left-0 sm:left-0'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-2">
            <div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              {operatingWindowText && (
                <p className="text-[10px] text-muted-foreground">{operatingWindowText}</p>
              )}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              {formatTime12h(fromMinutes(
                ((selectedHour % 12) + (selectedAmPm === 'PM' ? 12 : 0)) * 60 + selectedMinute
              ))}
            </span>
          </div>

          {/* Quick Duration Shortcuts for End Time */}
          {isEndTime && startTime && (
            <div className="mb-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Quick Duration
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[45, 60, 75, 90].map((dur) => {
                  const sMins = toMinutes(startTime) ?? 0;
                  const endMins = sMins + dur;
                  const isValid = endMins <= maxMins;
                  return (
                    <button
                      key={dur}
                      type="button"
                      disabled={!isValid}
                      onClick={() => {
                        onChange(fromMinutes(endMins));
                        setIsOpen(false);
                      }}
                      className={`text-[10px] py-1 px-1.5 rounded font-medium transition-colors ${
                        isValid
                          ? 'bg-secondary hover:bg-primary hover:text-primary-foreground text-secondary-foreground'
                          : 'opacity-40 bg-muted cursor-not-allowed text-muted-foreground'
                      }`}
                    >
                      +{dur} min
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CLOCK WHEEL / SPINNER SELECTOR */}
          <div className="grid grid-cols-3 gap-2 mb-3 bg-muted/40 p-2 rounded-lg border border-border/40">
            {/* Hour Selector */}
            <div>
              <span className="text-[10px] text-muted-foreground block text-center mb-1">Hour</span>
              <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                  const h24 = (h % 12) + (selectedAmPm === 'PM' ? 12 : 0);
                  const testMins = h24 * 60 + selectedMinute;
                  const isHourFeasible = isTimeValid(testMins);
                  const isSelected = selectedHour === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSelectedHour(h)}
                      className={`w-full text-center text-xs py-1 rounded transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isHourFeasible
                          ? 'hover:bg-accent text-foreground'
                          : 'text-muted-foreground/40 hover:bg-transparent cursor-not-allowed'
                      }`}
                    >
                      {h.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Selector */}
            <div>
              <span className="text-[10px] text-muted-foreground block text-center mb-1">Min</span>
              <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                  const h24 = (selectedHour % 12) + (selectedAmPm === 'PM' ? 12 : 0);
                  const testMins = h24 * 60 + m;
                  const isMinuteFeasible = isTimeValid(testMins);
                  const isSelected = selectedMinute === m;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMinute(m)}
                      className={`w-full text-center text-xs py-1 rounded transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isMinuteFeasible
                          ? 'hover:bg-accent text-foreground'
                          : 'text-muted-foreground/40 hover:bg-transparent cursor-not-allowed'
                      }`}
                    >
                      :{m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AM/PM Selector */}
            <div className="flex flex-col justify-center gap-2">
              <span className="text-[10px] text-muted-foreground block text-center mb-1">Period</span>
              <button
                type="button"
                onClick={() => setSelectedAmPm('AM')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  selectedAmPm === 'AM'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-foreground'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setSelectedAmPm('PM')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  selectedAmPm === 'PM'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-foreground'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* QUICK SLOTS ACCORDION / PRESETS */}
          {quickSlots.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Suggested Schedule Slots
              </span>
              <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 pr-1">
                {quickSlots.map((slot) => {
                  const isSelected = value === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        onChange(slot);
                        setIsOpen(false);
                      }}
                      className={`text-[10px] px-2 py-1 rounded border font-mono transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground font-bold'
                          : 'border-border/60 hover:border-primary/50 text-foreground bg-background hover:bg-secondary'
                      }`}
                    >
                      {formatTime12h(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs px-3 gap-1"
              onClick={() => handleApplyTime(selectedHour, selectedMinute, selectedAmPm)}
            >
              <Check className="size-3" />
              Set Time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
