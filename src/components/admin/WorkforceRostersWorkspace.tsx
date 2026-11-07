/**
 * src/components/admin/WorkforceRostersWorkspace.tsx — Staff Rosters & Workforce Scheduling Workspace (Administration)
 * 
 * Features:
 * - Dedicated Organization Admin & Manager control panel for weekly staff rosters.
 * - Allowlist Model: Days without active scheduled hours are automatically treated as scheduled Week-Offs (never marked absent).
 * - Multi-branch support: Filter by branch or view all branches.
 * - 7-Day Visual Schedule Strip for each staff member / trainer.
 * - 1-Click Roster Configuration modal with quick apply toolbar and branch replication.
 * - Direct access to Leave Approvals with real-time pending request count.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Plus,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Building2,
  Users,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Download,
  LayoutGrid,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { workforceApi } from '@/api/endpoints/workforceApi';
import { approvalsApi } from '@/api/endpoints/approvalsApi';
import type { TrainerProfile, EmployeeWorkSchedule } from '@/types/workforce';
import { TrainerScheduleModal } from '@/components/trainers/TrainerScheduleModal';
import { TrainerLeaveApplyDialog } from '@/components/trainers/TrainerLeaveApplyDialog';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { getWeekInfo, shiftWeek, getMonday, formatToDateStr } from '@/lib/roster-date-utils';

export interface RosterShiftSlot {
  id?: string;
  startTime: string;
  endTime: string;
  isTemporary?: boolean;
  branchId?: string;
  branchName?: string;
}

export function WorkforceRostersWorkspace() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('ALL');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [viewMode, setViewMode] = React.useState<'BRANCH_GROUPED' | 'FLAT'>('BRANCH_GROUPED');
  const [selectedTrainer, setSelectedTrainer] = React.useState<TrainerProfile | null>(null);
  const [targetBranchForModal, setTargetBranchForModal] = React.useState<string | undefined>(undefined);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [isLeaveApplyOpen, setIsLeaveApplyOpen] = React.useState(false);

  // Calendar week state
  const [selectedWeekStart, setSelectedWeekStart] = React.useState<string>(() => {
    return formatToDateStr(getMonday());
  });
  const weekInfo = React.useMemo(() => getWeekInfo(selectedWeekStart), [selectedWeekStart]);

  // Fetch branches (strictly active and operational branches only)
  const { data: branches = [] } = useQuery<{ id: string; name: string; city?: string; status?: string; is_active?: boolean }[]>({
    queryKey: ['admin-branches-for-roster'],
    queryFn: async () => {
      const res = await api.get<any>('/tenant/branches/?status=ACTIVE');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return list.filter((b: any) => b.is_active !== false && String(b.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
    },
  });

  // Fetch all staff / trainers (only operational ACTIVE staff)
  const {
    data: trainers = [],
    isLoading: isLoadingTrainers,
    isFetching: isFetchingTrainers,
    isError,
    error,
    refetch: refetchTrainers,
  } = useQuery({
    queryKey: ['admin-trainers-roster', selectedBranchId, searchQuery],
    queryFn: () =>
      workforceApi.getTrainers({
        search: searchQuery || undefined,
        branch_id: selectedBranchId === 'ALL' ? undefined : selectedBranchId,
        trainer_status: 'ACTIVE',
      }),
  });

  // Fetch work schedules for selected calendar week
  const {
    data: allWorkSchedules = [],
    isLoading: isLoadingSchedules,
    isFetching: isFetchingSchedules,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['admin-work-schedules', selectedBranchId, weekInfo.startDate, weekInfo.endDate],
    queryFn: () =>
      workforceApi.getWorkSchedules(
        undefined,
        selectedBranchId === 'ALL' ? undefined : selectedBranchId,
        { week_start: weekInfo.startDate, week_end: weekInfo.endDate }
      ),
  });

  // Pending Leave Requests count for Admin
  const {
    data: pendingLeaveRequests = [],
    isFetching: isFetchingLeaves,
    refetch: refetchLeaves,
  } = useQuery({
    queryKey: ['admin-pending-leave-approvals'],
    queryFn: () =>
      approvalsApi.getRequests({
        request_type: 'TRAINER_LEAVE_REQUEST',
        status: 'PENDING',
      }),
  });

  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const isRefreshing = isFetchingTrainers || isFetchingSchedules || isFetchingLeaves || isManualRefreshing;

  // Map employee_profile to schedules supporting split shifts & branch partitioning
  // 1. byEmpAndBranch: `${employee_profile}:${branch_id}` -> Record<number, RosterShiftSlot[]>
  // 2. byEmp: `${employee_profile}` -> Record<number, RosterShiftSlot[]>
  const schedulesMap = React.useMemo(() => {
    const byEmpAndBranch = new Map<string, Record<number, RosterShiftSlot[]>>();
    const byEmp = new Map<string, Record<number, RosterShiftSlot[]>>();

    allWorkSchedules.forEach((s) => {
      if (!s.employee_profile || s.status !== 'ACTIVE') return;

      const branchIdStr = s.branch
        ? String(typeof s.branch === 'object' ? (s.branch as any).id : s.branch)
        : '';
      const branchNameStr = s.branch_name || (typeof s.branch === 'object' ? (s.branch as any).name : '');

      const slot: RosterShiftSlot = {
        id: s.id,
        startTime: s.start_time.slice(0, 5),
        endTime: s.end_time.slice(0, 5),
        isTemporary: s.schedule_type === 'TEMPORARY',
        branchId: branchIdStr,
        branchName: branchNameStr,
      };

      // Add to overall employee schedule map
      if (!byEmp.has(s.employee_profile)) {
        byEmp.set(s.employee_profile, {});
      }
      const empDays = byEmp.get(s.employee_profile)!;
      if (!empDays[s.day_of_week]) {
        empDays[s.day_of_week] = [];
      }
      empDays[s.day_of_week].push(slot);

      // Add to branch-specific employee schedule map
      if (branchIdStr) {
        const key = `${s.employee_profile}:${branchIdStr}`;
        if (!byEmpAndBranch.has(key)) {
          byEmpAndBranch.set(key, {});
        }
        const branchDays = byEmpAndBranch.get(key)!;
        if (!branchDays[s.day_of_week]) {
          branchDays[s.day_of_week] = [];
        }
        branchDays[s.day_of_week].push(slot);
      }
    });

    // Sort shift slots by startTime so Shift 1 appears before Shift 2
    const sortSlots = (slotsMap: Map<string, Record<number, RosterShiftSlot[]>>) => {
      slotsMap.forEach((days) => {
        Object.keys(days).forEach((d) => {
          const numDay = Number(d);
          days[numDay].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
      });
    };
    sortSlots(byEmp);
    sortSlots(byEmpAndBranch);

    return { byEmp, byEmpAndBranch };
  }, [allWorkSchedules]);

  const filteredTrainers = React.useMemo(() => {
    return trainers.filter((t) => {
      // Strictly exclude inactive, terminated, or deactivated accounts from staff roster
      const statusUpper = String(t.trainer_status || '').toUpperCase();
      if (statusUpper === 'INACTIVE' || statusUpper === 'TERMINATED' || statusUpper === 'DEACTIVATED') {
        return false;
      }
      if (roleFilter !== 'ALL') {
        const desig = (t.designation || '').toLowerCase();
        if (roleFilter === 'TRAINER' && !desig.includes('trainer') && !desig.includes('coach') && desig) {
          return false;
        }
        if (roleFilter === 'MANAGER' && !desig.includes('manager') && !desig.includes('lead')) {
          return false;
        }
      }
      return true;
    });
  }, [trainers, roleFilter]);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    const start = Date.now();
    try {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['admin-trainers-roster'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-work-schedules'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-pending-leave-approvals'] }),
        refetchTrainers(),
        refetchSchedules(),
        refetchLeaves(),
      ]);
      toast.success('Roster data refreshed.');
    } catch {
      toast.error('Failed to refresh roster data.');
    } finally {
      const elapsed = Date.now() - start;
      setTimeout(() => setIsManualRefreshing(false), Math.max(0, 450 - elapsed));
    }
  };

  const handleExportCsv = () => {
    if (filteredTrainers.length === 0) {
      toast.error('No staff records found to export for the selected week.');
      return;
    }

    const dayHeaders = weekInfo.days.map((d) => `"${d.name.toUpperCase()} (${d.formattedDate})"`);
    const headers = ['"Branch"', '"Staff Name"', '"Staff Code"', '"Role / Designation"', ...dayHeaders, '"Total Shifts"'];

    const rows = filteredTrainers.map((t) => {
      const empId = t.employee_profile || '';
      const sched = schedulesMap.byEmp.get(empId) || {};
      const branchName = (t.branch_names && t.branch_names.length > 0) ? t.branch_names.join('; ') : 'All Branches';
      const staffName = t.trainer_name || t.trainer_code || 'Staff Member';
      const staffCode = t.trainer_code || '';
      const designation = t.designation || 'Trainer';

      let shiftCount = 0;
      const dayValues = weekInfo.days.map((d) => {
        const dayShifts = sched[d.id] || [];
        if (dayShifts.length > 0) {
          shiftCount += dayShifts.length;
          return `"${dayShifts.map((s) => `${s.startTime}-${s.endTime}${s.isTemporary ? ' (Temp)' : ''}`).join(' & ')}"`;
        }
        return '"Week Off"';
      });

      return [
        `"${branchName.replace(/"/g, '""')}"`,
        `"${staffName.replace(/"/g, '""')}"`,
        `"${staffCode.replace(/"/g, '""')}"`,
        `"${designation.replace(/"/g, '""')}"`,
        ...dayValues,
        shiftCount,
      ].join(',');
    });

    const csvData = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Roster_${weekInfo.startDate}_to_${weekInfo.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported roster sheet for ${weekInfo.formattedRange}`);
  };

  // KPI calculations
  const totalStaffCount = filteredTrainers.length;
  const staffWithSchedulesCount = filteredTrainers.filter(
    (t) => t.employee_profile && schedulesMap.byEmp.has(t.employee_profile)
  ).length;
  const totalActiveShifts = allWorkSchedules.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <PageHeader
        title="Staff Rosters & Scheduling"
        subtitle="Configure weekly working shifts, schedule week-offs, and allocate coaches & staff across organization branches."
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 h-9"
              title="Refresh roster data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 transition-transform", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredTrainers.length === 0}
              className="gap-1.5 h-9 border-border shadow-xs text-foreground hover:border-primary/50"
              title="Download weekly roster sheet in CSV / Excel format"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Sheet</span>
            </Button>
            <Link to="/admin/leave-approvals">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 border-border shadow-xs relative"
              >
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Leave Approvals</span>
                {pendingLeaveRequests.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingLeaveRequests.length}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTrainer(filteredTrainers[0] || null);
                setIsScheduleModalOpen(true);
              }}
              disabled={filteredTrainers.length === 0}
              className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Shift Roster</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiTile
            title="Total Registered Staff"
            value={totalStaffCount}
            change="Across Active Branches"
            variant="neutral"
          />
          <KpiTile
            title="Staff With Active Rosters"
            value={staffWithSchedulesCount}
            change={`${totalStaffCount - staffWithSchedulesCount} On Default Week-Off`}
            variant="positive"
          />
          <KpiTile
            title="Total Active Shifts"
            value={totalActiveShifts}
            change="Weekly On-Duty Allocations"
            variant="neutral"
          />
          <KpiTile
            title="Pending Leave Approvals"
            value={pendingLeaveRequests.length}
            change="Requires Admin Action"
            variant={pendingLeaveRequests.length > 0 ? 'warning' : 'neutral'}
          />
        </div>

        {/* Business Rule / Allowlist Policy Banner */}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                Allowlist Roster Architecture Active
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"
                >
                  Admin Controlled
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Any weekday without configured hours is automatically treated as a scheduled{' '}
                <strong>Week-Off</strong> (never marked absent). Absence only registers when a staff member misses attendance for their scheduled classes or bookings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Multi-Branch Synchronization</span>
          </div>
        </div>

        {/* Calendar Week Navigator Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 mb-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Viewing Roster Schedule For:</div>
              <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                {weekInfo.formattedRange}
                {weekInfo.isCurrentWeek ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                    Current Week
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                    Scheduled Week
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekStart((prev) => shiftWeek(prev, -1))}
              className="h-8 px-2.5 text-xs gap-1"
              title="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Week</span>
            </Button>
            {!weekInfo.isCurrentWeek && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedWeekStart(formatToDateStr(getMonday()))}
                className="h-8 px-2.5 text-xs font-semibold"
              >
                This Week
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekStart((prev) => shiftWeek(prev, 1))}
              className="h-8 px-2.5 text-xs gap-1"
              title="Next Week"
            >
              <span className="hidden sm:inline">Next Week</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Input
              type="date"
              value={weekInfo.startDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedWeekStart(formatToDateStr(getMonday(e.target.value)));
                }
              }}
              className="h-8 w-34 text-xs font-mono"
              title="Jump to specific calendar week"
            />
          </div>
        </div>

        {/* Toolbar: Branch, Role, View Mode & Search Filter */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card mb-6 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/40">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Branch:
              </span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-7 rounded border-none bg-transparent px-1 text-xs font-bold focus:outline-none cursor-pointer text-foreground"
              >
                <option value="ALL">All Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/40">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Role:
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-7 rounded border-none bg-transparent px-1 text-xs font-bold focus:outline-none cursor-pointer text-foreground"
              >
                <option value="ALL">All Roles</option>
                <option value="TRAINER">Trainers / Coaches</option>
                <option value="MANAGER">Branch Managers</option>
                <option value="STAFF">Operations Staff</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            {/* View Mode Toggle: Branch-Wise vs Flat List */}
            <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/40">
              <Button
                variant={viewMode === 'BRANCH_GROUPED' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('BRANCH_GROUPED')}
                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
                  viewMode === 'BRANCH_GROUPED'
                    ? 'bg-background shadow-xs text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Group staff roster by branch studio"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Branch-Wise</span>
              </Button>
              <Button
                variant={viewMode === 'FLAT' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('FLAT')}
                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
                  viewMode === 'FLAT'
                    ? 'bg-background shadow-xs text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="View flat roster card list"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                <span>All Staff</span>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              <strong>{filteredTrainers.length}</strong> staff members
            </div>
          </div>
        </div>

        {/* Roster Cards View */}
        {isLoadingTrainers ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Unable to Load Rosters</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {(error as Error)?.message || 'An error occurred while connecting to the backend API.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchTrainers()}>
              Try Again
            </Button>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">No Staff Members Found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {selectedBranchId !== 'ALL' || searchQuery || roleFilter !== 'ALL'
                ? 'No staff match the current branch, role, or search filters. Try selecting "All Branches" or resetting filters.'
                : 'Staff members registered under Administration > Users will automatically appear here for rostering.'}
            </p>
            {(selectedBranchId !== 'ALL' || roleFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBranchId('ALL');
                  setRoleFilter('ALL');
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : viewMode === 'BRANCH_GROUPED' ? (
          /* Branch-Wise Grouped View */
          <div className="space-y-6">
            {branches
              .filter((b) => selectedBranchId === 'ALL' || selectedBranchId === b.id)
              .map((branch) => {
                const branchStaff = filteredTrainers.filter((t) => {
                  if (t.branch_ids && t.branch_ids.length > 0) {
                    return t.branch_ids.includes(branch.id);
                  }
                  // If staff has no specific branch restriction, include in all branches
                  return true;
                });

                if (branchStaff.length === 0 && selectedBranchId === 'ALL') {
                  return null;
                }

                return (
                  <div key={branch.id} className="rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            <span>{branch.name}</span>
                            {branch.city && (
                              <Badge variant="outline" className="text-2xs bg-muted text-muted-foreground">
                                {branch.city}
                              </Badge>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Branch Studio Roster · {weekInfo.formattedRange}
                          </p>
                        </div>
                      </div>

                      <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                        {branchStaff.length} Staff Assigned
                      </Badge>
                    </div>

                    {branchStaff.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                        No staff members assigned to {branch.name} for this filter.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {branchStaff.map((trainer) => {
                          const empBranchKey = `${trainer.employee_profile}:${branch.id}`;
                          const branchSpecificDays = schedulesMap.byEmpAndBranch.get(empBranchKey);
                          const overallDays = schedulesMap.byEmp.get(trainer.employee_profile || '');
                          const activeSchedules = branchSpecificDays || overallDays || {};
                          const activeDaysCount = Object.values(activeSchedules).filter((s) => s && s.length > 0).length;
                          const hasSplit = Object.values(activeSchedules).some((s) => s && s.length > 1);

                          return (
                            <div
                              key={trainer.id}
                              className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                      {(trainer.trainer_name || trainer.trainer_code || 'T')
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2 flex-wrap">
                                        <span>{trainer.trainer_name || 'Staff Member'}</span>
                                        <Badge
                                          variant="outline"
                                          className={
                                            trainer.trainer_status === 'ACTIVE'
                                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]'
                                              : 'bg-muted text-muted-foreground text-[11px]'
                                          }
                                        >
                                          {trainer.trainer_status}
                                        </Badge>
                                        {trainer.branch_ids && trainer.branch_ids.length > 1 && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-primary/10 text-primary border-primary/20"
                                            title={`Active across ${trainer.branch_ids.length} branches: ${trainer.branch_names?.join(', ')}`}
                                          >
                                            Multi-Branch ({trainer.branch_ids.length})
                                          </Badge>
                                        )}
                                        {hasSplit && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20"
                                          >
                                            Split Shifts
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {trainer.trainer_code} • {trainer.designation || 'Staff / Coach'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border/60">
                                      {activeDaysCount > 0 ? `${activeDaysCount} Days Scheduled` : 'Default Week-Off'}
                                    </span>
                                  </div>
                                </div>

                                {/* 7-Day Weekly Schedule Strip */}
                                <div className="grid grid-cols-7 gap-1.5 text-center bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                  {weekInfo.days.map((day) => {
                                    const shifts = activeSchedules[day.id] || [];
                                    const isOnDuty = shifts.length > 0;
                                    const isSplit = shifts.length > 1;

                                    return (
                                      <div
                                        key={day.id}
                                        className={`rounded p-1.5 flex flex-col items-center justify-between text-[11px] transition-colors relative ${
                                          isOnDuty
                                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium'
                                            : 'bg-background/60 border border-border/30 text-muted-foreground'
                                        } ${day.isToday ? 'ring-2 ring-primary/60 ring-offset-1' : ''}`}
                                      >
                                        <span className="font-semibold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1">
                                          <span>{day.name}</span>
                                          <span className={`font-bold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                                            {day.dayOfMonth}
                                          </span>
                                        </span>
                                        {isOnDuty ? (
                                          isSplit ? (
                                            <div className="mt-0.5 leading-tight flex flex-col items-center">
                                              <span className="px-1 py-0.2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded text-[8px] font-bold uppercase tracking-wider mb-0.5">
                                                Split
                                              </span>
                                              <span className="block font-mono text-[9px] font-semibold">{shifts[0].startTime}-{shifts[0].endTime}</span>
                                              <span className="block font-mono text-[9px] font-semibold opacity-80">{shifts[1].startTime}-{shifts[1].endTime}</span>
                                            </div>
                                          ) : (
                                            <div className="mt-1 leading-tight">
                                              <span className="block font-mono text-[10px] font-semibold">{shifts[0].startTime}</span>
                                              <span className="block font-mono text-[9px] opacity-75">{shifts[0].endTime}</span>
                                            </div>
                                          )
                                        ) : (
                                          <span className="mt-2 text-[10px] font-medium opacity-60">Off</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setTargetBranchForModal(branch.id);
                                      setIsScheduleModalOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Manage Roster</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setIsLeaveApplyOpen(true);
                                    }}
                                    className="h-8 px-2.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                                  >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    <span>Apply Leave</span>
                                  </Button>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  Buffer: {trainer.minimum_schedule_buffer_minutes || 15}m
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          /* Flat All-Staff Cards Grid */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTrainers.map((trainer) => {
              const empSchedules = trainer.employee_profile
                ? schedulesMap.byEmp.get(trainer.employee_profile)
                : null;
              const activeDaysCount = empSchedules ? Object.values(empSchedules).filter((s) => s && s.length > 0).length : 0;
              const hasSplit = empSchedules ? Object.values(empSchedules).some((s) => s && s.length > 1) : false;

              return (
                <div
                  key={trainer.id}
                  className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                          {(trainer.trainer_name || trainer.trainer_code || 'T')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2 flex-wrap">
                            <span>{trainer.trainer_name || 'Staff Member'}</span>
                            <Badge
                              variant="outline"
                              className={
                                trainer.trainer_status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]'
                                  : 'bg-muted text-muted-foreground text-[11px]'
                              }
                            >
                              {trainer.trainer_status}
                            </Badge>
                            {trainer.branch_ids && trainer.branch_ids.length > 1 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-primary/10 text-primary border-primary/20"
                                title={`Active across ${trainer.branch_ids.length} branches: ${trainer.branch_names?.join(', ')}`}
                              >
                                Multi-Branch ({trainer.branch_ids.length})
                              </Badge>
                            )}
                            {hasSplit && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20"
                              >
                                Split Shifts
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {trainer.trainer_code} • {trainer.designation || 'Staff'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border/60">
                          {activeDaysCount > 0 ? `${activeDaysCount} Days Scheduled` : 'Default Week-Off'}
                        </span>
                      </div>
                    </div>

                    {/* Branch Locations */}
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">Branches:</span>
                      <span className="truncate">
                        {trainer.branch_names && trainer.branch_names.length > 0
                          ? trainer.branch_names.join(', ')
                          : 'All Branches'}
                      </span>
                    </div>

                    {/* 7-Day Weekly Schedule Strip */}
                    <div className="grid grid-cols-7 gap-1.5 text-center bg-muted/40 p-2.5 rounded-lg border border-border/40">
                      {weekInfo.days.map((day) => {
                        const shifts = empSchedules ? empSchedules[day.id] || [] : [];
                        const isOnDuty = shifts.length > 0;
                        const isSplit = shifts.length > 1;

                        return (
                          <div
                            key={day.id}
                            className={`rounded p-1.5 flex flex-col items-center justify-between text-[11px] transition-colors relative ${
                              isOnDuty
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'bg-background/60 border border-border/30 text-muted-foreground'
                            } ${day.isToday ? 'ring-2 ring-primary/60 ring-offset-1' : ''}`}
                          >
                            <span className="font-semibold text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1">
                              <span>{day.name}</span>
                              <span className={`font-bold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                                {day.dayOfMonth}
                              </span>
                            </span>
                            {isOnDuty ? (
                              isSplit ? (
                                <div className="mt-0.5 leading-tight flex flex-col items-center">
                                  <span className="px-1 py-0.2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded text-[8px] font-bold uppercase tracking-wider mb-0.5">
                                    Split
                                  </span>
                                  <span className="block font-mono text-[9px] font-semibold">{shifts[0].startTime}-{shifts[0].endTime}</span>
                                  <span className="block font-mono text-[9px] font-semibold opacity-80">{shifts[1].startTime}-{shifts[1].endTime}</span>
                                </div>
                              ) : (
                                <div className="mt-1 leading-tight">
                                  <span className="block font-mono text-[10px] font-semibold">{shifts[0].startTime}</span>
                                  <span className="block font-mono text-[9px] opacity-75">{shifts[0].endTime}</span>
                                </div>
                              )
                            ) : (
                              <span className="mt-2 text-[10px] font-medium opacity-60">Off</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedTrainer(trainer);
                          setTargetBranchForModal(trainer.branch_ids?.[0]);
                          setIsScheduleModalOpen(true);
                        }}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Manage Roster</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTrainer(trainer);
                          setIsLeaveApplyOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Apply Leave</span>
                      </Button>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Buffer: {trainer.minimum_schedule_buffer_minutes || 15}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trainer Schedule & Weekly Roster Modal */}
        <TrainerScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setTargetBranchForModal(undefined);
            refetchSchedules();
          }}
          trainer={selectedTrainer || filteredTrainers[0] || null}
          trainers={filteredTrainers}
          onSelectTrainer={(t) => setSelectedTrainer(t)}
          branches={branches}
          initialBranchId={
            targetBranchForModal ||
            (selectedBranchId !== 'ALL'
              ? selectedBranchId
              : selectedTrainer?.branch_ids?.[0] || branches[0]?.id)
          }
          initialWeekStart={selectedWeekStart}
        />

        {/* Trainer Self-Service Leave Application Dialog */}
        <TrainerLeaveApplyDialog
          isOpen={isLeaveApplyOpen}
          onClose={() => setIsLeaveApplyOpen(false)}
          trainer={selectedTrainer}
          branches={branches}
        />
      </PageBody>
    </div>
  );
}
