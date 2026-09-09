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

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteFirstName, setInviteFirstName] = React.useState("");
  const [inviteLastName, setInviteLastName] = React.useState("");
  const [invitePhone, setInvitePhone] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("");
  const [inviteTenantId, setInviteTenantId] = React.useState("");
  const [inviteLocationIds, setInviteLocationIds] = React.useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);

  // Edit User Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUserRow | null>(null);
  const [editRole, setEditRole] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"Active" | "Inactive" | "Invited" | "Suspended">("Active");
  const [editSubmitting, setEditSubmitting] = React.useState(false);

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

  // Handle Invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFirstName) {
      toast.error("Please provide email and first name");
      return;
    }
    setInviteSubmitting(true);
    try {
      const targetRole = inviteRole || (roles.length > 0 ? roles[0].name : "Trainer");
      await inviteUserApi({
        email: inviteEmail.trim(),
        first_name: inviteFirstName.trim(),
        last_name: inviteLastName.trim(),
        phone: invitePhone.trim(),
        role: targetRole,
        tenant_id: isSuperAdmin && inviteTenantId ? inviteTenantId : currentUser?.tenantId || undefined,
        location_ids: inviteLocationIds.length > 0 ? inviteLocationIds : undefined,
      });

      toast.success(`Invitation dispatched to ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInvitePhone("");
      setInviteLocationIds([]);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to invite user");
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

  // Filtered Users List
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
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
  }, [users, search, roleFilter]);

  // Metrics
  const trainersCount = users.filter(
    (u) =>
      u.role?.toLowerCase().includes("trainer") ||
      u.role?.toLowerCase().includes("coach") ||
      u.role?.toLowerCase().includes("instructor")
  ).length;

  const managersCount = users.filter(
    (u) =>
      u.role?.toLowerCase().includes("manager") ||
      u.role?.toLowerCase().includes("owner") ||
      u.role?.toLowerCase().includes("admin")
  ).length;

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
              onClick={() => setInviteModalOpen(true)}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <UserPlus className="size-3.5" />
              Invite Team Member
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Total Staff Members"
            value={users.length}
            change="Across active organization scope"
            variant="neutral"
          />
          <KpiTile
            title="Coaches & Trainers"
            value={trainersCount}
            change="Personal Training & Group"
            variant="positive"
          />
          <KpiTile
            title="Studio Managers & Admins"
            value={managersCount}
            change="Branch & Operations"
            variant="neutral"
          />
          <KpiTile
            title="Invited / Pending"
            value={pendingCount}
            change="Awaiting Activation"
            variant={pendingCount > 0 ? "warning" : "neutral"}
          />
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
                {roles.map((r) => (
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
            <p className="text-sm font-semibold text-foreground">No staff members found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
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
                    const isSuper = u.role === "Super Admin" || !u.tenant_id;
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
                              {isSuper ? <ShieldCheck className="size-3 mr-1" /> : <Shield className="size-3 mr-1" />}
                              {u.role}
                            </Badge>
                          </div>
                        </td>

                        {/* Tenant */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="size-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate max-w-[150px]">
                              {u.tenant_name || "Global Platform HQ"}
                            </span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="size-3.5 text-primary shrink-0" />
                            <span>{u.active_location_name || "Main Studio / All"}</span>
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

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send an invitation email to onboard a new staff member or administrator.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@elevatefitness.com"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-8 text-xs"
              />
            </div>

            {isSuperAdmin && tenants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Tenant Organization</Label>
                <Select value={inviteTenantId} onValueChange={setInviteTenantId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select tenant for this user" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assigned Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name} ({r.scope})
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
                onClick={() => setInviteModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={inviteSubmitting}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {inviteSubmitting ? "Sending Invite..." : "Send Invitation"}
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
                <div className="text-xs font-bold text-foreground">
                  {editingUser.full_name || editingUser.email}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {editingUser.email}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assigned Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name} ({r.scope})
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
