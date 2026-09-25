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
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'week' | 'all'>('week');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceOccurrence, setAttendanceOccurrence] = useState<ClassOccurrence | null>(null);

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

  const effectiveFromDate = dateRangeFilter === 'today' ? todayStr : dateRangeFilter === 'week' ? todayStr : undefined;
  const effectiveToDate = dateRangeFilter === 'today' ? todayStr : dateRangeFilter === 'week' ? weekEndStr : undefined;

  // Fetch allotted class occurrences for this trainer
  const {
    data: occurrences = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['trainer-allotted-occurrences', selectedTrainerId, dateRangeFilter, selectedBranchId],
    queryFn: () =>
      classesApi.getOccurrences({
        trainer_id: selectedTrainerId && selectedTrainerId !== 'ALL' ? selectedTrainerId : undefined,
        branch_id: selectedBranchId === 'ALL' ? undefined : selectedBranchId,
        from_date: effectiveFromDate,
        to_date: effectiveToDate,
      }),
    enabled: !!selectedTrainerId || !initialTrainerId,
  });

  const activeTrainer = trainers.find((t) => t.id === selectedTrainerId);
  const displayName = initialTrainerName || (selectedTrainerId === 'ALL' ? 'All Trainers' : (activeTrainer?.trainer_name || activeTrainer?.trainer_code || 'Trainer'));

  const filteredOccurrences = occurrences.filter((occ) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const title = (occ.template_name || occ.class_name || '').toLowerCase();
    const branch = (occ.branch_name || '').toLowerCase();
    return title.includes(term) || branch.includes(term);
  });

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
          </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOccurrences.map((occ) => {
            const isCompleted = occ.status === 'COMPLETED';
            const isCancelled = occ.status === 'CANCELLED';
            const missingAttendance = isAttendanceMissing(occ);

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
                      <span>Max Capacity: <strong className="text-foreground">{occ.capacity || 'Standard'}</strong></span>
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

      {/* Attendance Modal Sheet */}
      <ClassAttendanceModal
        occurrence={attendanceOccurrence}
        isOpen={!!attendanceOccurrence}
        onClose={() => setAttendanceOccurrence(null)}
      />
    </div>
  );
};
