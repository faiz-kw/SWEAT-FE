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
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
  fetchBranchesApi,
  fetchDepartmentsApi,
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

export function extractApiError(err: any, fallback: string = "Operation failed"): string {
  const data = err?.response?.data || err?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.message) return String(data.message);

  const fieldErrors: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const fieldLabel = key === "non_field_errors" ? "" : `${key.replace(/_/g, " ")}: `;
    if (Array.isArray(value)) {
      fieldErrors.push(`${fieldLabel}${value.join(", ")}`);
    } else if (typeof value === "string") {
      fieldErrors.push(`${fieldLabel}${value}`);
    } else if (typeof value === "object" && value !== null) {
      fieldErrors.push(`${fieldLabel}${JSON.stringify(value)}`);
    }
  }
  if (fieldErrors.length > 0) {
    return fieldErrors.join(" | ");
  }
  return err?.message || fallback;
}

export function UsersWorkspace() {
  const { user: currentUser } = useAuth();
  const isPlatformAdmin =
    currentUser?.userType === "platform" ||
    (!currentUser?.tenantId && (!!currentUser?.isSuperAdmin || currentUser?.role === "Super Admin"));

  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleDefRow[]>([]);
  const [branches, setBranches] = React.useState<{ id: string; name: string; code?: string }[]>([]);
  const [departments, setDepartments] = React.useState<{ id: string; name: string; code?: string }[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [branchFilter, setBranchFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("all");
  const [scopeFilter, setScopeFilter] = React.useState<"all" | "platform" | "tenant">("all");

  // User Creation & Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [userScope, setUserScope] = React.useState<"tenant" | "platform">(isPlatformAdmin ? "platform" : "tenant");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteFirstName, setInviteFirstName] = React.useState("");
  const [inviteLastName, setInviteLastName] = React.useState("");
  const [invitePhone, setInvitePhone] = React.useState("");
  const [invitePassword, setInvitePassword] = React.useState("");
  const [useCustomPassword, setUseCustomPassword] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [inviteRole, setInviteRole] = React.useState("");
  const [inviteDepartmentId, setInviteDepartmentId] = React.useState("");
  const [inviteBranchId, setInviteBranchId] = React.useState("");
  const [inviteTenantId, setInviteTenantId] = React.useState("");
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  // Edit User Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUserRow | null>(null);
  const [editRole, setEditRole] = React.useState("");
  const [editDepartmentId, setEditDepartmentId] = React.useState("");
  const [editBranchAccess, setEditBranchAccess] = React.useState<Record<string, boolean>>({});
  const [editStatus, setEditStatus] = React.useState<"Active" | "Inactive" | "Invited" | "Suspended">("Active");
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (isPlatformAdmin) {
        // Platform Mode: Fetch across platform and optionally all tenants
        const [fetchedUsers, fetchedRoles, fetchedLocations, fetchedTenants] = await Promise.all([
          fetchUsersApi(
            roleFilter === "all" ? undefined : roleFilter,
            undefined,
            undefined,
            selectedTenantId === "all" ? undefined : selectedTenantId
          ),
          fetchRolesApi(selectedTenantId === "all" ? undefined : selectedTenantId),
          fetchLocationsApi(selectedTenantId === "all" ? undefined : selectedTenantId),
          fetchTenantsForDropdownApi(),
        ]);

        setUsers(fetchedUsers);
        setRoles(fetchedRoles);
        setBranches(fetchedLocations);
        setTenants(fetchedTenants);
      } else {
        // Tenant Mode: Strictly fetch tenant users, tenant roles, tenant departments, and tenant branches
        const [fetchedUsers, fetchedRoles, fetchedBranches, fetchedDepts] = await Promise.all([
          fetchUsersApi(
            roleFilter === "all" ? undefined : roleFilter,
            branchFilter === "all" ? undefined : branchFilter,
            search ? search.trim() : undefined
          ),
          fetchRolesApi(),
          fetchBranchesApi(),
          fetchDepartmentsApi(),
        ]);

        setUsers(fetchedUsers);
        setRoles(fetchedRoles);
        setBranches(fetchedBranches);
        setDepartments(fetchedDepts);

        // Pre-select default staff role if none selected
        if (!inviteRole && fetchedRoles.length > 0) {
          const defaultRole =
            fetchedRoles.find((r) => r.code === "STAFF" || r.name.toLowerCase().includes("staff")) ||
            fetchedRoles[0];
          setInviteRole(defaultRole.id);
        }

        // Branch-scoped user: restrict branch selector if not org-wide
        if (currentUser?.isOrgWide === false && fetchedBranches.length > 0) {
          if (branchFilter === "all") {
            setBranchFilter(fetchedBranches[0].id);
          }
        }
      }
    } catch (err: any) {
      const msg = extractApiError(err, "Failed to load user records from database");
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, roleFilter, branchFilter, search, selectedTenantId, currentUser?.isOrgWide, inviteRole]);

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
      toast.error(extractApiError(err, "Failed to update user status"));
    }
  };

  // Handle Create / Invite User
  const handleCreateOrInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (!inviteEmail.trim() || !inviteFirstName.trim()) {
      const err = "Please provide email and first name";
      setInviteError(err);
      toast.error(err);
      return;
    }

    if (useCustomPassword && invitePassword.trim().length < 10) {
      const err = "Initial password must contain at least 10 characters.";
      setInviteError(err);
      toast.error(err);
      return;
    }

    if (useCustomPassword && invitePassword.trim().toLowerCase() === inviteEmail.trim().toLowerCase()) {
      const err = "Password cannot be identical to the email address. Please choose a secure password.";
      setInviteError(err);
      toast.error(err);
      return;
    }

    if (isPlatformAdmin && userScope === "tenant" && !inviteTenantId && tenants.length > 0) {
      const err = "Please select a target tenant organization for this tenant staff member";
      setInviteError(err);
      toast.error(err);
      return;
    }

    setInviteSubmitting(true);
    try {
      const selectedRoleObj = roles.find((r) => r.id === inviteRole || r.name === inviteRole) || roles[0];
      const targetRole = selectedRoleObj ? selectedRoleObj.name : inviteRole || "Staff";

      await inviteUserApi({
        email: inviteEmail.trim(),
        first_name: inviteFirstName.trim(),
        last_name: inviteLastName.trim(),
        phone: invitePhone.trim(),
        role: targetRole,
        role_id: selectedRoleObj?.id,
        department_id: inviteDepartmentId || undefined,
        location_ids: inviteBranchId ? [inviteBranchId] : undefined,
        password: useCustomPassword && invitePassword.trim() ? invitePassword.trim() : undefined,
        tenant_id: isPlatformAdmin && userScope === "tenant" ? inviteTenantId : undefined,
      });

      toast.success(
        useCustomPassword && invitePassword.trim()
          ? `User account ${inviteEmail} activated successfully with assigned credentials!`
          : `Invitation dispatched to ${inviteEmail}`
      );

      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInvitePhone("");
      setInvitePassword("");
      setUseCustomPassword(false);
      setShowPassword(false);
      setInviteDepartmentId("");
      setInviteBranchId("");
      setInviteError(null);
      loadData();
    } catch (err: any) {
      const msg = extractApiError(err, "Failed to create user");
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const branchAccessForRole = (user: AdminUserRow, roleId: string) => {
    const access: Record<string, boolean> = {};
    for (const entry of user.branch_access || []) {
      if (entry.role_id === roleId) access[entry.branch_id] = entry.enabled;
    }
    return access;
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: AdminUserRow) => {
    setEditingUser(user);
    const roleId = roles.find((role) => role.name === user.role || role.code === user.role)?.id || user.branch_access?.[0]?.role_id || "";
    setEditRole(roleId);
    setEditBranchAccess(branchAccessForRole(user, roleId));
    const status = String(user.status || (user.is_active ? "ACTIVE" : "INACTIVE")).toUpperCase();
    setEditStatus(status === "ACTIVE" ? "Active" : status === "INVITED" ? "Invited" : status === "SUSPENDED" ? "Suspended" : "Inactive");
    setEditDepartmentId("");
    setEditError(null);
    setEditModalOpen(true);
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await updateUserApi(editingUser.id, {
        ...(editRole ? { role_id: editRole } : {}),
        ...(editStatus.toUpperCase() !== String(editingUser.status).toUpperCase() ? { status: editStatus.toUpperCase() } : {}),
        is_active: editStatus === "Active",
        department_id: editDepartmentId || undefined,
        ...(roles.find((role) => role.id === editRole)?.scope === "BRANCH" ? {
          branch_access: branches.map((branch) => ({
            branch_id: branch.id, enabled: editBranchAccess[branch.id] === true,
          })),
        } : {}),
      });
      toast.success(`Updated role and status for ${editingUser.full_name || editingUser.email}`);
      setEditModalOpen(false);
      setEditingUser(null);
      setEditError(null);
      loadData();
    } catch (err: any) {
      const msg = extractApiError(err, "Failed to update user");
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Deactivate / Delete User
  const handleDeleteUser = async (user: AdminUserRow) => {
    if (user.id === "USR-ADMIN" || user.email === "admin") {
      toast.error("Root Super Admin cannot be deactivated.");
      return;
    }
    if (!confirm(`Are you sure you want to deactivate user "${user.full_name || user.email}"? Their active access will be revoked immediately while business and audit history is preserved.`)) return;

    try {
      await deleteUserApi(user.id);
      toast.success(`User "${user.email}" has been deactivated.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to deactivate user");
    }
  };

  // ── Metrics Calculation ──────────────────────────────────────────────────
  const totalUsersCount = users.length;
  const activeCount = users.filter((u) => u.is_active || u.status === "Active" || u.status === "ACTIVE").length;
  const inactiveCount = users.filter((u) => (!u.is_active && u.status !== "Invited" && u.status !== "INVITED") || u.status === "Inactive" || u.status === "INACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "Invited" || u.status === "INVITED").length;

  const platformUsersCount = React.useMemo(() => users.filter(isPlatformAccount).length, [users]);
  const tenantUsersCount = totalUsersCount - platformUsersCount;

  // ── Filtering logic ──────────────────────────────────────────────────────
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      if (isPlatformAdmin) {
        const isPlatformUser = isPlatformAccount(u);
        if (scopeFilter === "platform" && !isPlatformUser) return false;
        if (scopeFilter === "tenant" && isPlatformUser) return false;
      }

      // Search matching
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameStr = `${u.first_name || ""} ${u.last_name || ""} ${u.full_name || ""}`.toLowerCase();
        const emailStr = (u.email || "").toLowerCase();
        const phoneStr = u.phone || "";
        const roleStr = (u.role || u.role_name || "").toLowerCase();
        const deptStr = (u.department || "").toLowerCase();
        const branchStr = (u.active_location_name || "").toLowerCase();

        const match =
          nameStr.includes(q) ||
          emailStr.includes(q) ||
          phoneStr.includes(q) ||
          roleStr.includes(q) ||
          deptStr.includes(q) ||
          branchStr.includes(q);

        if (!match) return false;
      }

      // Role filter
      if (roleFilter !== "all") {
        const roleObj = roles.find((r) => r.id === roleFilter || r.name === roleFilter);
        const targetRoleId = roleObj ? roleObj.id : roleFilter;
        const targetRoleName = (roleObj ? roleObj.name : roleFilter).toLowerCase();

        const userRoleId = (u as any).role_id;
        const userRole = (u.role || u.role_name || "").toLowerCase();

        const matchesRoleId = userRoleId && userRoleId === targetRoleId;
        const matchesRoleName = userRole && userRole === targetRoleName;
        const matchesMultiRoles = Array.isArray((u as any).roles) && (u as any).roles.some(
          (r: any) => r.id === targetRoleId || r.name?.toLowerCase() === targetRoleName
        );

        if (!matchesRoleId && !matchesRoleName && !matchesMultiRoles) return false;
      }

      // Department filter (Tenant mode)
      if (!isPlatformAdmin && departmentFilter !== "all") {
        if (u.department !== departmentFilter) return false;
      }

      // Branch filter
      if (branchFilter !== "all") {
        const branchObj = branches.find((b) => b.id === branchFilter || b.name === branchFilter);
        const targetId = branchObj ? branchObj.id : branchFilter;
        const targetName = (branchObj ? branchObj.name : branchFilter).toLowerCase();

        const userBranchId = u.active_location_id || (u as any).home_branch || (u as any).branch_id;
        const userBranchName = (u.active_location_name || (u as any).home_branch_name || "").toLowerCase();

        const matchesId = userBranchId && userBranchId === targetId;
        const matchesName = userBranchName && userBranchName === targetName;
        const matchesAccessList = Array.isArray(u.branch_access) && u.branch_access.some(
          (ba: any) => (ba.branch_id === targetId || ba.branch_name?.toLowerCase() === targetName) && ba.enabled
        );

        if (!matchesId && !matchesName && !matchesAccessList) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const normStatus = (u.status || (u.is_active ? "Active" : "Inactive")).toLowerCase();
        if (normStatus !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [users, isPlatformAdmin, scopeFilter, search, roleFilter, departmentFilter, branchFilter, statusFilter]);

  return (
    <>
      <PageHeader
        title={isPlatformAdmin ? "Platform & Tenant Account Administration" : "Tenant Users & Staff"}
        subtitle={
          isPlatformAdmin
            ? "Manage cross-tenant platform administrators, tenant staff clearances, and global account privileges."
            : "Manage team accounts, departmental staff assignments, branch clearances, and security credentials."
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
              onClick={() => {
                if (!inviteRole && roles.length > 0) setInviteRole(roles[0].name);
                if (!inviteBranchId && branches.length > 0) setInviteBranchId(branches[0].id);
                if (!inviteDepartmentId && departments.length > 0) setInviteDepartmentId(departments[0].id);
                setInviteModalOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              Add / Invite Staff
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        {isPlatformAdmin ? (
          /* PLATFORM KPI TILES */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              title="Total Registered Users"
              value={totalUsersCount}
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
        ) : (
          /* STRICT TENANT KPI TILES (No Platform terms) */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              title="Total Tenant Users"
              value={totalUsersCount}
              change="Current Organization Staff"
              variant="neutral"
            />
            <KpiTile
              title="Active Staff"
              value={activeCount}
              change="Operational & Authorized"
              variant="positive"
            />
            <KpiTile
              title="Inactive / Disabled"
              value={inactiveCount}
              change="Deactivated Accounts"
              variant={inactiveCount > 0 ? "warning" : "neutral"}
            />
            <KpiTile
              title="Invited / Pending"
              value={pendingCount}
              change="Awaiting Credentials Setup"
              variant={pendingCount > 0 ? "warning" : "neutral"}
            />
          </div>
        )}

        {/* Platform-Only Scope Segmentation Tabs */}
        {isPlatformAdmin && (
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
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, role..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform mode tenant selector */}
            {isPlatformAdmin && tenants.length > 0 && (
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

            {/* Branch Filter */}
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-background">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {(currentUser?.isOrgWide !== false || isPlatformAdmin) && (
                  <SelectItem value="all">All Branches</SelectItem>
                )}
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department Filter (Tenant Mode) */}
            {!isPlatformAdmin && departments.length > 0 && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-8 text-xs w-36 bg-background">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs w-32 bg-background">
                <SelectValue placeholder="Role" />
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

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-28 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Invited">Invited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content States: Loading, Error, Empty, Success */}
        {loading ? (
          <div className="flex flex-col h-64 items-center justify-center gap-3 border border-border rounded-xl bg-card">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Loading authorized staff directory...</p>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center border border-destructive/20 rounded-xl bg-destructive/5 space-y-3">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <div>
              <p className="text-sm font-bold text-destructive">Failed to load directory</p>
              <p className="text-xs text-muted-foreground mt-1">{fetchError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
              <RefreshCw className="size-3.5 mr-1" /> Retry
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-card space-y-3">
            <Users className="size-10 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="text-sm font-bold text-foreground">No staff members found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try resetting filters or adjusting search keywords."
                  : "Get started by adding your gym's first staff member."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="text-xs font-semibold bg-primary text-primary-foreground"
            >
              <UserPlus className="size-3.5 mr-1" /> Add Staff Member
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (>= 768px) */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 font-bold text-foreground">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role & Scope</th>
                      {!isPlatformAdmin && <th className="py-3 px-4">Department</th>}
                      <th className="py-3 px-4">Branch / Studio</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.map((u) => {
                      const isRoot = u.id === "USR-ADMIN" || u.email === "admin";
                      const isPlat = isPlatformAccount(u);
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
                                  {isRoot && (
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
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                isPlat
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              {isPlat ? (
                                <>
                                  <ShieldCheck className="size-3 mr-1 inline" /> Platform · {u.role || "Admin"}
                                </>
                              ) : (
                                <>
                                  <Building2 className="size-3 mr-1 inline" /> {u.role || u.role_name || "Staff"}
                                </>
                              )}
                            </Badge>
                          </td>

                          {/* Department (Tenant Mode) */}
                          {!isPlatformAdmin && (
                            <td className="py-3 px-4">
                              {u.department ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-foreground font-medium">
                                  <Briefcase className="size-3 text-muted-foreground" />
                                  {u.department}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">General</span>
                              )}
                            </td>
                          )}

                          {/* Branch / Studio */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="size-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[150px]">
                                {u.active_location_name || "All Branches"}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {u.status === "Active" || u.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="size-3" /> Active
                              </span>
                            ) : u.status === "Invited" || u.status === "INVITED" ? (
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

                              {!isRoot && (
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

            {/* Mobile Cards View (< 768px: optimized for 320px, 375px, 480px) */}
            <div className="md:hidden space-y-2.5">
              {filteredUsers.map((u) => {
                const isRoot = u.id === "USR-ADMIN" || u.email === "admin";
                const isPlat = isPlatformAccount(u);
                const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-card rounded-xl border border-border space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 font-bold text-white shadow-2xs text-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-xs truncate flex items-center gap-1">
                            <span>{u.full_name || u.email}</span>
                            {isRoot && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                Root
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {u.status === "Active" || u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="size-2.5" /> Active
                          </span>
                        ) : u.status === "Invited" || u.status === "INVITED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Clock className="size-2.5" /> Invited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            <XCircle className="size-2.5" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                        {u.role || u.role_name || "Staff"}
                      </Badge>
                      {u.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="size-3 text-muted-foreground" />
                          {u.department}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-primary" />
                        {u.active_location_name || "All Branches"}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(u)}
                        className="h-7 px-2 text-[11px] font-semibold text-primary"
                      >
                        <Edit2 className="size-3 mr-1" /> Edit
                      </Button>
                      {!isRoot && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(u)}
                            className="h-7 px-2 text-[11px] text-muted-foreground"
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u)}
                            className="size-7 text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PageBody>

      {/* Add / Invite User Modal */}
      <Dialog
        open={inviteModalOpen}
        onOpenChange={(open) => {
          setInviteModalOpen(open);
          if (!open) setInviteError(null);
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              {isPlatformAdmin ? "Add & Allot User Access" : "Provision New Staff Member"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isPlatformAdmin
                ? "Provision a user account, assign Platform or Tenant scope, and set access clearances."
                : "Create an active employee or coach account for your gym with role and branch allotments."}
            </DialogDescription>
          </DialogHeader>

          {inviteError && (
            <Alert variant="destructive" className="py-2.5 px-3 text-xs bg-destructive/10 border-destructive/30 text-destructive flex items-start gap-2.5 rounded-xl">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <div className="min-w-0 flex-1">
                <AlertTitle className="text-xs font-bold leading-tight">Unable to Create Staff Account</AlertTitle>
                <AlertDescription className="text-[11px] mt-0.5 leading-normal text-destructive/90">
                  {inviteError}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <form onSubmit={handleCreateOrInviteUser} className="space-y-4 pt-2">
            {/* Scope Selection (Platform Admin only) */}
            {isPlatformAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">User Type & Clearance Scope</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserScope("tenant")}
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
                      Single gym organization (Owner, Manager, Trainer)
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
                      Global cross-tenant clearance (Super Admin, Support)
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* If Tenant and Platform Admin: select target organization */}
            {isPlatformAdmin && userScope === "tenant" && tenants.length > 0 && (
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
                  placeholder="staff@gym.com"
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

            {/* Role & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Assigned Role *</Label>
                  <a
                    href="/admin/roles"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Manage Roles <ArrowUpRight className="size-2.5" />
                  </a>
                </div>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="font-semibold">{r.name}</span>
                        {r.description ? (
                          <span className="text-muted-foreground ml-1 text-[10px]">({r.description})</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isPlatformAdmin && departments.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Department</Label>
                  <Select value={inviteDepartmentId} onValueChange={setInviteDepartmentId}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Branch Assignment */}
            {branches.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Primary Branch Assignment</Label>
                <Select value={inviteBranchId} onValueChange={setInviteBranchId}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password & Direct Login Activation */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="use-password-toggle"
                  className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="size-3.5 text-primary" /> Create Active User With Direct Password
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Enter user password (minimum 10 characters)"
                      className="h-8 text-xs font-mono bg-background pr-16"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground font-medium"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Staff account will be created as <strong>Active</strong> immediately. Must satisfy system password security validators.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  <strong>Recommended:</strong> User will be created in <strong>Invited</strong> mode. No shared or predictable password is stored.
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
                  ? "Saving..."
                  : useCustomPassword
                  ? "Create Staff Account"
                  : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setEditError(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-primary" /> Edit Staff Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update role assignment, branch access, and authorization status.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <Alert variant="destructive" className="py-2.5 px-3 text-xs bg-destructive/10 border-destructive/30 text-destructive flex items-start gap-2.5 rounded-xl">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <div className="min-w-0 flex-1">
                <AlertTitle className="text-xs font-bold leading-tight">Unable to Update Staff Account</AlertTitle>
                <AlertDescription className="text-[11px] mt-0.5 leading-normal text-destructive/90">
                  {editError}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {editingUser && (
            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <div className="text-xs font-bold text-foreground truncate">
                  {editingUser.full_name || editingUser.email}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {editingUser.email}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assigned Role</Label>
                <Select value={editRole} onValueChange={(roleId) => {
                  setEditRole(roleId);
                  setEditBranchAccess(editingUser ? branchAccessForRole(editingUser, roleId) : {});
                }}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-56">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="font-semibold">{r.name}</span>
                        {r.description ? (
                          <span className="text-muted-foreground ml-1.5 text-[10px]">— {r.description}</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isPlatformAdmin && departments.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Department</Label>
                  <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Keep current or select department" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roles.find((role) => role.id === editRole)?.scope === "BRANCH" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Branch access for this role</Label>
                  <p className="text-xs text-muted-foreground">Enable any number of branches. Disabling a branch removes access through this role; other roles may still grant access.</p>
                  {branches.map((branch) => (
                    <label key={branch.id} className="flex items-center justify-between gap-3 rounded border p-2 text-xs">
                      <span>{branch.name}</span>
                      <span className="flex items-center gap-2">
                        {editBranchAccess[branch.id] ? "Enabled" : "Disabled"}
                        <input type="checkbox" aria-label={`Enable access to ${branch.name}`}
                          checked={editBranchAccess[branch.id] === true}
                          disabled={editSubmitting}
                          onChange={(event) => setEditBranchAccess((current) => ({ ...current, [branch.id]: event.target.checked }))} />
                      </span>
                    </label>
                  ))}
                  {branches.length === 0 && <p className="text-xs text-muted-foreground">No branches available.</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Organization-scoped roles apply to all branches. Choose a branch-scoped role to manage individual branch access.</p>
              )}

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
