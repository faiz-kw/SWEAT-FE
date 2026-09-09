import * as React from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { 
  Building2, Plus, Search, CheckCircle2, AlertTriangle, 
  ArrowUpRight, Shield, RefreshCw, KeyRound, ExternalLink, Globe, Layers,
  Eye, MapPin, Users, HardDrive, Bot, CreditCard, Sparkles, X, Activity, Check, Clock, Phone, Mail,
  DollarSign, TrendingUp, Wallet, SlidersHorizontal, Edit2, CheckSquare, Square, Filter,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClockTimePicker } from "@/components/ui/clock-time-picker";
import { useApp, useAuth } from "@/contexts";
import { setAccessToken, setUserProfile, getCurrentUser } from "@/services";
import { 
  fetchTenantsApi, 
  fetchPlatformMetricsApi, 
  toggleTenantStatusApi, 
  impersonateTenantApi,
  updateTenantApi,
  type TenantRow, 
  type PlatformMetrics 
} from "@/services/api-platform";
import { 
  createLocationApi, 
  updateLocationApi, 
  deleteLocationApi, 
  type LocationRow 
} from "@/services/api-admin";
import { FEATURE_MODULES_CATALOG } from "@/lib/modules-config";

export function TenantsWorkspace() {
  const router = useRouter();
  const { setLocationId } = useApp();
  const { user } = useAuth();
  const [tenants, setTenants] = React.useState<TenantRow[]>([]);
  const [metrics, setMetrics] = React.useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [tierFilter, setTierFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"standard" | "executive">("executive");

  // Selected Tenant for View Details Modal
  const [selectedTenant, setSelectedTenant] = React.useState<TenantRow | null>(null);
  const [impersonatingId, setImpersonatingId] = React.useState<string | null>(null);

  // ── Edit Tenant & Modules Modal State ──
  const [editingTenant, setEditingTenant] = React.useState<TenantRow | null>(null);
  const [editTab, setEditTab] = React.useState<"details" | "modules" | "branches">("details");
  const [editName, setEditName] = React.useState("");
  const [editSlug, setEditSlug] = React.useState("");
  const [editTier, setEditTier] = React.useState("Growth");
  const [editStatus, setEditStatus] = React.useState("Active");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editCurrency, setEditCurrency] = React.useState("INR");
  const [editTimezone, setEditTimezone] = React.useState("Asia/Kolkata");
  const [editMaxLocations, setEditMaxLocations] = React.useState(3);
  const [editMaxMembers, setEditMaxMembers] = React.useState(2000);
  const [editModules, setEditModules] = React.useState<string[]>([]);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [moduleFilterQuery, setModuleFilterQuery] = React.useState("");

  // ── Studio Branch / Sub-Tenant Modal State ──
  const [branchModalOpen, setBranchModalOpen] = React.useState(false);
  const [branchEditingTenant, setBranchEditingTenant] = React.useState<TenantRow | null>(null);
  const [editingBranch, setEditingBranch] = React.useState<any | null>(null);
  const [branchName, setBranchName] = React.useState("");
  const [branchCity, setBranchCity] = React.useState("");
  const [branchAddress, setBranchAddress] = React.useState("");
  const [branchPhone, setBranchPhone] = React.useState("");
  const [branchCapacity, setBranchCapacity] = React.useState(150);
  const [branchOpenTime, setBranchOpenTime] = React.useState("06:00");
  const [branchCloseTime, setBranchCloseTime] = React.useState("22:00");
  const [branchIsActive, setBranchIsActive] = React.useState(true);
  const [savingBranch, setSavingBranch] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tList, mData] = await Promise.all([
        fetchTenantsApi(),
        fetchPlatformMetricsApi()
      ]);
      setTenants(tList);
      setMetrics(mData);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      await toggleTenantStatusApi(tenantId, nextStatus);
      toast.success(`Tenant ${nextStatus === "Active" ? "activated" : "suspended"} successfully!`);
      loadData();
      if (selectedTenant && selectedTenant.id === tenantId) {
        setSelectedTenant((prev) => prev ? { ...prev, status: nextStatus, is_active: nextStatus === "Active" } : null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update tenant status");
    }
  };

  const handleImpersonate = async (tenant: TenantRow) => {
    setImpersonatingId(tenant.id);
    try {
      const res = await impersonateTenantApi(tenant.id);
      if (res.access) {
        setAccessToken(res.access);
      }
      if (res.user) {
        setUserProfile({
          firstName: res.user.first_name,
          lastName: res.user.last_name,
          fullName: res.user.full_name || `${res.user.first_name} ${res.user.last_name}`.trim(),
          email: res.user.email,
          tenantName: res.user.tenant_name || tenant.name,
          locations: res.user.allowed_locations || [],
          enabledModules: tenant.enabled_modules || res.user.enabled_modules || [],
        });
      }
      if (tenant.locations && tenant.locations.length > 0 && tenant.locations[0]?.id) {
        setLocationId(tenant.locations[0].id);
      }
      toast.success(`Switched active context to ${tenant.name} admin console!`);
      setSelectedTenant(null);
      await router.navigate({ to: "/" });
      setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (err: any) {
      toast.error(err?.message || "Failed to switch to tenant admin session");
    } finally {
      setImpersonatingId(null);
    }
  };

  // ── Open Edit Modal ──
  const handleOpenEdit = (t: TenantRow) => {
    setEditingTenant(t);
    setEditTab("details");
    setEditName(t.name);
    setEditSlug(t.slug);
    setEditTier(t.tier || "Growth");
    setEditStatus(t.status || "Active");
    setEditEmail(t.contact_email || "");
    setEditPhone(t.phone || "");
    setEditCurrency(t.currency || "INR");
    setEditTimezone(t.timezone || "Asia/Kolkata");
    setEditMaxLocations(t.max_locations || 3);
    setEditMaxMembers(t.max_members || 2000);
    setEditModules(t.enabled_modules || []);
    setModuleFilterQuery("");
  };

  // ── Module & Submodule Toggle Handlers ──
  const handleToggleModuleMaster = (modId: string, submodules: { to: string }[]) => {
    const isCurrentlyActive = editModules.includes(modId) || submodules.some(s => editModules.includes(s.to));
    const subPaths = submodules.map(s => s.to);

    if (isCurrentlyActive) {
      // Disable module and all its submodules
      setEditModules(prev => prev.filter(m => m !== modId && !subPaths.includes(m)));
    } else {
      // Enable module and all its submodules
      setEditModules(prev => Array.from(new Set([...prev, modId, ...subPaths])));
    }
  };

  const handleToggleSubmodule = (modId: string, subPath: string, allSubmodules: { to: string }[]) => {
    setEditModules(prev => {
      let next = [...prev];
      if (next.includes(subPath)) {
        next = next.filter(p => p !== subPath);
        // If all submodules are unchecked, remove the parent module ID too
        const subPaths = allSubmodules.map(s => s.to);
        const remaining = next.filter(p => subPaths.includes(p));
        if (remaining.length === 0) {
          next = next.filter(m => m !== modId);
        }
      } else {
        next.push(subPath);
        if (!next.includes(modId)) {
          next.push(modId);
        }
      }
      return next;
    });
  };

  const handleSelectAllModules = () => {
    const all = FEATURE_MODULES_CATALOG.flatMap(m => [m.id, ...m.submodules.map(s => s.to)]);
    setEditModules(Array.from(new Set(all)));
    toast.info("All modules and submodules selected.");
  };

  const handleDeselectAllModules = () => {
    setEditModules([]);
    toast.info("All module permissions cleared.");
  };

  const handleApplyPreset = (preset: "core" | "growth" | "all") => {
    if (preset === "all") {
      handleSelectAllModules();
    } else if (preset === "core") {
      const coreIds = ["crm", "members", "ops", "finance"];
      const coreMods = FEATURE_MODULES_CATALOG.filter(m => coreIds.includes(m.id));
      const corePaths = coreMods.flatMap(m => [m.id, ...m.submodules.map(s => s.to)]);
      setEditModules(corePaths);
      toast.info("Applied Core Studio pack.");
    } else if (preset === "growth") {
      const growthIds = ["crm", "members", "ops", "finance", "ai", "reports", "nutrition"];
      const growthMods = FEATURE_MODULES_CATALOG.filter(m => growthIds.includes(m.id));
      const growthPaths = growthMods.flatMap(m => [m.id, ...m.submodules.map(s => s.to)]);
      setEditModules(growthPaths);
      toast.info("Applied Growth Tier feature pack.");
    }
  };

  // ── Save Tenant Changes & Real-Time Sync ──
  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    if (!editName.trim()) { toast.error("Organization name is required"); return; }

    setSavingEdit(true);
    try {
      const payload: Partial<TenantRow> = {
        name: editName.trim(),
        slug: editSlug.trim(),
        tier: editTier as any,
        status: editStatus,
        is_active: editStatus === "Active" || editStatus === "Trial",
        contact_email: editEmail.trim(),
        phone: editPhone.trim(),
        currency: editCurrency.trim(),
        timezone: editTimezone.trim(),
        max_locations: Number(editMaxLocations) || 1,
        max_members: Number(editMaxMembers) || 100,
        enabled_modules: editModules,
      };

      const updated = await updateTenantApi(editingTenant.id, payload);
      toast.success(`Organization "${editName}" and module permissions updated successfully!`);

      // 1. Update tenants list in real time
      setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, ...updated } : t));

      // 2. Update view modal in real time if open
      if (selectedTenant && selectedTenant.id === editingTenant.id) {
        setSelectedTenant(prev => prev ? { ...prev, ...updated } : null);
      }

      // 3. Update current active auth session if impersonating or if this is the active tenant
      const current = getCurrentUser();
      if (current && (current.tenantId === editingTenant.id || current.isImpersonating)) {
        setUserProfile({
          ...current,
          tenantName: updated.name,
          enabledModules: updated.enabled_modules,
        });
      }

      // 4. Broadcast across all channels for instant real-time sync across tabs/windows
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("pos_auth_sync");
          bc.postMessage({ type: "TENANT_UPDATED", tenantId: editingTenant.id, timestamp: Date.now() });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          "pos_last_tenant_update",
          JSON.stringify({ tenantId: editingTenant.id, timestamp: Date.now() })
        );
      } catch {}

      window.dispatchEvent(
        new CustomEvent("tenant_modules_updated", {
          detail: { tenantId: editingTenant.id, enabledModules: updated.enabled_modules }
        })
      );

      setEditingTenant(null);
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update tenant";
      toast.error(detail);
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Studio Branch / Sub-Tenant Handlers ──
  const handleOpenAddBranch = (tenant: TenantRow) => {
    setBranchEditingTenant(tenant);
    setEditingBranch(null);
    setBranchName("");
    setBranchCity("Mumbai");
    setBranchAddress("");
    setBranchPhone("");
    setBranchCapacity(150);
    setBranchOpenTime("06:00");
    setBranchCloseTime("22:00");
    setBranchIsActive(true);
    setBranchModalOpen(true);
  };

  const handleOpenEditBranch = (tenant: TenantRow, loc: any) => {
    setBranchEditingTenant(tenant);
    setEditingBranch(loc);
    setBranchName(loc.name || "");
    setBranchCity(loc.city || "Mumbai");
    setBranchAddress(loc.address || "");
    setBranchPhone(loc.phone || "");
    setBranchCapacity(loc.capacity || 150);
    const times = (loc.operating_hours || "06:00 - 22:00").split(" - ");
    setBranchOpenTime(times[0] || "06:00");
    setBranchCloseTime(times[1] || "22:00");
    setBranchIsActive(loc.is_active !== false);
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchEditingTenant) return;
    if (!branchName.trim()) { toast.error("Branch name is required"); return; }
    if (!branchCity.trim()) { toast.error("City is required"); return; }
    if (!branchAddress.trim()) { toast.error("Address is required"); return; }
    if (branchPhone.trim().length !== 10) { toast.error("Phone number must be exactly 10 numerical digits"); return; }

    setSavingBranch(true);
    try {
      const payload: Partial<LocationRow> = {
        tenant: branchEditingTenant.id,
        name: branchName.trim(),
        city: branchCity.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        capacity: Number(branchCapacity) || 150,
        operating_hours: `${branchOpenTime} - ${branchCloseTime}`,
        is_active: branchIsActive,
      };

      if (editingBranch?.id) {
        await updateLocationApi(editingBranch.id, payload);
        toast.success(`Studio branch "${branchName}" updated successfully!`);
      } else {
        await createLocationApi(payload);
        toast.success(`Studio branch "${branchName}" created and assigned to ${branchEditingTenant.name}!`);
      }

      const refreshedTenants = await fetchTenantsApi();
      setTenants(refreshedTenants);

      const refreshedCurrent = refreshedTenants.find(t => t.id === branchEditingTenant.id);
      if (refreshedCurrent) {
        if (selectedTenant?.id === branchEditingTenant.id) setSelectedTenant(refreshedCurrent);
        if (editingTenant?.id === branchEditingTenant.id) setEditingTenant(refreshedCurrent);
      }

      // Broadcast real-time sync across tabs/windows
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("pos_auth_sync");
          bc.postMessage({ type: "TENANT_UPDATED", tenantId: branchEditingTenant.id, timestamp: Date.now() });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          "pos_last_tenant_update",
          JSON.stringify({ tenantId: branchEditingTenant.id, timestamp: Date.now() })
        );
      } catch {}

      window.dispatchEvent(new CustomEvent("tenant_modules_updated", { detail: { tenantId: branchEditingTenant.id } }));
      window.dispatchEvent(new CustomEvent("locations_updated"));

      setBranchModalOpen(false);
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail || err?.response?.data?.phone?.[0] || err?.message || "Failed to save studio branch";
      toast.error(detail);
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (tenant: TenantRow, loc: any) => {
    if (!confirm(`Are you sure you want to delete studio branch "${loc.name}" (${loc.id}) from ${tenant.name}?`)) return;

    try {
      await deleteLocationApi(loc.id);
      toast.success(`Studio branch "${loc.name}" deleted.`);

      const refreshedTenants = await fetchTenantsApi();
      setTenants(refreshedTenants);

      const refreshedCurrent = refreshedTenants.find(t => t.id === tenant.id);
      if (refreshedCurrent) {
        if (selectedTenant?.id === tenant.id) setSelectedTenant(refreshedCurrent);
        if (editingTenant?.id === tenant.id) setEditingTenant(refreshedCurrent);
      }

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("pos_auth_sync");
          bc.postMessage({ type: "TENANT_UPDATED", tenantId: tenant.id, timestamp: Date.now() });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          "pos_last_tenant_update",
          JSON.stringify({ tenantId: tenant.id, timestamp: Date.now() })
        );
      } catch {}

      window.dispatchEvent(new CustomEvent("locations_updated"));
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to delete branch";
      toast.error(detail);
    }
  };

  // Filtered tenants for search
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.contact_email && t.contact_email.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesTier = tierFilter === "all" || t.tier.toLowerCase() === tierFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesTier;
  });

  // Calculate stats for edit modal
  const totalCatalogSubmodules = React.useMemo(() => {
    return FEATURE_MODULES_CATALOG.reduce((acc, m) => acc + m.submodules.length, 0);
  }, []);

  const activeSubmoduleCount = React.useMemo(() => {
    return FEATURE_MODULES_CATALOG.reduce((acc, m) => {
      const count = m.submodules.filter(s => 
        editModules.includes(s.to) || (editModules.includes(m.id) && !editModules.some(item => m.submodules.some(sub => sub.to === item)))
      ).length;
      return acc + count;
    }, 0);
  }, [editModules]);

  const activeModuleCount = React.useMemo(() => {
    return FEATURE_MODULES_CATALOG.filter(m => 
      editModules.includes(m.id) || m.submodules.some(s => editModules.includes(s.to))
    ).length;
  }, [editModules]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Tenants & Organizations"
        subtitle="Global multi-tenant governance, tier allocations, and live subscription status across all fitness brands."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/platform/onboard">
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground shadow-xs">
                <Plus className="h-4 w-4" />
                Onboard New Tenant
              </Button>
            </Link>
          </div>
        }
      />

      <PageBody>
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiTile 
            label="Total Organizations" 
            value={metrics?.totalTenants ?? tenants.length} 
            delta="+3 this month" 
            tone="default" 
          />
          <KpiTile 
            label="Active Brands" 
            value={metrics?.activeTenants ?? tenants.filter(t => t.status === "Active").length} 
            delta="100% operational" 
            tone="positive" 
          />
          <KpiTile 
            label="Total Studio Branches" 
            value={metrics?.totalLocations ?? 2} 
            delta="Across 4 states" 
            tone="default" 
          />
          <KpiTile 
            label="Platform MRR" 
            value={`₹${(metrics?.monthlyRecurringRevenue ?? 19999).toLocaleString()}`} 
            delta="+18.4% YoY" 
            tone="positive" 
          />
        </div>

        {/* Filter / Search Bar */}
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs mb-6 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand name, slug, or contact email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filters */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Status:</span>
                {["all", "Active", "Suspended", "Trial"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded-md font-medium capitalize transition-colors ${
                      statusFilter === st 
                        ? "bg-primary text-primary-foreground shadow-2xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Tier Filters */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Tier:</span>
                {["all", "Starter", "Growth", "Enterprise"].map((tr) => (
                  <button
                    key={tr}
                    onClick={() => setTierFilter(tr)}
                    className={`px-2 py-0.5 rounded-md font-medium capitalize transition-colors ${
                      tierFilter === tr 
                        ? "bg-primary text-primary-foreground shadow-2xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tr}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 p-0.5 bg-muted/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase px-2 flex items-center gap-1">
                <SlidersHorizontal className="size-3" /> Admin View:
              </span>
              <button
                onClick={() => setViewMode("executive")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  viewMode === "executive"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <DollarSign className="size-3" /> Branches & Revenue
              </button>
              <button
                onClick={() => setViewMode("standard")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  viewMode === "standard"
                    ? "bg-card text-foreground shadow-2xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard
              </button>
            </div>
          </div>
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((t) => {
            const paidRev = t.total_paid_revenue ?? 148500;
            const pendingRev = t.pending_revenue ?? 12500;
            const sym = t.currency === "INR" || !t.currency ? "₹" : `${t.currency} `;
            const enrolledMembers = t.members_count ?? t.usage?.active_members_count ?? 1420;

            return (
              <div 
                key={t.id} 
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base border border-primary/20">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm leading-snug">{t.name}</h3>
                          <a 
                            href={`https://${t.slug}.performanceos.in`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                          <Globe className="h-3 w-3 text-primary" /> {t.slug}.performanceos.in
                        </p>
                      </div>
                    </div>

                    <span 
                      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        t.status === "Active" 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${t.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {t.tier} Tier
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {t.id}
                    </span>
                  </div>

                  {viewMode === "executive" ? (
                    <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-border/40 mb-3 bg-muted/20 -mx-4 sm:-mx-5 px-4 sm:px-5">
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10.5px]">
                          <MapPin className="size-3 text-primary" /> Sub-Branches:
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {t.locations?.length || 1} Studios <span className="text-[10.5px] text-muted-foreground font-normal">({t.max_locations || 3} max)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10.5px]">
                          <Users className="size-3 text-primary" /> Enrolled Members:
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {enrolledMembers.toLocaleString()} <span className="text-[10.5px] text-muted-foreground font-normal">({t.max_members || 2000} quota)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10.5px]">
                          <DollarSign className="size-3 text-emerald-500" /> Revenue Collected:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate block">
                          {sym}{paidRev.toLocaleString()} Paid
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10.5px]">
                          <Clock className="size-3 text-primary" /> Timezone & Dues:
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {t.timezone || "Asia/Kolkata"} <span className="text-[10.5px] text-rose-500 font-normal">({sym}{pendingRev} due)</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-border/40 mb-3 bg-muted/20 -mx-4 sm:-mx-5 px-4 sm:px-5">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Max Locations:</span>
                        <span className="font-semibold text-foreground truncate block">{t.max_locations ?? (t.locations?.length || 1)} Studios</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Member Quota:</span>
                        <span className="font-semibold text-foreground truncate block">{(t.max_members ?? 2000).toLocaleString()} Members</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Region & Timezone:</span>
                        <span className="font-semibold text-foreground truncate block">{t.currency ?? "INR"} • {t.timezone || "Asia/Kolkata"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Contact:</span>
                        <span className="font-semibold text-foreground truncate block">{t.contact_email || "N/A"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7.5 px-2 gap-1 font-semibold"
                      onClick={() => setSelectedTenant(t)}
                    >
                      <Eye className="h-3 w-3 text-primary" />
                      View Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7.5 px-2 gap-1 font-semibold hover:border-amber-500 hover:text-amber-500"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <Edit2 className="h-3 w-3 text-amber-500" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7.5 px-1.5 text-muted-foreground hover:text-foreground font-medium"
                      onClick={() => handleToggleStatus(t.id, t.status)}
                    >
                      {t.status === "Active" ? "Suspend" : "Activate"}
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs h-7.5 font-semibold gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shrink-0"
                    disabled={impersonatingId === t.id}
                    onClick={() => handleImpersonate(t)}
                  >
                    <Shield className="h-3 w-3" />
                    {impersonatingId === t.id ? "Connecting..." : "Login as Admin"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TENANT VIEW DETAILS MODAL ── */}
        {selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-sm">
                    {selectedTenant.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg leading-tight">{selectedTenant.name}</h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          selectedTenant.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {selectedTenant.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      https://{selectedTenant.slug}.performanceos.in
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTenant(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Financial & Operational Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <DollarSign className="size-3.5" /> Total Paid Revenue
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {selectedTenant.currency === "INR" || !selectedTenant.currency ? "₹" : `${selectedTenant.currency} `}
                    {(selectedTenant.total_paid_revenue ?? 148500).toLocaleString()}
                  </div>
                  <span className="text-[10.5px] text-muted-foreground block">Settled via Invoices & POS</span>
                </div>

                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <Users className="size-3.5" /> Enrolled Athletes
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {(selectedTenant.members_count ?? selectedTenant.usage?.active_members_count ?? 1420).toLocaleString()} Members
                  </div>
                  <span className="text-[10.5px] text-muted-foreground block">
                    Quota: {selectedTenant.max_members || 2000} Max
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <MapPin className="size-3.5" /> Studio Branches
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {selectedTenant.locations?.length || 1} Studios Active
                  </div>
                  <span className="text-[10.5px] text-muted-foreground block">
                    Limit: {selectedTenant.max_locations || 3} Max
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Layers className="size-3.5" /> Subscription Plan
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {selectedTenant.tier} Tier
                  </div>
                  <span className="text-[10.5px] text-muted-foreground block">
                    {selectedTenant.timezone || "Asia/Kolkata"}
                  </span>
                </div>
              </div>

              {/* General Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tenant ID</span>
                  <span className="font-mono font-semibold text-foreground">{selectedTenant.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Contact Email</span>
                  <span className="font-semibold text-foreground truncate block">{selectedTenant.contact_email || "admin@gym.com"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Contact Phone</span>
                  <span className="font-semibold text-foreground">{selectedTenant.phone || "+91 98765 43210"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Currency & GST</span>
                  <span className="font-semibold text-foreground">{selectedTenant.currency || "INR"} (18% GST)</span>
                </div>
              </div>

              {/* Studio Locations List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Sub-Branches & Studio Locations ({selectedTenant.locations?.length || 0})
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      Allocated {selectedTenant.locations?.length || 0} of {selectedTenant.max_locations || 3} branches
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => handleOpenAddBranch(selectedTenant)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Branch
                    </Button>
                  </div>
                </div>

                {(!selectedTenant.locations || selectedTenant.locations.length === 0) ? (
                  <div className="p-6 rounded-xl border border-dashed border-border/70 text-center space-y-2 bg-muted/10">
                    <MapPin className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Studio Branches Provisioned</p>
                    <p className="text-[11px] text-muted-foreground">Click below to create and assign the first studio location for this organization.</p>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-primary/40 text-primary" onClick={() => handleOpenAddBranch(selectedTenant)}>
                      <Plus className="h-3 w-3" /> Create First Branch
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card overflow-hidden">
                    {selectedTenant.locations.map((loc: any, idx: number) => {
                      const locMembers = loc.members_count ?? 0;
                      const locRev = loc.revenue_collected ?? 0;
                      const sym = selectedTenant.currency === "INR" || !selectedTenant.currency ? "₹" : `${selectedTenant.currency} `;

                      return (
                        <div key={loc.id || idx} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors">
                          <div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                              {loc.name}
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                loc.is_active !== false 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {loc.is_active !== false ? "Operational Branch" : "Inactive"}
                              </span>
                            </div>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-[11px] flex-wrap">
                              <span>{loc.city} {loc.address ? `• ${loc.address}` : ""}</span>
                              <span>• Max {loc.capacity || 150} Athletes</span>
                              <span>• {loc.operating_hours || "06:00 - 22:00"}</span>
                              {loc.phone && <span>• 📞 {loc.phone}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-auto text-right">
                            <div>
                              <span className="text-[10.5px] text-muted-foreground block">Branch Members</span>
                              <span className="font-bold text-foreground">{locMembers.toLocaleString()} Enrolled</span>
                            </div>
                            <div className="border-l border-border/50 pl-3">
                              <span className="text-[10.5px] text-muted-foreground block">Revenue Paid</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{sym}{locRev.toLocaleString()}</span>
                            </div>
                            <span className="font-mono text-muted-foreground text-[10.5px] bg-muted px-1.5 py-0.5 rounded">
                              {loc.id}
                            </span>
                            <div className="flex items-center gap-1 border-l border-border/50 pl-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Studio Branch"
                                onClick={() => handleOpenEditBranch(selectedTenant, loc)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete Studio Branch"
                                onClick={() => handleDeleteBranch(selectedTenant, loc)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resource Usage & Quota Allocations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Resource Usage & Quota Allocations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Active Members</span>
                      <span className="font-semibold font-mono">{selectedTenant.usage?.active_members_count ?? 140} / {selectedTenant.max_members || 2000}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((selectedTenant.usage?.active_members_count || 140) / (selectedTenant.max_members || 2000)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Studios</span>
                      <span className="font-semibold font-mono">{selectedTenant.locations?.length || 1} / {selectedTenant.max_locations || 3}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((selectedTenant.locations?.length || 1) / (selectedTenant.max_locations || 3)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> AI Calling Mins</span>
                      <span className="font-semibold font-mono">{selectedTenant.usage?.ai_minutes_used ?? 45} / 300</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "15%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Provisioned Feature Modules & Submodules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Provisioned Feature Modules & Submodules
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => {
                      const t = selectedTenant;
                      setSelectedTenant(null);
                      handleOpenEdit(t);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                    Manage Modules
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FEATURE_MODULES_CATALOG.filter(m => {
                    const mods = selectedTenant.enabled_modules || [];
                    return mods.includes(m.id) || mods.some(item => m.submodules.some(s => s.to === item));
                  }).map(m => {
                    const mods = selectedTenant.enabled_modules || [];
                    const activeSubCount = m.submodules.filter(s => mods.includes(s.to) || (mods.includes(m.id) && !mods.some(item => m.submodules.some(sub => sub.to === item)))).length;
                    return (
                      <div key={m.id} className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            {m.label}
                          </span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded font-mono bg-primary/10 text-primary border border-primary/20">
                            {activeSubCount} / {m.submodules.length} Active
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.submodules.map(sub => {
                            const isSubActive = mods.includes(sub.to) || (mods.includes(m.id) && !mods.some(item => m.submodules.some(s => s.to === item)));
                            return (
                              <span
                                key={sub.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                  isSubActive
                                    ? "bg-background text-foreground border-border/80 font-medium"
                                    : "bg-muted/40 text-muted-foreground line-through opacity-50 border-transparent"
                                }`}
                              >
                                {sub.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(selectedTenant.id, selectedTenant.status)}
                  >
                    {selectedTenant.status === "Active" ? "Suspend Organization" : "Re-activate Organization"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => {
                      const t = selectedTenant;
                      setSelectedTenant(null);
                      handleOpenEdit(t);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Tenant & Modules
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedTenant(null)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground gap-2 font-medium"
                    disabled={impersonatingId === selectedTenant.id}
                    onClick={() => handleImpersonate(selectedTenant)}
                  >
                    <Shield className="h-4 w-4" />
                    {impersonatingId === selectedTenant.id ? "Switching Session..." : "Log in as Tenant Admin"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT TENANT & MODULES MODAL (SUPER ADMIN REAL-TIME EDIT) ── */}
        {editingTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight">
                      Edit Organization & Modules: {editingTenant.name}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      Tenant ID: {editingTenant.id} • Real-time live update
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTenant(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <button
                  type="button"
                  onClick={() => setEditTab("details")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    editTab === "details"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Organization Details
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("modules")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    editTab === "modules"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Module & Submodule Permissions
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/80 text-foreground font-mono">
                    {activeModuleCount} / {FEATURE_MODULES_CATALOG.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("branches")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    editTab === "branches"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Studio Branches & Sub-Tenants
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/80 text-foreground font-mono">
                    {editingTenant.locations?.length || 0} / {editMaxLocations}
                  </span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveTenant} className="space-y-5">
                {editTab === "details" ? (
                  <div className="space-y-4 text-xs sm:text-sm">
                    {/* Brand Name & Slug */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_name">Brand / Organization Name *</Label>
                        <Input
                          id="edit_name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Iron Gym"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_slug">Subdomain / Slug *</Label>
                        <div className="relative flex items-center">
                          <Input
                            id="edit_slug"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            placeholder="e.g. irongym"
                            className="font-mono text-xs pr-32"
                            required
                          />
                          <span className="absolute right-3 text-xs text-muted-foreground font-mono pointer-events-none">
                            .performanceos.in
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tier & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_tier">Subscription Tier</Label>
                        <select
                          id="edit_tier"
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="Starter">Starter Tier (1 Location, 500 Members)</option>
                          <option value="Growth">Growth Tier (3 Locations, 2000 Members)</option>
                          <option value="Enterprise">Enterprise Tier (Unlimited Locations & Scale)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit_status">Account Status</Label>
                        <select
                          id="edit_status"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="Active">Active (Fully Operational)</option>
                          <option value="Trial">Trial (14-day Evaluation)</option>
                          <option value="Suspended">Suspended (Access Temporarily Gated)</option>
                          <option value="Expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    {/* Contact Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_email">Contact Email</Label>
                        <Input
                          id="edit_email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="admin@irongym.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_phone">Contact Phone</Label>
                        <Input
                          id="edit_phone"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+91 9876543210"
                        />
                      </div>
                    </div>

                    {/* Quotas: Max Locations & Max Members */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_max_loc">Max Allowed Studio Branches</Label>
                        <Input
                          id="edit_max_loc"
                          type="number"
                          min={1}
                          max={100}
                          value={editMaxLocations}
                          onChange={(e) => setEditMaxLocations(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_max_mem">Enrolled Athlete Quota</Label>
                        <Input
                          id="edit_max_mem"
                          type="number"
                          min={50}
                          step={50}
                          value={editMaxMembers}
                          onChange={(e) => setEditMaxMembers(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Region: Currency & Timezone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_currency">Base Currency</Label>
                        <select
                          id="edit_currency"
                          value={editCurrency}
                          onChange={(e) => setEditCurrency(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="INR">INR (₹ Indian Rupee)</option>
                          <option value="USD">USD ($ US Dollar)</option>
                          <option value="AED">AED (د.إ UAE Dirham)</option>
                          <option value="EUR">EUR (€ Euro)</option>
                          <option value="GBP">GBP (£ British Pound)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_timezone">Operational Timezone</Label>
                        <Input
                          id="edit_timezone"
                          value={editTimezone}
                          onChange={(e) => setEditTimezone(e.target.value)}
                          placeholder="Asia/Kolkata"
                        />
                      </div>
                    </div>
                  </div>
                ) : editTab === "modules" ? (
                  /* ── TAB 2: MODULE & SUBMODULE PERMISSIONS MATRIX ── */
                  <div className="space-y-4">
                    {/* Matrix Controls & Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Feature Presets:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 font-medium"
                          onClick={() => handleApplyPreset("core")}
                        >
                          Core Gym Pack (CRM, Ops, Members, Finance)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 font-medium"
                          onClick={() => handleApplyPreset("growth")}
                        >
                          Growth Suite (+ AI & Reports)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => handleApplyPreset("all")}
                        >
                          Select All (Full Platform)
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={handleDeselectAllModules}
                        >
                          Clear All
                        </Button>
                      </div>

                      <div className="text-xs font-mono text-muted-foreground">
                        <span className="font-bold text-foreground">{activeSubmoduleCount}</span> of {totalCatalogSubmodules} submodules enabled ({activeModuleCount}/{FEATURE_MODULES_CATALOG.length} modules)
                      </div>
                    </div>

                    {/* Quick Search inside Module Matrix */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search modules or submodules (e.g. leads, personal training, ai coach, invoices)..."
                        value={moduleFilterQuery}
                        onChange={(e) => setModuleFilterQuery(e.target.value)}
                        className="pl-9 h-8 text-xs bg-background"
                      />
                    </div>

                    {/* Modules & Submodules List */}
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {FEATURE_MODULES_CATALOG.filter((m) => {
                        if (!moduleFilterQuery.trim()) return true;
                        const q = moduleFilterQuery.toLowerCase();
                        const matchesMod = m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
                        const matchesSub = m.submodules.some((s) => s.label.toLowerCase().includes(q) || s.to.toLowerCase().includes(q));
                        return matchesMod || matchesSub;
                      }).map((m) => {
                        const isModActive = editModules.includes(m.id) || m.submodules.some((s) => editModules.includes(s.to));
                        const activeCount = m.submodules.filter((s) =>
                          editModules.includes(s.to) || (editModules.includes(m.id) && !editModules.some((item) => m.submodules.some((sub) => sub.to === item)))
                        ).length;

                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border transition-all p-3.5 space-y-3 ${
                              isModActive
                                ? "border-primary/50 bg-primary/3 shadow-2xs"
                                : "border-border/60 bg-card opacity-75 hover:opacity-100"
                            }`}
                          >
                            {/* Module Header & Master Switch */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModuleMaster(m.id, m.submodules)}
                                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                    isModActive
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-input bg-background hover:bg-muted"
                                  }`}
                                >
                                  {isModActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-foreground">{m.label}</span>
                                    {m.badge && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        {m.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">{m.description}</p>
                                </div>
                              </div>

                              <span
                                className={`text-[10.5px] px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 ${
                                  isModActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {activeCount} / {m.submodules.length} Active
                              </span>
                            </div>

                            {/* Submodules Checkbox Chips */}
                            {isModActive && (
                              <div className="pl-7 pt-1 border-t border-border/40">
                                <div className="flex flex-wrap gap-1.5">
                                  {m.submodules.map((sub) => {
                                    const isSubActive =
                                      editModules.includes(sub.to) ||
                                      (editModules.includes(m.id) && !editModules.some((item) => m.submodules.some((s) => s.to === item)));

                                    return (
                                      <button
                                        type="button"
                                        key={sub.id}
                                        onClick={() => handleToggleSubmodule(m.id, sub.to, m.submodules)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all select-none ${
                                          isSubActive
                                            ? "bg-background text-foreground border-primary/60 shadow-2xs font-semibold"
                                            : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-border/50 opacity-60"
                                        }`}
                                      >
                                        <span
                                          className={`flex h-3 w-3 items-center justify-center rounded-xs border text-[9px] ${
                                            isSubActive
                                              ? "bg-primary border-primary text-primary-foreground"
                                              : "border-muted-foreground/40 bg-background"
                                          }`}
                                        >
                                          {isSubActive && <Check className="h-2 w-2 stroke-[3]" />}
                                        </span>
                                        {sub.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── STUDIO BRANCHES & SUB-TENANTS TAB ── */
                  <div className="space-y-4 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-muted/20">
                      <div>
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Branch Allocation & Quotas
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Provisioned {editingTenant.locations?.length || 0} of {editMaxLocations} studio locations under {editingTenant.name}.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary text-primary-foreground gap-1.5 font-medium shadow-xs shrink-0"
                        onClick={() => handleOpenAddBranch(editingTenant)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Studio Branch
                      </Button>
                    </div>

                    {(!editingTenant.locations || editingTenant.locations.length === 0) ? (
                      <div className="p-8 rounded-xl border border-dashed border-border/70 text-center space-y-2.5 bg-muted/10">
                        <MapPin className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                        <p className="text-sm font-semibold text-foreground">No Studio Branches Yet</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          This organization currently has no studio branches configured. Click below to add the first location.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => handleOpenAddBranch(editingTenant)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add First Studio Branch
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card overflow-hidden">
                        {editingTenant.locations.map((loc: any, idx: number) => (
                          <div key={loc.id || idx} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors">
                            <div>
                              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                {loc.name}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                  loc.is_active !== false 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {loc.is_active !== false ? "Operational" : "Inactive"}
                                </span>
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-[11px] flex-wrap">
                                <span>{loc.city} {loc.address ? `• ${loc.address}` : ""}</span>
                                <span>• Max {loc.capacity || 150} Athletes</span>
                                <span>• {loc.operating_hours || "06:00 - 22:00"}</span>
                                {loc.phone && <span>• 📞 {loc.phone}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 ml-auto text-right">
                              <span className="font-mono text-muted-foreground text-[10.5px] bg-muted px-1.5 py-0.5 rounded">
                                {loc.id}
                              </span>
                              <div className="flex items-center gap-1 border-l border-border/50 pl-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="Edit Studio Branch"
                                  onClick={() => handleOpenEditBranch(editingTenant, loc)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Studio Branch"
                                  onClick={() => handleDeleteBranch(editingTenant, loc)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="text-xs text-muted-foreground font-mono">
                    Changes take effect immediately on save
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingTenant(null)}
                      disabled={savingEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-primary text-primary-foreground min-w-[140px] font-semibold"
                    >
                      {savingEdit ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Saving Changes...
                        </span>
                      ) : (
                        "Save & Apply Real-Time"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── ADD / EDIT STUDIO BRANCH MODAL (SUPER ADMIN ONLY) ── */}
        {branchModalOpen && branchEditingTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight">
                      {editingBranch ? `Edit Studio Branch: ${editingBranch.name}` : `Add Studio Branch for ${branchEditingTenant.name}`}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      Tenant: {branchEditingTenant.name} ({branchEditingTenant.id})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setBranchModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="branch_name">Branch / Studio Name *</Label>
                  <Input
                    id="branch_name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Indiranagar Flagship Centre"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="branch_city">City *</Label>
                    <Input
                      id="branch_city"
                      value={branchCity}
                      onChange={(e) => setBranchCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="branch_phone">Contact Phone (10 Digits) *</Label>
                    <Input
                      id="branch_phone"
                      value={branchPhone}
                      onChange={(e) => setBranchPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="branch_address">Address / Street Location *</Label>
                  <Input
                    id="branch_address"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="e.g. 100ft Road, HAL 2nd Stage"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Operating Hours (Clock Time Picker)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Opening Time</span>
                      <ClockTimePicker
                        value={branchOpenTime}
                        onChange={(t24) => setBranchOpenTime(t24)}
                        placeholder="06:00"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Closing Time</span>
                      <ClockTimePicker
                        value={branchCloseTime}
                        onChange={(t24) => setBranchCloseTime(t24)}
                        placeholder="22:00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="branch_capacity">Max Athlete Capacity</Label>
                    <Input
                      id="branch_capacity"
                      type="number"
                      min={10}
                      max={2000}
                      value={branchCapacity}
                      onChange={(e) => setBranchCapacity(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <Label>Operational Status</Label>
                    <button
                      type="button"
                      onClick={() => setBranchIsActive(!branchIsActive)}
                      className={`h-9 px-3 rounded-md border flex items-center justify-between text-xs font-medium transition-colors ${
                        branchIsActive
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      <span>{branchIsActive ? "Operational (Active)" : "Inactive / Closed"}</span>
                      <span className={`h-2 w-2 rounded-full ${branchIsActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Super Admin controlled
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBranchModalOpen(false)}
                      disabled={savingBranch}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingBranch}
                      className="bg-primary text-primary-foreground font-semibold min-w-[120px]"
                    >
                      {savingBranch ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                        </span>
                      ) : (
                        editingBranch ? "Update Branch" : "Create Branch"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}
