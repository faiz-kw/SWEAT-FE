import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Award,
  CalendarDays,
  RefreshCw,
  Plus,
  AlertCircle,
  Filter,
  CheckCircle2,
  CalendarX,
  UserCheck,
} from 'lucide-react';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { classesApi } from '@/api/endpoints/classesApi';
import { workforceApi } from '@/api/endpoints/workforceApi';
import { approvalsApi } from '@/api/endpoints/approvalsApi';
import { api } from '@/api/client';
import { useAuth } from '@/api/auth/AuthProvider';
import { isOrganizationAdmin, isTrainerUser } from '@/lib/nav';
import { ClassOccurrence } from '../../types/classes';
import { TrainerProfile, EmployeeWorkSchedule, EmployeeScheduleException } from '../../types/workforce';
import { ApprovalRequest } from '../../types/approvals';
import { ClassAttendanceModal } from '../classes/ClassAttendanceModal';
import { TrainerLeaveApplyDialog } from '../trainers/TrainerLeaveApplyDialog';

export const CalendarWorkspace: React.FC = () => {
  const { user } = useAuth();
  const isOrgAdmin = isOrganizationAdmin(user);

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedOccurrence, setSelectedOccurrence] = useState<ClassOccurrence | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState<boolean>(false);

  // Fetch branches
  const { data: branches = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['calendar-branches'],
    queryFn: async () => {
      const res = await api.get<any>('/tenant/branches/');
      return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    },
  });

  // Fetch trainers
  const { data: trainers = [] } = useQuery<TrainerProfile[]>({
    queryKey: ['calendar-trainers'],
    queryFn: () => workforceApi.getTrainers({ trainer_status: 'ACTIVE' }),
  });

  // Identify logged in trainer
  const currentTrainer = React.useMemo(() => {
    if (!trainers.length || !user) return null;
    return (
      trainers.find(
        (t) =>
          t.email?.toLowerCase() === user.email?.toLowerCase() ||
          (t as any).user === user.id ||
          (t as any).user_id === user.id
      ) || null
    );
  }, [trainers, user]);

  const isTrainer = !isOrgAdmin && (isTrainerUser(user, trainers) || !!currentTrainer);

  // Auto-select trainer profile for trainer users
  React.useEffect(() => {
    if (isTrainer && currentTrainer && selectedTrainerId !== currentTrainer.id) {
      setSelectedTrainerId(currentTrainer.id);
    }
  }, [isTrainer, currentTrainer, selectedTrainerId]);

  const toLocalDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isPastSession = (occ: ClassOccurrence) => {
    const now = new Date();
    const time = occ.start_at || occ.start_time || '00:00';
    const occDate = new Date(`${occ.occurrence_date}T${time.length === 5 ? time + ':00' : time}`);
    return occDate < now;
  };

  const isAttendanceMissing = (occ: ClassOccurrence) => {
    if (!isPastSession(occ)) return false;
    return occ.status !== 'COMPLETED' && (!occ.attendance_count || occ.attendance_count === 0);
  };

  // Date range computations (local-date safe, no timezone shifting)
  const { fromDateStr, toDateStr, daysInView } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Pad to start on Monday
      const startPadding = (firstDay.getDay() + 6) % 7;
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startPadding);

      // Pad to end on Sunday
      const endPadding = (7 - ((lastDay.getDay() + 6) % 7 + 1)) % 7;
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + endPadding);

      const days: Date[] = [];
      const curr = new Date(startDate);
      while (curr <= endDate) {
        days.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      return {
        fromDateStr: toLocalDateStr(startDate),
        toDateStr: toLocalDateStr(endDate),
        daysInView: days,
      };
    } else if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const dayOfWeek = (curr.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
      const monday = new Date(curr);
      monday.setDate(curr.getDate() - dayOfWeek);

      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }

      return {
        fromDateStr: toLocalDateStr(days[0]),
        toDateStr: toLocalDateStr(days[6]),
        daysInView: days,
      };
    } else {
      // Day view
      const dateStr = toLocalDateStr(currentDate);
      return {
        fromDateStr: dateStr,
        toDateStr: dateStr,
        daysInView: [new Date(currentDate)],
      };
    }
  }, [currentDate, viewMode]);

  // Effective trainer id and employee profile id
  const effectiveTrainerId = isTrainer
    ? (currentTrainer?.id || undefined)
    : (selectedTrainerId === 'ALL' ? undefined : selectedTrainerId);

  const selectedTrainer = trainers.find((t) => t.id === (isTrainer ? currentTrainer?.id : selectedTrainerId));
  const effectiveEmployeeProfileId = isTrainer
    ? (currentTrainer?.employee_profile || (user as any)?.employee_profile_id || undefined)
    : selectedTrainer?.employee_profile;

  // Fetch class occurrences
  const {
    data: occurrences = [],
    isLoading: loadingOccurrences,
    refetch: refetchOccurrences,
  } = useQuery({
    queryKey: ['calendar-occurrences', fromDateStr, toDateStr, effectiveTrainerId, selectedBranchId],
    queryFn: () =>
      classesApi.getOccurrences({
        from_date: fromDateStr,
        to_date: toDateStr,
        trainer_id: effectiveTrainerId,
        branch_id: selectedBranchId === 'ALL' ? undefined : selectedBranchId,
      }),
  });

  // Fetch branch holidays/exceptions
  const { data: holidays = [], refetch: refetchHolidays } = useQuery({
    queryKey: ['calendar-holidays', selectedBranchId],
    queryFn: () => classesApi.getBranchHolidays(selectedBranchId === 'ALL' ? undefined : selectedBranchId),
  });

  // Fetch work schedules (rosters)
  const { data: workSchedules = [], refetch: refetchWorkSchedules } = useQuery({
    queryKey: ['calendar-work-schedules', effectiveEmployeeProfileId, selectedBranchId],
    queryFn: () =>
      workforceApi.getWorkSchedules(
        effectiveEmployeeProfileId || undefined,
        selectedBranchId === 'ALL' ? undefined : selectedBranchId
      ),
    enabled: !!effectiveEmployeeProfileId,
  });

  // Fetch schedule exceptions (approved leaves, marked absences, shift overrides)
  const { data: scheduleExceptions = [], refetch: refetchExceptions } = useQuery({
    queryKey: ['calendar-schedule-exceptions', effectiveEmployeeProfileId, fromDateStr, toDateStr],
    queryFn: () =>
      workforceApi.getScheduleExceptions({
        employee_profile_id: effectiveEmployeeProfileId || undefined,
        date_from: fromDateStr,
        date_to: toDateStr,
      }),
  });

  // Fetch applied leave requests from the approvals system
  const { data: leaveRequests = [], refetch: refetchLeaveRequests } = useQuery<ApprovalRequest[]>({
    queryKey: ['calendar-leave-requests'],
    queryFn: () =>
      approvalsApi.getRequests({
        request_type: 'TRAINER_LEAVE_REQUEST',
      }),
  });

  const refetchAll = () => {
    refetchOccurrences();
    refetchLeaveRequests();
    refetchExceptions();
    refetchWorkSchedules();
    refetchHolidays();
  };

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatHeaderTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      if (daysInView.length >= 7) {
        const start = daysInView[0].toLocaleDateString('default', { month: 'short', day: 'numeric' });
        const end = daysInView[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} - ${end}`;
      }
      return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    } else {
      return currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr.slice(0, 5);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <PageHeader
        title="Operations Calendar & Schedules"
        subtitle="Visual timeline of allotted classes, trainer shifts, week-offs, and approved leaves."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveDialogOpen(true)}
              className="gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
            >
              <CalendarDays className="size-3.5" />
              <span>Apply for Leave</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAll()}
              className="gap-1.5 text-xs"
              title="Refresh schedule"
            >
              <RefreshCw className={`size-3.5 ${loadingOccurrences ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <PageBody className="space-y-3 pb-3">
        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl border border-border bg-card shadow-2xs">
          {/* Left: Date Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold px-2.5">
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0" title="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0" title="Next">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground px-2 whitespace-nowrap">
              {formatHeaderTitle()}
            </h3>
          </div>

          {/* Right: View Switcher & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Buttons */}
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
              <button
                onClick={() => setViewMode('month')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'month' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'week' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'day' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Day
              </button>
            </div>

            {/* Trainer Filter: Admins can filter across all trainers; Trainers are automatically locked to themselves without a dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Trainer:</span>
              {isTrainer ? (
                <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  {currentTrainer ? `${currentTrainer.trainer_name || currentTrainer.trainer_code} (${currentTrainer.trainer_code})` : 'My Schedule'}
                </Badge>
              ) : (
                <select
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Trainers</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trainer_name || t.trainer_code} ({t.trainer_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-2xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            <span>Allotted Class</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span>Leave (Pending)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600" />
            <span>Leave (Approved)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-600" />
            <span>Marked Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500/70" />
            <span>Branch Holiday / Closed</span>
          </div>
        </div>

        {/* CALENDAR BODY */}
        {viewMode === 'month' && (
          <div className="h-[calc(100vh-230px)] min-h-[490px] flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center font-semibold py-2 shrink-0">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-muted-foreground uppercase tracking-wider text-2xs sm:text-xs">
                  {day}
                </div>
              ))}
            </div>

            {/* Month Day Grid */}
            <div
              className="flex-1 grid grid-cols-7 divide-x divide-y divide-border/60 min-h-0"
              style={{
                gridTemplateRows: `repeat(${Math.max(1, Math.ceil(daysInView.length / 7))}, minmax(0, 1fr))`,
              }}
            >
              {daysInView.map((day, idx) => {
                const dateStr = toLocalDateStr(day);
                const dayOccurrences = occurrences.filter((o) => {
                  if (o.occurrence_date !== dateStr) return false;
                  if (isTrainer && effectiveTrainerId) {
                    const tId = o.trainer_id || (o as any).trainer;
                    return !tId || tId === effectiveTrainerId;
                  }
                  return true;
                });
                const dayHolidays = holidays.filter((h: any) => h.exception_date === dateStr);
                const dayOfWeekNum = ((day.getDay() + 6) % 7) + 1; // 1 = Mon ... 7 = Sun
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                // Check trainer schedule if single trainer is selected or in trainer mode
                const schedule = workSchedules.find((s) => s.day_of_week === dayOfWeekNum);

                // Exceptions (absences, approved leaves, special shifts)
                const dayExceptions = scheduleExceptions.filter((e) => {
                  const excDate = e.exception_date || (e as any).date;
                  if (excDate) return excDate === dateStr;
                  if ((e as any).start_date) {
                    return (e as any).start_date <= dateStr && (!(e as any).end_date || (e as any).end_date >= dateStr);
                  }
                  return false;
                });

                // Applied leave requests from ApprovalRequest (pending, approved, rejected)
                const dayAppliedLeaves = leaveRequests.filter((req) => {
                  const payload = req.requested_payload || {};
                  const reqDate = payload.exception_date || payload.date || payload.leave_date;
                  if (reqDate !== dateStr) return false;
                  if (effectiveEmployeeProfileId) {
                    if (payload.employee_profile_id === effectiveEmployeeProfileId || req.entity_id === effectiveEmployeeProfileId) return true;
                  }
                  if (user?.id && (req.requested_by_user === user.id || (req as any).user === user.id)) return true;
                  if (user?.email && (req.requested_by_email?.toLowerCase() === user.email.toLowerCase() || (req as any).created_by_email?.toLowerCase() === user.email.toLowerCase())) return true;
                  if (currentTrainer && (payload.trainer_code === currentTrainer.trainer_code || payload.trainer_id === currentTrainer.id)) return true;
                  return !isTrainer;
                });

                const isAbsent = dayExceptions.some(
                  (e) => !e.is_available && (e.exception_type === 'UNAVAILABLE' || e.reason?.toLowerCase().includes('absent') || (e.exception_type as string).includes('ABSENT'))
                );
                const hasApprovedLeave = dayExceptions.some(
                  (e) => !e.is_available && e.exception_type === 'LEAVE'
                ) || dayAppliedLeaves.some((r) => r.status === 'APPROVED');
                const hasPendingLeave = dayAppliedLeaves.some((r) => r.status === 'PENDING');

                return (
                  <div
                    key={idx}
                    className={`h-full min-h-0 p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden transition-colors ${
                      isAbsent
                        ? 'bg-rose-500/8'
                        : hasApprovedLeave
                        ? 'bg-emerald-500/8'
                        : hasPendingLeave
                        ? 'bg-amber-500/8'
                        : dayHolidays.length > 0
                        ? 'bg-rose-500/8'
                        : isCurrentMonth
                        ? 'bg-card'
                        : 'bg-muted/15 text-muted-foreground'
                    } ${isToday(day) ? 'ring-2 ring-inset ring-primary/50' : ''}`}
                  >
                    {/* Top Row: Date & Status Tag */}
                    <div className="flex items-center justify-between shrink-0 leading-none mb-0.5">
                      <span
                        className={`text-2xs sm:text-xs font-bold size-5 sm:size-6 rounded-full flex items-center justify-center ${
                          isToday(day) ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-foreground'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayHolidays.length > 0 ? (
                        <span className="text-3xs text-rose-500 font-semibold px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                          Closed
                        </span>
                      ) : isAbsent ? (
                        <span className="text-3xs text-rose-600 font-bold px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30">
                          Absent
                        </span>
                      ) : hasApprovedLeave ? (
                        <span className="text-3xs text-emerald-600 font-semibold px-1 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30">
                          Leave
                        </span>
                      ) : hasPendingLeave ? (
                        <span className="text-3xs text-amber-600 font-semibold px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30">
                          Pending
                        </span>
                      ) : null}
                    </div>

                    {/* Content Items Scroll Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1 my-0.5 pr-0.5 scrollbar-thin">
                      {/* Holiday indicator */}
                      {dayHolidays.map((h: any) => (
                        <div
                          key={h.id}
                          className="text-3xs px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium truncate flex items-center gap-1"
                          title={`Branch Closed: ${h.reason || 'Holiday'}`}
                        >
                          <CalendarX className="size-2.5 shrink-0" />
                          <span className="truncate">Closed: {h.reason || 'Holiday'}</span>
                        </div>
                      ))}

                      {/* Marked Absent (Schedule Exception) */}
                      {dayExceptions
                        .filter((e) => !e.is_available && (e.exception_type === 'UNAVAILABLE' || e.reason?.toLowerCase().includes('absent') || (e.exception_type as string).includes('ABSENT')))
                        .map((exc) => (
                          <div
                            key={exc.id}
                            className="text-3xs px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold truncate flex items-center gap-1"
                            title={`Marked Absent: ${exc.reason || 'Absent'}`}
                          >
                            <AlertCircle className="size-2.5 shrink-0 text-rose-600" />
                            <span className="truncate">Absent: {exc.reason || 'Marked Absent'}</span>
                          </div>
                        ))}

                      {/* Approved Leave (Materialized Exception) */}
                      {dayExceptions
                        .filter((e) => !e.is_available && e.exception_type === 'LEAVE')
                        .map((exc) => (
                          <div
                            key={exc.id}
                            className="text-3xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium truncate flex items-center gap-1"
                            title={`Leave (Approved): ${exc.reason || 'Approved Leave'}`}
                          >
                            <CheckCircle2 className="size-2.5 shrink-0 text-emerald-600" />
                            <span className="truncate">Leave (Approved): {exc.reason || 'Full Day'}</span>
                          </div>
                        ))}

                      {/* Applied Leave Requests (Pending, Approved, Denied) */}
                      {dayAppliedLeaves
                        .filter((req) => {
                          if (req.status === 'APPROVED' && dayExceptions.some((e) => !e.is_available && e.exception_type === 'LEAVE')) {
                            return false; // De-duplicate with materialized exception
                          }
                          return true;
                        })
                        .map((req) => {
                          const isPending = req.status === 'PENDING';
                          const isApproved = req.status === 'APPROVED';
                          const reason = req.requested_payload?.reason || req.requested_payload?.exception_type || 'Leave Request';

                          return (
                            <div
                              key={req.id}
                              className={`text-3xs px-1.5 py-0.5 rounded border font-medium truncate flex items-center gap-1 ${
                                isPending
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : isApproved
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-600/80 border-rose-500/20 line-through'
                              }`}
                              title={`Leave (${req.status}): ${reason}`}
                            >
                              <Clock className="size-2.5 shrink-0" />
                              <span className="truncate">
                                Leave ({isPending ? 'Pending' : isApproved ? 'Approved' : 'Denied'}): {reason}
                              </span>
                            </div>
                          );
                        })}

                      {/* Allotted Classes */}
                      {dayOccurrences.map((occ) => {
                        const missingAttendance = isAttendanceMissing(occ);
                        const isCompleted = occ.status === 'COMPLETED';
                        return (
                          <button
                            key={occ.id}
                            onClick={() => setSelectedOccurrence(occ)}
                            className={`w-full text-left px-1.5 py-1 rounded transition-all group block shadow-2xs border ${
                              missingAttendance
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
                                : isCompleted
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                            }`}
                            title={`${occ.template_name || occ.class_name} (${formatTime(occ.start_at || occ.start_time)} - ${formatTime(occ.end_at || occ.end_time)}) - Click to open attendance`}
                          >
                            <div className="text-2xs font-bold truncate flex items-center justify-between gap-1 leading-tight">
                              <span className="truncate">{occ.template_name || occ.class_name}</span>
                              {missingAttendance ? (
                                <span className="text-3xs font-bold text-rose-600 bg-rose-500/20 px-1 rounded shrink-0">
                                  Missing
                                </span>
                              ) : isCompleted ? (
                                <span className="text-3xs font-medium text-emerald-600 bg-emerald-500/20 px-1 rounded shrink-0">
                                  ✓ Done
                                </span>
                              ) : null}
                            </div>
                            <div className="text-3xs text-muted-foreground group-hover:text-foreground flex items-center justify-between mt-0.5 leading-tight">
                              <span>{formatTime(occ.start_at || occ.start_time)}</span>
                              <span className="font-semibold">{occ.capacity ? `${occ.capacity} cap` : ''}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Day Footer */}
                    <div className="shrink-0 text-3xs text-muted-foreground/60 text-right leading-none pt-0.5">
                      {dayOccurrences.length > 0 ? `${dayOccurrences.length} class${dayOccurrences.length > 1 ? 'es' : ''}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {daysInView.map((day, idx) => {
              const dateStr = toLocalDateStr(day);
              const dayOccurrences = occurrences.filter((o) => {
                if (o.occurrence_date !== dateStr) return false;
                if (isTrainer && effectiveTrainerId) {
                  const tId = o.trainer_id || (o as any).trainer;
                  return !tId || tId === effectiveTrainerId;
                }
                return true;
              });
              const dayHolidays = holidays.filter((h: any) => h.exception_date === dateStr);
              const dayOfWeekNum = ((day.getDay() + 6) % 7) + 1;

              const schedule = workSchedules.find((s) => s.day_of_week === dayOfWeekNum);
              const dayExceptions = scheduleExceptions.filter((e) => {
                const excDate = e.exception_date || (e as any).date;
                if (excDate) return excDate === dateStr;
                if ((e as any).start_date) {
                  return (e as any).start_date <= dateStr && (!(e as any).end_date || (e as any).end_date >= dateStr);
                }
                return false;
              });

              const dayAppliedLeaves = leaveRequests.filter((req) => {
                const payload = req.requested_payload || {};
                const reqDate = payload.exception_date || payload.date || payload.leave_date;
                if (reqDate !== dateStr) return false;
                if (effectiveEmployeeProfileId) {
                  if (payload.employee_profile_id === effectiveEmployeeProfileId || req.entity_id === effectiveEmployeeProfileId) return true;
                }
                if (user?.id && (req.requested_by_user === user.id || (req as any).user === user.id)) return true;
                if (user?.email && (req.requested_by_email?.toLowerCase() === user.email.toLowerCase() || (req as any).created_by_email?.toLowerCase() === user.email.toLowerCase())) return true;
                if (currentTrainer && (payload.trainer_code === currentTrainer.trainer_code || payload.trainer_id === currentTrainer.id)) return true;
                return !isTrainer;
              });

              const isAbsent = dayExceptions.some(
                (e) => !e.is_available && (e.exception_type === 'UNAVAILABLE' || e.reason?.toLowerCase().includes('absent') || (e.exception_type as string).includes('ABSENT'))
              );
              const hasApprovedLeave = dayExceptions.some(
                (e) => !e.is_available && e.exception_type === 'LEAVE'
              ) || dayAppliedLeaves.some((r) => r.status === 'APPROVED');

              return (
                <div
                  key={idx}
                  className={`rounded-xl border flex flex-col justify-between p-3.5 transition-all min-h-[320px] ${
                    isToday(day)
                      ? 'bg-primary/5 border-primary/40 shadow-xs'
                      : 'bg-card border-border shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                      <div>
                        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                          {day.toLocaleDateString('default', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {day.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {isToday(day) && (
                        <Badge variant="outline" className="text-2xs bg-primary text-primary-foreground font-bold">
                          Today
                        </Badge>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="space-y-1.5 mb-3">
                      {dayHolidays.map((h: any) => (
                        <div
                          key={h.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 text-2xs font-medium flex items-center gap-1.5"
                        >
                          <CalendarX className="size-3.5 shrink-0" />
                          <span className="truncate">Holiday: {h.reason || 'Closed'}</span>
                        </div>
                      ))}

                      {dayExceptions
                        .filter((e) => !e.is_available && (e.exception_type === 'UNAVAILABLE' || e.reason?.toLowerCase().includes('absent') || (e.exception_type as string).includes('ABSENT')))
                        .map((exc) => (
                          <div
                            key={exc.id}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-700 border border-rose-500/30 text-2xs font-bold flex items-center gap-1.5"
                          >
                            <AlertCircle className="size-3.5 shrink-0 text-rose-600" />
                            <span className="truncate">Marked Absent: {exc.reason || 'Absent'}</span>
                          </div>
                        ))}

                      {dayExceptions
                        .filter((e) => !e.is_available && e.exception_type === 'LEAVE')
                        .map((exc) => (
                          <div
                            key={exc.id}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-2xs font-medium flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                            <span className="truncate">Leave (Approved): {exc.reason || 'Approved'}</span>
                          </div>
                        ))}

                      {dayAppliedLeaves
                        .filter((req) => {
                          if (req.status === 'APPROVED' && dayExceptions.some((e) => !e.is_available && e.exception_type === 'LEAVE')) {
                            return false;
                          }
                          return true;
                        })
                        .map((req) => (
                          <div
                            key={req.id}
                            className={`p-1.5 rounded-lg border text-2xs font-medium flex items-center gap-1.5 ${
                              req.status === 'PENDING'
                                ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                : req.status === 'APPROVED'
                                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 line-through'
                            }`}
                          >
                            <Clock className="size-3.5 shrink-0" />
                            <span className="truncate">
                              Leave ({req.status}): {req.requested_payload?.reason || 'Leave'}
                            </span>
                          </div>
                        ))}

                    </div>

                    {/* Classes List */}
                    <div className="space-y-2">
                      <div className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Allotted Sessions ({dayOccurrences.length})
                      </div>
                      {dayOccurrences.length === 0 ? (
                        <p className="text-2xs text-muted-foreground/60 italic py-4 text-center">
                          No classes scheduled
                        </p>
                      ) : (
                        dayOccurrences.map((occ) => {
                          const missingAttendance = isAttendanceMissing(occ);
                          const isCompleted = occ.status === 'COMPLETED';
                          return (
                            <div
                              key={occ.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1.5 shadow-2xs transition-all ${
                                missingAttendance
                                  ? 'bg-rose-500/5 border-rose-500/30 ring-1 ring-rose-500/20'
                                  : isCompleted
                                  ? 'bg-background border-emerald-500/30'
                                  : 'bg-background border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="font-semibold text-foreground flex items-center justify-between gap-1">
                                <span className="truncate">{occ.template_name || occ.class_name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-3xs py-0 px-1 shrink-0 ${
                                    missingAttendance
                                      ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold'
                                      : isCompleted
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold'
                                      : 'bg-primary/10 text-primary border-primary/20'
                                  }`}
                                >
                                  {missingAttendance ? 'ATTENDANCE MISSING' : isCompleted ? 'COMPLETED' : occ.status || 'SCHEDULED'}
                                </Badge>
                              </div>
                              <div className="text-2xs text-muted-foreground flex items-center justify-between">
                                <span>{formatTime(occ.start_at || occ.start_time)} - {formatTime(occ.end_at || occ.end_time)}</span>
                                <span>{occ.branch_name}</span>
                              </div>
                              <Button
                                size="sm"
                                variant={missingAttendance ? 'default' : 'secondary'}
                                onClick={() => setSelectedOccurrence(occ)}
                                className={`w-full mt-1.5 h-6 text-2xs font-semibold gap-1 ${
                                  missingAttendance
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                                }`}
                              >
                                <UserCheck className="size-3" />
                                <span>{missingAttendance ? 'Record Missing Attendance' : 'Take Attendance'}</span>
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/60 text-3xs text-muted-foreground text-center">
                    {dayOccurrences.length} Class Session{dayOccurrences.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode === 'day' && (() => {
          const dateStr = toLocalDateStr(currentDate);
          const dayOccurrences = occurrences.filter((o) => {
            if (o.occurrence_date !== dateStr) return false;
            if (isTrainer && effectiveTrainerId) {
              const tId = o.trainer_id || (o as any).trainer;
              return !tId || tId === effectiveTrainerId;
            }
            return true;
          });
          const dayHolidays = holidays.filter((h: any) => h.exception_date === dateStr);
          const dayOfWeekNum = ((currentDate.getDay() + 6) % 7) + 1;
          const schedule = workSchedules.find((s) => s.day_of_week === dayOfWeekNum);

          const dayExceptions = scheduleExceptions.filter((e) => {
            const excDate = e.exception_date || (e as any).date;
            if (excDate) return excDate === dateStr;
            if ((e as any).start_date) {
              return (e as any).start_date <= dateStr && (!(e as any).end_date || (e as any).end_date >= dateStr);
            }
            return false;
          });

          const dayAppliedLeaves = leaveRequests.filter((req) => {
            const payload = req.requested_payload || {};
            const reqDate = payload.exception_date || payload.date || payload.leave_date;
            if (reqDate !== dateStr) return false;
            if (effectiveEmployeeProfileId) {
              if (payload.employee_profile_id === effectiveEmployeeProfileId || req.entity_id === effectiveEmployeeProfileId) return true;
            }
            if (user?.id && (req.requested_by_user === user.id || (req as any).user === user.id)) return true;
            if (user?.email && (req.requested_by_email?.toLowerCase() === user.email.toLowerCase() || (req as any).created_by_email?.toLowerCase() === user.email.toLowerCase())) return true;
            if (currentTrainer && (payload.trainer_code === currentTrainer.trainer_code || payload.trainer_id === currentTrainer.id)) return true;
            return !isTrainer;
          });

          const isAbsent = dayExceptions.some(
            (e) => !e.is_available && (e.exception_type === 'UNAVAILABLE' || e.reason?.toLowerCase().includes('absent') || (e.exception_type as string).includes('ABSENT'))
          );
          const hasApprovedLeave = dayExceptions.some(
            (e) => !e.is_available && e.exception_type === 'LEAVE'
          ) || dayAppliedLeaves.some((r) => r.status === 'APPROVED');
          const hasPendingLeave = dayAppliedLeaves.some((r) => r.status === 'PENDING');

          return (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h4 className="text-lg font-bold text-foreground">
                    {currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full day schedule of assigned classes, trainer shifts, and status.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {dayOccurrences.length} Total Sessions
                </Badge>
              </div>

              {/* Status Banner for Day View */}
              {dayHolidays.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center gap-2 text-xs font-medium">
                  <CalendarX className="size-4 shrink-0" />
                  <span>Facility Closed for Holiday: {dayHolidays.map((h: any) => h.reason).join(', ') || 'Holiday'}</span>
                </div>
              )}

              {isAbsent && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>Marked Absent for this day: {dayExceptions.find((e) => !e.is_available)?.reason || 'Absent'}</span>
                </div>
              )}

              {hasApprovedLeave && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 flex items-center gap-2 text-xs font-medium">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>Approved Leave for this date</span>
                </div>
              )}

              {hasPendingLeave && !hasApprovedLeave && (
                <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center gap-2 text-xs font-medium">
                  <Clock className="size-4 shrink-0 text-amber-600" />
                  <span>Leave Request Pending Review</span>
                </div>
              )}


              {dayOccurrences.length === 0 ? (
                <div className="p-10 text-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                  <CalendarIcon className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">No Classes Scheduled for This Day</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                    Check other days in the month view to see all allotted sessions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayOccurrences.map((occ) => {
                    const missingAttendance = isAttendanceMissing(occ);
                    const isCompleted = occ.status === 'COMPLETED';
                    return (
                      <div
                        key={occ.id}
                        className={`p-4 rounded-xl border bg-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
                          missingAttendance
                            ? 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/20'
                            : isCompleted
                            ? 'border-emerald-500/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                              missingAttendance
                                ? 'bg-rose-500/15 text-rose-600'
                                : isCompleted
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            <Clock className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-foreground">
                                {occ.template_name || occ.class_name}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  missingAttendance
                                    ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold'
                                    : isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {missingAttendance ? 'ATTENDANCE MISSING' : isCompleted ? 'COMPLETED' : occ.status || 'SCHEDULED'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">
                                {formatTime(occ.start_at || occ.start_time)} - {formatTime(occ.end_at || occ.end_time)}
                              </span>
                              <span>•</span>
                              <span>{occ.branch_name || 'Branch'}</span>
                              <span>•</span>
                              <span>Delivery: <strong className="text-foreground">{occ.delivery_mode || 'OFFLINE'}</strong></span>
                              <span>•</span>
                              <span>Capacity: <strong className="text-foreground">{occ.capacity || 'Standard'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            onClick={() => setSelectedOccurrence(occ)}
                            className={`h-8 text-xs font-semibold gap-1.5 shadow-2xs ${
                              missingAttendance
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            <UserCheck className="size-3.5" />
                            <span>{missingAttendance ? 'Record Missing Attendance' : 'Mark Attendance'}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </PageBody>

      {/* Class Attendance Modal */}
      <ClassAttendanceModal
        occurrence={selectedOccurrence}
        isOpen={!!selectedOccurrence}
        onClose={() => {
          setSelectedOccurrence(null);
          refetchAll();
        }}
      />

      {/* Apply Leave Dialog */}
      <TrainerLeaveApplyDialog
        trainer={selectedTrainer || currentTrainer || null}
        branches={branches}
        isOpen={isLeaveDialogOpen}
        onClose={() => {
          setIsLeaveDialogOpen(false);
          refetchAll();
        }}
      />
    </div>
  );
};
