/**
 * src/components/trainers/TrainerScheduleModal.tsx — Production Trainer Weekly Roster & Schedule Exceptions Manager
 * 
 * Features:
 * - Admin weekly work schedule configuration (Mon-Sun, 1-7).
 * - "Absence of schedule row = Week-Off / Normally Unavailable" model.
 * - Single-click "Quick Apply" hours across active working days.
 * - "Replicate from Branch" toolbar to copy shift rosters across locations.
 * - Single-day overrides & exceptions tab (LEAVE, WEEKLY_OFF_OVERRIDE, SPECIAL_SHIFT, UNAVAILABLE, TEMPORARY_AVAILABILITY).
 * - Live backend bulk_sync synchronization.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  CalendarDays,
  Layers,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { workforceApi } from '@/api/endpoints/workforceApi';
import type { TrainerProfile, EmployeeWorkSchedule, EmployeeScheduleException } from '@/types/workforce';
import { useAuth } from '@/api/auth/AuthProvider';
import { isTrainerUser } from '@/lib/nav';
import { getWeekInfo, shiftWeek, getMonday, formatToDateStr } from '@/lib/roster-date-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' },
];

interface DayRosterState {
  isOnDuty: boolean;
  startTime: string;
  endTime: string;
}

interface TrainerScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainer: TrainerProfile | null;
  trainers?: TrainerProfile[];
  onSelectTrainer?: (trainer: TrainerProfile) => void;
  branches: Array<{ id: string; name: string; city?: string }>;
  initialBranchId?: string;
  initialWeekStart?: string;
}

export function TrainerScheduleModal({
  isOpen,
  onClose,
  trainer,
  trainers,
  onSelectTrainer,
  branches,
  initialBranchId,
  initialWeekStart,
}: TrainerScheduleModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTrainer = isTrainerUser(user, trainers);
  const [activeTab, setActiveTab] = React.useState<'roster' | 'exceptions'>('roster');
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('');
  const [sourceReplicateBranchId, setSourceReplicateBranchId] = React.useState<string>('');

  // Target week state & application scope
  const [targetWeekStart, setTargetWeekStart] = React.useState<string>(() => {
    return initialWeekStart || formatToDateStr(getMonday());
  });
  const [applyMode, setApplyMode] = React.useState<'SPECIFIC_WEEK' | 'RECURRING_FROM_WEEK'>('SPECIFIC_WEEK');

  React.useEffect(() => {
    if (initialWeekStart) {
      setTargetWeekStart(initialWeekStart);
    }
  }, [initialWeekStart, isOpen]);

  const weekInfo = React.useMemo(() => getWeekInfo(targetWeekStart), [targetWeekStart]);

  // 7-day state
  const [weeklyState, setWeeklyState] = React.useState<Record<number, DayRosterState>>({
    1: { isOnDuty: true, startTime: '08:00', endTime: '16:00' },
    2: { isOnDuty: true, startTime: '08:00', endTime: '16:00' },
    3: { isOnDuty: true, startTime: '08:00', endTime: '16:00' },
    4: { isOnDuty: true, startTime: '08:00', endTime: '16:00' },
    5: { isOnDuty: true, startTime: '08:00', endTime: '16:00' },
    6: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
    7: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
  });

  // Quick Apply toolbar states
  const [quickStartTime, setQuickStartTime] = React.useState('09:00');
  const [quickEndTime, setQuickEndTime] = React.useState('17:00');

  // New Exception form states
  const [newExcDate, setNewExcDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [newExcType, setNewExcType] = React.useState<string>('LEAVE');
  const [newExcIsAvailable, setNewExcIsAvailable] = React.useState(false);
  const [newExcStartTime, setNewExcStartTime] = React.useState('');
  const [newExcEndTime, setNewExcEndTime] = React.useState('');
  const [newExcReason, setNewExcReason] = React.useState('');
  const [isAddingException, setIsAddingException] = React.useState(false);

  // Set default branch or initialBranchId
  React.useEffect(() => {
    if (initialBranchId && branches.some((b) => b.id === initialBranchId)) {
      setSelectedBranchId(initialBranchId);
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, initialBranchId, isOpen]);

  // Query existing work schedules for target week
  const {
    data: existingSchedulesData,
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['employee-work-schedules', trainer?.employee_profile, selectedBranchId, weekInfo.startDate, weekInfo.endDate],
    queryFn: () =>
      workforceApi.getWorkSchedules(trainer?.employee_profile, selectedBranchId || undefined, {
        week_start: weekInfo.startDate,
        week_end: weekInfo.endDate,
      }),
    enabled: !!trainer?.employee_profile && !!selectedBranchId && isOpen,
  });

  const existingSchedules = React.useMemo(() => existingSchedulesData ?? [], [existingSchedulesData]);

  // Query schedule exceptions
  const {
    data: scheduleExceptions = [],
    isLoading: isLoadingExceptions,
    refetch: refetchExceptions,
  } = useQuery({
    queryKey: ['employee-schedule-exceptions', trainer?.employee_profile, selectedBranchId],
    queryFn: () =>
      workforceApi.getScheduleExceptions({
        employee_profile_id: trainer?.employee_profile,
        branch_id: selectedBranchId || undefined,
      }),
    enabled: !!trainer?.employee_profile && isOpen,
  });

  // Synchronize local 7-day state when server schedules load
  React.useEffect(() => {
    if (!isOpen || !existingSchedulesData) return;

    const newState: Record<number, DayRosterState> = {
      1: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      2: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      3: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      4: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      5: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      6: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      7: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
    };

    if (existingSchedulesData.length > 0) {
      existingSchedulesData.forEach((shift) => {
        const dow = shift.day_of_week;
        if (dow >= 1 && dow <= 7) {
          newState[dow] = {
            isOnDuty: shift.status === 'ACTIVE',
            startTime: shift.start_time.slice(0, 5),
            endTime: shift.end_time.slice(0, 5),
          };
        }
      });
    } else {
      // Default: Mon-Fri on duty, Sat-Sun week-off
      [1, 2, 3, 4, 5].forEach((d) => {
        newState[d].isOnDuty = true;
      });
    }

    setWeeklyState(newState);
  }, [existingSchedulesData, isOpen]);

  // Bulk save mutation
  const bulkSyncMutation = useMutation({
    mutationFn: (payload: {
      employee_profile_id: string;
      branch_id: string;
      week_start_date?: string;
      week_end_date?: string | null;
      apply_mode?: 'SPECIFIC_WEEK' | 'RECURRING_FROM_WEEK';
      schedules: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
      }>;
    }) => workforceApi.bulkSyncWorkSchedules(payload),
    onSuccess: () => {
      const msg =
        applyMode === 'SPECIFIC_WEEK'
          ? `Roster for week (${weekInfo.formattedRange}) synchronized successfully!`
          : `Ongoing roster from ${weekInfo.startDate} synchronized successfully!`;
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['employee-work-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['admin-work-schedules'] });
      refetchSchedules();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update schedule');
    },
  });

  const handleSaveRoster = () => {
    if (!trainer?.employee_profile || !selectedBranchId) {
      toast.error('Trainer or branch context missing.');
      return;
    }

    const payloadSchedules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
    }> = [];

    DAYS_OF_WEEK.forEach((d) => {
      const day = weeklyState[d.id];
      if (day && day.isOnDuty) {
        payloadSchedules.push({
          day_of_week: d.id,
          start_time: `${day.startTime}:00`,
          end_time: `${day.endTime}:00`,
        });
      }
    });

    bulkSyncMutation.mutate({
      employee_profile_id: trainer.employee_profile,
      branch_id: selectedBranchId,
      week_start_date: weekInfo.startDate,
      week_end_date: applyMode === 'SPECIFIC_WEEK' ? weekInfo.endDate : null,
      apply_mode: applyMode,
      schedules: payloadSchedules,
    });
  };

  // Quick Apply to all active on-duty days
  const handleQuickApplyTimes = () => {
    setWeeklyState((prev) => {
      const next = { ...prev };
      DAYS_OF_WEEK.forEach((d) => {
        if (next[d.id]?.isOnDuty) {
          next[d.id] = {
            ...next[d.id],
            startTime: quickStartTime,
            endTime: quickEndTime,
          };
        }
      });
      return next;
    });
    toast.success(`Applied ${quickStartTime} - ${quickEndTime} to all on-duty days`);
  };

  // Replicate from another branch
  const handleReplicateFromBranch = async () => {
    if (!sourceReplicateBranchId) {
      toast.error('Please select a source branch to replicate from.');
      return;
    }
    if (sourceReplicateBranchId === selectedBranchId) {
      toast.error('Source branch cannot be the same as target branch.');
      return;
    }
    try {
      const sourceSchedules = await workforceApi.getWorkSchedules(
        trainer?.employee_profile,
        sourceReplicateBranchId
      );
      if (!sourceSchedules || sourceSchedules.length === 0) {
        toast.warning('The source branch has no active schedules configured for this trainer.');
        return;
      }

      const newState: Record<number, DayRosterState> = {
        1: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        2: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        3: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        4: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        5: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        6: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
        7: { isOnDuty: false, startTime: '08:00', endTime: '16:00' },
      };

      sourceSchedules.forEach((shift) => {
        const dow = shift.day_of_week;
        if (dow >= 1 && dow <= 7) {
          newState[dow] = {
            isOnDuty: shift.status === 'ACTIVE',
            startTime: shift.start_time.slice(0, 5),
            endTime: shift.end_time.slice(0, 5),
          };
        }
      });

      setWeeklyState(newState);
      toast.success('Roster template replicated! Click "Save Roster" to persist for this branch.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to replicate branch roster');
    }
  };

  // Create Exception Mutation
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainer?.employee_profile || !newExcDate) return;
    setIsAddingException(true);
    try {
      await workforceApi.createScheduleException({
        employee_profile: trainer.employee_profile,
        branch: selectedBranchId || null,
        exception_date: newExcDate,
        exception_type: newExcType as any,
        is_available: newExcIsAvailable,
        start_time: newExcStartTime ? `${newExcStartTime}:00` : null,
        end_time: newExcEndTime ? `${newExcEndTime}:00` : null,
        reason: newExcReason.trim() || undefined,
        status: 'ACTIVE',
      });
      toast.success('Schedule exception recorded.');
      setNewExcReason('');
      setNewExcStartTime('');
      setNewExcEndTime('');
      refetchExceptions();
      queryClient.invalidateQueries({ queryKey: ['employee-schedule-exceptions'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to add exception');
    } finally {
      setIsAddingException(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      await workforceApi.deleteScheduleException(id);
      toast.success('Exception removed.');
      refetchExceptions();
      queryClient.invalidateQueries({ queryKey: ['employee-schedule-exceptions'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove exception');
    }
  };

  if (!trainer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Trainer Roster & Schedules: {trainer.trainer_name || trainer.trainer_code}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Configure weekly working hours, manage week-offs, and register date-specific exceptions.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={
                trainer.trainer_status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {trainer.trainer_status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Trainer & Branch Selector Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/40">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {!isTrainer && trainers && trainers.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold whitespace-nowrap">Trainer:</Label>
                  <select
                    value={trainer.id}
                    onChange={(e) => {
                      const found = trainers.find((t) => t.id === e.target.value);
                      if (found && onSelectTrainer) {
                        onSelectTrainer(found);
                      }
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trainer_name || t.trainer_code} ({t.trainer_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold whitespace-nowrap">Target Branch:</Label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full sm:w-52 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Replicate from branch toolbar */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sourceReplicateBranchId}
                onChange={(e) => setSourceReplicateBranchId(e.target.value)}
                className="w-full sm:w-48 h-9 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Replicate from branch...</option>
                {branches
                  .filter((b) => b.id !== selectedBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReplicateFromBranch}
                disabled={!sourceReplicateBranchId}
                className="h-9 px-3 gap-1 text-xs whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Roster
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="roster" className="gap-2">
                <Clock className="w-4 h-4" />
                Weekly Roster
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Exceptions ({scheduleExceptions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WEEKLY ROSTER */}
            <TabsContent value="roster" className="space-y-4 pt-2">
              {/* Target Week Navigator & Application Scope */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <CalendarRange className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Target Schedule Week:</div>
                      <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        {weekInfo.formattedRange}
                        {weekInfo.isCurrentWeek ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                            Current Week
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                            Scheduled Week
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Week Navigation Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetWeekStart((prev) => shiftWeek(prev, -1))}
                      className="h-8 px-2.5 text-xs gap-1"
                      title="Previous Week"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </Button>
                    {!weekInfo.isCurrentWeek && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setTargetWeekStart(formatToDateStr(getMonday()))}
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        This Week
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetWeekStart((prev) => shiftWeek(prev, 1))}
                      className="h-8 px-2.5 text-xs gap-1"
                      title="Next Week"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="date"
                      value={weekInfo.startDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setTargetWeekStart(formatToDateStr(getMonday(e.target.value)));
                        }
                      }}
                      className="h-8 w-34 text-xs font-mono"
                      title="Select calendar week"
                    />
                  </div>
                </div>

                {/* Scope Selection: Specific Week vs Ongoing Template */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-primary/15 text-xs">
                  <span className="text-muted-foreground font-semibold">Roster Application Scope:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'SPECIFIC_WEEK'}
                        onChange={() => setApplyMode('SPECIFIC_WEEK')}
                        className="text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className={applyMode === 'SPECIFIC_WEEK' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                        This Week Only ({weekInfo.formattedRange})
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'RECURRING_FROM_WEEK'}
                        onChange={() => setApplyMode('RECURRING_FROM_WEEK')}
                        className="text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className={applyMode === 'RECURRING_FROM_WEEK' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                        Recurring (From {weekInfo.days[0].dayOfMonth} {weekInfo.days[0].monthShort} onwards)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Roster Rule Alert Box */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Attendance & Week-Off Policy:</strong> Days without an active schedule row represent a scheduled Week-Off (normally unavailable). A trainer is <strong>never</strong> marked absent for a week-off day; absence is strictly tracked via attendance for scheduled classes.
                </span>
              </div>

              {/* Quick Apply Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">Quick Apply Hours:</span>
                  <Input
                    type="time"
                    value={quickStartTime}
                    onChange={(e) => setQuickStartTime(e.target.value)}
                    className="h-8 w-24 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={quickEndTime}
                    onChange={(e) => setQuickEndTime(e.target.value)}
                    className="h-8 w-24 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleQuickApplyTimes}
                    className="h-8 text-xs gap-1"
                  >
                    Apply to Working Days
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWeeklyState((prev) => {
                        const next = { ...prev };
                        [1, 2, 3, 4, 5].forEach((d) => {
                          next[d] = { ...next[d], isOnDuty: true };
                        });
                        [6, 7].forEach((d) => {
                          next[d] = { ...next[d], isOnDuty: false };
                        });
                        return next;
                      });
                      toast.info('Mon-Fri set On Duty; Sat-Sun set to Week-Off');
                    }}
                    className="h-8 text-xs"
                  >
                    Standard Mon-Fri
                  </Button>
                </div>
              </div>

              {/* 7 Days Table/Cards with Exact Calendar Dates */}
              <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                {weekInfo.days.map((dayInfo) => {
                  const day = weeklyState[dayInfo.id] || {
                    isOnDuty: false,
                    startTime: '08:00',
                    endTime: '16:00',
                  };

                  return (
                    <div
                      key={dayInfo.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 transition-colors ${
                        day.isOnDuty ? 'bg-background' : 'bg-muted/30 opacity-80'
                      } ${dayInfo.isToday ? 'border-l-4 border-l-primary' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            day.isOnDuty ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{dayInfo.fullName}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({dayInfo.dayOfMonth} {dayInfo.monthShort})
                            </span>
                            {dayInfo.isToday && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                Today
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {dayInfo.dateStr}
                          </span>
                        </div>
                        <Badge
                          variant={day.isOnDuty ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {day.isOnDuty ? 'On Duty' : 'Week-Off'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={day.isOnDuty}
                            onCheckedChange={(checked) =>
                              setWeeklyState((prev) => ({
                                ...prev,
                                [dayInfo.id]: {
                                  ...prev[dayInfo.id],
                                  isOnDuty: checked,
                                },
                              }))
                            }
                          />
                          <Label className="text-xs text-muted-foreground cursor-pointer">
                            {day.isOnDuty ? 'Working Shift' : 'Week-Off'}
                          </Label>
                        </div>

                        {day.isOnDuty ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={day.startTime}
                              onChange={(e) =>
                                setWeeklyState((prev) => ({
                                  ...prev,
                                  [dayInfo.id]: {
                                    ...prev[dayInfo.id],
                                    startTime: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 w-24 text-xs font-mono"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={day.endTime}
                              onChange={(e) =>
                                setWeeklyState((prev) => ({
                                  ...prev,
                                  [dayInfo.id]: {
                                    ...prev[dayInfo.id],
                                    endTime: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 w-24 text-xs font-mono"
                            />
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            Normally unavailable (No schedule row)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRoster}
                  disabled={bulkSyncMutation.isPending}
                  className="gap-2 min-w-[160px] font-semibold"
                >
                  {bulkSyncMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {applyMode === 'SPECIFIC_WEEK'
                    ? `Save Roster (${weekInfo.days[0].dayOfMonth} ${weekInfo.days[0].monthShort} – ${weekInfo.days[6].dayOfMonth} ${weekInfo.days[6].monthShort})`
                    : `Save Ongoing Roster from ${weekInfo.days[0].dayOfMonth} ${weekInfo.days[0].monthShort}`}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: SCHEDULE EXCEPTIONS & OVERRIDES */}
            <TabsContent value="exceptions" className="space-y-4 pt-2">
              {/* Form to add an exception */}
              <form
                onSubmit={handleCreateException}
                className="p-4 rounded-lg border border-border bg-card space-y-3"
              >
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Add Date-Specific Exception or Shift Override
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Exception Date *</Label>
                    <Input
                      type="date"
                      value={newExcDate}
                      onChange={(e) => setNewExcDate(e.target.value)}
                      required
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Exception Type *</Label>
                    <select
                      value={newExcType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewExcType(val);
                        if (['WEEKLY_OFF_OVERRIDE', 'SPECIAL_SHIFT', 'TEMPORARY_AVAILABILITY'].includes(val)) {
                          setNewExcIsAvailable(true);
                        } else {
                          setNewExcIsAvailable(false);
                        }
                      }}
                      className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                    >
                      <option value="LEAVE">LEAVE (Leave of Absence)</option>
                      <option value="WEEKLY_OFF_OVERRIDE">WEEKLY_OFF_OVERRIDE (Work on Off Day)</option>
                      <option value="SPECIAL_SHIFT">SPECIAL_SHIFT (Extra / Custom Shift)</option>
                      <option value="UNAVAILABLE">UNAVAILABLE (Temporary Block)</option>
                      <option value="TEMPORARY_AVAILABILITY">TEMPORARY_AVAILABILITY (Ad-hoc Slot)</option>
                      <option value="WEEKLY_OFF">WEEKLY_OFF (Single-Day Off)</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Availability Outcome</Label>
                    <div className="flex items-center gap-2 h-8 mt-1">
                      <Switch
                        checked={newExcIsAvailable}
                        onCheckedChange={setNewExcIsAvailable}
                      />
                      <span className="text-xs font-medium">
                        {newExcIsAvailable ? 'Available to Teach' : 'Unavailable / Absent'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Start Time (Optional)</Label>
                    <Input
                      type="time"
                      value={newExcStartTime}
                      onChange={(e) => setNewExcStartTime(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Time (Optional)</Label>
                    <Input
                      type="time"
                      value={newExcEndTime}
                      onChange={(e) => setNewExcEndTime(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason / Note</Label>
                    <Input
                      placeholder="e.g. Medical leave, Sunday workshop"
                      value={newExcReason}
                      onChange={(e) => setNewExcReason(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isAddingException}
                    className="gap-1 h-8 text-xs"
                  >
                    {isAddingException ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Record Exception
                  </Button>
                </div>
              </form>

              {/* Exception List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Exceptions & Overrides
                </h4>

                {scheduleExceptions.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                    No date-specific exceptions found for this trainer.
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                    {scheduleExceptions.map((exc) => (
                      <div
                        key={exc.id}
                        className="flex items-center justify-between p-3 text-xs gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={exc.is_available ? 'default' : 'destructive'}
                            className="text-[10px] font-mono uppercase"
                          >
                            {exc.exception_type}
                          </Badge>
                          <div>
                            <span className="font-semibold text-foreground">
                              {exc.exception_date}
                            </span>
                            {exc.start_time && exc.end_time && (
                              <span className="text-muted-foreground ml-2">
                                ({exc.start_time.slice(0, 5)} - {exc.end_time.slice(0, 5)})
                              </span>
                            )}
                            {exc.reason && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {exc.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-medium ${
                              exc.is_available ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {exc.is_available ? 'Override Available' : 'Off-Duty / Leave'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteException(exc.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
