import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck,
  ShieldAlert,
  Clock,
  QrCode,
  Radio,
  Search,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Lock,
  DoorOpen,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { bookingsApi } from '../../services/bookingsApi';
import {
  AttendanceRecord,
  AccessEvent,
  MemberAttendanceState,
  AttendancePolicySet,
} from '../../types/bookings';

interface AttendanceWorkspaceProps {
  initialTab?: 'attendance' | 'discipline' | 'access' | 'policies';
}

export const AttendanceWorkspace: React.FC<AttendanceWorkspaceProps> = ({
  initialTab = 'attendance',
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'discipline' | 'access' | 'policies'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Queries
  const {
    data: attendanceRecords = [],
    isLoading: loadingAttendance,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['attendance-records', statusFilter],
    queryFn: () =>
      bookingsApi.getAttendanceRecords({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const {
    data: memberStates = [],
    isLoading: loadingStates,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ['member-attendance-states'],
    queryFn: () => bookingsApi.getMemberAttendanceStates(),
  });

  const {
    data: accessEvents = [],
    isLoading: loadingAccess,
    refetch: refetchAccess,
  } = useQuery({
    queryKey: ['access-events'],
    queryFn: () => bookingsApi.getAccessEvents(),
  });

  const {
    data: attendancePolicies = [],
    isLoading: loadingPolicies,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: ['attendance-policies'],
    queryFn: () => bookingsApi.getAttendancePolicySets(),
  });

  // Metrics
  const totalCheckIns = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
  const noShowCount = attendanceRecords.filter((r) => r.status === 'NO_SHOW').length;
  const suspendedMembers = memberStates.filter((s) => s.is_booking_suspended).length;
  const deniedAccessCount = accessEvents.filter((a) => a.status === 'DENIED').length;

  // Filtered attendance records
  const filteredAttendance = attendanceRecords.filter((r) => {
    return (
      r.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.occurrence_title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-emerald-400" />
            Attendance & Access Governance
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time check-in ledger, automated strike & suspension tracking, turnstile access logs, and policy compliance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchAttendance();
              refetchStates();
              refetchAccess();
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
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Check-Ins</div>
          <div className="text-2xl font-bold text-white mt-1">{totalCheckIns}</div>
          <div className="text-xs text-zinc-500 mt-1">Session attendance logs</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Present On-Time</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{presentCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Verified entries</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Late Arrivals</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{lateCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Checked in after start</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">Active Suspensions</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{suspendedMembers}</div>
          <div className="text-xs text-zinc-500 mt-1">Excessive strike lockouts</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Turnstile Denials</div>
          <div className="text-2xl font-bold text-zinc-300 mt-1">{deniedAccessCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Access events blocked</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Attendance Records ({attendanceRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('discipline')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'discipline'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Member Discipline & Strikes ({memberStates.length})
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'access'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          Turnstile & Door Access ({accessEvents.length})
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
          Attendance Policies ({attendancePolicies.length})
        </button>
      </div>

      {/* Tab Content: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attendee, booking #..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Check-In Time</th>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Class Occurrence</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Verification</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loadingAttendance ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                        No attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-5 py-4 font-mono text-xs text-zinc-300">
                          {new Date(record.check_in_time).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{record.user_profile_name || 'Member'}</div>
                          <div className="text-xs text-zinc-500 font-mono">{record.booking_number}</div>
                        </td>
                        <td className="px-5 py-4 text-zinc-200">{record.occurrence_title || 'Class Session'}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {record.check_in_method === 'QR_CODE' && <QrCode className="w-3 h-3 text-emerald-400" />}
                            {record.check_in_method === 'NFC_RFID' && <Radio className="w-3 h-3 text-indigo-400" />}
                            {record.check_in_method}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span className="text-emerald-400 font-semibold">{record.verification_status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'PRESENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : record.status === 'LATE'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {record.status}
                          </span>
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

      {/* Tab Content: Discipline */}
      {activeTab === 'discipline' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Total Bookings</th>
                    <th className="px-5 py-3.5">Attended</th>
                    <th className="px-5 py-3.5">No-Shows</th>
                    <th className="px-5 py-3.5">Strikes Count</th>
                    <th className="px-5 py-3.5">Booking Status</th>
                    <th className="px-5 py-3.5">Suspension Until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loadingStates ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading discipline states...
                      </td>
                    </tr>
                  ) : memberStates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        No member attendance records or discipline violations logged.
                      </td>
                    </tr>
                  ) : (
                    memberStates.map((state) => (
                      <tr key={state.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-5 py-4 font-medium text-white">
                          {state.user_profile_name || 'Member Profile'}
                        </td>
                        <td className="px-5 py-4">{state.total_bookings}</td>
                        <td className="px-5 py-4 text-emerald-400 font-semibold">{state.attended_count}</td>
                        <td className="px-5 py-4 text-rose-400 font-semibold">{state.no_show_count}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              state.current_strike_count >= 3
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : state.current_strike_count > 0
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {state.current_strike_count} Strikes
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {state.is_booking_suspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <Lock className="w-3.5 h-3.5" /> Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-400">
                          {state.suspended_until
                            ? new Date(state.suspended_until).toLocaleDateString()
                            : '—'}
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

      {/* Tab Content: Turnstile Access Events */}
      {activeTab === 'access' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Access Point</th>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-5 py-3.5">Credential</th>
                  <th className="px-5 py-3.5">Access Status</th>
                  <th className="px-5 py-3.5">Notes / Denial Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loadingAccess ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                      Loading access events...
                    </td>
                  </tr>
                ) : accessEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      No turnstile or door access events recorded.
                    </td>
                  </tr>
                ) : (
                  accessEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-zinc-800/30 transition">
                      <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-medium text-white">{evt.access_point_name}</td>
                      <td className="px-5 py-4 text-xs font-semibold">{evt.event_type}</td>
                      <td className="px-5 py-4 text-xs text-zinc-400">{evt.credential_type}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            evt.status === 'GRANTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-rose-400 font-mono">
                        {evt.denial_reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
          ) : attendancePolicies.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-zinc-500">
              No attendance policy sets configured.
            </div>
          ) : (
            attendancePolicies.map((p) => (
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
                <div className="grid grid-cols-3 gap-3 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-500 block">Strike Limit</span>
                    <span className="text-rose-400 font-semibold">{p.max_strikes_before_action} Strikes</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Reset Window</span>
                    <span className="text-zinc-200 font-semibold">{p.strike_reset_window_days} Days</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Suspension</span>
                    <span className="text-zinc-200 font-semibold">{p.default_suspension_days} Days Lockout</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
