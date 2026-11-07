import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  Ban,
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Bell,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Info,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence, ClassCancellationPreview, AffectedBooking } from '../../types/classes';
import { formatOccurrenceDate, formatTime12h } from '@/utils/dateTimeUtils';

interface CancelClassModalProps {
  occurrence: ClassOccurrence | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'Trainer Emergency / Unavailable',
  'Studio / Equipment Maintenance',
  'Inclement Weather / Emergency Closure',
  'Public Holiday / Schedule Adjustment',
  'Low Enrollment / Minimum Capacity Not Met',
  'Other Operational Reason',
];

export const CancelClassModal: React.FC<CancelClassModalProps> = ({
  occurrence,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'CANCELLED' | 'DEACTIVATED'>('CANCELLED');
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(PRESET_REASONS[0] || 'Other Operational Reason');
  const [customReason, setCustomReason] = useState<string>('');
  const [notifyMembers, setNotifyMembers] = useState<boolean>(true);
  const [restoreCredits, setRestoreCredits] = useState<boolean>(true);

  // Fetch real-time cancellation preview for affected member bookings
  const {
    data: preview,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useQuery<ClassCancellationPreview>({
    queryKey: ['class-occurrence-cancellation-preview', occurrence?.id || ''],
    queryFn: () => classesApi.getCancellationPreview(occurrence!.id),
    enabled: isOpen && !!occurrence?.id,
    staleTime: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setMode('CANCELLED');
      setSelectedPresetReason(PRESET_REASONS[0] || 'Other Operational Reason');
      setCustomReason('');
      setNotifyMembers(true);
      setRestoreCredits(true);
    }
  }, [isOpen, occurrence?.id]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!occurrence?.id) throw new Error('No occurrence selected');
      const finalReason = customReason.trim()
        ? `${selectedPresetReason}: ${customReason.trim()}`
        : selectedPresetReason;

      return await classesApi.cancelOccurrence(occurrence.id, {
        reason: finalReason,
        notify_members: notifyMembers,
        restore_credits: restoreCredits,
        mode: mode,
      });
    },
    onSuccess: (data) => {
      toast.success(
        data?.message ||
          `Class session ${mode === 'DEACTIVATED' ? 'deactivated' : 'cancelled'} successfully.`
      );
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['class-roster'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-schedule'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to cancel class session.';
      toast.error(msg);
    },
  });

  if (!occurrence) return null;

  const totalBooked = preview?.total_booked ?? (occurrence.booking_count ?? 0);
  const confirmedCount = preview?.confirmed_count ?? totalBooked;
  const waitlistCount = preview?.waitlist_count ?? (occurrence.waitlist_count ?? 0);
  const affectedList = preview?.affected_bookings || [];

  const startTimeStr = occurrence.start_time
    ? formatTime12h(occurrence.start_time)
    : occurrence.start_at
    ? formatTime12h(new Date(occurrence.start_at).toTimeString().substring(0, 5))
    : '';

  const endTimeStr = occurrence.end_time
    ? formatTime12h(occurrence.end_time)
    : occurrence.end_at
    ? formatTime12h(new Date(occurrence.end_at).toTimeString().substring(0, 5))
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !cancelMutation.isPending && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl border-rose-500/20 bg-card p-0 gap-0">
        {/* Header Banner */}
        <div className="bg-rose-500/10 dark:bg-rose-950/30 border-b border-rose-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shrink-0">
              <Ban className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Cancel Class Session
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold text-[10px]"
                >
                  Admin Action
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Cancel or deactivate this individual group class occurrence. Records and booking history are preserved.
              </DialogDescription>
            </div>
          </div>

          {/* Session Overview Card */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background/80 dark:bg-background/40 backdrop-blur rounded-lg p-3 border border-border/60 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Class</span>
              <span className="font-bold text-foreground truncate block">
                {occurrence.class_name || occurrence.template_name || 'Class Session'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Branch</span>
              <span className="font-medium text-foreground truncate block flex items-center gap-1">
                <MapPin className="size-2.5 text-primary shrink-0" />
                {occurrence.branch_name || 'Main Studio'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Date & Time</span>
              <span className="font-medium text-foreground truncate block">
                {formatOccurrenceDate(occurrence.occurrence_date, occurrence.start_at)}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {startTimeStr} – {endTimeStr}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current Bookings</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <Users className="size-3 text-primary shrink-0" />
                {totalBooked} {totalBooked === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Section 1: Member Bookings Impact */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              <span>1. Existing Member Bookings</span>
            </h4>

            {isLoadingPreview ? (
              <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Checking booked members and session entitlements...</span>
              </div>
            ) : totalBooked > 0 ? (
              <div className="space-y-3">
                {/* Warning callout */}
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {totalBooked} member(s) have active bookings for this class session!
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {confirmedCount} confirmed attendee(s) and {waitlistCount} waitlisted member(s) will be affected.
                      Review the list below and select handling options.
                    </p>
                  </div>
                </div>

                {/* Affected members list */}
                {affectedList.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border flex justify-between items-center">
                      <span>Affected Members ({affectedList.length})</span>
                      <span className="text-[10px]">Authoritative Booking Roster</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border text-xs">
                      {affectedList.map((m: AffectedBooking, idx: number) => (
                        <div key={m.id || idx} className="p-2.5 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{m.member_name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  m.status === 'WAITLISTED'
                                    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                }`}
                              >
                                {m.status} {m.waitlist_position ? `#${m.waitlist_position}` : ''}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                              {m.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-2.5" /> {m.phone}
                                </span>
                              )}
                              {m.membership_name && (
                                <span className="flex items-center gap-1 text-foreground/80 font-medium">
                                  <CreditCard className="size-2.5 text-primary" /> {m.membership_name}
                                </span>
                              )}
                              <span className="font-mono text-[10px]">#{m.booking_number}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {m.has_entitlement ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                1 Session Refundable
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Standard</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workflow Options */}
                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyMembers"
                      checked={notifyMembers}
                      onCheckedChange={(checked) => setNotifyMembers(Boolean(checked))}
                    />
                    <Label htmlFor="notifyMembers" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <Bell className="size-3 text-primary" />
                      <span>Notify affected members immediately with class cancellation alert</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restoreCredits"
                      checked={restoreCredits}
                      onCheckedChange={(checked) => setRestoreCredits(Boolean(checked))}
                    />
                    <Label htmlFor="restoreCredits" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <RotateCcw className="size-3 text-emerald-500" />
                      <span>Automatically restore booking credit / session units to members' balance</span>
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>No active member bookings on this session. It can be cancelled safely without member disruption.</span>
              </div>
            )}
          </div>

          {/* Section 2: Cancellation Action & Mode */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Ban className="size-3.5 text-primary" />
              <span>2. Action & Status</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('CANCELLED')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  mode === 'CANCELLED'
                    ? 'border-rose-500 bg-rose-500/10 text-foreground ring-1 ring-rose-500'
                    : 'border-border bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-600 dark:text-rose-400">Cancel Session</span>
                  {mode === 'CANCELLED' && <CheckCircle2 className="size-3.5 text-rose-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Marks slot as Cancelled. Clearly highlighted with a red badge in admin and hidden from member app.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('DEACTIVATED')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  mode === 'DEACTIVATED'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500'
                    : 'border-border bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Deactivate Session</span>
                  {mode === 'DEACTIVATED' && <CheckCircle2 className="size-3.5 text-amber-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Disables slot from schedule. Unlisted from member booking portal and available lists.
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Reason */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>3. Reason for Cancellation</span>
            </h4>

            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Primary Reason Category</Label>
                <select
                  value={selectedPresetReason}
                  onChange={(e) => setSelectedPresetReason(e.target.value)}
                  className="w-full h-9 bg-background border border-border rounded-lg px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {PRESET_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Additional Details / Notes for Members (Optional)
                </Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g., Coach Sarah had a personal emergency. You may rebook another session or contact front desk for assistance."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Scope notice for recurring occurrences */}
          {Boolean(occurrence.schedule_rule || preview?.is_recurring) && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground flex items-start gap-2">
              <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Recurring Class Notice</p>
                <p className="text-[11px] mt-0.5">
                  This class occurrence is generated from a recurring schedule rule. Cancelling this session will
                  cancel <strong>only this single occurrence ({occurrence.occurrence_date})</strong>.
                  All other future recurring occurrences remain untouched.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/30 border-t border-border flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={cancelMutation.isPending}
            className="text-xs"
          >
            Keep Class
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || isLoadingPreview}
            className="text-xs gap-1.5 font-bold shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
          >
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Cancelling Class & Refunding...</span>
              </>
            ) : (
              <>
                <Ban className="size-3.5" />
                <span>Confirm {mode === 'DEACTIVATED' ? 'Deactivation' : 'Cancellation'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
