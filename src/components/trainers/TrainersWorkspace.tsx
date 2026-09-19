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
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts';
import { api } from '@/services/api';
import { workforceApi } from '@/services/workforceApi';
import { fetchUsersApi } from '@/services/api-admin';
import type { TrainerProfile, AvailabilityCheckResult, EligibleTrainer } from '@/types/workforce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function TrainersWorkspace() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const canCreateTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.create') || perms.includes('*');
  }, [user, isAuthLoading]);

  const canEditTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.edit') || perms.includes('*');
  }, [user, isAuthLoading]);

  const canDeleteTrainers = React.useMemo(() => {
    if (isAuthLoading || !user) return false;
    if (user.isSuperAdmin) return true;
    const perms = user.permissions || [];
    return perms.includes('ops.trainers.delete') || perms.includes('*');
  }, [user, isAuthLoading]);

  const requireTrainerPermission = (actionDesc: string, allowed: boolean): boolean => {
    if (!allowed) {
      toast.error(`You do not have permission to ${actionDesc}. Please contact your administrator.`);
      return false;
    }
    return true;
  };

  const [activeTab, setActiveTab] = React.useState<'directory' | 'availability'>('directory');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedTrainer, setSelectedTrainer] = React.useState<TrainerProfile | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = React.useState(false);

  // Register Trainer Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);
  const [registerStaffUserId, setRegisterStaffUserId] = React.useState('');
  const [registerTrainerCode, setRegisterTrainerCode] = React.useState('');
  const [registerExperienceYears, setRegisterExperienceYears] = React.useState('3');
  const [registerBio, setRegisterBio] = React.useState('');
  const [registerScheduleBuffer, setRegisterScheduleBuffer] = React.useState(15);
  const [registerCanTeachAll, setRegisterCanTeachAll] = React.useState(true);
  const [registerLoading, setRegisterLoading] = React.useState(false);

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

  // Fetch Users for Trainer Registration (only when modal is open and permitted)
  const { data: staffUsers = [] } = useQuery({
    queryKey: ['admin-users-for-trainer-registration'],
    queryFn: () => fetchUsersApi(),
    enabled: isRegisterModalOpen && canCreateTrainers,
  });

  // Fetch Real Branches for Slot & Eligibility Evaluation
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

  // Fetch Trainers from Real API
  const {
    data: trainers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trainers', statusFilter, searchQuery],
    queryFn: () =>
      workforceApi.getTrainers({
        trainer_status: statusFilter,
        search: searchQuery || undefined,
      }),
  });

  // Fetch Specialties from Real API
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

  // Handle register trainer submit
  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerStaffUserId) {
      toast.error('Please select a staff member to register.');
      return;
    }
    setRegisterLoading(true);
    try {
      await workforceApi.createTrainer({
        user_id: registerStaffUserId,
        trainer_code: registerTrainerCode.trim() || undefined,
        experience_years: registerExperienceYears ? parseFloat(registerExperienceYears) : undefined,
        bio: registerBio.trim() || undefined,
        minimum_schedule_buffer_minutes: registerScheduleBuffer || 15,
        can_teach_all_specialties: registerCanTeachAll,
      });
      toast.success('Trainer successfully registered!');
      setIsRegisterModalOpen(false);
      setRegisterStaffUserId('');
      setRegisterTrainerCode('');
      setRegisterBio('');
      setRegisterExperienceYears('3');
      refetch();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to register trainer'
      );
    } finally {
      setRegisterLoading(false);
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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Trainers & Workforce</h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Layer 2 Verified
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Data-driven trainer qualifications, recurring work shifts, exceptions, and live scheduling eligibility.
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
            <Button
              size="sm"
              onClick={() => setActiveTab('availability')}
              className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Eligibility Scanner</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!requireTrainerPermission('register trainers', canCreateTrainers)) return;
                setIsRegisterModalOpen(true);
              }}
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Trainer</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs & Filters */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'directory'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Trainer Directory ({trainers.length})
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'availability'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Slot Availability Engine
            </button>
          </div>

          {activeTab === 'directory' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
            ) : trainers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto mt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg">No Trainers Registered</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6">
                  There are no trainer profiles in the active tenant database matching the selected filter.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!requireTrainerPermission('register trainers', canCreateTrainers)) return;
                    setIsRegisterModalOpen(true);
                  }}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Register First Trainer
                </Button>
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsViewModalOpen(true);
                                }}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(trainer)}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                title="Edit Profile"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setIsCheckModalOpen(true);
                                }}
                                className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                title="Check Availability"
                              >
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                Check Slot
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!requireTrainerPermission('delete trainers', canDeleteTrainers)) return;
                                  setSelectedTrainer(trainer);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete Trainer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTrainer(trainer);
                              setIsViewModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(trainer)}
                            className="h-7 px-2 text-xs"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTrainer(trainer);
                              setIsCheckModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs text-primary"
                          >
                            Check
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!requireTrainerPermission('delete trainers', canDeleteTrainers)) return;
                              setSelectedTrainer(trainer);
                              setIsDeleteModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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

            {/* Results Display */}
            {eligibleList !== null && (
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

      {/* Register Trainer Modal */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <span>Register New Trainer</span>
            </DialogTitle>
            <DialogDescription>
              Assign an operational trainer profile to a staff user to enable class scheduling, personal training, and live availability.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterTrainer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Staff Member *</Label>
              <select
                value={registerStaffUserId}
                onChange={(e) => setRegisterStaffUserId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">-- Choose a staff member --</option>
                {staffUsers.map((u) => {
                  const isTrainerRole =
                    u.role?.toUpperCase().includes('TRAINER') ||
                    u.role_name?.toUpperCase().includes('TRAINER');
                  const alreadyRegistered = trainers.some(
                    (t) => t.email?.toLowerCase() === u.email?.toLowerCase()
                  );
                  return (
                    <option key={u.id} value={u.id} disabled={alreadyRegistered}>
                      {u.full_name || u.email} ({u.email})
                      {isTrainerRole ? ' [Trainer Role]' : ''}
                      {alreadyRegistered ? ' [Already Registered]' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Staff members with the "Trainer Role" in Administration &gt; Roles are indicated above.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trainer Code (Optional)</Label>
                <Input
                  placeholder="e.g. TRN-001 (auto if empty)"
                  value={registerTrainerCode}
                  onChange={(e) => setRegisterTrainerCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience (Years)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={registerExperienceYears}
                  onChange={(e) => setRegisterExperienceYears(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Professional Bio &amp; Qualifications</Label>
              <Textarea
                placeholder="e.g. Certified strength and conditioning coach specializing in HIIT and functional movement."
                value={registerBio}
                onChange={(e) => setRegisterBio(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Schedule Buffer (Minutes)</Label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="120"
                  value={registerScheduleBuffer}
                  onChange={(e) => setRegisterScheduleBuffer(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Rest time required between bookings.</p>
              </div>

              <div className="space-y-1.5 flex flex-col justify-center">
                <Label className="text-xs font-semibold">Capabilities</Label>
                <label className="flex items-center gap-2 text-xs mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerCanTeachAll}
                    onChange={(e) => setRegisterCanTeachAll(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Can teach all fitness specialties</span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterModalOpen(false)}
                disabled={registerLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register Trainer</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
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
    </div>
  );
}
