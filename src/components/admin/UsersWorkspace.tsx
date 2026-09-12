import * as React from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Lock,
  Building2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

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
  fetchUsersApi,
  toggleUserActiveApi,
  inviteUserApi,
  updateUserApi,
  deleteUserApi,
  fetchRolesApi,
  fetchLocationsApi,
  fetchTenantsForDropdownApi,
  type AdminUserRow,
  type RoleDefRow,
  type LocationRow,
} from "@/services/api-admin";
import { useAuth } from "@/contexts";

export const isPlatformAccount = (
  u: { tenant_id?: string; role?: string; tenant_name?: string } | null | undefined
): boolean => {
  if (!u) return false;
  return (
    !u.tenant_id ||
    u.role === "Super Admin" ||
    u.role === "Platform Administrator" ||
    (typeof u.role === "string" && u.role.toLowerCase().includes("platform")) ||
    u.tenant_name === "Global Platform HQ"
  );
};

export const isPlatformRole = (r: RoleDefRow | { name: string; scope?: string }): boolean => {
  return (
    r.scope?.toLowerCase() === "platform" ||
    r.name === "Super Admin" ||
    r.name.toLowerCase().includes("platform")
  );
};

export function UsersWorkspace() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin =
    !!currentUser?.isSuperAdmin || currentUser?.role === "Super Admin" || !currentUser?.tenantId;

  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleDefRow[]>([]);
  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("all");

  // User Creation & Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [userScope, setUserScope] = React.useState<"tenant" | "platform">("tenant");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteFirstName, setInviteFirstName] = React.useState("");
  const [inviteLastName, setInviteLastName] = React.useState("");
  const [invitePhone, setInvitePhone] = React.useState("");
  const [invitePassword, setInvitePassword] = React.useState("Pass1234!");
  const [useCustomPassword, setUseCustomPassword] = React.useState(true);
  const [inviteRole, setInviteRole] = React.useState("");
  const [inviteTenantId, setInviteTenantId] = React.useState("");
  const [inviteLocationIds, setInviteLocationIds] = React.useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);

  // Available roles filtered by selected scope
  const availableRolesForScope = React.useMemo(() => {
    if (userScope === "platform") {
      return roles.filter(isPlatformRole);
    }
    return roles.filter((r) => !isPlatformRole(r));
  }, [roles, userScope]);

  // Keep inviteRole in sync when scope switches
  React.useEffect(() => {
    if (availableRolesForScope.length > 0) {
      if (!availableRolesForScope.some((r) => r.name === inviteRole)) {
        setInviteRole(availableRolesForScope[0].name);
      }
    }
  }, [userScope, availableRolesForScope, inviteRole]);

  // Edit User Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUserRow | null>(null);
  const [editRole, setEditRole] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"Active" | "Inactive" | "Invited" | "Suspended">("Active");
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Available roles for edit modal, filtered by the user's scope
  const editAvailableRoles = React.useMemo(() => {
    if (!editingUser) return roles;
    const isPlat = isPlatformAccount(editingUser);
    return roles.filter((r) => (isPlat ? isPlatformRole(r) : !isPlatformRole(r)));
  }, [editingUser, roles]);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedRoles, fetchedLocations, fetchedTenants] =
        await Promise.all([
          fetchUsersApi(
            roleFilter === "all" ? undefined : roleFilter,
            undefined,
            undefined,
            selectedTenantId === "all" ? undefined : selectedTenantId
          ),
          fetchRolesApi(selectedTenantId === "all" ? undefined : selectedTenantId),
          fetchLocationsApi(selectedTenantId === "all" ? undefined : selectedTenantId),
          isSuperAdmin ? fetchTenantsForDropdownApi() : Promise.resolve([]),
        ]);

      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      setLocations(fetchedLocations);
      setTenants(fetchedTenants);

      if (fetchedRoles.length > 0 && !inviteRole) {
        setInviteRole(fetchedRoles[0].name);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load staff users and roles");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, selectedTenantId, inviteRole, isSuperAdmin]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Toggle Active
  const handleToggleActive = async (user: AdminUserRow) => {
    if (user.id === "USR-ADMIN" || user.email === "admin") {
      toast.error("Root Super Admin account cannot be deactivated.");
      return;
    }
    try {
      await toggleUserActiveApi(user.id);
      toast.success(`Status updated for ${user.full_name || user.email}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user status");
    }
  };

  // Handle Create / Invite User
  const handleCreateOrInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFirstName) {
      toast.error("Please provide email and first name");
      return;
    }
    if (userScope === "tenant" && isSuperAdmin && !inviteTenantId && tenants.length > 0) {
      toast.error("Please select a target tenant organization for this tenant staff member");
      return;
    }
    setInviteSubmitting(true);
    try {
      const targetRole = inviteRole || (availableRolesForScope.length > 0 ? availableRolesForScope[0].name : "Trainer");
      await inviteUserApi({
        email: inviteEmail.trim(),
        first_name: inviteFirstName.trim(),
        last_name: inviteLastName.trim(),
        phone: invitePhone.trim(),
        role: targetRole,
        password: useCustomPassword && invitePassword.trim() ? invitePassword.trim() : undefined,
        tenant_id: userScope === "platform" ? undefined : (isSuperAdmin && inviteTenantId ? inviteTenantId : currentUser?.tenantId || undefined),
        location_ids: inviteLocationIds.length > 0 ? inviteLocationIds : undefined,
      });

      toast.success(
        useCustomPassword && invitePassword.trim()
          ? `User ${inviteEmail} created with password and active credentials!`
          : `Invitation dispatched to ${inviteEmail}`
      );
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInvitePhone("");
      setInvitePassword("Pass1234!");
      setInviteLocationIds([]);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create user");
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Open Edit User
  const handleOpenEdit = (user: AdminUserRow) => {
    setEditingUser(user);
    setEditRole(user.role || "Trainer");
    setEditStatus(user.status || "Active");
    setEditModalOpen(true);
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSubmitting(true);
    try {
      await updateUserApi(editingUser.id, {
        role: editRole,
        status: editStatus,
        is_active: editStatus === "Active",
      });
      toast.success(`Updated role and status for ${editingUser.full_name}`);
      setEditModalOpen(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: AdminUserRow) => {
    if (user.id === "USR-ADMIN" || user.email === "admin") {
      toast.error("Root Super Admin cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to remove user "${user.full_name || user.email}"?`)) return;

    try {
      await deleteUserApi(user.id);
      toast.success(`User "${user.email}" removed.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove user");
    }
  };

  const [scopeFilter, setScopeFilter] = React.useState<"all" | "platform" | "tenant">("all");

  const platformUsersCount = React.useMemo(() => {
    return users.filter(isPlatformAccount).length;
  }, [users]);

  const tenantUsersCount = users.length - platformUsersCount;

  // Available roles for filter dropdown (filtered by selected scope tab)
  const availableRolesForFilter = React.useMemo(() => {
    if (scopeFilter === "platform") {
      return roles.filter(isPlatformRole);
    }
    if (scopeFilter === "tenant") {
      return roles.filter((r) => !isPlatformRole(r));
    }
    return roles;
  }, [roles, scopeFilter]);

  // Reset role filter if current selection is not available in new scope
  React.useEffect(() => {
    if (roleFilter !== "all" && !availableRolesForFilter.some((r) => r.name === roleFilter)) {
      setRoleFilter("all");
    }
  }, [scopeFilter, availableRolesForFilter, roleFilter]);

  // Filtered Users List
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const isPlatformUser = isPlatformAccount(u);
      if (scopeFilter === "platform" && !isPlatformUser) return false;
      if (scopeFilter === "tenant" && isPlatformUser) return false;

      const nameStr = `${u.first_name || ""} ${u.last_name || ""} ${u.full_name || ""}`.toLowerCase();
      const matchesSearch =
        nameStr.includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search)) ||
        (u.role && u.role.toLowerCase().includes(search.toLowerCase())) ||
        (u.tenant_name && u.tenant_name.toLowerCase().includes(search.toLowerCase()));

      const matchesRole =
        roleFilter === "all" || u.role === roleFilter || u.role_name === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter, scopeFilter]);

  const pendingCount = users.filter((u) => u.status === "Invited").length;

  return (
    <>
      <PageHeader
        title="Staff & User Management"
        subtitle="Manage team accounts, platform administrators, tenant staff clearances, and branch assignments."
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
              onClick={() => {
                if (!inviteTenantId && tenants.length > 0) setInviteTenantId(tenants[0].id);
                setInviteModalOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              Add / Invite User
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Total Registered Users"
            value={users.length}
            change="All Platform & Tenant Accounts"
            variant="neutral"
          />
          <KpiTile
            title="🌐 SaaS Platform Admins"
            value={platformUsersCount}
            change="Global Cross-Tenant HQ"
            variant="positive"
          />
          <KpiTile
            title="🏢 Tenant Gym Staff"
            value={tenantUsersCount}
            change="Gym Owners, Managers & Coaches"
            variant="neutral"
          />
          <KpiTile
            title="Invited / Pending"
            value={pendingCount}
            change="Awaiting Activation"
            variant={pendingCount > 0 ? "warning" : "neutral"}
          />
        </div>

        {/* Scope Segmentation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border w-fit text-xs">
          <button
            type="button"
            onClick={() => setScopeFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              scopeFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter("platform")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              scopeFilter === "platform"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            🌐 SaaS Platform HQ ({platformUsersCount})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter("tenant")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              scopeFilter === "tenant"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-primary hover:bg-primary/10"
            }`}
          >
            <Building2 className="size-3.5" />
            🏢 Tenant Gym Staff ({tenantUsersCount})
          </button>
        </div>

        {/* Filters and Scope Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role, or studio..."
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

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-background">
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Roles</SelectItem>
                {availableRolesForFilter.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-card">
            <Users className="size-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No accounts found</p>
            <p className="text-xs text-muted-foreground mt-1">Try switching tabs or adjusting your search</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 font-bold text-foreground">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role & Scope</th>
                    <th className="py-3 px-4">Tenant / Organization</th>
                    <th className="py-3 px-4">Active Studio</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const isRootSuperAdmin = u.id === "USR-ADMIN" || u.email === "admin";
                    const isSuper = isPlatformAccount(u);
                    const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 font-bold text-white shadow-2xs text-xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span className="truncate">{u.full_name || u.email}</span>
                                {isRootSuperAdmin && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  >
                                    <Lock className="size-2.5 mr-0.5 inline" /> Root
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">
                                {u.email} {u.phone ? `· ${u.phone}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Scope */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                isSuper
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              {isSuper ? (
                                <>
                                  <ShieldCheck className="size-3 mr-1 inline" /> 🌐 Platform · {u.role}
                                </>
                              ) : (
                                <>
                                  <Building2 className="size-3 mr-1 inline" /> 🏢 Tenant · {u.role}
                                </>
                              )}
                            </Badge>
                          </div>
                        </td>

                        {/* Tenant */}
                        <td className="py-3 px-4">
                          {isSuper ? (
                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                              <ShieldCheck className="size-3.5 shrink-0" />
                              <span>Global Platform HQ</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                              <Building2 className="size-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[150px]">{u.tenant_name || "Assigned Gym"}</span>
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="size-3.5 text-primary shrink-0" />
                            <span>{isSuper ? "All Locations (Global)" : (u.active_location_name || "Main Studio / All")}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {u.status === "Active" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" /> Active
                            </span>
                          ) : u.status === "Invited" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              <Clock className="size-3" /> Invited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <XCircle className="size-3" /> Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(u)}
                              className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <Edit2 className="size-3 mr-1" /> Edit
                            </Button>

                            {!isRootSuperAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(u)}
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(u)}
                                  className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Delete user"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageBody>

      {/* Add / Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Add & Allot User Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provision a new user account, assign Platform or Tenant scope, set login credentials, and allot roles and permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrInviteUser} className="space-y-4 pt-2">
            {/* Scope Selection */}
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">User Type & Clearance Scope</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserScope("tenant");
                      if (!inviteTenantId && tenants.length > 0) setInviteTenantId(tenants[0].id);
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      userScope === "tenant"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="size-3.5" /> Tenant Staff
                    </span>
                    <span className="text-[11px] font-normal opacity-80 mt-0.5">
                      Single gym organization (Owner, Manager, Trainer, Sales)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserScope("platform");
                      setInviteTenantId("");
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      userScope === "platform"
                        ? "border-purple-500 bg-purple-500/5 text-purple-600 font-bold shadow-xs"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Platform Staff
                    </span>
                    <span className="text-[11px] font-normal opacity-80 mt-0.5">
                      Global cross-tenant clearance (Super Admin, Support, Auditor)
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* If Tenant: select tenant & studio */}
            {userScope === "tenant" && isSuperAdmin && tenants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Tenant Organization *</Label>
                <Select value={inviteTenantId} onValueChange={setInviteTenantId}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select gym organization" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {userScope === "platform" && (
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0" />
                <span>
                  This account will have <strong>Global Platform clearance</strong> across all gym tenants and staff workspaces, with access to both PerformanceOS and the Django Admin Panel.
                </span>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@fitnesshub.com"
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Role Assignment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Allotted Role *</Label>
                <a
                  href="/admin/roles"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Configure Permissions Matrix <ArrowUpRight className="size-3" />
                </a>
              </div>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-56">
                  {availableRolesForScope.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      <span className="font-semibold">{r.name}</span>
                      {r.description ? <span className="text-muted-foreground ml-1.5 text-[10px]">— {r.description}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password & Direct Login Activation */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-password-toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary" /> Set Login Password & Activate
                </Label>
                <input
                  type="checkbox"
                  id="use-password-toggle"
                  checked={useCustomPassword}
                  onChange={(e) => setUseCustomPassword(e.target.checked)}
                  className="rounded border-border text-primary size-4 cursor-pointer"
                />
              </div>
              {useCustomPassword ? (
                <div className="space-y-1 pt-1">
                  <Input
                    type="text"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Enter initial password (e.g. Pass1234!)"
                    className="h-8 text-xs font-mono bg-background"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Account will be created as <strong>Active</strong> immediately. The user can sign in right away to PerformanceOS and Django Admin with this password.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  User will be marked as <strong>Invited</strong> with a secure temporary key until email activation.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={inviteSubmitting}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {inviteSubmitting
                  ? "Creating Account..."
                  : useCustomPassword
                    ? "Create User Account"
                    : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-primary" /> Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update role assignment and account authorization status.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-foreground truncate">
                    {editingUser.full_name || editingUser.email}
                  </div>
                  {isPlatformAccount(editingUser) ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 border-purple-500/30 shrink-0">
                      <ShieldCheck className="size-3 mr-1 inline" /> 🌐 Platform HQ
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 shrink-0">
                      <Building2 className="size-3 mr-1 inline" /> 🏢 {editingUser.tenant_name || "Tenant Staff"}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {editingUser.email}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assigned Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    {editAvailableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        <span className="font-semibold">{r.name}</span>
                        {r.description ? <span className="text-muted-foreground ml-1.5 text-[10px]">— {r.description}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Account Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v: "Active" | "Inactive" | "Invited" | "Suspended") =>
                    setEditStatus(v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editSubmitting}
                  className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
