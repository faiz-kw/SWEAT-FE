/**
 * src/components/crm/telephony/TelephonyAnalyticsDashboard.tsx
 * Comprehensive Sales Telephony Analytics, Representative Leaderboard,
 * Call Outcome Distributions, Hourly Connect Rate Heatmap & Filtered QA Audit Stream.
 */

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneCall,
  Clock,
  Target,
  Trophy,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileAudio,
  Search,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  const [timeframe, setTimeframe] = React.useState<TimeframeOption>('today');
  const [selectedRepId, setSelectedRepId] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>('');
  const [directionFilter, setDirectionFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [dispositionFilter, setDispositionFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const [selectedCallForAudio, setSelectedCallForAudio] = React.useState<any | null>(null);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

  // Debounce search input by 350ms to keep backend queries fast
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when any filter changes
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      'telephony-analytics',
      timeframe,
      selectedRepId,
      debouncedSearch,
      directionFilter,
      statusFilter,
      dispositionFilter,
      page,
      pageSize,
    ],
    queryFn: () =>
      crmApi.getTelephonyAnalytics({
        timeframe,
        rep_id: selectedRepId !== 'ALL' ? selectedRepId : undefined,
        search: debouncedSearch || undefined,
        direction: directionFilter !== 'ALL' ? directionFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        disposition: dispositionFilter !== 'ALL' ? dispositionFilter : undefined,
        page,
        page_size: pageSize,
      }),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const summary = data?.summary;
  const leaderboard = data?.leaderboard || [];
  const dispositions = data?.dispositions || [];
  const heatmap = data?.hourly_heatmap || [];
  const recentCalls = data?.recent_calls || [];
  const salesReps = data?.sales_reps || [];
  const availableDispositions = data?.available_dispositions || [];
  const pagination = data?.pagination || { total_count: 0, page: 1, page_size: pageSize, total_pages: 1 };

  const hasActiveFilters =
    selectedRepId !== 'ALL' ||
    Boolean(searchQuery) ||
    directionFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    dispositionFilter !== 'ALL';

  const resetAllFilters = () => {
    setSelectedRepId('ALL');
    setSearchQuery('');
    setDebouncedSearch('');
    setDirectionFilter('ALL');
    setStatusFilter('ALL');
    setDispositionFilter('ALL');
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await crmApi.exportTelephonyReport({
        timeframe,
        rep_id: selectedRepId !== 'ALL' ? selectedRepId : undefined,
        direction: directionFilter !== 'ALL' ? directionFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        disposition: dispositionFilter !== 'ALL' ? dispositionFilter : undefined,
        search: debouncedSearch || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `sales_telephony_report_${timeframe}_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Calling report exported successfully.');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export calling report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.round(sec % 60);
    return `${mins}m ${remainder}s`;
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-border">
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

        {/* Top Controls / Filter Bar */}
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
                onClick={() => handleFilterChange(setTimeframe, opt.id)}
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

          {/* Sales Representative Dropdown */}
          <Select
            value={selectedRepId}
            onValueChange={(val) => handleFilterChange(setSelectedRepId, val)}
          >
            <SelectTrigger className="w-[160px] sm:w-[180px] h-9 text-xs">
              <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Reps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-medium">
                All Representatives
              </SelectItem>
              {salesReps.map((rep) => (
                <SelectItem key={rep.id} value={rep.id} className="text-xs">
                  {rep.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="text-xs h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
              <Target className="w-4 h-4 text-amber-500" />
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
                {summary?.peak_connect_hour || '14:00 - 15:00'}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              Highest connect rate
            </div>
          </div>
        </div>
      )}

      {/* Middle Grid: Leaderboard + Outcome Dispositions & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Sales Representative Leaderboard */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm sm:text-base font-bold">Sales Representative Leaderboard</h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedRepId !== 'ALL' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRepId('ALL')}
                  className="h-6 text-[11px] px-2 text-primary"
                >
                  Clear rep filter
                </Button>
              )}
              <Badge variant="outline" className="text-xs">
                {leaderboard.length} Reps Ranked
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
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
                    const isSelected = selectedRepId === rep.rep_id;
                    const isGold = rep.rank === 1;
                    const isSilver = rep.rank === 2;
                    const isBronze = rep.rank === 3;
                    return (
                      <tr
                        key={rep.rep_id}
                        onClick={() =>
                          handleFilterChange(
                            setSelectedRepId,
                            isSelected ? 'ALL' : rep.rep_id
                          )
                        }
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-l-2 border-l-primary'
                            : 'hover:bg-muted/30'
                        }`}
                        title="Click to filter dashboard by this representative"
                      >
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
                          <div className="font-semibold text-foreground text-xs sm:text-sm">
                            {rep.name}
                          </div>
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
              <div className="flex items-center gap-1.5">
                {dispositionFilter !== 'ALL' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFilterChange(setDispositionFilter, 'ALL')}
                    className="h-5 text-[10px] px-1.5 text-primary"
                  >
                    Reset
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">{dispositions.length} Outcomes</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {dispositions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No disposition data recorded yet.</p>
              ) : (
                dispositions.map((d) => {
                  const isSelected = dispositionFilter === d.code;
                  return (
                    <div
                      key={d.code}
                      onClick={() =>
                        handleFilterChange(
                          setDispositionFilter,
                          isSelected ? 'ALL' : d.code
                        )
                      }
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/40'
                      }`}
                      title="Click to filter calls by this disposition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {d.label}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {d.count} ({d.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, d.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
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
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
        {/* Table Header and Control Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold">Recent Calls & QA Audit Log</h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Total {pagination.total_count} Recorded Calls
            </div>
          </div>

          {/* Table Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lead, phone, sales rep, notes..."
                className="pl-8 h-8 text-xs bg-muted/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Direction Filter */}
            <Select
              value={directionFilter}
              onValueChange={(val) => handleFilterChange(setDirectionFilter, val)}
            >
              <SelectTrigger className="w-[125px] h-8 text-xs">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Directions</SelectItem>
                <SelectItem value="INBOUND" className="text-xs">Inbound</SelectItem>
                <SelectItem value="OUTBOUND" className="text-xs">Outbound</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => handleFilterChange(setStatusFilter, val)}
            >
              <SelectTrigger className="w-[125px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="CONNECTED" className="text-xs">Connected</SelectItem>
                <SelectItem value="MISSED" className="text-xs">Missed / Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Disposition Filter */}
            <Select
              value={dispositionFilter}
              onValueChange={(val) => handleFilterChange(setDispositionFilter, val)}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Disposition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Outcomes</SelectItem>
                {availableDispositions.map((disp) => (
                  <SelectItem key={disp.code} value={disp.code} className="text-xs">
                    {disp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Calls Table */}
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
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <p className="font-medium">No calls found</p>
                    <p className="text-xs mt-1">
                      {hasActiveFilters
                        ? 'Try clearing active filters or searching for another lead or rep.'
                        : 'No calls recorded for the selected timeframe.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={resetAllFilters}
                        className="mt-3 text-xs"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      {call.lead_id ? (
                        <button
                          onClick={() => setSelectedLeadId(call.lead_id!)}
                          className="font-semibold text-primary hover:underline text-left block"
                        >
                          {call.lead_name}
                        </button>
                      ) : (
                        <span className="font-semibold block">{call.lead_name}</span>
                      )}
                      <div className="text-[11px] font-mono text-muted-foreground">{call.masked_phone}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                      {call.sales_rep_name}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          call.direction === 'INBOUND'
                            ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                            : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                        }`}
                      >
                        {call.direction === 'INBOUND' ? (
                          <span className="flex items-center gap-1">
                            <PhoneIncoming className="w-2.5 h-2.5" /> Inbound
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <PhoneOutgoing className="w-2.5 h-2.5" /> Outbound
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold">{formatSeconds(call.duration_seconds)}</div>
                      {call.is_meaningful ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-600 bg-amber-500/10">
                          Meaningful (&ge;30s)
                        </Badge>
                      ) : call.status === 'COMPLETED' ? (
                        <span className="text-[10px] text-muted-foreground">Connected</span>
                      ) : (
                        <span className="text-[10px] text-rose-500">{call.status}</span>
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
                    <td className="py-3 px-4 text-right whitespace-nowrap">
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

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Showing {pagination.total_count === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} to{' '}
              {Math.min(pagination.page * pagination.page_size, pagination.total_count)} of{' '}
              {pagination.total_count} calls
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span>Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[68px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs">10</SelectItem>
                  <SelectItem value="25" className="text-xs">25</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                  <SelectItem value="100" className="text-xs">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              Previous
            </Button>

            <span className="px-2 font-mono text-xs text-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={pagination.page >= pagination.total_pages}
              className="h-7 px-2 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
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
              recordingUrl={selectedCallForAudio.recording_url}
              callerName={selectedCallForAudio.lead_name}
              durationSeconds={selectedCallForAudio.duration_seconds}
              disposition={selectedCallForAudio.disposition_label}
              title={`${selectedCallForAudio.direction === 'INBOUND' ? 'Inbound' : 'Outbound'} Call Recording`}
              provider="VOBIZ"
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
