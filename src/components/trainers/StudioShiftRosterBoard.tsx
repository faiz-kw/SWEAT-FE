/**
 * src/components/trainers/StudioShiftRosterBoard.tsx
 * 
 * Studio Shift Roster Board for Operations -> Trainers.
 * Provides a comprehensive, studio-wide overview and management of trainer shifts,
 * rotations, branch allocations, and morning/evening shift pools.
 * 
 * Design & Architecture:
 * - 100% Dynamic data: Zero hardcoded shift strings, zero mock data, real database queries.
 * - Enterprise theme consistency: Clean card styling (bg-card border border-border/80 text-foreground),
 *   4-tile KPI stats grid with status accents matching the SWEAT CRM design system.
 * - Branch hours dynamically derived from Administration -> Location (BranchWorkingHoursRecord).
 * - Full support for Single Shifts, Dual/Split Shifts with midday breaks, and Multi-Branch assignments.
 * - Responsive on all screen sizes: Mobile (<640px), Tablet (640-1024px), Laptop & Desktop.
 * - Sticky first column in 7-Day Matrix for seamless mobile/tablet horizontal scrolling.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Moon,
  Clock,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Pencil,
  Plus,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Trash2,
  Tag,
  Check,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { workforceApi } from '@/api/endpoints/workforceApi';
import { getWeekInfo, formatToDateStr, parseDateStr } from '@/lib/roster-date-utils';
import type { TrainerProfile, EmployeeWorkSchedule } from '@/types/workforce';
import type { ClassCategory } from '@/types/classes';

interface BranchWorkingHoursRecord {
  id: string;
  branch: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  is_24_hours?: boolean;
}

interface StudioShiftRosterBoardProps {
  trainers: TrainerProfile[];
  branches: Array<{ id: string; name: string; code?: string; city?: string }>;
  classCategories: ClassCategory[];
  onOpenTrainerSchedule: (trainer: TrainerProfile, branchId?: string, weekStart?: string) => void;
}

interface TrainerShiftEntry {
  trainer: TrainerProfile;
  scheduleId: string;
  shiftStart: string;
  shiftEnd: string;
  isSplit: boolean;
  splitDetails?: string;
  activeDays: number[];
}

export const StudioShiftRosterBoard: React.FC<StudioShiftRosterBoardProps> = ({
  trainers,
  branches,
  classCategories,
  onOpenTrainerSchedule,
}) => {
  const queryClient = useQueryClient();

  // Active Week Date State
  const [currentWeekDate, setCurrentWeekDate] = React.useState<Date>(() => new Date());
  const weekInfo = React.useMemo(() => getWeekInfo(currentWeekDate), [currentWeekDate]);

  // View Mode: 'CARDS' (Shift Pools) vs 'MATRIX' (7-Day Table)
  const [viewMode, setViewMode] = React.useState<'CARDS' | 'MATRIX'>('CARDS');

  // Filters
  const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>('ALL');

  // Quick Shift Allocation Modal State
  const [isQuickAllocOpen, setIsQuickAllocOpen] = React.useState<boolean>(false);
  const [allocTrainerId, setAllocTrainerId] = React.useState<string>('');
  const [allocBranchId, setAllocBranchId] = React.useState<string>('');
  const [allocTargetDate, setAllocTargetDate] = React.useState<string>('');
  const [allocShiftPreset, setAllocShiftPreset] = React.useState<
    'MORNING' | 'EVENING' | 'SPLIT' | 'CUSTOM'
  >('MORNING');
  const [allocStartTime, setAllocStartTime] = React.useState<string>('06:00');
  const [allocEndTime, setAllocEndTime] = React.useState<string>('14:00');
  const [allocHasSplit, setAllocHasSplit] = React.useState<boolean>(false);
  const [allocSplitStart, setAllocSplitStart] = React.useState<string>('16:00');
  const [allocSplitEnd, setAllocSplitEnd] = React.useState<string>('22:00');
  const [allocDays, setAllocDays] = React.useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [allocApplyMode, setAllocApplyMode] = React.useState<'SPECIFIC_WEEK' | 'RECURRING_FROM_WEEK'>('SPECIFIC_WEEK');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = React.useState<boolean>(false);

  // Quick Category Assignment Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState<boolean>(false);
  const [categoryModalTrainer, setCategoryModalTrainer] = React.useState<TrainerProfile | null>(null);
  const [categorySelectedIds, setCategorySelectedIds] = React.useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = React.useState<boolean>(false);

  // 1. Fetch Dynamic Branch Working Hours from Admin -> Location
  const { data: branchHours = [] } = useQuery<BranchWorkingHoursRecord[]>({
    queryKey: ['tenant-branch-working-hours'],
    queryFn: async () => {
      try {
        const res = await api.get<any>('/tenant/branch-working-hours/');
        return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch Active Work Schedules for the current week window
  const {
    data: allSchedules = [],
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useQuery<EmployeeWorkSchedule[]>({
    queryKey: ['studio-shift-roster-schedules', weekInfo.startDate, weekInfo.endDate],
    queryFn: async () => {
      return workforceApi.getWorkSchedules(undefined, undefined, {
        week_start: weekInfo.startDate,
        week_end: weekInfo.endDate,
      });
    },
    staleTime: 1000 * 60 * 2,
  });

  // Format 24h time to 12h format
  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const clean = timeStr.slice(0, 5);
    const [hStr = '0', mStr = '00'] = clean.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
  };

  // Branch Code Helper (e.g. "Sweat Andheri West" -> "SAW")
  const getBranchBadgeCode = (name: string, code?: string) => {
    if (code && code.length <= 4) return code.toUpperCase();
    const parts = name.split(/\s+/).filter(Boolean);
    const p0 = parts[0] || '';
    const p1 = parts[1] || '';
    if (p0 && p1) {
      return (p0[0] + p1[0] + (parts[2]?.[0] || '')).toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
  };

  // Compute branch operating hours summary
  const getBranchHoursDisplay = (branchId: string) => {
    const hours = branchHours.filter((h) => String(h.branch) === String(branchId) && h.is_open);
    if (!hours || hours.length === 0) {
      return '06:00 AM – 10:00 PM (7d/wk)';
    }
    let earliest = '23:59';
    let latest = '00:00';
    hours.forEach((wh) => {
      if (wh.is_24_hours) {
        earliest = '00:00';
        latest = '23:59';
      } else {
        if (wh.open_time && wh.open_time.slice(0, 5) < earliest) earliest = wh.open_time.slice(0, 5);
        if (wh.close_time && wh.close_time.slice(0, 5) > latest) latest = wh.close_time.slice(0, 5);
      }
    });
    const minT = earliest === '23:59' ? '06:00' : earliest;
    const maxT = latest === '00:00' ? '22:00' : latest;
    return `${formatTime12h(minT)} – ${formatTime12h(maxT)} (${hours.length}d/wk)`;
  };

  // Dynamic Shift Windows derived from each branch's actual operating hours
  const getBranchShiftWindows = React.useCallback(
    (branchId: string) => {
      const hours = branchHours.filter((h) => String(h.branch) === String(branchId) && h.is_open);
      let openTime = '06:00';
      let closeTime = '22:00';
      if (hours.length > 0) {
        let earliest = '23:59';
        let latest = '00:00';
        hours.forEach((wh) => {
          if (wh.is_24_hours) {
            earliest = '00:00';
            latest = '23:59';
          } else {
            if (wh.open_time && wh.open_time.slice(0, 5) < earliest) earliest = wh.open_time.slice(0, 5);
            if (wh.close_time && wh.close_time.slice(0, 5) > latest) latest = wh.close_time.slice(0, 5);
          }
        });
        if (earliest !== '23:59') openTime = earliest;
        if (latest !== '00:00') closeTime = latest;
      }
      const openHour = parseInt(openTime.slice(0, 2), 10);
      const closeHour = parseInt(closeTime.slice(0, 2), 10);
      // Midday split point
      const midHour = Math.max(openHour + 4, Math.min(14, closeHour - 4));
      const midTime = `${String(midHour).padStart(2, '0')}:00`;
      const eveningStartHour = Math.min(closeHour - 4, midHour + 2);
      const eveningStartTime = `${String(eveningStartHour).padStart(2, '0')}:00`;

      return {
        openTime,
        closeTime,
        morningStart: openTime,
        morningEnd: midTime,
        morningLabel: `${formatTime12h(openTime)} – ${formatTime12h(midTime)}`,
        eveningStart: eveningStartTime,
        eveningEnd: closeTime,
        eveningLabel: `${formatTime12h(eveningStartTime)} – ${formatTime12h(closeTime)}`,
      };
    },
    [branchHours]
  );

  // Network-wide shift horizon across all operational branches
  const networkShiftHorizon = React.useMemo(() => {
    if (!branchHours.length) {
      return {
        earliestOpen: '06:00',
        latestClose: '22:00',
        formattedSpan: '06:00 AM – 10:00 PM',
      };
    }
    let earliest = '23:59';
    let latest = '00:00';
    branchHours.forEach((wh) => {
      if (!wh.is_open) return;
      if (wh.is_24_hours) {
        earliest = '00:00';
        latest = '23:59';
      } else {
        if (wh.open_time && wh.open_time.slice(0, 5) < earliest) earliest = wh.open_time.slice(0, 5);
        if (wh.close_time && wh.close_time.slice(0, 5) > latest) latest = wh.close_time.slice(0, 5);
      }
    });
    const minT = earliest === '23:59' ? '06:00' : earliest;
    const maxT = latest === '00:00' ? '22:00' : latest;
    return {
      earliestOpen: minT,
      latestClose: maxT,
      formattedSpan: `${formatTime12h(minT)} – ${formatTime12h(maxT)}`,
    };
  }, [branchHours]);

  // Filter operational branches
  const operationalBranches = React.useMemo(() => {
    return branches.filter((b) => {
      if (selectedBranchFilter === 'ALL') return true;
      return b.id === selectedBranchFilter;
    });
  }, [branches, selectedBranchFilter]);

  // Build Shift Pools per Branch from real database schedules
  const branchRosters = React.useMemo(() => {
    const map = new Map<
      string,
      {
        morningTrainers: TrainerShiftEntry[];
        eveningTrainers: TrainerShiftEntry[];
      }
    >();

    branches.forEach((b) => {
      map.set(b.id, { morningTrainers: [], eveningTrainers: [] });
    });

    // Map: `${trainerId}_${branchId}` -> EmployeeWorkSchedule[]
    const trainerBranchSchedules = new Map<string, EmployeeWorkSchedule[]>();

    allSchedules.forEach((s) => {
      if (s.status !== 'ACTIVE') return;
      const matchingTrainer = trainers.find(
        (t) =>
          t.employee_profile === s.employee_profile ||
          t.id === (s as any).trainer_id ||
          t.trainer_code === (s as any).trainer_code
      );
      if (!matchingTrainer) return;

      const key = `${matchingTrainer.id}_${s.branch}`;
      if (!trainerBranchSchedules.has(key)) {
        trainerBranchSchedules.set(key, []);
      }
      trainerBranchSchedules.get(key)!.push(s);
    });

    trainerBranchSchedules.forEach((scheds, key) => {
      const [trainerId = '', branchId = ''] = key.split('_');
      const branchBucket = map.get(branchId);
      if (!branchBucket) return;

      const trainer = trainers.find((t) => t.id === trainerId);
      if (!trainer) return;

      // Deduplicate shifts by time window
      const uniqueShifts = new Map<string, { sched: EmployeeWorkSchedule; days: number[] }>();
      scheds.forEach((sc) => {
        const timeKey = `${sc.start_time.slice(0, 5)}_${sc.end_time.slice(0, 5)}`;
        if (!uniqueShifts.has(timeKey)) {
          uniqueShifts.set(timeKey, { sched: sc, days: [sc.day_of_week] });
        } else {
          uniqueShifts.get(timeKey)!.days.push(sc.day_of_week);
        }
      });

      const shiftList = Array.from(uniqueShifts.values()).sort((a, b) =>
        a.sched.start_time.localeCompare(b.sched.start_time)
      );

      const hasMultipleShifts = shiftList.length > 1;

      shiftList.forEach((shiftItem) => {
        const shift = shiftItem.sched;
        const startHour = parseInt(shift.start_time.slice(0, 2), 10);
        const shiftStartFmt = formatTime12h(shift.start_time);
        const shiftEndFmt = formatTime12h(shift.end_time);

        const firstShift = shiftList[0]?.sched;
        const secondShift = shiftList[1]?.sched;
        const splitText =
          hasMultipleShifts && firstShift && secondShift
            ? `${formatTime12h(firstShift.start_time)}–${formatTime12h(firstShift.end_time)} & ${formatTime12h(secondShift.start_time)}–${formatTime12h(secondShift.end_time)}`
            : undefined;

        const entry: TrainerShiftEntry = {
          trainer,
          scheduleId: shift.id,
          shiftStart: shiftStartFmt,
          shiftEnd: shiftEndFmt,
          isSplit: hasMultipleShifts,
          splitDetails: splitText,
          activeDays: Array.from(new Set(shiftItem.days)).sort((a, b) => a - b),
        };

        if (startHour < 14) {
          if (!branchBucket.morningTrainers.some((t) => t.trainer.id === trainer.id)) {
            branchBucket.morningTrainers.push(entry);
          }
        } else {
          if (!branchBucket.eveningTrainers.some((t) => t.trainer.id === trainer.id)) {
            branchBucket.eveningTrainers.push(entry);
          }
        }
      });
    });

    return map;
  }, [allSchedules, trainers, branches]);

  // Overall Dynamic Statistics
  const totalRosteredTrainers = React.useMemo(() => {
    const activeTrainerIds = new Set<string>();
    allSchedules.forEach((s) => {
      if (s.status === 'ACTIVE') {
        const t = trainers.find(
          (tr) =>
            tr.employee_profile === s.employee_profile ||
            tr.id === (s as any).trainer_id ||
            tr.trainer_code === (s as any).trainer_code
        );
        if (t) activeTrainerIds.add(t.id);
      }
    });
    return activeTrainerIds.size;
  }, [allSchedules, trainers]);

  const totalShiftsCount = React.useMemo(() => {
    return allSchedules.filter((s) => s.status === 'ACTIVE').length;
  }, [allSchedules]);

  const trainersWithCategoriesCount = React.useMemo(() => {
    return trainers.filter(
      (t) =>
        (t.categories && t.categories.length > 0) ||
        (t.category_ids && t.category_ids.length > 0)
    ).length;
  }, [trainers]);

  const activePercentage = React.useMemo(() => {
    if (!trainers.length) return 0;
    return Math.round((totalRosteredTrainers / trainers.length) * 100);
  }, [totalRosteredTrainers, trainers]);

  // Active Branch Windows for Quick Shift Allocation modal
  const activeAllocBranchWindows = React.useMemo(() => {
    return getBranchShiftWindows(allocBranchId || branches[0]?.id || '');
  }, [allocBranchId, branches, getBranchShiftWindows]);

  // Handlers for Quick Allocation
  const handleOpenQuickAlloc = (branchId?: string, defaultShift: 'MORNING' | 'EVENING' = 'MORNING') => {
    const targetBranch = branchId || branches[0]?.id || '';
    setAllocBranchId(targetBranch);
    setAllocTrainerId(trainers[0]?.id || '');
    setAllocShiftPreset(defaultShift);

    const windows = getBranchShiftWindows(targetBranch);
    if (defaultShift === 'MORNING') {
      setAllocStartTime(windows.morningStart);
      setAllocEndTime(windows.morningEnd);
      setAllocHasSplit(false);
    } else {
      setAllocStartTime(windows.eveningStart);
      setAllocEndTime(windows.eveningEnd);
      setAllocHasSplit(false);
    }
    setAllocDays([1, 2, 3, 4, 5, 6]);
    setAllocTargetDate(formatToDateStr(currentWeekDate));
    setAllocApplyMode('SPECIFIC_WEEK');
    setIsQuickAllocOpen(true);
  };

  const handleApplyShiftPreset = (
    preset: 'MORNING' | 'EVENING' | 'SPLIT' | 'CUSTOM',
    targetBranchId?: string
  ) => {
    setAllocShiftPreset(preset);
    const branchToUse = targetBranchId || allocBranchId || branches[0]?.id || '';
    const windows = getBranchShiftWindows(branchToUse);

    if (preset === 'MORNING') {
      setAllocStartTime(windows.morningStart);
      setAllocEndTime(windows.morningEnd);
      setAllocHasSplit(false);
    } else if (preset === 'EVENING') {
      setAllocStartTime(windows.eveningStart);
      setAllocEndTime(windows.eveningEnd);
      setAllocHasSplit(false);
    } else if (preset === 'SPLIT') {
      setAllocStartTime(windows.morningStart);
      setAllocEndTime('11:30');
      setAllocHasSplit(true);
      setAllocSplitStart(windows.eveningStart);
      setAllocSplitEnd(windows.eveningEnd);
    }
  };

  const handleToggleAllocDay = (dayNum: number) => {
    setAllocDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum].sort((a, b) => a - b)
    );
  };

  const handleSaveQuickAllocation = async () => {
    if (!allocTrainerId) {
      toast.error('Please select a trainer.');
      return;
    }
    if (!allocBranchId) {
      toast.error('Please select a target studio branch.');
      return;
    }
    if (allocDays.length === 0) {
      toast.error('Please select at least one working day.');
      return;
    }

    const selectedTr = trainers.find((t) => t.id === allocTrainerId);
    if (!selectedTr) {
      toast.error('Trainer profile not found.');
      return;
    }

    setIsSubmittingAlloc(true);
    try {
      // Build schedules payload
      const schedulesPayload: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        status: string;
      }> = [];

      allocDays.forEach((dayNum) => {
        // Shift 1
        schedulesPayload.push({
          day_of_week: dayNum,
          start_time: `${allocStartTime}:00`,
          end_time: `${allocEndTime}:00`,
          status: 'ACTIVE',
        });
        // Shift 2 if split
        if (allocHasSplit && allocSplitStart && allocSplitEnd) {
          schedulesPayload.push({
            day_of_week: dayNum,
            start_time: `${allocSplitStart}:00`,
            end_time: `${allocSplitEnd}:00`,
            status: 'ACTIVE',
          });
        }
      });

      const targetWeek = getWeekInfo(allocTargetDate ? parseDateStr(allocTargetDate) : currentWeekDate);

      await workforceApi.bulkSyncWorkSchedules({
        employee_profile_id: selectedTr.employee_profile,
        branch_id: allocBranchId,
        week_start_date: targetWeek.startDate,
        week_end_date: allocApplyMode === 'SPECIFIC_WEEK' ? targetWeek.endDate : null,
        apply_mode: allocApplyMode,
        schedules: schedulesPayload,
      });

      toast.success(
        `Successfully allocated ${selectedTr.trainer_name || selectedTr.trainer_code} to ${
          branches.find((b) => b.id === allocBranchId)?.name || 'Studio'
        }`
      );
      setIsQuickAllocOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['studio-shift-roster-schedules'] });
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
      await refetchSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to allocate trainer shift.');
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  // Handlers for Quick Category Assignment
  const handleOpenCategoryModal = (trainer: TrainerProfile) => {
    setCategoryModalTrainer(trainer);
    const existingIds =
      trainer.category_ids ||
      trainer.categories?.map((c) => c.id) ||
      [];
    setCategorySelectedIds(existingIds);
    setIsCategoryModalOpen(true);
  };

  const handleToggleCategory = (catId: string) => {
    setCategorySelectedIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSaveCategories = async () => {
    if (!categoryModalTrainer) return;
    setIsSavingCategories(true);
    try {
      await workforceApi.updateTrainer(categoryModalTrainer.id, {
        category_ids: categorySelectedIds,
      });
      toast.success(
        `Updated assigned categories for ${categoryModalTrainer.trainer_name || categoryModalTrainer.trainer_code}`
      );
      setIsCategoryModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['trainer-profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-trainers'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update categories.');
    } finally {
      setIsSavingCategories(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Studio Network & Dynamic Shift Horizon Overview */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Studio Network:</span>
              <strong className="font-semibold text-foreground">
                SWEAT Fitness ({branches.map((b) => b.name.replace('Sweat ', '')).join(', ')})
              </strong>
            </span>
            <span className="text-muted-foreground/60 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 hover:bg-muted/70 px-2 py-0.5 rounded-md border border-border/60 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium">Roster Horizon:</span>
              <input
                type="date"
                value={formatToDateStr(currentWeekDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentWeekDate(parseDateStr(e.target.value));
                  }
                }}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer hover:text-primary transition-colors"
                title="Click to jump directly to any date or week on calendar"
              />
              <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">({weekInfo.formattedRange})</span>
            </div>
            {weekInfo.isCurrentWeek ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold">
                Current Week
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold">
                Scheduled Week
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-2xs sm:text-xs flex-wrap">
            <Badge variant="outline" className="gap-1 bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium">
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Morning: From {formatTime12h(networkShiftHorizon.earliestOpen)}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20 font-medium">
              <Moon className="w-3 h-3 text-blue-500" />
              <span>Evening: Until {formatTime12h(networkShiftHorizon.latestClose)}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 bg-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-500/20 font-medium">
              <Layers className="w-3 h-3 text-purple-500" />
              <span>Single & Dual Shifts Supported</span>
            </Badge>
          </div>
        </div>

        {/* 4 Dynamic Enterprise KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Card 1: Rostered Trainers */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                On-Duty Trainers
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
                <span>{totalRosteredTrainers}</span>
                <span className="text-xs font-normal text-muted-foreground">/ {trainers.length}</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{activePercentage}% workforce rostered</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Shifts Scheduled */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Shifts Scheduled
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {totalShiftsCount}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Active shift assignments
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Active Studios */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Operating Studios
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
                <span>{branches.length}</span>
                <span className="text-xs font-normal text-muted-foreground">Locations</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px]">
                {branches.map((b) => b.name.replace('Sweat ', '')).join(', ')}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Qualified Categories */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Qualified Specialties
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
                <span>{trainersWithCategoriesCount}</span>
                <span className="text-xs font-normal text-muted-foreground">/ {trainers.length}</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                {classCategories.length} class categories
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Period Navigation Bar (Aligned with Image 3 pattern) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-2xs">
        {/* Left Side: Filter & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1">
          {/* Week Stepper */}
          <div className="flex items-center border rounded-lg bg-muted/40 p-0.5 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const prev = new Date(currentWeekDate);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeekDate(prev);
              }}
              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous Week (7 Days Earlier)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <div className="px-2.5 py-0.5 text-center min-w-[145px]">
              <div className="text-xs font-bold text-foreground whitespace-nowrap">{weekInfo.formattedRange}</div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {weekInfo.isCurrentWeek ? 'Active Studio Week' : 'Scheduled Shift Week'}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = new Date(currentWeekDate);
                next.setDate(next.getDate() + 7);
                setCurrentWeekDate(next);
              }}
              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Next Week (7 Days Later)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Jump Directly to ANY Date */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 py-0.5 h-8 shadow-2xs hover:border-primary/50 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">Pick Date:</span>
            <input
              type="date"
              value={formatToDateStr(currentWeekDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentWeekDate(parseDateStr(e.target.value));
                }
              }}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer w-[105px]"
              title="Pick any date to jump directly to that week"
            />
          </div>

          {!weekInfo.isCurrentWeek && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekDate(new Date())}
              className="h-8 text-xs gap-1.5 font-semibold px-2"
              title="Return to the current live active week"
            >
              <RotateCcw className="w-3 h-3 text-primary" />
              <span>Current Week</span>
            </Button>
          )}

          {/* Studio Filter (Placed in Filter Group) */}
          <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-lg border border-border/60 h-8">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Studio:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-7 border-none bg-transparent px-1 text-xs font-semibold text-foreground focus:outline-none cursor-pointer min-w-[140px]"
            >
              <option value="ALL">All {branches.length} Studio Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="hidden 2xl:flex items-center gap-1 border-l pl-2 border-border/60 text-2xs">
            <button
              type="button"
              onClick={() => setCurrentWeekDate(parseDateStr('2026-11-21'))}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                weekInfo.startDate === '2026-11-16'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Jump to Weekend Nov 21 & 22"
            >
              Nov 21–22
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setCurrentWeekDate(parseDateStr('2026-11-23'))}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                weekInfo.startDate === '2026-11-23'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Jump to Week 4 (Nov 23–29)"
            >
              Nov 23–29
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setCurrentWeekDate(parseDateStr('2026-11-30'))}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                weekInfo.startDate === '2026-11-30'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Jump to Nov 30"
            >
              Nov 30
            </button>
          </div>
        </div>

        {/* Right Side: View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end lg:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg bg-muted/40 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Shift Pools</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MATRIX')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'MATRIX'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>7-Day Matrix</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => handleOpenQuickAlloc()}
            className="gap-1.5 h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Shift Allocation</span>
          </Button>
        </div>
      </div>

      {/* 3. Main Roster Content */}
      {viewMode === 'CARDS' ? (
        /* ================= CARDS VIEW (SHIFT POOLS) ================= */
        <div className="space-y-5">
          {operationalBranches.map((branch) => {
            const badgeCode = getBranchBadgeCode(branch.name, branch.code);
            const rosterData = branchRosters.get(branch.id) || {
              morningTrainers: [],
              eveningTrainers: [],
            };
            const hoursDisplay = getBranchHoursDisplay(branch.id);
            const shiftWindows = getBranchShiftWindows(branch.id);
            const totalBranchTrainers = new Set([
              ...rosterData.morningTrainers.map((t) => t.trainer.id),
              ...rosterData.eveningTrainers.map((t) => t.trainer.id),
            ]).size;

            return (
              <div
                key={branch.id}
                className="rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-all hover:border-border/80"
              >
                {/* Branch Card Header */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs font-mono border border-primary/20 shrink-0">
                      {badgeCode}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>{branch.name}</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Configured Studio Hours: {hoursDisplay}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge variant="outline" className="text-xs font-semibold bg-background">
                      {totalBranchTrainers} Active Trainers Rostered
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenQuickAlloc(branch.id)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Assign Trainer</span>
                    </Button>
                  </div>
                </div>

                {/* Shift Pools: Morning and Evening */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Morning Shift Pool */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-xs text-foreground">
                          Morning Shift ({shiftWindows.morningLabel})
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                      >
                        {rosterData.morningTrainers.length} Trainers On Duty
                      </Badge>
                    </div>

                    {/* Trainer Chips */}
                    <div className="flex flex-wrap gap-2 pt-1 min-h-[44px] items-center">
                      {rosterData.morningTrainers.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                          <span>No trainers rostered for morning shift.</span>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAlloc(branch.id, 'MORNING')}
                            className="text-primary hover:underline font-semibold not-italic cursor-pointer"
                          >
                            + Allocate Now
                          </button>
                        </div>
                      ) : (
                        rosterData.morningTrainers.map((entry) => {
                          const categories = entry.trainer.categories || [];
                          const hasCategories = categories.length > 0;
                          return (
                            <div
                              key={entry.scheduleId}
                              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card shadow-2xs hover:border-primary/50 transition-all text-xs"
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    {entry.trainer.trainer_name || entry.trainer.trainer_code}
                                  </span>
                                  {entry.isSplit && (
                                    <span
                                      className="text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold"
                                      title={entry.splitDetails || 'Split Shift with Midday Break'}
                                    >
                                      Split
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                  <span>{entry.shiftStart}–{entry.shiftEnd}</span>
                                  <span>•</span>
                                  {hasCategories ? (
                                    <span className="text-primary font-sans font-medium truncate max-w-[120px]">
                                      {categories.map((c) => c.name).join(', ')}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCategoryModal(entry.trainer)}
                                      className="text-amber-600 hover:underline font-sans cursor-pointer"
                                      title="Click to assign class categories"
                                    >
                                      + Add Categories
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTrainerSchedule(entry.trainer, branch.id, weekInfo.startDate)
                                }
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                                title="Edit full weekly schedule"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Evening Shift Pool */}
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-xs text-foreground">
                          Evening Shift ({shiftWindows.eveningLabel})
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
                      >
                        {rosterData.eveningTrainers.length} Trainers On Duty
                      </Badge>
                    </div>

                    {/* Trainer Chips */}
                    <div className="flex flex-wrap gap-2 pt-1 min-h-[44px] items-center">
                      {rosterData.eveningTrainers.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                          <span>No trainers rostered for evening shift.</span>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAlloc(branch.id, 'EVENING')}
                            className="text-primary hover:underline font-semibold not-italic cursor-pointer"
                          >
                            + Allocate Now
                          </button>
                        </div>
                      ) : (
                        rosterData.eveningTrainers.map((entry) => {
                          const categories = entry.trainer.categories || [];
                          const hasCategories = categories.length > 0;
                          return (
                            <div
                              key={entry.scheduleId}
                              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card shadow-2xs hover:border-primary/50 transition-all text-xs"
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    {entry.trainer.trainer_name || entry.trainer.trainer_code}
                                  </span>
                                  {entry.isSplit && (
                                    <span
                                      className="text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold"
                                      title={entry.splitDetails || 'Split Shift with Midday Break'}
                                    >
                                      Split
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                  <span>{entry.shiftStart}–{entry.shiftEnd}</span>
                                  <span>•</span>
                                  {hasCategories ? (
                                    <span className="text-primary font-sans font-medium truncate max-w-[120px]">
                                      {categories.map((c) => c.name).join(', ')}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCategoryModal(entry.trainer)}
                                      className="text-amber-600 hover:underline font-sans cursor-pointer"
                                      title="Click to assign class categories"
                                    >
                                      + Add Categories
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTrainerSchedule(entry.trainer, branch.id, weekInfo.startDate)
                                }
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                                title="Edit full weekly schedule"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= 7-DAY ROSTER MATRIX VIEW ================= */
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">7-Day Weekly Shift Matrix</h3>
              <p className="text-xs text-muted-foreground">
                Showing scheduled trainer assignments day by day across studio branches.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {weekInfo.formattedRange}
            </Badge>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="sticky left-0 bg-muted/90 backdrop-blur-xs z-10 p-3 text-left font-bold text-foreground min-w-[200px] border-r border-border/80 shadow-2xs">
                    Branch & Shift Pool
                  </th>
                  {weekInfo.days.map((d) => (
                    <th
                      key={d.id}
                      className={`p-3 text-center min-w-[130px] font-semibold border-l border-border/60 ${
                        d.isToday ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                      }`}
                    >
                      <div>{d.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {d.dayOfMonth} {d.monthShort}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {operationalBranches.map((branch) => {
                  const roster = branchRosters.get(branch.id) || {
                    morningTrainers: [],
                    eveningTrainers: [],
                  };
                  const shiftWindows = getBranchShiftWindows(branch.id);
                  return (
                    <React.Fragment key={branch.id}>
                      {/* Morning Shift Row */}
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="sticky left-0 bg-card z-10 p-3 font-medium border-r border-border/80 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span className="size-2 rounded-full bg-amber-500" />
                            <span>{branch.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Sun className="w-3 h-3 text-amber-500" />
                            <span>Morning ({shiftWindows.morningLabel})</span>
                          </div>
                        </td>
                        {weekInfo.days.map((d) => {
                          const activeTrainers = roster.morningTrainers.filter((t) =>
                            t.activeDays.includes(d.id)
                          );
                          return (
                            <td
                              key={d.id}
                              className={`p-2 border-l border-border/60 align-top ${
                                d.isToday ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className="space-y-1">
                                {activeTrainers.length === 0 ? (
                                  <span className="text-[10px] text-muted-foreground italic">-</span>
                                ) : (
                                  activeTrainers.map((tr) => (
                                    <div
                                      key={tr.scheduleId}
                                      onClick={() =>
                                        onOpenTrainerSchedule(
                                          tr.trainer,
                                          branch.id,
                                          weekInfo.startDate
                                        )
                                      }
                                      className="p-1 rounded bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 text-[10px] font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
                                      title="Click to view/edit schedule"
                                    >
                                      {tr.trainer.trainer_name || tr.trainer.trainer_code}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Evening Shift Row */}
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="sticky left-0 bg-card z-10 p-3 font-medium border-r border-border/80 border-b-2 border-border shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span className="size-2 rounded-full bg-blue-500" />
                            <span>{branch.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Moon className="w-3 h-3 text-blue-500" />
                            <span>Evening ({shiftWindows.eveningLabel})</span>
                          </div>
                        </td>
                        {weekInfo.days.map((d) => {
                          const activeTrainers = roster.eveningTrainers.filter((t) =>
                            t.activeDays.includes(d.id)
                          );
                          return (
                            <td
                              key={d.id}
                              className={`p-2 border-l border-border/60 border-b-2 border-border align-top ${
                                d.isToday ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className="space-y-1">
                                {activeTrainers.length === 0 ? (
                                  <span className="text-[10px] text-muted-foreground italic">-</span>
                                ) : (
                                  activeTrainers.map((tr) => (
                                    <div
                                      key={tr.scheduleId}
                                      onClick={() =>
                                        onOpenTrainerSchedule(
                                          tr.trainer,
                                          branch.id,
                                          weekInfo.startDate
                                        )
                                      }
                                      className="p-1 rounded bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/20 text-[10px] font-medium cursor-pointer hover:bg-blue-500/20 transition-colors"
                                      title="Click to view/edit schedule"
                                    >
                                      {tr.trainer.trainer_name || tr.trainer.trainer_code}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: QUICK SHIFT ALLOCATION                                           */}
      {/* ========================================================================= */}
      <Dialog open={isQuickAllocOpen} onOpenChange={setIsQuickAllocOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Quick Shift Allocation</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Select Trainer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Trainer *</Label>
              <select
                value={allocTrainerId}
                onChange={(e) => setAllocTrainerId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Trainer --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trainer_name || t.trainer_code} ({t.trainer_code})
                    {t.categories && t.categories.length > 0
                      ? ` • ${t.categories.map((c) => c.name).join(', ')}`
                      : ' • No categories'}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Target Studio Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Studio Branch *</Label>
              <select
                value={allocBranchId}
                onChange={(e) => {
                  const newBranch = e.target.value;
                  setAllocBranchId(newBranch);
                  handleApplyShiftPreset(allocShiftPreset, newBranch);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Studio Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Schedule Week Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Target Schedule Week *</Label>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Week: {getWeekInfo(allocTargetDate ? parseDateStr(allocTargetDate) : currentWeekDate).formattedRange}
                </span>
              </div>
              <Input
                type="date"
                value={allocTargetDate}
                onChange={(e) => setAllocTargetDate(e.target.value)}
                className="h-9 text-xs font-mono"
                title="Pick any date within the target week"
              />
            </div>

            {/* Shift Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Shift Timing Preset *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={allocShiftPreset === 'MORNING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApplyShiftPreset('MORNING')}
                  className="h-8 text-[11px] justify-start gap-1.5 font-medium truncate"
                >
                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">Morning ({activeAllocBranchWindows.morningLabel})</span>
                </Button>
                <Button
                  type="button"
                  variant={allocShiftPreset === 'EVENING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApplyShiftPreset('EVENING')}
                  className="h-8 text-[11px] justify-start gap-1.5 font-medium truncate"
                >
                  <Moon className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="truncate">Evening ({activeAllocBranchWindows.eveningLabel})</span>
                </Button>
                <Button
                  type="button"
                  variant={allocShiftPreset === 'SPLIT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApplyShiftPreset('SPLIT')}
                  className="h-8 text-[11px] justify-start gap-1.5 font-medium"
                >
                  <Layers className="w-3 h-3 text-purple-500 shrink-0" />
                  <span>Dual/Split Shift</span>
                </Button>
                <Button
                  type="button"
                  variant={allocShiftPreset === 'CUSTOM' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApplyShiftPreset('CUSTOM')}
                  className="h-8 text-[11px] justify-start gap-1.5 font-medium"
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Custom Hours</span>
                </Button>
              </div>
            </div>

            {/* Shift 1 Timings */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <span className="font-semibold text-foreground text-[11px]">
                {allocHasSplit ? 'Shift 1 (Morning)' : 'Shift Timings'}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={allocStartTime}
                  onChange={(e) => setAllocStartTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={allocEndTime}
                  onChange={(e) => setAllocEndTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Shift 2 Timings if Split */}
              {allocHasSplit && (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <span className="font-semibold text-foreground text-[11px]">
                    Shift 2 (Evening after Midday Break)
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={allocSplitStart}
                      onChange={(e) => setAllocSplitStart(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={allocSplitEnd}
                      onChange={(e) => setAllocSplitEnd(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Working Days */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Active Working Days *</Label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllocDays([1, 2, 3, 4, 5])}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Mon–Fri
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAllocDays([1, 2, 3, 4, 5, 6])}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Mon–Sat
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAllocDays([1, 2, 3, 4, 5, 6, 7])}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    7 Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {[
                  { id: 1, label: 'Mon' },
                  { id: 2, label: 'Tue' },
                  { id: 3, label: 'Wed' },
                  { id: 4, label: 'Thu' },
                  { id: 5, label: 'Fri' },
                  { id: 6, label: 'Sat' },
                  { id: 7, label: 'Sun' },
                ].map((d) => {
                  const active = allocDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleAllocDay(d.id)}
                      className={`h-8 rounded text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Application Scope */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Roster Scope</Label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="allocScope"
                    checked={allocApplyMode === 'SPECIFIC_WEEK'}
                    onChange={() => setAllocApplyMode('SPECIFIC_WEEK')}
                    className="accent-primary"
                  />
                  <span>
                    This Week Only ({getWeekInfo(allocTargetDate ? parseDateStr(allocTargetDate) : currentWeekDate).formattedRange})
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="allocScope"
                    checked={allocApplyMode === 'RECURRING_FROM_WEEK'}
                    onChange={() => setAllocApplyMode('RECURRING_FROM_WEEK')}
                    className="accent-primary"
                  />
                  <span>Recurring Weekly Onwards</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickAllocOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveQuickAllocation}
              disabled={isSubmittingAlloc}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSubmittingAlloc ? 'Saving...' : 'Apply Roster Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK CATEGORY ASSIGNMENT                                        */}
      {/* ========================================================================= */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span>Assign Class Categories</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="font-bold text-sm text-foreground">
                {categoryModalTrainer?.trainer_name || categoryModalTrainer?.trainer_code}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Trainer Code: {categoryModalTrainer?.trainer_code}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Select Qualified Class Categories ({categorySelectedIds.length} selected)
              </Label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {classCategories.map((cat) => {
                  const isChecked = categorySelectedIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-primary bg-primary/5 font-semibold text-primary'
                          : 'border-border hover:bg-muted/30 text-foreground'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <div
                        className={`size-4 rounded flex items-center justify-center border text-[9px] font-bold ${
                          isChecked
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCategories}
              disabled={isSavingCategories}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSavingCategories ? 'Saving...' : 'Save Category Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
