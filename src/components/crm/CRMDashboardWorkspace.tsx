import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  RotateCw,
  Users,
  Target,
  UserCheck,
  Percent,
  Calendar,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Megaphone,
} from 'lucide-react';
import { crmApi } from '@/api/endpoints/crmApi';
import { api } from '@/api/client';
import type { CRMDashboardResponse } from '@/types/crm';
import { CRMPageHeader } from '@/components/crm/common/CRMPageHeader';
import { CRMKpiTile } from '@/components/crm/common/CRMKpiTile';
import { CRMEmptyState } from '@/components/crm/common/CRMEmptyState';
import { CRMErrorState } from '@/components/crm/common/CRMErrorState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export function CRMDashboardWorkspace() {
  const navigate = useNavigate();

  // Filters State
  const [preset, setPreset] = React.useState('LAST_30_DAYS');
  const [customFrom, setCustomFrom] = React.useState('');
  const [customTo, setCustomTo] = React.useState('');
  const [selectedBranch, setSelectedBranch] = React.useState('ALL');
  const [selectedAgent, setSelectedAgent] = React.useState('ALL');
  const [selectedSource, setSelectedSource] = React.useState('ALL');
  const [selectedProgram, setSelectedProgram] = React.useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = React.useState('ALL');

  // Metadata queries for filter dropdowns
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/branches/');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources-list'],
    queryFn: async () => {
      const res = await crmApi.getLeadSources();
      return Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/programs/');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Main Dashboard Query
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<CRMDashboardResponse>({
    queryKey: [
      'crm-dashboard-analytics',
      preset,
      customFrom,
      customTo,
      selectedBranch,
      selectedAgent,
      selectedSource,
      selectedProgram,
      selectedPlatform,
    ],
    queryFn: () =>
      crmApi.getDashboardMetrics({
        preset,
        date_from: preset === 'CUSTOM' ? customFrom : undefined,
        date_to: preset === 'CUSTOM' ? customTo : undefined,
        branch_id: selectedBranch,
        agent_id: selectedAgent,
        lead_source_id: selectedSource,
        program_id: selectedProgram,
        platform: selectedPlatform,
      }),
    staleTime: 60 * 1000,
  });

  const summary = dashboardData?.summary;
  const funnel = dashboardData?.funnel || [];
  const trends = dashboardData?.trends || [];
  const sourcesData = dashboardData?.sources || [];
  const campaignsData = dashboardData?.campaigns || [];
  const trialsData = dashboardData?.trials;
  const followupsData = dashboardData?.followups;
  const attentionData = dashboardData?.attention;
  const agentsData = dashboardData?.agents || [];
  const branchesData = dashboardData?.branches || [];

  const handleDrilldown = (path: string, params?: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (selectedBranch && selectedBranch !== 'ALL') sp.append('branch_id', selectedBranch);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.append(k, v);
      });
    }
    const q = sp.toString() ? `?${sp.toString()}` : '';
    navigate({ to: `${path}${q}` as any });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <CRMPageHeader
        title="CRM & Sales Analytics"
        subtitle="Authoritative operational KPIs, funnel conversions, and verified commercial revenue"
        breadcrumbs={[
          { label: 'CRM', to: '/crm/leads' },
          { label: 'Dashboard' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Filter Controls Bar */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Date Range
              </span>
              <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg">
                {[
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: 'LAST_7_DAYS', label: '7D' },
                  { id: 'LAST_30_DAYS', label: '30D' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'LAST_MONTH', label: 'Last Month' },
                  { id: 'CUSTOM', label: 'Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      preset === item.id
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Range Label */}
            {dashboardData?.filters && (
              <span className="text-xs text-muted-foreground font-mono bg-muted/30 px-2.5 py-1 rounded-md">
                {dashboardData.filters.date_from} → {dashboardData.filters.date_to}
              </span>
            )}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            </div>
          )}

          {/* Granular Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-border/50">
            {/* Branch */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 focus:ring-1 focus:ring-primary outline-hidden"
              >
                <option value="ALL">All Permitted Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Acquisition Source
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 focus:ring-1 focus:ring-primary outline-hidden"
              >
                <option value="ALL">All Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Program */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Interested Program
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 focus:ring-1 focus:ring-primary outline-hidden"
              >
                <option value="ALL">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Platform Channel
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 focus:ring-1 focus:ring-primary outline-hidden"
              >
                <option value="ALL">All Platforms</option>
                <option value="Meta">Meta / Instagram / FB</option>
                <option value="Google">Google Search / Ads</option>
                <option value="Website">Website</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Direct">Direct / Walk-In</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreset('LAST_30_DAYS');
                  setSelectedBranch('ALL');
                  setSelectedAgent('ALL');
                  setSelectedSource('ALL');
                  setSelectedProgram('ALL');
                  setSelectedPlatform('ALL');
                  setCustomFrom('');
                  setCustomTo('');
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <CRMLoadingState title="Computing CRM analytics..." />}

        {/* Error State */}
        {isError && (
          <CRMErrorState
            title="Failed to load CRM dashboard"
            message={
              error instanceof Error ? error.message : 'An error occurred fetching CRM analytics'
            }
            onRetry={() => refetch()}
          />
        )}

        {/* Loaded Content */}
        {!isLoading && !isError && summary && (
          <>
            {/* 11 Summary KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <CRMKpiTile
                label="Total Leads"
                value={summary.total_leads}
                onClick={() => handleDrilldown('/crm/leads')}
                hint="Unique leads acquired in period"
              />
              <CRMKpiTile
                label="New Leads"
                value={summary.new_leads}
                badge={{ text: 'Stage: New', variant: 'info' }}
                onClick={() => handleDrilldown('/crm/leads', { current_status: 'NEW_LEAD' })}
                hint="Leads currently in New status"
              />
              <CRMKpiTile
                label="Open Pipeline"
                value={summary.open_leads}
                badge={{ text: 'In Progress', variant: 'warning' }}
                onClick={() => handleDrilldown('/crm/pipeline')}
                hint="Active leads in non-terminal stages"
              />
              <CRMKpiTile
                label="Converted Members"
                value={summary.converted_members}
                badge={{ text: 'Won', variant: 'positive' }}
                onClick={() => handleDrilldown('/crm/leads', { current_status: 'CONVERTED' })}
                hint="Unique converted members"
              />
              <CRMKpiTile
                label="Conversion Rate"
                value={`${summary.conversion_rate}%`}
                badge={{ text: 'Ratio', variant: 'neutral' }}
                hint="Converted / Total Leads"
              />
              <CRMKpiTile
                label="Paid CRM Revenue"
                value={`₹${parseFloat(summary.paid_revenue || '0').toLocaleString('en-IN')}`}
                badge={{
                  text: parseFloat(summary.refund_amount || '0') > 0 ? 'Net of Refunds' : 'Verified Paid',
                  variant: 'positive',
                }}
                hint={`Gross: ₹${parseFloat(summary.gross_revenue || '0').toLocaleString('en-IN')}`}
              />
              <CRMKpiTile
                label="Trials Booked"
                value={summary.trials_booked}
                onClick={() => handleDrilldown('/crm/trials')}
                hint="Trial bookings during selected period"
              />
              <CRMKpiTile
                label="Trials Attended"
                value={summary.trials_attended}
                badge={{ text: 'Attended', variant: 'positive' }}
                onClick={() => handleDrilldown('/crm/trials', { status: 'ATTENDED' })}
                hint="Trial attendances during period"
              />
              <CRMKpiTile
                label="Trial No-Shows"
                value={summary.trial_no_shows}
                badge={{ text: 'Missed', variant: 'negative' }}
                onClick={() => handleDrilldown('/crm/trials', { status: 'NO_SHOW' })}
                hint="No-show trial events during selected period"
              />
              <CRMKpiTile
                label="Overdue Follow-ups"
                value={summary.overdue_followups}
                badge={{
                  text: summary.overdue_followups > 0 ? 'Urgent' : 'Clear',
                  variant: summary.overdue_followups > 0 ? 'negative' : 'positive',
                }}
                onClick={() => handleDrilldown('/crm/follow-ups', { status: 'PENDING' })}
                hint="Tasks past due date"
              />
              <CRMKpiTile
                label="Attention Required"
                value={summary.leads_requiring_attention}
                badge={{
                  text: summary.leads_requiring_attention > 0 ? 'Stuck Leads' : 'Zero Stuck',
                  variant: summary.leads_requiring_attention > 0 ? 'warning' : 'positive',
                }}
                onClick={() => handleDrilldown('/crm/leads', { tab: 'attention' })}
                hint="Stage SLA breaches & inaction"
              />
              <CRMKpiTile
                label="Refund Amount"
                value={`₹${parseFloat(summary.refund_amount || '0').toLocaleString('en-IN')}`}
                badge={{
                  text: parseFloat(summary.refund_amount || '0') > 0 ? 'Deducted' : 'Zero',
                  variant: parseFloat(summary.refund_amount || '0') > 0 ? 'warning' : 'neutral',
                }}
                hint="Total successful refund value"
              />
            </div>

            {/* Funnel Section */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Lead Conversion Funnel
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Current stage of {summary.total_leads} leads acquired in selected period
                  </p>
                </div>
              </div>

              {funnel.length === 0 ? (
                <CRMEmptyState title="No leads found in this period" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {funnel.map((stage) => {
                    const isClosedWon = stage.status === 'CONVERTED';
                    const isClosedLost = ['LOST', 'NOT_INTERESTED'].includes(stage.status);

                    return (
                      <div
                        key={stage.status}
                        onClick={() => handleDrilldown('/crm/leads', { current_status: stage.status })}
                        className={cn(
                          'p-3.5 rounded-lg border text-left transition-all cursor-pointer hover:shadow-2xs',
                          isClosedWon
                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                            : isClosedLost
                            ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10'
                            : 'border-border bg-card/80 hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground truncate" title={stage.display_label}>
                            {stage.display_label}
                          </span>
                          <span className="font-mono text-muted-foreground shrink-0 ml-1">
                            {stage.percentage_of_total}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-bold text-foreground">{stage.count}</span>
                          {stage.conversion_from_previous_stage !== null && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {stage.conversion_from_previous_stage}% of prev
                            </span>
                          )}
                        </div>
                        {/* Stage progress bar */}
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              isClosedWon
                                ? 'bg-emerald-500'
                                : isClosedLost
                                ? 'bg-rose-500'
                                : 'bg-primary'
                            )}
                            style={{ width: `${Math.min(100, Math.max(stage.percentage_of_total, 3))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trend Chart Section */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Timeline & Trend Velocity
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological progression of leads created, trials, conversions, and paid revenue
                  </p>
                </div>
              </div>

              {trends.length === 0 ? (
                <CRMEmptyState title="No trend data for this date range" />
              ) : (
                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTrials" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
                      <XAxis
                        dataKey="display_date"
                        stroke="var(--color-muted-foreground, #6b7280)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground, #6b7280)"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-card, #ffffff)',
                          borderColor: 'var(--color-border, #e5e7eb)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        name="Leads Created"
                        stroke="var(--color-primary, #6366f1)"
                        fillOpacity={1}
                        fill="url(#colorLeads)"
                      />
                      <Area
                        type="monotone"
                        dataKey="trials"
                        name="Trials Booked"
                        stroke="#0ea5e9"
                        fillOpacity={1}
                        fill="url(#colorTrials)"
                      />
                      <Area
                        type="monotone"
                        dataKey="conversions"
                        name="Conversions"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorConversions)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Performance Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Acquisition Source Performance */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Acquisition Sources
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDrilldown('/crm/leads')}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-medium">Source</th>
                        <th className="pb-2 font-medium text-right">Leads</th>
                        <th className="pb-2 font-medium text-right">Trials</th>
                        <th className="pb-2 font-medium text-right">Conversions</th>
                        <th className="pb-2 font-medium text-right">Rate</th>
                        <th className="pb-2 font-medium text-right">Paid Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sourcesData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-muted-foreground">
                            No source records found
                          </td>
                        </tr>
                      ) : (
                        sourcesData.slice(0, 7).map((s, idx) => (
                          <tr
                            key={s.source_id || idx}
                            onClick={() =>
                              handleDrilldown('/crm/leads', { lead_source_id: s.source_id || undefined })
                            }
                            className="hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 font-medium text-foreground">
                              {s.source_name}
                              <span className="block text-[10px] text-muted-foreground">{s.source_type}</span>
                            </td>
                            <td className="py-2.5 text-right font-mono">{s.leads}</td>
                            <td className="py-2.5 text-right font-mono">{s.trials}</td>
                            <td className="py-2.5 text-right font-mono">{s.conversions}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {s.conversion_rate}%
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium">
                              ₹{parseFloat(s.paid_revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Marketing Campaigns Performance */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    Campaign Attribution Performance
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDrilldown('/crm/campaigns')}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Campaigns Drill-down <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-medium">Campaign</th>
                        <th className="pb-2 font-medium">Platform</th>
                        <th className="pb-2 font-medium text-right">Leads</th>
                        <th className="pb-2 font-medium text-right">Conv.</th>
                        <th className="pb-2 font-medium text-right">Rate</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {campaignsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-muted-foreground">
                            No campaigns attributed in this period
                          </td>
                        </tr>
                      ) : (
                        campaignsData.slice(0, 7).map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => handleDrilldown('/crm/campaigns')}
                            className="hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 font-medium text-foreground max-w-[140px] truncate" title={c.campaign_name}>
                              {c.campaign_name}
                            </td>
                            <td className="py-2.5 text-muted-foreground">{c.platform}</td>
                            <td className="py-2.5 text-right font-mono">{c.leads}</td>
                            <td className="py-2.5 text-right font-mono">{c.conversions}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {c.conversion_rate}%
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium">
                              ₹{parseFloat(c.paid_revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Trial & Attention Operations Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Trial Management Snapshot */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Trial Operations
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDrilldown('/crm/trials')}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Manage
                  </Button>
                </div>

                {trialsData && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">Attendance Rate</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {trialsData.attendance_rate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">Attended</span>
                        <span className="font-bold text-base">{trialsData.attended}</span>
                      </div>
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">No Shows</span>
                        <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                          {trialsData.no_show}
                        </span>
                      </div>
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">Confirmed</span>
                        <span className="font-bold text-base">{trialsData.confirmed}</span>
                      </div>
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">Converted Post-Trial</span>
                        <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {trialsData.converted_after_trial}
                        </span>
                      </div>
                    </div>

                    {trialsData.top_programs.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                          Top Requested Programs
                        </span>
                        <div className="space-y-1">
                          {trialsData.top_programs.map((p) => (
                            <div key={p.program_id} className="flex items-center justify-between text-xs py-1">
                              <span className="text-foreground truncate max-w-[200px]">{p.program_name}</span>
                              <span className="font-mono text-muted-foreground">{p.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Follow-up Workflow Snapshot */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Sales Follow-ups
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDrilldown('/crm/follow-ups')}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Queue
                  </Button>
                </div>

                {followupsData && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">Completion Rate</span>
                      <span className="text-sm font-bold text-primary font-mono">
                        {followupsData.completion_rate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        onClick={() => handleDrilldown('/crm/follow-ups', { status: 'PENDING' })}
                        className="p-2 border border-border rounded-md cursor-pointer hover:bg-muted/40"
                      >
                        <span className="text-muted-foreground block text-[10px]">Due Today</span>
                        <span className="font-bold text-base">{followupsData.due_today}</span>
                      </div>
                      <div
                        onClick={() => handleDrilldown('/crm/follow-ups', { status: 'PENDING' })}
                        className="p-2 border border-rose-500/30 bg-rose-500/5 rounded-md cursor-pointer hover:bg-rose-500/10"
                      >
                        <span className="text-rose-600 dark:text-rose-400 block text-[10px]">Overdue Tasks</span>
                        <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                          {followupsData.overdue}
                        </span>
                      </div>
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">Upcoming</span>
                        <span className="font-bold text-base">{followupsData.upcoming}</span>
                      </div>
                      <div className="p-2 border border-border rounded-md">
                        <span className="text-muted-foreground block text-[10px]">Completed (Period)</span>
                        <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {followupsData.completed}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attention Engine / SLA Snapshot */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Attention & SLA Guard
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDrilldown('/crm/leads', { tab: 'attention' })}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Attention Queue
                  </Button>
                </div>

                {attentionData && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Total Stuck Leads
                      </span>
                      <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {attentionData.stuck_leads}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 border border-border rounded-md">
                        <span className="text-muted-foreground">Stage SLA Breached</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {attentionData.sla_breached}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 border border-border rounded-md">
                        <span className="text-muted-foreground">Follow-up Overdue</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {attentionData.overdue_tasks}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 border border-border rounded-md">
                        <span className="text-muted-foreground">Awaiting Inbound Response</span>
                        <span className="font-bold text-foreground font-mono">
                          {attentionData.awaiting_response}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Performance & Branch Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Agent Productivity */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Sales Agent Operational Factuals
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-medium">Sales Rep</th>
                        <th className="pb-2 font-medium text-right">Assigned</th>
                        <th className="pb-2 font-medium text-right">Activities</th>
                        <th className="pb-2 font-medium text-right">Tasks Done</th>
                        <th className="pb-2 font-medium text-right">Trials</th>
                        <th className="pb-2 font-medium text-right">Conversions</th>
                        <th className="pb-2 font-medium text-right">Paid Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {agentsData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-muted-foreground">
                            No agent assignments recorded
                          </td>
                        </tr>
                      ) : (
                        agentsData.map((a) => (
                          <tr
                            key={a.agent_id}
                            onClick={() => handleDrilldown('/crm/leads', { assigned_agent_id: a.agent_id })}
                            className="hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 font-medium text-foreground">
                              {a.agent_name}
                              {a.email && (
                                <span className="block text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {a.email}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-mono">{a.assigned_leads}</td>
                            <td className="py-2.5 text-right font-mono">{a.activities}</td>
                            <td className="py-2.5 text-right font-mono">{a.completed_followups}</td>
                            <td className="py-2.5 text-right font-mono">{a.trials_booked}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {a.conversions}
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium">
                              ₹{parseFloat(a.paid_revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Branch Commercial Matrix */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Branch Commercial Performance
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-medium">Branch</th>
                        <th className="pb-2 font-medium text-right">Leads</th>
                        <th className="pb-2 font-medium text-right">Trials</th>
                        <th className="pb-2 font-medium text-right">Conversions</th>
                        <th className="pb-2 font-medium text-right">Rate</th>
                        <th className="pb-2 font-medium text-right">Paid Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {branchesData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-muted-foreground">
                            No branch activity in selected scope
                          </td>
                        </tr>
                      ) : (
                        branchesData.map((b) => (
                          <tr
                            key={b.branch_id}
                            onClick={() => handleDrilldown('/crm/leads', { branch_id: b.branch_id })}
                            className="hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 font-medium text-foreground">
                              {b.branch_name}
                              <span className="block text-[10px] text-muted-foreground font-mono">{b.code}</span>
                            </td>
                            <td className="py-2.5 text-right font-mono">{b.leads}</td>
                            <td className="py-2.5 text-right font-mono">{b.trials}</td>
                            <td className="py-2.5 text-right font-mono">{b.conversions}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {b.conversion_rate}%
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium">
                              ₹{parseFloat(b.paid_revenue).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
