import * as React from "react";
import {
  Calendar, Clock, AlertCircle, CheckCircle2, Trash2, Plus,
  RefreshCw, Info, CalendarDays, Copy, Layers, Sparkles
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ClockTimePicker } from "@/components/ui/clock-time-picker";
import {
  fetchBranchWorkingHoursApi,
  saveBranchWorkingHoursBulkApi,
  fetchBranchOperatingExceptionsApi,
  createBranchOperatingExceptionApi,
  deleteBranchOperatingExceptionApi,
  type BranchWorkingHoursItem,
  type BranchOperatingExceptionItem,
} from "@/api/endpoints/api-admin";

const DAYS_OF_WEEK = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
  { day: 6, name: "Saturday", short: "Sat" },
  { day: 7, name: "Sunday", short: "Sun" },
];

interface DayScheduleConfig {
  is_open: boolean;
  open_time: string;
  close_time: string;
  is_24_hours: boolean;
  has_split_shift: boolean;
  open_time_2: string;
  close_time_2: string;
}

interface BranchScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: {
    id: string;
    name: string;
    city?: string;
    operating_hours?: string;
  } | null;
  availableBranches?: {
    id: string;
    name: string;
    city?: string;
  }[];
}

export function BranchScheduleModal({
  open,
  onOpenChange,
  branch,
  availableBranches = [],
}: BranchScheduleModalProps) {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "exceptions">("weekly");
  const [loading, setLoading] = React.useState(false);
  const [savingWeekly, setSavingWeekly] = React.useState(false);

  // Quick Apply toolbar states
  const [quickShift1Open, setQuickShift1Open] = React.useState("06:00");
  const [quickShift1Close, setQuickShift1Close] = React.useState("11:30");
  const [quickSplitShift, setQuickSplitShift] = React.useState(false);
  const [quickShift2Open, setQuickShift2Open] = React.useState("16:30");
  const [quickShift2Close, setQuickShift2Close] = React.useState("22:00");

  // Replicate from branch state
  const [sourceBranchId, setSourceBranchId] = React.useState("");
  const [replicating, setReplicating] = React.useState(false);

  // Weekly schedule state (days 1 to 7)
  const [weeklySchedule, setWeeklySchedule] = React.useState<Record<number, DayScheduleConfig>>(() => {
    const init: Record<number, DayScheduleConfig> = {};
    for (let d = 1; d <= 7; d++) {
      init[d] = {
        is_open: d !== 7,
        open_time: "06:00",
        close_time: "22:00",
        is_24_hours: false,
        has_split_shift: false,
        open_time_2: "16:30",
        close_time_2: "22:00",
      };
    }
    return init;
  });

  // Operating exceptions / Festive closures
  const [exceptions, setExceptions] = React.useState<BranchOperatingExceptionItem[]>([]);
  const [newExcDate, setNewExcDate] = React.useState("");
  const [newExcReason, setNewExcReason] = React.useState("");
  const [newExcIsClosed, setNewExcIsClosed] = React.useState(true);
  const [newExcOpenTime, setNewExcOpenTime] = React.useState("08:00");
  const [newExcCloseTime, setNewExcCloseTime] = React.useState("14:00");
  const [addingException, setAddingException] = React.useState(false);

  // Filter other branches for replicate feature
  const otherBranches = React.useMemo(() => {
    if (!branch?.id || !availableBranches) return [];
    return availableBranches.filter((b) => b.id !== branch.id);
  }, [availableBranches, branch?.id]);

  // Load data on modal open
  const loadData = React.useCallback(async () => {
    if (!branch?.id) return;
    setLoading(true);
    try {
      const [hoursData, excData] = await Promise.all([
        fetchBranchWorkingHoursApi(branch.id),
        fetchBranchOperatingExceptionsApi(branch.id),
      ]);

      if (hoursData && hoursData.length > 0) {
        const next: Record<number, DayScheduleConfig> = {};
        for (let d = 1; d <= 7; d++) {
          const found = hoursData.find((h) => h.day_of_week === d);
          if (found) {
            next[d] = {
              is_open: !!found.is_open,
              open_time: found.open_time || "06:00",
              close_time: found.close_time || (found.has_split_shift ? "11:30" : "22:00"),
              is_24_hours: !!found.is_24_hours,
              has_split_shift: !!found.has_split_shift,
              open_time_2: found.open_time_2 || "16:30",
              close_time_2: found.close_time_2 || "22:00",
            };
          } else {
            next[d] = {
              is_open: d !== 7,
              open_time: "06:00",
              close_time: "22:00",
              is_24_hours: false,
              has_split_shift: false,
              open_time_2: "16:30",
              close_time_2: "22:00",
            };
          }
        }
        setWeeklySchedule(next);
      }
      setExceptions(excData || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load branch schedule.");
    } finally {
      setLoading(false);
    }
  }, [branch?.id]);

  React.useEffect(() => {
    if (open && branch?.id) {
      loadData();
    }
  }, [open, branch?.id, loadData]);

  // Quick Apply actions
  const handleApplyToAllDays = () => {
    setWeeklySchedule((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= 7; d++) {
        next[d] = {
          ...next[d],
          is_open: true,
          open_time: quickShift1Open,
          close_time: quickShift1Close,
          has_split_shift: quickSplitShift,
          open_time_2: quickShift2Open,
          close_time_2: quickShift2Close,
        };
      }
      return next;
    });
    toast.success("Applied to all 7 days! You can tweak individual days manually below before saving.");
  };

  const handleApplyMonFri = () => {
    setWeeklySchedule((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= 7; d++) {
        if (d <= 5) {
          next[d] = {
            ...next[d],
            is_open: true,
            open_time: quickShift1Open,
            close_time: quickShift1Close,
            has_split_shift: quickSplitShift,
            open_time_2: quickShift2Open,
            close_time_2: quickShift2Close,
          };
        } else {
          next[d] = { ...next[d], is_open: false };
        }
      }
      return next;
    });
    toast.success("Applied Mon–Fri (Sat & Sun marked closed)! Click 'Save Weekly Schedule' when ready.");
  };

  const handleApplyMonSat = () => {
    setWeeklySchedule((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= 7; d++) {
        if (d <= 6) {
          next[d] = {
            ...next[d],
            is_open: true,
            open_time: quickShift1Open,
            close_time: quickShift1Close,
            has_split_shift: quickSplitShift,
            open_time_2: quickShift2Open,
            close_time_2: quickShift2Close,
          };
        } else {
          next[d] = { ...next[d], is_open: false };
        }
      }
      return next;
    });
    toast.success("Applied Mon–Sat (Sunday marked closed)! Click 'Save Weekly Schedule' when ready.");
  };

  // Replicate schedule from another branch
  const handleReplicateSchedule = async () => {
    if (!sourceBranchId) {
      toast.error("Please select a branch to replicate schedule from.");
      return;
    }
    const sourceBranch = availableBranches.find((b) => b.id === sourceBranchId);
    setReplicating(true);
    try {
      const hoursData = await fetchBranchWorkingHoursApi(sourceBranchId);
      if (!hoursData || hoursData.length === 0) {
        toast.warning(
          `Branch "${sourceBranch?.name || "Selected"}" does not have custom schedule configured yet.`
        );
        return;
      }

      const next: Record<number, DayScheduleConfig> = {};
      for (let d = 1; d <= 7; d++) {
        const found = hoursData.find((h) => h.day_of_week === d);
        if (found) {
          next[d] = {
            is_open: !!found.is_open,
            open_time: found.open_time || "06:00",
            close_time: found.close_time || (found.has_split_shift ? "11:30" : "22:00"),
            is_24_hours: !!found.is_24_hours,
            has_split_shift: !!found.has_split_shift,
            open_time_2: found.open_time_2 || "16:30",
            close_time_2: found.close_time_2 || "22:00",
          };
        } else {
          next[d] = {
            is_open: false,
            open_time: "06:00",
            close_time: "22:00",
            is_24_hours: false,
            has_split_shift: false,
            open_time_2: "16:30",
            close_time_2: "22:00",
          };
        }
      }
      setWeeklySchedule(next);
      toast.success(
        `Schedule successfully copied from "${sourceBranch?.name}"! Review and adjust any day before clicking "Save Weekly Schedule".`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to replicate schedule.");
    } finally {
      setReplicating(false);
    }
  };

  // Per-day toggles
  const handleDayToggle = (day: number, checked: boolean) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_open: checked,
      },
    }));
  };

  const handleDaySplitToggle = (day: number) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        has_split_shift: !prev[day].has_split_shift,
        close_time: !prev[day].has_split_shift && prev[day].close_time === "22:00" ? "11:30" : prev[day].close_time,
        open_time_2: prev[day].open_time_2 || "16:30",
        close_time_2: prev[day].close_time_2 || "22:00",
      },
    }));
  };

  const handleTimeChange = (
    day: number,
    field: "open_time" | "close_time" | "open_time_2" | "close_time_2",
    timeStr: string
  ) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: timeStr,
      },
    }));
  };

  const handleSaveWeekly = async () => {
    if (!branch?.id) return;
    setSavingWeekly(true);
    try {
      const payload: BranchWorkingHoursItem[] = Object.entries(weeklySchedule).map(([dayStr, conf]) => ({
        branch: branch.id,
        day_of_week: Number(dayStr),
        is_open: conf.is_open,
        is_24_hours: conf.is_24_hours,
        has_split_shift: conf.is_open && !conf.is_24_hours ? conf.has_split_shift : false,
        open_time: conf.is_open && !conf.is_24_hours ? conf.open_time : null,
        close_time: conf.is_open && !conf.is_24_hours ? conf.close_time : null,
        open_time_2: conf.is_open && !conf.is_24_hours && conf.has_split_shift ? conf.open_time_2 : null,
        close_time_2: conf.is_open && !conf.is_24_hours && conf.has_split_shift ? conf.close_time_2 : null,
      }));

      await saveBranchWorkingHoursBulkApi(branch.id, payload);
      toast.success("Weekly operating schedule and closed days updated!");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save weekly schedule.");
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch?.id) return;
    if (!newExcDate) {
      toast.error("Please choose an exception date.");
      return;
    }
    if (!newExcReason.trim()) {
      toast.error("Please enter a reason (e.g. Diwali, Holiday, Maintenance).");
      return;
    }

    setAddingException(true);
    try {
      await createBranchOperatingExceptionApi({
        branch: branch.id,
        exception_date: newExcDate,
        reason: newExcReason.trim(),
        is_closed: newExcIsClosed,
        open_time: newExcIsClosed ? null : newExcOpenTime,
        close_time: newExcIsClosed ? null : newExcCloseTime,
      });

      toast.success(`Operating exception for ${newExcDate} added!`);
      setNewExcDate("");
      setNewExcReason("");
      setNewExcIsClosed(true);
      loadData();
    } catch (err: any) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.message ||
        "Failed to add exception.";
      toast.error(detail);
    } finally {
      setAddingException(false);
    }
  };

  const handleDeleteException = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("Remove this holiday/exception? Regular weekly hours will resume on this date.")) return;
    try {
      await deleteBranchOperatingExceptionApi(id);
      toast.success("Operating exception removed.");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete exception.");
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Operating Schedule & Closed Days
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {branch.name} {branch.city ? `· ${branch.city}` : ""}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full p-1 bg-muted/60 rounded-xl mb-4">
              <TabsTrigger value="weekly" className="gap-2 rounded-lg text-xs font-semibold py-2">
                <Clock className="size-3.5" />
                Weekly Schedule & Closed Days
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="gap-2 rounded-lg text-xs font-semibold py-2">
                <Calendar className="size-3.5" />
                Festives & Holiday Closures ({exceptions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WEEKLY OPERATING SCHEDULE */}
            <TabsContent value="weekly" className="space-y-5 focus-visible:outline-none">
              {/* REPLICATE SCHEDULE FROM ANOTHER BRANCH */}
              {otherBranches.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/30">
                  <div className="flex items-center gap-2 text-xs">
                    <Copy className="size-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">Replicate from another branch:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={sourceBranchId}
                      onChange={(e) => setSourceBranchId(e.target.value)}
                      className="h-8 text-xs bg-background rounded-lg border border-border px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Choose source branch...</option>
                      {otherBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.city ? `(${b.city})` : ""}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                      disabled={!sourceBranchId || replicating}
                      onClick={handleReplicateSchedule}
                    >
                      {replicating ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" /> Copying...
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" /> Replicate Schedule
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* QUICK APPLY TOOLBAR: CONFIGURE ONCE & APPLY ALL */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Quick Setup & Apply to All Days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="quick-split-toggle"
                      checked={quickSplitShift}
                      onCheckedChange={(checked) => {
                        setQuickSplitShift(checked);
                        if (checked && quickShift1Close === "22:00") {
                          setQuickShift1Close("11:30");
                        }
                      }}
                    />
                    <Label htmlFor="quick-split-toggle" className="text-xs font-semibold cursor-pointer select-none">
                      Two Batches (Morning + Evening)
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Batch 1 */}
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-primary block">
                      {quickSplitShift ? "Morning Batch (Batch 1)" : "Operating Hours"}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ClockTimePicker
                          id="quick_open_1"
                          value={quickShift1Open}
                          placeholder="Opens"
                          onChange={(v) => setQuickShift1Open(v)}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">to</span>
                      <div className="flex-1">
                        <ClockTimePicker
                          id="quick_close_1"
                          value={quickShift1Close}
                          placeholder="Closes"
                          onChange={(v) => setQuickShift1Close(v)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Batch 2 (Visible if split shift active) */}
                  {quickSplitShift ? (
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-primary block">
                        Evening Batch (Batch 2)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ClockTimePicker
                            id="quick_open_2"
                            value={quickShift2Open}
                            placeholder="Opens"
                            onChange={(v) => setQuickShift2Open(v)}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">to</span>
                        <div className="flex-1">
                          <ClockTimePicker
                            id="quick_close_2"
                            value={quickShift2Close}
                            placeholder="Closes"
                            onChange={(v) => setQuickShift2Close(v)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center text-xs text-muted-foreground px-3 py-2 rounded-lg bg-background/40 border border-border/30">
                      <span>Enable "Two Batches" toggle above if this branch operates morning and evening split shifts.</span>
                    </div>
                  )}
                </div>

                {/* Apply Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/10">
                  <div className="text-[11px] text-muted-foreground">
                    Click an action to apply these hours across days. You can still tweak individual days below:
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[11px] font-semibold px-2.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleApplyToAllDays}
                    >
                      Apply to All 7 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-semibold px-2.5"
                      onClick={handleApplyMonSat}
                    >
                      Mon–Sat (Sun Closed)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-semibold px-2.5"
                      onClick={handleApplyMonFri}
                    >
                      Mon–Fri Only
                    </Button>
                  </div>
                </div>
              </div>

              {/* DAYS LIST */}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
                  <RefreshCw className="size-4 animate-spin" /> Loading schedule...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-foreground">Weekly Day-by-Day Hours</span>
                    <span className="text-[11px] text-muted-foreground">
                      Toggle off any day to close the branch completely.
                    </span>
                  </div>

                  {DAYS_OF_WEEK.map(({ day, name, short }) => {
                    const conf = weeklySchedule[day] || {
                      is_open: true,
                      open_time: "06:00",
                      close_time: "22:00",
                      is_24_hours: false,
                      has_split_shift: false,
                      open_time_2: "16:30",
                      close_time_2: "22:00",
                    };

                    return (
                      <div
                        key={day}
                        className={`p-3.5 rounded-xl border transition-all ${
                          conf.is_open
                            ? "bg-card border-border/80 shadow-2xs space-y-3"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        {/* Day Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-foreground font-mono">
                              {short}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{name}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {conf.is_open && (
                              <Button
                                type="button"
                                variant={conf.has_split_shift ? "secondary" : "ghost"}
                                size="sm"
                                className={`h-7 text-[11px] gap-1.5 px-2.5 border ${
                                  conf.has_split_shift
                                    ? "border-primary/40 text-primary font-semibold bg-primary/10 hover:bg-primary/20"
                                    : "border-border/60 text-muted-foreground hover:text-foreground"
                                }`}
                                onClick={() => handleDaySplitToggle(day)}
                              >
                                <Layers className="size-3" />
                                {conf.has_split_shift ? "2 Batches Active" : "+ 2 Batches"}
                              </Button>
                            )}

                            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                              <Switch
                                id={`switch-day-${day}`}
                                checked={conf.is_open}
                                onCheckedChange={(checked) => handleDayToggle(day, checked)}
                              />
                              <span
                                className={`text-[11px] font-bold uppercase tracking-wider w-12 ${
                                  conf.is_open ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                }`}
                              >
                                {conf.is_open ? "Open" : "Closed"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Hours or Closed notice */}
                        {conf.is_open ? (
                          !conf.has_split_shift ? (
                            /* Single Batch Row */
                            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                              <span className="text-[11px] text-muted-foreground w-16 shrink-0 font-medium">Hours:</span>
                              <div className="w-28">
                                <ClockTimePicker
                                  id={`open-time-${day}`}
                                  value={conf.open_time}
                                  placeholder="Opens"
                                  onChange={(timeStr) => handleTimeChange(day, "open_time", timeStr)}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">to</span>
                              <div className="w-28">
                                <ClockTimePicker
                                  id={`close-time-${day}`}
                                  value={conf.close_time}
                                  placeholder="Closes"
                                  onChange={(timeStr) => handleTimeChange(day, "close_time", timeStr)}
                                />
                              </div>
                            </div>
                          ) : (
                            /* Two Batches (Morning & Evening) */
                            <div className="space-y-2 pt-1.5 border-t border-border/40 bg-muted/15 p-2.5 rounded-lg">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-primary w-24 shrink-0">
                                    Morning Batch:
                                  </span>
                                  <div className="w-26">
                                    <ClockTimePicker
                                      id={`open-time-1-${day}`}
                                      value={conf.open_time}
                                      placeholder="Opens"
                                      onChange={(timeStr) => handleTimeChange(day, "open_time", timeStr)}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground font-mono">to</span>
                                  <div className="w-26">
                                    <ClockTimePicker
                                      id={`close-time-1-${day}`}
                                      value={conf.close_time}
                                      placeholder="Closes"
                                      onChange={(timeStr) => handleTimeChange(day, "close_time", timeStr)}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-primary w-24 shrink-0">
                                    Evening Batch:
                                  </span>
                                  <div className="w-26">
                                    <ClockTimePicker
                                      id={`open-time-2-${day}`}
                                      value={conf.open_time_2}
                                      placeholder="Opens"
                                      onChange={(timeStr) => handleTimeChange(day, "open_time_2", timeStr)}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground font-mono">to</span>
                                  <div className="w-26">
                                    <ClockTimePicker
                                      id={`close-time-2-${day}`}
                                      value={conf.close_time_2}
                                      placeholder="Closes"
                                      onChange={(timeStr) => handleTimeChange(day, "close_time_2", timeStr)}
                                    />
                                  </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                  <Info className="size-3 text-muted-foreground shrink-0" />
                                  Branch closed during afternoon interval
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/20 mt-1">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>Closed all day · Bookings blocked</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveWeekly}
                  disabled={savingWeekly || loading}
                  className="bg-primary text-primary-foreground gap-2 min-w-[150px]"
                >
                  {savingWeekly ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> Save Weekly Schedule
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: FESTIVES & OPERATING EXCEPTIONS */}
            <TabsContent value="exceptions" className="space-y-5 focus-visible:outline-none">
              {/* Form to Add New Exception */}
              <form onSubmit={handleAddException} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Plus className="size-4 text-primary" />
                  Declare Festive Closure / Special Hours
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Holiday / Event Date *</Label>
                    <Input
                      type="date"
                      value={newExcDate}
                      onChange={(e) => setNewExcDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Reason / Festival Name *</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Diwali, Christmas, Facility Maintenance"
                      value={newExcReason}
                      onChange={(e) => setNewExcReason(e.target.value)}
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>
                </div>

                {/* Closure Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-primary/10">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="exception-is-closed"
                      checked={newExcIsClosed}
                      onCheckedChange={(c) => setNewExcIsClosed(c)}
                    />
                    <Label htmlFor="exception-is-closed" className="text-xs font-semibold cursor-pointer">
                      {newExcIsClosed ? "Full Day Closed (All Day Off)" : "Special Festive Hours"}
                    </Label>
                  </div>

                  {!newExcIsClosed && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Hours:</span>
                      <div className="w-24">
                        <ClockTimePicker
                          id="exc_open"
                          value={newExcOpenTime}
                          onChange={(v) => setNewExcOpenTime(v)}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">to</span>
                      <div className="w-24">
                        <ClockTimePicker
                          id="exc_close"
                          value={newExcCloseTime}
                          onChange={(v) => setNewExcCloseTime(v)}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingException}
                    className="h-8 bg-primary text-primary-foreground text-xs font-bold gap-1.5 shrink-0"
                  >
                    {addingException ? <RefreshCw className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add Exception
                  </Button>
                </div>
              </form>

              {/* List of Registered Exceptions */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Registered Festive Closures & Overrides</span>
                  <Badge variant="outline" className="text-[10px]">
                    {exceptions.length} {exceptions.length === 1 ? "entry" : "entries"}
                  </Badge>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                    <RefreshCw className="size-4 animate-spin" /> Loading...
                  </div>
                ) : exceptions.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
                    <CalendarDays className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-foreground">No festive closures declared</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Add upcoming holidays or maintenance dates using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/80 overflow-hidden bg-card">
                    {exceptions.map((exc) => (
                      <div
                        key={exc.id || exc.exception_date}
                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
                            <Calendar className="size-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{exc.exception_date}</span>
                              {exc.is_closed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider">
                                  Closed All Day
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {exc.open_time} - {exc.close_time}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{exc.reason || "Scheduled Closure"}</p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteException(exc.id)}
                          title="Delete exception"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
