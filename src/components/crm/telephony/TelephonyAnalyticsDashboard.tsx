/**
 * src/components/crm/telephony/TelephonyAnalyticsDashboard.tsx
 * Comprehensive Sales Telephony Analytics, Representative Leaderboard,
 * Call Outcome Distributions, Hourly Connect Rate Heatmap & QA Audit Stream.
 */

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Target,
  Trophy,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Award,
  Headphones,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Volume2,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Flame,
  FileAudio,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CallRecordingPlayer } from '@/components/crm/CallRecordingPlayer';
import { LeadDetailModal } from '@/components/crm/LeadDetailModal';

type TimeframeOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days';

export function TelephonyAnalyticsDashboard() {
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = React.useState<TimeframeOption>('today');
  const [teamOnly, setTeamOnly] = React.useState<boolean>(false);
  const [selectedCallForAudio, setSelectedCallForAudio] = React.useState<any | null>(null);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['telephony-analytics', timeframe, teamOnly],
    queryFn: () =>
      crmApi.getTelephonyAnalytics({
        timeframe,
        team_only: teamOnly,
      }),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const summary = data?.summary;
  const leaderboard = data?.leaderboard || [];
  const dispositions = data?.dispositions || [];
  const heatmap = data?.hourly_heatmap || [];
  const recentCalls = data?.recent_calls || [];

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.round(sec % 60);
    return `${mins}m ${remainder}s`;
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sales Telephony & Rep Analytics</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Real-time outbound & inbound calling activity, softphone connect rates, and sales rep leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* Controls / Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_30_days', label: 'Last 30D' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeframe === opt.id
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Team Leader Scope Toggle */}
          <Button
            variant={teamOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTeamOnly((prev) => !prev)}
            className="text-xs h-9 gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{teamOnly ? 'My Team' : 'All Reps'}</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-sm">Failed to load calling analytics</p>
          <p className="text-xs text-muted-foreground mt-1">Please ensure telephony service is active and permissions are granted.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3 text-xs">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Dials */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Dials</span>
              <PhoneCall className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {summary?.total_dials ?? 0}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
              <span>Out: {summary?.outbound_calls ?? 0}</span>
              <span>In: {summary?.inbound_calls ?? 0}</span>
            </div>
          </div>

          {/* Card 2: Connected Calls & Connect Rate */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Connected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {summary?.connected_calls ?? 0}
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                {summary?.connect_rate_pct ?? 0}%
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Connect pick-up rate
            </div>
          </div>

          {/* Card 3: Meaningful Calls (>= 30s) */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Meaningful (&ge;30s)</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                {summary?.meaningful_calls ?? 0}
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-600 bg-amber-500/10">
                {summary?.meaningful_rate_pct ?? 0}%
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Quality conversations
            </div>
          </div>

          {/* Card 4: Total Talk Time */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Talk Time</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {summary?.total_talk_time_minutes ?? 0}
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">mins</span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Avg: {formatSeconds(summary?.avg_duration_seconds ?? 0)}
            </div>
          </div>

          {/* Card 5: Free Trials Booked */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Trials Booked</span>
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">
                {summary?.trials_booked ?? 0}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Direct call dispositions
            </div>
          </div>

          {/* Card 6: Peak Calling Hour */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Golden Call Hour</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {summary?.peak_connect_hour || '11:00 - 12:00'}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Highest connect rate
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Leaderboard + Outcome Dispositions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Sales Representative Leaderboard */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm sm:text-base font-bold">Sales Representative Leaderboard</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              {leaderboard.length} Reps Ranked
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 sm:px-4 text-center w-12">#</th>
                  <th className="py-2.5 px-3 sm:px-4">Representative</th>
                  <th className="py-2.5 px-3 text-right">Dials</th>
                  <th className="py-2.5 px-3 text-right">Connected</th>
                  <th className="py-2.5 px-3 text-right">Connect %</th>
                  <th className="py-2.5 px-3 text-right">Meaningful (&ge;30s)</th>
                  <th className="py-2.5 px-3 text-right">Talk Time</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Trials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No call records logged for this timeframe.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((rep) => {
                    const isGold = rep.rank === 1;
                    const isSilver = rep.rank === 2;
                    const isBronze = rep.rank === 3;
                    return (
                      <tr key={rep.rep_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 sm:px-4 text-center font-bold">
                          {isGold ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                              1
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/30 text-slate-700 dark:text-slate-300 font-bold text-xs">
                              2
                            </span>
                          ) : isBronze ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-400/20 text-orange-600 dark:text-orange-400 font-bold text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">{rep.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-semibold text-foreground text-xs sm:text-sm">{rep.name}</div>
                          <div className="text-[11px] text-muted-foreground">{rep.email}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">{rep.dials}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {rep.connected}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                            {rep.connect_rate_pct}%
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {rep.meaningful_calls}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {rep.talk_time_minutes}m
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-bold text-purple-600 dark:text-purple-400">
                          {rep.trials_booked}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 col): Dispositions & Hourly Heatmap */}
        <div className="space-y-6">
          {/* Dispositions Breakdown Card */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-primary" />
                Call Dispositions
              </h3>
              <span className="text-xs text-muted-foreground">{dispositions.length} Outcomes</span>
            </div>

            <div className="mt-4 space-y-3">
              {dispositions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No disposition data recorded yet.</p>
              ) : (
                dispositions.map((d) => (
                  <div key={d.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[180px]">{d.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {d.count} ({d.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, d.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Golden Calling Hours Heatmap Card */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                Hourly Answer Rates (09:00 - 21:00)
              </h3>
            </div>

            <div className="mt-4 space-y-2">
              {heatmap.map((slot) => {
                const isPeak = summary?.peak_connect_hour === slot.label;
                return (
                  <div key={slot.hour} className="flex items-center gap-2 text-[11px]">
                    <span className="w-20 font-mono text-muted-foreground text-[10px] shrink-0">
                      {slot.label}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden relative">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isPeak ? 'bg-rose-500' : 'bg-emerald-500/70'
                        }`}
                        style={{ width: `${Math.min(100, slot.connect_rate_pct)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[10px]">
                      {slot.connect_rate_pct}%
                    </span>
                    <span className="w-8 text-right text-[10px] text-muted-foreground">
                      ({slot.dials})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls & QA Audit Stream */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold">Recent Calls & QA Audit Log</h2>
          </div>
          <span className="text-xs text-muted-foreground">Top 50 Calls</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Lead</th>
                <th className="py-2.5 px-4">Sales Rep</th>
                <th className="py-2.5 px-3 text-center">Direction</th>
                <th className="py-2.5 px-3">Status / Duration</th>
                <th className="py-2.5 px-4">Disposition</th>
                <th className="py-2.5 px-4 text-right">Recording QA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No calls recorded in this timeframe.
                  </td>
                </tr>
              ) : (
                recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                      {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      {call.lead_id ? (
                        <button
                          onClick={() => setSelectedLeadId(call.lead_id!)}
                          className="font-semibold text-primary hover:underline text-left"
                        >
                          {call.lead_name}
                        </button>
                      ) : (
                        <span className="font-semibold">{call.lead_name}</span>
                      )}
                      <div className="text-[11px] font-mono text-muted-foreground">{call.masked_phone}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{call.sales_rep_name}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          call.direction === 'INBOUND'
                            ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                            : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                        }`}
                      >
                        {call.direction}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold">{formatSeconds(call.duration_seconds)}</div>
                      {call.is_meaningful && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-600 bg-amber-500/10">
                          Meaningful (&ge;30s)
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{call.disposition_label || 'Pending'}</div>
                      {call.disposition_notes && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={call.disposition_notes}>
                          "{call.disposition_notes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {call.has_recording ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCallForAudio(call)}
                          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play Call</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No audio</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audio QA Playback Modal */}
      {selectedCallForAudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base">Call Audio QA Recording</h3>
                <p className="text-xs text-muted-foreground">
                  Lead: {selectedCallForAudio.lead_name} ({selectedCallForAudio.masked_phone})
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCallForAudio(null)}>
                &times;
              </Button>
            </div>

            <CallRecordingPlayer
              callSessionId={selectedCallForAudio.id}
              callerName={selectedCallForAudio.lead_name}
              durationSeconds={selectedCallForAudio.duration_seconds}
              disposition={selectedCallForAudio.disposition_label}
            />

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedCallForAudio(null)}>
                Close Player
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal Drilldown */}
      {selectedLeadId && (
        <LeadDetailModal
          isOpen={Boolean(selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
          leadId={selectedLeadId}
        />
      )}
    </div>
  );
}
