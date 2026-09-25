import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Phone,
  MessageSquare,
  Mail,
  Users,
  Plus,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePermissions } from '@/lib/permissions';
import { crmApi } from '@/api/endpoints/crmApi';
import type {
  SalesFollowupTask,
  FollowupTaskType,
  Lead,
  EligibleAgent,
} from '@/types/crm';
import { LeadDetailModal } from './LeadDetailModal';
import { CRMPageHeader } from './common/CRMPageHeader';
import { CRMKpiTile } from './common/CRMKpiTile';
import { CRMFilterBar } from './common/CRMFilterBar';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';
import { CRMLoadingState } from './common/CRMLoadingState';
import { formatCrmLabel } from '@/lib/crmLabels';
import { cn } from '@/lib/utils';

const TASK_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  MEETING: Users,
  PAYMENT: CheckCircle2,
  TRIAL_FOLLOWUP: Calendar,
  REJOIN: RotateCw,
  OTHER: Clock,
};

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  URGENT: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
  HIGH: { label: 'High', className: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  NORMAL: { label: 'Normal', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  LOW: { label: 'Low', className: 'bg-muted/50 text-muted-foreground border-border/40' },
};

export function FollowUpsWorkspace() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('crm.leads.edit') || can('crm.leads.create');

  // Filters & Tabs state
  const [activeTab, setActiveTab] = React.useState<
    'all' | 'overdue' | 'today' | 'upcoming' | 'high_priority' | 'completed'
  >('today');
  const [search, setSearch] = React.useState('');
  const [selectedAgent, setSelectedAgent] = React.useState<string>('ALL');

  // Lead 360 modal state
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [leadModalOpen, setLeadModalOpen] = React.useState(false);

  // New Follow-up Modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newLeadId, setNewLeadId] = React.useState('');
  const [newTaskType, setNewTaskType] = React.useState<FollowupTaskType>('CALL');
  const [newPriority, setNewPriority] = React.useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [newDueAt, setNewDueAt] = React.useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [newOutcomeNotes, setNewOutcomeNotes] = React.useState('');
  const [newAssignedAgent, setNewAssignedAgent] = React.useState('');

  // Complete Task Dialog state
  const [completeTask, setCompleteTask] = React.useState<SalesFollowupTask | null>(null);
  const [completeOutcome, setCompleteOutcome] = React.useState('');
  const [logActivityOnComplete, setLogActivityOnComplete] = React.useState(true);

  // Reschedule Task Dialog state
  const [rescheduleTask, setRescheduleTask] = React.useState<SalesFollowupTask | null>(null);
  const [rescheduleDueAt, setRescheduleDueAt] = React.useState('');
  const [rescheduleReason, setRescheduleReason] = React.useState('');

  // 1. Fetch real tasks from backend
  const {
    data: tasks = [],
    isLoading,
    isError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['sales-followups', activeTab, selectedAgent],
    queryFn: () => {
      const params: Parameters<typeof crmApi.getFollowupTasks>[0] = {
        view: activeTab === 'all' ? undefined : activeTab,
      };
      if (selectedAgent !== 'ALL') {
        params.assigned_to = selectedAgent;
      }
      return crmApi.getFollowupTasks(params);
    },
  });

  // 2. Fetch queue counts from backend
  const {
    data: queueCounts,
    isLoading: isCountsLoading,
    isError: isCountsError,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ['sales-followups-counts'],
    queryFn: () => crmApi.getFollowupWorkQueueCounts(),
  });

  // 3. Fetch eligible agents from backend
  const { data: eligibleAgents = [] } = useQuery<EligibleAgent[]>({
    queryKey: ['sales-agents-eligible'],
    queryFn: () => crmApi.getEligibleAgents(),
    staleTime: 5 * 60 * 1000,
  });

  // 4. Fetch leads list for creating follow-up task
  const { data: leadsData } = useQuery({
    queryKey: ['leads-brief-for-followups'],
    queryFn: () => crmApi.getLeads({ page_size: 100 }),
    staleTime: 60 * 1000,
  });
  const leadsList = leadsData?.results || [];

  // Filter tasks by search query locally
  const filteredTasks = React.useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        (t.lead_name && t.lead_name.toLowerCase().includes(q)) ||
        (t.outcome && t.outcome.toLowerCase().includes(q)) ||
        (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
        (t.task_type && t.task_type.toLowerCase().includes(q))
    );
  }, [tasks, search]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: {
      lead: string;
      task_type: FollowupTaskType;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      due_at: string;
      outcome?: string;
      assigned_to?: string;
    }) => crmApi.createFollowupTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-followups-counts'] });
      setIsCreateOpen(false);
      setNewLeadId('');
      setNewOutcomeNotes('');
      setNewAssignedAgent('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({
      id,
      outcome,
      log_activity,
    }: {
      id: string;
      outcome?: string;
      log_activity?: boolean;
    }) => crmApi.completeFollowupTask(id, outcome, log_activity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-followups-counts'] });
      setCompleteTask(null);
      setCompleteOutcome('');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      id,
      due_at,
      reason,
    }: {
      id: string;
      due_at: string;
      reason?: string;
    }) => crmApi.rescheduleFollowupTask(id, due_at, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-followups-counts'] });
      setRescheduleTask(null);
      setRescheduleDueAt('');
      setRescheduleReason('');
    },
  });

  const handleOpenLead = async (leadId: string) => {
    try {
      const fullLead = await crmApi.getLead(leadId);
      setSelectedLead(fullLead);
      setLeadModalOpen(true);
    } catch {
      // Graceful fallback
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadId || !newDueAt) return;
    createMutation.mutate({
      lead: newLeadId,
      task_type: newTaskType,
      priority: newPriority,
      due_at: new Date(newDueAt).toISOString(),
      outcome: newOutcomeNotes.trim() || undefined,
      assigned_to: newAssignedAgent || undefined,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTask) return;
    completeMutation.mutate({
      id: completeTask.id,
      outcome: completeOutcome.trim() || undefined,
      log_activity: logActivityOnComplete,
    });
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTask || !rescheduleDueAt) return;
    rescheduleMutation.mutate({
      id: rescheduleTask.id,
      due_at: new Date(rescheduleDueAt).toISOString(),
      reason: rescheduleReason.trim() || undefined,
    });
  };

  const hasActiveFilters = Boolean(search || selectedAgent !== 'ALL');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="Follow-ups & Work Queue"
        subtitle="Operational sales agenda: overdue tasks, today's client touchpoints, and scheduled lead interactions."
        icon={CheckSquare}
        badgeText="Queue"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTasks();
                refetchCounts();
              }}
              className="gap-1.5 h-9"
              title="Refresh queue"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Follow-up</span>
              </Button>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* AGENT WORK QUEUE SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <CRMKpiTile
            label="Overdue"
            value={queueCounts?.overdue}
            isLoading={isCountsLoading}
            isError={isCountsError}
            badge={{ text: 'Urgent', variant: 'negative' }}
            hint="Require immediate call"
            onClick={() => setActiveTab('overdue')}
          />
          <CRMKpiTile
            label="Due Today"
            value={queueCounts?.due_today}
            isLoading={isCountsLoading}
            isError={isCountsError}
            badge={{ text: 'Today', variant: 'info' }}
            hint="Today's scheduled agenda"
            onClick={() => setActiveTab('today')}
          />
          <CRMKpiTile
            label="Due Later"
            value={queueCounts?.due_later}
            isLoading={isCountsLoading}
            isError={isCountsError}
            badge={{ text: 'Upcoming', variant: 'neutral' }}
            hint="Upcoming client touchpoints"
            onClick={() => setActiveTab('upcoming')}
          />
          <CRMKpiTile
            label="High Priority"
            value={queueCounts?.high_priority}
            isLoading={isCountsLoading}
            isError={isCountsError}
            badge={{ text: 'Priority', variant: 'warning' }}
            hint="Urgent & High attention"
            onClick={() => setActiveTab('high_priority')}
          />
          <CRMKpiTile
            label="Completed Today"
            value={queueCounts?.completed_today}
            isLoading={isCountsLoading}
            isError={isCountsError}
            badge={{ text: 'Done', variant: 'positive' }}
            hint="Closed interactions"
            onClick={() => setActiveTab('completed')}
            className="col-span-2 sm:col-span-1 lg:col-span-1"
          />
        </div>

        {/* VIEW TABS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
          {[
            { id: 'today', label: "Due Today" },
            { id: 'overdue', label: 'Overdue' },
            { id: 'high_priority', label: 'High Priority' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All Tasks' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === t.id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SEARCH & FILTER BAR */}
        <CRMFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks by lead name..."
          onReset={() => {
            setSearch('');
            setSelectedAgent('ALL');
          }}
          hasActiveFilters={hasActiveFilters}
          secondaryFilters={
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Assigned Agent</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Assigned Agents</option>
                {eligibleAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role_name || a.user_type || 'Agent'})
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {/* TASK LIST / FEED */}
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <CRMLoadingState message="Loading follow-up tasks queue..." />
          ) : isError ? (
            <CRMErrorState
              title="Unable to Load Work Queue"
              message="Failed to fetch follow-up tasks from the CRM backend. Please check network or verify permissions."
              onRetry={() => {
                refetchTasks();
                refetchCounts();
              }}
            />
          ) : filteredTasks.length === 0 ? (
            <CRMEmptyState
              icon={CheckCircle2}
              title="All Caught Up!"
              description="No follow-up tasks in this queue. Schedule regular calls and post-trial outreach to keep client engagement high."
              actionLabel={canEdit ? '+ Schedule Follow-up' : undefined}
              onAction={() => setIsCreateOpen(true)}
              canAction={canEdit}
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const Icon = TASK_TYPE_ICONS[task.task_type] || Clock;
                const priorityConf = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.NORMAL;
                const isCompleted = task.status === 'COMPLETED';
                const isCancelled = task.status === 'CANCELLED';

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'p-4 transition-colors space-y-3',
                      task.is_overdue && !isCompleted && !isCancelled
                        ? 'bg-red-500/5 hover:bg-red-500/10'
                        : 'hover:bg-muted/20'
                    )}
                  >
                    {/* TOP BAR: Lead Info, Stage & Priority */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenLead(task.lead)}
                          className="font-bold text-foreground hover:text-primary transition-colors text-sm sm:text-base flex items-center gap-1.5 text-left"
                        >
                          <span>{task.lead_name || 'Lead'}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                        </button>

                        {task.lead_status && (
                          <Badge variant="secondary" className="text-[11px]">
                            {formatCrmLabel(task.lead_status)}
                          </Badge>
                        )}

                        {task.branch_name && (
                          <span className="text-[11px] text-muted-foreground">
                            • {task.branch_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {task.is_overdue && !isCompleted && !isCancelled && (
                          <Badge variant="destructive" className="text-[11px] font-bold gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            OVERDUE
                          </Badge>
                        )}

                        <Badge variant="outline" className={`text-[11px] font-semibold ${priorityConf.className}`}>
                          {priorityConf.label}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[11px] font-semibold',
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : isCancelled
                              ? 'bg-muted/40 text-muted-foreground border-border/40'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          )}
                        >
                          {formatCrmLabel(task.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* TASK DETAILS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Task Type & Target */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[11px]">Action Required</span>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{formatCrmLabel(task.task_type)}</span>
                        </div>
                      </div>

                      {/* Due At & Assignee */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[11px]">Schedule & Agent</span>
                        <div className="text-foreground">
                          <strong>Due:</strong>{' '}
                          <span className={`font-mono ${task.is_overdue && !isCompleted ? 'text-red-500 font-bold' : ''}`}>
                            {new Date(task.due_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Assigned to: <strong className="text-foreground">{task.assigned_to_name || 'Staff'}</strong>
                        </div>
                      </div>

                      {/* Last Activity Preview */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[11px]">Last Activity Touch</span>
                        {task.last_activity ? (
                          <div className="text-muted-foreground text-[11px] bg-muted/20 p-2 rounded-lg border border-border/30">
                            <strong className="text-foreground">{formatCrmLabel(task.last_activity.activity_type)}</strong>
                            {task.last_activity.outcome && ` (${task.last_activity.outcome})`}
                            <span className="block font-mono text-[10px] text-muted-foreground mt-0.5">
                              {new Date(task.last_activity.activity_at).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">No prior activity logged</span>
                        )}
                      </div>
                    </div>

                    {/* Task Context / Outcome */}
                    {task.outcome && (
                      <div className="text-xs p-2.5 rounded-lg bg-muted/30 border border-border/40 text-muted-foreground italic">
                        {task.outcome}
                      </div>
                    )}

                    {/* ACTIONS BAR */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenLead(task.lead)}
                        className="h-8 text-xs px-2.5 text-primary hover:text-primary hover:bg-primary/10 gap-1"
                      >
                        <span>Open Lead 360°</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>

                      {!isCompleted && !isCancelled && canEdit && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleTask(task);
                              setRescheduleDueAt(
                                new Date(new Date(task.due_at).getTime() - new Date().getTimezoneOffset() * 60000)
                                  .toISOString()
                                  .slice(0, 16)
                              );
                            }}
                            className="h-8 text-xs gap-1"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            Reschedule
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setCompleteTask(task);
                              setCompleteOutcome('');
                            }}
                            className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Complete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 1. SCHEDULE FOLLOW-UP MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Schedule Follow-up Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign a timed sales task or client outreach action to a team member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Lead *</Label>
              <select
                required
                value={newLeadId}
                onChange={(e) => setNewLeadId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Lead --</option>
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name} ({l.phone_normalized || l.email_normalized || 'No contact'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Task Type *</Label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as FollowupTaskType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email Outreach</option>
                  <option value="MEETING">Consultation Meeting</option>
                  <option value="PAYMENT">Payment Reminder</option>
                  <option value="TRIAL_FOLLOWUP">Post-Trial Follow-up</option>
                  <option value="REJOIN">Rejoin / Winback</option>
                  <option value="OTHER">Other Task</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Due At *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={newDueAt}
                  onChange={(e) => setNewDueAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Assign Agent</Label>
                <select
                  value={newAssignedAgent}
                  onChange={(e) => setNewAssignedAgent(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Current User (Self)</option>
                  {eligibleAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role_name || a.user_type || 'Agent'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Task Objective / Notes</Label>
              <Input
                placeholder="e.g. Call customer regarding evening Pilates slot availability"
                value={newOutcomeNotes}
                onChange={(e) => setNewOutcomeNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newLeadId || !newDueAt || createMutation.isPending}
                className="h-9 text-xs font-semibold"
              >
                {createMutation.isPending ? 'Scheduling...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. COMPLETE TASK DIALOG */}
      <Dialog open={!!completeTask} onOpenChange={(open) => !open && setCompleteTask(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Complete Follow-up Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record the final interaction outcome for{' '}
              <strong>{completeTask?.lead_name || 'Lead'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Interaction Outcome *</Label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Spoke to client, confirmed trial attendance for tomorrow 6:00 PM."
                value={completeOutcome}
                onChange={(e) => setCompleteOutcome(e.target.value)}
                className="w-full p-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="log-activity-chk"
                checked={logActivityOnComplete}
                onChange={(e) => setLogActivityOnComplete(e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <Label htmlFor="log-activity-chk" className="text-xs text-muted-foreground cursor-pointer">
                Automatically record as a completed <strong>{completeTask?.task_type.replace('_', ' ')}</strong> activity in Lead timeline
              </Label>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCompleteTask(null)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!completeOutcome.trim() || completeMutation.isPending}
                className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {completeMutation.isPending ? 'Completing...' : 'Mark Completed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. RESCHEDULE TASK DIALOG */}
      <Dialog open={!!rescheduleTask} onOpenChange={(open) => !open && setRescheduleTask(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Reschedule Follow-up
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a new date and time to follow up with{' '}
              <strong>{rescheduleTask?.lead_name || 'Lead'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">New Due Date & Time *</Label>
              <Input
                type="datetime-local"
                required
                value={rescheduleDueAt}
                onChange={(e) => setRescheduleDueAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reason for Rescheduling</Label>
              <Input
                placeholder="e.g. Customer requested callback in the evening, busy in meeting"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRescheduleTask(null)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!rescheduleDueAt || rescheduleMutation.isPending}
                className="h-9 text-xs font-semibold"
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Save New Time'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LEAD 360 MODAL */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          open={leadModalOpen}
          onOpenChange={(open) => {
            setLeadModalOpen(open);
            if (!open) {
              setSelectedLead(null);
            }
          }}
        />
      )}
    </div>
  );
}
