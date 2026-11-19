import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Users,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Sun,
  Snowflake,
  Sliders,
  RotateCcw,
  Eye,
  EyeOff,
  UserCheck,
  Percent,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  crmApi,
  TransferSourceRep,
  PreviewLeadItem,
  LeadTransferPreviewResponse,
} from '@/api/endpoints/crmApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export interface LeadTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelectedLeadIds?: string[];
  initialSourceUserId?: string;
  isSelectAllAcrossPages?: boolean;
  totalMatchingFilterCount?: number;
  onSuccess?: () => void;
}

export type DistributionMode = 'SINGLE' | 'ROUND_ROBIN' | 'LEAST_BUSY';

export function LeadTransferModal({
  open,
  onOpenChange,
  initialSelectedLeadIds = [],
  initialSourceUserId,
  isSelectAllAcrossPages = false,
  totalMatchingFilterCount = 0,
  onSuccess,
}: LeadTransferModalProps) {
  const queryClient = useQueryClient();

  // 1. Fetch real source representatives from backend API
  const {
    data: sourceRepsData,
    isLoading: isLoadingSourceReps,
    isError: isErrorSourceReps,
  } = useQuery({
    queryKey: ['lead-transfer-source-reps'],
    queryFn: () => crmApi.getTransferSourceReps(),
    enabled: open,
    staleTime: 15000,
  });

  const sourceReps: TransferSourceRep[] = React.useMemo(() => {
    return sourceRepsData?.source_reps || [];
  }, [sourceRepsData]);

  // 2. Fetch eligible assignment targets from backend config
  const { data: config } = useQuery({
    queryKey: ['crm-agent-assignment-config'],
    queryFn: () => crmApi.getAgentAssignmentConfig(),
    enabled: open,
    staleTime: 30000,
  });

  const availableTargetUsers = React.useMemo(() => config?.available_users || [], [config]);

  // Form states
  const [selectedSourceId, setSelectedSourceId] = React.useState<string>(initialSourceUserId || '');
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = React.useState<boolean>(false);
  const [sourceSearch, setSourceSearch] = React.useState<string>('');

  // If initialSourceUserId is passed or source reps arrive, default selection
  React.useEffect(() => {
    if (open) {
      if (initialSourceUserId) {
        setSelectedSourceId(initialSourceUserId);
      } else if (!selectedSourceId && sourceReps.length > 0) {
        setSelectedSourceId(sourceReps[0].id);
      }
    }
  }, [open, initialSourceUserId, sourceReps, selectedSourceId]);

  const [distributionMode, setDistributionMode] = React.useState<DistributionMode>('ROUND_ROBIN');
  const [targetUserIds, setTargetUserIds] = React.useState<string[]>([]);
  const [customWeights, setCustomWeights] = React.useState<Record<string, number>>({});
  const [useCustomWeights, setUseCustomWeights] = React.useState<boolean>(false);

  const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = React.useState<string>('ALL');
  const [includeConverted, setIncludeConverted] = React.useState<boolean>(true);
  const [includeLost, setIncludeLost] = React.useState<boolean>(true);
  const [stopAutoAssign, setStopAutoAssign] = React.useState<boolean>(true);
  const [autoSwitchMeta, setAutoSwitchMeta] = React.useState<boolean>(true);
  const [reason, setReason] = React.useState<string>('Resignation handover / Pipeline transfer');
  const [targetSearch, setTargetSearch] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Preview leads drawer state
  const [showLeadListPreview, setShowLeadListPreview] = React.useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = React.useState<string>('');

  const isSelectiveMode = initialSelectedLeadIds.length > 0 || isSelectAllAcrossPages;

  // Currently selected source representative object
  const currentSource = React.useMemo(() => {
    return sourceReps.find((u) => u.id === selectedSourceId) || sourceReps[0] || null;
  }, [sourceReps, selectedSourceId]);

  // 3. Dynamic real-time preview query from backend API
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    isFetching: isFetchingPreview,
  } = useQuery<LeadTransferPreviewResponse>({
    queryKey: [
      'lead-transfer-preview',
      selectedSourceId,
      initialSelectedLeadIds,
      isSelectAllAcrossPages,
      selectedBranchFilter,
      selectedStageFilter,
      includeConverted,
      includeLost,
      isSelectiveMode,
    ],
    queryFn: () =>
      crmApi.previewLeadTransfer({
        source_user_id: !isSelectiveMode ? selectedSourceId : undefined,
        lead_ids: isSelectiveMode && !isSelectAllAcrossPages ? initialSelectedLeadIds : undefined,
        is_all_matching: isSelectAllAcrossPages,
        branch_id: selectedBranchFilter,
        stage_filter: selectedStageFilter,
        include_converted: includeConverted,
        include_lost: includeLost,
      }),
    enabled: open && (Boolean(selectedSourceId) || isSelectiveMode),
    staleTime: 5000,
  });

  // Dynamic preview counts directly from backend
  const totalLeadsToTransfer = previewData?.total_leads ?? (isSelectAllAcrossPages ? totalMatchingFilterCount : initialSelectedLeadIds.length);
  const activeLeadsCount = previewData?.active_leads ?? 0;
  const convertedCount = previewData?.converted_leads ?? 0;
  const lostCount = previewData?.lost_leads ?? 0;
  const trialsCount = previewData?.trials_count ?? 0;
  const tasksCount = previewData?.followups_count ?? 0;
  const hotCount = previewData?.hot_leads ?? 0;
  const warmCount = previewData?.warm_leads ?? 0;
  const coldCount = previewData?.cold_leads ?? 0;
  const hasMetaAdsAttached = previewData?.has_meta_ads ?? (currentSource?.has_meta_ads || false);
  const rawSampleLeads = previewData?.sample_leads || [];

  // Filter sample leads for drawer search
  const filteredPreviewLeads = React.useMemo(() => {
    if (!previewSearch.trim()) return rawSampleLeads;
    const q = previewSearch.toLowerCase();
    return rawSampleLeads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.status.toLowerCase().includes(q)
    );
  }, [rawSampleLeads, previewSearch]);

  // 4. Candidate Target Representatives
  const candidateTargets = React.useMemo(() => {
    // If availableTargetUsers from config is loaded, map it; otherwise use active source reps
    let pool = availableTargetUsers.length > 0
      ? availableTargetUsers.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.roles[0]?.name || u.user_type || 'Counselor',
          branch: u.home_branch_name || 'All Branches',
          isDeactivated: false,
        }))
      : sourceReps
          .filter((u) => !u.is_deactivated)
          .map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            branch: u.branch_name,
            isDeactivated: false,
          }));

    // Exclude current source representative (unless Unassigned pool is selected)
    if (selectedSourceId && selectedSourceId !== 'unassigned') {
      pool = pool.filter((u) => u.id !== selectedSourceId);
    }

    if (targetSearch.trim()) {
      const q = targetSearch.toLowerCase();
      pool = pool.filter(
        (u) => u.name.toLowerCase().includes(q) || u.branch.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
      );
    }
    return pool;
  }, [availableTargetUsers, sourceReps, selectedSourceId, targetSearch]);

  // Initialize target users selection once candidates load
  React.useEffect(() => {
    if (candidateTargets.length >= 2 && targetUserIds.length === 0) {
      setTargetUserIds([candidateTargets[0].id, candidateTargets[1].id]);
    } else if (candidateTargets.length === 1 && targetUserIds.length === 0) {
      setTargetUserIds([candidateTargets[0].id]);
    }
  }, [candidateTargets, targetUserIds.length]);

  // Handle Mode Change
  const handleModeChange = (mode: DistributionMode) => {
    setDistributionMode(mode);
    if (mode === 'SINGLE') {
      setTargetUserIds((prev) => (prev.length > 0 ? [prev[0]] : candidateTargets.length > 0 ? [candidateTargets[0].id] : []));
    } else {
      if (targetUserIds.length <= 1 && candidateTargets.length >= 2) {
        setTargetUserIds([candidateTargets[0].id, candidateTargets[1].id]);
      }
    }
  };

  // Select All / Deselect All for Target Recipients
  const handleSelectAllTargets = () => {
    if (targetUserIds.length === candidateTargets.length) {
      if (candidateTargets.length > 0) setTargetUserIds([candidateTargets[0].id]);
    } else {
      setTargetUserIds(candidateTargets.map((u) => u.id));
    }
  };

  const handleToggleTarget = (userId: string) => {
    if (distributionMode === 'SINGLE') {
      setTargetUserIds([userId]);
    } else {
      setTargetUserIds((prev) =>
        prev.includes(userId) ? (prev.length > 1 ? prev.filter((id) => id !== userId) : prev) : [...prev, userId]
      );
    }
  };

  const getEstimatedLeadsForTarget = (userId: string): number => {
    if (!targetUserIds.includes(userId)) return 0;
    if (distributionMode === 'SINGLE') return totalLeadsToTransfer;

    if (useCustomWeights && customWeights[userId]) {
      return Math.round((totalLeadsToTransfer * customWeights[userId]) / 100);
    }

    if (distributionMode === 'ROUND_ROBIN' || distributionMode === 'LEAST_BUSY') {
      return Math.round(totalLeadsToTransfer / Math.max(1, targetUserIds.length));
    }

    return Math.round(totalLeadsToTransfer / Math.max(1, targetUserIds.length));
  };

  // Filter source users for custom popover search
  const filteredSourceUsers = React.useMemo(() => {
    if (!sourceSearch.trim()) return sourceReps;
    const q = sourceSearch.toLowerCase();
    return sourceReps.filter(
      (u) => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.branch_name.toLowerCase().includes(q)
    );
  }, [sourceReps, sourceSearch]);

  // 5. Execute transfer with real backend API & 10-second Undo action
  const handleExecute = async () => {
    if (targetUserIds.length === 0) {
      toast.error('Please select at least one recipient representative');
      return;
    }

    if (totalLeadsToTransfer === 0) {
      toast.error('No matching leads found to transfer under current scope.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await crmApi.executeLeadTransfer({
        source_user_id: !isSelectiveMode ? selectedSourceId : undefined,
        lead_ids: isSelectiveMode && !isSelectAllAcrossPages ? initialSelectedLeadIds : undefined,
        is_all_matching: isSelectAllAcrossPages,
        target_user_ids: targetUserIds,
        transfer_mode: distributionMode,
        custom_weights: useCustomWeights ? customWeights : undefined,
        branch_id: selectedBranchFilter,
        stage_filter: selectedStageFilter,
        include_converted: includeConverted,
        include_lost: includeLost,
        stop_auto_assign: stopAutoAssign,
        auto_switch_meta: autoSwitchMeta,
        reason: reason,
      });

      const batchId = res.batch_id;

      // 10-second Undo safety net connected to real backend rollback endpoint
      toast.success(
        res.message || `Transferred ${res.transferred_leads_count} leads, ${res.transferred_trials_count} trials, and ${res.transferred_followups_count} follow-ups!`,
        {
          duration: 10000,
          action: {
            label: 'Undo (10s)',
            onClick: async () => {
              try {
                const rollRes = await crmApi.rollbackLeadTransfer(batchId);
                toast.info(rollRes.message, { icon: '↩️' });
                await queryClient.invalidateQueries({ queryKey: ['leads'] });
                await queryClient.invalidateQueries({ queryKey: ['lead-transfer-source-reps'] });
                await queryClient.invalidateQueries({ queryKey: ['lead-transfer-history'] });
                await queryClient.invalidateQueries({ queryKey: ['lead-transfer-preview'] });
              } catch (err: any) {
                toast.error(err?.response?.data?.error || err?.message || 'Failed to rollback lead transfer');
              }
            },
          },
        }
      );

      // Invalidate relevant CRM queries
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-transfer-source-reps'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-transfer-history'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-transfer-preview'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-counts'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-summary-metrics'] });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error;
      const displayMsg = typeof errMsg === 'object' ? Object.values(errMsg).flat().join(', ') : errMsg || err?.message || 'Failed to complete lead transfer';
      toast.error(displayMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[min(92vh,820px)] flex flex-col p-0 gap-0 overflow-hidden bg-background border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-5 sm:px-6 py-4 border-b border-border bg-card/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg border border-primary/20 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                {isSelectiveMode ? 'Transfer Selected Leads' : 'Transfer Leads & Sales Pipeline'}
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {isSelectAllAcrossPages
                    ? `All ${totalLeadsToTransfer.toLocaleString()} Leads`
                    : isSelectiveMode
                    ? `${totalLeadsToTransfer} Selected`
                    : 'RM Handover'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Reassign leads, scheduled trials, and follow-ups to active staff with full timeline and credit preservation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5 text-xs text-foreground">
          {/* STEP 1: SOURCE RM SELECTION */}
          {!isSelectiveMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  1. Select Leaving / Source Representative
                  {isLoadingSourceReps && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </label>
                <span className="text-[11px] font-semibold text-primary/80">Active & Deactivated Staff</span>
              </div>

              {/* Custom Searchable Popover Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                  disabled={isLoadingSourceReps}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-card hover:bg-muted/40 border border-border rounded-xl transition-all shadow-xs text-left text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                >
                  {currentSource ? (
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {currentSource.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{currentSource.name}</span>
                          <span className="text-[10px] text-muted-foreground">({currentSource.role} · {currentSource.branch_name})</span>
                          {currentSource.is_deactivated && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 font-bold">
                              Deactivated
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {currentSource.lead_count} total leads · {currentSource.trial_count} trials · {currentSource.task_count} pending tasks
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {isLoadingSourceReps ? 'Loading representatives...' : 'Select representative...'}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                </button>

                {/* Popover Card */}
                {isSourceDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search rep name, role, or branch..."
                        value={sourceSearch}
                        onChange={(e) => setSourceSearch(e.target.value)}
                        className="pl-8 text-xs h-8 bg-muted/40"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-border/30">
                      {filteredSourceUsers.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No matching representatives found.
                        </div>
                      ) : (
                        filteredSourceUsers.map((rep) => (
                          <button
                            key={rep.id}
                            type="button"
                            onClick={() => {
                              setSelectedSourceId(rep.id);
                              setIsSourceDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                              selectedSourceId === rep.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground font-bold flex items-center justify-center text-[10px] shrink-0">
                                {rep.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{rep.name}</span>
                                  {rep.is_deactivated && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20 font-bold">
                                      Deactivated
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {rep.role} · {rep.branch_name}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="font-mono text-[11px] font-bold text-foreground">{rep.lead_count} leads</div>
                              <div className="text-[9px] text-muted-foreground">{rep.trial_count} trials</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Selective Mode Banner */
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">
                    {isSelectAllAcrossPages
                      ? `Selected All Matching Leads (${totalLeadsToTransfer.toLocaleString()})`
                      : `Selected ${initialSelectedLeadIds.length} Leads from Leads Directory`}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    You are reassigning these specific filtered leads to new staff members.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC PIPELINE STATS SUMMARY CARDS */}
          <div className="relative">
            {isFetchingPreview && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-card border border-border/70 rounded-xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Leads</div>
                <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1.5">
                  {totalLeadsToTransfer.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground">({activeLeadsCount} Open)</span>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5 text-[9px]">
                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                    <Flame className="w-2.5 h-2.5" /> {hotCount} Hot
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                    <Sun className="w-2.5 h-2.5" /> {warmCount} Warm
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400 font-medium">
                    <Snowflake className="w-2.5 h-2.5" /> {coldCount} Cold
                  </span>
                </div>
              </div>

              <div className="p-3 bg-card border border-border/70 rounded-xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Converted</div>
                <div className="text-xl font-bold font-mono text-emerald-600">{convertedCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Closer credit safe</div>
              </div>

              <div className="p-3 bg-card border border-border/70 rounded-xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Linked Trials</div>
                <div className="text-xl font-bold font-mono text-primary">{trialsCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Slot preserved</div>
              </div>

              <div className="p-3 bg-card border border-border/70 rounded-xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending Tasks</div>
                <div className="text-xl font-bold font-mono text-foreground">{tasksCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Due dates kept</div>
              </div>
            </div>
          </div>

          {/* PREVIEW LEADS LIST EXPANDABLE DRAWER */}
          <div className="border border-border/70 rounded-xl bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLeadListPreview(!showLeadListPreview)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {showLeadListPreview ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-primary" />}
                <span className="font-semibold text-foreground text-xs">
                  {showLeadListPreview ? 'Hide Leads Preview Drawer' : 'View Sample Leads for this Handover'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                  {totalLeadsToTransfer} leads matching
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{showLeadListPreview ? 'Collapse' : 'Expand'}</span>
                {showLeadListPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showLeadListPreview && (
              <div className="p-3 pt-0 border-t border-border/50 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search preview leads by name, phone, or status..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-muted/30"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    Showing top {filteredPreviewLeads.length} leads
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-border/50 rounded-lg divide-y divide-border/40 text-[11px]">
                  {filteredPreviewLeads.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No leads match current filters.
                    </div>
                  ) : (
                    filteredPreviewLeads.map((lead) => (
                      <div key={lead.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{lead.name}</span>
                            <span className="font-mono text-muted-foreground text-[10px]">{lead.phone}</span>
                            {lead.temperature === 'HOT' && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5 py-0 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" /> Hot
                              </Badge>
                            )}
                            {lead.temperature === 'WARM' && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] px-1.5 py-0 flex items-center gap-0.5">
                                <Sun className="w-2.5 h-2.5" /> Warm
                              </Badge>
                            )}
                            {lead.temperature === 'COLD' && (
                              <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[9px] px-1.5 py-0 flex items-center gap-0.5">
                                <Snowflake className="w-2.5 h-2.5" /> Cold
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {lead.branch} · Status: <span className="text-foreground font-medium">{lead.status}</span>
                            {lead.trialStatus && (
                              <span className="text-primary font-semibold"> · Trial: {lead.trialStatus}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SCOPE FILTERS */}
          {!isSelectiveMode && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  2. Filter Scope (Optional)
                </label>
                <span className="text-[11px] text-muted-foreground">Defaults to all leads</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Branch Scope</span>
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="w-full h-8 px-2.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Branches ({currentSource?.lead_count || 0} leads)</option>
                    {currentSource?.branch_id && (
                      <option value={currentSource.branch_id}>Only {currentSource.branch_name}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Lead Stage Scope</span>
                  <select
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    className="w-full h-8 px-2.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Stages (Open, Converted, Lost)</option>
                    <option value="OPEN">Only Active & In-Progress Pipeline</option>
                    <option value="CONVERTED">Only Converted Leads</option>
                    <option value="LOST">Only Lost & Inactive Leads</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeConverted}
                    onChange={(e) => setIncludeConverted(e.target.checked)}
                    className="rounded-sm border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-foreground font-medium">
                    Include Converted Leads ({convertedCount})
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeLost}
                    onChange={(e) => setIncludeLost(e.target.checked)}
                    className="rounded-sm border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-foreground font-medium">
                    Include Lost & Not Interested Leads ({lostCount})
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: DISTRIBUTION MODE SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              3. Choose Distribution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Single RM */}
              <div
                onClick={() => handleModeChange('SINGLE')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  distributionMode === 'SINGLE'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground text-xs">Single RM</div>
                  <input
                    type="radio"
                    checked={distributionMode === 'SINGLE'}
                    onChange={() => handleModeChange('SINGLE')}
                    className="text-primary focus:ring-primary"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  All leads transfer to 1 selected representative.
                </div>
              </div>

              {/* Round-Robin */}
              <div
                onClick={() => handleModeChange('ROUND_ROBIN')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  distributionMode === 'ROUND_ROBIN'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground text-xs">Equal Round-Robin</div>
                  <input
                    type="radio"
                    checked={distributionMode === 'ROUND_ROBIN'}
                    onChange={() => handleModeChange('ROUND_ROBIN')}
                    className="text-primary focus:ring-primary"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Divides leads evenly 1-by-1 across 2+ selected reps.
                </div>
              </div>

              {/* Least-Busy Balance */}
              <div
                onClick={() => handleModeChange('LEAST_BUSY')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  distributionMode === 'LEAST_BUSY'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground text-xs">Least Busy Balance</div>
                  <input
                    type="radio"
                    checked={distributionMode === 'LEAST_BUSY'}
                    onChange={() => handleModeChange('LEAST_BUSY')}
                    className="text-primary focus:ring-primary"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Auto-balances: assigns more to reps with fewest leads.
                </div>
              </div>
            </div>

            {/* Custom Weight Sliders Toggle */}
            {distributionMode === 'ROUND_ROBIN' && targetUserIds.length >= 2 && (
              <div className="pt-1.5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !useCustomWeights;
                    setUseCustomWeights(nextVal);
                    if (nextVal && targetUserIds.length > 0) {
                      const equalShare = Math.floor(100 / targetUserIds.length);
                      const initialWeights: Record<string, number> = {};
                      targetUserIds.forEach((uid, idx) => {
                        initialWeights[uid] = idx === 0 ? 100 - equalShare * (targetUserIds.length - 1) : equalShare;
                      });
                      setCustomWeights(initialWeights);
                    }
                  }}
                  className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{useCustomWeights ? 'Disable Custom % Sliders' : 'Enable Custom % Weight Sliders'}</span>
                </button>
                {useCustomWeights && (
                  <span className="text-[10px] text-muted-foreground">Adjust percentages per representative</span>
                )}
              </div>
            )}
          </div>

          {/* STEP 4: TARGET RECIPIENTS SELECTION */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                4. Select Target Recipient(s) ({targetUserIds.length} Selected)
              </label>
              <div className="flex items-center gap-2">
                {distributionMode !== 'SINGLE' && (
                  <button
                    type="button"
                    onClick={handleSelectAllTargets}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{targetUserIds.length === candidateTargets.length ? 'Deselect All' : 'Select All Staff'}</span>
                  </button>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {distributionMode === 'SINGLE' ? 'Select 1 recipient' : 'Select 2 or more reps'}
                </span>
              </div>
            </div>

            {/* Search Target Reps */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search recipient by name, branch, or role..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-card border-border/70"
              />
            </div>

            {/* Target List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {candidateTargets.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No active recipient representatives found matching your search.
                </div>
              ) : (
                candidateTargets.map((user) => {
                  const isSelected = targetUserIds.includes(user.id);
                  const estimatedCount = getEstimatedLeadsForTarget(user.id);
                  const isCrossBranch = currentSource && currentSource.branch_name !== user.branch && user.branch !== 'All Branches';

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleToggleTarget(user.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary/60 bg-primary/5 shadow-xs'
                          : 'border-border/70 bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type={distributionMode === 'SINGLE' ? 'radio' : 'checkbox'}
                            checked={isSelected}
                            onChange={() => {}}
                            className="text-primary focus:ring-primary rounded-xs"
                          />
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{user.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">· {user.role}</span>
                              {isCrossBranch && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Cross-Branch
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {user.branch} · <span className="text-emerald-600 font-medium">Available</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {isSelected ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs font-mono font-bold">
                              Receives ~{estimatedCount} leads
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">0 leads</span>
                          )}
                        </div>
                      </div>

                      {/* Custom Weight Slider inside Card */}
                      {isSelected && useCustomWeights && distributionMode === 'ROUND_ROBIN' && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-3">
                          <Percent className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={customWeights[user.id] || Math.round(100 / Math.max(1, targetUserIds.length))}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setCustomWeights((prev) => ({ ...prev, [user.id]: val }));
                            }}
                            className="flex-1 accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-foreground w-10 text-right">
                            {customWeights[user.id] || Math.round(100 / Math.max(1, targetUserIds.length))}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 5: OFFBOARDING SAFEGUARDS */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Offboarding Safeguards & Automation
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground text-xs">
                    Exclude from future auto-assignments
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Automatically adds RM to excluded users so new incoming leads are not routed here.
                  </div>
                </div>
                <Switch checked={stopAutoAssign} onCheckedChange={setStopAutoAssign} />
              </div>

              {hasMetaAdsAttached && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Auto-switch Meta Lead Ad forms
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      This RM is currently assigned directly on Facebook Lead Forms. Auto-switch to recipient.
                    </div>
                  </div>
                  <Switch checked={autoSwitchMeta} onCheckedChange={setAutoSwitchMeta} />
                </div>
              )}

              <div className="pt-2 border-t border-border/40 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Transfer Reason / Audit Note</span>
                <Input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Employee resignation, role change, branch realignment"
                  className="text-xs h-8 bg-muted/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 sm:px-6 py-3 border-t border-border bg-card/60 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isSubmitting || targetUserIds.length === 0 || totalLeadsToTransfer === 0}
            className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transferring Pipeline...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>
                  Confirm & Transfer {totalLeadsToTransfer.toLocaleString()} Leads
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
