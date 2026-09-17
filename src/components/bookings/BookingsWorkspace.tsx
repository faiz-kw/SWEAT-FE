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
} from 'lucide-react';
import { bookingsApi } from '../../services/bookingsApi';
import { Booking, BookingPolicySet, BookingStatus } from '../../types/bookings';
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

interface BookingsWorkspaceProps {
  initialTab?: 'bookings' | 'waitlist' | 'policies';
}

export const BookingsWorkspace: React.FC<BookingsWorkspaceProps> = ({
  initialTab = 'bookings',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist' | 'policies'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] = useState('MEMBER_REQUEST');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('PRESENT');
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Mutations
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
      setActionError(err?.message || 'Failed to record attendance.');
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
      setActionError(err?.message || 'Failed to cancel reservation.');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (occurrenceId: string) => bookingsApi.promoteWaitlist(occurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.user_profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.occurrence_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.branch_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const waitlistBookings = bookings.filter((b) => b.status === 'WAITLISTED');

  // Stats calculation
  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const waitlistCount = waitlistBookings.length;
  const attendedCount = bookings.filter((b) => b.status === 'ATTENDED').length;
  const noShowCount = bookings.filter((b) => b.status === 'NO_SHOW').length;

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Waitlisted
          </span>
        );
      case 'ATTENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Attended
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <UserX className="w-3.5 h-3.5" /> No Show
          </span>
        );
      case 'CANCELLED':
      case 'LATE_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3.5 h-3.5" /> {status === 'LATE_CANCELLED' ? 'Late Cancel' : 'Cancelled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
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
            <span>Refresh</span>
          </Button>
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

        {/* Navigation Tabs - Responsive Horizontal Scroll */}
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
                  placeholder="Search booking #, member, class..."
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="WAITLISTED">Waitlisted</option>
                  <option value="ATTENDED">Attended</option>
                  <option value="NO_SHOW">No Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
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
                          Loading bookings...
                        </td>
                      </tr>
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No bookings found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-primary font-semibold">
                            {booking.booking_number}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-foreground">{booking.user_profile_name || 'Member'}</div>
                            <div className="text-[11px] text-muted-foreground">{booking.user_profile_email || ''}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-foreground font-medium">{booking.occurrence_title || 'Class Session'}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {booking.occurrence_start_at
                                ? new Date(booking.occurrence_start_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Scheduled'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{booking.branch_name || 'Main Studio'}</td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground mr-1.5 border border-border">
                              {booking.booking_source}
                            </span>
                            <span className="text-xs text-muted-foreground">{booking.booking_type}</span>
                          </td>
                          <td className="px-4 py-3.5">{getStatusBadge(booking.status)}</td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            {booking.status === 'CONFIRMED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setIsAttendanceModalOpen(true);
                                  }}
                                  className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                >
                                  Check In
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setIsCancelModalOpen(true);
                                  }}
                                  className="text-xs h-7 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === 'WAITLISTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsCancelModalOpen(true);
                                }}
                                className="text-xs h-7"
                              >
                                Drop Waitlist
                              </Button>
                            )}
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
              <h3 className="text-base font-semibold text-foreground mb-1">Waitlist Management & Priority Ordering</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Waitlist entries are strictly ordered by position. Auto-promotion triggers when confirmed attendees cancel or capacity expands.
              </p>
              {waitlistBookings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No active waitlisted members currently in queue.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {waitlistBookings.map((b) => (
                    <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-600 dark:text-amber-400 text-sm shrink-0">
                          #{b.waitlist_position || 1}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{b.user_profile_name || 'Member'}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.occurrence_title} · Reserved at {new Date(b.reserved_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBooking(b);
                            setIsCancelModalOpen(true);
                          }}
                          className="text-xs h-8 text-muted-foreground hover:text-foreground"
                        >
                          Remove
                        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingPolicies ? (
              <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading policies...
              </div>
            ) : policies.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                No booking policy sets configured.
              </div>
            ) : (
              policies.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{p.name}</h3>
                      <p className="text-xs text-primary font-mono mt-0.5">{p.code}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {p.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Booking Window</span>
                      <span className="text-foreground font-semibold">{p.booking_window_days_in_advance} days advance</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Cancellation Cutoff</span>
                      <span className="text-foreground font-semibold">{p.cancellation_cutoff_minutes} mins before class</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Waitlist Limit</span>
                      <span className="text-foreground font-semibold">{p.waitlist_capacity_limit} slots</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Auto-Promotion</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {p.auto_promote_waitlist ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </PageBody>

      {/* Attendance Modal */}
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

      {/* Cancel Booking Modal */}
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
                Evaluates cancellation policies and restores session units if within window.
              </p>

              {actionError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <Label className="mb-1 block">Reason Code</Label>
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
                <Label className="mb-1 block">Reason Notes</Label>
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
    </div>
  );
};
