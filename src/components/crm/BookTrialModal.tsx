import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Dumbbell,
  Layers,
  ArrowRight,
  RotateCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import type { Lead, TrialSlot, BookTrialPayload, TrialBooking } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface BookTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  mode?: 'book' | 'reschedule';
  existingTrial?: (TrialBooking & { lead_status?: string; program_name?: string }) | null;
  onSuccess?: () => void;
}

export function BookTrialModal({
  open,
  onOpenChange,
  lead: initialLead,
  mode = 'book',
  existingTrial,
  onSuccess,
}: BookTrialModalProps) {
  const queryClient = useQueryClient();
  const isReschedule = mode === 'reschedule' && !!existingTrial;

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(
    initialLead?.id || existingTrial?.lead || ''
  );
  const [leadSearch, setLeadSearch] = React.useState('');
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(
    initialLead?.branch || existingTrial?.branch || ''
  );
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>(
    (initialLead?.interested_program as string) || ''
  );
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    if (existingTrial?.booking_date) return existingTrial.booking_date;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = React.useState<TrialSlot | null>(null);
  const [notes, setNotes] = React.useState('');

  // Sync state when initialLead or existingTrial changes
  React.useEffect(() => {
    if (initialLead) {
      setSelectedLeadId(initialLead.id);
      if (initialLead.branch) {
        setSelectedBranchId(initialLead.branch);
      }
      if (initialLead.interested_program) {
        setSelectedProgramId(initialLead.interested_program as string);
      }
    } else if (existingTrial) {
      if (existingTrial.lead) setSelectedLeadId(existingTrial.lead);
      if (existingTrial.branch) setSelectedBranchId(existingTrial.branch);
      if (existingTrial.booking_date) setSelectedDate(existingTrial.booking_date);
    }
  }, [initialLead, existingTrial]);

  // Fetch lead details if not passed directly
  const { data: fetchedLead } = useQuery({
    queryKey: ['lead-detail', selectedLeadId],
    queryFn: () => crmApi.getLead(selectedLeadId),
    enabled: open && !!selectedLeadId && !initialLead,
  });

  const activeLead = initialLead || fetchedLead;
  const isConverted =
    activeLead?.current_status === 'CONVERTED' ||
    existingTrial?.lead_status === 'CONVERTED';

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
    enabled: open,
  });

  // Automatically select first branch if none selected
  React.useEffect(() => {
    if (open && !selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [open, selectedBranchId, branches]);

  // Fetch programs for branch
  const { data: programs = [] } = useQuery({
    queryKey: ['active-programs', selectedBranchId],
    queryFn: () => crmApi.getPrograms(selectedBranchId || undefined),
    enabled: open,
  });

  // Defensive deduplication by canonical entity ID
  const uniqueBranches = React.useMemo(() => {
    const seen = new Set<string>();
    return branches.filter((b) => {
      if (!b?.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [branches]);

  const uniquePrograms = React.useMemo(() => {
    const seen = new Set<string>();
    return programs.filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [programs]);

  // Fetch leads for lead search if no initial lead or existing trial is provided
  const { data: leadsData } = useQuery({
    queryKey: ['crm-leads-search', leadSearch],
    queryFn: () => crmApi.getLeads({ search: leadSearch, page_size: 15 }),
    enabled: open && !initialLead && !existingTrial && leadSearch.trim().length > 1,
  });
  const leadSearchResults = leadsData?.results || [];

  // Fetch available slots from backend (canonical ClassOccurrence + BookingPolicySet)
  const {
    data: slots = [],
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
  } = useQuery({
    queryKey: [
      'available-trial-slots',
      selectedBranchId,
      selectedDate,
      selectedProgramId,
      selectedLeadId,
    ],
    queryFn: () =>
      crmApi.getAvailableTrialSlots({
        branch_id: selectedBranchId,
        date: selectedDate,
        program_id: selectedProgramId || undefined,
        lead_id: selectedLeadId || undefined,
      }),
    enabled: open && !!selectedBranchId && !!selectedDate && !isConverted,
  });

  const invalidateCrossModuleCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    queryClient.invalidateQueries({ queryKey: ['lead-detail'] });
    queryClient.invalidateQueries({ queryKey: ['lead-trials'] });
    queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['available-trial-slots'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-occurrences'] });
  };

  // Booking mutation
  const bookMutation = useMutation({
    mutationFn: (payload: BookTrialPayload) => crmApi.bookTrial(payload),
    onSuccess: () => {
      invalidateCrossModuleCaches();
      toast.success('Trial booked successfully! Class occurrence slot reserved.');
      onOpenChange(false);
      setSelectedSlot(null);
      setNotes('');
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to book trial slot.';
      toast.error(errorMsg);
    },
  });

  // Reschedule mutation (authoritative in-place atomic update)
  const rescheduleMutation = useMutation({
    mutationFn: (vars: { id: string; occurrenceId: string; notes?: string }) =>
      crmApi.rescheduleTrial(vars.id, {
        new_class_occurrence_id: vars.occurrenceId,
        notes: vars.notes,
      }),
    onSuccess: () => {
      invalidateCrossModuleCaches();
      toast.success('Trial rescheduled successfully! Slot transferred atomically.');
      onOpenChange(false);
      setSelectedSlot(null);
      setNotes('');
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to reschedule trial.';
      toast.error(errorMsg);
    },
  });

  const isSubmitting = bookMutation.isPending || rescheduleMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConverted) {
      toast.error('Converted leads are members and cannot book prospect trials.');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select an available class occurrence session.');
      return;
    }
    if (!selectedSlot.is_available || !selectedSlot.policy_allowed) {
      toast.error('Selected session is no longer available.');
      return;
    }

    if (isReschedule && existingTrial) {
      rescheduleMutation.mutate({
        id: existingTrial.id,
        occurrenceId: selectedSlot.occurrence_id,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!selectedLeadId) {
        toast.error('Please select a lead');
        return;
      }
      bookMutation.mutate({
        lead_id: selectedLeadId,
        class_occurrence_id: selectedSlot.occurrence_id,
        branch_id: selectedBranchId,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border border-border rounded-xl shadow-2xl">
        <DialogHeader className="px-5 sm:px-6 py-4 border-b border-border bg-card/60 shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            {isReschedule ? (
              <>
                <RotateCw className="w-5 h-5 text-amber-500 shrink-0" />
                Reschedule Trial Session
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                Book Real Trial Session
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isReschedule
              ? 'Select an alternative class occurrence session. The previous slot will be atomically released and transferred.'
              : 'Reserve an authoritative class occurrence slot with live capacity locking and gym timetable policy enforcement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* CONVERTED LEAD GUARD ALERT */}
          {isConverted && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold">Converted Lead Guard</div>
                <div>
                  This lead has already converted to a member and cannot book prospect trials.
                  Please use standard member class booking under <strong>Operations &gt; Bookings</strong>.
                </div>
              </div>
            </div>
          )}

          {/* RESCHEDULE: CURRENT SESSION CARD */}
          {isReschedule && existingTrial && (
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  Current Session
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {existingTrial.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <span>{existingTrial.class_name || 'Class Session'}</span>
                  {existingTrial.program_name && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {existingTrial.program_name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                  <span className="flex items-center gap-1 font-medium text-foreground/90">
                    <Calendar className="w-3 h-3 text-primary shrink-0" />
                    {existingTrial.booking_date ||
                      (existingTrial.scheduled_start
                        ? new Date(existingTrial.scheduled_start).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary shrink-0" />
                    {existingTrial.start_time ||
                      (existingTrial.scheduled_start
                        ? new Date(existingTrial.scheduled_start).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '')}
                    {existingTrial.end_time ? ` – ${existingTrial.end_time}` : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 shrink-0" />
                    {existingTrial.trainer_name || 'Unassigned'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {existingTrial.branch_name || 'Studio'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 1. LEAD SUMMARY */}
          {activeLead ? (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                  {activeLead.first_name?.[0]}
                  {activeLead.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {activeLead.first_name} {activeLead.last_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {activeLead.phone_normalized || activeLead.email_normalized || 'No contact phone'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant={isConverted ? 'secondary' : 'outline'}
                  className="text-[10px] uppercase tracking-wider font-mono"
                >
                  {activeLead.current_status}
                </Badge>
              </div>
            </div>
          ) : !isReschedule ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Prospect / Lead *</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search lead by name, phone or email..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              {leadSearchResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-border rounded-md divide-y divide-border bg-card text-xs">
                  {leadSearchResults.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setSelectedLeadId(l.id);
                        if (l.branch) setSelectedBranchId(l.branch);
                        if (l.interested_program) setSelectedProgramId(l.interested_program as string);
                        setLeadSearch(`${l.first_name} ${l.last_name} (${l.phone_normalized || l.email_normalized || 'No contact'})`);
                      }}
                      className={`p-2 cursor-pointer hover:bg-muted/50 flex justify-between items-center ${
                        selectedLeadId === l.id ? 'bg-primary/10 font-semibold text-primary' : ''
                      }`}
                    >
                      <div className="truncate">
                        {l.first_name} {l.last_name}
                        <span className="text-muted-foreground ml-2 text-[11px]">
                          {l.phone_normalized || l.email_normalized}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {l.current_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* 2. PROGRAM -> BRANCH -> TRIAL DATE */}
          <div className="space-y-2">
            {isReschedule && (
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Select New Session
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PROGRAM SELECTOR */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-muted-foreground" />
                  Interested Program
                </Label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => {
                    setSelectedProgramId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  disabled={isConverted}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">All Trial Programs</option>
                  {uniquePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* BRANCH SELECTOR */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  Branch / Location *
                </Label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  disabled={isConverted}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  required
                >
                  <option value="" disabled>Select Branch</option>
                  {uniqueBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || 'Studio'})
                    </option>
                  ))}
                </select>
              </div>

              {/* TRIAL DATE SELECTOR */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Trial Date *
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  disabled={isConverted}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. AUTHORITATIVE CLASS SESSIONS */}
          {!isConverted && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Available Class Sessions ({slots.length})
                </Label>
                {isSlotsLoading && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    Checking capacity...
                  </div>
                )}
              </div>

              {isSlotsError ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Unable to load class slots: {(slotsError as any)?.message || 'Branch or date invalid'}</span>
                </div>
              ) : !selectedBranchId ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border">
                  Please select a branch to view available scheduled occurrences.
                </div>
              ) : slots.length === 0 && !isSlotsLoading ? (
                <div className="py-8 px-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border bg-muted/10 space-y-1">
                  <div className="font-medium text-foreground">
                    No trial-enabled class sessions with remaining capacity on this date.
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Full trial sessions are authoritatively excluded. Try selecting another date or choosing &quot;All Trial Programs&quot; above.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.occurrence_id === slot.occurrence_id;
                    const isAvailable =
                      slot.is_available &&
                      slot.policy_allowed &&
                      slot.remaining_trial_capacity > 0 &&
                      slot.remaining_capacity > 0;

                    return (
                      <div
                        key={slot.occurrence_id}
                        onClick={() => {
                          if (isAvailable) setSelectedSlot(slot);
                        }}
                        className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                            : isAvailable
                            ? 'border-border/80 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                            : 'border-border/40 bg-muted/20 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {slot.class_name}
                            </span>
                            {slot.program_name && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {slot.program_name}
                              </Badge>
                            )}
                            {slot.delivery_mode && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                {slot.delivery_mode}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-foreground/90">
                              <Clock className="w-3 h-3 text-primary shrink-0" />
                              {slot.start_time} – {slot.end_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 shrink-0" />
                              {slot.trainer_name || 'Unassigned'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px]">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              {slot.branch_name}
                            </span>
                          </div>
                        </div>

                        {/* DUAL CAPACITY PILLS & SELECTION ACTION */}
                        <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-medium ${
                                slot.remaining_trial_capacity > 0
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'border-destructive/40 text-destructive bg-destructive/10'
                              }`}
                            >
                              Trial spots: {slot.remaining_trial_capacity} of {slot.trial_capacity} remaining
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 text-muted-foreground border-border/60"
                            >
                              Overall spots: {slot.remaining_capacity} of {slot.total_capacity} remaining
                            </Badge>
                          </div>

                          {isSelected ? (
                            <span className="text-[11px] text-primary font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 sm:mt-0.5">
                              Select Session <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. TRIAL / RESCHEDULE NOTES */}
          {!isConverted && (
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-medium">
                {isReschedule ? 'Reschedule Reason / Special Notes' : 'Trial Notes / Special Requests'}
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isReschedule
                    ? 'e.g. Prospect could not attend due to schedule conflict, moved to afternoon...'
                    : 'e.g. First time doing Pilates, interested in morning schedule...'
                }
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* 5. MODAL FOOTER */}
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isConverted || !selectedSlot || !selectedSlot.is_available || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {isReschedule ? 'Rescheduling Slot...' : 'Reserving Slot...'}
                </>
              ) : isReschedule ? (
                'Confirm Reschedule'
              ) : (
                'Confirm Trial Booking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
