import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Save,
  RotateCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/services/crmApi';
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
  const [hasChanges, setHasChanges] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');

  React.useEffect(() => {
    if (config) {
      setAllowedRoleCodes(config.allowed_role_codes || ['SALES_REP', 'BRANCH_MANAGER', 'FRONT_DESK', 'ORG_ADMIN']);
      setExcludedUserIds(config.excluded_user_ids || []);
      setRequireBranchMatch(config.require_branch_match ?? true);
      setAllowAllStaffFallback(config.allow_all_staff_fallback ?? true);
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
    <form onSubmit={handleSave} className="space-y-4 max-w-5xl">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Sales Roles & Assignment
          </h3>
          <span className="text-xs text-muted-foreground">
            {allowedRoleCodes.length} roles active • {activeCount} staff eligible
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-xs gap-1"
            >
              <RotateCw className="w-3 h-3" />
              Reset
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!canEdit || !hasChanges || updateMutation.isPending}
            className="h-8 text-xs gap-1.5"
          >
            <Save className="w-3 h-3" />
            {updateMutation.isPending ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Minimal Scoping Options */}
      <div className="flex flex-wrap items-center gap-6 p-3 rounded-lg bg-muted/20 border border-border/60 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Switch
            checked={requireBranchMatch}
            onCheckedChange={(val) => {
              if (!canEdit) return;
              setRequireBranchMatch(val);
              setHasChanges(true);
            }}
            disabled={!canEdit}
          />
          <span className="font-medium text-foreground">Require lead branch match</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Switch
            checked={allowAllStaffFallback}
            onCheckedChange={(val) => {
              if (!canEdit) return;
              setAllowAllStaffFallback(val);
              setHasChanges(true);
            }}
            disabled={!canEdit}
          />
          <span className="font-medium text-foreground">Fallback to all staff if none match</span>
        </label>
      </div>

      {/* Compact Roles List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Eligible Roles</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {availableRoles.map((role) => {
            const isEnabled = allowedRoleCodes.includes(role.code);
            return (
              <div
                key={role.id}
                onClick={() => handleToggleRole(role.code)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                  isEnabled
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/60 bg-card hover:bg-muted/30 opacity-70'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium text-foreground truncate">{role.name}</div>
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
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-foreground">
            Eligible Staff Preview ({activeCount})
          </div>
          <div className="relative w-48">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter staff..."
              className="pl-7 h-7 text-xs bg-background"
            />
          </div>
        </div>

        {qualifyingUsers.length === 0 ? (
          <div className="p-4 text-center border border-border/50 rounded-lg text-xs text-muted-foreground">
            No active staff match the selected roles.
          </div>
        ) : (
          <div className="border border-border/60 rounded-lg divide-y divide-border/50 bg-card overflow-hidden">
            {qualifyingUsers.map((u) => {
              const isExcluded = excludedUserIds.includes(u.id);
              const matchingRoles = u.roles.filter((r) => allowedRoleCodes.includes(r.code));
              const primaryRole = matchingRoles[0]?.name || u.roles[0]?.name || u.user_type || 'Staff';

              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                    isExcluded ? 'bg-muted/30 opacity-50' : 'hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-medium text-foreground truncate">{u.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {primaryRole}
                    </Badge>
                    {u.home_branch_name && (
                      <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
                        ({u.home_branch_name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {isExcluded ? 'Excluded' : 'Active'}
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
    </form>
  );
}
