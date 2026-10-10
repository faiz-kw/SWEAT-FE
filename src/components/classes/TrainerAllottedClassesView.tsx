import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  CalendarDays,
  Search,
  Filter,
  RefreshCw,
  Award,
  Video,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { classesApi } from '@/api/endpoints/classesApi';
import { workforceApi } from '@/api/endpoints/workforceApi';
import { ClassOccurrence } from '../../types/classes';
import { ClassAttendanceModal } from './ClassAttendanceModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/api/auth/AuthProvider';
import { isOrganizationAdmin, isTrainerUser } from '@/lib/nav';

interface TrainerAllottedClassesViewProps {
  trainerId?: string; // Pre-selected trainer ID
  trainerName?: string;
  isEmbedded?: boolean; // When rendered inside modal or tab
  onApplyLeave?: () => void;
}

export const TrainerAllottedClassesView: React.FC<TrainerAllottedClassesViewProps> = ({
  trainerId: initialTrainerId,
  trainerName: initialTrainerName,
  isEmbedded = false,
  onApplyLeave,
}) => {
  const { user } = useAuth();
  const isOrgAdmin = isOrganizationAdmin(user);

  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(initialTrainerId || '');
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'week' | 'all' | 'custom'>('week');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [attendanceOccurrence, setAttendanceOccurrence] = useState<ClassOccurrence | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setPage(1);
  }, [selectedTrainerId, dateRangeFilter, customFromDate, customToDate, selectedBranchId, debouncedSearch, pageSize]);

  // Fetch trainers list if not locked to one trainer
  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers-for-allotted-classes'],
    queryFn: () => workforceApi.getTrainers({ trainer_status: 'ACTIVE' }),
    enabled: !initialTrainerId,
  });

  // Auto-detect trainer profile belonging to logged in user
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

  // Auto-select trainer: if trainer login, strictly lock to self; otherwise select first available
  React.useEffect(() => {
    if (!initialTrainerId) {
      if (isTrainer && currentTrainer) {
        if (selectedTrainerId !== currentTrainer.id) {
          setSelectedTrainerId(currentTrainer.id);
        }
      } else if (!selectedTrainerId && trainers.length > 0) {
        setSelectedTrainerId(trainers[0].id);
      }
    }
  }, [currentTrainer, initialTrainerId, isTrainer, selectedTrainerId, trainers]);

  // Determine effective dates for query
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const weekEndStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const effectiveFromDate =
    dateRangeFilter === 'today'
      ? todayStr
      : dateRangeFilter === 'week'
      ? todayStr
      : dateRangeFilter === 'custom'
      ? customFromDate || undefined
      : undefined;
  const effectiveToDate =
    dateRangeFilter === 'today'
      ? todayStr
      : dateRangeFilter === 'week'
      ? weekEndStr
      : dateRangeFilter === 'custom'
      ? customToDate || customFromDate || undefined
      : undefined;

  // Fetch allotted class occurrences for this trainer (paginated)
  const {
    data: occurrencesPage,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [
      'trainer-allotted-occurrences',
      selectedTrainerId,
      dateRangeFilter,
      customFromDate,
      customToDate,
      selectedBranchId,
      debouncedSearch,
      page,
      pageSize,
    ],
    queryFn: () =>
      classesApi.getOccurrencesPaginated({
        trainer_id: selectedTrainerId && selectedTrainerId !== 'ALL' ? selectedTrainerId : undefined,
        branch_id: selectedBranchId === 'ALL' ? undefined : selectedBranchId,
        from_date: effectiveFromDate,
        to_date: effectiveToDate,
        search: debouncedSearch || undefined,
        page,
        page_size: pageSize,
      }),
    enabled: !!selectedTrainerId || !initialTrainerId,
  });

  const occurrences = occurrencesPage?.results || [];
  const totalOccurrences = occurrencesPage?.count ?? occurrences.length;
  const totalPages = occurrencesPage?.total_pages || Math.max(1, Math.ceil(totalOccurrences / pageSize));

  const activeTrainer = trainers.find((t) => t.id === selectedTrainerId);
  const displayName = initialTrainerName || (selectedTrainerId === 'ALL' ? 'All Trainers' : (activeTrainer?.trainer_name || activeTrainer?.trainer_code || 'Trainer'));

  const filteredOccurrences = occurrences;

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr.slice(0, 5);
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

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
          {/* Trainer Selector: Only shown to Org Admins/Managers. Auto-locked with zero dropdown for Trainers. */}
          {!initialTrainerId && !isTrainer && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Trainer:</span>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px]"
              >
                <option value="ALL">All Trainers</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trainer_name || t.trainer_code} ({t.trainer_code})
                  </option>
                ))}
              </select>
            </div>
          )}
          {!initialTrainerId && isTrainer && currentTrainer && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Trainer:</span>
              <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold bg-primary/10 text-primary border-primary/20">
                {currentTrainer.trainer_name || currentTrainer.trainer_code} ({currentTrainer.trainer_code})
              </Badge>
            </div>
          )}

          {/* Date Filter Tabs */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setDateRangeFilter('today')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                dateRangeFilter === 'today' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRangeFilter('week')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                dateRangeFilter === 'week' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upcoming 7 Days
            </button>
            <button
              onClick={() => setDateRangeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                dateRangeFilter === 'all' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Schedule
            </button>
            <button
              onClick={() => setDateRangeFilter('custom')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                dateRangeFilter === 'custom' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Custom Date
            </button>
          </div>

          {dateRangeFilter === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="h-8 text-xs w-[135px] bg-background"
                title="From Date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="h-8 text-xs w-[135px] bg-background"
                title="To Date"
              />
            </div>
          )}

          {/* Search Box */}
          <div className="relative min-w-[160px] flex-1 max-w-xs">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter class or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table / List View"
            >
              <LayoutList className="size-3.5" />
            </button>
          </div>

          {onApplyLeave && (
            <Button variant="outline" size="sm" onClick={onApplyLeave} className="h-8 text-xs gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
              <CalendarDays className="size-3.5" />
              <span>Apply Leave</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 px-2.5 text-xs"
            title="Refresh Allotted Classes"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Classes List */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-xl">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
          Loading allotted classes for {displayName}...
        </div>
      ) : filteredOccurrences.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-dashed border-border bg-card shadow-2xs">
          <Award className="size-10 text-muted-foreground/40 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-foreground">No Allotted Classes Found</h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            There are no classes currently assigned to {displayName} for the selected date range.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE / LIST VIEW */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 font-bold text-foreground">
                  <th className="py-3 px-4">Class Session</th>
                  <th className="py-3 px-4">Class Type</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Trainer Check-in</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Waitlist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOccurrences.map((occ) => {
                  const isCompleted = occ.status === 'COMPLETED';
                  const isCancelled = occ.status === 'CANCELLED';
                  const isCheckedIn = Boolean(occ.trainer_checked_in || occ.trainer_check_in_details?.checked_in);
                  const bookedCount = occ.booking_count ?? 0;
                  const waitlistCount = occ.waitlist_count ?? 0;
                  const isFull = occ.status === 'FULL' || bookedCount >= occ.capacity;
                  const catToken = `${occ.category_code || ''} ${occ.category_name || ''}`.toUpperCase();
                  const catBadgeClass = catToken.includes('BOOTCAMP')
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold'
                    : catToken.includes('PILATES')
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 font-bold'
                    : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold';

                  return (
                    <tr key={occ.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">{occ.template_name || occ.class_name || 'Class Session'}</div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 font-medium bg-primary/5 text-primary border-primary/20">
                          {occ.delivery_mode || 'OFFLINE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {occ.category_name ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${catBadgeClass}`}>
                              {occ.category_name}
                            </Badge>
                            {occ.program_name && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {occ.program_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground text-xs">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>{occ.branch_name || 'Branch'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground text-xs flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground shrink-0" />
                          {occ.occurrence_date}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="size-2.5 shrink-0" />
                          {formatTime(occ.start_at || occ.start_time)} - {formatTime(occ.end_at || occ.end_time)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCheckedIn ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-bold gap-1 px-2 py-0.5 inline-flex items-center">
                            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                            <span>Checked In</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-semibold gap-1 px-2 py-0.5 inline-flex items-center">
                            <Clock className="size-3 text-amber-500 shrink-0" />
                            <span>Pending Check-in</span>
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className={`text-xs font-bold px-2 py-0.5 ${isFull ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          {isFull ? `FULL (${bookedCount}/${occ.capacity})` : `${bookedCount} / ${occ.capacity} Booked`}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {waitlistCount > 0 ? (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-bold gap-1 px-2 py-0.5 inline-flex items-center">
                            <Users className="size-2.5 shrink-0" />
                            <span>{waitlistCount} Waitlist</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0 Waitlist</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : isCancelled ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          {occ.status || 'SCHEDULED'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => setAttendanceOccurrence(occ)}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <UserCheck className="size-3" />
                          <span>Class Attendance</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOccurrences.map((occ) => {
            const isCompleted = occ.status === 'COMPLETED';
            const isCancelled = occ.status === 'CANCELLED';
            const missingAttendance = isAttendanceMissing(occ);
            const isCheckedIn = Boolean(occ.trainer_checked_in || occ.trainer_check_in_details?.checked_in);
            const bookedCount = occ.booking_count ?? 0;
            const waitlistCount = occ.waitlist_count ?? 0;
            const catToken = `${occ.category_code || ''} ${occ.category_name || ''}`.toUpperCase();
            const catBadgeClass = catToken.includes('BOOTCAMP')
              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold'
              : catToken.includes('PILATES')
              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 font-bold'
              : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold';

            return (
              <div
                key={occ.id}
                className={`p-4 rounded-xl border bg-card transition-all flex flex-col justify-between hover:border-primary/50 shadow-2xs ${
                  missingAttendance
                    ? 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/20'
                    : isCancelled
                    ? 'opacity-65 border-rose-500/20'
                    : isCompleted
                    ? 'border-emerald-500/20'
                    : 'border-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {occ.category_name && (
                        <div className="mb-1">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${catBadgeClass}`}>
                            {occ.category_name}
                          </Badge>
                        </div>
                      )}
                      <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                        <span>{occ.template_name || occ.class_name || 'Class Session'}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span>{occ.branch_name || 'Branch'}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`text-2xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : isCancelled
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : missingAttendance
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {occ.status || 'SCHEDULED'}
                      </Badge>
                      {missingAttendance && (
                        <Badge
                          variant="outline"
                          className="text-3xs font-bold bg-rose-500/15 text-rose-600 border-rose-500/30 flex items-center gap-1"
                        >
                          <AlertCircle className="size-2.5" />
                          <span>Attendance Missing</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-primary" />
                        <span className="font-semibold text-foreground">{occ.occurrence_date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" />
                        <span className="font-semibold text-foreground">
                          {formatTime(occ.start_at || occ.start_time)} - {formatTime(occ.end_at || occ.end_time)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs pt-1 border-t border-border/40 text-muted-foreground">
                      <span>Delivery: <strong className="text-foreground uppercase">{occ.delivery_mode || 'OFFLINE'}</strong></span>
                      <span>Bookings: <strong className="text-foreground">{bookedCount} / {occ.capacity || 'Standard'}</strong></span>
                    </div>
                    <div className="flex items-center justify-between text-2xs pt-1 border-t border-border/40 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Check-in:
                        {isCheckedIn ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="size-2.5" /> Checked In
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
                            <Clock className="size-2.5" /> Pending
                          </span>
                        )}
                      </span>
                      {waitlistCount > 0 ? (
                        <Badge variant="outline" className="text-3xs font-semibold bg-purple-500/15 text-purple-600 border-purple-500/30">
                          {waitlistCount} Waitlist
                        </Badge>
                      ) : (
                        <span>0 Waitlist</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between gap-2">
                  <div className="text-2xs text-muted-foreground">
                    Role: <span className="font-semibold text-foreground">Lead Trainer</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setAttendanceOccurrence(occ)}
                    className={`h-8 text-xs font-semibold gap-1.5 shadow-2xs ${
                      missingAttendance
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <UserCheck className="size-3.5" />
                    <span>{missingAttendance ? 'Record Missing Attendance' : 'Class Attendance'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {!isLoading && filteredOccurrences.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-semibold text-foreground">
                {totalOccurrences === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>
              –
              <span className="font-semibold text-foreground">
                {Math.min(page * pageSize, totalOccurrences)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{totalOccurrences}</span> sessions
            </span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[9, 18, 36, 72].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} / page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-8 min-w-[32px] px-2 rounded-md text-xs font-semibold transition-colors ${
                      page === pageNum
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Attendance Modal Sheet */}
      <ClassAttendanceModal
        occurrence={attendanceOccurrence}
        isOpen={!!attendanceOccurrence}
        onClose={() => setAttendanceOccurrence(null)}
      />
    </div>
  );
};
