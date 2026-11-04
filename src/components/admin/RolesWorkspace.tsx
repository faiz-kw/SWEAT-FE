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
  XCircle,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  updateRoleApi,
  toggleRoleActiveApi,
  deleteRoleApi,
  updateRolePermissionsApi,
  fetchUsersApi,
  updateUserApi,
  fetchTenantsForDropdownApi,
  fetchDepartmentsApi,
  type RoleDefRow,
  type PermissionDefRow,
  type AdminUserRow,
} from "@/api/endpoints/api-admin";
import { useAuth } from "@/contexts";
import {
  getFriendlyModuleName,
  getFriendlySubmoduleName,
  getFriendlyPermissionCode,
  getFriendlyPermissionLabel,
} from "./PermissionsWorkspace";

export function RolesWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const isPlatformAdmin =
    user?.userType === "platform" ||
    (!user?.tenantId && (!!user?.isSuperAdmin || user?.role === "Super Admin"));

  const [roles, setRoles] = React.useState<RoleDefRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionDefRow[]>([]);
  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
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
  const [newRoleScope, setNewRoleScope] = React.useState<"ORG" | "BRANCH">("ORG");
  const [newRoleCopyFrom, setNewRoleCopyFrom] = React.useState<string>("none");
  const [creatingRole, setCreatingRole] = React.useState(false);

  // Configure Permissions Modal state
  const [permModalOpen, setPermModalOpen] = React.useState(false);
  const [activeRoleForPerms, setActiveRoleForPerms] = React.useState<RoleDefRow | null>(null);
  const [selectedPermIds, setSelectedPermIds] = React.useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = React.useState(false);
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});

  // Assign Role Modal state
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [activeRoleForAssign, setActiveRoleForAssign] = React.useState<RoleDefRow | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [assigningUser, setAssigningUser] = React.useState(false);

  // Departments list for role association
  const [departments, setDepartments] = React.useState<{ id: string; name: string }[]>([]);

  // Edit Role Modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleDefRow | null>(null);
  const [editRoleName, setEditRoleName] = React.useState("");
  const [editRoleCode, setEditRoleCode] = React.useState("");
  const [editRoleDescription, setEditRoleDescription] = React.useState("");
  const [editRoleScope, setEditRoleScope] = React.useState<"ORG" | "BRANCH">("ORG");
  const [editRoleDepartmentId, setEditRoleDepartmentId] = React.useState<string>("none");
  const [editRoleIsActive, setEditRoleIsActive] = React.useState(true);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedPerms, fetchedUsers, fetchedTenants, fetchedDepts] = await Promise.all([
        fetchRolesApi(isPlatformAdmin && selectedTenantId !== "all" ? selectedTenantId : undefined),
        fetchPermissionsApi(),
        fetchUsersApi(),
        isPlatformAdmin ? fetchTenantsForDropdownApi() : Promise.resolve([]),
        fetchDepartmentsApi().catch(() => []),
      ]);

      setRoles(fetchedRoles);
      setPermissions(fetchedPerms);
      setUsers(fetchedUsers);
      setTenants(fetchedTenants);
      setDepartments(fetchedDepts || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to load role definitions.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, isPlatformAdmin]);

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
        permissions: initialPerms.length > 0 ? initialPerms : undefined,
      });

      toast.success(`Role "${newRoleName}" provisioned successfully in tenant database.`);
      setCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleCode("");
      setNewRoleDescription("");
      setNewRoleScope("ORG");
      setNewRoleCopyFrom("none");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (role: RoleDefRow) => {
    if (role.is_system) {
      toast.error("System roles are built-in and cannot be deactivated.");
      return;
    }
    try {
      const nextActive = !role.is_active;
      await toggleRoleActiveApi(role.id, nextActive);
      toast.success(`Role "${role.name}" is now ${nextActive ? "Active" : "Inactive"}.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to update role status.");
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async (role: RoleDefRow) => {
    if (role.is_system) {
      toast.error("System roles are built-in and cannot be deleted.");
      return;
    }
    if ((role.users_count || 0) > 0) {
      toast.error(`Cannot delete role with ${role.users_count} assigned user(s). Deactivate it instead.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) return;

    try {
      await deleteRoleApi(role.id);
      toast.success(`Role "${role.name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete role.");
    }
  };

  // Open Configure Permissions Modal
  const handleOpenPermsModal = (role: RoleDefRow) => {
    setActiveRoleForPerms(role);
    const granted = new Set<string>();
    if (role.permissions && Array.isArray(role.permissions)) {
      role.permissions.forEach((p: any) => {
        if (p.granted && p.permission?.id) {
          granted.add(p.permission.id);
        }
      });
    }
    setSelectedPermIds(granted);
    setPermModalOpen(true);
  };

  // Save Permissions Configuration
  const handleSaveRolePermissions = async () => {
    if (!activeRoleForPerms) return;
    setSavingPerms(true);
    try {
      const payload = permissions.map((p) => ({
        permission_id: p.id,
        granted: selectedPermIds.has(p.id),
      }));

      await updateRolePermissionsApi(activeRoleForPerms.id, payload);
      toast.success(`Permissions saved for role "${activeRoleForPerms.name}".`);
      setPermModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to update permissions.");
    } finally {
      setSavingPerms(false);
    }
  };

  // Open Edit Role Modal
  const handleOpenEditModal = (role: RoleDefRow) => {
    setEditingRole(role);
    setEditRoleName(role.name || "");
    setEditRoleCode(role.code || "");
    setEditRoleDescription(role.description || "");
    setEditRoleScope((role.scope === "BRANCH" ? "BRANCH" : "ORG") as "ORG" | "BRANCH");
    setEditRoleDepartmentId((role as any).department || (role as any).department_id || "none");
    setEditRoleIsActive(role.is_active !== false);
    setEditError(null);
    setEditModalOpen(true);
  };

  // Save Role Edit
  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    const trimmedName = editRoleName.trim();
    if (!trimmedName) {
      const err = "Please provide a valid role name.";
      setEditError(err);
      toast.error(err);
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const payload: Partial<RoleDefRow> & { department?: string | null } = {
        name: trimmedName,
        description: editRoleDescription.trim(),
        scope: editRoleScope,
      };

      // Include code and is_active for custom roles (system roles protect these)
      if (!editingRole.is_system) {
        if (editRoleCode.trim()) {
          payload.code = editRoleCode.trim();
        }
        payload.is_active = editRoleIsActive;
      }

      if (editRoleDepartmentId && editRoleDepartmentId !== "none") {
        payload.department = editRoleDepartmentId;
      } else {
        payload.department = null;
      }

      const updated = await updateRoleApi(
        editingRole.id,
        payload,
        isPlatformAdmin && selectedTenantId !== "all" ? selectedTenantId : undefined
      );

      toast.success(`Role "${updated?.name || trimmedName}" updated successfully.`);
      setEditModalOpen(false);
      setEditingRole(null);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to update role.";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Assign Role Modal
  const handleOpenAssignModal = (role: RoleDefRow) => {
    setActiveRoleForAssign(role);
    setSelectedUserId("");
    setAssignModalOpen(true);
  };

  // Execute Role Assignment
  const handleAssignRoleToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoleForAssign || !selectedUserId) {
      toast.error("Please select a staff member to assign this role.");
      return;
    }

    setAssigningUser(true);
    try {
      await updateUserApi(selectedUserId, {
        role_id: activeRoleForAssign.id,
      });
      toast.success(`Role "${activeRoleForAssign.name}" assigned successfully!`);
      setAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to assign role.");
    } finally {
      setAssigningUser(false);
    }
  };

  // Filtering
  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(search.toLowerCase());

      let matchesScope = true;
      if (scopeFilter === "ORG") matchesScope = r.scope === "ORG";
      else if (scopeFilter === "BRANCH") matchesScope = r.scope === "BRANCH";
      else if (scopeFilter === "system") matchesScope = !!r.is_system;
      else if (scopeFilter === "custom") matchesScope = !r.is_system;

      return matchesSearch && matchesScope;
    });
  }, [roles, search, scopeFilter]);

  // Group permissions by module and submodule for modal editor
  const permissionsByModule = React.useMemo(() => {
    const modules: Record<string, Record<string, PermissionDefRow[]>> = {};
    permissions.forEach((p) => {
      const mod = getFriendlyModuleName(p);
      const sub = getFriendlySubmoduleName(p) || "General Capabilities";
      if (!modules[mod]) modules[mod] = {};
      if (!modules[mod][sub]) modules[mod][sub] = [];
      modules[mod][sub].push(p);
    });
    return modules;
  }, [permissions]);

  // Metrics
  const systemRolesCount = roles.filter((r) => r.is_system).length;
  const customRolesCount = roles.filter((r) => !r.is_system).length;
  const orgScopedCount = roles.filter((r) => r.scope === "ORG").length;
  const branchScopedCount = roles.filter((r) => r.scope === "BRANCH").length;

  return (
    <>
      <PageHeader
        title={isPlatformAdmin ? "Platform & System Roles" : "Tenant Roles & Access Profiles"}
        subtitle={
          isPlatformAdmin
            ? "Configure master platform clearance templates and system-wide RBAC roles."
            : "Define job roles, branch scopes, and granular module permissions for your gym staff."
        }
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
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              Create Custom Role
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Total Configured Roles"
            value={roles.length}
            change={`${systemRolesCount} built-in · ${customRolesCount} custom`}
            variant="neutral"
          />
          <KpiTile
            title="Organization-Wide Roles"
            value={orgScopedCount}
            change="All-Branch Clearance"
            variant="positive"
          />
          <KpiTile
            title="Branch-Scoped Roles"
            value={branchScopedCount}
            change="Single-Location Assigned"
            variant="neutral"
          />
          <KpiTile
            title="Granular Permissions"
            value={permissions.length}
            change="Available Across Entitled Modules"
            variant="neutral"
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
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-8 text-xs w-40 bg-background">
                <SelectValue placeholder="Scope Filter" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="ORG">Organization Scope (ORG)</SelectItem>
                <SelectItem value="BRANCH">Branch Scope (BRANCH)</SelectItem>
                <SelectItem value="system">Built-in System Roles</SelectItem>
                <SelectItem value="custom">Custom Tenant Roles</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.navigate({ to: "/admin/permissions" })}
              className="h-8 text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
            >
              <KeyRound className="size-3.5" />
              Full Permission Matrix
            </Button>
          </div>
        </div>

        {/* Roles List: Responsive Grid */}
        {loading ? (
          <div className="flex flex-col h-56 items-center justify-center gap-3 border border-border rounded-xl bg-card">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Loading role definitions...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-card">
            <Shield className="size-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No matching roles found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or scope filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => {
              const grantedCount = role.permissions
                ? role.permissions.filter((p) => p.granted).length
                : 0;

              const isOrgScope = role.scope === "ORG";

              return (
                <div
                  key={role.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isOrgScope
                              ? "bg-primary/10 text-primary"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          <Shield className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-foreground truncate" title={role.name}>
                            {role.name}
                          </h3>
                          <span className="font-mono text-[10.5px] text-muted-foreground truncate block">
                            {role.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isOrgScope
                              ? "bg-teal-500/10 text-teal-600 border-teal-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {role.scope} Scope
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
                      {role.description || "Custom role with granular permissions configured."}
                    </p>

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Users className="size-3.5 text-muted-foreground" />
                        {role.users_count ?? 0} {role.users_count === 1 ? "staff" : "staff"}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {grantedCount} capabilities
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPermsModal(role)}
                        className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <KeyRound className="size-3 mr-1" /> Permissions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(role)}
                        className="h-7 px-2 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                        title="Edit Role & Details"
                      >
                        <Edit2 className="size-3 mr-1 text-primary" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssignModal(role)}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Assign to Staff Member"
                      >
                        <UserCheck className="size-3 mr-1" /> Assign
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {!role.is_system && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(role)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {role.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role)}
                            disabled={(role.users_count || 0) > 0}
                            className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-40"
                            title={
                              (role.users_count || 0) > 0
                                ? "Cannot delete role with active users"
                                : "Delete custom role"
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* Edit Role Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-primary" /> Edit Role & Access Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update role display name, operational scope, description, and settings.
            </DialogDescription>
          </DialogHeader>

          {editingRole && (
            <form onSubmit={handleSaveEditRole} className="space-y-4 pt-2">
              {editError && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Role Type Indicator */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground">
                      {editingRole.is_system ? "Built-in System Role" : "Custom Tenant Role"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block font-mono">
                      ID: {editingRole.id}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    editingRole.is_system
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-primary/10 text-primary border-primary/30"
                  }`}
                >
                  {editingRole.is_system ? "System Protected" : "Custom"}
                </Badge>
              </div>

              {/* Role Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-role-name" className="text-xs font-semibold">
                  Role Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-role-name"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  placeholder="e.g. Senior Floor Coach, Head of Sales"
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>

              {/* Role Code / Identifier */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-role-code" className="text-xs font-semibold">
                    System Identifier / Code
                  </Label>
                  {editingRole.is_system && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lock className="size-2.5" /> Immutable for system roles
                    </span>
                  )}
                </div>
                <Input
                  id="edit-role-code"
                  value={editRoleCode}
                  onChange={(e) => setEditRoleCode(e.target.value)}
                  disabled={editingRole.is_system}
                  placeholder="e.g. COACH, HEAD_TRAINER"
                  className="h-8 text-xs font-mono bg-background disabled:opacity-60 disabled:bg-muted"
                />
              </div>

              {/* Scope Selection */}
              {(() => {
                const isOrgAdminRole = editingRole.code === "ORG_ADMIN" || editingRole.code === "tenant_admin";
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Clearance Scope</Label>
                      {isOrgAdminRole && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Lock className="size-2.5" /> Fixed for root Organization Administrator
                        </span>
                      )}
                    </div>
                    {isOrgAdminRole ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs">
                        <span className="font-medium text-foreground">
                          Organization-Wide Scope (All Branches Clearance)
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          ORG
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={editRoleScope}
                        onValueChange={(val: "ORG" | "BRANCH") => setEditRoleScope(val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Select Scope" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="ORG">
                            Organization-Wide Scope (All Branches Clearance)
                          </SelectItem>
                          <SelectItem value="BRANCH">
                            Branch Scope (Single Location Clearance)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Organization-scoped roles grant access across all branches. Branch-scoped roles restrict staff to designated facilities.
                    </p>
                  </div>
                );
              })()}

              {/* Department (if departments exist) */}
              {departments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Department Assignment (Optional)</Label>
                  <Select
                    value={editRoleDepartmentId}
                    onValueChange={setEditRoleDepartmentId}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="No Department" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="none">No Department (General)</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-role-desc" className="text-xs font-semibold">
                  Description & Operational Duties
                </Label>
                <textarea
                  id="edit-role-desc"
                  value={editRoleDescription}
                  onChange={(e) => setEditRoleDescription(e.target.value)}
                  placeholder="Outline this role's operational duties, staff privileges, and responsibility bounds..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Active Toggle for Custom Roles */}
              {!editingRole.is_system && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Role Active Status
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Deactivated roles cannot be assigned to new staff members.
                    </span>
                  </div>
                  <Switch
                    checked={editRoleIsActive}
                    onCheckedChange={setEditRoleIsActive}
                  />
                </div>
              )}

              {/* Granular Permissions Shortcut Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-3.5 text-primary" />
                  <span className="text-[11px] text-muted-foreground">
                    Looking to configure module capabilities?
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const r = editingRole;
                    setEditModalOpen(false);
                    if (r) handleOpenPermsModal(r);
                  }}
                  className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                >
                  Manage Permissions →
                </Button>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingEdit}
                  className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="size-3 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3" /> Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Custom Role Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Create Tenant Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a job role with organization-wide or branch-scoped clearance.
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
                <Label className="text-xs font-semibold">Role Code</Label>
                <Input
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g. senior_pilates_coach"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Authorization Scope</Label>
                <Select
                  value={newRoleScope}
                  onValueChange={(v: "ORG" | "BRANCH") => setNewRoleScope(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ORG">Organization (All Branches)</SelectItem>
                    <SelectItem value="BRANCH">Branch (Single Location)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Copy Permissions From Role</Label>
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
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingRole}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {creatingRole ? "Creating Role..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Permission Editor Modal */}
      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                <span>Configure Permissions: {activeRoleForPerms?.name}</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {activeRoleForPerms?.scope} Scope
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Toggle specific module access and action-level capabilities for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
            {Object.entries(permissionsByModule).map(([modName, submods]) => (
              <div key={modName} className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="bg-muted/40 px-3.5 py-2.5 flex items-center justify-between border-b border-border">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                    {modName}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allModPermIds = Object.values(submods)
                          .flat()
                          .map((p) => p.id);
                        setSelectedPermIds((prev) => {
                          const next = new Set(prev);
                          allModPermIds.forEach((id) => next.add(id));
                          return next;
                        });
                      }}
                      className="h-6 px-2 text-[10px] font-semibold text-primary"
                    >
                      Grant Module
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allModPermIds = Object.values(submods)
                          .flat()
                          .map((p) => p.id);
                        setSelectedPermIds((prev) => {
                          const next = new Set(prev);
                          allModPermIds.forEach((id) => next.delete(id));
                          return next;
                        });
                      }}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>

                <div className="p-3 space-y-3">
                  {Object.entries(submods).map(([submodName, perms]) => (
                    <div key={submodName} className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground border-b border-border/40 pb-1">
                        {submodName}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {perms.map((p) => {
                          const isChecked = selectedPermIds.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedPermIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(p.id)) next.delete(p.id);
                                    else next.add(p.id);
                                    return next;
                                  });
                                }}
                                className="mt-0.5 rounded border-border text-primary size-3.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold truncate">
                                  {getFriendlyPermissionLabel(p)}
                                </div>
                                <div className="font-mono text-[9.5px] text-muted-foreground truncate">
                                  {getFriendlyPermissionCode(p)}
                                </div>
                                {p.description && (
                                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {p.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {selectedPermIds.size} capabilities granted
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={savingPerms}
                  onClick={handleSaveRolePermissions}
                  className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingPerms ? "Saving..." : "Save Role Permissions"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role to User Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="size-4 text-primary" /> Assign Role: {activeRoleForAssign?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a staff member from your gym to grant this role and its capabilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignRoleToUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Staff Member *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-56">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="font-semibold">{u.full_name || u.email}</span>
                      <span className="text-muted-foreground ml-1.5 text-[10px]">
                        (Current: {u.role || "Staff"})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={assigningUser || !selectedUserId}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {assigningUser ? "Assigning..." : "Assign Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
