import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Save,
  RotateCw,
  Search,
  Sparkles,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import type { CRMAgentAssignmentConfig } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CRMErrorState } from '@/components/crm/common/CRMErrorState';
import { CRMLoadingState } from '@/components/crm/common/CRMLoadingState';

interface CRMAgentAssignmentSettingsProps {
  canEdit: boolean;
}

export function CRMAgentAssignmentSettings({ canEdit }: CRMAgentAssignmentSettingsProps) {
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['crm-agent-assignment-config'],
    queryFn: () => crmApi.getAgentAssignmentConfig(),
  });

  const [allowedRoleCodes, setAllowedRoleCodes] = React.useState<string[]>([]);
  const [excludedUserIds, setExcludedUserIds] = React.useState<string[]>([]);
  const [requireBranchMatch, setRequireBranchMatch] = React.useState(true);
  const [allowAllStaffFallback, setAllowAllStaffFallback] = React.useState(true);
  const [assignmentModeAllowed, setAssignmentModeAllowed] = React.useState<'MANUAL' | 'AUTO' | 'BOTH'>('BOTH');
  const [defaultAssignmentMode, setDefaultAssignmentMode] = React.useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [autoAssignmentStrategy, setAutoAssignmentStrategy] = React.useState<'ROUND_ROBIN' | 'LEAST_OPEN_LEADS' | 'MANUAL_ONLY'>('ROUND_ROBIN');
  const [allowUnassignedFallback, setAllowUnassignedFallback] = React.useState(true);
  const [considerLeaveAvailability, setConsiderLeaveAvailability] = React.useState(true);
  const [notifyManagerOnUnassigned, setNotifyManagerOnUnassigned] = React.useState(true);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');

  React.useEffect(() => {
    if (config) {
      setAllowedRoleCodes(config.allowed_role_codes || ['SALES_REP', 'BRANCH_MANAGER', 'FRONT_DESK', 'ORG_ADMIN']);
      setExcludedUserIds(config.excluded_user_ids || []);
      setRequireBranchMatch(config.require_branch_match ?? true);
      setAllowAllStaffFallback(config.allow_all_staff_fallback ?? true);
      setAssignmentModeAllowed(config.assignment_mode_allowed || 'BOTH');
      setDefaultAssignmentMode(config.default_assignment_mode || 'MANUAL');
      setAutoAssignmentStrategy(config.auto_assignment_strategy || 'ROUND_ROBIN');
      setAllowUnassignedFallback(config.allow_unassigned_fallback ?? true);
      setConsiderLeaveAvailability(config.consider_leave_availability ?? true);
      setNotifyManagerOnUnassigned(config.notify_manager_on_unassigned ?? true);
      setHasChanges(false);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CRMAgentAssignmentConfig>) =>
      crmApi.updateAgentAssignmentConfig(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['crm-agent-assignment-config'], updated);
      queryClient.invalidateQueries({ queryKey: ['eligible-agents'] });
      toast.success('Agent assignment settings saved');
      setHasChanges(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save settings');
    },
  });

  const handleToggleRole = (roleCode: string) => {
    if (!canEdit) return;
    setAllowedRoleCodes((prev) =>
      prev.includes(roleCode) ? prev.filter((c) => c !== roleCode) : [...prev, roleCode]
    );
    setHasChanges(true);
  };

  const handleToggleUser = (userId: string) => {
    if (!canEdit) return;
    setExcludedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setHasChanges(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    updateMutation.mutate({
      allowed_role_codes: allowedRoleCodes,
      excluded_user_ids: excludedUserIds,
      require_branch_match: requireBranchMatch,
      allow_all_staff_fallback: allowAllStaffFallback,
      assignment_mode_allowed: assignmentModeAllowed,
      default_assignment_mode: defaultAssignmentMode,
      auto_assignment_strategy: autoAssignmentStrategy,
      allow_unassigned_fallback: allowUnassignedFallback,
      consider_leave_availability: considerLeaveAvailability,
      notify_manager_on_unassigned: notifyManagerOnUnassigned,
    });
  };

  if (isLoading) return <CRMLoadingState message="Loading agent settings..." />;

  if (isError) {
    return (
      <CRMErrorState
        title="Failed to load configuration"
        message="Unable to fetch settings."
        onRetry={() => refetch()}
      />
    );
  }

  const availableRoles = config?.available_roles || [];
  const availableUsers = config?.available_users || [];

  const qualifyingUsers = availableUsers.filter((u) => {
    const matchesRole = u.roles.some((r) => allowedRoleCodes.includes(r.code));
    if (!matchesRole) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const activeCount = qualifyingUsers.filter((u) => !excludedUserIds.includes(u.id)).length;

  return (
    <form onSubmit={handleSave} className="w-full space-y-5">
      {/* Top Header Controls */}
      <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Sales Roles & Lead Assignment
            </h3>
            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {activeCount} Staff Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Choose which employee roles can receive new leads, and configure how prospective members are automatically distributed among your sales reps.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!canEdit || !hasChanges || updateMutation.isPending}
            className="h-9 px-4 text-xs font-semibold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {updateMutation.isPending ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Automatic Lead Distribution Rules Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">Automatic Lead Distribution Rules</h4>
              <p className="text-[11px] text-muted-foreground">
                Set how incoming enquiries from your website, WhatsApp, and social ads are assigned to your team.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 shrink-0 self-start sm:self-auto">
            Auto-Assign Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Permitted Assignment Methods */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Allowed Assignment Methods</label>
            <select
              value={assignmentModeAllowed}
              onChange={(e) => {
                if (!canEdit) return;
                setAssignmentModeAllowed(e.target.value as any);
                setHasChanges(true);
              }}
              disabled={!canEdit}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="BOTH">Both Manual & Auto-Assign Allowed</option>
              <option value="AUTO">Auto-Assignment Only (Enforced)</option>
              <option value="MANUAL">Manual Assignment Only</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              Controls whether reps can manually choose who gets a lead or if rotation is enforced.
            </p>
          </div>

          {/* Default Assignment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Default Method on New Lead Form</label>
            <select
              value={defaultAssignmentMode}
              onChange={(e) => {
                if (!canEdit) return;
                setDefaultAssignmentMode(e.target.value as any);
                setHasChanges(true);
              }}
              disabled={!canEdit || assignmentModeAllowed === 'MANUAL' || assignmentModeAllowed === 'AUTO'}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs disabled:opacity-60"
            >
              <option value="MANUAL">Manual Selection (Default)</option>
              <option value="AUTO">Auto-Assign (Default)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              Pre-selected method when staff create a lead manually.
            </p>
          </div>

          {/* Auto Assignment Strategy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Auto-Assignment Strategy</label>
            <select
              value={autoAssignmentStrategy}
              onChange={(e) => {
                if (!canEdit) return;
                setAutoAssignmentStrategy(e.target.value as any);
                setHasChanges(true);
              }}
              disabled={!canEdit || assignmentModeAllowed === 'MANUAL'}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs disabled:opacity-60"
            >
              <option value="ROUND_ROBIN">Fair Rotation (Round-Robin one-by-one)</option>
              <option value="LEAST_OPEN_LEADS">Least Busy (Assigns to rep with fewest open leads)</option>
              <option value="MANUAL_ONLY">Disabled (Manual Only)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              How the system chooses which sales rep gets the next incoming prospect.
            </p>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/50 cursor-pointer select-none">
            <Switch
              checked={considerLeaveAvailability}
              onCheckedChange={(val) => {
                if (!canEdit) return;
                setConsiderLeaveAvailability(val);
                setHasChanges(true);
              }}
              disabled={!canEdit}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <span className="font-semibold text-foreground block">Skip Staff on Leave</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Automatically skips representatives who are away on approved vacation or leave.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/50 cursor-pointer select-none">
            <Switch
              checked={allowUnassignedFallback}
              onCheckedChange={(val) => {
                if (!canEdit) return;
                setAllowUnassignedFallback(val);
                setHasChanges(true);
              }}
              disabled={!canEdit}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <span className="font-semibold text-foreground block">Safety Fallback</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                If no sales staff are on duty, safely saves the lead as unassigned without losing data.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/50 cursor-pointer select-none">
            <Switch
              checked={notifyManagerOnUnassigned}
              onCheckedChange={(val) => {
                if (!canEdit) return;
                setNotifyManagerOnUnassigned(val);
                setHasChanges(true);
              }}
              disabled={!canEdit}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <span className="font-semibold text-foreground block">Alert Manager If Unassigned</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Sends an instant alert to the studio manager when a lead needs manual assignment.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Studio Branch Scoping Options */}
      <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-card border border-border/60 text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Switch
            checked={requireBranchMatch}
            onCheckedChange={(val) => {
              if (!canEdit) return;
              setRequireBranchMatch(val);
              setHasChanges(true);
            }}
            disabled={!canEdit}
          />
          <span className="font-medium text-foreground">Only assign staff from the lead's selected studio branch</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Switch
            checked={allowAllStaffFallback}
            onCheckedChange={(val) => {
              if (!canEdit) return;
              setAllowAllStaffFallback(val);
              setHasChanges(true);
            }}
            disabled={!canEdit}
          />
          <span className="font-medium text-foreground">Allow all studio staff as fallback if no branch staff match</span>
        </label>
      </div>

      {/* Eligible Roles List */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-foreground uppercase tracking-wider">
          Roles Eligible to Receive Leads ({allowedRoleCodes.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableRoles.map((role) => {
            const isEnabled = allowedRoleCodes.includes(role.code);
            return (
              <div
                key={role.id}
                onClick={() => handleToggleRole(role.code)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isEnabled
                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-border/60 bg-card hover:bg-muted/30 opacity-70'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-foreground truncate">{role.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span>{role.scope}</span>
                    <span>•</span>
                    <span>{role.user_count} {role.user_count === 1 ? 'user' : 'users'}</span>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleRole(role.code)}
                  disabled={!canEdit}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible Staff Members Preview */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider">
            Eligible Team Members ({activeCount})
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search team member name or email..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        {qualifyingUsers.length === 0 ? (
          <div className="p-8 text-center border border-border/50 rounded-2xl bg-card text-xs text-muted-foreground">
            No active staff match the selected roles.
          </div>
        ) : (
          <div className="border border-border/60 rounded-2xl divide-y divide-border/50 bg-card overflow-hidden shadow-xs">
            {qualifyingUsers.map((u) => {
              const isExcluded = excludedUserIds.includes(u.id);
              const matchingRoles = u.roles.filter((r) => allowedRoleCodes.includes(r.code));
              const primaryRole = matchingRoles[0]?.name || u.roles[0]?.name || u.user_type || 'Staff';

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between px-4 py-3 text-xs transition-colors ${
                    isExcluded ? 'bg-muted/30 opacity-50' : 'hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-semibold text-foreground truncate">{u.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {primaryRole}
                    </Badge>
                    {u.home_branch_name && (
                      <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
                        ({u.home_branch_name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isExcluded ? 'Excluded' : 'Active for Assignment'}
                    </span>
                    <Switch
                      checked={!isExcluded}
                      onCheckedChange={() => handleToggleUser(u.id)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Card */}
      {canEdit && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground text-center sm:text-left">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>Assignment rules apply immediately to new leads created across all connected channels.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="h-9 px-4 text-xs font-semibold"
              >
                Reset Changes
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!hasChanges || updateMutation.isPending}
              className="w-full sm:w-auto h-9 px-6 text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {updateMutation.isPending ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
