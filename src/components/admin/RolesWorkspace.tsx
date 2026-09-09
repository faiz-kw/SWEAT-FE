import * as React from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  Search,
  Users,
  RefreshCw,
  Building2,
  Copy,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchRolesApi,
  fetchPermissionsApi,
  createRoleApi,
  deleteRoleApi,
  fetchTenantsForDropdownApi,
  type RoleDefRow,
  type PermissionDefRow,
} from "@/services/api-admin";
import { useAuth } from "@/contexts";

export function RolesWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin || user?.role === "Super Admin" || !user?.tenantId;

  const [roles, setRoles] = React.useState<RoleDefRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionDefRow[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<string>("all");
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("all");

  // Create Role Modal state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleCode, setNewRoleCode] = React.useState("");
  const [newRoleDescription, setNewRoleDescription] = React.useState("");
  const [newRoleScope, setNewRoleScope] = React.useState<"platform" | "tenant">("tenant");
  const [newRoleTenant, setNewRoleTenant] = React.useState<string>("");
  const [newRoleCopyFrom, setNewRoleCopyFrom] = React.useState<string>("none");
  const [creatingRole, setCreatingRole] = React.useState(false);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedPerms, fetchedTenants] = await Promise.all([
        fetchRolesApi(selectedTenantId === "all" ? undefined : selectedTenantId),
        fetchPermissionsApi(),
        isSuperAdmin ? fetchTenantsForDropdownApi() : Promise.resolve([]),
      ]);

      setRoles(fetchedRoles);
      setPermissions(fetchedPerms);
      setTenants(fetchedTenants);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load role definitions.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, isSuperAdmin]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Please provide a valid role name.");
      return;
    }

    setCreatingRole(true);
    try {
      let initialPerms: { permission_id: string; granted: boolean }[] = [];
      if (newRoleCopyFrom !== "none") {
        const templateRole = roles.find((r) => r.id === newRoleCopyFrom);
        if (templateRole?.permissions) {
          const grantedIds = new Set(
            templateRole.permissions.filter((p) => p.granted).map((p) => p.permission.id)
          );
          initialPerms = permissions.map((p) => ({
            permission_id: p.id,
            granted: grantedIds.has(p.id),
          }));
        }
      }

      await createRoleApi({
        name: newRoleName.trim(),
        code: newRoleCode.trim() || undefined,
        description: newRoleDescription.trim(),
        scope: newRoleScope,
        tenant: newRoleScope === "tenant" ? (newRoleTenant || user?.tenantId || undefined) : undefined,
        permissions: initialPerms.length > 0 ? initialPerms : undefined,
      });

      toast.success(`Role "${newRoleName}" provisioned successfully.`);
      setCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleCode("");
      setNewRoleDescription("");
      setNewRoleCopyFrom("none");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async (role: RoleDefRow) => {
    if (role.is_system) {
      toast.error("System roles are built-in and cannot be deleted.");
      return;
    }
    if ((role.users_count || 0) > 0) {
      toast.error(`Cannot delete role with ${role.users_count} assigned user(s).`);
      return;
    }

    if (!confirm(`Are you sure you want to delete custom role "${role.name}"?`)) return;

    try {
      await deleteRoleApi(role.id);
      toast.success(`Role "${role.name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete role.");
    }
  };

  // Filtering
  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      const matchesScope =
        scopeFilter === "all" || r.scope === scopeFilter || (scopeFilter === "system" && r.is_system);
      return matchesSearch && matchesScope;
    });
  }, [roles, search, scopeFilter]);

  // Metrics
  const systemRolesCount = roles.filter((r) => r.is_system).length;
  const customRolesCount = roles.filter((r) => !r.is_system).length;
  const platformRolesCount = roles.filter((r) => r.scope === "platform").length;
  const tenantRolesCount = roles.filter((r) => r.scope === "tenant").length;

  return (
    <>
      <PageHeader
        title="Roles & Access Control"
        subtitle="Configure granular RBAC permissions, built-in system role templates, and custom tenant access profiles."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="size-3.5" />
              Create Custom Role
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Total Configured Roles"
            value={roles.length}
            change={`${systemRolesCount} built-in · ${customRolesCount} custom`}
            variant="neutral"
          />
          <KpiTile
            title="Platform Roles"
            value={platformRolesCount}
            change="Super Admin & Operations"
            variant="neutral"
          />
          <KpiTile
            title="Tenant Roles"
            value={tenantRolesCount}
            change="Studio Owners, Trainers & Staff"
            variant="neutral"
          />
          <KpiTile
            title="Granular Permissions"
            value={permissions.length}
            change="Across 7 business modules"
            variant="positive"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles by name, code, description..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && tenants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="h-8 text-xs w-44 bg-background">
                    <SelectValue placeholder="All Tenants" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All Tenants & Platform</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-background">
                <SelectValue placeholder="Scope Filter" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="platform">Platform Scope</SelectItem>
                <SelectItem value="tenant">Tenant Scope</SelectItem>
                <SelectItem value="system">Built-in System</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.navigate({ to: "/admin/permissions" })}
              className="h-8 text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
            >
              <KeyRound className="size-3.5" />
              Open Permission Matrix
            </Button>
          </div>
        </div>

        {/* Roles Grid */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-primary" />
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-card">
            <Shield className="size-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No matching roles found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => {
              const grantedCount = role.permissions
                ? role.permissions.filter((p) => p.granted).length
                : 0;

              const isPlatform = role.scope === "platform";

              return (
                <div
                  key={role.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg shrink-0 ${isPlatform ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-primary/10 text-primary"}`}>
                          {isPlatform ? <ShieldCheck className="size-4" /> : <Shield className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-foreground truncate" title={role.name}>{role.name}</h3>
                          <span className="font-mono text-[10.5px] text-muted-foreground truncate block">
                            {role.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isPlatform
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                              : "bg-teal-500/10 text-teal-600 border-teal-500/30"
                          }`}
                        >
                          {role.scope}
                        </Badge>
                        {role.is_system ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Lock className="size-2.5" /> Built-in
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Custom Role
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {role.description || "No description configured."}
                    </p>

                    {role.tenant_name && (
                      <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3 text-primary" />
                        <span className="font-medium">Tenant: {role.tenant_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Users className="size-3.5 text-muted-foreground" />
                        {role.users_count ?? 0} {role.users_count === 1 ? "user" : "users"}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {grantedCount} caps
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.navigate({ to: "/admin/permissions" })}
                        className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        Permissions <ExternalLink className="size-3 ml-1" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRole(role)}
                          className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Delete custom role"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* Create Custom Role Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Create Custom RBAC Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a tailored authorization role with selective permission capabilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role Name *</Label>
              <Input
                value={newRoleName}
                onChange={(e) => {
                  setNewRoleName(e.target.value);
                  if (!newRoleCode) {
                    setNewRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
                  }
                }}
                placeholder="e.g. Senior Pilates Coach or Assistant Finance Lead"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role Code Identifier</Label>
                <Input
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g. senior_pilates_coach"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Administrative Scope</Label>
                <Select
                  value={newRoleScope}
                  onValueChange={(v: "platform" | "tenant") => setNewRoleScope(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="tenant">Tenant Scope (Gym Staff)</SelectItem>
                    {isSuperAdmin && (
                      <SelectItem value="platform">Platform Scope (Company Admin)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isSuperAdmin && newRoleScope === "tenant" && tenants.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assign to Tenant (Optional)</Label>
                <Select value={newRoleTenant} onValueChange={setNewRoleTenant}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select specific tenant or leave for template" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="">Universal Tenant Template</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Copy Permissions From Template</Label>
              <Select value={newRoleCopyFrom} onValueChange={setNewRoleCopyFrom}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="none">Clean Slate (No initial permissions)</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Template: {r.name} ({r.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Explain the functional responsibilities of this role..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingRole}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {creatingRole ? "Provisioning..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
