import * as React from "react";
import {
  MapPin, Plus, Phone, Clock, Users, Building, Edit2, Trash2, RefreshCw,
  ChevronDown, CheckCircle2, AlertCircle, Building2, Eye, Search, Filter,
  CalendarDays, Globe, Power, Mail, Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  deactivateLocationApi,
  reactivateLocationApi,
  fetchCompanyEntitiesApi,
  fetchTenantsForDropdownApi,
  type LocationRow,
} from "@/api/endpoints/api-admin";
import { usePermissions } from "@/lib/permissions";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseOperatingHours(val: string): { openTime: string; closeTime: string } {
  if (!val) return { openTime: "06:00", closeTime: "22:00" };
  const parts = val.split(/\s*-\s*/);
  return {
    openTime: parts[0]?.trim() || "06:00",
    closeTime: parts[1]?.trim() || "22:00",
  };
}

function validateInternationalPhone(val: string): string | null {
  if (!val || !val.trim()) return null;
  const cleaned = val.trim();
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(cleaned)) {
    return "Please enter a valid phone number (7 to 20 digits, optional country code)";
  }
  return null;
}

const COMMON_TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +05:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +04:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +08:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function LocationsWorkspace() {
  const { can, isSuperAdmin } = usePermissions();

  // Centralized RBAC permissions — never hardcoded role names
  const canCreate = can("core.settings.edit") || isSuperAdmin;
  const canEdit = can("core.settings.edit") || isSuperAdmin;
  const canDeactivate = can("core.settings.edit") || isSuperAdmin;

  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);
  const [companyEntities, setCompanyEntities] = React.useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<LocationRow | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [scheduleBranch, setScheduleBranch] = React.useState<LocationRow | null>(null);

  // Filter & Search states
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [passportFilter, setPassportFilter] = React.useState<"all" | "eligible" | "standard">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Form state
  const [locName, setLocName] = React.useState("");
  const [locCode, setLocCode] = React.useState("");
  const [locCodeTouched, setLocCodeTouched] = React.useState(false);
  const [locCity, setLocCity] = React.useState("Bengaluru");
  const [locAddress, setLocAddress] = React.useState("");
  const [locPhone, setLocPhone] = React.useState("");
  const [locEmail, setLocEmail] = React.useState("");
  const [locTimezone, setLocTimezone] = React.useState("Asia/Kolkata");
  const [locPassport, setLocPassport] = React.useState(false);
  const [locCompanyEntity, setLocCompanyEntity] = React.useState("");
  const [locCapacity, setLocCapacity] = React.useState(150);
  const [locTenantId, setLocTenantId] = React.useState("");
  const [locLatitude, setLocLatitude] = React.useState("");
  const [locLongitude, setLocLongitude] = React.useState("");
  const [locGeofenceRadius, setLocGeofenceRadius] = React.useState(200);
  const [locGeofenceEnforcement, setLocGeofenceEnforcement] = React.useState<"STRICT" | "FLAG_AUDIT">("STRICT");
  const [detectingGps, setDetectingGps] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Field validation and form error states
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formGeneralError, setFormGeneralError] = React.useState<string | null>(null);

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
      // Non-critical
    }
  }, [isSuperAdmin]);

  const loadCompanyEntities = React.useCallback(async () => {
    try {
      const entities = await fetchCompanyEntitiesApi();
      setCompanyEntities(entities);
    } catch {
      // Non-critical
    }
  }, []);

  React.useEffect(() => {
    loadLocations();
    loadTenants();
    loadCompanyEntities();
  }, [loadLocations, loadTenants, loadCompanyEntities]);

  const handleNameChange = (nameVal: string) => {
    setLocName(nameVal);
    // Auto-suggest machine code on new branch creation if untouched
    if (!editingLocation && !locCodeTouched) {
      const suggested = nameVal
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .slice(0, 30);
      setLocCode(suggested);
    }
  };

  const handleOpenCreate = () => {
    if (!canCreate) {
      toast.error("You do not have permission to create studio branches.");
      return;
    }
    setEditingLocation(null);
    setLocName("");
    setLocCode("");
    setLocCodeTouched(false);
    setLocCity("Bengaluru");
    setLocAddress("");
    setLocPhone("");
    setLocEmail("");
    setLocTimezone("Asia/Kolkata");
    setLocPassport(false);
    setLocCompanyEntity("");
    setLocCapacity(150);
    setLocTenantId(tenants[0]?.id || "");
    setLocLatitude("");
    setLocLongitude("");
    setLocGeofenceRadius(200);
    setLocGeofenceEnforcement("STRICT");
    setOpenTime("06:00");
    setCloseTime("22:00");
    setFieldErrors({});
    setFormGeneralError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (loc: LocationRow) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.code || "");
    setLocCodeTouched(true);
    setLocCity(loc.city);
    setLocAddress(loc.address || "");
    setLocPhone(loc.phone || "");
    setLocEmail(loc.email || "");
    setLocTimezone(loc.timezone || "Asia/Kolkata");
    setLocPassport(Boolean(loc.is_passport_eligible));
    setLocCompanyEntity(loc.company_entity || "");
    setLocCapacity(loc.capacity || 100);
    setLocTenantId(loc.tenant || "");
    setLocLatitude(loc.latitude !== undefined && loc.latitude !== null ? String(loc.latitude) : "");
    setLocLongitude(loc.longitude !== undefined && loc.longitude !== null ? String(loc.longitude) : "");
    setLocGeofenceRadius(loc.geofence_radius_meters || 200);
    setLocGeofenceEnforcement(loc.geofence_enforcement || "STRICT");
    const { openTime: op, closeTime: cl } = parseOperatingHours(loc.operating_hours || "06:00 - 22:00");
    setOpenTime(op);
    setCloseTime(cl);
    setFieldErrors({});
    setFormGeneralError(null);
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

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error("You do not have permission to modify studio branch settings.");
      return;
    }

    if (!locName.trim()) { toast.error("Please enter a studio name"); return; }
    if (!locCode.trim()) { toast.error("Please enter a unique branch code"); return; }

    const phoneError = validateInternationalPhone(locPhone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    if (!locTenantId && isSuperAdmin && tenants.length > 0) {
      toast.error("Please select a tenant organisation for this branch");
      return;
    }

    setSaving(true);
    setFieldErrors({});
    setFormGeneralError(null);
    try {
      const operatingHours = `${openTime} - ${closeTime}`;
      const payload: Partial<LocationRow> = {
        name: locName.trim(),
        code: locCode.trim().toUpperCase(),
        city: locCity.trim(),
        address: locAddress.trim(),
        phone: locPhone.trim(),
        email: locEmail.trim(),
        timezone: locTimezone,
        capacity: Number(locCapacity) || 0,
        business_open_time: openTime,
        business_close_time: closeTime,
        operating_hours: operatingHours,
        is_passport_eligible: locPassport,
        company_entity: locCompanyEntity ? locCompanyEntity : null,
        latitude: locLatitude ? parseFloat(locLatitude) : null,
        longitude: locLongitude ? parseFloat(locLongitude) : null,
        geofence_radius_meters: Number(locGeofenceRadius) || 200,
        geofence_enforcement: locGeofenceEnforcement,
        is_active: editingLocation ? editingLocation.is_active : true,
        status: editingLocation ? (editingLocation.status || "ACTIVE") : "ACTIVE",
        ...(locTenantId ? { tenant: locTenantId } : {}),
      };

      if (editingLocation) {
        await updateLocationApi(editingLocation.id, payload);
        toast.success(`Branch "${locName}" updated successfully`);
      } else {
        await createLocationApi(payload);
        toast.success(`Branch "${locName}" (${payload.code}) created successfully`);
      }

      setModalOpen(false);
      loadLocations();
    } catch (err: any) {
      const data = err?.response?.data;
      const newFieldErrors: Record<string, string> = {};
      let firstInvalidFieldId: string | null = null;
      let toastMsg = "";

      if (data && typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
          const msg = Array.isArray(value)
            ? value.join(" ")
            : typeof value === "string"
            ? value
            : JSON.stringify(value);

          if (
            [
              "name",
              "code",
              "city",
              "address",
              "timezone",
              "phone",
              "email",
              "capacity",
              "business_open_time",
              "business_close_time",
              "latitude",
              "longitude",
              "geofence_radius_meters",
              "company_entity",
            ].includes(key)
          ) {
            newFieldErrors[key] = msg;
            if (!firstInvalidFieldId) {
              firstInvalidFieldId = `loc_${key}`;
            }
            if (!toastMsg && key === "code") {
              toastMsg = msg;
            }
          } else if (key === "non_field_errors" || key === "detail") {
            setFormGeneralError(msg);
            if (!toastMsg) toastMsg = msg;
          }
        }
      }

      setFieldErrors(newFieldErrors);
      if (!toastMsg) {
        toastMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to save branch. Please check the highlighted errors.";
      }
      toast.error(toastMsg);

      if (firstInvalidFieldId) {
        setTimeout(() => {
          const el = document.getElementById(firstInvalidFieldId!);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (loc: LocationRow) => {
    if (!canDeactivate) {
      toast.error("You do not have permission to change branch operational status.");
      return;
    }
    const isDeactivating = loc.is_active;
    const actionLabel = isDeactivating ? "Deactivate" : "Reactivate";
    const confirmMessage = isDeactivating
      ? `Deactivate branch "${loc.name}"? Historical bookings, classes, and memberships remain intact, but new operations will be disabled.`
      : `Reactivate branch "${loc.name}" to resume operations?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      if (isDeactivating) {
        await deactivateLocationApi(loc.id, "Deactivated from studio administration.");
        toast.success(`Branch "${loc.name}" deactivated`);
      } else {
        await reactivateLocationApi(loc.id);
        toast.success(`Branch "${loc.name}" reactivated`);
      }
      loadLocations();
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail || err?.message || `Failed to ${actionLabel.toLowerCase()} branch`;
      toast.error(detail);
    }
  };

  const handleDeleteLocation = async (loc: LocationRow) => {
    if (!canDeactivate) {
      toast.error("You do not have permission to delete studio branches.");
      return;
    }
    if (loc.can_delete === false) {
      toast.error(loc.delete_blocked_reason || "This branch has operational history. Deactivate it instead.");
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete "${loc.name}" (${loc.code})?\n\nThis action is only available because the branch has no operational history.`
    );
    if (!confirmed) return;

    try {
      await deleteLocationApi(loc.id);
      toast.success(`Branch "${loc.name}" deleted permanently.`);
      loadLocations();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "This branch cannot be permanently deleted. Deactivate it instead.";
      toast.error(detail);
    }
  };

  // Filtered locations
  const filteredLocations = React.useMemo(() => {
    return locations.filter((loc) => {
      // Tenant filter (platform admin only)
      if (isSuperAdmin && tenantFilter !== "all") {
        if (loc.tenant !== tenantFilter && loc.tenant_name !== tenantFilter) {
          return false;
        }
      }
      // Status filter
      if (statusFilter === "active" && !loc.is_active) return false;
      if (statusFilter === "inactive" && loc.is_active) return false;

      // Passport filter
      if (passportFilter === "eligible" && !loc.is_passport_eligible) return false;
      if (passportFilter === "standard" && loc.is_passport_eligible) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesCode = (loc.code || "").toLowerCase().includes(q);
        const matchesCity = loc.city.toLowerCase().includes(q);
        const matchesAddress = (loc.address || "").toLowerCase().includes(q);
        const matchesTenant = (loc.tenant_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCity && !matchesAddress && !matchesTenant) return false;
      }
      return true;
    });
  }, [locations, isSuperAdmin, tenantFilter, statusFilter, passportFilter, searchQuery]);

  const totalCapacity = filteredLocations.reduce((sum, l) => sum + Number(l.capacity || 0), 0);
  const activeCount = filteredLocations.filter((l) => l.is_active).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Studio Locations & Branches"
        subtitle="Manage physical studio branches, operating schedules, geofences, and multi-location governance."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLocations} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary text-primary-foreground shadow-xs">
                <Plus className="h-4 w-4" />
                Add Studio Branch
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* Filter and Search Bar */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, code, city..."
                className="pl-9 h-8 text-xs bg-background w-full"
              />
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 text-[11px] font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Filter by Passport */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <span className="shrink-0 text-[11px] font-medium">Cross-Branch:</span>
              <select
                value={passportFilter}
                onChange={(e) => setPassportFilter(e.target.value as any)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Facilities</option>
                <option value="eligible">Passport Allowed</option>
                <option value="standard">Home Branch Only</option>
              </select>
            </div>

            {/* Tenant Filter (Super Admin only) */}
            {isSuperAdmin && tenants.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <span className="shrink-0 text-[11px] font-medium">Brand:</span>
                <select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="h-8 max-w-[180px] rounded-md border border-input bg-background px-2.5 text-xs truncate cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Brands ({locations.length})</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-[11px] sm:text-xs text-muted-foreground shrink-0 md:border-l md:border-border/60 md:pl-3">
            Showing <span className="font-semibold text-foreground">{filteredLocations.length}</span> of {locations.length} studios
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiTile label="Operational Branches" value={activeCount} delta="Active" tone="default" />
          <KpiTile label="Floor Capacity" value={totalCapacity.toLocaleString()} delta="Athletes Max" tone="positive" />
          <KpiTile label="Metropolitan Hubs" value={new Set(filteredLocations.map((l) => l.city)).size} delta="Cities" tone="default" />
          <KpiTile label="Passport Hubs" value={filteredLocations.filter((l) => l.is_passport_eligible).length} delta="Cross-Branch" tone="positive" />
        </div>

        {/* Locations Grid */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading studio branches...
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No studio branches found</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {locations.length > 0 ? "Try adjusting your search query or filters." : 'Click "Add Studio Branch" to register your first studio.'}
            </p>
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
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {loc.code && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40 font-semibold">
                              {loc.code}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-primary shrink-0" /> {loc.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                        loc.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {loc.is_active ? "Operational" : "Inactive"}
                    </span>
                  </div>

                  {/* Badges strip: Passport & Legal Entity */}
                  <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                    {loc.is_passport_eligible ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5">
                        <Globe className="h-3 w-3 shrink-0" />
                        Passport Access Allowed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground bg-muted/40 border border-border/40 rounded-md px-2 py-0.5">
                        Home Branch Only
                      </span>
                    )}
                    {loc.company_entity_name && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-0.5 truncate max-w-[200px]" title={loc.company_entity_name}>
                        <Building2 className="h-3 w-3 shrink-0" />
                        {loc.company_entity_name}
                      </span>
                    )}
                  </div>

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
                  <div className="mt-3 flex items-center justify-between text-2xs p-2 rounded-lg bg-muted/40 border border-border/60 flex-wrap gap-1">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{loc.latitude ? `${Number(loc.latitude).toFixed(3)}, ${Number(loc.longitude).toFixed(3)}` : "GPS Not Set"}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="text-muted-foreground">Radius:</span>
                      <span className="text-foreground">{loc.geofence_radius_meters || 200}m</span>
                      <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${loc.geofence_enforcement === 'FLAG_AUDIT' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                        {loc.geofence_enforcement || 'STRICT'}
                      </span>
                    </span>
                  </div>

                  {/* Contact details */}
                  <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                    {loc.phone && (
                      <div className="flex items-center gap-1.5 font-mono truncate">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{loc.phone}</span>
                      </div>
                    )}
                    {loc.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{loc.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions toolbar */}
                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSchedule(loc)}
                    className="flex-1 text-xs gap-1.5 h-8 min-w-[130px] border-primary/30 hover:border-primary text-primary hover:bg-primary/10 font-medium"
                    title="Configure recurring weekly schedule, closed days, and festive closures"
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Schedule & Exceptions</span>
                  </Button>

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(loc)}
                      className="text-xs gap-1.5 h-8 px-2.5 shrink-0 hover:border-primary text-primary"
                      title="Edit branch details & geofence"
                    >
                      <Edit2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  )}

                  {canDeactivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(loc)}
                      className={`text-xs gap-1 h-8 px-2.5 shrink-0 ${loc.is_active ? "text-amber-600 hover:bg-amber-500/10 hover:border-amber-400" : "text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-400"}`}
                      title={loc.is_active ? "Deactivate branch (preserve historical data)" : "Reactivate branch"}
                    >
                      <Power className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{loc.is_active ? "Deactivate" : "Activate"}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg">
                    {editingLocation ? `Edit Branch: ${editingLocation.name}` : "Create Studio Branch"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLocation} className="space-y-4 text-xs sm:text-sm">
                {/* Form General Error Alert */}
                {formGeneralError && (
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{formGeneralError}</span>
                  </div>
                )}

                {/* Platform Admin Tenant Selector (if superadmin) */}
                {isSuperAdmin && tenants.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_tenant">Tenant Brand *</Label>
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
                          <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Name & Stable Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_name">Studio Name *</Label>
                    <Input
                      id="loc_name"
                      value={locName}
                      onChange={(e) => {
                        handleNameChange(e.target.value);
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.name;
                            return c;
                          });
                        }
                      }}
                      placeholder="e.g. Andheri West Studio"
                      required
                      className={cn(fieldErrors.name && "border-destructive focus-visible:ring-destructive text-destructive")}
                      aria-invalid={Boolean(fieldErrors.name)}
                    />
                    {fieldErrors.name && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loc_code">
                      Branch Code *
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">(Stable ID)</span>
                    </Label>
                    <Input
                      id="loc_code"
                      value={locCode}
                      onChange={(e) => {
                        setLocCodeTouched(true);
                        setLocCode(e.target.value.toUpperCase());
                        if (fieldErrors.code) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.code;
                            return c;
                          });
                        }
                      }}
                      placeholder="e.g. ANDHERI_WEST"
                      required
                      className={cn("font-mono uppercase", fieldErrors.code && "border-destructive focus-visible:ring-destructive text-destructive")}
                      aria-invalid={Boolean(fieldErrors.code)}
                    />
                    {fieldErrors.code && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.code}
                      </p>
                    )}
                  </div>
                </div>

                {/* City + Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_city">City / Area *</Label>
                    <Input
                      id="loc_city"
                      value={locCity}
                      onChange={(e) => {
                        setLocCity(e.target.value);
                        if (fieldErrors.city) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.city;
                            return c;
                          });
                        }
                      }}
                      placeholder="Mumbai"
                      required
                      className={cn(fieldErrors.city && "border-destructive focus-visible:ring-destructive text-destructive")}
                      aria-invalid={Boolean(fieldErrors.city)}
                    />
                    {fieldErrors.city && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loc_timezone">Timezone *</Label>
                    <div className="relative">
                      <select
                        id="loc_timezone"
                        value={locTimezone}
                        onChange={(e) => {
                          setLocTimezone(e.target.value);
                          if (fieldErrors.timezone) {
                            setFieldErrors((prev) => {
                              const c = { ...prev };
                              delete c.timezone;
                              return c;
                            });
                          }
                        }}
                        required
                        className={cn(
                          "w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          fieldErrors.timezone && "border-destructive text-destructive"
                        )}
                      >
                        {COMMON_TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    {fieldErrors.timezone && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.timezone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="loc_address">Physical Address</Label>
                  <Input
                    id="loc_address"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    placeholder="Floor, Building, Street, Landmark"
                  />
                </div>

                {/* Contact Phone + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_phone">Contact Phone</Label>
                    <Input
                      id="loc_phone"
                      type="tel"
                      value={locPhone}
                      onChange={(e) => {
                        setLocPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.phone;
                            return c;
                          });
                        }
                      }}
                      placeholder="+91 98765 43210"
                      className={cn("font-mono", fieldErrors.phone && "border-destructive focus-visible:ring-destructive text-destructive")}
                    />
                    {fieldErrors.phone ? (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.phone}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Standard international or local telephone number.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loc_email">Contact Email</Label>
                    <Input
                      id="loc_email"
                      type="email"
                      value={locEmail}
                      onChange={(e) => {
                        setLocEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.email;
                            return c;
                          });
                        }
                      }}
                      placeholder="studio@sweatfit.com"
                      className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive text-destructive")}
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Capacity + Company Entity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc_capacity">Floor / Client Capacity *</Label>
                    <Input
                      id="loc_capacity"
                      type="number"
                      min={0}
                      value={locCapacity}
                      onChange={(e) => {
                        setLocCapacity(Number(e.target.value));
                        if (fieldErrors.capacity) {
                          setFieldErrors((prev) => {
                            const c = { ...prev };
                            delete c.capacity;
                            return c;
                          });
                        }
                      }}
                      required
                      className={cn(fieldErrors.capacity && "border-destructive focus-visible:ring-destructive text-destructive")}
                    />
                    {fieldErrors.capacity ? (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {fieldErrors.capacity}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Maximum simultaneous athletes on floor.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loc_entity">
                      Legal / Company Entity
                      <span className="text-[10px] text-muted-foreground ml-1 font-normal">(Optional)</span>
                    </Label>
                    {companyEntities.length === 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center h-9 px-3 rounded-md border border-input bg-muted/40 text-xs text-foreground font-medium select-none cursor-default">
                          [ Organization Default ]
                        </div>
                        <p className="text-[10.5px] text-muted-foreground leading-normal">
                          No separate company entities are configured. This branch will use the organization&apos;s default legal entity.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="relative">
                          <select
                            id="loc_entity"
                            value={locCompanyEntity}
                            onChange={(e) => setLocCompanyEntity(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:ring-2 focus:ring-primary/30 focus:outline-none"
                          >
                            <option value="">Organization Default</option>
                            {companyEntities.map((ent) => (
                              <option key={ent.id} value={ent.id}>{ent.name} ({ent.code})</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <p className="text-[10.5px] text-muted-foreground leading-normal">
                          Select a specific legal entity or leave as Organization Default.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cross-Branch / Passport Eligibility Toggle */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      Allow Cross-Branch / Passport Visits
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allows eligible memberships from other branches to use this location according to their entitlement policy.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocPassport(!locPassport)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${locPassport ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${locPassport ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {/* Operating Hours Pickers */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Daily Operating Hours
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Opens At</span>
                      <ClockTimePicker
                        id="loc_open_time"
                        value={openTime}
                        placeholder="Select Opening Time"
                        onChange={(time24) => setOpenTime(time24)}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Closes At</span>
                      <ClockTimePicker
                        id="loc_close_time"
                        value={closeTime}
                        placeholder="Select Closing Time"
                        onChange={(time24) => setCloseTime(time24)}
                      />
                    </div>
                  </div>
                </div>

                {/* Geofence & Location Coordinates Section */}
                <div className="space-y-3 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Attendance Geofence & GPS Verification
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={detectingGps}
                      onClick={handleDetectGps}
                      className="h-7 text-2xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
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
                        onChange={(e) => setLocLatitude(e.target.value)}
                        placeholder="e.g. 19.136325"
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
                        onChange={(e) => setLocLongitude(e.target.value)}
                        placeholder="e.g. 72.827660"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="loc_geofence" className="text-2xs text-muted-foreground">Radius (Meters)</Label>
                      <Input
                        id="loc_geofence"
                        type="number"
                        min={10}
                        max={5000}
                        value={locGeofenceRadius}
                        onChange={(e) => setLocGeofenceRadius(Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="loc_policy" className="text-2xs text-muted-foreground">Enforcement Mode</Label>
                      <select
                        id="loc_policy"
                        value={locGeofenceEnforcement}
                        onChange={(e) => setLocGeofenceEnforcement(e.target.value as "STRICT" | "FLAG_AUDIT")}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="STRICT">Strict Lock (Block Outside Radius)</option>
                        <option value="FLAG_AUDIT">Flag for Audit Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground min-w-[120px]">
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </span>
                    ) : editingLocation ? "Update Branch" : "Create Branch"}
                  </Button>
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
