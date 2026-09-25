import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Search,
  RefreshCw,
  QrCode,
  Radio,
  Lock,
  CheckCircle2,
  ShieldAlert,
  DoorOpen,
  Sliders,
} from 'lucide-react';
import { attendanceApi } from '@/api/endpoints/attendanceApi';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AttendanceWorkspaceProps {
  initialTab?: 'attendance' | 'discipline' | 'access' | 'policies';
}

export const AttendanceWorkspace: React.FC<AttendanceWorkspaceProps> = ({
  initialTab = 'attendance',
}) => {
  const queryClient = useQueryClient();
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
      attendanceApi.getAttendanceRecords({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const {
    data: memberStates = [],
    isLoading: loadingStates,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ['member-attendance-states'],
    queryFn: () => attendanceApi.getMemberAttendanceStates(),
  });

  const {
    data: accessEvents = [],
    isLoading: loadingAccess,
    refetch: refetchAccess,
  } = useQuery({
    queryKey: ['turnstile-access-events'],
    queryFn: () => attendanceApi.getTurnstileAccessEvents(),
  });

  const {
    data: attendancePolicies = [],
    isLoading: loadingPolicies,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: ['attendance-policies'],
    queryFn: () => attendanceApi.getAttendancePolicies(),
  });

  // Metrics
  const totalCheckIns = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
  const suspendedMembers = memberStates.filter((s) => s.is_booking_suspended).length;
  const deniedAccessCount = accessEvents.filter((e) => e.status === 'DENIED').length;

  // Filtered records
  const filteredAttendance = attendanceRecords.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      (r.user_profile_name && r.user_profile_name.toLowerCase().includes(term)) ||
      (r.booking_number && r.booking_number.toLowerCase().includes(term)) ||
      (r.occurrence_title && r.occurrence_title.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Session Attendance & Access Control"
        subtitle="Verification logs, strike enforcement, biometric/QR check-ins, and turnstile events."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Operations · Access
            </span>
            <span className="text-muted-foreground text-xs">
              Total <span className="font-semibold text-foreground">{totalCheckIns}</span> entries
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchAttendance();
              refetchStates();
              refetchAccess();
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
          <KpiTile label="Total Check-Ins" value={totalCheckIns} hint="Session attendance logs" />
          <KpiTile label="Present On-Time" value={presentCount} hint="Verified entries" tone="positive" />
          <KpiTile label="Late Arrivals" value={lateCount} hint="Checked in after start" tone="warning" />
          <KpiTile label="Active Suspensions" value={suspendedMembers} hint="Strike lockouts" tone="negative" />
          <KpiTile label="Turnstile Denials" value={deniedAccessCount} hint="Blocked access events" tone="negative" />
        </div>

        {/* Navigation Tabs - Responsive Scroll */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <UserCheck className="size-3.5" />
            Attendance Records ({attendanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('discipline')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discipline'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <ShieldAlert className="size-3.5" />
            Member Discipline & Strikes ({memberStates.length})
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'access'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <DoorOpen className="size-3.5" />
            Turnstile & Door Access ({accessEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'policies'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Sliders className="size-3.5" />
            Attendance Policies ({attendancePolicies.length})
          </button>
        </div>

        {/* Tab Content: Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search attendee, booking #..."
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Check-In Time</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Class Occurrence</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingAttendance ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                          Loading attendance records...
                        </td>
                      </tr>
                    ) : filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No attendance records found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                            {new Date(record.check_in_time).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-foreground">{record.user_profile_name || 'Member'}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{record.booking_number}</div>
                          </td>
                          <td className="px-4 py-3.5 text-foreground">{record.occurrence_title || 'Class Session'}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                              {record.check_in_method === 'QR_CODE' && <QrCode className="w-3 h-3 text-emerald-500" />}
                              {record.check_in_method === 'NFC_RFID' && <Radio className="w-3 h-3 text-primary" />}
                              {record.check_in_method}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{record.verification_status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                record.status === 'PRESENT'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : record.status === 'LATE'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
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
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Total Bookings</th>
                      <th className="px-4 py-3">Attended</th>
                      <th className="px-4 py-3">No-Shows</th>
                      <th className="px-4 py-3">Strikes Count</th>
                      <th className="px-4 py-3">Booking Status</th>
                      <th className="px-4 py-3">Suspension Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingStates ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                          Loading discipline states...
                        </td>
                      </tr>
                    ) : memberStates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No member attendance records or discipline violations logged.
                        </td>
                      </tr>
                    ) : (
                      memberStates.map((state) => (
                        <tr key={state.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {state.user_profile_name || 'Member Profile'}
                          </td>
                          <td className="px-4 py-3.5">{state.total_bookings}</td>
                          <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-semibold">{state.attended_count}</td>
                          <td className="px-4 py-3.5 text-rose-600 dark:text-rose-400 font-semibold">{state.no_show_count}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                state.current_strike_count >= 3
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : state.current_strike_count > 0
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {state.current_strike_count} Strikes
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {state.is_booking_suspended ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <Lock className="w-3.5 h-3.5" /> Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
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
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Access Point</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Credential</th>
                    <th className="px-4 py-3">Access Status</th>
                    <th className="px-4 py-3">Notes / Denial Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingAccess ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                        Loading access events...
                      </td>
                    </tr>
                  ) : accessEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No turnstile or door access events recorded.
                      </td>
                    </tr>
                  ) : (
                    accessEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">{evt.access_point_name}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold">{evt.event_type}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{evt.credential_type}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              evt.status === 'GRANTED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-rose-600 dark:text-rose-400 font-mono">
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
              <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading policies...
              </div>
            ) : attendancePolicies.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-muted-foreground text-sm">
                No attendance policy sets configured.
              </div>
            ) : (
              attendancePolicies.map((p) => (
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
                  <div className="grid grid-cols-3 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Strike Limit</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">{p.max_strikes_before_action} Strikes</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Reset Window</span>
                      <span className="text-foreground font-semibold">{p.strike_reset_window_days} Days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Suspension</span>
                      <span className="text-foreground font-semibold">{p.default_suspension_days} Days</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </PageBody>
    </div>
  );
};
