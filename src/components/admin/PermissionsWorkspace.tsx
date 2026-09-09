import * as React from "react";
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Save,
  RefreshCw,
  Search,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  TableProperties,
  Copy,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  fetchRolesApi,
  fetchPermissionsApi,
  updateRolePermissionsApi,
  type RoleDefRow,
  type PermissionDefRow,
} from "@/services/api-admin";

export function PermissionsWorkspace() {
  const [roles, setRoles] = React.useState<RoleDefRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionDefRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // View Mode: 'matrix' (Full Spreadsheet Matrix - default) vs 'focused' (Role Configurator)
  const [viewMode, setViewMode] = React.useState<"matrix" | "focused">("matrix");

  // Selected Role in Focused View
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");

  // Filters
  const [search, setSearch] = React.useState("");
  const [roleSearch, setRoleSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");

  // Matrix state: roleId -> Set of granted permissionIds
  const [matrix, setMatrix] = React.useState<Record<string, Set<string>>>({});
  const [initialMatrix, setInitialMatrix] = React.useState<Record<string, Set<string>>>({});

  // Module collapse state for matrix view
  const [collapsedModules, setCollapsedModules] = React.useState<Record<string, boolean>>({});

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedPerms] = await Promise.all([
        fetchRolesApi(),
        fetchPermissionsApi(),
      ]);

      setRoles(fetchedRoles);
      setPermissions(fetchedPerms);

      // Build matrix state
      const initialMap: Record<string, Set<string>> = {};
      fetchedRoles.forEach((r) => {
        const grantedSet = new Set<string>();
        if (r.permissions && Array.isArray(r.permissions)) {
          r.permissions.forEach((pMapping: any) => {
            if (pMapping.granted && pMapping.permission?.id) {
              grantedSet.add(pMapping.permission.id);
            }
          });
        }
        initialMap[r.id] = grantedSet;
      });

      setMatrix(initialMap);
      setInitialMatrix(initialMap);
      setHasChanges(false);

      // Set default selected role
      if (fetchedRoles.length > 0 && !selectedRoleId) {
        // Default to Studio Owner/Admin or first non-superadmin role
        const defaultRole = fetchedRoles.find((r) => r.code === "admin") || fetchedRoles[0];
        setSelectedRoleId(defaultRole.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load permissions and roles matrix.");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Role Object
  const selectedRole = React.useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  const isSuperAdmin = selectedRole?.code === "super_admin";

  // Toggle single permission for a role
  const togglePermission = (roleId: string, permId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.code === "super_admin") {
      toast.info("Super Admin holds unrestricted wildcard capabilities across all platform modules.");
      return;
    }

    setMatrix((prev) => {
      const current = new Set(prev[roleId] || []);
      if (current.has(permId)) {
        current.delete(permId);
      } else {
        current.add(permId);
      }
      return { ...prev, [roleId]: current };
    });
    setHasChanges(true);
  };

  // Toggle all permissions in a module for the current role
  const toggleModuleForRole = (modulePerms: PermissionDefRow[], roleId: string, grant: boolean) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.code === "super_admin") return;

    setMatrix((prev) => {
      const current = new Set(prev[roleId] || []);
      modulePerms.forEach((p) => {
        if (grant) {
          current.add(p.id);
        } else {
          current.delete(p.id);
        }
      });
      return { ...prev, [roleId]: current };
    });
    setHasChanges(true);
  };

  // Grant all capabilities for selected role
  const handleGrantAll = () => {
    if (!selectedRole || selectedRole.code === "super_admin") return;
    setMatrix((prev) => {
      const allPermIds = new Set(permissions.map((p) => p.id));
      return { ...prev, [selectedRole.id]: allPermIds };
    });
    setHasChanges(true);
    toast.success(`Granted all ${permissions.length} capabilities to ${selectedRole.name}.`);
  };

  // Revoke all capabilities for selected role
  const handleRevokeAll = () => {
    if (!selectedRole || selectedRole.code === "super_admin") return;
    setMatrix((prev) => {
      return { ...prev, [selectedRole.id]: new Set() };
    });
    setHasChanges(true);
    toast.info(`Revoked all capabilities for ${selectedRole.name}.`);
  };

  // Clone permissions from another role
  const handleCopyFromRole = (sourceRoleId: string) => {
    if (!selectedRole || selectedRole.code === "super_admin") return;
    const sourcePerms = matrix[sourceRoleId] || new Set();
    setMatrix((prev) => ({
      ...prev,
      [selectedRole.id]: new Set(sourcePerms),
    }));
    setHasChanges(true);
    const sourceRoleName = roles.find((r) => r.id === sourceRoleId)?.name || "role";
    toast.success(`Copied permissions from "${sourceRoleName}" to "${selectedRole.name}".`);
  };

  // Save changes to database
  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = roles.map((role) => {
        if (role.code === "super_admin") return Promise.resolve();
        const grantedPerms = matrix[role.id] || new Set();
        const payload = permissions.map((p) => ({
          permission_id: p.id,
          granted: grantedPerms.has(p.id),
        }));
        return updateRolePermissionsApi(role.id, payload);
      });

      await Promise.all(promises);
      toast.success("Permission rules saved to database successfully.");
      setInitialMatrix(matrix);
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save permission changes.");
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by Module
  const groupedPermissions = React.useMemo(() => {
    const groups: Record<string, PermissionDefRow[]> = {};
    permissions.forEach((perm) => {
      const matchesSearch =
        perm.label.toLowerCase().includes(search.toLowerCase()) ||
        perm.id.toLowerCase().includes(search.toLowerCase()) ||
        perm.module.toLowerCase().includes(search.toLowerCase()) ||
        perm.description.toLowerCase().includes(search.toLowerCase());

      const matchesModule = moduleFilter === "all" || perm.module === moduleFilter;

      if (matchesSearch && matchesModule) {
        if (!groups[perm.module]) {
          groups[perm.module] = [];
        }
        groups[perm.module].push(perm);
      }
    });
    return groups;
  }, [permissions, search, moduleFilter]);

  const uniqueModules = React.useMemo(() => {
    return Array.from(new Set(permissions.map((p) => p.module))).sort();
  }, [permissions]);

  // Filtered Roles List for Left Sidebar
  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) =>
      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.code.toLowerCase().includes(roleSearch.toLowerCase())
    );
  }, [roles, roleSearch]);

  const platformRoles = filteredRoles.filter((r) => r.scope === "platform");
  const tenantRoles = filteredRoles.filter((r) => r.scope !== "platform");

  return (
    <>
      <PageHeader
        title="Role Permissions & Access Control"
        subtitle="Easily manage what each role can see, edit, and operate across all system modules."
        actions={
          <div className="flex items-center gap-2">
            {/* View Switcher: Easy Role-Centric vs Full Matrix */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
              <Button
                variant={viewMode === "focused" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("focused")}
                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer ${
                  viewMode === "focused" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                <SlidersHorizontal className="size-3.5" />
                Role Editor
              </Button>
              <Button
                variant={viewMode === "matrix" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("matrix")}
                className={`h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer ${
                  viewMode === "matrix" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                <TableProperties className="size-3.5" />
                Comparison Matrix
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading || saving}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Reset
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`gap-1.5 text-xs font-semibold shadow-xs ${
                hasChanges
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse cursor-pointer"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Save className={`size-3.5 ${saving ? "animate-spin" : ""}`} />
              {saving ? "Saving..." : hasChanges ? "Save Permissions" : "Saved"}
            </Button>
          </div>
        }
      />

      <PageBody>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-primary" />
          </div>
        ) : viewMode === "focused" ? (
          /* ========================================================================= */
          /* 1. EASY & USER-FRIENDLY ROLE EDITOR (Select Role on Left, Configure on Right) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── LEFT COLUMN: Role Selector ── */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="bg-card p-3 rounded-xl border border-border flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="size-4 text-primary" /> Select Role to Configure
                  </div>
                  <span className="text-[10.5px] font-semibold text-muted-foreground">
                    {roles.length} Roles
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Filter roles..."
                    className="h-7.5 pl-8 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Roles List */}
              <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {/* Platform Roles */}
                {platformRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Platform Roles (Super Admin / Global)
                    </div>
                    {platformRoles.map((role) => {
                      const isSelected = selectedRole?.id === role.id;
                      const isSuper = role.code === "super_admin";
                      const grantedCount = isSuper
                        ? permissions.length
                        : (matrix[role.id]?.size || 0);

                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRoleId(role.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30 text-foreground"
                              : "bg-card border-border hover:border-primary/40 text-foreground"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span className="truncate">{role.name}</span>
                              {isSuper && <Lock className="size-3 text-amber-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                              {role.code}
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <Badge
                              variant="outline"
                              className="text-[9.5px] font-bold bg-purple-500/10 text-purple-600 border-purple-500/30 uppercase px-1.5 py-0"
                            >
                              Platform
                            </Badge>
                            <span className="text-[10.5px] font-medium text-muted-foreground">
                              {grantedCount}/{permissions.length} allowed
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tenant Roles */}
                {tenantRoles.length > 0 && (
                  <div className="space-y-1.5 mt-1">
                    <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Tenant / Gym Roles (Staff & Trainers)
                    </div>
                    {tenantRoles.map((role) => {
                      const isSelected = selectedRole?.id === role.id;
                      const grantedCount = matrix[role.id]?.size || 0;

                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRoleId(role.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30 text-foreground"
                              : "bg-card border-border hover:border-primary/40 text-foreground"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold truncate">{role.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                              {role.code}
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <Badge
                              variant="outline"
                              className="text-[9.5px] font-bold bg-teal-500/10 text-teal-600 border-teal-500/30 uppercase px-1.5 py-0"
                            >
                              Tenant
                            </Badge>
                            <span className="text-[10.5px] font-medium text-muted-foreground">
                              {grantedCount}/{permissions.length} allowed
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Selected Role Permissions Inspector ── */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Role Header Banner */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-foreground">
                          {selectedRole?.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {selectedRole?.code}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase py-0"
                          >
                            {selectedRole?.scope} Scope
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric */}
                  <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/80 shrink-0">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      {isSuperAdmin ? permissions.length : (matrix[selectedRole?.id]?.size || 0)} of {permissions.length} Capabilities Allowed
                    </span>
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
                  <p className="text-muted-foreground text-[11.5px] line-clamp-1 max-w-sm">
                    {selectedRole?.description || "Configure which features this role can access."}
                  </p>

                  {!isSuperAdmin ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGrantAll}
                        className="h-7 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <CheckSquare className="size-3 mr-1" /> Grant All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRevokeAll}
                        className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Square className="size-3 mr-1" /> Revoke All
                      </Button>

                      {/* Clone Dropdown */}
                      <Select onValueChange={handleCopyFromRole}>
                        <SelectTrigger className="h-7 text-[11px] w-36 bg-background">
                          <Copy className="size-3 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="Copy from..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {roles
                            .filter((r) => r.id !== selectedRole?.id)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                Copy: {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                      <Lock className="size-3" /> Unrestricted Root Clearance
                    </span>
                  )}
                </div>
              </div>

              {/* Module Filter & Capability Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search capabilities (e.g. leads, invoice, schedule)..."
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>

                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="h-8 text-xs w-44 bg-background">
                    <SelectValue placeholder="Module Filter" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All Modules ({permissions.length})</SelectItem>
                    {uniqueModules.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} Module
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Module Cards with Friendly Toggles */}
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                  const allGranted =
                    !isSuperAdmin &&
                    perms.every((p) => matrix[selectedRole?.id]?.has(p.id));
                  const someGranted =
                    !isSuperAdmin &&
                    perms.some((p) => matrix[selectedRole?.id]?.has(p.id));

                  return (
                    <div
                      key={moduleName}
                      className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs"
                    >
                      {/* Module Card Header */}
                      <div className="bg-muted/40 p-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {moduleName} Module
                          </span>
                          <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                            {perms.length} {perms.length === 1 ? "action" : "actions"}
                          </span>
                        </div>

                        {!isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                toggleModuleForRole(perms, selectedRole.id, !allGranted)
                              }
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              {allGranted ? "Disable Module" : "Enable All in Module"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Capabilities Rows */}
                      <div className="divide-y divide-border/60">
                        {perms.map((perm) => {
                          const isGranted =
                            isSuperAdmin || (matrix[selectedRole?.id]?.has(perm.id) ?? false);

                          return (
                            <div
                              key={perm.id}
                              onClick={() => {
                                if (!isSuperAdmin) togglePermission(selectedRole.id, perm.id);
                              }}
                              className={`p-3 sm:px-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                                isGranted ? "bg-emerald-500/[0.03]" : "hover:bg-muted/30"
                              } ${isSuperAdmin ? "cursor-not-allowed" : ""}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {perm.label}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                    {perm.id}
                                  </span>
                                  {perm.scope === "platform" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30 uppercase"
                                    >
                                      Platform
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-normal">
                                  {perm.description || `Allow users with this role to ${perm.action} ${perm.module}.`}
                                </p>
                              </div>

                              {/* Toggle Button / Status */}
                              <div className="shrink-0 flex items-center gap-2">
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all select-none ${
                                    isGranted
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"
                                      : "bg-muted text-muted-foreground border-border flex items-center gap-1 opacity-70"
                                  }`}
                                >
                                  {isGranted ? (
                                    <>
                                      <Check className="size-3.5 stroke-[2.5]" /> Granted
                                    </>
                                  ) : (
                                    <>
                                      <X className="size-3.5" /> Denied
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. FULL COMPARISON MATRIX SPREADSHEET (Secondary View) */
          /* ========================================================================= */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search capabilities across all roles..."
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="h-8 text-xs w-44 bg-background">
                  <SelectValue placeholder="Module Filter" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Modules ({permissions.length})</SelectItem>
                  {uniqueModules.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-muted text-xs">
                      <th className="py-3 px-4 font-bold text-foreground w-[320px] min-w-[320px] sticky left-0 bg-muted z-20 shadow-[1px_0_0_0_hsl(var(--border))]">
                        Capability
                      </th>
                      {roles.map((role) => (
                        <th key={role.id} className="py-3 px-3 text-center min-w-[120px]">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-xs text-foreground truncate max-w-[110px]" title={role.name}>
                              {role.name}
                            </span>
                            <span className="font-mono text-[9.5px] text-muted-foreground uppercase tracking-wider mt-0.5">
                              {role.scope}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60 text-xs">
                    {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                      <React.Fragment key={moduleName}>
                        <tr className="bg-muted/60 font-bold border-t border-b border-border/80">
                          <td colSpan={roles.length + 1} className="py-2 px-4 bg-muted/60">
                            <div className="sticky left-4 inline-flex items-center gap-2">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                {moduleName} Module
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border">
                                {perms.length} {perms.length === 1 ? "Action" : "Actions"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {perms.map((perm) => (
                          <tr key={perm.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 w-[320px] min-w-[320px] sticky left-0 bg-card z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                              <div className="font-semibold text-foreground text-xs">{perm.label}</div>
                              <div className="text-[10.5px] text-muted-foreground font-mono">{perm.id}</div>
                            </td>

                            {roles.map((role) => {
                              const isSuper = role.code === "super_admin";
                              const isGranted = isSuper || (matrix[role.id]?.has(perm.id) ?? false);

                              return (
                                <td key={role.id} className="py-2 px-3 text-center align-middle">
                                  <button
                                    type="button"
                                    disabled={isSuper}
                                    onClick={() => togglePermission(role.id, perm.id)}
                                    className={`size-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                                      isGranted
                                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                                        : "bg-muted/40 text-muted-foreground/40 border border-border hover:bg-muted/80"
                                    } ${isSuper ? "opacity-80 cursor-not-allowed" : ""}`}
                                    title={
                                      isSuper
                                        ? "Super Admin holds permanent clearance"
                                        : `${isGranted ? "Revoke" : "Grant"} ${perm.label} for ${role.name}`
                                    }
                                  >
                                    {isGranted ? <Check className="size-4 stroke-[2.5]" /> : <X className="size-3.5" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
