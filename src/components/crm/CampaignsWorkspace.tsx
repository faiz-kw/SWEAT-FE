import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Megaphone,
  RotateCw,
  Search,
  DollarSign,
  Users,
  Target,
  UserCheck,
  TrendingUp,
  Calendar,
  Building2,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  Filter,
  CreditCard,
  Layers,
} from 'lucide-react';
import { crmApi } from '@/api/endpoints/crmApi';
import { api } from '@/api/client';
import type {
  CampaignPerformanceItem,
  CampaignDrilldownConversion,
  CampaignDrilldownRevenue,
  Lead,
} from '@/types/crm';
import { CRMPageHeader } from '@/components/crm/common/CRMPageHeader';
import { CRMKpiTile } from '@/components/crm/common/CRMKpiTile';
import { CRMFilterBar } from '@/components/crm/common/CRMFilterBar';
import { CRMEmptyState } from '@/components/crm/common/CRMEmptyState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function CampaignsWorkspace() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPlatform, setSelectedPlatform] = React.useState('ALL');
  const [selectedBranch, setSelectedBranch] = React.useState('ALL');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Drilldown states
  const [drilldownType, setDrilldownType] = React.useState<'leads' | 'conversions' | 'revenue' | null>(null);
  const [selectedCampaign, setSelectedCampaign] = React.useState<CampaignPerformanceItem | null>(null);

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/branches/');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query campaign performance
  const {
    data: performanceData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['crm-campaign-performance', selectedBranch, selectedPlatform, startDate, endDate, searchTerm],
    queryFn: () =>
      crmApi.getCampaignPerformance({
        branch_id: selectedBranch,
        platform: selectedPlatform,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchTerm || undefined,
      }),
  });

  // Drilldown queries
  const { data: drilldownLeads = [], isLoading: loadingDrillLeads } = useQuery({
    queryKey: ['crm-drilldown-leads', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () =>
      crmApi.getCampaignDrilldownLeads({
        campaign_name: selectedCampaign?.campaign_name,
        platform: selectedCampaign?.platform,
      }),
    enabled: drilldownType === 'leads' && !!selectedCampaign,
  });

  const { data: drilldownConversions = [], isLoading: loadingDrillConversions } = useQuery({
    queryKey: ['crm-drilldown-conversions', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () =>
      crmApi.getCampaignDrilldownConversions({
        campaign_name: selectedCampaign?.campaign_name,
        platform: selectedCampaign?.platform,
      }),
    enabled: drilldownType === 'conversions' && !!selectedCampaign,
  });

  const { data: drilldownRevenue = [], isLoading: loadingDrillRevenue } = useQuery({
    queryKey: ['crm-drilldown-revenue', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () =>
      crmApi.getCampaignDrilldownRevenue({
        campaign_name: selectedCampaign?.campaign_name,
        platform: selectedCampaign?.platform,
      }),
    enabled: drilldownType === 'revenue' && !!selectedCampaign,
  });

  const summary = performanceData?.summary || {
    total_campaigns: 0,
    total_leads: 0,
    total_trials: 0,
    total_conversions: 0,
    overall_conversion_rate: 0,
    total_paid_revenue: '0.00',
  };

  const campaigns = performanceData?.campaigns || [];

  // Extract unique platforms for filter
  const platforms = React.useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => {
      if (c.platform) set.add(c.platform);
    });
    return Array.from(set);
  }, [campaigns]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPlatform('ALL');
    setSelectedBranch('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = Boolean(
    searchTerm || selectedPlatform !== 'ALL' || selectedBranch !== 'ALL' || startDate || endDate
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="Marketing Campaigns"
        subtitle="Multi-channel acquisition attribution, commercial conversion tracking, and actual paid revenue performance."
        icon={Megaphone}
        badgeText="Acquisition Analytics"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
              title="Refresh campaign data"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <CRMKpiTile
            label="Campaigns"
            value={summary.total_campaigns}
            isLoading={isLoading}
            badge={{ text: 'Acquisition', variant: 'info' }}
            hint="Active sources/campaigns"
          />
          <CRMKpiTile
            label="Leads Generated"
            value={summary.total_leads}
            isLoading={isLoading}
            badge={{ text: 'Inbound', variant: 'neutral' }}
            hint="Total attributed prospects"
          />
          <CRMKpiTile
            label="Trials Booked"
            value={summary.total_trials}
            isLoading={isLoading}
            badge={{ text: 'Engagement', variant: 'warning' }}
            hint="Workout trial visits"
          />
          <CRMKpiTile
            label="Converted Members"
            value={summary.total_conversions}
            isLoading={isLoading}
            badge={{ text: 'Sales', variant: 'positive' }}
            hint="Paid member conversions"
          />
          <CRMKpiTile
            label="Conversion Rate"
            value={`${summary.overall_conversion_rate}%`}
            isLoading={isLoading}
            badge={{ text: 'Yield', variant: summary.overall_conversion_rate > 10 ? 'positive' : 'neutral' }}
            hint="Lead-to-paid ratio"
          />
          <CRMKpiTile
            label="Paid Revenue"
            value={`₹${parseFloat(summary.total_paid_revenue).toLocaleString('en-IN')}`}
            isLoading={isLoading}
            badge={{ text: 'Audited', variant: 'positive' }}
            hint="Authoritative paid orders"
          />
        </div>

        {/* Filter Controls */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Campaign name, UTM..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Date Range
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs px-2"
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs px-2"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Table / Card List */}
        {isLoading ? (
          <CRMLoadingState message="Aggregating marketing campaign attribution and revenue..." />
        ) : campaigns.length === 0 ? (
          <CRMEmptyState
            icon={Megaphone}
            title="No Campaign Attribution Data"
            description="No leads or touches match the selected filters. Incoming leads with UTM parameters or ad platforms will automatically populate this workspace."
            actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
            onAction={resetFilters}
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Campaign Name</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4 text-center">Leads</th>
                      <th className="py-3 px-4 text-center">Trials</th>
                      <th className="py-3 px-4 text-center">Conversions</th>
                      <th className="py-3 px-4 text-center">Conversion Rate</th>
                      <th className="py-3 px-4 text-right">Paid Revenue</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-xs" title={c.campaign_name}>
                              {c.campaign_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {c.platform}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCampaign(c);
                              setDrilldownType('leads');
                            }}
                            className="font-medium text-primary hover:underline"
                            title="View attributed leads"
                          >
                            {c.leads_count}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground font-medium">
                          {c.trials_count}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCampaign(c);
                              setDrilldownType('conversions');
                            }}
                            className={cn(
                              'font-medium',
                              c.conversions_count > 0 ? 'text-emerald-600 dark:text-emerald-400 hover:underline' : 'text-muted-foreground'
                            )}
                            title="View converted members"
                          >
                            {c.conversions_count}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold font-mono',
                              c.conversion_rate > 15
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : c.conversion_rate > 0
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {c.conversion_rate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCampaign(c);
                              setDrilldownType('revenue');
                            }}
                            className={cn(
                              parseFloat(c.paid_revenue) > 0
                                ? 'text-foreground hover:text-primary hover:underline'
                                : 'text-muted-foreground'
                            )}
                            title="View actual paid orders"
                          >
                            ₹{parseFloat(c.paid_revenue).toLocaleString('en-IN')}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCampaign(c);
                                setDrilldownType('leads');
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Inspect
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List (320px - 768px) */}
            <div className="md:hidden space-y-3">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{c.campaign_name}</h4>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {c.platform}
                      </Badge>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-foreground block">
                        ₹{parseFloat(c.paid_revenue).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Paid Revenue</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 text-center text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Leads</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaign(c);
                          setDrilldownType('leads');
                        }}
                        className="font-bold text-primary hover:underline"
                      >
                        {c.leads_count}
                      </button>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Trials</span>
                      <span className="font-bold text-foreground">{c.trials_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Conversions</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaign(c);
                          setDrilldownType('conversions');
                        }}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {c.conversions_count}
                      </button>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Rate</span>
                      <span className="font-bold text-foreground">{c.conversion_rate}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCampaign(c);
                        setDrilldownType('leads');
                      }}
                      className="h-7 text-xs px-2.5"
                    >
                      Inspect Leads
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* DRILLDOWN DIALOG: LEADS */}
      <Dialog
        open={drilldownType === 'leads'}
        onOpenChange={(open) => !open && setDrilldownType(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Attributed Leads: {selectedCampaign?.campaign_name}</span>
            </DialogTitle>
            <DialogDescription>
              All prospect leads attributed to {selectedCampaign?.platform} campaign "{selectedCampaign?.campaign_name}".
            </DialogDescription>
          </DialogHeader>

          {loadingDrillLeads ? (
            <CRMLoadingState message="Loading attributed leads..." />
          ) : drilldownLeads.length === 0 ? (
            <CRMEmptyState
              icon={Users}
              title="No Attributed Leads Found"
              description="No individual lead records matched this acquisition campaign."
            />
          ) : (
            <div className="space-y-2 mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Lead Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Captured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drilldownLeads.map((l: any) => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {l.first_name} {l.last_name}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                          <div>{l.phone_normalized || '—'}</div>
                          <div className="text-[10px] text-muted-foreground/70">{l.email_normalized || ''}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {l.current_status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {l.branch_name || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DRILLDOWN DIALOG: CONVERSIONS */}
      <Dialog
        open={drilldownType === 'conversions'}
        onOpenChange={(open) => !open && setDrilldownType(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <span>Converted Members: {selectedCampaign?.campaign_name}</span>
            </DialogTitle>
            <DialogDescription>
              Prospects who purchased a package and enrolled as members from campaign "{selectedCampaign?.campaign_name}".
            </DialogDescription>
          </DialogHeader>

          {loadingDrillConversions ? (
            <CRMLoadingState message="Loading converted member records..." />
          ) : drilldownConversions.length === 0 ? (
            <CRMEmptyState
              icon={UserCheck}
              title="No Converted Members"
              description="No commercial member conversions have occurred yet from this campaign."
            />
          ) : (
            <div className="space-y-2 mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Lead / Member</th>
                      <th className="py-2.5 px-3">Converted Date</th>
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3 text-right">Order Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drilldownConversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {conv.member_name || conv.lead_name}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {conv.converted_at ? new Date(conv.converted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-primary font-medium">
                          {conv.order_number || conv.order_id?.slice(0, 8) || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          ₹{parseFloat(conv.order_total).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {conv.order_status || 'PAID'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DRILLDOWN DIALOG: REVENUE */}
      <Dialog
        open={drilldownType === 'revenue'}
        onOpenChange={(open) => !open && setDrilldownType(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-positive" />
              <span>Paid Orders & Revenue: {selectedCampaign?.campaign_name}</span>
            </DialogTitle>
            <DialogDescription>
              Authoritative paid orders from converted prospects attributed to "{selectedCampaign?.campaign_name}".
            </DialogDescription>
          </DialogHeader>

          {loadingDrillRevenue ? (
            <CRMLoadingState message="Loading paid order transactions..." />
          ) : drilldownRevenue.length === 0 ? (
            <CRMEmptyState
              icon={DollarSign}
              title="No Paid Orders Found"
              description="No successful paid transactions associated with converted leads from this campaign."
            />
          ) : (
            <div className="space-y-2 mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drilldownRevenue.map((ord) => (
                      <tr key={ord.order_id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                          {ord.order_number || ord.order_id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium">
                          {ord.lead_name || 'Member'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-medium text-[11px]">
                          {ord.payment_provider}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                          ₹{parseFloat(ord.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            {ord.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
