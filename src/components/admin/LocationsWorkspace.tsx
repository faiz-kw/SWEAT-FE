import * as React from "react";
import {
  MapPin, Plus, Phone, Clock, Users, Building, Edit2, Trash2, RefreshCw,
  ChevronDown, CheckCircle2, AlertCircle, Building2, ShieldCheck, Eye, Search, Filter,
  CalendarDays
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClockTimePicker } from "@/components/ui/clock-time-picker";
import { BranchScheduleModal } from "./BranchScheduleModal";
import {
  fetchLocationsApi,
  createLocationApi,
  updateLocationApi,
  deleteLocationApi,
  fetchTenantsForDropdownApi,
  type LocationRow,
} from "@/services/api-admin";
import { useAuth } from "@/contexts";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Enforce strictly 10 digits — returns digits-only string truncated to 10 chars */
function sanitizePhone(val: string): string {
  return val.replace(/\D/g, "").slice(0, 10);
}

function parseOperatingHours(val: string): { openTime: string; closeTime: string } {
  if (!val) return { openTime: "06:00", closeTime: "22:00" };
  const parts = val.split(/\s*-\s*/);
  return {
    openTime: parts[0]?.trim() || "06:00",
    closeTime: parts[1]?.trim() || "22:00",
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function LocationsWorkspace() {
  const { user } = useAuth();
  const isSuperAdmin = !!(user?.isSuperAdmin) || user?.role === "Super Admin";

  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<LocationRow | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [scheduleBranch, setScheduleBranch] = React.useState<LocationRow | null>(null);

  // Filter & Search states
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Form state
  const [locName, setLocName] = React.useState("");
  const [locCity, setLocCity] = React.useState("Bengaluru");
  const [locAddress, setLocAddress] = React.useState("");
  const [locPhone, setLocPhone] = React.useState("");
  const [locPhoneError, setLocPhoneError] = React.useState("");
  const [locCapacity, setLocCapacity] = React.useState(150);
  const [locTenantId, setLocTenantId] = React.useState("");
  const [locLatitude, setLocLatitude] = React.useState("");
  const [locLongitude, setLocLongitude] = React.useState("");
  const [locGeofenceRadius, setLocGeofenceRadius] = React.useState(200);
  const [locGeofenceEnforcement, setLocGeofenceEnforcement] = React.useState<"STRICT" | "FLAG_AUDIT">("STRICT");
  const [detectingGps, setDetectingGps] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const canEditLocations = isSuperAdmin || user?.userType === "tenant" || (typeof user?.role === "string" && (user.role.includes("Admin") || user.role.includes("admin")));

  // Clock Picker state
  const [openTime, setOpenTime] = React.useState("06:00");
  const [closeTime, setCloseTime] = React.useState("22:00");

  const loadLocations = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLocationsApi();
      setLocations(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load studio locations");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTenants = React.useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await fetchTenantsForDropdownApi();
      setTenants(data);
    } catch {
      // Non-critical — tenant dropdown will be empty
    }
  }, [isSuperAdmin]);

  React.useEffect(() => {
    loadLocations();
    loadTenants();
  }, [loadLocations, loadTenants]);

  const handleOpenCreate = () => {
    if (!isSuperAdmin) {
      toast.error("Only Platform Super Admins can create studio branches.");
      return;
    }
    setEditingLocation(null);
    setLocName("");
    setLocCity("Bengaluru");
    setLocAddress("");
    setLocPhone("");
    setLocPhoneError("");
    setLocCapacity(150);
    setLocTenantId(tenants[0]?.id || "");
    setLocLatitude("");
    setLocLongitude("");
    setLocGeofenceRadius(200);
    setLocGeofenceEnforcement("STRICT");
    setOpenTime("06:00");
    setCloseTime("22:00");
    setModalOpen(true);
  };

  const handleOpenEdit = (loc: LocationRow) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCity(loc.city);
    setLocAddress(loc.address || "");
    const rawPhone = (loc.phone || "").replace(/\D/g, "").slice(-10);
    setLocPhone(rawPhone);
    setLocPhoneError("");
    setLocCapacity(loc.capacity || 100);
    setLocTenantId(loc.tenant || "");
    setLocLatitude(loc.latitude !== undefined && loc.latitude !== null ? String(loc.latitude) : "");
    setLocLongitude(loc.longitude !== undefined && loc.longitude !== null ? String(loc.longitude) : "");
    setLocGeofenceRadius(loc.geofence_radius_meters || 200);
    setLocGeofenceEnforcement(loc.geofence_enforcement || "STRICT");
    const { openTime: op, closeTime: cl } = parseOperatingHours(loc.operating_hours || "06:00 - 22:00");
    setOpenTime(op);
    setCloseTime(cl);
    setModalOpen(true);
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLatitude(pos.coords.latitude.toFixed(6));
        setLocLongitude(pos.coords.longitude.toFixed(6));
        setDetectingGps(false);
        toast.success(`Coordinates detected: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setDetectingGps(false);
        toast.error(`GPS Error: ${err.message}. Please allow location access in your browser.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleOpenSchedule = (loc: LocationRow) => {
    setScheduleBranch(loc);
    setScheduleModalOpen(true);
  };

  const handlePhoneChange = (val: string) => {
    if (!canEditLocations) return;
    const digits = sanitizePhone(val);
    setLocPhone(digits);
    if (digits.length > 0 && digits.length < 10) {
      setLocPhoneError("Phone must be exactly 10 digits");
    } else {
      setLocPhoneError("");
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditLocations) {
      toast.error("You do not have permission to modify studio branch settings.");
      return;
    }

    if (!locName.trim()) { toast.error("Please enter a studio name"); return; }
    if (locPhone && locPhone.length !== 10) {
      setLocPhoneError("Phone must be exactly 10 digits");
      toast.error("Contact phone must be exactly 10 digits");
      return;
    }
    if (!locTenantId && isSuperAdmin) {
      toast.error("Please select a tenant organisation for this branch");
      return;
    }

    setSaving(true);
    try {
      const operatingHours = `${openTime} - ${closeTime}`;
      const payload: Partial<LocationRow> = {
        name: locName.trim(),
        city: locCity.trim(),
        address: locAddress.trim(),
        phone: locPhone || "",
        capacity: Number(locCapacity) || 100,
        operating_hours: operatingHours,
        latitude: locLatitude ? parseFloat(locLatitude) : null,
        longitude: locLongitude ? parseFloat(locLongitude) : null,
        geofence_radius_meters: Number(locGeofenceRadius) || 200,
        geofence_enforcement: locGeofenceEnforcement,
        is_active: true,
        ...(locTenantId ? { tenant: locTenantId } : {}),
      };

      if (editingLocation) {
        await updateLocationApi(editingLocation.id, payload);
        toast.success(`"${locName}" updated successfully`);
      } else {
        await createLocationApi(payload);
        toast.success(`Branch "${locName}" created successfully`);
      }

      setModalOpen(false);
      loadLocations();
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.tenant?.[0] || err?.message || "Failed to save location";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (loc: LocationRow) => {
    if (!isSuperAdmin) {
      toast.error("Only Platform Super Admins can delete studio branches.");
      return;
    }
    if (!window.confirm(`Delete branch "${loc.name}"? This cannot be undone.`)) return;
    try {
      await deleteLocationApi(loc.id);
      toast.success(`Branch "${loc.name}" deleted`);
      loadLocations();
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.message || "Failed to delete location";
      toast.error(detail);
    }
  };

  // Filtered locations
  const filteredLocations = React.useMemo(() => {
    return locations.filter((loc) => {
      // Tenant filter (super admin only)
      if (isSuperAdmin && tenantFilter !== "all") {
        if (loc.tenant !== tenantFilter && loc.tenant_name !== tenantFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesCity = loc.city.toLowerCase().includes(q);
        const matchesAddress = (loc.address || "").toLowerCase().includes(q);
        const matchesTenant = (loc.tenant_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesAddress && !matchesTenant) return false;
      }
      return true;
    });
  }, [locations, isSuperAdmin, tenantFilter, searchQuery]);

  const totalCapacity = filteredLocations.reduce((sum, l) => sum + Number(l.capacity || 0), 0);
  const activeCount = filteredLocations.filter((l) => l.is_active).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Studio Locations & Branches"
        subtitle="Manage physical studio branches, maximum client capacities, operating schedules, and facility allocations."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLocations} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {/* Only Super Admins can create branches */}
            {isSuperAdmin && (
              <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary text-primary-foreground shadow-xs">
                <Plus className="h-4 w-4" />
                Add Studio Branch
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* Role notice for Tenant Admins */}
        {!isSuperAdmin && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Platform Policy:</strong> Studio branches and physical facilities are provisioned and configured exclusively by Platform Super Administrators. Tenant Administrators have read-only visibility.
            </span>
          </div>
        )}

        {/* Super Admin Filter Bar */}
        {isSuperAdmin && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search branch name, city, address..."
                  className="pl-9 h-8 text-xs bg-background w-full"
                />
              </div>

              {/* Filter by Tenant */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="shrink-0 text-[11px] font-medium">Tenant:</span>
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="h-8 w-full sm:w-auto max-w-[210px] rounded-md border border-input bg-background px-2.5 pr-7 text-xs appearance-none cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none truncate"
                  >
                    <option value="all">All Tenant Brands ({locations.length})</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-muted-foreground shrink-0 sm:border-l sm:border-border/60 sm:pl-3">
              Showing <span className="font-semibold text-foreground">{filteredLocations.length}</span> of {locations.length} branches
            </div>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiTile label="Active Branches" value={activeCount} delta="Operational" tone="default" />
          <KpiTile label="Floor Capacity" value={totalCapacity.toLocaleString()} delta="Athletes" tone="positive" />
          <KpiTile label="Metropolitan Hubs" value={new Set(filteredLocations.map((l) => l.city)).size} delta="Cities" tone="default" />
          <KpiTile label="Governance" value={isSuperAdmin ? "Super Admin" : "Managed"} delta={isSuperAdmin ? "Full Control" : "Read-only"} tone="positive" />
        </div>

        {/* Locations Grid */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading studio locations...
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No studio branches found</p>
            {isSuperAdmin && (
              <p className="text-xs mt-1 text-muted-foreground">
                {locations.length > 0 ? "Try adjusting your filters or search query." : 'Click "Add Studio Branch" to create your first location.'}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md min-w-0"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5 mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                        <Building className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug truncate" title={loc.name}>
                          {loc.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 text-primary shrink-0" /> {loc.city}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] sm:text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                        loc.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {loc.is_active ? "Operational" : "Inactive"}
                    </span>
                  </div>

                  {/* Tenant badge — super admin can see which org this branch belongs to */}
                  {isSuperAdmin && loc.tenant_name && (
                    <div className="mb-2.5 inline-flex items-center gap-1.5 max-w-full rounded-md bg-purple-500/10 border border-purple-500/20 px-2.5 py-1">
                      <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 truncate">
                        Tenant: {loc.tenant_name} {loc.tenant ? `(${loc.tenant})` : ""}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {loc.address || "Studio address on record."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/40 text-xs">
                    <div className="space-y-1 min-w-0">
                      <span className="text-muted-foreground flex items-center gap-1 truncate text-[11px]">
                        <Users className="h-3.5 w-3.5 shrink-0" /> Max Capacity
                      </span>
                      <span className="font-semibold text-foreground truncate block">{loc.capacity} athletes</span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-muted-foreground flex items-center gap-1 truncate text-[11px]">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> Operating Hours
                      </span>
                      <span className="font-semibold text-foreground truncate block">{loc.operating_hours || "06:00 - 22:00"}</span>
                    </div>
                  </div>

                  {/* Geofencing & GPS summary pill */}
                  <div className="mt-3 flex items-center justify-between text-2xs p-2 rounded-lg bg-muted/40 border border-border/60">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{loc.latitude ? `${Number(loc.latitude).toFixed(3)}, ${Number(loc.longitude).toFixed(3)}` : "GPS Not Set"}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="text-muted-foreground">Radius:</span>
                      <span className="text-foreground">{loc.geofence_radius_meters || 200}m</span>
                      <span className={`px-1 py-0.2 rounded text-3xs ${loc.geofence_enforcement === 'FLAG_AUDIT' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary font-bold'}`}>
                        {loc.geofence_enforcement || 'STRICT'}
                      </span>
                    </span>
                  </div>

                  {loc.phone && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground font-mono truncate">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">+91 {loc.phone.slice(0, 5)} {loc.phone.slice(5)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSchedule(loc)}
                    className="flex-1 text-xs gap-1.5 h-8 min-w-0 border-primary/30 hover:border-primary text-primary hover:bg-primary/10 font-medium"
                    title="Configure recurring weekly schedule, closed days, and festive closures"
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Schedule & Holidays</span>
                  </Button>
                  {canEditLocations ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(loc)}
                        className="text-xs gap-1.5 h-8 px-2.5 shrink-0 hover:border-primary text-primary"
                        title="Configure branch details & geofence threshold"
                      >
                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLocation(loc)}
                          className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 px-2.5 shrink-0"
                          title="Delete branch (Super Admin only)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(loc)}
                      className="text-xs gap-1.5 h-8 px-2.5 text-muted-foreground hover:text-foreground shrink-0"
                      title="View branch details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit / View Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-base">
                      {isSuperAdmin
                        ? (editingLocation ? `Edit Branch: ${editingLocation.name}` : "Add Studio Branch")
                        : `Branch Facility: ${editingLocation?.name || ""}`}
                    </h3>
                    {!isSuperAdmin && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">Platform Managed · Read Only</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors text-sm p-1">
                  ✕
                </button>
              </div>

              {!isSuperAdmin && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border/50">
                  This studio location is centrally managed by the Platform Super Administrator. Contact platform operations to request capacity, scheduling, or address changes.
                </div>
              )}

              <form onSubmit={handleSaveLocation} className="space-y-4 text-xs sm:text-sm">
                {/* Tenant selector — super admin can view/reassign on create or edit */}
                {isSuperAdmin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_tenant">
                      Tenant Organisation *
                      <span className="ml-2 text-[10px] text-purple-500 font-normal">(Super Admin Managed)</span>
                    </Label>
                    <div className="relative">
                      <select
                        id="loc_tenant"
                        value={locTenantId}
                        onChange={(e) => setLocTenantId(e.target.value)}
                        required
                        className="w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      >
                        <option value="">— Select tenant organisation —</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.id})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Select which tenant brand owns and operates this physical facility.</p>
                  </div>
                )}

                {/* Studio name */}
                <div className="space-y-1.5">
                  <Label htmlFor="loc_name">Studio Name *</Label>
                  <Input
                    id="loc_name"
                    value={locName}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Indiranagar Flagship Studio"
                    required
                  />
                </div>

                {/* City + Capacity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_city">City *</Label>
                    <Input
                      id="loc_city"
                      value={locCity}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setLocCity(e.target.value)}
                      placeholder="Bengaluru"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_capacity">Max Capacity *</Label>
                    <Input
                      id="loc_capacity"
                      type="number"
                      min={1}
                      value={locCapacity}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setLocCapacity(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="loc_address">Address</Label>
                  <Input
                    id="loc_address"
                    value={locAddress}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setLocAddress(e.target.value)}
                    placeholder="Street address / Landmark"
                  />
                </div>

                {/* Phone — 10-digit only */}
                <div className="space-y-1.5">
                  <Label htmlFor="loc_phone">Contact Phone</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-sm text-muted-foreground font-mono">+91</span>
                    </div>
                    <Input
                      id="loc_phone"
                      type="tel"
                      inputMode="numeric"
                      value={locPhone}
                      disabled={!isSuperAdmin}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="10-digit number"
                      maxLength={10}
                      className={`pl-11 font-mono ${locPhoneError ? "border-rose-500 focus-visible:ring-rose-500/30" : ""}`}
                    />
                    {locPhone.length === 10 && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                    {locPhoneError && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                    )}
                  </div>
                  {locPhoneError && (
                    <p className="text-[10px] text-rose-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {locPhoneError}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Enter exactly 10 digits — stored as {locPhone ? `+91 ${locPhone.slice(0, 5)} ${locPhone.slice(5)}` : "+91 XXXXX XXXXX"}
                  </p>
                </div>

                {/* Geofence & Location Coordinates Section */}
                <div className="space-y-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Studio GPS & Geofencing Attendance Limit
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={detectingGps || !canEditLocations}
                      onClick={handleDetectGps}
                      className="h-7 text-2xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      title="Autofill current device GPS latitude and longitude"
                    >
                      <RefreshCw className={`h-3 w-3 ${detectingGps ? "animate-spin" : ""}`} />
                      <span>{detectingGps ? "Detecting GPS..." : "Detect Current GPS"}</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="loc_lat" className="text-2xs text-muted-foreground">Latitude</Label>
                      <Input
                        id="loc_lat"
                        type="number"
                        step="0.000001"
                        value={locLatitude}
                        disabled={!canEditLocations}
                        onChange={(e) => setLocLatitude(e.target.value)}
                        placeholder="e.g. 12.971598"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="loc_lon" className="text-2xs text-muted-foreground">Longitude</Label>
                      <Input
                        id="loc_lon"
                        type="number"
                        step="0.000001"
                        value={locLongitude}
                        disabled={!canEditLocations}
                        onChange={(e) => setLocLongitude(e.target.value)}
                        placeholder="e.g. 77.594562"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="loc_geofence" className="text-2xs text-muted-foreground">Max Allowed Distance (Meters)</Label>
                      <Input
                        id="loc_geofence"
                        type="number"
                        min={10}
                        max={5000}
                        value={locGeofenceRadius}
                        disabled={!canEditLocations}
                        onChange={(e) => setLocGeofenceRadius(Number(e.target.value))}
                        placeholder="200"
                        className="h-8 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">Max radius for staff & member check-in</span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="loc_policy" className="text-2xs text-muted-foreground">Enforcement Mode</Label>
                      <select
                        id="loc_policy"
                        value={locGeofenceEnforcement}
                        disabled={!canEditLocations}
                        onChange={(e) => setLocGeofenceEnforcement(e.target.value as "STRICT" | "FLAG_AUDIT")}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="STRICT">Strict Lock (Block Outside Radius)</option>
                        <option value="FLAG_AUDIT">Flag for Audit Only</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground">Policy applied when attendee is outside radius</span>
                    </div>
                  </div>
                </div>

                {/* Operating Hours — Analog Radial Clock Pickers (Responsive) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#e06d2d]" />
                    Operating Hours
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        Opens At
                      </span>
                      <ClockTimePicker
                        id="loc_open_time"
                        value={openTime}
                        disabled={!canEditLocations}
                        placeholder="Select Opening Time"
                        onChange={(time24) => setOpenTime(time24)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        Closes At
                      </span>
                      <ClockTimePicker
                        id="loc_close_time"
                        value={closeTime}
                        disabled={!canEditLocations}
                        placeholder="Select Closing Time"
                        onChange={(time24) => setCloseTime(time24)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>Operating Schedule:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {openTime} - {closeTime}
                    </span>
                  </div>

                  {editingLocation && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const target = editingLocation;
                          setModalOpen(false);
                          handleOpenSchedule(target);
                        }}
                        className="w-full text-xs gap-2 h-9 border-primary/30 text-primary hover:bg-primary/10 font-medium"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Manage Weekly Closed Days & Festive Holidays →
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    {canEditLocations ? "Cancel" : "Close"}
                  </Button>
                  {canEditLocations && (
                    <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground min-w-[120px]">
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                        </span>
                      ) : editingLocation ? "Update Branch" : "Create Branch"}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Branch Schedule & Operating Exceptions Modal */}
        <BranchScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          branch={scheduleBranch}
          availableBranches={locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            city: loc.city,
          }))}
        />
      </PageBody>
    </div>
  );
}
