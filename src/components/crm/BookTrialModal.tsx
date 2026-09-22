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
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/services/crmApi';
import type { Lead, TrialSlot, BookTrialPayload } from '@/types/crm';
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

interface BookTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSuccess?: () => void;
}

export function BookTrialModal({
  open,
  onOpenChange,
  lead: initialLead,
  onSuccess,
}: BookTrialModalProps) {
  const queryClient = useQueryClient();

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(initialLead?.id || '');
  const [leadSearch, setLeadSearch] = React.useState('');
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(initialLead?.branch || '');
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = React.useState<TrialSlot | null>(null);
  const [notes, setNotes] = React.useState('');

  // Sync state when initialLead changes
  React.useEffect(() => {
    if (initialLead) {
      setSelectedLeadId(initialLead.id);
      if (initialLead.branch) {
        setSelectedBranchId(initialLead.branch);
      }
    }
  }, [initialLead]);

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

  // Fetch leads for lead search if no initial lead is provided
  const { data: leadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['crm-leads-search', leadSearch],
    queryFn: () => crmApi.getLeads({ search: leadSearch, page_size: 15 }),
    enabled: open && !initialLead && leadSearch.trim().length > 1,
  });
  const leadSearchResults = leadsData?.results || [];

  // Fetch available slots from backend (canonical ClassOccurrence + BookingPolicySet)
  const {
    data: slots = [],
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['available-trial-slots', selectedBranchId, selectedDate],
    queryFn: () =>
      crmApi.getAvailableTrialSlots({
        branch_id: selectedBranchId,
        date: selectedDate,
      }),
    enabled: open && !!selectedBranchId && !!selectedDate,
  });

  // Booking mutation
  const bookMutation = useMutation({
    mutationFn: (payload: BookTrialPayload) => crmApi.bookTrial(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail'] });
      queryClient.invalidateQueries({ queryKey: ['lead-trials'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial booked successfully! Slot reserved.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      toast.error('Please select a lead');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select an available trial slot');
      return;
    }
    if (!selectedSlot.is_available) {
      toast.error('Selected slot is no longer available');
      return;
    }

    bookMutation.mutate({
      lead_id: selectedLeadId,
      class_occurrence_id: selectedSlot.occurrence_id,
      branch_id: selectedBranchId,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border border-border rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card/40 shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book Real Trial Session
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Reserve an authoritative class occurrence slot for this lead with real-time capacity locking and policy enforcement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* LEAD SELECTION */}
          {initialLead ? (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {initialLead.first_name?.[0]}
                  {initialLead.last_name?.[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    {initialLead.first_name} {initialLead.last_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {initialLead.phone_normalized || initialLead.email_normalized || 'No direct contact'}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {initialLead.current_status}
              </Badge>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Prospect / Lead *</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Type name, phone or email to search leads..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
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
                        setLeadSearch(`${l.first_name} ${l.last_name} (${l.phone_normalized || l.email_normalized || 'No contact'})`);
                      }}
                      className={`p-2 cursor-pointer hover:bg-muted/50 flex justify-between items-center ${
                        selectedLeadId === l.id ? 'bg-primary/10 font-semibold text-primary' : ''
                      }`}
                    >
                      <div>
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
          )}

          {/* BRANCH & DATE SELECTOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                required
              >
                <option value="" disabled>Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city || 'Studio'})
                  </option>
                ))}
              </select>
            </div>

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
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* AVAILABLE SLOTS */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Authoritative Class Occurrences ({slots.length})
              </Label>
              {isSlotsLoading && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
              <div className="py-8 text-center text-xs text-muted-foreground">
                Please select a branch to view available scheduled occurrences.
              </div>
            ) : slots.length === 0 && !isSlotsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border">
                No active class occurrences found for this branch on {selectedDate}.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.occurrence_id === slot.occurrence_id;
                  const isAvailable = slot.is_available && slot.policy_allowed;

                  return (
                    <div
                      key={slot.occurrence_id}
                      onClick={() => {
                        if (isAvailable) setSelectedSlot(slot);
                      }}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : isAvailable
                          ? 'border-border/70 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                          : 'border-border/30 bg-muted/20 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {slot.class_name}
                          </span>
                          {slot.class_category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {slot.class_category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <Clock className="w-3 h-3 text-primary" />
                            {slot.start_time} - {slot.end_time}
                          </span>
                          {slot.trainer_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {slot.trainer_name}
                            </span>
                          )}
                        </div>
                        {!slot.policy_allowed && slot.policy_message && (
                          <div className="text-[10px] text-amber-500 font-medium">
                            {slot.policy_message}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          {slot.trial_capacity > 0 && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                slot.remaining_trial_capacity > 0
                                  ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                                  : 'border-destructive/40 text-destructive bg-destructive/10'
                              }`}
                            >
                              Trial Cap: {slot.trial_booked}/{slot.trial_capacity}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              slot.remaining_capacity > 0
                                ? 'border-primary/40 text-primary bg-primary/10'
                                : 'border-destructive/40 text-destructive bg-destructive/10'
                            }`}
                          >
                            Total Cap: {slot.total_booked}/{slot.total_capacity}
                          </Badge>
                        </div>
                        {isSelected && (
                          <span className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INTERNAL NOTES */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Trial Notes / Customer Special Needs</Label>
            <Input
              placeholder="e.g. First time doing Pilates, requested reformer intro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border bg-card/40 flex items-center justify-between sm:justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={bookMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedLeadId || !selectedSlot || !selectedSlot.is_available || bookMutation.isPending}
            className="text-xs font-medium"
          >
            {bookMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Reserving Slot...
              </>
            ) : (
              'Confirm Trial Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
