import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  UserPlus,
  Trash2,
  Award,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence, TrainerOccurrenceRole } from '../../types/classes';
import { formatOccurrenceDate, formatTime12h } from '@/utils/dateTimeUtils';
import { toast } from 'sonner';

interface AssignTrainerModalProps {
  occurrence: ClassOccurrence | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: TrainerOccurrenceRole; label: string; description: string }[] = [
  { value: 'LEAD', label: 'Lead Trainer', description: 'Primary session instructor and coordinator' },
  { value: 'ASSISTANT', label: 'Assistant Trainer', description: 'Co-trainer assisting with stations and form correction' },
  { value: 'SUBSTITUTE', label: 'Substitute Trainer', description: 'Covering for regular trainer' },
];

export const AssignTrainerModal: React.FC<AssignTrainerModalProps> = ({
  occurrence,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<TrainerOccurrenceRole>('LEAD');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch live single occurrence to ensure real-time multi-trainer sync
  const {
    data: liveOccurrence,
    isLoading: isLoadingOccurrence,
    refetch: refetchOccurrence,
  } = useQuery({
    queryKey: ['class-occurrence-detail', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getOccurrence(occurrence.id) : null),
    enabled: isOpen && !!occurrence?.id,
  });

  // Fetch available trainers
  const { data: trainers = [], isLoading: isLoadingTrainers } = useQuery({
    queryKey: ['tenant-trainers'],
    queryFn: () => classesApi.getTrainers(),
    enabled: isOpen,
  });

  // Fetch dynamic trainer roles metadata from tenant backend
  const { data: metadata } = useQuery({
    queryKey: ['classes-metadata'],
    queryFn: () => classesApi.getClassesMetadata(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 15,
  });

  const availableRoles = (metadata?.trainer_roles && metadata.trainer_roles.length > 0)
    ? metadata.trainer_roles.map((r: any) => ({
        value: r.value as TrainerOccurrenceRole,
        label: r.label,
        description: r.label,
      }))
    : ROLE_OPTIONS;

  // Current active occurrence
  const currentOcc = liveOccurrence || occurrence;
  const assignedTrainers = currentOcc?.trainers || currentOcc?.assigned_trainers || [];

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ trainerId, role }: { trainerId: string; role: TrainerOccurrenceRole }) => {
      if (!currentOcc?.id) throw new Error('No class occurrence selected');
      return classesApi.assignTrainer(currentOcc.id, trainerId, role);
    },
    onSuccess: (data: any) => {
      setErrorMsg(null);
      setSelectedTrainerId('');
      toast.success(
        data?.trainer_name
          ? `Assigned ${data.trainer_name} (${data.trainer_role || selectedRole}) successfully!`
          : 'Trainer assigned successfully!'
      );
      // Invalidate relevant queries for instant synchronization
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-detail', currentOcc?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-today'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      refetchOccurrence();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to assign trainer';
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  // Unassign mutation
  const unassignMutation = useMutation({
    mutationFn: async ({ assignmentId, trainerProfileId }: { assignmentId?: string; trainerProfileId?: string }) => {
      if (!currentOcc?.id) throw new Error('No class occurrence selected');
      return classesApi.unassignTrainer(currentOcc.id, trainerProfileId, assignmentId);
    },
    onSuccess: () => {
      setErrorMsg(null);
      setRemovingId(null);
      toast.success('Trainer removed from session successfully.');
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-detail', currentOcc?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-today'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      refetchOccurrence();
      onSuccess?.();
    },
    onError: (err: any) => {
      setRemovingId(null);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to remove trainer';
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleAssign = () => {
    if (!selectedTrainerId) {
      setErrorMsg('Please select a trainer profile.');
      return;
    }
    setErrorMsg(null);
    assignMutation.mutate({ trainerId: selectedTrainerId, role: selectedRole });
  };

  const handleRemove = (assignmentId?: string, trainerProfileId?: string) => {
    const targetKey = assignmentId || trainerProfileId || '';
    setRemovingId(targetKey);
    unassignMutation.mutate({ assignmentId, trainerProfileId });
  };

  // Helper to get formatted start & end times
  const formattedTime = currentOcc?.start_time
    ? `${formatTime12h(currentOcc.start_time)} - ${currentOcc.end_time ? formatTime12h(currentOcc.end_time) : ''}`
    : currentOcc?.start_at
    ? `${formatTime12h(currentOcc.start_at)} - ${currentOcc.end_at ? formatTime12h(currentOcc.end_at) : ''}`
    : '';

  // Get set of currently assigned trainer IDs
  const assignedTrainerIds = new Set(
    assignedTrainers.map((t: any) => t.trainer_profile || t.trainer_profile_id || t.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border border-border shadow-2xl rounded-2xl bg-card">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Session Trainer Assignments
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Assign single or multiple qualified trainers (Lead, Assistant, Substitute) to this session.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Session Summary Card */}
          {currentOcc && (
            <div className="mt-4 p-3 bg-muted/40 rounded-xl border border-border/70 text-xs grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Class</span>
                <span className="font-semibold text-foreground truncate block">
                  {currentOcc.template_name || currentOcc.class_name || 'Class Session'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Date & Time</span>
                <span className="font-semibold text-foreground block">
                  {currentOcc.occurrence_date ? formatOccurrenceDate(currentOcc.occurrence_date) : ''}
                  {formattedTime ? ` • ${formattedTime}` : ''}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Branch</span>
                <span className="font-semibold text-foreground truncate block">
                  {currentOcc.branch_name || 'Studio Branch'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* SECTION 1: Currently Assigned Trainers */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Award className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Trainers ({assignedTrainers.length})
                </h4>
              </div>
              {assignedTrainers.length > 1 && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Multiple Trainers ({assignedTrainers.length})
                </Badge>
              )}
            </div>

            {assignedTrainers.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center">
                <AlertCircle className="size-5 text-amber-500 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-foreground">No Trainers Assigned</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select and assign a qualified trainer below to staff this class session.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedTrainers.map((tr: any, idx: number) => {
                  const assignmentId = tr.id;
                  const trainerProfileId = tr.trainer_profile || tr.trainer_profile_id;
                  const displayName =
                    tr.trainer_name && tr.trainer_name.toLowerCase() !== 'sweat'
                      ? tr.trainer_name
                      : tr.trainer_code || 'Trainer';
                  const role = tr.trainer_role || 'LEAD';
                  const status = tr.status || 'CONFIRMED';
                  const isRemovingThis = removingId === (assignmentId || trainerProfileId);

                  return (
                    <div
                      key={assignmentId || idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {displayName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                role === 'LEAD'
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : role === 'ASSISTANT'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {role}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            >
                              <CheckCircle2 className="size-2.5 mr-0.5 inline" />
                              {status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Remove Trainer Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={unassignMutation.isPending}
                        onClick={() => handleRemove(assignmentId, trainerProfileId)}
                        className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 shrink-0 ml-2 text-xs font-medium"
                        title="Remove trainer from session"
                      >
                        {isRemovingThis ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="size-3.5 mr-1" />
                            <span>Remove</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Add / Assign Trainer Form */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <UserPlus className="size-3.5 text-primary" />
                <span>Assign / Add Trainer</span>
              </h4>
              <span className="text-[10px] text-muted-foreground">
                Multiple trainers allowed per class
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Trainer Dropdown */}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">
                  Select Trainer <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  disabled={isLoadingTrainers || assignMutation.isPending}
                >
                  <option value="">Choose qualified trainer...</option>
                  {trainers.map((t) => {
                    const isAlreadyAssigned = assignedTrainerIds.has(t.id);
                    const name = t.trainer_name || 'Trainer';
                    return (
                      <option key={t.id} value={t.id}>
                        {name} {isAlreadyAssigned ? '• (Assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Role Dropdown */}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Assignment Role</Label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TrainerOccurrenceRole)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  disabled={assignMutation.isPending}
                >
                  {availableRoles.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleAssign}
                disabled={!selectedTrainerId || assignMutation.isPending}
                className="gap-1.5 text-xs font-semibold px-4"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Verifying & Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>+ Assign Trainer</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold px-5"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

