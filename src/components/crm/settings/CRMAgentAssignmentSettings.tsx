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
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import type { CRMAgentAssignmentConfig } from '@/types/crm';
import { LeadTransferModal } from './LeadTransferModal';
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

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['lead-transfer-history'],
    queryFn: () => crmApi.getLeadTransferHistory(),
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
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);

  // Pagination State for Eligible Team Members
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

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

  const availableRoles = config?.available_roles || [];
  const availableUsers = config?.available_users || [];

  // Helper to check if a role is enabled in allowedRoleCodes
  const isRoleEnabled = React.useCallback(
    (role: { id: string; code: string; name?: string }) => {
      const rCode = (role.code || '').trim().toUpperCase();
      const rId = role.id;
      return allowedRoleCodes.some((allowed) => {
        const aCode = allowed.trim().toUpperCase();
        if (rCode && rCode === aCode) return true;
        if (rId && rId === allowed) return true;
        if (rCode && rCode.replace(/S$/, '') === aCode.replace(/S$/, '')) return true;
        return false;
      });
    },
    [allowedRoleCodes]
  );

  const handleToggleRole = (role: { id: string; code: string; name?: string }) => {
    if (!canEdit) return;
    const rCode = role.code;
    const rId = role.id;
    const currentlyEnabled = isRoleEnabled(role);

    setAllowedRoleCodes((prev) => {
      if (currentlyEnabled) {
        // Remove all variants of this role code or ID
        return prev.filter((c) => {
          const cUpper = c.trim().toUpperCase();
          if (c === rCode || c === rId) return false;
          if (rCode && cUpper.replace(/S$/, '') === rCode.trim().toUpperCase().replace(/S$/, '')) return false;
          return true;
        });
      } else {
        return [...prev, rCode];
      }
    });
    setHasChanges(true);
  };

  const handleToggleUser = (userId: string) => {
    if (!canEdit) return;
    setExcludedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setHasChanges(true);
  };

  // Helper to check if a user role matches any allowed role code
  const roleMatchesAllowed = React.useCallback(
    (userRole: { id?: string; code?: string; name?: string }, allowedCodes: string[]) => {
      if (!userRole) return false;
      const uCode = (userRole.code || '').trim().toUpperCase();
      const uName = (userRole.name || '').trim().toLowerCase();
      const uId = userRole.id;

      return allowedCodes.some((allowed) => {
        const aCode = allowed.trim().toUpperCase();
        // 1. Direct code equality
        if (uCode && uCode === aCode) return true;
        // 2. ID equality
        if (uId && uId === allowed) return true;
        // 3. Singular / plural normalization (e.g. HYBRID_TRAINER vs HYBRID_TRAINERS)
        if (uCode && uCode.replace(/S$/, '') === aCode.replace(/S$/, '')) return true;
        // 4. Role lookup in availableRoles
        const matchedRole = availableRoles.find((r) => r.code === allowed || r.id === allowed);
        if (matchedRole) {
          if (matchedRole.name.toLowerCase() === uName) return true;
          if (matchedRole.id === uId) return true;
          if ((matchedRole.code || '').toUpperCase().replace(/S$/, '') === uCode.replace(/S$/, '')) return true;
        }
        return false;
      });
    },
    [availableRoles]
  );

  // Compute all qualifying users across the complete user dataset
  const qualifyingUsers = React.useMemo(() => {
    return availableUsers.filter((u) => {
      const matchesRole = u.roles.some((r) => roleMatchesAllowed(r, allowedRoleCodes));
      if (!matchesRole) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.trim().toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchBranch = (u.home_branch_name || '').toLowerCase().includes(q);
      const matchRoleName = u.roles.some((r) => (r.name || '').toLowerCase().includes(q));
      return matchName || matchEmail || matchBranch || matchRoleName;
    });
  }, [availableUsers, allowedRoleCodes, userSearch, roleMatchesAllowed]);

  // Total active (non-excluded) count among all qualifying users
  const activeCount = React.useMemo(
    () => qualifyingUsers.filter((u) => !excludedUserIds.includes(u.id)).length,
    [qualifyingUsers, excludedUserIds]
  );

  // Reset to first page whenever search, role selection, or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, allowedRoleCodes, pageSize]);

  // Pagination slicing
  const totalCount = qualifyingUsers.length;
  const effectiveTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), effectiveTotalPages);
  const paginatedUsers = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return qualifyingUsers.slice(start, start + pageSize);
  }, [qualifyingUsers, safePage, pageSize]);

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

      {/* RM Offboarding & Pipeline Bulk Transfer Action Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">RM Offboarding & Pipeline Bulk Transfer</h4>
            <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30">
              Handover Tool
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            When a sales rep or RM resigns, transfers branches, or takes long leave, reassign all their leads, trials, and pending follow-ups to active staff in one atomic batch without losing history.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsTransferModalOpen(true)}
          className="h-9 px-4 text-xs font-bold gap-2 shrink-0 self-start sm:self-auto shadow-sm"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Transfer RM Pipeline
        </Button>
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
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider">
            Roles Eligible to Receive Leads ({allowedRoleCodes.length})
          </div>
          <span className="text-[11px] text-muted-foreground">
            Enable roles to automatically include all their active members in the lead assignment pool
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableRoles.map((role) => {
            const isEnabled = isRoleEnabled(role);
            return (
              <div
                key={role.id}
                onClick={() => handleToggleRole(role)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isEnabled
                    ? 'border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20'
                    : 'border-border/60 bg-card hover:bg-muted/30 opacity-70'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-foreground truncate">{role.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-mono text-[9px] uppercase px-1 py-0.2 bg-muted rounded border border-border/40">
                      {role.scope}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      {role.user_count} {role.user_count === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleRole(role)}
                  disabled={!canEdit}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible Staff Members Section with Full Pagination */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">
              Eligible Team Members ({totalCount})
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {activeCount} Active for Assignment
            </Badge>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search team member name, email, branch..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        {qualifyingUsers.length === 0 ? (
          <div className="p-8 text-center border border-border/50 rounded-2xl bg-card text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No eligible team members found.</p>
            <p className="text-[11px] text-muted-foreground">
              {allowedRoleCodes.length === 0
                ? 'Enable one or more roles above to display staff members assigned to those roles.'
                : userSearch
                ? `No staff match the search term "${userSearch}". Clear search to view all ${totalCount} members.`
                : 'No active staff users are currently assigned to the selected roles.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border border-border/60 rounded-2xl divide-y divide-border/50 bg-card overflow-hidden shadow-xs">
              {paginatedUsers.map((u) => {
                const isExcluded = excludedUserIds.includes(u.id);
                const matchingRoles = u.roles.filter((r) => roleMatchesAllowed(r, allowedRoleCodes));
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
                      <div className="flex flex-wrap items-center gap-1">
                        {matchingRoles.length > 0 ? (
                          matchingRoles.map((r, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                              {r.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            {primaryRole}
                          </Badge>
                        )}
                      </div>
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

            {/* Pagination Footer Bar */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border/60 bg-card text-xs shadow-2xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    Showing{' '}
                    <strong className="text-foreground font-semibold">
                      {totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1}
                    </strong>
                    –
                    <strong className="text-foreground font-semibold">
                      {Math.min(safePage * pageSize, totalCount)}
                    </strong>{' '}
                    of <strong className="text-foreground font-semibold">{totalCount}</strong> eligible team members
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-border/60 pl-3">
                    <span className="hidden sm:inline text-muted-foreground">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Controls */}
                {(() => {
                  const handlePageChange = (newPage: number) => {
                    if (newPage === safePage || newPage < 1 || newPage > effectiveTotalPages) return;
                    setCurrentPage(newPage);
                  };

                  const getPaginationItems = () => {
                    const items: (number | string)[] = [];
                    if (effectiveTotalPages <= 7) {
                      for (let i = 1; i <= effectiveTotalPages; i++) items.push(i);
                    } else {
                      items.push(1);
                      if (safePage > 3) items.push('dots-left');
                      const start = Math.max(2, safePage - 1);
                      const end = Math.min(effectiveTotalPages - 1, safePage + 1);
                      for (let i = start; i <= end; i++) {
                        if (!items.includes(i)) items.push(i);
                      }
                      if (safePage < effectiveTotalPages - 2) items.push('dots-right');
                      items.push(effectiveTotalPages);
                    }
                    return items;
                  };

                  return (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safePage <= 1}
                        onClick={() => handlePageChange(1)}
                        className="h-7 px-2 text-xs"
                        title="First Page"
                      >
                        «
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safePage <= 1}
                        onClick={() => handlePageChange(safePage - 1)}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <ChevronLeft className="size-3.5" />
                        Prev
                      </Button>

                      <div className="flex items-center gap-1 px-1">
                        {getPaginationItems().map((item, idx) => {
                          if (typeof item === 'string') {
                            return (
                              <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                                …
                              </span>
                            );
                          }
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handlePageChange(item)}
                              className={`h-7 min-w-[28px] px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                safePage === item
                                  ? 'bg-primary text-primary-foreground shadow-2xs'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safePage >= effectiveTotalPages}
                        onClick={() => handlePageChange(safePage + 1)}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        Next
                        <ChevronRight className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safePage >= effectiveTotalPages}
                        onClick={() => handlePageChange(effectiveTotalPages)}
                        className="h-7 px-2 text-xs"
                        title="Last Page"
                      >
                        »
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
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
      {/* Recent Pipeline Transfers & Audit Log */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider">
            Recent Pipeline Transfers & Audit Log
          </div>
          <span className="text-[11px] text-muted-foreground">Historical RM reassignments & batch handovers</span>
        </div>

        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-xs text-xs">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">From RM</th>
                <th className="py-2.5 px-4">Transferred To</th>
                <th className="py-2.5 px-4">Records Moved</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    Loading transfer audit log...
                  </td>
                </tr>
              ) : !historyData?.history || historyData.history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    No pipeline transfers executed yet. Historical handovers will be logged here automatically.
                  </td>
                </tr>
              ) : (
                historyData.history.map((batch) => (
                  <tr key={batch.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(batch.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {batch.source_user_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {batch.target_users_summary.map((t, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] bg-primary/10 text-primary border-primary/20"
                          >
                            {t.user_name} ({t.percentage}%)
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{batch.leads_count} Leads</span>
                      {batch.trials_count > 0 && <span> · {batch.trials_count} Trials</span>}
                      {batch.followups_count > 0 && <span> · {batch.followups_count} Tasks</span>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{batch.transfer_mode.replace('_', ' ')}</span>
                        {batch.status === 'ROLLED_BACK' && (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 font-bold">
                            Rolled Back
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {batch.performed_by_user_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RM Pipeline Transfer Modal */}
      <LeadTransferModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['crm-agent-assignment-config'] });
          queryClient.invalidateQueries({ queryKey: ['lead-transfer-history'] });
        }}
      />
    </form>
  );
}
