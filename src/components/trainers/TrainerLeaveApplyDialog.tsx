/**
 * src/components/trainers/TrainerLeaveApplyDialog.tsx — Self-Service Trainer Leave & Availability Request Form
 * 
 * Submits an operational ApprovalRequest (type: TRAINER_LEAVE_REQUEST).
 * Once reviewed and APPROVED by the Admin, the backend automatically materializes an active EmployeeScheduleException.
 */

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, FileText, Send, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { approvalsApi } from '@/api/endpoints/approvalsApi';
import type { TrainerProfile } from '@/types/workforce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface TrainerLeaveApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trainer: TrainerProfile | null;
  branches: Array<{ id: string; name: string; city?: string }>;
}

export function TrainerLeaveApplyDialog({
  isOpen,
  onClose,
  trainer,
  branches,
}: TrainerLeaveApplyDialogProps) {
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('');
  const [leaveDate, setLeaveDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [requestType, setRequestType] = React.useState<'LEAVE' | 'UNAVAILABLE' | 'WEEKLY_OFF_OVERRIDE' | 'TEMPORARY_AVAILABILITY'>('LEAVE');
  const [isFullDay, setIsFullDay] = React.useState(true);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('13:00');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!trainer?.employee_profile) {
        throw new Error('Trainer employee profile is not linked.');
      }
      if (!leaveDate) {
        throw new Error('Please pick a date for the leave request.');
      }
      if (!reason.trim()) {
        throw new Error('Please enter a reason or context for this request.');
      }

      const isAvailable = requestType === 'WEEKLY_OFF_OVERRIDE' || requestType === 'TEMPORARY_AVAILABILITY';

      const payload = {
        employee_profile_id: trainer.employee_profile,
        trainer_code: trainer.trainer_code,
        trainer_name: trainer.trainer_name,
        branch_id: selectedBranchId || null,
        exception_date: leaveDate,
        exception_type: requestType,
        is_available: isAvailable,
        start_time: isFullDay ? null : `${startTime}:00`,
        end_time: isFullDay ? null : `${endTime}:00`,
        reason: reason.trim(),
      };

      return approvalsApi.createRequest({
        request_type: 'TRAINER_LEAVE_REQUEST',
        entity_type: 'EmployeeProfile',
        entity_id: trainer.employee_profile,
        requested_payload: payload,
        required_approvals: 1,
      });
    },
    onSuccess: () => {
      toast.success('Leave / availability request submitted for Admin approval!');
      queryClient.invalidateQueries({ queryKey: ['trainer-leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      setReason('');
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to submit leave request'
      );
    },
  });

  if (!trainer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Apply for Leave or Shift Override
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submits an approval request for {trainer.trainer_name || trainer.trainer_code}.
            Once approved by Admin, the schedule exception will activate automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Request Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Request Category *</Label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
            >
              <option value="LEAVE">Full / Partial Leave of Absence (Paid/Unpaid)</option>
              <option value="UNAVAILABLE">Temporary Unavailability Block (Half-Day / Partial Window)</option>
              <option value="WEEKLY_OFF_OVERRIDE">Weekly-Off Override (Available to teach on off-day)</option>
              <option value="TEMPORARY_AVAILABILITY">Temporary Extra Availability (Special coaching slot)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Branch (Optional)</Label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="">All Branches / Global</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Date *</Label>
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Full Day vs Specific Hours Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-xs font-medium">Full Day Request</p>
              <p className="text-[11px] text-muted-foreground">
                {isFullDay ? 'Applies to the entire day' : 'Specify partial window (half-day)'}
              </p>
            </div>
            <Switch checked={isFullDay} onCheckedChange={setIsFullDay} />
          </div>

          {/* Start and End Time (if not full day) */}
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">From Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">To Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reason / Context *</Label>
            <Textarea
              placeholder="e.g. Personal emergency, doctor consultation, attending fitness seminar..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !reason.trim()}
            className="gap-1.5"
          >
            {submitMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
