import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Sliders,
  ArrowUpRight,
  ShieldAlert,
  Layers,
  ChevronRight,
  Activity,
  UserCheck,
  UserX,
} from 'lucide-react';
import { bookingsApi } from '../../services/bookingsApi';
import { Booking, BookingPolicySet, BookingStatus } from '../../types/bookings';

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
      setActionError(err?.message || 'Failed to cancel booking.');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (occurrenceId: string) => bookingsApi.promoteWaitlist(occurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to promote waitlist member.');
    },
  });

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.user_profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.occurrence_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.branch_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const waitlistBookings = bookings.filter(
    (b) => b.status === 'WAITLISTED'
  );

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Waitlisted
          </span>
        );
      case 'ATTENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Attended
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <UserX className="w-3.5 h-3.5" /> No Show
          </span>
        );
      case 'CANCELLED':
      case 'LATE_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <XCircle className="w-3.5 h-3.5" /> {status === 'LATE_CANCELLED' ? 'Late Cancel' : 'Cancelled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-indigo-400" />
            Class Bookings & Waitlists
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time session reservations, capacity enforcement, automated waitlist promotions, and front-desk check-in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchBookings();
              refetchPolicies();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Bookings</div>
          <div className="text-2xl font-bold text-white mt-1">{totalBookings}</div>
          <div className="text-xs text-zinc-500 mt-1">All lifecycle states</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Confirmed</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{confirmedCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Active seat reservations</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Waitlisted</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{waitlistCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Pending auto-promotion</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">Attended</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{attendedCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Verified check-ins</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">No-Shows</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{noShowCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Penalty strikes logged</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Active Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'waitlist'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Waitlist Queue ({waitlistCount})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'policies'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Booking & Cancellation Policies ({policies.length})
        </button>
      </div>

      {/* Tab Content: Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search booking #, member, class..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
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
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Booking #</th>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Class Occurrence</th>
                    <th className="px-5 py-3.5">Branch</th>
                    <th className="px-5 py-3.5">Source / Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loadingBookings ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        No bookings found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-5 py-4 font-mono text-xs text-indigo-300 font-semibold">
                          {booking.booking_number}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{booking.user_profile_name || 'Member'}</div>
                          <div className="text-xs text-zinc-500">{booking.user_profile_email || ''}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-zinc-200 font-medium">{booking.occurrence_title || 'Class Session'}</div>
                          <div className="text-xs text-zinc-500">
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
                        <td className="px-5 py-4 text-xs text-zinc-400">{booking.branch_name || 'Main Studio'}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 mr-1.5">
                            {booking.booking_source}
                          </span>
                          <span className="text-xs text-zinc-400">{booking.booking_type}</span>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(booking.status)}</td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {booking.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsAttendanceModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsCancelModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'WAITLISTED' && (
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsCancelModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            >
                              Drop Waitlist
                            </button>
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
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-base font-semibold text-white mb-1">Waitlist Management & Priority Ordering</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Waitlist entries are strictly ordered by position. Auto-promotion triggers when confirmed attendees cancel or capacity expands.
            </p>
            {waitlistBookings.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No active waitlisted members currently in queue.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {waitlistBookings.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-400 text-sm">
                        #{b.waitlist_position || 1}
                      </div>
                      <div>
                        <div className="font-medium text-white">{b.user_profile_name || 'Member'}</div>
                        <div className="text-xs text-zinc-400">
                          {b.occurrence_title} · Reserved at {new Date(b.reserved_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => promoteMutation.mutate(b.occurrence)}
                        disabled={promoteMutation.isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition flex items-center gap-1.5"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Promote to Confirmed
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setIsCancelModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                      >
                        Remove
                      </button>
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
            <div className="col-span-2 py-12 text-center text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
              Loading policies...
            </div>
          ) : policies.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-zinc-500">
              No booking policy sets configured.
            </div>
          ) : (
            policies.map((p) => (
              <div key={p.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base">{p.name}</h3>
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">{p.code}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {p.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-500 block">Booking Window</span>
                    <span className="text-zinc-200 font-semibold">{p.booking_window_days_in_advance} days advance</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cancellation Cutoff</span>
                    <span className="text-zinc-200 font-semibold">{p.cancellation_cutoff_minutes} mins before class</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Waitlist Limit</span>
                    <span className="text-zinc-200 font-semibold">{p.waitlist_capacity_limit} slots</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Auto-Promotion</span>
                    <span className="text-emerald-400 font-semibold">
                      {p.auto_promote_waitlist ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Attendance Modal */}
      {isAttendanceModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Record Class Attendance
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Mark attendance state for booking <span className="text-indigo-400 font-mono">{selectedBooking.booking_number}</span>.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Attendance Status</label>
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRESENT">Present (On Time)</option>
                  <option value="LATE">Late Check-In</option>
                  <option value="NO_SHOW">No Show (Logs Strike)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsAttendanceModalOpen(false);
                  setSelectedBooking(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  attendanceMutation.mutate({
                    bookingId: selectedBooking.id,
                    status: attendanceStatus,
                  })
                }
                disabled={attendanceMutation.isPending}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
              >
                {attendanceMutation.isPending ? 'Saving...' : 'Confirm Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {isCancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Cancel Reservation
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Evaluates cancellation policies and restores session units if within window.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason Code</label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEMBER_REQUEST">Member Request</option>
                  <option value="MEDICAL_EMERGENCY">Medical / Emergency</option>
                  <option value="SCHEDULE_CONFLICT">Schedule Conflict</option>
                  <option value="FACILITY_CLOSURE">Facility Closure / Rescheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason Notes</label>
                <textarea
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="Optional context for cancellation log..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setSelectedBooking(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Keep Booking
              </button>
              <button
                onClick={() =>
                  cancelMutation.mutate({
                    bookingId: selectedBooking.id,
                    reasonCode: cancelReasonCode,
                    reasonText: cancelReasonText,
                  })
                }
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
