import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Clock,
  Bell,
  Radio,
  MessageSquare,
  Zap,
  Plus,
  Edit2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sliders,
  RotateCw,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { CRMAutomationSettings } from './CRMAutomationSettings';
import { CRMAttentionSettings } from './CRMAttentionSettings';
import { CRMAgentAssignmentSettings } from './CRMAgentAssignmentSettings';
import { CRMPageHeader } from '@/components/crm/common/CRMPageHeader';
import { CRMErrorState } from '@/components/crm/common/CRMErrorState';

import { crmApi } from '@/api/endpoints/crmApi';
import type {
  LeadSource,
  CRMStageSlaPolicy,
  CRMTrialReminderPolicy,
  CRMCommunicationChannel,
  NotificationTemplateItem,
} from '@/types/crm';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const SOURCE_TYPE_CHOICES = [
  { value: 'WALK_IN', label: 'Walk In' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'MOBILE_APP', label: 'Mobile App' },
  { value: 'META', label: 'Meta / Instagram / Facebook' },
  { value: 'GOOGLE', label: 'Google Search / Ads' },
  { value: 'WHATSAPP', label: 'WhatsApp Inquiry' },
  { value: 'PHONE', label: 'Phone / Direct Call' },
  { value: 'REFERRAL', label: 'Member / Friend Referral' },
  { value: 'TRAINER', label: 'Trainer Outreach' },
  { value: 'EMPLOYEE', label: 'Staff Outreach' },
  { value: 'SALES', label: 'Sales Representative' },
  { value: 'CAMPAIGN', label: 'Marketing Campaign' },
  { value: 'OTHER', label: 'Other / Custom Partnership' },
];

