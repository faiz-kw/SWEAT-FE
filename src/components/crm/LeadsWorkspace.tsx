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
} from 'lucide-react';
import { toast } from 'sonner';
import { AttentionQueueView } from './AttentionQueueView';

import { crmApi } from '@/services/crmApi';
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
import { useRouter } from '@tanstack/react-router';
import { CRMPageHeader } from './common/CRMPageHeader';
import { CRMKpiTile } from './common/CRMKpiTile';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';
import { formatCrmLabel } from '@/lib/crmLabels';
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

const PIPELINE_COLUMNS: Array<{ status: LeadStatus; label: string }> = [
  { status: 'NEW_LEAD', label: 'New Lead' },
  { status: 'TRIAL_BOOKED', label: 'Trial Booked' },
  { status: 'INTERESTED', label: 'Interested' },
  { status: 'HOT_LEAD', label: 'Hot Lead' },
  { status: 'CONVERTED', label: 'Converted' },
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
    queryKey: ['leads', statusFilter, searchQuery, sourceFilter, campaignFilter, slaFilter, branchFilter],
    queryFn: () =>
      crmApi.getLeads({
        current_status: statusFilter,
        search: searchQuery || undefined,
        lead_source_id: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        campaign: campaignFilter.trim() || undefined,
        sla_status: slaFilter !== 'ALL' ? slaFilter : undefined,
        branch_id: branchFilter !== 'ALL' ? branchFilter : undefined,
      }),
    enabled: canView,
  });

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
    setSelectedLead(lead);
    setTargetStatus(lead.current_status);
    setIsStatusOpen(true);
  };

  const openTrialModal = (lead: Lead) => {
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
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
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
          />
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4 mb-5">
          <div className="relative w-full lg:max-w-md shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, phone, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm w-full"
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6 p-3 rounded-xl border border-border/70 bg-card/40 text-xs">
          {/* Branch Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Branch</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs truncate"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Lead Source</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs truncate"
            >
              <option value="ALL">All Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Campaign Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Campaign</span>
            <Input
              placeholder="Filter by campaign..."
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* SLA Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">SLA Response Status</span>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs truncate"
            >
              <option value="ALL">All SLA States</option>
              <option value="BREACHED">⚠️ Breached SLA</option>
              <option value="ON_TRACK">✅ On Track</option>
              <option value="DISABLED">Policy Disabled</option>
            </select>
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
          /* --- PIPELINE KANBAN BOARD VIEW --- */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map((col) => {
              const colLeads = leads.filter((l) => l.current_status === col.status);
              return (
                <div
                  key={col.status}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3 flex flex-col min-w-[240px] max-h-[75vh]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {colLeads.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                    {colLeads.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-xs border border-dashed border-border/50 rounded-lg">
                        Empty stage
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => openLeadDetail(lead)}
                          className="p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-all cursor-pointer shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-semibold text-xs text-foreground">
                              {lead.first_name} {lead.last_name}
                            </div>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-60 hover:opacity-100" />
                          </div>

                          {lead.interested_program_name && (
                            <div className="text-[11px] text-primary font-medium truncate">
                              {lead.interested_program_name}
                            </div>
                          )}

                          {lead.attention?.is_stuck && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                              <span className="truncate">{lead.attention.primary_reason_display || 'Action Required'}</span>
                            </div>
                          )}

                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            {lead.phone_normalized && (
                              <div className="font-mono">{lead.phone_normalized}</div>
                            )}
                            {lead.branch_name && <div>📍 {lead.branch_name}</div>}
                          </div>

                          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{lead.source_name || 'Direct'}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStatusModal(lead);
                                }}
                                className="text-primary hover:underline font-medium"
                              >
                                Move &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* --- LIST / TABLE VIEW --- */
          <>
            {/* Desktop & Tablet Data Table with Horizontal Scroll Guard */}
            <div className="hidden md:block rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[960px]">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 min-w-[200px]">Lead Name</th>
                      <th className="px-4 py-3.5 min-w-[190px]">Contact</th>
                      <th className="px-4 py-3.5 min-w-[150px]">Branch &amp; Interest</th>
                      <th className="px-4 py-3.5 min-w-[170px]">Attribution &amp; Source</th>
                      <th className="px-4 py-3.5 min-w-[150px]">Stage &amp; SLA Status</th>
                      <th className="px-4 py-3.5 min-w-[160px] text-right">Actions</th>
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
                          className="hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => openLeadDetail(lead)}
                        >
                          <td className="px-5 py-3.5 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                                {lead.first_name.substring(0, 1)}
                                {lead.last_name.substring(0, 1)}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                {lead.area && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <span>📍 {lead.area}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 min-w-[190px] text-xs text-muted-foreground space-y-0.5">
                            {lead.phone_normalized && (
                              <div className="flex items-center gap-1.5 font-mono">
                                <Phone className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                                <span>{lead.phone_normalized}</span>
                              </div>
                            )}
                            {lead.email_normalized && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                                <span className="truncate max-w-[170px]" title={lead.email_normalized}>{lead.email_normalized}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 min-w-[150px] text-xs">
                            <div className="font-medium text-foreground">{lead.branch_name || '—'}</div>
                            {lead.interested_program_name ? (
                              <div className="text-primary mt-0.5">{lead.interested_program_name}</div>
                            ) : (
                              <div className="text-muted-foreground mt-0.5">General Inquiry</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 min-w-[170px] text-xs text-muted-foreground">
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
                            <div className="text-[11px] mt-0.5">
                              Rep: {lead.assigned_sales_name || 'Unassigned'}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 min-w-[150px] space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusConf.color} ${statusConf.bgBadge}`}
                              >
                                {statusConf.label}
                              </Badge>
                              {lead.sla?.sla_status === 'BREACHED' && (
                                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold">
                                  Breached
                                </Badge>
                              )}
                              {lead.sla?.sla_status === 'ON_TRACK' && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                  On Track
                                </Badge>
                              )}
                              {lead.attention?.is_stuck && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold flex items-center gap-1"
                                  title={lead.attention.primary_reason_display || 'Attention Required'}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{lead.attention.primary_reason_display || 'Stuck'}</span>
                                </Badge>
                              )}
                            </div>
                            {lead.sla?.stage_age_seconds !== undefined && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground/70" />
                                <span>{formatDuration(lead.sla.stage_age_seconds)} in stage</span>
                              </div>
                            )}
                          </td>

                          <td
                            className="px-4 py-3.5 min-w-[160px] text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLeadDetail(lead)}
                                className="h-8 text-xs"
                              >
                                View
                              </Button>
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openStatusModal(lead)}
                                    className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                  >
                                    Status
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openTrialModal(lead)}
                                    className="h-8 text-xs"
                                  >
                                    Trial
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (Responsive 320px - 768px) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {leads.map((lead) => {
                const statusConf = STATUS_CONFIG[lead.current_status] || {
                  label: lead.current_status,
                  color: 'text-muted-foreground border-border',
                  bgBadge: 'bg-muted',
                };
                return (
                  <div
                    key={lead.id}
                    onClick={() => openLeadDetail(lead)}
                    className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                          {lead.first_name.substring(0, 1)}
                          {lead.last_name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {lead.branch_name && (
                            <div className="text-xs text-muted-foreground">📍 {lead.branch_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusConf.color} ${statusConf.bgBadge}`}
                        >
                          {statusConf.label}
                        </Badge>
                        {lead.sla?.sla_status === 'BREACHED' && (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold">
                            SLA Breached
                          </Badge>
                        )}
                        {lead.sla?.sla_status === 'ON_TRACK' && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                            On Track
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      {lead.interested_program_name && (
                        <div className="font-medium text-primary">
                          🎯 {lead.interested_program_name}
                        </div>
                      )}
                      {lead.campaign_reference && (
                        <div className="text-[11px] text-primary font-mono truncate">
                          📢 {lead.campaign_reference}
                        </div>
                      )}
                      {lead.sla?.stage_age_seconds !== undefined && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          <span>{formatDuration(lead.sla.stage_age_seconds)} in stage</span>
                        </div>
                      )}
                      {lead.phone_normalized && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{lead.phone_normalized}</span>
                        </div>
                      )}
                      {lead.email_normalized && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{lead.email_normalized}</span>
                        </div>
                      )}
                    </div>

                    <div
                      className="border-t border-border/40 pt-2.5 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLeadDetail(lead)}
                        className="h-8 text-xs flex-1"
                      >
                        View
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStatusModal(lead)}
                            className="h-8 text-xs flex-1 text-primary"
                          >
                            Status
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openTrialModal(lead)}
                            className="h-8 text-xs flex-1 bg-primary text-primary-foreground"
                          >
                            Trial
                          </Button>
                        </>
                      )}
                    </div>
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
        onOpenChange={setIsDetailOpen}
        onStatusTransitionClick={(l) => openStatusModal(l)}
        onBookTrialClick={(l) => openTrialModal(l)}
      />

      {/* Transition Status Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Lead Stage</DialogTitle>
            <DialogDescription>
              Transition {selectedLead?.first_name} {selectedLead?.last_name} to a new pipeline stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs">Target Pipeline Stage</Label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as LeadStatus)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {metadata?.statuses?.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                )) ||
                  Object.entries(STATUS_CONFIG).map(([stKey, conf]) => (
                    <option key={stKey} value={stKey}>
                      {conf.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason / Touchpoint Note</Label>
              <Input
                placeholder="e.g. Spoke on call, interested in 12-month membership"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={transitionMutation.isPending} onClick={handleTransitionStatus}>
              {transitionMutation.isPending ? 'Updating...' : 'Save Transition'}
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
