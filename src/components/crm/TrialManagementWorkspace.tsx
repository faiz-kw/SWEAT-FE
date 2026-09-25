import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  Eye,
  MoreVertical,
  Bell,
  Check,
  X,
  Loader2,
  CalendarCheck,
  UserCheck,
  UserX,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import type {
  TrialBooking,
  TrialConfirmationStatus,
  TrialConfirmationChannel,
  TrialSlot,
  TrialReminderSchedulePoint,
  Lead,
} from '@/types/crm';
import { usePermissions } from '@/lib/permissions';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CRMPageHeader } from './common/CRMPageHeader';
import { CRMKpiTile } from './common/CRMKpiTile';
import { CRMFilterBar } from './common/CRMFilterBar';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';
import { CRMLoadingState } from './common/CRMLoadingState';
import { formatCrmLabel } from '@/lib/crmLabels';
import { BookTrialModal } from './BookTrialModal';
import { LeadDetailModal } from './LeadDetailModal';

export function TrialManagementWorkspace() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('crm.trials.edit') || can('crm.leads.edit') || can('sales.leads.edit');

  // Filters
  const [selectedBranch, setSelectedBranch] = React.useState<string>('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [selectedConfStatus, setSelectedConfStatus] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [dateFilter, setDateFilter] = React.useState<string>('');

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = React.useState(false);
  const [selectedLeadFor360, setSelectedLeadFor360] = React.useState<Lead | null>(null);
  const [isLead360Open, setIsLead360Open] = React.useState(false);

  // Action Dialogs state
  const [confirmingTrial, setConfirmingTrial] = React.useState<TrialBooking | null>(null);
  const [confirmChannel, setConfirmChannel] = React.useState<TrialConfirmationChannel>('PHONE');
  const [confirmNotes, setConfirmNotes] = React.useState('');

  const [reschedulingTrial, setReschedulingTrial] = React.useState<TrialBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [rescheduleSlot, setRescheduleSlot] = React.useState<TrialSlot | null>(null);
  const [rescheduleNotes, setRescheduleNotes] = React.useState('');

  const [cancellingTrial, setCancellingTrial] = React.useState<TrialBooking | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelNotes, setCancelNotes] = React.useState('');

  const [viewingScheduleTrial, setViewingScheduleTrial] = React.useState<TrialBooking | null>(null);

  // Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
  });

  // Summary counts query
  const { data: counts, isLoading: isCountsLoading } = useQuery({
    queryKey: ['trial-summary-counts', selectedBranch],
    queryFn: () =>
      crmApi.getTrialSummaryCounts({
        branch_id: selectedBranch || undefined,
      }),
  });

  // Trial bookings list query
  const {
    data: trials = [],
    isLoading: isTrialsLoading,
    isError: isTrialsError,
    refetch: refetchTrials,
  } = useQuery({
    queryKey: ['trial-bookings', selectedBranch, selectedStatus, selectedConfStatus, dateFilter, searchQuery],
    queryFn: () =>
      crmApi.getTrialBookings({
        branch_id: selectedBranch || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        confirmation_status: selectedConfStatus !== 'ALL' ? selectedConfStatus : undefined,
        start_date: dateFilter || undefined,
        end_date: dateFilter || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Available slots query for rescheduling
  const { data: rescheduleSlots = [], isLoading: isRescheduleSlotsLoading } = useQuery({
    queryKey: ['available-trial-slots', reschedulingTrial?.branch, rescheduleDate],
    queryFn: () =>
      crmApi.getAvailableTrialSlots({
        branch_id: reschedulingTrial!.branch,
        date: rescheduleDate,
      }),
    enabled: !!reschedulingTrial && !!rescheduleDate,
  });

  // Reminder schedule query for viewing schedule
  const { data: reminderSchedule = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ['trial-reminder-schedule', viewingScheduleTrial?.id],
    queryFn: () => crmApi.getTrialReminderSchedule(viewingScheduleTrial!.id),
    enabled: !!viewingScheduleTrial,
  });

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: ({ id, channel, notes }: { id: string; channel: TrialConfirmationChannel; notes?: string }) =>
      crmApi.confirmTrial(id, channel, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial attendance confirmed successfully!');
      setConfirmingTrial(null);
      setConfirmNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to confirm trial');
    },
  });

  const markAttendedMutation = useMutation({
    mutationFn: (id: string) => crmApi.markTrialAttended(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial marked as Attended! Follow-up generated if configured.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to mark attended');
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: (id: string) => crmApi.markTrialNoShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial marked as No-Show! Recovery task created if configured.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to mark no-show');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newSlotId, notes }: { id: string; newSlotId: string; notes?: string }) =>
      crmApi.rescheduleTrial(id, { new_class_occurrence_id: newSlotId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial rescheduled! New session reserved and linked.');
      setReschedulingTrial(null);
      setRescheduleSlot(null);
      setRescheduleNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to reschedule trial');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: string; notes?: string }) =>
      crmApi.cancelTrial(id, reason, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline'] });
      toast.success('Trial cancelled successfully.');
      setCancellingTrial(null);
      setCancelReason('');
      setCancelNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to cancel trial');
    },
  });

  const requestRescheduleMutation = useMutation({
    mutationFn: (id: string) => crmApi.requestRescheduleTrial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-summary-counts'] });
      toast.success('Confirmation status updated to Reschedule Requested.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to request reschedule');
    },
  });

  // Helpers for badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/10">Booked</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Confirmed</Badge>;
      case 'ATTENDED':
        return <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">Attended</Badge>;
      case 'NO_SHOW':
        return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">No Show</Badge>;
      case 'RESCHEDULED':
        return <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">Rescheduled</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-muted/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfStatusBadge = (status: string, channel?: string | null) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed {channel ? `(${channel})` : ''}
          </span>
        );
      case 'RESCHEDULE_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
            <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
            Reschedule Requested
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            Cancelled
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="w-3 h-3" />
            Pending Confirmation
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="Trial Management"
        subtitle="Authoritative prospect trial bookings: class capacity reservation, confirmation lifecycle, and check-in tracking."
        icon={Calendar}
        badgeText="Operational"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTrials()}
              className="gap-1.5 h-9"
              title="Refresh trial bookings"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsBookModalOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Trial</span>
              </Button>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* METRIC KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <CRMKpiTile
            label="Total Bookings"
            value={counts?.total}
            isLoading={isCountsLoading}
            hint="All recorded trials"
          />
          <CRMKpiTile
            label="Active Booked"
            value={counts?.booked}
            isLoading={isCountsLoading}
            badge={{ text: 'Booked', variant: 'info' }}
            hint="Awaiting session"
          />
          <CRMKpiTile
            label="Confirmed"
            value={counts?.confirmed}
            isLoading={isCountsLoading}
            badge={{ text: 'Confirmed', variant: 'positive' }}
            hint="Attendance verified"
          />
          <CRMKpiTile
            label="Attended"
            value={counts?.attended}
            isLoading={isCountsLoading}
            badge={{ text: 'Attended', variant: 'positive' }}
            hint="Completed trial workout"
          />
          <CRMKpiTile
            label="No-Show"
            value={counts?.no_show}
            isLoading={isCountsLoading}
            badge={{ text: counts?.no_show ? 'Follow up' : 'Clear', variant: counts?.no_show ? 'negative' : 'neutral' }}
            hint="Missed appointment"
          />
          <CRMKpiTile
            label="Reschedule Req"
            value={counts?.reschedule_requested}
            isLoading={isCountsLoading}
            badge={{ text: counts?.reschedule_requested ? 'Urgent' : 'None', variant: counts?.reschedule_requested ? 'warning' : 'neutral' }}
            hint="Prospect requested change"
          />
        </div>

        {/* FILTER TOOLBAR */}
        <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
              <Input
                placeholder="Search lead, class, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Branch filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Status filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
              >
                <option value="ALL">All Lifecycle Statuses</option>
                <option value="BOOKED">Booked</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ATTENDED">Attended</option>
                <option value="NO_SHOW">No Show</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Confirmation Status filter */}
            <div>
              <select
                value={selectedConfStatus}
                onChange={(e) => setSelectedConfStatus(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
              >
                <option value="ALL">All Confirmations</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
                <option value="DECLINED">Declined</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

        {(searchQuery || selectedBranch || selectedStatus !== 'ALL' || selectedConfStatus !== 'ALL' || dateFilter) && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>Filters active: showing {trials.length} trials</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedStatus('ALL');
                setSelectedConfStatus('ALL');
                setDateFilter('');
              }}
              className="h-6 text-xs text-primary hover:text-primary"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* TRIALS TABLE / LIST */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
        {isTrialsLoading ? (
          <CRMLoadingState message="Loading real trial bookings..." />
        ) : isTrialsError ? (
          <CRMErrorState
            title="Unable to Load Trials"
            message="There was an issue communicating with the trial service. Please refresh or verify permissions."
            onRetry={() => refetchTrials()}
          />
        ) : trials.length === 0 ? (
          <CRMEmptyState
            icon={Calendar}
            title="No Trial Bookings Found"
            description="No trial bookings match your current filter criteria. Book a prospect into an active class occurrence slot to see them here."
            actionLabel={canEdit ? '+ Book Trial' : undefined}
            onAction={() => setIsBookModalOpen(true)}
            canAction={canEdit}
          />
        ) : (
          <>
            {/* DESKTOP TABLE (HIDDEN ON MOBILE/TABLET) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Lead &amp; Contact</th>
                    <th className="px-4 py-3">Class &amp; Schedule</th>
                    <th className="px-4 py-3">Branch &amp; Trainer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Confirmation</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trials.map((trial) => {
                    return (
                      <tr key={trial.id} className="hover:bg-muted/20 transition-colors">
                        {/* Lead */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span
                              onClick={async () => {
                                try {
                                  const lead = await crmApi.getLead(trial.lead);
                                  setSelectedLeadFor360(lead);
                                  setIsLead360Open(true);
                                } catch {
                                  toast.error('Could not open lead details');
                                }
                              }}
                              className="hover:underline hover:text-primary cursor-pointer"
                            >
                              {trial.lead_name || 'Prospect'}
                            </span>
                            {trial.is_rescheduled && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                                Replacement
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {trial.lead_phone || trial.lead_email || 'No contact'}
                          </div>
                        </td>

                        {/* Class & Schedule */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{formatCrmLabel(trial.class_name || 'Class Session')}</div>
                          {trial.booking_date ? (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-primary" />
                              <span>{trial.booking_date}</span>
                              {trial.start_time && (
                                <>
                                  <span>&bull;</span>
                                  <span>{trial.start_time}{trial.end_time ? ` - ${trial.end_time}` : ''}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground mt-0.5">Schedule unavailable</div>
                          )}
                        </td>

                        {/* Branch & Trainer */}
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">{trial.branch_name || 'Studio'}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {trial.trainer_name || 'Unassigned'}
                          </div>
                        </td>

                        {/* Lifecycle Status */}
                        <td className="px-4 py-3">
                          {getStatusBadge(trial.status)}
                        </td>

                        {/* Confirmation */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {getConfStatusBadge(trial.confirmation_status, trial.confirmation_channel)}
                            {trial.confirmed_at && (
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(trial.confirmed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary contextual action */}
                            {canEdit && trial.status === 'BOOKED' && trial.confirmation_status !== 'CONFIRMED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmingTrial(trial)}
                                className="h-7 px-2.5 text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
                              >
                                <Check className="w-3 h-3" />
                                Confirm
                              </Button>
                            )}

                            {canEdit && trial.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAttendedMutation.mutate(trial.id)}
                                disabled={markAttendedMutation.isPending}
                                className="h-7 px-2.5 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                              >
                                <UserCheck className="w-3 h-3" />
                                Attended
                              </Button>
                            )}

                            {/* Accessible Enterprise More Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const lead = await crmApi.getLead(trial.lead);
                                      setSelectedLeadFor360(lead);
                                      setIsLead360Open(true);
                                    } catch {
                                      toast.error('Could not open lead details');
                                    }
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                  View Lead 360
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => setViewingScheduleTrial(trial)}>
                                  <Bell className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                  Reminder Schedule
                                </DropdownMenuItem>

                                {canEdit && trial.status !== 'CANCELLED' && trial.status !== 'RESCHEDULED' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {trial.status === 'BOOKED' && trial.confirmation_status !== 'RESCHEDULE_REQUESTED' && (
                                      <DropdownMenuItem onClick={() => requestRescheduleMutation.mutate(trial.id)}>
                                        <HelpCircle className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                        Req Reschedule
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setReschedulingTrial(trial);
                                        setRescheduleDate(trial.booking_date);
                                      }}
                                    >
                                      <RotateCw className="w-3.5 h-3.5 mr-2 text-primary" />
                                      Reschedule Slot
                                    </DropdownMenuItem>
                                    {trial.status !== 'NO_SHOW' && trial.status !== 'ATTENDED' && (
                                      <DropdownMenuItem onClick={() => markNoShowMutation.mutate(trial.id)}>
                                        <UserX className="w-3.5 h-3.5 mr-2 text-destructive" />
                                        Mark No-Show
                                      </DropdownMenuItem>
                                    )}
                                    {trial.status !== 'ATTENDED' && (
                                      <DropdownMenuItem
                                        onClick={() => setCancellingTrial(trial)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <X className="w-3.5 h-3.5 mr-2" />
                                        Cancel Booking
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE & TABLET FEED (VISIBLE ON SCREENS < LG) */}
            <div className="lg:hidden divide-y divide-border">
              {trials.map((trial) => (
                <div key={trial.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span
                          onClick={async () => {
                            try {
                              const lead = await crmApi.getLead(trial.lead);
                              setSelectedLeadFor360(lead);
                              setIsLead360Open(true);
                            } catch {
                              toast.error('Could not open lead');
                            }
                          }}
                          className="hover:underline hover:text-primary cursor-pointer"
                        >
                          {trial.lead_name || 'Prospect'}
                        </span>
                        {trial.is_rescheduled && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                            Replacement
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trial.lead_phone || trial.lead_email || 'No contact'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(trial.status)}
                    </div>
                  </div>

                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs space-y-1">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>{formatCrmLabel(trial.class_name || 'Class Session')}</span>
                      <span className="text-[11px] text-muted-foreground">{trial.branch_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{trial.booking_date}</span>
                      <span>&bull;</span>
                      <span>{trial.start_time} - {trial.end_time}</span>
                    </div>
                    {trial.trainer_name && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Trainer: {trial.trainer_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>{getConfStatusBadge(trial.confirmation_status, trial.confirmation_channel)}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewingScheduleTrial(trial)}
                      className="h-7 text-xs text-muted-foreground gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      Reminders
                    </Button>
                  </div>

                  {/* Mobile Action buttons */}
                  {canEdit && trial.status !== 'CANCELLED' && trial.status !== 'RESCHEDULED' && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div>
                        {trial.status === 'BOOKED' && trial.confirmation_status !== 'CONFIRMED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmingTrial(trial)}
                            className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                          >
                            <Check className="w-3 h-3" />
                            Confirm Booking
                          </Button>
                        )}
                        {trial.status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAttendedMutation.mutate(trial.id)}
                            disabled={markAttendedMutation.isPending}
                            className="h-7 text-xs gap-1 text-primary border-primary/30 font-semibold"
                          >
                            <UserCheck className="w-3 h-3" />
                            Mark Attended
                          </Button>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground gap-1">
                            <MoreVertical className="w-3.5 h-3.5" />
                            <span>Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const lead = await crmApi.getLead(trial.lead);
                                setSelectedLeadFor360(lead);
                                setIsLead360Open(true);
                              } catch {
                                toast.error('Could not open lead');
                              }
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            View Lead 360
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setViewingScheduleTrial(trial)}>
                            <Bell className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Reminders
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {trial.status === 'BOOKED' && trial.confirmation_status !== 'RESCHEDULE_REQUESTED' && (
                            <DropdownMenuItem onClick={() => requestRescheduleMutation.mutate(trial.id)}>
                              <HelpCircle className="w-3.5 h-3.5 mr-2 text-amber-500" />
                              Req Reschedule
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setReschedulingTrial(trial);
                              setRescheduleDate(trial.booking_date);
                            }}
                          >
                            <RotateCw className="w-3.5 h-3.5 mr-2 text-primary" />
                            Reschedule Slot
                          </DropdownMenuItem>
                          {trial.status !== 'NO_SHOW' && trial.status !== 'ATTENDED' && (
                            <DropdownMenuItem onClick={() => markNoShowMutation.mutate(trial.id)}>
                              <UserX className="w-3.5 h-3.5 mr-2 text-destructive" />
                              Mark No-Show
                            </DropdownMenuItem>
                          )}
                          {trial.status !== 'ATTENDED' && (
                            <DropdownMenuItem
                              onClick={() => setCancellingTrial(trial)}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="w-3.5 h-3.5 mr-2" />
                              Cancel Booking
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </main>

      {/* CONFIRMATION MODAL */}
      {confirmingTrial && (
        <Dialog open={!!confirmingTrial} onOpenChange={(open) => !open && setConfirmingTrial(null)}>
          <DialogContent className="max-w-md w-full bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Confirm Trial Attendance
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Record attendance confirmation from <strong>{confirmingTrial.lead_name}</strong> for session on {confirmingTrial.booking_date} at {confirmingTrial.start_time}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Confirmation Channel *</Label>
                <select
                  value={confirmChannel}
                  onChange={(e) => setConfirmChannel(e.target.value as TrialConfirmationChannel)}
                  className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="PHONE">Phone Call (Staff Outreach)</option>
                  <option value="IN_PERSON">In Person / Walk-in Staff</option>
                  <option value="WHATSAPP">WhatsApp 1-Click / Chat</option>
                  <option value="MANUAL">Manual Staff Confirmation</option>
                  <option value="EMAIL">Email Response</option>
                  <option value="SMS">SMS Reply</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes / Confirmation Details</Label>
                <Input
                  placeholder="e.g. Prospect confirmed they are arriving 10 mins early..."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingTrial(null)}
                disabled={confirmMutation.isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  confirmMutation.mutate({
                    id: confirmingTrial.id,
                    channel: confirmChannel,
                    notes: confirmNotes.trim() || undefined,
                  })
                }
                disabled={confirmMutation.isPending}
                className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Save Confirmation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RESCHEDULE MODAL (CANONICAL LINKED REPLACEMENT WITH CAPACITY LOCK) */}
      {reschedulingTrial && (
        <Dialog open={!!reschedulingTrial} onOpenChange={(open) => !open && setReschedulingTrial(null)}>
          <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border border-border">
            <DialogHeader className="px-6 py-4 border-b border-border bg-card/40 shrink-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-amber-500" />
                Reschedule Real Trial Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Preserves original booking as <strong>RESCHEDULED</strong> and reserves a new real occurrence slot with capacity row locking.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                <div className="font-semibold text-foreground">Current Session:</div>
                <div className="text-muted-foreground">
                  {reschedulingTrial.class_name} on {reschedulingTrial.booking_date} ({reschedulingTrial.start_time} - {reschedulingTrial.end_time}) at {reschedulingTrial.branch_name}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Select New Date *</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlot(null);
                  }}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Occurrences ({rescheduleSlots.length})
                </Label>
                {isRescheduleSlotsLoading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Checking slot capacity...
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                    No active slots available for {rescheduleDate}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {rescheduleSlots.map((slot) => {
                      const isSelected = rescheduleSlot?.occurrence_id === slot.occurrence_id;
                      const isAvailable = slot.is_available && slot.policy_allowed;

                      return (
                        <div
                          key={slot.occurrence_id}
                          onClick={() => {
                            if (isAvailable) setRescheduleSlot(slot);
                          }}
                          className={`p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : isAvailable
                              ? 'border-border/70 hover:border-primary/50 cursor-pointer'
                              : 'border-border/30 bg-muted/20 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-foreground">{slot.class_name}</div>
                            <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                              <span>{slot.start_time} - {slot.end_time}</span>
                              {slot.trainer_name && <span>&bull; {slot.trainer_name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              Total: {slot.total_booked}/{slot.total_capacity}
                            </Badge>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reschedule Reason / Notes</Label>
                <Input
                  placeholder="e.g. Prospect could not attend morning slot due to work..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-border bg-card/40 flex justify-end gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReschedulingTrial(null)}
                disabled={rescheduleMutation.isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  rescheduleMutation.mutate({
                    id: reschedulingTrial.id,
                    newSlotId: rescheduleSlot!.occurrence_id,
                    notes: rescheduleNotes.trim() || undefined,
                  })
                }
                disabled={!rescheduleSlot || !rescheduleSlot.is_available || rescheduleMutation.isPending}
                className="text-xs font-medium"
              >
                {rescheduleMutation.isPending ? 'Reserving...' : 'Confirm Reschedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CANCEL MODAL */}
      {cancellingTrial && (
        <Dialog open={!!cancellingTrial} onOpenChange={(open) => !open && setCancellingTrial(null)}>
          <DialogContent className="max-w-md w-full bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Cancel Trial Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This frees up the reserved occurrence slot. Please document the customer cancellation reason.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cancellation Reason *</Label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  required
                >
                  <option value="" disabled>Select Reason</option>
                  <option value="CUSTOMER_CANCELLED">Customer cancelled directly</option>
                  <option value="SCHEDULE_CONFLICT">Schedule conflict</option>
                  <option value="NOT_INTERESTED">No longer interested in trial</option>
                  <option value="UNABLE_TO_REACH">Unable to reach / contact</option>
                  <option value="HEALTH_ISSUE">Health or injury concern</option>
                  <option value="OTHER">Other / Custom</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Additional Notes</Label>
                <Input
                  placeholder="Details..."
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancellingTrial(null)}
                disabled={cancelMutation.isPending}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancellingTrial.id,
                    reason: cancelReason,
                    notes: cancelNotes.trim() || undefined,
                  })
                }
                disabled={!cancelReason || cancelMutation.isPending}
                className="text-xs font-medium"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* REMINDER SCHEDULE PREVIEW MODAL (DETERMINISTIC SCHEDULE, NO FAKE DELIVERIES) */}
      {viewingScheduleTrial && (
        <Dialog open={!!viewingScheduleTrial} onOpenChange={(open) => !open && setViewingScheduleTrial(null)}>
          <DialogContent className="max-w-md w-full bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Trial Reminder Schedule
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Authoritative reminder timeline calculated from tenant policy for session on {viewingScheduleTrial.booking_date} at {viewingScheduleTrial.start_time}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              {isScheduleLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Calculating policy timeline...
                </div>
              ) : reminderSchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No automated reminders scheduled for this session under current tenant policy.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminderSchedule.map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{pt.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {pt.channel}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled: {new Date(pt.scheduled_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          pt.status === 'PAST'
                            ? 'text-muted-foreground border-border'
                            : 'text-primary border-primary/30 bg-primary/10'
                        }`}
                      >
                        {pt.status === 'PAST' ? 'Past Trigger' : 'Scheduled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingScheduleTrial(null)}
                className="text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BOOK REAL TRIAL MODAL */}
      <BookTrialModal
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        onSuccess={() => {
          refetchTrials();
        }}
      />

      {/* LEAD 360 MODAL */}
      {selectedLeadFor360 && (
        <LeadDetailModal
          open={isLead360Open}
          onOpenChange={(open) => {
            setIsLead360Open(open);
            if (!open) setSelectedLeadFor360(null);
          }}
          lead={selectedLeadFor360}
          onBookTrialClick={(lead) => {
            setIsLead360Open(false);
            setIsBookModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