export function CRMSettingsWorkspace() {
  const queryClient = useQueryClient();
  const { can, isLoading: isAuthLoading } = usePermissions();

  const canView = can('crm.settings.view');
  const canEdit = can('crm.settings.edit');

  const [activeTab, setActiveTab] = React.useState<
    'sources' | 'agents' | 'sla' | 'attention' | 'reminders' | 'channels' | 'templates' | 'automation'
  >('sources');

  // ==========================================
  // TAB 1: LEAD SOURCES STATE & MUTATIONS
  // ==========================================
  const [sourceFilter, setSourceFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isNewSourceModalOpen, setIsNewSourceModalOpen] = React.useState(false);
  const [newSourceName, setNewSourceName] = React.useState('');
  const [newSourceType, setNewSourceType] = React.useState('WALK_IN');
  const [editingSource, setEditingSource] = React.useState<LeadSource | null>(null);
  const [editSourceName, setEditSourceName] = React.useState('');
  const [editSourceType, setEditSourceType] = React.useState('');
  const [editSourceStatus, setEditSourceStatus] = React.useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const {
    data: leadSources = [],
    isLoading: isSourcesLoading,
    isError: isSourcesError,
    refetch: refetchSources,
  } = useQuery({
    queryKey: ['crm-settings-lead-sources'],
    queryFn: () => crmApi.getLeadSources(),
  });

  const createSourceMutation = useMutation({
    mutationFn: (payload: { name: string; source_type: string }) => crmApi.createLeadSource(payload),
    onSuccess: (newSrc) => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings-lead-sources'] });
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success(`Lead source "${newSrc.name}" created successfully`);
      setIsNewSourceModalOpen(false);
      setNewSourceName('');
      setNewSourceType('WALK_IN');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create lead source');
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LeadSource> }) =>
      crmApi.updateLeadSource(id, payload),
    onSuccess: (updatedSrc) => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings-lead-sources'] });
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success(`Lead source "${updatedSrc.name}" updated`);
      setEditingSource(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update lead source');
    },
  });

  const filteredSources = React.useMemo(() => {
    if (sourceFilter === 'ALL') return leadSources;
    return leadSources.filter((s) => s.status === sourceFilter);
  }, [leadSources, sourceFilter]);

  // ==========================================
  // TAB 2: LEAD SLA POLICIES
  // ==========================================
  const [editingSla, setEditingSla] = React.useState<CRMStageSlaPolicy | null>(null);
  const [slaTargetValue, setSlaTargetValue] = React.useState(15);
  const [slaTargetUnit, setSlaTargetUnit] = React.useState<'MINUTES' | 'HOURS' | 'DAYS'>('MINUTES');
  const [slaIsEnabled, setSlaIsEnabled] = React.useState(true);
  const [slaEscalationEnabled, setSlaEscalationEnabled] = React.useState(false);
  const [slaEscalationValue, setSlaEscalationValue] = React.useState<number | ''>('');
  const [slaEscalationUnit, setSlaEscalationUnit] = React.useState<'MINUTES' | 'HOURS' | 'DAYS'>('HOURS');

  const {
    data: slaPolicies = [],
    isLoading: isSlaLoading,
    isError: isSlaError,
  } = useQuery({
    queryKey: ['crm-stage-sla-policies'],
    queryFn: () => crmApi.getSlaPolicies(),
  });

  const updateSlaMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CRMStageSlaPolicy> }) =>
      crmApi.updateSlaPolicy(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['crm-stage-sla-policies'] });
      toast.success(`SLA for stage "${updated.display_label}" updated`);
      setEditingSla(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update SLA rule');
    },
  });

  // ==========================================
  // TAB 3: TRIAL REMINDER POLICY
  // ==========================================
  const {
    data: reminderPolicy,
    isLoading: isReminderLoading,
    isError: isReminderError,
  } = useQuery({
    queryKey: ['crm-trial-reminder-policy'],
    queryFn: () => crmApi.getTrialReminderPolicy(),
  });

  const [remWhatsapp, setRemWhatsapp] = React.useState(true);
  const [remEmail, setRemEmail] = React.useState(true);
  const [remSms, setRemSms] = React.useState(false);
  const [remOffsets, setRemOffsets] = React.useState<number[]>([1440, 120, 30]);
  const [remConfirm, setRemConfirm] = React.useState(true);
  const [remWaitVal, setRemWaitVal] = React.useState(2);
  const [remWaitUnit, setRemWaitUnit] = React.useState<'HOURS' | 'DAYS'>('HOURS');
  const [remNoRespAction, setRemNoRespAction] = React.useState<'CREATE_FOLLOWUP' | 'NOTIFY_AGENT' | 'NONE'>('CREATE_FOLLOWUP');
  const [newOffsetInput, setNewOffsetInput] = React.useState('');

  // Phase 4: Tenant-configurable post-trial follow-up policies
  const [postAttendedEnabled, setPostAttendedEnabled] = React.useState(false);
  const [postAttendedDelayVal, setPostAttendedDelayVal] = React.useState<number | ''>('');
  const [postAttendedDelayUnit, setPostAttendedDelayUnit] = React.useState<'MINUTES' | 'HOURS' | 'DAYS'>('HOURS');

  const [noShowEnabled, setNoShowEnabled] = React.useState(false);
  const [noShowDelayVal, setNoShowDelayVal] = React.useState<number | ''>('');
  const [noShowDelayUnit, setNoShowDelayUnit] = React.useState<'MINUTES' | 'HOURS' | 'DAYS'>('MINUTES');

  React.useEffect(() => {
    if (reminderPolicy) {
      setRemWhatsapp(reminderPolicy.immediate_whatsapp);
      setRemEmail(reminderPolicy.immediate_email);
      setRemSms(reminderPolicy.immediate_sms);
      setRemOffsets(reminderPolicy.reminder_offsets || [1440, 120, 30]);
      setRemConfirm(reminderPolicy.ask_attendance_confirmation);
      setRemWaitVal(reminderPolicy.confirmation_wait_duration_value || 2);
      setRemWaitUnit(reminderPolicy.confirmation_wait_duration_unit || 'HOURS');
      setRemNoRespAction(reminderPolicy.no_response_action || 'CREATE_FOLLOWUP');
      setPostAttendedEnabled(reminderPolicy.post_attended_followup_enabled ?? false);
      setPostAttendedDelayVal(reminderPolicy.post_attended_followup_delay_value ?? '');
      setPostAttendedDelayUnit(reminderPolicy.post_attended_followup_delay_unit || 'HOURS');
      setNoShowEnabled(reminderPolicy.no_show_followup_enabled ?? false);
      setNoShowDelayVal(reminderPolicy.no_show_followup_delay_value ?? '');
      setNoShowDelayUnit(reminderPolicy.no_show_followup_delay_unit || 'MINUTES');
    }
  }, [reminderPolicy]);

  const updateReminderMutation = useMutation({
    mutationFn: (payload: Partial<CRMTrialReminderPolicy>) => crmApi.updateTrialReminderPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-trial-reminder-policy'] });
      toast.success('Trial reminder configuration saved successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save reminder policy');
    },
  });

  // ==========================================
  // TAB 4 & 5: CHANNELS & TEMPLATES
  // ==========================================
  const { data: channels = [], isLoading: isChannelsLoading } = useQuery({
    queryKey: ['crm-communication-channels'],
    queryFn: () => crmApi.getCommunicationChannels(),
    enabled: activeTab === 'channels',
  });

  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['crm-notification-templates'],
    queryFn: () => crmApi.getNotificationTemplates(),
    enabled: activeTab === 'templates',
  });

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const formatOffsetLabel = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.round(minutes / 1440);
      return `${days} ${days === 1 ? 'day' : 'days'} before (${minutes}m)`;
    }
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} before (${minutes}m)`;
    }
    return `${minutes} minutes before`;
  };

  if (!isAuthLoading && !canView) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <CRMPageHeader
          title="CRM Setup & Settings"
          subtitle="Configure acquisition channels, lead stage SLAs, trial reminder rules, and communication policies."
          icon={Sliders}
          badgeText="Restricted"
        />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
          <CRMErrorState
            title="Access Denied"
            message="You do not have permission to view CRM Setup. Required permission: crm.settings.view."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="CRM Setup & Settings"
        subtitle="Configure acquisition channels, lead stage SLAs, trial reminder rules, and communication policies."
        icon={Sliders}
        badgeText="Tenant-Configurable"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSources();
                refetchSlas();
                refetchReminders();
                refetchChannels();
                refetchTemplates();
              }}
              className="gap-1.5 h-9"
              title="Refresh settings"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {!canEdit && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Read-only Mode</span>
              </div>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs Navigation (Consistent Segmented Control) */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'sources'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Lead Sources</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {leadSources.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'agents'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Sales Roles & Assignment</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sla')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'sla'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Lead SLA Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attention')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'attention'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Attention & Next Actions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'reminders'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Trial Reminders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'channels'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Channels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'automation'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Automation</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEAD SOURCES                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/50">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attribution & Acquisition Sources</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage the channels through which prospects find your fitness business. Technical codes are managed automatically.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Filter Pills */}
              <div className="inline-flex rounded-lg border border-input p-0.5 bg-background text-xs">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSourceFilter(filter)}
                    className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium ${
                      sourceFilter === filter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>

              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => setIsNewSourceModalOpen(true)}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Source</span>
                </Button>
              )}
            </div>
          </div>

          {/* Table / Card List */}
          {isSourcesLoading ? (
            <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading lead sources from tenant database...</span>
            </div>
          ) : isSourcesError ? (
            <div className="p-6 bg-destructive/5 rounded-xl border border-destructive/20 text-center space-y-2">
              <AlertCircle className="w-5 h-5 text-destructive mx-auto" />
              <p className="text-xs font-medium text-destructive">Failed to load lead sources from database.</p>
              <Button size="sm" variant="outline" onClick={() => refetchSources()} className="text-xs">
                Retry
              </Button>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border/50 text-muted-foreground text-xs">
              No lead sources found matching the selected filter.
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Source Name</th>
                      <th className="px-4 py-3">Channel Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredSources.map((src) => (
                      <tr key={src.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {src.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground text-[11px] font-medium">
                            {SOURCE_TYPE_CHOICES.find((c) => c.value === src.source_type)?.label || src.source_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              src.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${src.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                            {src.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSource(src);
                                  setEditSourceName(src.name);
                                  setEditSourceType(src.source_type);
                                  setEditSourceStatus(src.status);
                                }}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const nextStatus = src.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                  updateSourceMutation.mutate({
                                    id: src.id,
                                    payload: { status: nextStatus },
                                  });
                                }}
                                className="h-7 px-2 text-[11px]"
                              >
                                {src.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SALES ROLES & AGENT ASSIGNMENT                                        */}
      {/* ========================================================================= */}
      {activeTab === 'agents' && (
        <CRMAgentAssignmentSettings canEdit={canEdit} />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAD SLA RULES                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'sla' && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Pipeline Stage Response SLAs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set target response times for leads at each stage in the funnel. Internal canonical states remain strictly preserved.
            </p>
          </div>

          {isSlaLoading ? (
            <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading stage SLA policies...</span>
            </div>
          ) : isSlaError ? (
            <div className="p-6 bg-destructive/5 rounded-xl border border-destructive/20 text-center text-xs text-destructive">
              Failed to load SLA rules.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {slaPolicies.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 bg-card ${
                    rule.is_enabled ? 'border-border/60 shadow-sm' : 'border-border/30 opacity-70 bg-muted/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{rule.display_label}</h3>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {rule.canonical_stage}
                      </span>
                    </div>

                    <Badge
                      variant={rule.is_enabled ? 'default' : 'secondary'}
                      className="text-[10px] font-semibold"
                    >
                      {rule.is_enabled ? 'Active SLA' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-border/40 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Target Response:</span>
                      <span className="font-semibold text-foreground">
                        {rule.response_target_value} {rule.response_target_unit.toLowerCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Escalation:</span>
                      <span className="text-foreground">
                        {rule.escalation_enabled && rule.escalation_after_value
                          ? `After ${rule.escalation_after_value} ${rule.escalation_after_unit?.toLowerCase()}`
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="pt-2 border-t border-border/40 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSla(rule);
                          setSlaTargetValue(rule.response_target_value);
                          setSlaTargetUnit(rule.response_target_unit);
                          setSlaIsEnabled(rule.is_enabled);
                          setSlaEscalationEnabled(rule.escalation_enabled);
                          setSlaEscalationValue(rule.escalation_after_value ?? '');
                          setSlaEscalationUnit(rule.escalation_after_unit || 'HOURS');
                        }}
                        className="h-7 text-xs gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" />
                        Configure SLA
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ATTENTION & NEXT ACTION POLICY                                       */}
      {/* ========================================================================= */}
      {activeTab === 'attention' && (
        <CRMAttentionSettings canEdit={canEdit} />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRIAL REMINDERS                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'reminders' && (
        <div className="max-w-3xl space-y-5">
          <div className="bg-card p-4 rounded-xl border border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Trial Session Reminders & Policies</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify exact notification timings and follow-up rules when a member or prospect books a trial workout.
            </p>
          </div>

          {isReminderLoading ? (
            <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading trial reminder policy...</span>
            </div>
          ) : (
            <div className="space-y-6 bg-card p-5 rounded-xl border border-border/50">
              {/* Immediate Confirmation Channels */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Immediate Confirmation Upon Booking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer">
                    <span className="text-xs font-medium">WhatsApp Message</span>
                    <input
                      type="checkbox"
                      checked={remWhatsapp}
                      onChange={(e) => setRemWhatsapp(e.target.checked)}
                      disabled={!canEdit}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer">
                    <span className="text-xs font-medium">Email Pass & Invite</span>
                    <input
                      type="checkbox"
                      checked={remEmail}
                      onChange={(e) => setRemEmail(e.target.checked)}
                      disabled={!canEdit}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer">
                    <span className="text-xs font-medium">SMS Alert</span>
                    <input
                      type="checkbox"
                      checked={remSms}
                      onChange={(e) => setRemSms(e.target.checked)}
                      disabled={!canEdit}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              {/* Pre-Session Reminder Offsets */}
              <div className="space-y-2.5 pt-4 border-t border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Pre-Session Reminder Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define notifications triggered before the trial workout begins.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {remOffsets.map((mins, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                    >
                      <span>{formatOffsetLabel(mins)}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setRemOffsets(remOffsets.filter((_, i) => i !== idx))}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 pt-2 max-w-sm">
                    <Input
                      type="number"
                      placeholder="Minutes before session (e.g. 60)"
                      value={newOffsetInput}
                      onChange={(e) => setNewOffsetInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const val = parseInt(newOffsetInput, 10);
                        if (!val || val <= 0) return;
                        if (!remOffsets.includes(val)) {
                          setRemOffsets([...remOffsets, val].sort((a, b) => b - a));
                        }
                        setNewOffsetInput('');
                      }}
                      className="h-8 text-xs shrink-0"
                    >
                      Add Offset
                    </Button>
                  </div>
                )}
              </div>

              {/* Confirmation & No-Response Follow-up */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  3. Attendance Confirmation & No-Response Strategy
                </h3>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remConfirm}
                    onChange={(e) => setRemConfirm(e.target.checked)}
                    disabled={!canEdit}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-xs font-medium">
                    Require prospect to confirm attendance (via 1-click WhatsApp / Email button)
                  </span>
                </label>

                {remConfirm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-6 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Wait Duration for Response</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={remWaitVal}
                          onChange={(e) => setRemWaitVal(parseInt(e.target.value, 10) || 1)}
                          disabled={!canEdit}
                          className="h-8 text-xs w-24"
                        />
                        <select
                          value={remWaitUnit}
                          onChange={(e) => setRemWaitUnit(e.target.value as any)}
                          disabled={!canEdit}
                          className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                        >
                          <option value="HOURS">Hours</option>
                          <option value="DAYS">Days</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">If No Response Received</Label>
                      <select
                        value={remNoRespAction}
                        onChange={(e) => setRemNoRespAction(e.target.value as any)}
                        disabled={!canEdit}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="CREATE_FOLLOWUP">Automatically create sales follow-up task</option>
                        <option value="NOTIFY_AGENT">Send notification alert to primary agent</option>
                        <option value="NONE">No action</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Post-Attended Follow-up Task Policy */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  4. Post-Trial Workout Follow-up Policy
                </h3>
                <p className="text-xs text-muted-foreground">
                  Automatically generate an idempotent follow-up task for the assigned sales agent when a prospect completes their workout.
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postAttendedEnabled}
                    onChange={(e) => setPostAttendedEnabled(e.target.checked)}
                    disabled={!canEdit}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-xs font-medium">
                    Enable automated post-attended sales follow-up task
                  </span>
                </label>

                {postAttendedEnabled && (
                  <div className="pl-6 pt-1 space-y-1">
                    <Label className="text-xs font-medium">Schedule Delay After Attendance</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 2"
                        value={postAttendedDelayVal}
                        onChange={(e) => setPostAttendedDelayVal(e.target.value ? Number(e.target.value) : '')}
                        disabled={!canEdit}
                        className="h-8 text-xs w-28"
                      />
                      <select
                        value={postAttendedDelayUnit}
                        onChange={(e) => setPostAttendedDelayUnit(e.target.value as any)}
                        disabled={!canEdit}
                        className="h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="MINUTES">Minutes</option>
                        <option value="HOURS">Hours</option>
                        <option value="DAYS">Days</option>
                      </select>
                      <span className="text-xs text-muted-foreground">after attendance marked</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. No-Show Recovery Policy */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  5. No-Show Recovery Follow-up Policy
                </h3>
                <p className="text-xs text-muted-foreground">
                  Automatically schedule a recovery re-engagement task for sales staff if the prospect does not attend.
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noShowEnabled}
                    onChange={(e) => setNoShowEnabled(e.target.checked)}
                    disabled={!canEdit}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-xs font-medium">
                    Enable automated no-show recovery follow-up task
                  </span>
                </label>

                {noShowEnabled && (
                  <div className="pl-6 pt-1 space-y-1">
                    <Label className="text-xs font-medium">Schedule Delay After No-Show</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 30"
                        value={noShowDelayVal}
                        onChange={(e) => setNoShowDelayVal(e.target.value ? Number(e.target.value) : '')}
                        disabled={!canEdit}
                        className="h-8 text-xs w-28"
                      />
                      <select
                        value={noShowDelayUnit}
                        onChange={(e) => setNoShowDelayUnit(e.target.value as any)}
                        disabled={!canEdit}
                        className="h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="MINUTES">Minutes</option>
                        <option value="HOURS">Hours</option>
                        <option value="DAYS">Days</option>
                      </select>
                      <span className="text-xs text-muted-foreground">after marked no-show</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Voice Agent (Foundation status) */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Sarvam AI Outbound Voice Calling</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Automatic voice call reminder 3 hours prior to workout session.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted border-border shrink-0">
                  Coming in Phase 2
                </Badge>
              </div>

              {canEdit && (
                <div className="pt-3 flex justify-end">
                  <Button
                    onClick={() =>
                      updateReminderMutation.mutate({
                        immediate_whatsapp: remWhatsapp,
                        immediate_email: remEmail,
                        immediate_sms: remSms,
                        reminder_offsets: remOffsets,
                        ask_attendance_confirmation: remConfirm,
                        confirmation_wait_duration_value: remWaitVal,
                        confirmation_wait_duration_unit: remWaitUnit,
                        no_response_action: remNoRespAction,
                        post_attended_followup_enabled: postAttendedEnabled,
                        post_attended_followup_delay_value: postAttendedDelayVal ? Number(postAttendedDelayVal) : null,
                        post_attended_followup_delay_unit: postAttendedDelayUnit,
                        no_show_followup_enabled: noShowEnabled,
                        no_show_followup_delay_value: noShowDelayVal ? Number(noShowDelayVal) : null,
                        no_show_followup_delay_unit: noShowDelayUnit,
                      })
                    }
                    disabled={updateReminderMutation.isPending}
                    className="text-xs font-semibold h-9 px-4"
                  >
                    {updateReminderMutation.isPending ? 'Saving...' : 'Save Reminder Settings'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMMUNICATION CHANNELS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Connected Outreach Channels</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure tenant communication channels. Integration secrets and API tokens are managed at the platform level.
            </p>
          </div>

          {isChannelsLoading ? (
            <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Checking integration statuses...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((chan) => (
                <div key={chan.id} className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{chan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{chan.description}</p>
                    </div>

                    <Badge
                      className={`text-[10px] font-semibold ${
                        chan.status === 'CONNECTED'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : chan.status === 'COMING_SOON'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {chan.status === 'CONNECTED'
                        ? 'Connected'
                        : chan.status === 'COMING_SOON'
                        ? 'Coming Soon'
                        : 'Not Configured'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sender Identifier:</span>
                      <span className="font-mono text-foreground font-medium">{chan.sender_identity}</span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Active Capabilities:</span>
                      <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground text-[11px]">
                        {chan.features.map((feat, i) => (
                          <li key={i}>{feat}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MESSAGE TEMPLATES                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border border-border/50">
            <h2 className="text-sm font-semibold text-foreground">CRM Notification Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pre-configured notification templates for Lead welcome and Trial reminders stored in the tenant governance repository.
            </p>
          </div>

          {isTemplatesLoading ? (
            <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border/50 text-muted-foreground text-xs">
              No custom CRM notification templates configured yet. System uses standard canonical defaults.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-4 rounded-xl border border-border/60 bg-card space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{tmpl.name}</h3>
                      <span className="text-[11px] text-muted-foreground font-mono">{tmpl.event_type}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {tmpl.channel}
                    </Badge>
                  </div>

                  {tmpl.subject && (
                    <p className="text-xs font-medium text-foreground">
                      <span className="text-muted-foreground">Subject: </span>
                      {tmpl.subject}
                    </p>
                  )}

                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs font-mono text-muted-foreground line-clamp-3">
                    {tmpl.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUTOMATION WORKSPACE (PHASE 6)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'automation' && (
        <CRMAutomationSettings canEdit={canEdit} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD LEAD SOURCE                                                    */}
      {/* ========================================================================= */}
      <Dialog open={isNewSourceModalOpen} onOpenChange={setIsNewSourceModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Lead Source</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new attribution source. The system code will be generated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source Name *</Label>
              <Input
                placeholder="e.g. Instagram Reels Campaign"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Channel / Source Type *</Label>
              <select
                value={newSourceType}
                onChange={(e) => setNewSourceType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {SOURCE_TYPE_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewSourceModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newSourceName.trim() || createSourceMutation.isPending}
              onClick={() => {
                createSourceMutation.mutate({
                  name: newSourceName.trim(),
                  source_type: newSourceType,
                });
              }}
              className="text-xs font-medium"
            >
              {createSourceMutation.isPending ? 'Creating...' : 'Create Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT LEAD SOURCE                                                   */}
      {/* ========================================================================= */}
      <Dialog open={!!editingSource} onOpenChange={(open) => !open && setEditingSource(null)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Lead Source</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update display name, channel type, or active state.
            </DialogDescription>
          </DialogHeader>

          {editingSource && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Source Name *</Label>
                <Input
                  value={editSourceName}
                  onChange={(e) => setEditSourceName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Channel / Source Type</Label>
                <select
                  value={editSourceType}
                  onChange={(e) => setEditSourceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  {SOURCE_TYPE_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <select
                  value={editSourceStatus}
                  onChange={(e) => setEditSourceStatus(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="ACTIVE">Active (Selectable on new leads)</option>
                  <option value="INACTIVE">Inactive (Disabled for new leads, preserved on history)</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSource(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editSourceName.trim() || updateSourceMutation.isPending}
              onClick={() => {
                if (!editingSource) return;
                updateSourceMutation.mutate({
                  id: editingSource.id,
                  payload: {
                    name: editSourceName.trim(),
                    source_type: editSourceType,
                    status: editSourceStatus,
                  },
                });
              }}
              className="text-xs font-medium"
            >
              {updateSourceMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDIT STAGE SLA                                                     */}
      {/* ========================================================================= */}
      <Dialog open={!!editingSla} onOpenChange={(open) => !open && setEditingSla(null)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Configure SLA: {editingSla?.display_label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define response targets and escalation rules for canonical stage: {editingSla?.canonical_stage}.
            </DialogDescription>
          </DialogHeader>

          {editingSla && (
            <div className="space-y-4 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slaIsEnabled}
                  onChange={(e) => setSlaIsEnabled(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-xs font-medium">Enable Response SLA Tracking for this stage</span>
              </label>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Response Time *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={slaTargetValue}
                    onChange={(e) => setSlaTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="h-9 text-xs w-28"
                  />
                  <select
                    value={slaTargetUnit}
                    onChange={(e) => setSlaTargetUnit(e.target.value as any)}
                    className="h-9 px-3 rounded-md border border-input bg-background text-xs flex-1"
                  >
                    <option value="MINUTES">Minutes</option>
                    <option value="HOURS">Hours</option>
                    <option value="DAYS">Days</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slaEscalationEnabled}
                    onChange={(e) => setSlaEscalationEnabled(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-xs font-medium">Escalate if lead remains unattended</span>
                </label>

                {slaEscalationEnabled && (
                  <div className="flex gap-2 pl-6 pt-1">
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      value={slaEscalationValue}
                      onChange={(e) =>
                        setSlaEscalationValue(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      className="h-8 text-xs w-24"
                    />
                    <select
                      value={slaEscalationUnit}
                      onChange={(e) => setSlaEscalationUnit(e.target.value as any)}
                      className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="MINUTES">Minutes</option>
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSla(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateSlaMutation.isPending}
              onClick={() => {
                if (!editingSla) return;
                updateSlaMutation.mutate({
                  id: editingSla.id,
                  payload: {
                    response_target_value: slaTargetValue,
                    response_target_unit: slaTargetUnit,
                    is_enabled: slaIsEnabled,
                    escalation_enabled: slaEscalationEnabled,
                    escalation_after_value: slaEscalationEnabled && slaEscalationValue !== '' ? slaEscalationValue : null,
                    escalation_after_unit: slaEscalationEnabled ? slaEscalationUnit : null,
                  },
                });
              }}
              className="text-xs font-medium"
            >
              {updateSlaMutation.isPending ? 'Saving...' : 'Save SLA Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
