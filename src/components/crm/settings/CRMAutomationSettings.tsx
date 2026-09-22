import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Copy,
  RotateCcw,
  Filter,
  Loader2,
  ChevronRight,
  Layers,
  History,
  Info,
  ArrowDown,
  ShieldAlert,
  Send,
  UserCheck,
  FileText,
  GitBranch,
} from 'lucide-react';
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
import { crmApi } from '@/services/crmApi';
import type {
  AutomationWorkflow,
  AutomationWorkflowVersion,
  AutomationExecution,
  AutomationMetadata,
  AutomationStep,
  AutomationCondition,
} from '@/types/crm';

interface Props {
  canEdit: boolean;
}

export function CRMAutomationSettings({ canEdit }: Props) {
  const queryClient = useQueryClient();

  // Active view: 'list' | 'builder' | 'history'
  const [view, setView] = useState<'list' | 'builder' | 'history'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);

  // Filters
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');

  // =========================================================================
  // METADATA QUERY
  // =========================================================================
  const {
    data: metadata,
    isLoading: isMetaLoading,
    isError: isMetaError,
    refetch: refetchMeta,
  } = useQuery({
    queryKey: ['automation-metadata'],
    queryFn: () => crmApi.getAutomationMetadata(),
    staleTime: 5 * 60 * 1000,
  });

  // =========================================================================
  // WORKFLOWS QUERY
  // =========================================================================
  const {
    data: workflows = [],
    isLoading: isWorkflowsLoading,
    isError: isWorkflowsError,
    refetch: refetchWorkflows,
  } = useQuery({
    queryKey: ['automation-workflows', workflowStatusFilter],
    queryFn: () =>
      crmApi.getAutomationWorkflows(
        workflowStatusFilter !== 'ALL' ? { status: workflowStatusFilter } : undefined
      ),
  });

  // =========================================================================
  // EXECUTIONS QUERY
  // =========================================================================
  const {
    data: executions = [],
    isLoading: isExecutionsLoading,
    isError: isExecutionsError,
    refetch: refetchExecutions,
  } = useQuery({
    queryKey: ['automation-executions', historyStatusFilter],
    queryFn: () =>
      crmApi.getAutomationExecutions(
        historyStatusFilter !== 'ALL' ? { status: historyStatusFilter } : undefined
      ),
    enabled: view === 'history' || !!selectedExecution,
  });

  // =========================================================================
  // WORKFLOW BUILDER STATE
  // =========================================================================
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderTrigger, setBuilderTrigger] = useState('LEAD_CREATED');
  const [builderConditions, setBuilderConditions] = useState<AutomationCondition[]>([]);
  const [builderSteps, setBuilderSteps] = useState<AutomationStep[]>([]);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  const startNewWorkflow = () => {
    setEditingWorkflowId(null);
    setBuilderName('');
    setBuilderDescription('');
    setBuilderTrigger(metadata?.triggers[0]?.code || 'LEAD_CREATED');
    setBuilderConditions([]);
    setBuilderSteps([
      {
        id: 'step_1',
        type: 'ACTION',
        action_code: 'SEND_COMMUNICATION',
        config: { channel: 'WHATSAPP', template_id: '', recipient_target: 'LEAD' },
        next_step_id: 'step_2',
      },
      {
        id: 'step_2',
        type: 'WAIT',
        duration_value: 30,
        duration_unit: 'MINUTES',
        next_step_id: 'step_3',
      },
      {
        id: 'step_3',
        type: 'END',
      },
    ]);
    setView('builder');
  };

  const editWorkflowDraft = (wf: AutomationWorkflow) => {
    setEditingWorkflowId(wf.id);
    setBuilderName(wf.name);
    setBuilderDescription(wf.description || '');

    const draft = wf.draft_version_detail || wf.current_version_detail;
    setBuilderTrigger(draft?.trigger_type || 'LEAD_CREATED');
    setBuilderConditions(draft?.trigger_config?.conditions || []);
    setBuilderSteps(
      draft?.steps_definition && draft.steps_definition.length > 0
        ? draft.steps_definition
        : [{ id: 'step_1', type: 'END' }]
    );
    setView('builder');
  };

  // =========================================================================
  // MUTATIONS
  // =========================================================================
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!builderName.trim()) throw new Error('Workflow name is required');
      if (editingWorkflowId) {
        return crmApi.updateWorkflowDraft(editingWorkflowId, {
          name: builderName.trim(),
          description: builderDescription.trim(),
          trigger_type: builderTrigger,
          trigger_config: { conditions: builderConditions },
          steps_definition: builderSteps,
        });
      } else {
        return crmApi.createAutomationWorkflow({
          name: builderName.trim(),
          description: builderDescription.trim(),
          trigger_type: builderTrigger,
          trigger_config: { conditions: builderConditions },
          steps_definition: builderSteps,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Workflow draft saved successfully');
      setView('list');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save workflow draft');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (wfId: string) => {
      return crmApi.publishWorkflow(wfId);
    },
    onSuccess: (wf) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success(`Workflow "${wf.name}" published successfully (v${wf.current_version_detail?.version_number || 1})`);
      if (view === 'builder') setView('list');
    },
    onError: (err: any) => {
      const vErr = err?.response?.data?.validation_error;
      toast.error(vErr ? `Validation Error: ${vErr}` : (err?.response?.data?.error || err?.message || 'Failed to publish workflow'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      return activate ? crmApi.activateWorkflow(id) : crmApi.deactivateWorkflow(id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success(`Workflow ${vars.activate ? 'activated' : 'deactivated'}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to toggle workflow status');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => crmApi.duplicateWorkflow(id),
    onSuccess: (newWf) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success(`Duplicated as "${newWf.name}"`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to duplicate workflow');
    },
  });

  const retryExecutionMutation = useMutation({
    mutationFn: (id: string) => crmApi.retryAutomationExecution(id),
    onSuccess: (exec) => {
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      setSelectedExecution(exec);
      toast.success('Execution retry triggered successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to retry execution');
    },
  });

  // Step editing helpers
  const addStep = (type: AutomationStep['type']) => {
    const newId = `step_${builderSteps.length + 1}_${Date.now().toString().slice(-4)}`;
    const newStep: AutomationStep = {
      id: newId,
      type,
    };
    if (type === 'ACTION') {
      newStep.action_code = metadata?.actions[0]?.code || 'SEND_COMMUNICATION';
      newStep.config = {};
    } else if (type === 'WAIT') {
      newStep.duration_value = 15;
      newStep.duration_unit = 'MINUTES';
    } else if (type === 'CONDITION') {
      newStep.condition = {
        field: metadata?.condition_fields[0]?.field || 'lead.source',
        operator: 'EQUALS',
        value: '',
      };
      newStep.yes_step_id = '';
      newStep.no_step_id = '';
    }
    setBuilderSteps([...builderSteps, newStep]);
  };

  const removeStep = (idx: number) => {
    const updated = [...builderSteps];
    updated.splice(idx, 1);
    setBuilderSteps(updated);
  };

  const updateStep = (idx: number, patch: Partial<AutomationStep>) => {
    const updated = [...builderSteps];
    updated[idx] = { ...updated[idx], ...patch };
    setBuilderSteps(updated);
  };

  const addTriggerCondition = () => {
    const firstField = metadata?.condition_fields[0];
    setBuilderConditions([
      ...builderConditions,
      {
        field: firstField?.field || 'lead.source',
        operator: firstField?.allowed_operators[0] || 'EQUALS',
        value: '',
      },
    ]);
  };

  const removeTriggerCondition = (idx: number) => {
    const updated = [...builderConditions];
    updated.splice(idx, 1);
    setBuilderConditions(updated);
  };

  const updateTriggerCondition = (idx: number, patch: Partial<AutomationCondition>) => {
    const updated = [...builderConditions];
    updated[idx] = { ...updated[idx], ...patch };
    setBuilderConditions(updated);
  };

  // =========================================================================
  // RENDER: LOADING OR ERROR
  // =========================================================================
  if (isMetaLoading || (isWorkflowsLoading && view === 'list')) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs font-medium">Loading automations from tenant database...</p>
      </div>
    );
  }

  if (isMetaError) {
    return (
      <div className="p-6 bg-destructive/5 rounded-xl border border-destructive/20 text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
        <p className="text-xs font-semibold text-destructive">Unable to load automations metadata.</p>
        <Button size="sm" variant="outline" onClick={() => refetchMeta()} className="text-xs">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Tenant Automation Engine</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure event-driven multi-step workflows, durable waits, and branch automations across CRM and integrations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-input p-0.5 bg-background text-xs">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Workflows
            </button>
            <button
              type="button"
              onClick={() => setView('history')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                view === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              History
            </button>
          </div>

          {canEdit && view === 'list' && (
            <Button
              size="sm"
              onClick={startNewWorkflow}
              className="gap-1.5 h-8 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workflow</span>
            </Button>
          )}

          {view === 'builder' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('list')}
              className="h-8 text-xs"
            >
              Back to List
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WORKFLOW LIST                                                     */}
      {/* ========================================================================= */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-input p-0.5 bg-background text-xs">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setWorkflowStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    workflowStatusFilter === status
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
            </span>
          </div>

          {/* Workflow Cards */}
          {workflows.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border/50 space-y-3">
              <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">No automations configured.</p>
                <p className="text-[11px] text-muted-foreground">
                  Create your first tenant automation to automate lead assignment, trial follow-ups, and messaging.
                </p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={startNewWorkflow} className="text-xs mt-2">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create Workflow
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {workflows.map((wf) => {
                const currentVer = wf.current_version_detail;
                const draftVer = wf.draft_version_detail;
                const isPublished = !!currentVer;
                const hasDraft = !!draftVer;

                return (
                  <div
                    key={wf.id}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-all shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{wf.name}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              wf.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {wf.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                          {currentVer && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              v{currentVer.version_number} Published
                            </Badge>
                          )}
                          {hasDraft && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                              Draft v{draftVer.version_number}
                            </Badge>
                          )}
                        </div>

                        {wf.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{wf.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editWorkflowDraft(wf)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              {hasDraft ? 'Edit Draft' : 'New Version'}
                            </Button>

                            {hasDraft && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={publishMutation.isPending}
                                onClick={() => publishMutation.mutate(wf.id)}
                                className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                              >
                                Publish
                              </Button>
                            )}

                            {isPublished && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={toggleActiveMutation.isPending}
                                onClick={() =>
                                  toggleActiveMutation.mutate({
                                    id: wf.id,
                                    activate: wf.status !== 'ACTIVE',
                                  })
                                }
                                className="h-8 px-2.5 text-[11px]"
                              >
                                {wf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(wf.id)}
                              className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              title="Duplicate Workflow"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metadata summary bar */}
                    <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Trigger: <strong className="text-foreground font-mono">{wf.trigger_type || currentVer?.trigger_type || 'LEAD_CREATED'}</strong>
                        </span>
                        <span>
                          Steps:{' '}
                          <strong className="text-foreground">
                            {(currentVer?.steps_definition || draftVer?.steps_definition || []).length}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span>
                          Executions: <strong className="text-foreground">{wf.executions_count || 0}</strong>
                        </span>
                        {wf.failures_count > 0 && (
                          <span className="text-destructive font-medium">
                            Failures: {wf.failures_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: WORKFLOW BUILDER (STACKED CARDS, RESPONSIVE 320PX+)                */}
      {/* ========================================================================= */}
      {view === 'builder' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="p-4 bg-card rounded-xl border border-border/60 space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              {editingWorkflowId ? 'Edit Workflow Definition' : 'Create New Automation Workflow'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Workflow Name *</Label>
                <Input
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g. Instagram Lead Instant Follow-up"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Description</Label>
                <Input
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  placeholder="e.g. Assigns agent, sends WhatsApp, and escalates on no-reply"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Trigger Card */}
          <div className="p-4 bg-card rounded-xl border border-primary/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Play className="w-4 h-4 fill-current" />
                <span>WHEN THIS HAPPENS (TRIGGER)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Trigger Event *</Label>
              <select
                value={builderTrigger}
                onChange={(e) => setBuilderTrigger(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-mono"
              >
                {metadata?.triggers.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.display_name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Filter Conditions */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Trigger Filter Conditions (Optional)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addTriggerCondition}
                  className="h-6 px-2 text-[11px] text-primary"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Condition
                </Button>
              </div>

              {builderConditions.map((cond, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                  <select
                    value={cond.field}
                    onChange={(e) => updateTriggerCondition(idx, { field: e.target.value })}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs flex-1"
                  >
                    {metadata?.condition_fields.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.display_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => updateTriggerCondition(idx, { operator: e.target.value })}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs sm:w-36"
                  >
                    {metadata?.operators.map((op) => (
                      <option key={op.code} value={op.code}>
                        {op.display_name}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={cond.value}
                    onChange={(e) => updateTriggerCondition(idx, { value: e.target.value })}
                    placeholder="Value (e.g. INSTAGRAM or INTERESTED)"
                    className="h-8 text-xs flex-1"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTriggerCondition(idx)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Steps Vertical Stack */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Execution Steps Sequence
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addStep('ACTION')}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Action
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addStep('WAIT')}
                  className="h-7 text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Wait
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addStep('CONDITION')}
                  className="h-7 text-xs"
                >
                  <GitBranch className="w-3 h-3 mr-1" />
                  Branch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addStep('END')}
                  className="h-7 text-xs"
                >
                  End
                </Button>
              </div>
            </div>

            {builderSteps.map((step, idx) => (
              <div
                key={step.id}
                className="p-4 rounded-xl border border-border/70 bg-card shadow-sm space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {step.type}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">ID: {step.id}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(idx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Step Type Specific Configuration */}
                {step.type === 'ACTION' && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Action Type *</Label>
                      <select
                        value={step.action_code || ''}
                        onChange={(e) => updateStep(idx, { action_code: e.target.value, config: {} })}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium"
                      >
                        {metadata?.actions.map((act) => (
                          <option key={act.code} value={act.code}>
                            {act.display_name} ({act.domain})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action config: Send Communication */}
                    {step.action_code === 'SEND_COMMUNICATION' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Channel *</Label>
                          <select
                            value={step.config?.channel || 'WHATSAPP'}
                            onChange={(e) =>
                              updateStep(idx, {
                                config: { ...step.config, channel: e.target.value },
                              })
                            }
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          >
                            {metadata?.channels.map((ch) => (
                              <option key={ch.code} value={ch.code}>
                                {ch.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Template</Label>
                          <select
                            value={step.config?.template_id || ''}
                            onChange={(e) =>
                              updateStep(idx, {
                                config: { ...step.config, template_id: e.target.value },
                              })
                            }
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                          >
                            <option value="">-- Select Template --</option>
                            {metadata?.dynamic_values.templates.map((tmpl) => (
                              <option key={tmpl.id} value={tmpl.id}>
                                {tmpl.name} ({tmpl.channel})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Action config: Change Lead Stage */}
                    {step.action_code === 'CHANGE_LEAD_STAGE' && (
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                        <Label className="text-[11px] font-medium">Target Lead Stage *</Label>
                        <select
                          value={step.config?.target_stage || ''}
                          onChange={(e) =>
                            updateStep(idx, {
                              config: { ...step.config, target_stage: e.target.value },
                            })
                          }
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
                        >
                          <option value="">-- Select Stage --</option>
                          {metadata?.dynamic_values.lead_stages.map((stg) => (
                            <option key={stg.code} value={stg.code}>
                              {stg.label} ({stg.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Action config: Create Follow-up */}
                    {step.action_code === 'CREATE_FOLLOWUP' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Task Title *</Label>
                          <Input
                            value={step.config?.title || ''}
                            onChange={(e) =>
                              updateStep(idx, {
                                config: { ...step.config, title: e.target.value },
                              })
                            }
                            placeholder="e.g. Call prospective lead"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium">Due in (Hours)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={step.config?.offset_hours ?? 24}
                            onChange={(e) =>
                              updateStep(idx, {
                                config: { ...step.config, offset_hours: parseInt(e.target.value, 10) || 1 },
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Next step target */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-muted-foreground shrink-0">Then go to:</span>
                      <select
                        value={step.next_step_id || ''}
                        onChange={(e) => updateStep(idx, { next_step_id: e.target.value })}
                        className="h-7 px-2 rounded-md border border-input bg-background text-xs font-mono"
                      >
                        <option value="">Next in sequence</option>
                        {builderSteps
                          .filter((s) => s.id !== step.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id} ({s.type})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {step.type === 'WAIT' && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-medium">Wait Duration *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={step.duration_value ?? 15}
                        onChange={(e) =>
                          updateStep(idx, { duration_value: parseInt(e.target.value, 10) || 1 })
                        }
                        className="h-8 text-xs w-28"
                      />
                      <select
                        value={step.duration_unit || 'MINUTES'}
                        onChange={(e) =>
                          updateStep(idx, { duration_unit: e.target.value as any })
                        }
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs flex-1"
                      >
                        {metadata?.wait_units.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-muted-foreground shrink-0">After wait, go to:</span>
                      <select
                        value={step.next_step_id || ''}
                        onChange={(e) => updateStep(idx, { next_step_id: e.target.value })}
                        className="h-7 px-2 rounded-md border border-input bg-background text-xs font-mono"
                      >
                        <option value="">Next in sequence</option>
                        {builderSteps
                          .filter((s) => s.id !== step.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id} ({s.type})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {step.type === 'CONDITION' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium">Check Field</Label>
                        <select
                          value={step.condition?.field || ''}
                          onChange={(e) =>
                            updateStep(idx, {
                              condition: {
                                ...(step.condition || { operator: 'EQUALS', value: '' }),
                                field: e.target.value,
                              },
                            })
                          }
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                        >
                          {metadata?.condition_fields.map((f) => (
                            <option key={f.field} value={f.field}>
                              {f.display_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium">Operator</Label>
                        <select
                          value={step.condition?.operator || 'EQUALS'}
                          onChange={(e) =>
                            updateStep(idx, {
                              condition: {
                                ...(step.condition || { field: '', value: '' }),
                                operator: e.target.value,
                              },
                            })
                          }
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                        >
                          {metadata?.operators.map((op) => (
                            <option key={op.code} value={op.code}>
                              {op.display_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium">Target Value</Label>
                        <Input
                          value={step.condition?.value || ''}
                          onChange={(e) =>
                            updateStep(idx, {
                              condition: {
                                ...(step.condition || { field: '', operator: 'EQUALS' }),
                                value: e.target.value,
                              },
                            })
                          }
                          placeholder="Expected value"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold shrink-0">IF YES →</span>
                        <select
                          value={step.yes_step_id || ''}
                          onChange={(e) => updateStep(idx, { yes_step_id: e.target.value })}
                          className="h-7 px-2 rounded-md border border-emerald-500/30 bg-background text-xs font-mono flex-1"
                        >
                          <option value="">Select step</option>
                          {builderSteps
                            .filter((s) => s.id !== step.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id} ({s.type})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-destructive font-bold shrink-0">IF NO →</span>
                        <select
                          value={step.no_step_id || ''}
                          onChange={(e) => updateStep(idx, { no_step_id: e.target.value })}
                          className="h-7 px-2 rounded-md border border-destructive/30 bg-background text-xs font-mono flex-1"
                        >
                          <option value="">Select step</option>
                          {builderSteps
                            .filter((s) => s.id !== step.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id} ({s.type})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {step.type === 'END' && (
                  <div className="text-xs text-muted-foreground p-2 rounded-md bg-muted/20">
                    Terminal step. The workflow execution completes successfully.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Builder Sticky Footer */}
          <div className="p-4 bg-card rounded-xl border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 shadow-lg z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('list')}
              className="text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={saveDraftMutation.isPending}
                onClick={() => saveDraftMutation.mutate()}
                className="text-xs w-full sm:w-auto"
              >
                {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>

              {editingWorkflowId && (
                <Button
                  size="sm"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate(editingWorkflowId)}
                  className="text-xs font-semibold w-full sm:w-auto"
                >
                  {publishMutation.isPending ? 'Validating...' : 'Publish Version'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: EXECUTION HISTORY & OBSERVABILITY                                 */}
      {/* ========================================================================= */}
      {view === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-input p-0.5 bg-background text-xs overflow-x-auto max-w-full">
              {(['ALL', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                    historyStatusFilter === st
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchExecutions()}
              className="h-7 text-xs text-muted-foreground hover:text-foreground self-end sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Execution List */}
          {executions.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border/50 space-y-2">
              <History className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No executions recorded yet.</p>
              <p className="text-[11px] text-muted-foreground">
                Executions will appear here when DomainOutboxEvents trigger published workflows.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Workflow</th>
                      <th className="px-4 py-3">Trigger Event</th>
                      <th className="px-4 py-3">Aggregate</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Current Step</th>
                      <th className="px-4 py-3">Started At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {executions.map((exec) => (
                      <tr key={exec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {exec.workflow_name || 'Workflow'}
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                            v{exec.version_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {exec.trigger_event_type}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {exec.aggregate_type}:{exec.aggregate_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              exec.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : exec.status === 'RUNNING'
                                ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                                : exec.status === 'WAITING'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                          >
                            {exec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {exec.current_step_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {new Date(exec.started_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedExecution(exec)}
                            className="h-7 px-2 text-xs text-primary"
                          >
                            Details
                          </Button>
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
      {/* MODAL: EXECUTION DETAILS & TIMELINE                                       */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
        <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Execution Observability</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  selectedExecution?.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : selectedExecution?.status === 'FAILED'
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {selectedExecution?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Deterministic execution log for {selectedExecution?.workflow_name} (v{selectedExecution?.version_number}).
            </DialogDescription>
          </DialogHeader>

          {selectedExecution && (
            <div className="space-y-4 py-2 text-xs">
              {/* Top metadata grid */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/40 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground">Trigger: </span>
                  <span className="text-foreground font-semibold">{selectedExecution.trigger_event_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Depth: </span>
                  <span className="text-foreground">{selectedExecution.execution_depth}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Aggregate ID: </span>
                  <span className="text-foreground">{selectedExecution.aggregate_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Waiting Until: </span>
                  <span className="text-foreground">
                    {selectedExecution.waiting_until
                      ? new Date(selectedExecution.waiting_until).toLocaleTimeString()
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* Error Callout */}
              {selectedExecution.error_message && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error: {selectedExecution.error_code || 'FAILURE'}</span>
                  </div>
                  <p className="text-[11px]">{selectedExecution.error_message}</p>
                </div>
              )}

              {/* Step Timeline */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground">Step Execution Trail:</span>
                <div className="space-y-2">
                  {selectedExecution.step_executions && selectedExecution.step_executions.length > 0 ? (
                    selectedExecution.step_executions.map((step) => (
                      <div
                        key={step.id}
                        className="p-3 rounded-lg border border-border/40 bg-card space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{step.step_id}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {step.step_type}
                            </Badge>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              step.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : step.status === 'FAILED'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>

                        {step.error_message && (
                          <p className="text-[11px] text-destructive">{step.error_message}</p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                          <span>Attempt: {step.attempt_count}</span>
                          <span>
                            {new Date(step.started_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-[11px] italic">No step logs recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedExecution(null)}
              className="text-xs"
            >
              Close
            </Button>

            {canEdit && selectedExecution?.status === 'FAILED' && (
              <Button
                size="sm"
                variant="destructive"
                disabled={retryExecutionMutation.isPending}
                onClick={() => retryExecutionMutation.mutate(selectedExecution.id)}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {retryExecutionMutation.isPending ? 'Retrying...' : 'Retry Failed Execution'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
