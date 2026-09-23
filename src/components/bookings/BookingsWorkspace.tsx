import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Sliders,
  ArrowUpRight,
  UserCheck,
  UserX,
  Plus,
  ArrowRightLeft,
  Info,
  Building2,
  User,
  History,
  Tag,
  Check,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { bookingsApi } from '../../services/bookingsApi';
import { classesApi } from '../../services/classesApi';
import { membershipsApi } from '../../services/membershipsApi';
import {
  Booking,
  BookingPolicySet,
  BookingStatus,
  BookingType,
  BookingSource,
  WaitlistPromotionMode,
  RuleBehavior,
  PolicyStatus,
} from '../../types/bookings';
import { ClassOccurrence } from '../../types/classes';
import { Membership } from '../../types/memberships';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermissions } from '../../lib/permissions';
import { BookTrialModal } from '../crm/BookTrialModal';

interface BookingsWorkspaceProps {
  initialTab?: 'bookings' | 'waitlist' | 'policies';
}

export const BookingsWorkspace: React.FC<BookingsWorkspaceProps> = ({
  initialTab = 'bookings',
}) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('ops.bookings.create');
  const canEdit = can('ops.bookings.edit');
  const canDelete = can('ops.bookings.delete');
  const canPolicies = can('core.settings.edit') || can('ops.classes.create');

  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist' | 'policies'>(() => {
    if (initialTab === 'policies' && !canPolicies) return 'bookings';
    return initialTab;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Booking & Action Modals
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [reschedulingTrialBooking, setReschedulingTrialBooking] = useState<any | null>(null);

  // Form states for Actions
  const [cancelReasonCode, setCancelReasonCode] = useState('MEMBER_REQUEST');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('PRESENT');
  const [rescheduleOccurrenceId, setRescheduleOccurrenceId] = useState('');
  const [rescheduleReasonCode, setRescheduleReasonCode] = useState('MEMBER_REQUEST');
  const [rescheduleReasonText, setRescheduleReasonText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states for New Booking
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<ClassOccurrence | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [createBookingType, setCreateBookingType] = useState<BookingType>('MEMBER');
  const [createBookingSource, setCreateBookingSource] = useState<BookingSource>('FRONT_DESK');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for Policy Configuration
  const [policyForm, setPolicyForm] = useState<Partial<BookingPolicySet>>({
    name: '',
    code: '',
    rule_behavior: 'OPERATIONAL',
    max_upcoming_bookings: 3,
    booking_open_minutes_before: 10080, // 7 days
    booking_close_minutes_before: 30,
    allow_waitlist: true,
    waitlist_capacity: 10,
    auto_waitlist_promotion: true,
    waitlist_promotion_mode: 'FIFO',
    max_reschedules: 2,
    allow_trial: true,
    max_trial_bookings: 1,
    allow_cross_branch: false,
    require_parq: false,
    status: 'ACTIVE',
  });
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Queries
  const {
    data: bookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: () =>
      bookingsApi.getBookings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const {
    data: policies = [],
    isLoading: loadingPolicies,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: ['booking-policies'],
    queryFn: () => bookingsApi.getBookingPolicySets(),
  });

  // Query bookable members when Create modal is open
  const { data: bookableMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['bookable-members', memberSearchTerm],
    queryFn: () => bookingsApi.getBookableMembers(memberSearchTerm),
    enabled: isCreateModalOpen,
  });

  // Query scheduled occurrences when Create or Reschedule modal is open
  const { data: scheduledOccurrences = [], isLoading: loadingOccurrences } = useQuery({
    queryKey: ['scheduled-occurrences'],
    queryFn: () => classesApi.getOccurrences({ status: 'SCHEDULED' }),
    enabled: isCreateModalOpen || isRescheduleModalOpen,
  });

  // Query member memberships when a member is selected
  const { data: memberMemberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['member-memberships', selectedMember?.id],
    queryFn: () =>
      membershipsApi.getMemberships({
        user_profile_id: selectedMember?.id,
        status: 'ACTIVE',
      }),
    enabled: !!selectedMember?.id && isCreateModalOpen,
  });

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: (data: {
      user_profile: string;
      occurrence: string;
      booking_type: string;
      booking_source: string;
      membership?: string;
    }) => bookingsApi.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsCreateModalOpen(false);
      setSelectedMember(null);
      setSelectedOccurrence(null);
      setSelectedMembershipId('');
      setCreateError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create booking.';
      setCreateError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: string;
    }) => bookingsApi.recordAttendance(bookingId, { status, check_in_method: 'MANUAL' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      setIsAttendanceModalOpen(false);
      setSelectedBooking(null);
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to record attendance.';
      setActionError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({
      bookingId,
      reasonCode,
      reasonText,
    }: {
      bookingId: string;
      reasonCode: string;
      reasonText: string;
    }) =>
      bookingsApi.cancelBooking(bookingId, {
        reason_code: reasonCode,
        reason_text: reasonText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsCancelModalOpen(false);
      setSelectedBooking(null);
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to cancel reservation.';
      setActionError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      bookingId,
      toOccurrenceId,
      reasonCode,
      reasonText,
    }: {
      bookingId: string;
      toOccurrenceId: string;
      reasonCode: string;
      reasonText: string;
    }) =>
      bookingsApi.rescheduleBooking(bookingId, {
        to_occurrence_id: toOccurrenceId,
        reason_code: reasonCode,
        reason_text: reasonText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsRescheduleModalOpen(false);
      setSelectedBooking(null);
      setRescheduleOccurrenceId('');
      setRescheduleReasonText('');
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to reschedule reservation.';
      setActionError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const confirmBookingMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.confirmBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['trial-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to confirm booking.';
      alert(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (occurrenceId: string) => bookingsApi.promoteWaitlist(occurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to promote waitlist.';
      alert(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: (data: Partial<BookingPolicySet>) => bookingsApi.createBookingPolicySet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-policies'] });
      setIsPolicyModalOpen(false);
      setPolicyError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save policy.';
      setPolicyError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    },
  });

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.booking_number?.toLowerCase().includes(term) ||
      b.user_profile_name?.toLowerCase().includes(term) ||
      b.occurrence_title?.toLowerCase().includes(term) ||
      b.branch_name?.toLowerCase().includes(term)
    );
  });

  const waitlistBookings = bookings.filter((b) => b.status === 'WAITLISTED');

  // KPI Metrics Calculation
  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const waitlistCount = waitlistBookings.length;
  const attendedCount = bookings.filter((b) => b.status === 'ATTENDED').length;
  const noShowCount = bookings.filter((b) => b.status === 'NO_SHOW').length;

  const getStatusBadge = (status: BookingStatus | string) => {
    switch (status) {
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="size-3" /> Booked
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-3" /> Confirmed
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="size-3" /> Waitlisted
          </span>
        );
      case 'ATTENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <UserCheck className="size-3" /> Attended
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <UserX className="size-3" /> No Show
          </span>
        );
      case 'CANCELLED':
      case 'LATE_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <XCircle className="size-3" /> {status === 'LATE_CANCELLED' ? 'Late Cancel' : 'Cancelled'}
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ArrowRightLeft className="size-3" /> Rescheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Page Header with Real Actions */}
      <PageHeader
        title="Class Bookings & Waitlists"
        subtitle="Real-time session reservations, capacity enforcement, automated waitlist promotions, and front-desk check-in."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Operations · Bookings
            </span>
            <span className="text-muted-foreground text-xs">
              Total <span className="font-semibold text-foreground">{totalBookings}</span> records
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchBookings();
                refetchPolicies();
              }}
              title="Refresh"
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setCreateError(null);
                  setSelectedMember(null);
                  setSelectedOccurrence(null);
                  setSelectedMembershipId('');
                  setIsCreateModalOpen(true);
                }}
                className="gap-1.5 shadow-2xs"
              >
                <Plus className="size-4" />
                <span>New Booking</span>
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* Responsive KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiTile label="Total Bookings" value={totalBookings} hint="All lifecycle states" />
          <KpiTile label="Confirmed" value={confirmedCount} hint="Active seat reservations" tone="positive" />
          <KpiTile label="Waitlisted" value={waitlistCount} hint="Pending auto-promotion" tone="warning" />
          <KpiTile label="Attended" value={attendedCount} hint="Verified check-ins" tone="positive" />
          <KpiTile label="No-Shows" value={noShowCount} hint="Penalty strikes logged" tone="negative" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Active Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'waitlist'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Waitlist Queue ({waitlistCount})
          </button>
          {canPolicies && (
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'policies'
                  ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Booking Policies ({policies.length})
            </button>
          )}
        </div>

        {/* Tab Content: Bookings */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search booking #, member name, class title, branch..."
                  className="pl-9 bg-background text-xs sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="WAITLISTED">Waitlisted</option>
                  <option value="ATTENDED">Attended</option>
                  <option value="NO_SHOW">No Show</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                </select>
              </div>
            </div>

            {/* Bookings Table / Cards */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Booking #</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Class Occurrence</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Source / Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingBookings ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                          Loading reservations from tenant database...
                        </td>
                      </tr>
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <p className="text-sm font-medium text-foreground mb-1">No bookings found</p>
                          <p className="text-xs text-muted-foreground mb-4">
                            {searchTerm || statusFilter !== 'ALL'
                              ? 'Try adjusting your search criteria or status filter.'
                              : 'Create your first class reservation to get started.'}
                          </p>
                          {canCreate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMember(null);
                                setSelectedOccurrence(null);
                                setSelectedMembershipId('');
                                setCreateError(null);
                                setIsCreateModalOpen(true);
                              }}
                              className="gap-1.5 text-xs"
                            >
                              <Plus className="size-3.5" />
                              <span>Create Booking</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-primary font-semibold">
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsDetailsModalOpen(true);
                              }}
                              className="hover:underline text-left cursor-pointer"
                            >
                              {booking.booking_number}
                            </button>
                            <div className="text-[10px] text-muted-foreground font-sans font-normal">
                              {new Date(booking.booked_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-foreground">
                              {booking.user_profile_name || 'Member'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {booking.user_profile_email || ''}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-foreground font-medium">
                              {booking.occurrence_title || 'Class Session'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {booking.occurrence_date} ·{' '}
                              {booking.occurrence_start_at
                                ? new Date(booking.occurrence_start_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {booking.branch_name || 'Main Studio'}
                          </td>
                          <td className="px-4 py-3.5">
                            {booking.is_trial || booking.booking_source === 'TRIAL' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                TRIAL / PROSPECT
                              </span>
                            ) : (
                              <>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground mr-1.5 border border-border">
                                  {booking.booking_source}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {booking.booking_type === 'MEMBER' ? 'MEMBER / CLASS BOOKING' : booking.booking_type}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3.5">{getStatusBadge(booking.status)}</td>
                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {booking.is_trial || booking.booking_source === 'TRIAL' ? (
                              <>
                                {/* TRIAL ACTIONS */}
                                {canEdit && (booking.status === 'BOOKED' || (booking as any).confirmation_status === 'PENDING') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => confirmBookingMutation.mutate(booking.id)}
                                    disabled={confirmBookingMutation.isPending}
                                    className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                                  >
                                    Confirm
                                  </Button>
                                )}
                                {canEdit && booking.status !== 'CANCELLED' && booking.status !== 'RESCHEDULED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setReschedulingTrialBooking(booking)}
                                    className="text-xs h-7 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                  >
                                    Reschedule
                                  </Button>
                                )}
                                {canEdit && (booking.status === 'CONFIRMED' || booking.status === 'BOOKED') && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => attendanceMutation.mutate({ bookingId: booking.id, status: 'PRESENT' })}
                                      disabled={attendanceMutation.isPending}
                                      className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    >
                                      Check In
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => attendanceMutation.mutate({ bookingId: booking.id, status: 'NO_SHOW' })}
                                      disabled={attendanceMutation.isPending}
                                      className="text-xs h-7 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                    >
                                      No Show
                                    </Button>
                                  </>
                                )}
                                {(canDelete || canEdit) && booking.status !== 'CANCELLED' && booking.status !== 'RESCHEDULED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setCancelReasonText('');
                                      setActionError(null);
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="text-xs h-7 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {booking.status === 'CONFIRMED' && (
                                  <>
                                    {canEdit && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setActionError(null);
                                          setIsAttendanceModalOpen(true);
                                        }}
                                        className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                      >
                                        Check In
                                      </Button>
                                    )}
                                    {canEdit && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setRescheduleOccurrenceId('');
                                          setRescheduleReasonText('');
                                          setActionError(null);
                                          setIsRescheduleModalOpen(true);
                                        }}
                                        className="text-xs h-7 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                      >
                                        Reschedule
                                      </Button>
                                    )}
                                    {(canDelete || canEdit) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setCancelReasonText('');
                                          setActionError(null);
                                          setIsCancelModalOpen(true);
                                        }}
                                        className="text-xs h-7 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                            {booking.status === 'WAITLISTED' && (
                              <>
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => promoteMutation.mutate(booking.occurrence)}
                                    disabled={promoteMutation.isPending}
                                    className="text-xs h-7 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                  >
                                    Promote
                                  </Button>
                                )}
                                {(canDelete || canEdit) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setCancelReasonText('');
                                      setActionError(null);
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                                  >
                                    Drop
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsDetailsModalOpen(true);
                              }}
                              className="text-xs h-7 text-muted-foreground hover:text-foreground"
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Waitlist Queue */}
        {activeTab === 'waitlist' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Waitlist Management & Priority Ordering
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Waitlist entries consume ZERO entitlements until promoted. When confirmed spots open, atomic revalidation occurs before confirmation.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 self-start sm:self-auto">
                  {waitlistBookings.length} In Queue
                </span>
              </div>

              {waitlistBookings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No active waitlisted members currently in queue across sessions.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {waitlistBookings.map((b) => (
                    <div
                      key={b.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-600 dark:text-amber-400 text-sm shrink-0">
                          #{b.waitlist_position || 1}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {b.user_profile_name || 'Member'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.occurrence_title} · {b.occurrence_date} ({b.branch_name}) · Reserved at{' '}
                            {new Date(b.booked_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteMutation.mutate(b.occurrence)}
                            disabled={promoteMutation.isPending}
                            className="text-xs h-8 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
                          >
                            <ArrowUpRight className="size-3.5" />
                            Promote to Confirmed
                          </Button>
                        )}
                        {(canDelete || canEdit) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBooking(b);
                              setCancelReasonText('Removed from waitlist queue');
                              setIsCancelModalOpen(true);
                            }}
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Policies */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Operational Booking Policies</h3>
                <p className="text-xs text-muted-foreground">
                  Configured rule sets governing advance booking windows, waitlist capacities, cross-branch access, and trial limits.
                </p>
              </div>
              {canPolicies && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPolicyError(null);
                    setIsPolicyModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Configure Policy</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingPolicies ? (
                <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  Loading policy sets...
                </div>
              ) : policies.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
                  <Shield className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium text-foreground">No booking policy sets configured</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create a default policy to define booking windows and waitlist rules.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPolicyError(null);
                      setIsPolicyModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    <span>Create Policy Set</span>
                  </Button>
                </div>
              ) : (
                policies.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-base">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-primary font-mono">{p.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                            {p.rule_behavior}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-muted/40 p-3 rounded-lg border border-border/60">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Max Upcoming</span>
                        <span className="text-foreground font-semibold">{p.max_upcoming_bookings} slots</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Booking Window</span>
                        <span className="text-foreground font-semibold">
                          {p.booking_open_minutes_before ? `${Math.round(p.booking_open_minutes_before / 60)}h open` : 'Open'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Booking Cutoff</span>
                        <span className="text-foreground font-semibold">
                          {p.booking_close_minutes_before ? `${p.booking_close_minutes_before}m before` : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Waitlist</span>
                        <span className="text-foreground font-semibold">
                          {p.allow_waitlist ? `Yes (${p.waitlist_capacity || '∞'})` : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Auto Promotion</span>
                        <span className="text-foreground font-semibold">
                          {p.auto_waitlist_promotion ? `${p.waitlist_promotion_mode}` : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Max Reschedules</span>
                        <span className="text-foreground font-semibold">{p.max_reschedules ?? 'No limit'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </PageBody>

      {/* CREATE BOOKING DIALOG (Real Member + Class Occurrence Selectors) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-5 text-primary" />
              Create New Class Reservation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>{createError}</div>
              </div>
            )}

            {/* Step 1: Member Selector */}
            <div>
              <Label className="mb-1 block font-semibold">1. Select Member</Label>
              {selectedMember ? (
                <div className="flex items-center justify-between p-3 bg-muted/40 border border-primary/30 rounded-lg">
                  <div>
                    <div className="font-semibold text-foreground">
                      {selectedMember.first_name_snapshot} {selectedMember.last_name_snapshot}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedMember.user?.email || selectedMember.email_snapshot} ·{' '}
                      {selectedMember.user?.phone || selectedMember.phone_snapshot || 'No phone'} · Member #{' '}
                      {selectedMember.membership_number || selectedMember.id?.slice(0, 8)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedMember(null);
                      setSelectedMembershipId('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      placeholder="Search member by name, email, phone, or membership #..."
                      className="pl-8 text-xs bg-background"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border/60 bg-card">
                    {loadingMembers ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Searching active members...
                      </div>
                    ) : bookableMembers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No active bookable members found.
                      </div>
                    ) : (
                      bookableMembers.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMember(m)}
                          className="p-2.5 hover:bg-muted/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {m.first_name_snapshot} {m.last_name_snapshot}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {m.user?.email || m.email_snapshot} ·{' '}
                              {m.membership_number ? `#${m.membership_number}` : ''}
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Active Membership (if member selected) */}
            {selectedMember && (
              <div>
                <Label className="mb-1 block font-semibold">2. Member Package / Membership</Label>
                {loadingMemberships ? (
                  <div className="text-xs text-muted-foreground">Loading active packages...</div>
                ) : memberMemberships.length === 0 ? (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-lg">
                    Member has no active membership package. May proceed as Walk-In / Trial if permitted by policy.
                  </div>
                ) : (
                  <select
                    value={selectedMembershipId}
                    onChange={(e) => setSelectedMembershipId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Use Active Membership Entitlement --</option>
                    {memberMemberships.map((mem: Membership) => (
                      <option key={mem.id} value={mem.id}>
                        {mem.membership_number} — {mem.package_name || 'Membership'} (Status: {mem.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Step 3: Class Occurrence Selector */}
            <div>
              <Label className="mb-1 block font-semibold">3. Select Class Session (Occurrence)</Label>
              {selectedOccurrence ? (
                <div className="flex items-center justify-between p-3 bg-muted/40 border border-primary/30 rounded-lg">
                  <div>
                    <div className="font-semibold text-foreground">
                      {selectedOccurrence.template_name || selectedOccurrence.class_template_name || 'Session'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedOccurrence.occurrence_date} ·{' '}
                      {new Date(selectedOccurrence.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(selectedOccurrence.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · Branch: {selectedOccurrence.branch_name || 'Main Studio'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedOccurrence(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border/60 bg-card">
                  {loadingOccurrences ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Loading scheduled class sessions...
                    </div>
                  ) : scheduledOccurrences.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No scheduled occurrences available.
                    </div>
                  ) : (
                    scheduledOccurrences.map((occ: ClassOccurrence) => (
                      <div
                        key={occ.id}
                        onClick={() => setSelectedOccurrence(occ)}
                        className="p-2.5 hover:bg-muted/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            {occ.template_name || occ.class_template_name || 'Class Occurrence'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {occ.occurrence_date} ({new Date(occ.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) · {occ.branch_name || 'Branch'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                            Cap: {occ.capacity_snapshot || 20}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Booking Type & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Booking Type</Label>
                <select
                  value={createBookingType}
                  onChange={(e) => setCreateBookingType(e.target.value as BookingType)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MEMBER">Member (Entitlement)</option>
                  <option value="TRIAL">Trial Session</option>
                  <option value="WALK_IN">Walk In</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                  <option value="PAY_PER_USE">Pay Per Use</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Booking Source</Label>
                <select
                  value={createBookingSource}
                  onChange={(e) => setCreateBookingSource(e.target.value as BookingSource)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="FRONT_DESK">Front Desk</option>
                  <option value="ADMIN">Admin Console</option>
                  <option value="WEB">Web Portal</option>
                  <option value="MOBILE_APP">Mobile App</option>
                  <option value="KIOSK">Self-Service Kiosk</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setSelectedMember(null);
                setSelectedOccurrence(null);
                setCreateError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedMember || !selectedOccurrence) {
                  setCreateError('Please select both a member and a class session.');
                  return;
                }
                createBookingMutation.mutate({
                  user_profile: selectedMember.id,
                  occurrence: selectedOccurrence.id,
                  booking_type: createBookingType,
                  booking_source: createBookingSource,
                  membership: selectedMembershipId || undefined,
                });
              }}
              disabled={createBookingMutation.isPending || !selectedMember || !selectedOccurrence}
            >
              {createBookingMutation.isPending ? 'Validating & Reserving...' : 'Confirm Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE MODAL (Atomic Swap) */}
      <Dialog open={isRescheduleModalOpen && !!selectedBooking} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-blue-500" />
              Reschedule Session Reservation
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  Current: {selectedBooking.occurrence_title}
                </div>
                <div className="text-muted-foreground">
                  {selectedBooking.occurrence_date} ({selectedBooking.branch_name})
                </div>
                <div className="text-[11px] text-primary font-mono">
                  Reservation #{selectedBooking.booking_number}
                </div>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <Label className="mb-1 block font-semibold">New Class Session</Label>
                <select
                  value={rescheduleOccurrenceId}
                  onChange={(e) => setRescheduleOccurrenceId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Choose New Session --</option>
                  {scheduledOccurrences
                    .filter((o) => o.id !== selectedBooking.occurrence)
                    .map((occ: ClassOccurrence) => (
                      <option key={occ.id} value={occ.id}>
                        {occ.template_name || occ.class_template_name} · {occ.occurrence_date} (
                        {new Date(occ.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) —{' '}
                        {occ.branch_name || 'Studio'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label className="mb-1 block font-semibold">Reason Code</Label>
                <select
                  value={rescheduleReasonCode}
                  onChange={(e) => setRescheduleReasonCode(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MEMBER_REQUEST">Member Request</option>
                  <option value="SCHEDULE_CONFLICT">Schedule Conflict</option>
                  <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                  <option value="FACILITY_CLOSURE">Facility Closure</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block font-semibold">Reason Notes</Label>
                <textarea
                  value={rescheduleReasonText}
                  onChange={(e) => setRescheduleReasonText(e.target.value)}
                  placeholder="Optional notes for reschedule history log..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsRescheduleModalOpen(false);
                setSelectedBooking(null);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedBooking &&
                rescheduleMutation.mutate({
                  bookingId: selectedBooking.id,
                  toOccurrenceId: rescheduleOccurrenceId,
                  reasonCode: rescheduleReasonCode,
                  reasonText: rescheduleReasonText,
                })
              }
              disabled={rescheduleMutation.isPending || !rescheduleOccurrenceId}
            >
              {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BOOKING DETAILS DIALOG (Audit / History / Timeline) */}
      <Dialog open={isDetailsModalOpen && !!selectedBooking} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-5 text-primary" />
              Reservation Record & Audit
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 border border-border rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Reservation #</span>
                  <span className="font-mono font-bold text-foreground text-xs">{selectedBooking.booking_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Status</span>
                  <div>{getStatusBadge(selectedBooking.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Member</span>
                  <span className="font-semibold text-foreground">{selectedBooking.user_profile_name || 'Member'}</span>
                  <div className="text-[10px] text-muted-foreground">{selectedBooking.user_profile_email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Class Session</span>
                  <span className="font-semibold text-foreground">{selectedBooking.occurrence_title}</span>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedBooking.occurrence_date} ({selectedBooking.branch_name})
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Type / Source</span>
                  <span className="text-foreground">
                    {selectedBooking.booking_type} via {selectedBooking.booking_source}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Reserved At</span>
                  <span className="text-foreground">
                    {new Date(selectedBooking.booked_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status History */}
              <div>
                <Label className="mb-2 block font-semibold flex items-center gap-1.5">
                  <History className="size-3.5 text-primary" /> Status Lifecycle History
                </Label>
                {selectedBooking.status_history && selectedBooking.status_history.length > 0 ? (
                  <div className="border border-border rounded-lg divide-y divide-border/60 bg-card overflow-hidden">
                    {selectedBooking.status_history.map((h: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-foreground">
                            {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                          </span>
                          {h.reason && (
                            <div className="text-[11px] text-muted-foreground">Reason: {h.reason}</div>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {new Date(h.changed_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No status transitions recorded.</div>
                )}
              </div>

              {/* Reschedules */}
              {selectedBooking.reschedules && selectedBooking.reschedules.length > 0 && (
                <div>
                  <Label className="mb-2 block font-semibold flex items-center gap-1.5">
                    <ArrowRightLeft className="size-3.5 text-blue-500" /> Reschedule History
                  </Label>
                  <div className="border border-border rounded-lg divide-y divide-border/60 bg-card">
                    {selectedBooking.reschedules.map((r: any, idx: number) => (
                      <div key={idx} className="p-2.5 text-xs">
                        <div className="font-semibold text-foreground">
                          Rescheduled to session on {new Date(r.rescheduled_at).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Reason: {r.reason_code} {r.reason_text ? `— ${r.reason_text}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailsModalOpen(false);
                setSelectedBooking(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ATTENDANCE CHECK-IN MODAL */}
      <Dialog open={isAttendanceModalOpen && !!selectedBooking} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-500" />
              Record Class Attendance
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Mark attendance state for booking{' '}
                <span className="text-primary font-mono font-semibold">{selectedBooking.booking_number}</span>.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <Label className="mb-1 block">Attendance Status</Label>
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PRESENT">Present (On Time)</option>
                  <option value="LATE">Late Check-In</option>
                  <option value="NO_SHOW">No Show (Logs Strike)</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAttendanceModalOpen(false);
                setSelectedBooking(null);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedBooking &&
                attendanceMutation.mutate({
                  bookingId: selectedBooking.id,
                  status: attendanceStatus,
                })
              }
              disabled={attendanceMutation.isPending}
            >
              {attendanceMutation.isPending ? 'Saving...' : 'Confirm Attendance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL BOOKING MODAL */}
      <Dialog open={isCancelModalOpen && !!selectedBooking} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500" />
              Cancel Reservation
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Evaluates cancellation policies and atomically restores session units if within window.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <Label className="mb-1 block font-semibold">Reason Code</Label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MEMBER_REQUEST">Member Request</option>
                  <option value="MEDICAL_EMERGENCY">Medical / Emergency</option>
                  <option value="SCHEDULE_CONFLICT">Schedule Conflict</option>
                  <option value="FACILITY_CLOSURE">Facility Closure / Rescheduled</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block font-semibold">Reason Notes</Label>
                <textarea
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="Optional context for cancellation log..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelModalOpen(false);
                setSelectedBooking(null);
                setActionError(null);
              }}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedBooking &&
                cancelMutation.mutate({
                  bookingId: selectedBooking.id,
                  reasonCode: cancelReasonCode,
                  reasonText: cancelReasonText,
                })
              }
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIGURE POLICY MODAL (Real Backend Fields) */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              Configure Booking Policy Set
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {policyError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                {policyError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Policy Name</Label>
                <Input
                  type="text"
                  value={policyForm.name || ''}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  placeholder="e.g. Standard Member Policy"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Policy Code</Label>
                <Input
                  type="text"
                  value={policyForm.code || ''}
                  onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value })}
                  placeholder="e.g. POL_STD_01"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Rule Behavior</Label>
                <select
                  value={policyForm.rule_behavior || 'OPERATIONAL'}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, rule_behavior: e.target.value as RuleBehavior })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="CONTRACTUAL">CONTRACTUAL</option>
                  <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Max Upcoming Bookings</Label>
                <Input
                  type="number"
                  value={policyForm.max_upcoming_bookings || 3}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, max_upcoming_bookings: parseInt(e.target.value) || 1 })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Booking Open (Mins Before)</Label>
                <Input
                  type="number"
                  value={policyForm.booking_open_minutes_before || 10080}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      booking_open_minutes_before: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Booking Close (Mins Before)</Label>
                <Input
                  type="number"
                  value={policyForm.booking_close_minutes_before || 30}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      booking_close_minutes_before: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Allow Waitlist</Label>
                <select
                  value={policyForm.allow_waitlist ? 'true' : 'false'}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, allow_waitlist: e.target.value === 'true' })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Waitlist Capacity</Label>
                <Input
                  type="number"
                  value={policyForm.waitlist_capacity || 10}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, waitlist_capacity: parseInt(e.target.value) || 0 })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Promotion Mode</Label>
                <select
                  value={policyForm.waitlist_promotion_mode || 'FIFO'}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      waitlist_promotion_mode: e.target.value as WaitlistPromotionMode,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="FIFO">FIFO</option>
                  <option value="PRIORITY">PRIORITY</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-semibold">Max Reschedules</Label>
                <Input
                  type="number"
                  value={policyForm.max_reschedules || 2}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, max_reschedules: parseInt(e.target.value) || 0 })
                  }
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block font-semibold">Status</Label>
                <select
                  value={policyForm.status || 'ACTIVE'}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, status: e.target.value as PolicyStatus })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsPolicyModalOpen(false);
                setPolicyError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!policyForm.name || !policyForm.code) {
                  setPolicyError('Policy Name and Code are required.');
                  return;
                }
                createPolicyMutation.mutate(policyForm);
              }}
              disabled={createPolicyMutation.isPending}
            >
              {createPolicyMutation.isPending ? 'Saving...' : 'Save Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRIAL RESCHEDULE MODAL */}
      <BookTrialModal
        open={!!reschedulingTrialBooking}
        onOpenChange={(open) => !open && setReschedulingTrialBooking(null)}
        mode="reschedule"
        existingTrial={
          reschedulingTrialBooking
            ? {
                id: reschedulingTrialBooking.id,
                lead: reschedulingTrialBooking.lead_id || reschedulingTrialBooking.user_profile || '',
                lead_name: reschedulingTrialBooking.user_profile_name || reschedulingTrialBooking.member_name || '',
                branch: reschedulingTrialBooking.branch || '',
                branch_name: reschedulingTrialBooking.branch_name || '',
                class_name: reschedulingTrialBooking.occurrence_title || reschedulingTrialBooking.class_name || '',
                booking_date: reschedulingTrialBooking.occurrence_date || '',
                scheduled_start: reschedulingTrialBooking.occurrence_start_at || reschedulingTrialBooking.start_at || '',
                start_time: reschedulingTrialBooking.start_time || '',
                end_time: reschedulingTrialBooking.end_time || '',
                trainer_name: reschedulingTrialBooking.trainer_name || 'Unassigned',
                status: reschedulingTrialBooking.status,
                confirmation_status: reschedulingTrialBooking.confirmation_status || 'PENDING',
                organization: '',
                class_occurrence: reschedulingTrialBooking.occurrence || '',
                trial_type: 'GENERAL',
                booking_source: reschedulingTrialBooking.booking_source || 'TRIAL',
                created_at: reschedulingTrialBooking.booked_at || reschedulingTrialBooking.created_at || '',
                updated_at: reschedulingTrialBooking.updated_at || '',
              }
            : null
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }}
      />
    </div>
  );
};
