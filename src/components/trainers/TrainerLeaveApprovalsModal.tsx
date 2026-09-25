/**
 * src/components/trainers/TrainerLeaveApprovalsModal.tsx — Admin Approval Panel for Trainer Leaves & Shift Overrides
 * 
 * Lists TRAINER_LEAVE_REQUEST approval gates.
 * Allows Admin to review and approve/reject. When APPROVED, the backend atomically creates an active EmployeeScheduleException.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { approvalsApi } from '@/api/endpoints/approvalsApi';
import type { ApprovalRequest } from '@/types/approvals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TrainerLeaveApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrainerLeaveApprovalsModal({ isOpen, onClose }: TrainerLeaveApprovalsModalProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<string>('PENDING');
  const [rejectComment, setRejectComment] = React.useState<string>('');
  const [rejectingRequestId, setRejectingRequestId] = React.useState<string | null>(null);

  const {
    data: requests = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trainer-leave-approvals', statusFilter],
    queryFn: () =>
      approvalsApi.getRequests({
        request_type: 'TRAINER_LEAVE_REQUEST',
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    enabled: isOpen,
  });

  const actMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      comment,
    }: {
      requestId: string;
      action: 'APPROVED' | 'REJECTED';
      comment?: string;
    }) => {
      return approvalsApi.actOnRequest(requestId, {
        action,
        comment,
        allow_self_approval: true,
      });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === 'APPROVED'
          ? 'Leave request approved! Schedule exception activated.'
          : 'Leave request rejected.'
      );
      setRejectingRequestId(null);
      setRejectComment('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['employee-schedule-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-leave-approvals'] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to process action'
      );
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Trainer Leave & Override Approval Gates
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Review, approve, or reject leave and shift override submissions from trainers.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                <Button
                  key={st}
                  type="button"
                  variant={statusFilter === st ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className="h-7 px-2.5 text-xs font-semibold"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading approval requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
              No leave or override requests matching status "{statusFilter}".
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
              {requests.map((req: ApprovalRequest) => {
                const payload = req.requested_payload || {};
                const excDate = payload.exception_date || 'N/A';
                const excType = payload.exception_type || 'LEAVE';
                const trainerCode = payload.trainer_code || 'Trainer';
                const trainerName = payload.trainer_name || '';
                const isPartial = payload.start_time && payload.end_time;
                const isPending = req.status === 'PENDING';

                return (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <span className="font-semibold text-sm">
                            {trainerName ? `${trainerName} (${trainerCode})` : trainerCode}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Requested by {req.requested_by_email || 'Staff'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            req.status === 'APPROVED'
                              ? 'default'
                              : req.status === 'REJECTED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] font-semibold"
                        >
                          {req.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {excType}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-muted/40 p-2.5 rounded-md">
                      <div>
                        <span className="text-muted-foreground">Target Date:</span>{' '}
                        <strong className="text-foreground">{excDate}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Scope:</span>{' '}
                        <strong className="text-foreground">
                          {isPartial
                            ? `${payload.start_time.slice(0, 5)} - ${payload.end_time.slice(0, 5)}`
                            : 'Full Day'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Availability:</span>{' '}
                        <strong
                          className={payload.is_available ? 'text-emerald-500' : 'text-rose-500'}
                        >
                          {payload.is_available ? 'Available / Teaching' : 'Absent / Leave'}
                        </strong>
                      </div>
                    </div>

                    {payload.reason && (
                      <p className="text-xs text-muted-foreground italic">
                        "{payload.reason}"
                      </p>
                    )}

                    {/* Pending Action Controls */}
                    {isPending && (
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                        {rejectingRequestId === req.id ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Input
                              placeholder="Reason for rejection..."
                              value={rejectComment}
                              onChange={(e) => setRejectComment(e.target.value)}
                              className="h-8 text-xs flex-1 sm:w-60"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                actMutation.mutate({
                                  requestId: req.id,
                                  action: 'REJECTED',
                                  comment: rejectComment,
                                })
                              }
                              disabled={actMutation.isPending}
                              className="h-8 text-xs"
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRejectingRequestId(null);
                                setRejectComment('');
                              }}
                              className="h-8 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRejectingRequestId(req.id)}
                              disabled={actMutation.isPending}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                actMutation.mutate({
                                  requestId: req.id,
                                  action: 'APPROVED',
                                })
                              }
                              disabled={actMutation.isPending}
                              className="h-8 text-xs gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Materialize
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
