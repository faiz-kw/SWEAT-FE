import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  X,
  Plus,
  Copy,
  Check,
  Share2,
  Sparkles,
  Link as LinkIcon,
  Activity,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { crmApi } from '@/api/endpoints/crmApi';
import { api } from '@/api/client';
import { useGlobalSearchSync } from '@/hooks/useGlobalSearchSync';
import type {
  CampaignPerformanceItem,
  CampaignDrilldownConversion,
  CampaignDrilldownRevenue,
  CampaignDrilldownTrial,
  CampaignPlatformStatus,
  CreateCampaignPayload,
  Lead,
} from '@/types/crm';
import { CRMPageHeader } from '@/components/crm/common/CRMPageHeader';
import { CRMKpiTile } from '@/components/crm/common/CRMKpiTile';
import { CRMEmptyState } from '@/components/crm/common/CRMEmptyState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatBranchOptionLabel } from '@/lib/crmLabels';
import { usePermissions } from '@/lib/permissions';
import { formatDisplayPhone } from '@/lib/phonePrivacy';

const STANDARD_PLATFORMS = ['META', 'GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'WEBSITE', 'DIRECT'];

export function CampaignsWorkspace() {
  const queryClient = useQueryClient();
  const { canViewPhoneNumber } = usePermissions();
  const [searchTerm, setSearchTerm] = React.useState('');
  const { handleSearchChange } = useGlobalSearchSync(searchTerm, setSearchTerm);
  const [selectedPlatform, setSelectedPlatform] = React.useState('ALL');
  const [selectedBranch, setSelectedBranch] = React.useState('ALL');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Inspect & Drilldown states
  const [inspectOpen, setInspectOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'leads' | 'trials' | 'conversions' | 'revenue'>('overview');
  const [selectedCampaign, setSelectedCampaign] = React.useState<CampaignPerformanceItem | null>(null);

  // New Campaign modal state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [newCampaignForm, setNewCampaignForm] = React.useState<CreateCampaignPayload>({
    campaign_name: '',
    platform: 'META',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    landing_page_url: 'https://sweatfitwellness.com/trial',
    branch_id: '',
  });

  // Fetch branches for filter and campaign creation
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get<{ results?: any[] } | any[]>('/tenant/branches/');
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      return list as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch platform integration statuses
  const { data: platformStatuses = [] } = useQuery({
    queryKey: ['crm-campaign-platforms'],
    queryFn: () => crmApi.getCampaignPlatforms(),
    staleTime: 60 * 1000,
  });

  // Query campaign performance
  const {
    data: performanceData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['crm-campaign-performance', selectedBranch, selectedPlatform, startDate, endDate, searchTerm],
    queryFn: () => {
      const p: Parameters<typeof crmApi.getCampaignPerformance>[0] = {};
      if (selectedBranch) p.branch_id = selectedBranch;
      if (selectedPlatform) p.platform = selectedPlatform;
      if (startDate) p.start_date = startDate;
      if (endDate) p.end_date = endDate;
      if (searchTerm) p.search = searchTerm;
      return crmApi.getCampaignPerformance(p);
    },
  });

  // Drilldown queries for Inspect modal
  const { data: drilldownLeads = [], isLoading: loadingDrillLeads } = useQuery({
    queryKey: ['crm-drilldown-leads', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () => {
      const p: { campaign_name?: string; platform?: string } = {};
      if (selectedCampaign?.campaign_name) p.campaign_name = selectedCampaign.campaign_name;
      if (selectedCampaign?.platform) p.platform = selectedCampaign.platform;
      return crmApi.getCampaignDrilldownLeads(p);
    },
    enabled: inspectOpen && (activeTab === 'leads' || activeTab === 'overview') && !!selectedCampaign,
  });

  const { data: drilldownTrials = [], isLoading: loadingDrillTrials } = useQuery({
    queryKey: ['crm-drilldown-trials', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () => {
      const p: { campaign_name?: string; platform?: string } = {};
      if (selectedCampaign?.campaign_name) p.campaign_name = selectedCampaign.campaign_name;
      if (selectedCampaign?.platform) p.platform = selectedCampaign.platform;
      return crmApi.getCampaignDrilldownTrials(p);
    },
    enabled: inspectOpen && (activeTab === 'trials' || activeTab === 'overview') && !!selectedCampaign,
  });

  const { data: drilldownConversions = [], isLoading: loadingDrillConversions } = useQuery({
    queryKey: ['crm-drilldown-conversions', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () => {
      const params: { campaign_name?: string; platform?: string } = {};
      if (selectedCampaign?.campaign_name) params.campaign_name = selectedCampaign.campaign_name;
      if (selectedCampaign?.platform) params.platform = selectedCampaign.platform;
      return crmApi.getCampaignDrilldownConversions(params);
    },
    enabled: inspectOpen && (activeTab === 'conversions' || activeTab === 'overview') && !!selectedCampaign,
  });

  const { data: drilldownRevenue = [], isLoading: loadingDrillRevenue } = useQuery({
    queryKey: ['crm-drilldown-revenue', selectedCampaign?.campaign_name, selectedCampaign?.platform],
    queryFn: () => {
      const params: { campaign_name?: string; platform?: string } = {};
      if (selectedCampaign?.campaign_name) params.campaign_name = selectedCampaign.campaign_name;
      if (selectedCampaign?.platform) params.platform = selectedCampaign.platform;
      return crmApi.getCampaignDrilldownRevenue(params);
    },
    enabled: inspectOpen && (activeTab === 'revenue' || activeTab === 'overview') && !!selectedCampaign,
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

  // Extract all platforms without breaking dropdown when one is selected
  const platforms = React.useMemo(() => {
    const set = new Set<string>(STANDARD_PLATFORMS);
    campaigns.forEach((c) => {
      if (c.platform) set.add(c.platform.toUpperCase());
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

  const openInspectModal = (campaign: CampaignPerformanceItem, tab: 'overview' | 'leads' | 'trials' | 'conversions' | 'revenue' = 'overview') => {
    setSelectedCampaign(campaign);
    setActiveTab(tab);
    setInspectOpen(true);
  };

  // Tracking URL generator preview
  const generatedTrackingUrl = React.useMemo(() => {
    const base = newCampaignForm.landing_page_url?.trim() || 'https://sweatfitwellness.com/trial';
    try {
      const url = new URL(base.startsWith('http') ? base : `https://${base}`);
      if (newCampaignForm.utm_source) url.searchParams.set('utm_source', newCampaignForm.utm_source.trim());
      if (newCampaignForm.utm_medium) url.searchParams.set('utm_medium', newCampaignForm.utm_medium.trim());
      const cName = newCampaignForm.utm_campaign || newCampaignForm.campaign_name.trim().toLowerCase().replace(/\s+/g, '_');
      if (cName) url.searchParams.set('utm_campaign', cName);
      if (newCampaignForm.utm_content) url.searchParams.set('utm_content', newCampaignForm.utm_content.trim());
      if (newCampaignForm.utm_term) url.searchParams.set('utm_term', newCampaignForm.utm_term.trim());
      if (newCampaignForm.branch_id && newCampaignForm.branch_id !== 'ALL') {
        url.searchParams.set('branch', newCampaignForm.branch_id);
      }
      return url.toString();
    } catch {
      return base;
    }
  }, [newCampaignForm]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignForm.campaign_name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateCampaignPayload = {
        ...newCampaignForm,
        utm_campaign: newCampaignForm.utm_campaign || newCampaignForm.campaign_name.trim().toLowerCase().replace(/\s+/g, '_'),
      };
      await crmApi.createCampaign(payload);
      toast.success(`Campaign "${newCampaignForm.campaign_name}" created with tracked UTM URL`);
      setCreateModalOpen(false);
      setNewCampaignForm({
        campaign_name: '',
        platform: 'META',
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: '',
        utm_content: '',
        utm_term: '',
        landing_page_url: 'https://sweatfitwellness.com/trial',
        branch_id: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['crm-campaign-performance'] });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    toast.success('Tracked campaign URL copied to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="flex flex-col min-w-0 w-full min-h-full bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="Marketing Campaigns"
        subtitle="Multi-channel acquisition attribution, commercial conversion tracking, and actual paid revenue performance."
        icon={Megaphone}
        badgeText="Acquisition Analytics"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 h-9"
              title="Create new tracked campaign"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: ['crm-campaign-performance'] }),
                  queryClient.invalidateQueries({ queryKey: ['crm-campaign-platforms'] }),
                  refetch(),
                ]);
              }}
              disabled={isFetching}
              className="gap-1.5 h-9"
              title="Refresh campaign data"
            >
              <RotateCw className={cn("w-3.5 h-3.5 transition-transform", isFetching && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <main className="w-full min-w-0 max-w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
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

        {/* Platform Integration Summary Bar */}
        {platformStatuses.length > 0 && (
          <div className="bg-muted/30 border border-border/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Connected Ad & Channel Integrations:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {platformStatuses.map((ps) => (
                <div
                  key={ps.platform}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-[11px] shadow-xs"
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    ps.status === 'ACTIVE' ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
                  )} />
                  <span className="font-semibold text-foreground">{ps.platform}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {ps.pages_count > 0 ? `(${ps.pages_count} Pages)` : `(${ps.status})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground tracking-wide">
                Filter Campaigns
              </span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                  Active
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <X className="w-3 h-3" />
                Reset Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-3 items-end min-w-0">
            {/* Search */}
            <div className="xl:col-span-3 min-w-0">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Search
              </label>
              <div className="relative min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Campaign name, UTM..."
                  className="pl-9 h-9 text-xs w-full min-w-0"
                />
              </div>
            </div>

            {/* Platform */}
            <div className="xl:col-span-2 min-w-0">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full min-w-0 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Scope */}
            <div className="xl:col-span-3 min-w-0">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full min-w-0 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {formatBranchOptionLabel(b)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 min-w-0">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                <div className="min-w-0">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs px-2 w-full min-w-0"
                    aria-label="Start Date"
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs px-2 w-full min-w-0"
                    aria-label="End Date"
                  />
                </div>
              </div>
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
          <div className="space-y-4 min-w-0">
            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-xl shadow-xs overflow-hidden min-w-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-3 px-4 whitespace-nowrap">Campaign Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">Platform</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Leads</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Trials</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Conversions</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">Conversion Rate</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Paid Revenue</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
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
                            onClick={() => openInspectModal(c, 'leads')}
                            className="font-medium text-primary hover:underline"
                            title="Inspect attributed leads"
                          >
                            {c.leads_count}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => openInspectModal(c, 'trials')}
                            className={cn(
                              'font-medium',
                              c.trials_count > 0 ? 'text-amber-600 dark:text-amber-400 hover:underline' : 'text-muted-foreground'
                            )}
                            title="Inspect booked workout trials"
                          >
                            {c.trials_count}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => openInspectModal(c, 'conversions')}
                            className={cn(
                              'font-medium',
                              c.conversions_count > 0 ? 'text-emerald-600 dark:text-emerald-400 hover:underline' : 'text-muted-foreground'
                            )}
                            title="Inspect converted members"
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
                            onClick={() => openInspectModal(c, 'revenue')}
                            className={cn(
                              parseFloat(c.paid_revenue) > 0
                                ? 'text-foreground hover:text-primary hover:underline'
                                : 'text-muted-foreground'
                            )}
                            title="Inspect authoritative paid orders"
                          >
                            ₹{parseFloat(c.paid_revenue).toLocaleString('en-IN')}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openInspectModal(c, 'overview')}
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
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground truncate" title={c.campaign_name}>
                        {c.campaign_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.platform}
                        </Badge>
                        {c.branches && c.branches[0] && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {c.branches[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
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
                        onClick={() => openInspectModal(c, 'leads')}
                        className="font-bold text-primary hover:underline"
                      >
                        {c.leads_count}
                      </button>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Trials</span>
                      <button
                        type="button"
                        onClick={() => openInspectModal(c, 'trials')}
                        className={cn(
                          'font-bold',
                          c.trials_count > 0 ? 'text-amber-600 dark:text-amber-400 hover:underline' : 'text-muted-foreground'
                        )}
                      >
                        {c.trials_count}
                      </button>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Conversions</span>
                      <button
                        type="button"
                        onClick={() => openInspectModal(c, 'conversions')}
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
                      onClick={() => openInspectModal(c, 'overview')}
                      className="h-7 text-xs px-2.5 gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Campaign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CREATE CAMPAIGN & UTM GENERATOR MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <span>Create Marketing Campaign</span>
            </DialogTitle>
            <DialogDescription>
              Configure an acquisition source with tracked UTM parameters for end-to-end multi-channel attribution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campaign Name *</Label>
              <Input
                required
                placeholder="e.g. Winter Pilates Promo 2026"
                value={newCampaignForm.campaign_name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCampaignForm((prev) => ({
                    ...prev,
                    campaign_name: val,
                    utm_campaign: prev.utm_campaign || val.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                  }));
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Marketing Platform *</Label>
                <select
                  value={newCampaignForm.platform}
                  onChange={(e) => {
                    const plat = e.target.value;
                    let defaultSrc = 'meta';
                    if (plat === 'GOOGLE') defaultSrc = 'google';
                    else if (plat === 'INSTAGRAM') defaultSrc = 'instagram';
                    else if (plat === 'FACEBOOK') defaultSrc = 'facebook';
                    else if (plat === 'WHATSAPP') defaultSrc = 'whatsapp';
                    else if (plat === 'WEBSITE') defaultSrc = 'website';
                    setNewCampaignForm((prev) => ({
                      ...prev,
                      platform: plat,
                      utm_source: defaultSrc,
                    }));
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="META">Meta Ads (Instagram + Facebook)</option>
                  <option value="GOOGLE">Google Ads</option>
                  <option value="INSTAGRAM">Instagram Direct</option>
                  <option value="FACEBOOK">Facebook Page</option>
                  <option value="WHATSAPP">WhatsApp Direct</option>
                  <option value="WEBSITE">Direct Website / Landing Form</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Branch</Label>
                <select
                  value={newCampaignForm.branch_id || ''}
                  onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="">All Branches (Global Organization)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {formatBranchOptionLabel(b)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Destination / Landing Page URL</Label>
              <Input
                placeholder="https://sweatfitwellness.com/trial"
                value={newCampaignForm.landing_page_url}
                onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, landing_page_url: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* UTM Parameters */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Tracked UTM Parameters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">utm_source</Label>
                  <Input
                    value={newCampaignForm.utm_source}
                    onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, utm_source: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">utm_medium</Label>
                  <Input
                    value={newCampaignForm.utm_medium}
                    onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, utm_medium: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">utm_campaign</Label>
                  <Input
                    value={newCampaignForm.utm_campaign}
                    onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, utm_campaign: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">utm_content</Label>
                  <Input
                    placeholder="e.g. carousel_v1"
                    value={newCampaignForm.utm_content}
                    onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, utm_content: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] text-muted-foreground uppercase">utm_term</Label>
                  <Input
                    placeholder="e.g. pilates+andheri"
                    value={newCampaignForm.utm_term}
                    onChange={(e) => setNewCampaignForm((prev) => ({ ...prev, utm_term: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Generated Tracking Link Preview */}
            <div className="p-3 bg-card rounded-lg border border-primary/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Live Generated Tracking URL
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedTrackingUrl)}
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary gap-1"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground break-all bg-muted/40 p-2 rounded">
                {generatedTrackingUrl}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Generate & Save Campaign</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FULL CAMPAIGN INSPECT & DRILLDOWN DIALOG */}
      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="space-y-1 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base font-bold truncate">
                  <Megaphone className="w-5 h-5 text-primary shrink-0" />
                  <span className="truncate">{selectedCampaign?.campaign_name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Inspect multi-touch attribution, trial velocity, and audited commercial revenue.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="secondary" className="text-xs font-semibold">
                  {selectedCampaign?.platform}
                </Badge>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {selectedCampaign?.status || 'ACTIVE'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Metrics Header inside Inspect */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-muted/40 border border-border p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Leads</span>
              <span className="text-base font-bold text-foreground">{selectedCampaign?.leads_count ?? 0}</span>
            </div>
            <div className="bg-muted/40 border border-border p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Trials Booked</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{selectedCampaign?.trials_count ?? 0}</span>
            </div>
            <div className="bg-muted/40 border border-border p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Conversions</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{selectedCampaign?.conversions_count ?? 0}</span>
            </div>
            <div className="bg-muted/40 border border-border p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Paid Revenue</span>
              <span className="text-base font-bold font-mono text-foreground">₹{parseFloat(selectedCampaign?.paid_revenue || '0').toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Inspect Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full mt-2">
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="leads" className="text-xs">Leads ({selectedCampaign?.leads_count ?? 0})</TabsTrigger>
              <TabsTrigger value="trials" className="text-xs">Trials ({selectedCampaign?.trials_count ?? 0})</TabsTrigger>
              <TabsTrigger value="conversions" className="text-xs">Members ({selectedCampaign?.conversions_count ?? 0})</TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
            </TabsList>

            {/* TAB: OVERVIEW & UTM ATTRIBUTION */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary" />
                  Campaign Metadata & Attribution Parameters
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Source Platform</span>
                    <p className="font-semibold text-foreground">{selectedCampaign?.platform || 'Direct'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Branch Association</span>
                    <p className="font-semibold text-foreground">
                      {selectedCampaign?.branches && selectedCampaign.branches.length > 0
                        ? selectedCampaign.branches.join(', ')
                        : 'All Branches (Global)'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">utm_source</span>
                    <p className="font-mono text-foreground">{selectedCampaign?.utm_source || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">utm_medium</span>
                    <p className="font-mono text-foreground">{selectedCampaign?.utm_medium || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">utm_campaign</span>
                    <p className="font-mono text-foreground">{selectedCampaign?.utm_campaign || selectedCampaign?.campaign_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">utm_content / term</span>
                    <p className="font-mono text-foreground">
                      {[selectedCampaign?.utm_content, selectedCampaign?.utm_term].filter(Boolean).join(' | ') || '—'}
                    </p>
                  </div>
                </div>

                {selectedCampaign?.tracking_url && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Tracked Landing URL</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedCampaign.tracking_url!)}
                        className="h-5 px-2 text-[10px] text-primary hover:text-primary gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </Button>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground break-all bg-muted/40 p-2 rounded">
                      {selectedCampaign.tracking_url}
                    </p>
                  </div>
                )}
              </div>

              {/* Funnel Velocity Summary */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Conversion Yield & Funnel Performance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-muted/30 rounded border border-border">
                    <span className="text-muted-foreground block text-[10px]">Lead-to-Trial Rate</span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedCampaign && selectedCampaign.leads_count > 0
                        ? `${((selectedCampaign.trials_count / selectedCampaign.leads_count) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded border border-border">
                    <span className="text-muted-foreground block text-[10px]">Trial-to-Member Rate</span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedCampaign && selectedCampaign.trials_count > 0
                        ? `${((selectedCampaign.conversions_count / selectedCampaign.trials_count) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded border border-border">
                    <span className="text-muted-foreground block text-[10px]">Revenue Per Converted Member</span>
                    <span className="text-sm font-bold text-foreground font-mono">
                      {selectedCampaign && selectedCampaign.conversions_count > 0
                        ? `₹${Math.round(parseFloat(selectedCampaign.paid_revenue) / selectedCampaign.conversions_count).toLocaleString('en-IN')}`
                        : '₹0'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: LEADS */}
            <TabsContent value="leads" className="pt-2">
              {loadingDrillLeads ? (
                <CRMLoadingState message="Loading attributed leads..." />
              ) : drilldownLeads.length === 0 ? (
                <CRMEmptyState
                  icon={Users}
                  title="No Attributed Leads Found"
                  description="No individual lead records matched this acquisition campaign."
                />
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                        <tr className="border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3">Lead Name</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3">Captured Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {drilldownLeads.map((l: any) => (
                          <tr key={l.id} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {l.first_name} {l.last_name}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                              <div>{formatDisplayPhone(l.phone_normalized, canViewPhoneNumber) || '—'}</div>
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
            </TabsContent>

            {/* TAB: TRIALS */}
            <TabsContent value="trials" className="pt-2">
              {loadingDrillTrials ? (
                <CRMLoadingState message="Loading workout trial visits..." />
              ) : drilldownTrials.length === 0 ? (
                <CRMEmptyState
                  icon={CalendarDays}
                  title="No Trial Bookings Found"
                  description="No workout trials have been scheduled for leads from this campaign."
                />
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                        <tr className="border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3">Prospect Name</th>
                          <th className="py-2.5 px-3">Scheduled Slot</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-center">Attended</th>
                          <th className="py-2.5 px-3">Assigned Trainer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {drilldownTrials.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {t.lead_name}
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {formatDisplayPhone(t.phone_normalized, canViewPhoneNumber) || ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                              {t.scheduled_start ? new Date(t.scheduled_start).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {t.branch_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  t.status === 'ATTENDED' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                  t.status === 'NO_SHOW' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                  "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {t.attended ? (
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  Yes
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {t.trainer_name || 'Unassigned'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: CONVERSIONS */}
            <TabsContent value="conversions" className="pt-2">
              {loadingDrillConversions ? (
                <CRMLoadingState message="Loading converted member records..." />
              ) : drilldownConversions.length === 0 ? (
                <CRMEmptyState
                  icon={UserCheck}
                  title="No Converted Members"
                  description="No commercial member conversions have occurred yet from this campaign."
                />
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                        <tr className="border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3">Member Name</th>
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
            </TabsContent>

            {/* TAB: REVENUE */}
            <TabsContent value="revenue" className="pt-2">
              {loadingDrillRevenue ? (
                <CRMLoadingState message="Loading paid order transactions..." />
              ) : drilldownRevenue.length === 0 ? (
                <CRMEmptyState
                  icon={DollarSign}
                  title="No Paid Orders Found"
                  description="No successful paid transactions associated with converted leads from this campaign."
                />
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                        <tr className="border-b border-border text-muted-foreground font-semibold">
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
