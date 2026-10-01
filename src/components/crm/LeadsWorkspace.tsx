/**
 * src/components/crm/LeadsWorkspace.tsx — Layer 2 Production CRM & Leads Workspace
 * Real API integration with backend tenant database. Zero mock fallback.
 * Responsive across Mobile (320px+), Tablet, Laptop, and Desktop.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowRightCircle,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Kanban,
  List,
  Eye,
  Lock,
  AlertTriangle,
  Inbox,
  MapPin,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AttentionQueueView } from './AttentionQueueView';

import { crmApi } from '@/api/endpoints/crmApi';
import type { Lead, LeadStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useLocation } from '@tanstack/react-router';
import { CRMPageHeader } from './common/CRMPageHeader';
import { CRMKpiTile } from './common/CRMKpiTile';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';
import { formatCrmLabel, formatBranchOptionLabel, formatBranchTitle, formatBranchAddressOnly } from '@/lib/crmLabels';
import { usePermissions } from '@/lib/permissions';
import { NewLeadModal } from './NewLeadModal';
import { LeadDetailModal } from './LeadDetailModal';
import { BookTrialModal } from './BookTrialModal';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgBadge: string }> = {
  NEW_LEAD: { label: 'New Lead', color: 'text-blue-500 border-blue-500/20', bgBadge: 'bg-blue-500/10' },
  TRIAL_BOOKED: { label: 'Trial Booked', color: 'text-amber-500 border-amber-500/20', bgBadge: 'bg-amber-500/10' },
  TRIAL_CONFIRMED: { label: 'Trial Confirmed', color: 'text-indigo-500 border-indigo-500/20', bgBadge: 'bg-indigo-500/10' },
  TRIAL_ATTENDED: { label: 'Trial Attended', color: 'text-teal-500 border-teal-500/20', bgBadge: 'bg-teal-500/10' },
  NO_SHOW: { label: 'No Show', color: 'text-rose-500 border-rose-500/20', bgBadge: 'bg-rose-500/10' },
  FOLLOW_UP_PENDING: { label: 'Follow-up Pending', color: 'text-purple-500 border-purple-500/20', bgBadge: 'bg-purple-500/10' },
  INTERESTED: { label: 'Interested', color: 'text-cyan-500 border-cyan-500/20', bgBadge: 'bg-cyan-500/10' },
  HOT_LEAD: { label: 'Hot Lead', color: 'text-orange-500 border-orange-500/20', bgBadge: 'bg-orange-500/10' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'text-yellow-600 border-yellow-500/20', bgBadge: 'bg-yellow-500/10' },
  CONVERTED: { label: 'Converted Member', color: 'text-emerald-500 border-emerald-500/20', bgBadge: 'bg-emerald-500/10' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'text-muted-foreground border-border', bgBadge: 'bg-muted' },
  LOST: { label: 'Lost', color: 'text-muted-foreground border-border', bgBadge: 'bg-muted' },
};

const STAGE_GROUPS: Array<{
  category: string;
  stages: Array<{
    status: LeadStatus;
    label: string;
    description: string;
    dotColor: string;
  }>;
}> = [
  {
    category: 'Outreach & Prospecting',
    stages: [
      { status: 'NEW_LEAD', label: 'New Lead', description: 'Fresh inbound / uncontacted', dotColor: 'bg-blue-500' },
      { status: 'FOLLOW_UP_PENDING', label: 'Follow-up Pending', description: 'Contact initiated, waiting response', dotColor: 'bg-purple-500' },
      { status: 'INTERESTED', label: 'Interested', description: 'Expressed interest in programs', dotColor: 'bg-cyan-500' },
    ],
  },
  {
    category: 'Trial Journey',
    stages: [
      { status: 'TRIAL_BOOKED', label: 'Trial Booked', description: 'Trial session scheduled', dotColor: 'bg-amber-500' },
      { status: 'TRIAL_CONFIRMED', label: 'Trial Confirmed', description: 'Confirmed attendance with lead', dotColor: 'bg-indigo-500' },
      { status: 'TRIAL_ATTENDED', label: 'Trial Attended', description: 'Workout completed', dotColor: 'bg-teal-500' },
      { status: 'NO_SHOW', label: 'No Show', description: 'Missed scheduled trial', dotColor: 'bg-rose-500' },
    ],
  },
  {
    category: 'Closing & Membership',
    stages: [
      { status: 'HOT_LEAD', label: 'Hot Lead', description: 'Ready to buy, negotiating package', dotColor: 'bg-orange-500' },
      { status: 'PAYMENT_PENDING', label: 'Payment Pending', description: 'Invoice / link sent, awaiting payment', dotColor: 'bg-yellow-500' },
      { status: 'CONVERTED', label: 'Converted Member', description: 'Paid & active membership', dotColor: 'bg-emerald-500' },
    ],
  },
  {
    category: 'Closed / Inactive',
    stages: [
      { status: 'NOT_INTERESTED', label: 'Not Interested', description: 'Declined current offers', dotColor: 'bg-slate-400' },
      { status: 'LOST', label: 'Lost', description: 'Dropped out of pipeline', dotColor: 'bg-stone-500' },
    ],
  },
];

const PIPELINE_COLUMNS: Array<{
  status: LeadStatus;
  label: string;
  dot: string;
  badgeColor: string;
}> = [
  { status: 'NEW_LEAD', label: 'New Lead', dot: 'bg-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { status: 'TRIAL_BOOKED', label: 'Trial Booked', dot: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { status: 'INTERESTED', label: 'Interested', dot: 'bg-purple-500', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { status: 'HOT_LEAD', label: 'Hot Lead', dot: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { status: 'CONVERTED', label: 'Converted', dot: 'bg-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

interface LeadsWorkspaceProps {
  initialViewMode?: 'LIST' | 'PIPELINE' | 'ATTENTION';
}

export function LeadsWorkspace({ initialViewMode = 'LIST' }: LeadsWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  // Authoritative Effective Permissions
  const canCreate = can('crm.leads.create') || can('sales.leads.create');
  const canEdit = can('crm.leads.edit') || can('sales.leads.edit');
  const canView = can('crm.leads.view') || can('sales.leads.view') || canCreate || canEdit;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = React.useState<string>('ALL');
  const [campaignFilter, setCampaignFilter] = React.useState<string>('');
  const [slaFilter, setSlaFilter] = React.useState<string>('ALL');
  const [branchFilter, setBranchFilter] = React.useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = React.useState<'ALL' | 'MY_LEADS' | 'UNASSIGNED'>('ALL');
  const [viewMode, setViewMode] = React.useState<'LIST' | 'PIPELINE' | 'ATTENTION'>(initialViewMode);

  React.useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const handleToggleView = (mode: 'LIST' | 'PIPELINE' | 'ATTENTION') => {
    setViewMode(mode);
    if (mode === 'LIST') router.navigate({ to: '/crm/leads' });
    else if (mode === 'PIPELINE') router.navigate({ to: '/crm/pipeline' });
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);
  const [isTrialOpen, setIsTrialOpen] = React.useState(false);

  // Status Change Form State
  const [targetStatus, setTargetStatus] = React.useState<LeadStatus>('INTERESTED');
  const [statusReason, setStatusReason] = React.useState('');

  // Queries
  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => crmApi.getLeadSources(),
    enabled: canView,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches'],
    queryFn: () => crmApi.getBranches(),
    enabled: canView,
  });

  const {
    data: leads = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', statusFilter, searchQuery, sourceFilter, campaignFilter, slaFilter, branchFilter, scopeFilter],
    queryFn: () => {
      const p: Parameters<typeof crmApi.getLeads>[0] = {
        current_status: statusFilter,
      };
      if (searchQuery) p.search = searchQuery;
      if (sourceFilter !== 'ALL') p.lead_source_id = sourceFilter;
      if (campaignFilter.trim()) p.campaign = campaignFilter.trim();
      if (slaFilter !== 'ALL') p.sla_status = slaFilter;
      if (branchFilter !== 'ALL') p.branch_id = branchFilter;
      if (scopeFilter === 'MY_LEADS') p.assigned_to_me = true;
      if (scopeFilter === 'UNASSIGNED') p.unassigned = true;
      return crmApi.getLeads(p);
    },
    enabled: canView,
  });

  // Deep-link from notification or URL (?lead_id=...)
  const routerLocation = useLocation();
  const deepLinkLeadId = React.useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('lead_id') || (routerLocation.search as any)?.lead_id || null;
    } catch {
      return null;
    }
  }, [routerLocation.search, window.location.search]);

  React.useEffect(() => {
    if (!deepLinkLeadId) return;
    if (selectedLead?.id === deepLinkLeadId && isDetailOpen) return;

    // 1. Try finding in loaded leads list first
    const found = leads.find((l) => l.id === deepLinkLeadId);
    if (found) {
      setSelectedLead(found);
      setIsDetailOpen(true);
      return;
    }

    // 2. Fetch directly by canonical detail endpoint independent of filters/pagination
    let isCancelled = false;
    crmApi.getLead(deepLinkLeadId)
      .then((lead) => {
        if (!isCancelled && lead) {
          setSelectedLead(lead);
          setIsDetailOpen(true);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load deep-linked lead:', err);
          toast.error('Unable to open the requested lead. It may have been moved or you may lack branch permissions.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [deepLinkLeadId, leads]);

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setSelectedLead(null);
      // Cleanly clear lead_id query param from URL without full-page reload
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('lead_id')) {
          url.searchParams.delete('lead_id');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch {
        // ignore
      }
    }
  };

  const metrics = React.useMemo(() => {
    return {
      total: leads.length,
      converted: leads.filter((l) => l.current_status === 'CONVERTED').length,
      inquiries: leads.filter((l) => ['NEW_LEAD', 'INTERESTED', 'HOT_LEAD'].includes(l.current_status)).length,
      trials: leads.filter((l) => ['TRIAL_BOOKED', 'TRIAL_CONFIRMED', 'TRIAL_ATTENDED'].includes(l.current_status)).length,
      slaBreaches: leads.filter((l) => l.sla?.sla_status === 'BREACHED').length,
    };
  }, [leads]);

  const { data: metadata } = useQuery({
    queryKey: ['lead-metadata'],
    queryFn: () => crmApi.getMetadata(),
    enabled: canView,
    staleTime: 10 * 60 * 1000,
  });

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: any }) =>
      crmApi.transitionStatus(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead stage updated successfully.');
      setIsStatusOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update stage');
    },
  });


  const handleTransitionStatus = () => {
    if (!selectedLead) return;
    if (['TRIAL_BOOKED', 'TRIAL_CONFIRMED', 'TRIAL_ATTENDED', 'NO_SHOW'].includes(targetStatus)) {
      setIsStatusOpen(false);
      setIsTrialOpen(true);
      toast.info('Book a real trial session to move this lead to Trial Booked.');
      return;
    }
    transitionMutation.mutate({
      leadId: selectedLead.id,
      payload: {
        new_status: targetStatus,
        reason_code: 'CRM_UI_CHANGE',
        reason_text: statusReason || undefined,
      },
    });
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const openStatusModal = (lead: Lead) => {
    if (lead.current_status === 'CONVERTED' || lead.action_eligibility?.can_move_stage === false) {
      toast.info('This lead has already been converted to a member. The CRM sales journey is terminal.');
      return;
    }
    setSelectedLead(lead);
    setTargetStatus(lead.current_status);
    setIsStatusOpen(true);
  };

  const openTrialModal = (lead: Lead) => {
    if (lead.current_status === 'CONVERTED' || lead.action_eligibility?.can_book_trial === false) {
      toast.info('This lead has already been converted to a member. Bookings must be made via the Member schedule.');
      return;
    }
    setSelectedLead(lead);
    setIsTrialOpen(true);
  };

  // RBAC View Denied State
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          You do not have permission to view CRM leads. Contact your studio administrator to grant{' '}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">crm.leads.view</code> privilege.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <CRMPageHeader
        title={viewMode === 'LIST' ? 'Leads & Prospects' : 'Visual Sales Pipeline'}
        subtitle={
          viewMode === 'LIST'
            ? 'Commercial prospect directory: lead intake, touchpoint history, trial bookings, and conversion tracking.'
            : 'Kanban board of open deals, prospective trials, and stage progression.'
        }
        icon={viewMode === 'LIST' ? Users : Kanban}
        badgeText={viewMode === 'LIST' ? 'Commercial' : 'Pipeline'}
        actions={
          <>
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => handleToggleView('LIST')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'LIST'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => handleToggleView('PIPELINE')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'PIPELINE'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Pipeline Board"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => handleToggleView('ATTENTION')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'ATTENTION'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Attention Queue"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Attention</span>
                {metrics.slaBreaches > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                    {metrics.slaBreaches}
                  </span>
                )}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
              title="Refresh leads"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Lead</span>
              </Button>
            )}
          </>
        }
      />

      {/* Main Content Area */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
          <CRMKpiTile
            label="Total Leads"
            value={metrics.total}
            isLoading={isLoading}
            isError={isError}
            hint="All registered prospects"
          />
          <CRMKpiTile
            label="Active Inquiries"
            value={metrics.inquiries}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'In Pipeline', variant: 'info' }}
            hint="New & Interested"
          />
          <CRMKpiTile
            label="Trial Engagements"
            value={metrics.trials}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'Booked / Attended', variant: 'warning' }}
            hint="Prospect workouts"
          />
          <CRMKpiTile
            label="Converted Members"
            value={metrics.converted}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'Paying', variant: 'positive' }}
            hint="Successful conversions"
          />
          <CRMKpiTile
            label="SLA Breached"
            value={metrics.slaBreaches}
            isLoading={isLoading}
            isError={isError}
            badge={{
              text: metrics.slaBreaches > 0 ? 'Urgent' : 'Clear',
              variant: metrics.slaBreaches > 0 ? 'negative' : 'positive',
            }}
            hint="Require outreach"
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4 mb-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:max-w-xl">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, phone, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm w-full"
              />
            </div>
            {/* Scope Filter Tabs: All, My Leads, Unassigned */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  scopeFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Permitted
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('MY_LEADS')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  scopeFilter === 'MY_LEADS'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Leads
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('UNASSIGNED')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  scopeFilter === 'UNASSIGNED'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full lg:w-auto shrink-0 no-scrollbar">
            {['ALL', 'NEW_LEAD', 'TRIAL_BOOKED', 'INTERESTED', 'HOT_LEAD', 'CONVERTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {st === 'ALL' ? 'All Leads' : STATUS_CONFIG[st as LeadStatus]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Attribution & SLA Filters Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6 p-3 rounded-xl border border-border/70 bg-card/40 text-xs">
          {/* Branch Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3 text-muted-foreground/70" /> Branch
            </span>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full h-8 text-xs bg-background">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {formatBranchOptionLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground/70" /> Lead Source
            </span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full h-8 text-xs bg-background">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-muted-foreground/70" /> Campaign
            </span>
            <Input
              placeholder="Filter by campaign..."
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          {/* SLA Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground/70" /> SLA Response Status
            </span>
            <Select value={slaFilter} onValueChange={setSlaFilter}>
              <SelectTrigger className="w-full h-8 text-xs bg-background">
                <SelectValue placeholder="All SLA States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All SLA States</SelectItem>
                <SelectItem value="BREACHED" className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ Breached SLA</SelectItem>
                <SelectItem value="ON_TRACK" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✅ On Track</SelectItem>
                <SelectItem value="DISABLED" className="text-xs">Policy Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : viewMode === 'ATTENTION' ? (
          /* --- ATTENTION QUEUE VIEW --- */
          <AttentionQueueView
            branchFilter={branchFilter}
            searchQuery={searchQuery}
            onOpenLeadDetail={openLeadDetail}
            onBookTrialClick={openTrialModal}
            onStatusTransitionClick={openStatusModal}
          />
        ) : isError ? (
          <CRMErrorState
            title="Unable to Load Leads"
            message={
              (error as any)?.response?.data?.error ||
              (error as any)?.response?.data?.detail ||
              (error as Error)?.message ||
              'A valid tenant authentication is required to access leads.'
            }
            onRetry={() => refetch()}
          />
        ) : leads.length === 0 ? (
          <CRMEmptyState
            icon={Users}
            title="No Leads Found"
            description="There are no prospective members matching your current filter criteria. Book or register an enquiry to build your sales pipeline."
            actionLabel={canCreate ? 'Add First Lead' : undefined}
            onAction={() => setIsCreateOpen(true)}
            canAction={canCreate}
          />
        ) : viewMode === 'PIPELINE' ? (
          /* --- PIPELINE KANBAN BOARD VIEW (Fully Responsive Horizontal Canvas) --- */
          <div className="w-full overflow-x-auto pb-6 scrollbar-thin">
            <div className="flex gap-4 min-w-max pb-2">
              {PIPELINE_COLUMNS.map((col) => {
                const colLeads = leads.filter((l) => l.current_status === col.status);
                return (
                  <div
                    key={col.status}
                    className="w-[280px] sm:w-[310px] shrink-0 rounded-2xl border border-border/70 bg-card/60 dark:bg-muted/10 p-3.5 flex flex-col shadow-xs"
                    style={{ minHeight: 'calc(100vh - 360px)' }}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot} shrink-0`} />
                        <span className="font-bold text-xs text-foreground uppercase tracking-wider truncate">
                          {col.label}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 ${col.badgeColor}`}>
                        {colLeads.length}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                      {colLeads.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center p-4 text-center text-muted-foreground/60 text-xs border border-dashed border-border/60 rounded-xl bg-muted/10">
                          <Inbox className="w-5 h-5 mb-1.5 opacity-40" />
                          <span>No leads in {col.label}</span>
                        </div>
                      ) : (
                        colLeads.map((lead) => {
                          const initials = `${lead.first_name?.[0] || ''}${lead.last_name?.[0] || ''}`.toUpperCase() || 'L';
                          return (
                            <div
                              key={lead.id}
                              onClick={() => openLeadDetail(lead)}
                              className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer space-y-2.5 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                    {lead.first_name} {lead.last_name}
                                  </div>
                                </div>
                                <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>

                              {lead.interested_program_name && (
                                <div className="text-[11px] text-primary font-semibold truncate bg-primary/5 px-2 py-0.5 rounded-md inline-block">
                                  {lead.interested_program_name}
                                </div>
                              )}

                              {lead.attention?.is_stuck && (
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                                  <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                                  <span className="truncate">{lead.attention.primary_reason_display || 'Action Required'}</span>
                                </div>
                              )}

                              <div className="text-[11px] text-muted-foreground space-y-1">
                                {lead.phone_normalized && (
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <Phone className="w-3 h-3 opacity-60" />
                                    <span>{lead.phone_normalized}</span>
                                  </div>
                                )}
                                {lead.branch_name && (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Building2 className="w-3 h-3 opacity-60 shrink-0" />
                                    <span className="truncate">
                                      {(() => {
                                        const matchingBranch = branches.find(
                                          (b) => b.id === lead.branch || b.name === lead.branch_name
                                        );
                                        return matchingBranch ? formatBranchTitle(matchingBranch) : lead.branch_name;
                                      })()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-medium text-muted-foreground text-[10px]">Assigned to:</span>
                                  {lead.assigned_sales_name ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary truncate">
                                      {lead.assigned_sales_name}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      Unassigned Lead
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="truncate max-w-[120px]">{lead.source_name || 'Direct'}</span>
                                {lead.current_status === 'CONVERTED' || lead.converted_member || (lead.action_eligibility?.is_terminal && lead.action_eligibility?.terminal_reason === 'CONVERTED') ? (
                                  (lead.converted_member?.member_id || lead.converted_user_profile) ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.navigate({
                                          to: '/members/client-360',
                                          search: { memberId: lead.converted_member?.member_id || lead.converted_user_profile } as any,
                                        });
                                      }}
                                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-[11px] flex items-center gap-0.5 shrink-0 cursor-pointer"
                                    >
                                      Member 360 &rarr;
                                    </button>
                                  ) : null
                                ) : canEdit ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStatusModal(lead);
                                    }}
                                    className="text-primary hover:underline font-semibold text-[11px] flex items-center gap-0.5 shrink-0 cursor-pointer"
                                  >
                                    Move &rarr;
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* --- LIST / TABLE VIEW --- */
          <>
            {/* Desktop Full Data Table (1280px+) */}
            <div className="hidden xl:block rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[1020px]">
                  <thead className="bg-muted/40 border-b border-border/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 min-w-[220px]">Lead Name</th>
                      <th className="px-4 py-3.5 min-w-[190px]">Contact</th>
                      <th className="px-4 py-3.5 min-w-[170px]">Branch &amp; Interest</th>
                      <th className="px-4 py-3.5 min-w-[170px]">Attribution &amp; Source</th>
                      <th className="px-4 py-3.5 min-w-[190px]">Stage &amp; SLA Status</th>
                      <th className="px-5 py-3.5 min-w-[215px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leads.map((lead) => {
                      const statusConf = STATUS_CONFIG[lead.current_status] || {
                        label: lead.current_status,
                        color: 'text-muted-foreground border-border',
                        bgBadge: 'bg-muted',
                      };
                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => openLeadDetail(lead)}
                        >
                          {/* 1. Lead Name */}
                          <td className="px-5 py-3.5 min-w-[220px]">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs">
                                {lead.first_name.substring(0, 1)}
                                {lead.last_name.substring(0, 1)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                {lead.area && (
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate" title={lead.area}>
                                    <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                    <span className="truncate">{lead.area}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Contact */}
                          <td className="px-4 py-3.5 min-w-[190px] text-xs text-muted-foreground space-y-1">
                            {lead.phone_normalized && (
                              <div className="flex items-center gap-1.5 font-mono text-foreground/90">
                                <Phone className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                <span>{lead.phone_normalized}</span>
                              </div>
                            )}
                            {lead.email_normalized && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                <span className="truncate max-w-[170px]" title={lead.email_normalized}>{lead.email_normalized}</span>
                              </div>
                            )}
                          </td>

                          {/* 3. Branch & Interest */}
                          <td className="px-4 py-3.5 min-w-[170px] text-xs">
                            <div className="font-semibold text-foreground truncate">
                              {(() => {
                                const matchingBranch = branches.find(
                                  (b) => b.id === lead.branch || b.name === lead.branch_name
                                );
                                return matchingBranch ? formatBranchTitle(matchingBranch) : (lead.branch_name || '—');
                              })()}
                            </div>
                            {(() => {
                              const matchingBranch = branches.find(
                                (b) => b.id === lead.branch || b.name === lead.branch_name
                              );
                              const addr = matchingBranch ? formatBranchAddressOnly(matchingBranch) : '';
                              return addr ? (
                                <div className="text-[11px] text-muted-foreground truncate max-w-[170px] mt-0.5" title={addr}>
                                  📍 {addr}
                                </div>
                              ) : null;
                            })()}
                            {lead.interested_program_name ? (
                              <div className="inline-flex items-center text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">
                                {lead.interested_program_name}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-[11px] mt-0.5">General Inquiry</div>
                            )}
                          </td>

                          {/* 4. Source & Assigned */}
                          <td className="px-4 py-3.5 min-w-[170px] text-xs">
                            <div className="text-foreground font-medium">{lead.source_name || lead.first_touch_source || 'Direct / Walk In'}</div>
                            {lead.campaign_reference ? (
                              <div className="text-primary text-[11px] font-mono mt-0.5 truncate max-w-[160px]">
                                📢 {lead.campaign_reference}
                              </div>
                            ) : lead.latest_touch_source ? (
                              <div className="text-muted-foreground text-[11px] mt-0.5">
                                Latest: {lead.latest_touch_source}
                              </div>
                            ) : null}
                            <div className="text-[11px] mt-1 flex items-center gap-1.5">
                              <span className="text-muted-foreground">Assigned:</span>
                              {lead.assigned_sales_name ? (
                                <span className="font-semibold text-foreground truncate">{lead.assigned_sales_name}</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Unassigned</span>
                              )}
                            </div>
                          </td>

                          {/* 5. Stage & SLA Status */}
                          <td className="px-4 py-3.5 min-w-[190px] space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${statusConf.color} ${statusConf.bgBadge}`}
                              >
                                {statusConf.label}
                              </Badge>

                              {/* SLA response pill */}
                              {lead.sla_details?.response_sla?.status === 'MET' && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium">
                                  1st Resp: {lead.sla_details.response_sla.first_response_time_seconds ? formatDuration(lead.sla_details.response_sla.first_response_time_seconds) : 'Met'}
                                </Badge>
                              )}
                              {lead.sla_details?.response_sla?.status === 'BREACHED' && (
                                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30 font-semibold">
                                  Resp Breached
                                </Badge>
                              )}
                              {lead.sla_details?.response_sla?.status === 'PENDING' && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium">
                                  Resp Due ({lead.sla_details.response_sla.target_display || '15m'})
                                </Badge>
                              )}
                            </div>

                            {/* Attention banner / Stage age */}
                            {lead.attention?.is_stuck ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                <span>{lead.attention.primary_reason_display || 'Action Required'}</span>
                              </div>
                            ) : lead.sla_details?.stage_sla ? (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                <span>{formatDuration(lead.sla_details.stage_sla.stage_age_seconds)} in stage</span>
                              </div>
                            ) : lead.sla?.stage_age_seconds !== undefined ? (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                <span>{formatDuration(lead.sla.stage_age_seconds)} in stage</span>
                              </div>
                            ) : null}
                          </td>

                          {/* 6. Actions */}
                          <td
                            className="px-5 py-3.5 min-w-[215px] text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              const isConverted =
                                lead.current_status === 'CONVERTED' ||
                                Boolean(lead.converted_member) ||
                                (lead.action_eligibility?.can_move_stage === false && lead.action_eligibility?.terminal_reason === 'CONVERTED');
                              const memberId = lead.converted_member?.member_id || lead.converted_user_profile;

                              return (
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openLeadDetail(lead)}
                                    className="h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted text-foreground border-border/80 shadow-2xs gap-1 cursor-pointer"
                                    title="View lead profile & history"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>View Lead</span>
                                  </Button>
                                  {isConverted ? (
                                    memberId ? (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          router.navigate({
                                            to: '/members/client-360',
                                            search: { memberId } as any,
                                          })
                                        }
                                        className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1 cursor-pointer"
                                        title="Open Member 360 Profile"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Member 360</span>
                                      </Button>
                                    ) : null
                                  ) : (
                                    canEdit && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openStatusModal(lead)}
                                          className="h-7 px-2.5 text-xs font-medium bg-background hover:bg-muted text-foreground border-border/80 shadow-2xs gap-1 cursor-pointer"
                                          title="Move pipeline stage"
                                        >
                                          <ArrowRightCircle className="w-3.5 h-3.5 text-primary" />
                                          <span>Move</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => openTrialModal(lead)}
                                          className="h-7 px-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1 cursor-pointer"
                                          title="Schedule trial session"
                                        >
                                          <Calendar className="w-3.5 h-3.5" />
                                          <span>Trial</span>
                                        </Button>
                                      </>
                                    )
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile & Tablet Cards View (Responsive < 1280px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden gap-3.5">
              {leads.map((lead) => {
                const statusConf = STATUS_CONFIG[lead.current_status] || {
                  label: lead.current_status,
                  color: 'text-muted-foreground border-border',
                  bgBadge: 'bg-muted',
                };
                const locParts = [lead.address, lead.city, lead.state, lead.pincode].filter(Boolean);
                const locStr = locParts.join(', ');

                return (
                  <div
                    key={lead.id}
                    onClick={() => openLeadDetail(lead)}
                    className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    {/* Top Row: Avatar + Name & Location + Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                          {lead.first_name.substring(0, 1)}
                          {lead.last_name.substring(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground truncate">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {locStr ? (
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5" title={locStr}>
                              <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                              <span className="truncate">{locStr}</span>
                            </div>
                          ) : lead.branch_name ? (
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                              <span className="truncate">{lead.branch_name}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${statusConf.color} ${statusConf.bgBadge}`}
                      >
                        {statusConf.label}
                      </Badge>
                    </div>

                    {/* Alert Banner if Stuck or Breached */}
                    {lead.attention?.is_stuck && (
                      <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{lead.attention.primary_reason_display || 'Action Required'}</span>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Branch</span>
                        <span className="font-semibold text-foreground truncate block">
                          {lead.branch_name || 'All Branches'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Program</span>
                        <span className="font-semibold text-primary truncate block">
                          {lead.interested_program_name || 'General'}
                        </span>
                      </div>
                      {lead.phone_normalized && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Phone</span>
                          <a
                            href={`tel:${lead.phone_normalized}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-foreground hover:text-primary hover:underline truncate block"
                          >
                            {lead.phone_normalized}
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Assigned</span>
                        <span className="font-medium text-foreground truncate block">
                          {lead.assigned_sales_name || 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Stage Age</span>
                        <span className="font-mono text-muted-foreground truncate block">
                          {formatDuration(lead.sla_details?.stage_sla?.stage_age_seconds ?? lead.sla?.stage_age_seconds ?? 0)}
                        </span>
                      </div>
                      {lead.sla_details?.response_sla?.status === 'MET' && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">1st Response</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate block">
                            {formatDuration(lead.sla_details.response_sla.actual_response_seconds || 0)}
                          </span>
                        </div>
                      )}
                      {lead.sla_details?.response_sla?.status === 'BREACHED' && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">1st Response</span>
                          <span className="text-rose-600 dark:text-rose-400 font-semibold truncate block">
                            Breached
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Toolbar */}
                    {(() => {
                      const isConverted =
                        lead.current_status === 'CONVERTED' ||
                        Boolean(lead.converted_member) ||
                        (lead.action_eligibility?.can_move_stage === false && lead.action_eligibility?.terminal_reason === 'CONVERTED');
                      const memberId = lead.converted_member?.member_id || lead.converted_user_profile;

                      return (
                        <div
                          className="pt-1 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLeadDetail(lead)}
                            className="flex-1 h-8 text-xs font-medium bg-background hover:bg-muted"
                          >
                            View Details
                          </Button>
                          {isConverted ? (
                            memberId ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  router.navigate({
                                    to: '/members/client-360',
                                    search: { memberId } as any,
                                  })
                                }
                                className="flex-1 h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Member 360</span>
                              </Button>
                            ) : null
                          ) : (
                            canEdit && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openStatusModal(lead)}
                                  className="h-8 px-3 text-xs font-medium text-primary hover:bg-primary/10"
                                >
                                  Move
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openTrialModal(lead)}
                                  className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Trial
                                </Button>
                              </>
                            )
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Complete + New Lead Intake Modal */}
      <NewLeadModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => refetch()}
      />

      {/* Lead Detail / Edit Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={isDetailOpen}
        onOpenChange={handleDetailOpenChange}
        onStatusTransitionClick={(l) => openStatusModal(l)}
        onBookTrialClick={(l) => openTrialModal(l)}
      />

      {/* Transition Status Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ArrowRightCircle className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Update Lead Stage</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Transition <span className="font-semibold text-foreground">{selectedLead?.first_name} {selectedLead?.last_name}</span> to a new pipeline stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Visual Stage Transition Indicator */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Stage</span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {STATUS_CONFIG[selectedLead?.current_status || 'NEW_LEAD']?.label || selectedLead?.current_status}
                </span>
              </div>

              <div className="flex items-center justify-center size-6 rounded-full bg-background border border-border text-muted-foreground shrink-0 shadow-2xs">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0 text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">New Stage</span>
                <span className="text-xs font-bold text-primary truncate">
                  {STATUS_CONFIG[targetStatus]?.label || targetStatus}
                </span>
              </div>
            </div>

            {/* Target Stage Select (Grouped with Indicators) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Target Pipeline Stage</Label>
              <Select
                value={targetStatus}
                onValueChange={(val) => setTargetStatus(val as LeadStatus)}
              >
                <SelectTrigger className="w-full h-10 text-xs bg-background cursor-pointer">
                  <SelectValue placeholder="Select target stage" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {STAGE_GROUPS.map((group) => (
                    <SelectGroup key={group.category}>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 bg-muted/30">
                        {group.category}
                      </SelectLabel>
                      {group.stages.map((st) => {
                        const isCurrent = selectedLead?.current_status === st.status;
                        return (
                          <SelectItem key={st.status} value={st.status} className="text-xs py-2 cursor-pointer">
                            <div className="flex items-center justify-between w-full gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full shrink-0 ${st.dotColor}`} />
                                <span className="font-medium text-foreground">{st.label}</span>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                  Current
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trial Stage Helpful Notice */}
            {['TRIAL_BOOKED', 'TRIAL_CONFIRMED', 'TRIAL_ATTENDED', 'NO_SHOW'].includes(targetStatus) && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Moving to <strong>{STATUS_CONFIG[targetStatus]?.label}</strong> will open the live Class & Trial scheduler to select an available session.
                </span>
              </div>
            )}

            {/* Reason / Touchpoint Note */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Reason / Touchpoint Note</Label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <Textarea
                placeholder="e.g. Spoke on call, interested in 12-month membership"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-20 text-xs resize-none bg-background leading-relaxed"
              />

              {/* Quick tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium">Quick add:</span>
                {[
                  'Spoke on phone',
                  'WhatsApp chat',
                  'Trial attended',
                  'Payment link sent',
                  'Requested callback',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setStatusReason((prev) => (prev ? `${prev}. ${tag}` : tag));
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors text-muted-foreground cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={transitionMutation.isPending}
              onClick={handleTransitionStatus}
              className="gap-1.5 font-semibold"
            >
              {transitionMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Transition
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Real Trial Session Modal (Authoritative Timetable & Capacity Locked) */}
      <BookTrialModal
        open={isTrialOpen}
        onOpenChange={setIsTrialOpen}
        lead={selectedLead}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          refetch();
        }}
      />
    </div>
  );
}
