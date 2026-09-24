/**
 * src/components/trainers/TrainersWorkspace.tsx — Layer 2 Production Trainers & Workforce Workspace
 * 100% Real API integration, responsive across Mobile, Tablet, Laptop, Desktop.
 * Zero mock fallback: empty states, skeletons, real live availability engine queries.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserCheck,
  Calendar,
  Clock,
  Award,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
  Sparkles,
  UserPlus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  CalendarDays,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts';
import { api } from '@/services/api';
import { workforceApi } from '@/services/workforceApi';
import { approvalsApi } from '@/services/approvalsApi';
import { fetchUsersApi } from '@/services/api-admin';
import type { TrainerProfile, AvailabilityCheckResult, EligibleTrainer } from '@/types/workforce';
import { TrainerScheduleModal } from './TrainerScheduleModal';
import { TrainerLeaveApplyDialog } from './TrainerLeaveApplyDialog';
import { TrainerLeaveApprovalsModal } from './TrainerLeaveApprovalsModal';
import { TrainerAllottedClassesModal } from './TrainerAllottedClassesModal';
import { TrainerAllottedClassesView } from '../classes/TrainerAllottedClassesView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { isOrganizationAdmin, isTrainerUser } from '@/lib/nav';

export function TrainersWorkspace() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isOrgAdmin = isOrganizationAdmin(user);
  const isTrainerRole = !isOrgAdmin && isTrainerUser(user);

  const canCreateTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin || isOrgAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.create') || perms.includes('*');
  }, [user, isAuthLoading, isOrgAdmin]);

  const canEditTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin || isOrgAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.edit') || perms.includes('*');
  }, [user, isAuthLoading, isOrgAdmin]);

  const canDeleteTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin || isOrgAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.delete') || perms.includes('*');
  }, [user, isAuthLoading, isOrgAdmin]);

  const requireTrainerPermission = (actionDesc: string, allowed: boolean): boolean => {
    if (!allowed) {
      toast.error(`You do not have permission to ${actionDesc}. Please contact your administrator.`);
      return false;
    }
    return true;
  };

  const [activeTab, setActiveTab] = React.useState<'directory' | 'classes' | 'availability'>('directory');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedTrainer, setSelectedTrainer] = React.useState<TrainerProfile | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = React.useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [isLeaveApplyOpen, setIsLeaveApplyOpen] = React.useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = React.useState(false);
  const [isAllottedClassesOpen, setIsAllottedClassesOpen] = React.useState(false);
  const [directoryBranchId, setDirectoryBranchId] = React.useState<string>('ALL');

  // Pending Leave Requests count for Admin badge
  const { data: pendingLeaveRequests = [] } = useQuery({
    queryKey: ['trainer-leave-approvals-count'],
    queryFn: () =>
      approvalsApi.getRequests({
        request_type: 'TRAINER_LEAVE_REQUEST',
        status: 'PENDING',
      }),
  });

  // View Trainer Modal State
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);

  // Edit Trainer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editStatus, setEditStatus] = React.useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editExperienceYears, setEditExperienceYears] = React.useState('3');
  const [editBio, setEditBio] = React.useState('');
  const [editScheduleBuffer, setEditScheduleBuffer] = React.useState(15);
  const [editCanTeachAll, setEditCanTeachAll] = React.useState(true);
  const [editLoading, setEditLoading] = React.useState(false);

  // Delete Trainer Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Fetch Real Branches for Slot & Eligibility Evaluation and Directory Filtering
  const { data: branches = [] } = useQuery<{ id: string; name: string; city?: string }[]>({
    queryKey: ['tenant-branches-for-trainers'],
    queryFn: async () => {
      const res = await api.get<any>('/tenant/branches/');
      return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    },
  });

  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('');

  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Availability Checker State
  const [checkDate, setCheckDate] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [checkTime, setCheckTime] = React.useState('10:00');
  const [checkDuration, setCheckDuration] = React.useState(60);
  const [checkDeliveryMode, setCheckDeliveryMode] = React.useState('GROUP');
  const [checkSpecialty, setCheckSpecialty] = React.useState('');
  const [availabilityResult, setAvailabilityResult] = React.useState<AvailabilityCheckResult | null>(null);
  const [isCheckingSlot, setIsCheckingSlot] = React.useState(false);

  // Eligible Trainers Scanner State
  const [eligibleList, setEligibleList] = React.useState<EligibleTrainer[] | null>(null);
  const [isScanningEligible, setIsScanningEligible] = React.useState(false);

  // Fetch Trainers from Real API (auto-syncs staff with trainer role and filters by branch)
  const {
    data: trainers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trainers', statusFilter, searchQuery, directoryBranchId],
    queryFn: () =>
      workforceApi.getTrainers({
        trainer_status: statusFilter,
        search: searchQuery || undefined,
        branch_id: directoryBranchId === 'ALL' ? undefined : directoryBranchId,
      }),
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

  const isTrainer = !isOrgAdmin && (isTrainerRole || !!currentTrainer);

  // Auto-select current trainer when logged in as a trainer
  React.useEffect(() => {
    if (isTrainer && currentTrainer) {
      if (!selectedTrainer || selectedTrainer.id !== currentTrainer.id) {
        setSelectedTrainer(currentTrainer);
      }
    }
  }, [isTrainer, currentTrainer, selectedTrainer]);
  const { data: specialties = [] } = useQuery({
    queryKey: ['trainer-specialties'],
    queryFn: () => workforceApi.getSpecialties(),
  });

  // Handle slot availability check for selected trainer
  const handleCheckTrainerSlot = async () => {
    if (!selectedTrainer) return;
    setIsCheckingSlot(true);
    setAvailabilityResult(null);
    try {
      const isoStart = `${checkDate}T${checkTime}:00Z`;
      const branchId = selectedBranchId || branches[0]?.id;
      const result = await workforceApi.checkAvailability(selectedTrainer.id, {
        start_datetime: isoStart,
        branch_id: branchId,
        duration_minutes: checkDuration,
        delivery_mode: checkDeliveryMode,
        specialty_code: checkSpecialty || undefined,
      });
      setAvailabilityResult(result);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to evaluate trainer availability');
    } finally {
      setIsCheckingSlot(false);
    }
  };



  // Open Edit Modal with trainer data
  const handleOpenEdit = (trainer: TrainerProfile) => {
    if (!requireTrainerPermission('edit trainers', canEditTrainers)) return;
    setSelectedTrainer(trainer);
    setEditStatus((trainer.trainer_status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setEditExperienceYears(String(trainer.experience_years ?? '0'));
    setEditBio(trainer.bio || '');
    setEditScheduleBuffer(trainer.minimum_schedule_buffer_minutes || 0);
    setEditCanTeachAll(trainer.can_teach_all_specialties ?? false);
    setIsEditModalOpen(true);
  };

  // Handle update trainer submit
  const handleUpdateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    setEditLoading(true);
    try {
      await workforceApi.updateTrainer(selectedTrainer.id, {
        trainer_status: editStatus,
        experience_years: editExperienceYears ? parseFloat(editExperienceYears) : undefined,
        bio: editBio.trim(),
        minimum_schedule_buffer_minutes: editScheduleBuffer,
        can_teach_all_specialties: editCanTeachAll,
      });
      toast.success('Trainer profile updated successfully!');
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to update trainer'
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete trainer submit
  const handleDeleteTrainer = async () => {
    if (!selectedTrainer) return;
    setDeleteLoading(true);
    try {
      await workforceApi.deleteTrainer(selectedTrainer.id);
      toast.success(
        `Trainer "${selectedTrainer.trainer_name || selectedTrainer.trainer_code}" deleted successfully.`
      );
      setIsDeleteModalOpen(false);
      setSelectedTrainer(null);
      refetch();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to delete trainer'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-md px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <UserCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isTrainer ? 'Trainer Operations & Schedule' : 'Trainers & Workforce'}
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                {isTrainer ? 'Trainer Active' : 'Layer 2 Verified'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isTrainer
                ? `Welcome back, ${currentTrainer?.trainer_name || user?.full_name || 'Coach'}. View your operational profile, weekly roster shifts, and allotted workout classes.`
                : 'Data-driven trainer qualifications, recurring work shifts, exceptions, and live scheduling eligibility.'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
              title="Refresh real-time data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {!isTrainer && (
              <>
                <Link to="/admin/rosters">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 border-border shadow-xs text-xs font-semibold"
                    title="Manage all staff rosters in Administration"
                  >
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Staff Rosters</span>
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('availability')}
                  className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Eligibility Scanner</span>
                </Button>
              </>
            )}
            {isTrainer && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentTrainer) setSelectedTrainer(currentTrainer);
                    setIsLeaveApplyOpen(true);
                  }}
                  className="gap-1.5 h-9 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 text-xs font-semibold"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Apply for Leave</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (currentTrainer) setSelectedTrainer(currentTrainer);
                    setIsScheduleModalOpen(true);
                  }}
                  className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs font-semibold"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>My Weekly Roster</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs & Filters */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'directory'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {isTrainer ? 'My Operational Profile' : `Trainer Directory (${trainers.length})`}
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{isTrainer ? 'My Allotted Classes & Attendance' : 'Allotted Classes & Attendance'}</span>
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'availability'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTrainer ? 'Check My Slot Availability' : 'Slot Availability Engine'}</span>
            </button>
          </div>

          {activeTab === 'directory' && !isTrainer && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Branch Filter */}
              <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Branch:</span>
                <select
                  value={directoryBranchId}
                  onChange={(e) => setDirectoryBranchId(e.target.value)}
                  className="h-7 rounded border-none bg-transparent px-1 text-xs font-semibold focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code or bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Directory View */}
        {activeTab === 'directory' && (
          <div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Unable to Load Trainers</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {(error as any)?.response?.data?.error || (error as any)?.response?.data?.detail || (error as Error)?.message || 'An error occurred while connecting to the backend API.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : isTrainer ? (
              /* TRAINER DEDICATED VIEW: Auto-considered profile only, no multi-trainer directory or filters */
              currentTrainer ? (
                <div className="space-y-6">
                  {/* Hero Profile Card */}
                  <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border border-primary/20">
                          {(currentTrainer.trainer_name || currentTrainer.trainer_code || 'T').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                              {currentTrainer.trainer_name || 'Fitness Coach'}
                            </h2>
                            <Badge
                              variant="outline"
                              className={
                                currentTrainer.trainer_status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold'
                                  : 'bg-muted text-muted-foreground text-xs'
                              }
                            >
                              {currentTrainer.trainer_status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{currentTrainer.email || user?.email}</span>
                            <span>•</span>
                            <span className="font-mono text-primary font-semibold">Code: {currentTrainer.trainer_code}</span>
                            {currentTrainer.employee_code && (
                              <>
                                <span>•</span>
                                <span>Emp Code: {currentTrainer.employee_code}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direct Fast Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTrainer(currentTrainer);
                            setIsScheduleModalOpen(true);
                          }}
                          className="gap-1.5 h-9 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>View Roster & Shifts</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab('classes')}
                          className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>View Allotted Classes</span>
                        </Button>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-xs text-muted-foreground font-medium block">Assigned Studios / Branch</span>
                        <div className="font-semibold text-sm text-foreground">
                          {currentTrainer.branch_names && currentTrainer.branch_names.length > 0
                            ? currentTrainer.branch_names.join(', ')
                            : 'All Gym Locations'}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-xs text-muted-foreground font-medium block">Coaching Experience</span>
                        <div className="font-semibold text-sm text-foreground">
                          {currentTrainer.experience_years ? `${currentTrainer.experience_years} Years` : 'Certified Coach'}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-xs text-muted-foreground font-medium block">Schedule Buffer Between Classes</span>
                        <div className="font-semibold text-sm text-foreground">
                          {currentTrainer.minimum_schedule_buffer_minutes || 0} Minutes
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-xs text-muted-foreground font-medium block">Scope of Delivery</span>
                        <div className="font-semibold text-sm text-foreground">
                          {currentTrainer.can_teach_all_specialties ? 'All Modalities & Classes' : 'Assigned Specialties'}
                        </div>
                      </div>
                    </div>

                    {/* Specialties & Certifications */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Qualified Specialties & Formats
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {currentTrainer.specialties && currentTrainer.specialties.length > 0 ? (
                          currentTrainer.specialties.map((sp) => (
                            <Badge
                              key={sp.id}
                              variant="outline"
                              className="px-3 py-1 bg-primary/5 text-primary border-primary/20 text-xs font-semibold gap-1.5"
                            >
                              <Award className="w-3 h-3" />
                              <span>{sp.name}</span>
                              <span className="text-2xs text-muted-foreground font-normal">({sp.proficiency_level})</span>
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="px-3 py-1 text-xs text-muted-foreground">
                            General Fitness & Group Training
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {currentTrainer.bio && (
                      <div className="space-y-1 pt-2 border-t border-border/40">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coach Bio</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{currentTrainer.bio}</p>
                      </div>
                    )}

                    {/* Action Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
                      <div
                        onClick={() => {
                          setSelectedTrainer(currentTrainer);
                          setIsScheduleModalOpen(true);
                        }}
                        className="cursor-pointer p-4 rounded-xl border border-border/80 hover:border-primary/50 bg-card hover:bg-muted/30 transition-all space-y-2 group shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Calendar className="w-4 h-4" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h4 className="font-semibold text-sm">Weekly Work Roster</h4>
                        <p className="text-xs text-muted-foreground">
                          Inspect your weekly shifts, working hours, and active recurring schedule.
                        </p>
                      </div>

                      <div
                        onClick={() => setActiveTab('classes')}
                        className="cursor-pointer p-4 rounded-xl border border-border/80 hover:border-emerald-500/50 bg-card hover:bg-muted/30 transition-all space-y-2 group shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                            <Award className="w-4 h-4" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <h4 className="font-semibold text-sm">Allotted Workout Classes</h4>
                        <p className="text-xs text-muted-foreground">
                          View upcoming scheduled sessions, student rosters, and record attendance.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setSelectedTrainer(currentTrainer);
                          setIsLeaveApplyOpen(true);
                        }}
                        className="cursor-pointer p-4 rounded-xl border border-border/80 hover:border-amber-500/50 bg-card hover:bg-muted/30 transition-all space-y-2 group shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                            <CalendarDays className="w-4 h-4" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                        </div>
                        <h4 className="font-semibold text-sm">Apply for Leave / Absence</h4>
                        <p className="text-xs text-muted-foreground">
                          Submit leave requests or schedule overrides for management review.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto mt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg">Trainer Profile Synchronizing</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4">
                    We are linking your staff credentials ({user?.email}) with your coaching profile.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Refresh Status
                  </Button>
                </div>
              )
            ) : trainers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto mt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg">No Trainers Registered</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-2">
                  {searchQuery || directoryBranchId !== 'ALL' || statusFilter !== 'ALL'
                    ? 'No trainers found matching the current filters. Try changing the branch or search term.'
                    : 'Staff members assigned the Trainer role or designation in Administration > Users automatically appear here.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Data Grid */}
                <div className="hidden md:block rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">Trainer</th>
                        <th className="px-4 py-3.5">Trainer Code</th>
                        <th className="px-4 py-3.5">Assigned Branch</th>
                        <th className="px-4 py-3.5">Experience</th>
                        <th className="px-4 py-3.5">Specialties</th>
                        <th className="px-4 py-3.5">Buffer</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {trainers.map((trainer) => (
                        <tr key={trainer.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                                {(trainer.trainer_name || trainer.trainer_code || 'T').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{trainer.trainer_name || 'Coach'}</div>
                                <div className="text-xs text-muted-foreground">{trainer.email || trainer.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {trainer.trainer_code}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <span className="font-medium text-foreground">
                              {trainer.branch_names && trainer.branch_names.length > 0
                                ? trainer.branch_names.join(', ')
                                : 'All Branches'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {trainer.experience_years ? `${trainer.experience_years} yrs` : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {trainer.can_teach_all_specialties ? (
                                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                                  All Specialties
                                </Badge>
                              ) : trainer.specialties && trainer.specialties.length > 0 ? (
                                trainer.specialties.slice(0, 3).map((spec) => (
                                  <Badge key={spec.id} variant="secondary" className="text-[10px]">
                                    {spec.code} ({spec.proficiency_level.substring(0, 3)})
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                              {trainer.specialties && trainer.specialties.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{trainer.specialties.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {trainer.minimum_schedule_buffer_minutes}m
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={
                                trainer.trainer_status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs'
                                  : 'bg-muted text-muted-foreground border-border text-xs'
                              }
                            >
                              {trainer.trainer_status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsScheduleModalOpen(true);
                                }}
                                className="h-8 px-2.5 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/15 shadow-2xs"
                                title="Configure Weekly Roster & Shifts"
                              >
                                <Calendar className="w-3.5 h-3.5 mr-1 text-primary" />
                                Roster
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsAllottedClassesOpen(true);
                                }}
                                className="h-8 px-2.5 text-xs font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 shadow-2xs"
                                title="View Allotted Classes & Mark Attendance"
                              >
                                <Award className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Classes
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    <span>View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEdit(trainer)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    <span>Edit Profile</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setIsLeaveApplyOpen(true);
                                    }}
                                  >
                                    <CalendarDays className="w-4 h-4 mr-2 text-amber-600" />
                                    <span>Apply Leave</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setIsCheckModalOpen(true);
                                    }}
                                  >
                                    <Clock className="w-4 h-4 mr-2 text-primary" />
                                    <span>Check Slot</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrainer(trainer);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    <span>Delete Trainer</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {trainers.map((trainer) => (
                    <div
                      key={trainer.id}
                      className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                            {(trainer.trainer_name || trainer.trainer_code || 'T').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{trainer.trainer_name || 'Coach'}</div>
                            <div className="text-xs font-mono text-muted-foreground">{trainer.trainer_code}</div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            trainer.trainer_status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs'
                              : 'bg-muted text-muted-foreground text-xs'
                          }
                        >
                          {trainer.trainer_status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">Branch:</span>
                        <span className="text-foreground font-medium">
                          {trainer.branch_names && trainer.branch_names.length > 0
                            ? trainer.branch_names.join(', ')
                            : 'All Branches'}
                        </span>
                      </div>

                      {trainer.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{trainer.bio}</p>
                      )}

                      <div className="flex flex-wrap gap-1 text-xs">
                        {trainer.can_teach_all_specialties ? (
                          <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">
                            All Specialties
                          </Badge>
                        ) : (
                          trainer.specialties?.map((s) => (
                            <Badge key={s.id} variant="secondary" className="text-[10px]">
                              {s.code}
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                        <span>Buffer: {trainer.minimum_schedule_buffer_minutes} min</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTrainer(trainer);
                              setIsScheduleModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs font-medium text-primary border-primary/30"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Roster
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTrainer(trainer);
                              setIsAllottedClassesOpen(true);
                            }}
                            className="h-7 px-2 text-xs font-medium text-emerald-600 border-emerald-500/30"
                          >
                            <Award className="w-3 h-3 mr-1" />
                            Classes
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsViewModalOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                <span>View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(trainer)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                <span>Edit Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsLeaveApplyOpen(true);
                                }}
                              >
                                <CalendarDays className="w-4 h-4 mr-2 text-amber-600" />
                                <span>Apply Leave</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsCheckModalOpen(true);
                                }}
                              >
                                <Clock className="w-4 h-4 mr-2 text-primary" />
                                <span>Check Slot</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                <span>Delete Trainer</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Allotted Classes & Attendance View */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <TrainerAllottedClassesView
              trainerId={isTrainer && currentTrainer ? currentTrainer.id : undefined}
              trainerName={isTrainer && currentTrainer ? (currentTrainer.trainer_name || currentTrainer.trainer_code) : undefined}
              onApplyLeave={() => {
                if (currentTrainer) setSelectedTrainer(currentTrainer);
                setIsLeaveApplyOpen(true);
              }}
            />
          </div>
        )}

        {/* Live Slot Eligibility Engine View */}
        {activeTab === 'availability' && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-border/50 pb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Live Slot Eligibility & Conflict Engine
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Query active shifts, holiday exceptions, and specialty certifications across your coaching roster.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Studio Branch *</Label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Session Date</Label>
                <Input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Time</Label>
                <Input
                  type="time"
                  value={checkTime}
                  onChange={(e) => setCheckTime(e.target.value)}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Duration (Minutes)</Label>
                <Input
                  type="number"
                  value={checkDuration}
                  onChange={(e) => setCheckDuration(Number(e.target.value))}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Delivery Mode</Label>
                <select
                  value={checkDeliveryMode}
                  onChange={(e) => setCheckDeliveryMode(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm focus:ring-1 focus:ring-primary"
                >
                  <option value="GROUP">Group Class</option>
                  <option value="INDIVIDUAL">1-on-1 PT Session</option>
                  <option value="ONLINE">Online Virtual</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Specialty Required (Optional)</Label>
              <Input
                placeholder="e.g. HIIT, YOGA, PILATES"
                value={checkSpecialty}
                onChange={(e) => setCheckSpecialty(e.target.value)}
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            {isTrainer ? (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-10 shadow-sm"
                disabled={isCheckingSlot}
                onClick={async () => {
                  if (currentTrainer) {
                    setSelectedTrainer(currentTrainer);
                    await handleCheckTrainerSlot();
                  }
                }}
              >
                {isCheckingSlot ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating My Schedule...
                  </>
                ) : (
                  'Check My Slot Availability'
                )}
              </Button>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-10 shadow-sm"
                disabled={isScanningEligible}
                onClick={async () => {
                  setIsScanningEligible(true);
                  setEligibleList(null);
                  try {
                    const isoStart = `${checkDate}T${checkTime}:00Z`;
                    const branchId = selectedBranchId || branches[0]?.id;
                    const res = await workforceApi.findEligibleTrainers({
                      start_datetime: isoStart,
                      branch_id: branchId,
                      duration_minutes: checkDuration,
                      delivery_mode: checkDeliveryMode,
                      specialty_code: checkSpecialty || undefined,
                    });
                    setEligibleList(res);
                    if (res.length === 0) {
                      toast.info('No trainers are available during this slot based on work schedules and exceptions.');
                    } else {
                      toast.success(`Found ${res.length} available and qualified trainer(s)!`);
                    }
                  } catch (err: any) {
                    toast.error(err?.message || 'Failed to scan eligible trainers');
                  } finally {
                    setIsScanningEligible(false);
                  }
                }}
              >
                {isScanningEligible ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scanning Rosters...
                  </>
                ) : (
                  'Scan Available & Qualified Trainers'
                )}
              </Button>
            )}

            {/* Results Display */}
            {isTrainer && availabilityResult && (
              <div
                className={`p-4 rounded-xl border text-sm ${
                  availabilityResult.is_available
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-base">
                  {availabilityResult.is_available ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  {availabilityResult.is_available ? 'You are Available' : 'Schedule Conflict or Unavailable'}
                </div>
                <p className="mt-1 text-foreground/80 text-xs sm:text-sm">{availabilityResult.reason}</p>
              </div>
            )}

            {!isTrainer && eligibleList !== null && (
              <div className="border-t border-border/60 pt-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Trainers ({eligibleList.length})
                </div>
                {eligibleList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs sm:text-sm">
                    No coaches matched the criteria. Check if trainers have active shifts for this weekday or if they are on leave.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eligibleList.map((t) => (
                      <div
                        key={t.trainer_id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{t.full_name || t.trainer_code}</div>
                            <div className="text-xs text-muted-foreground">{t.email || t.trainer_code}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          Available
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Trainer Slot Check Modal */}
      <Dialog open={isCheckModalOpen} onOpenChange={setIsCheckModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check Trainer Availability</DialogTitle>
            <DialogDescription>
              Evaluate availability for {selectedTrainer?.trainer_name || selectedTrainer?.trainer_code} against
              their working schedule and leave exceptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={checkTime}
                  onChange={(e) => setCheckTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Studio Branch</Label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Mode</Label>
              <select
                value={checkDeliveryMode}
                onChange={(e) => setCheckDeliveryMode(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="GROUP">Group Class</option>
                <option value="INDIVIDUAL">1-on-1 PT Session</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>

            {availabilityResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  availabilityResult.is_available
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {availabilityResult.is_available ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {availabilityResult.is_available ? 'Trainer Available' : 'Trainer Unavailable'}
                </div>
                <p className="mt-1 text-foreground/80">{availabilityResult.reason}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsCheckModalOpen(false)}>
              Close
            </Button>
            <Button size="sm" disabled={isCheckingSlot} onClick={handleCheckTrainerSlot}>
              {isCheckingSlot ? 'Checking...' : 'Check Availability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* View Trainer Profile Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <span>Trainer Profile Details</span>
            </DialogTitle>
            <DialogDescription>
              Operational profile, scheduling parameters, and qualification summary.
            </DialogDescription>
          </DialogHeader>

          {selectedTrainer && (
            <div className="space-y-4 py-2 text-sm">
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60">
                <div className="w-13 h-13 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-base shrink-0">
                  {(selectedTrainer.trainer_name || selectedTrainer.trainer_code || 'T').substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base leading-none">
                      {selectedTrainer.trainer_name || 'Fitness Trainer'}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        selectedTrainer.trainer_status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs'
                          : 'bg-muted text-muted-foreground text-xs'
                      }
                    >
                      {selectedTrainer.trainer_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedTrainer.email || 'No email attached'}
                  </p>
                  <p className="text-xs font-mono text-primary font-semibold">
                    Code: {selectedTrainer.trainer_code}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-card">
                  <span className="text-xs text-muted-foreground block">Experience</span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedTrainer.experience_years
                      ? `${selectedTrainer.experience_years} Years`
                      : 'Not specified'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-card">
                  <span className="text-xs text-muted-foreground block">Session Buffer</span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedTrainer.minimum_schedule_buffer_minutes ?? 0} Minutes
                  </span>
                </div>
              </div>

              {selectedTrainer.bio && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Professional Bio &amp; Background
                  </Label>
                  <p className="text-xs leading-relaxed p-3 rounded-lg bg-muted/20 border border-border/40 text-foreground">
                    {selectedTrainer.bio}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Specialties &amp; Capabilities
                </Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTrainer.can_teach_all_specialties ? (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 font-medium">
                      All Fitness Specialties Permitted
                    </Badge>
                  ) : selectedTrainer.specialties && selectedTrainer.specialties.length > 0 ? (
                    selectedTrainer.specialties.map((s) => (
                      <Badge key={s.id} variant="secondary">
                        {s.name || s.code}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No specific specialties mapped.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex justify-between sm:justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsViewModalOpen(false);
                if (selectedTrainer) handleOpenEdit(selectedTrainer);
              }}
              className="gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
            <Button size="sm" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trainer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              <span>Edit Trainer Profile</span>
            </DialogTitle>
            <DialogDescription>
              Update operational parameters, experience, status, and buffer for{' '}
              {selectedTrainer?.trainer_name || selectedTrainer?.trainer_code}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTrainer} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trainer Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience (Years)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={editExperienceYears}
                  onChange={(e) => setEditExperienceYears(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Schedule Buffer (Minutes)</Label>
              <Input
                type="number"
                step="5"
                min="0"
                max="120"
                value={editScheduleBuffer}
                onChange={(e) => setEditScheduleBuffer(parseInt(e.target.value) || 0)}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Required rest minutes before/after bookings.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Professional Bio &amp; Qualifications</Label>
              <Textarea
                placeholder="Trainer background and credentials..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Capabilities</Label>
              <label className="flex items-center gap-2 text-xs mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCanTeachAll}
                  onChange={(e) => setEditCanTeachAll(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Can teach all fitness specialties</span>
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              <span>Delete Trainer Profile</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete trainer profile for{' '}
              <strong>{selectedTrainer?.trainer_name || selectedTrainer?.trainer_code}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1.5">
            <p className="font-semibold">
              Warning: This action permanently removes the trainer profile from the operational directory.
            </p>
            <p className="text-destructive/80">
              Note: The underlying staff account will remain in Administration &gt; Users. Only the operational trainer profile is removed.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTrainer}
              disabled={deleteLoading}
              className="gap-1.5"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete Trainer</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trainer Schedule & Weekly Roster Modal */}
      <TrainerScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        trainer={isTrainer ? (currentTrainer || selectedTrainer) : (selectedTrainer || trainers[0] || null)}
        trainers={isTrainer && currentTrainer ? [currentTrainer] : trainers}
        onSelectTrainer={(t) => setSelectedTrainer(t)}
        branches={branches}
        initialBranchId={
          directoryBranchId !== 'ALL'
            ? directoryBranchId
            : selectedTrainer?.branch_ids?.[0] || currentTrainer?.branch_ids?.[0] || branches[0]?.id
        }
      />

      {/* Trainer Self-Service Leave Application Dialog */}
      <TrainerLeaveApplyDialog
        isOpen={isLeaveApplyOpen}
        onClose={() => setIsLeaveApplyOpen(false)}
        trainer={isTrainer ? (currentTrainer || selectedTrainer) : selectedTrainer}
        branches={branches}
      />

      {/* Admin Leave & Override Approvals Modal */}
      <TrainerLeaveApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
      />

      {/* Trainer Allotted Classes & Attendance Modal */}
      <TrainerAllottedClassesModal
        trainer={isTrainer ? (currentTrainer || selectedTrainer) : selectedTrainer}
        isOpen={isAllottedClassesOpen}
        onClose={() => setIsAllottedClassesOpen(false)}
        onApplyLeave={() => {
          setIsAllottedClassesOpen(false);
          setIsLeaveApplyOpen(true);
        }}
      />
    </div>
  );
}
