import * as React from "react";
import { 
  Gauge, HardDrive, PhoneCall, Users, MapPin, AlertCircle, Zap, RefreshCw, 
  Search, Filter, ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, 
  Activity, Sparkles, X, ChevronRight, BarChart3, Database, Key, Server
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  fetchTenantUsageApi, 
  fetchTenantUsageSummaryApi, 
  fetchTenantUsageDetailsApi,
  type TenantUsageRow, 
  type UsageSummaryMetrics 
} from "@/services/api-platform";

export function UsageWorkspace() {
  const [usages, setUsages] = React.useState<TenantUsageRow[]>([]);
  const [summary, setSummary] = React.useState<UsageSummaryMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Filtering & Search
  const [search, setSearch] = React.useState("");
  const [selectedTier, setSelectedTier] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"table" | "cards">("table");

  // Detailed Modal / Drawer state
  const [selectedTenant, setSelectedTenant] = React.useState<TenantUsageRow | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [uList, sMetrics] = await Promise.all([
        fetchTenantUsageApi(selectedTier !== "all" ? selectedTier : undefined),
        fetchTenantUsageSummaryApi(),
      ]);
      setUsages(uList);
      setSummary(sMetrics);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tenant resource usage");
    } finally {
      setLoading(false);
    }
  }, [selectedTier]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetails = async (tenantId: string) => {
    setDetailLoading(true);
    try {
      const details = await fetchTenantUsageDetailsApi(tenantId);
      setSelectedTenant(details);
    } catch (err: any) {
      toast.error("Failed to load detailed diagnostics for tenant");
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredUsages = usages.filter((u) => {
    const matchesSearch = 
      u.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_id.toLowerCase().includes(search.toLowerCase()) ||
      (u.plan_name && u.plan_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      selectedStatus === "all" || 
      u.status_label.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Tenant Resource Usage & Limits Management"
        subtitle="Real-time multi-tenant resource consumption, quota thresholds, API throughput, and diagnostic tracking."
        actions={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <PageBody>
        {/* KPI Strip - Database-backed Aggregate Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiTile
            label="Active Managed Members"
            value={summary ? summary.activeManagedMembers.toLocaleString() : "0"}
            delta={`Across ${usages.length} monitored tenant brand${usages.length !== 1 ? "s" : ""}`}
            tone="default"
          />
          <KpiTile
            label="AI Voice Calling Minutes"
            value={summary ? `${summary.aiVoiceCallingMinutes.toLocaleString()} min` : "0 min"}
            delta="Monthly voice telephony aggregate"
            tone="positive"
          />
          <KpiTile
            label="Media Storage Consumed"
            value={summary ? `${summary.mediaStorageConsumedGB} GB` : "0.0 GB"}
            delta="Cloud asset storage utilization"
            tone="default"
          />
          <KpiTile
            label="Brands Nearing Quota"
            value={summary ? `${summary.brandsNearingQuotaCount} Tenant${summary.brandsNearingQuotaCount !== 1 ? "s" : ""}` : "0 Tenants"}
            delta={summary?.brandsNearingQuotaText || "All within safe limits"}
            tone={summary && summary.brandsNearingQuotaCount > 0 ? "warn" : "positive"}
          />
        </div>

        {/* Filter Toolbar & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenant or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/80"
              />
            </div>

            {/* Plan Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border/60 bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Plan Tiers</option>
              <option value="Starter">Starter Tier</option>
              <option value="Growth">Growth Tier</option>
              <option value="Enterprise">Enterprise Tier</option>
            </select>

            {/* Quota Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border/60 bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Quota Statuses</option>
              <option value="Healthy">Healthy (0-40%)</option>
              <option value="Normal">Normal (40-75%)</option>
              <option value="Warning">Warning (75-90%)</option>
              <option value="Near Limit">Near Limit (90-99%)</option>
              <option value="Limit Reached">Limit Reached (100%+)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredUsages.length}</span> of {usages.length} brands
            </span>
            <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Calculating live resource quotas and database utilization...
          </div>
        ) : filteredUsages.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card space-y-2">
            <Database className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <h3 className="font-semibold text-base text-foreground">No matching tenant usage records</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No tenants matched your filter criteria. Try adjusting the search query or status filters.
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* Enterprise Usage Data Table */
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/40 border-b border-border/60 text-xs text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Brand Organization</th>
                    <th className="py-3.5 px-4">Plan & Tier</th>
                    <th className="py-3.5 px-4">Member Base</th>
                    <th className="py-3.5 px-4">AI Voice Quota</th>
                    <th className="py-3.5 px-4">Cloud Storage</th>
                    <th className="py-3.5 px-4">API Throughput</th>
                    <th className="py-3.5 px-4">Overall Quota</th>
                    <th className="py-3.5 px-4 text-right">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsages.map((t) => {
                    const memberPct = t.member_utilization_pct ?? Math.min(100, Math.round((t.active_members_count / (t.max_members || 1)) * 100));
                    const voicePct = t.voice_utilization_pct ?? Math.min(100, Math.round((t.ai_minutes_used / (t.max_ai_minutes || 1)) * 100));
                    const storagePct = t.storage_utilization_pct ?? Math.min(100, Math.round((t.storage_used_mb / (t.max_storage_mb || 1)) * 100));
                    const isLimit = t.status_label === "Limit Reached" || memberPct >= 100 || voicePct >= 100;
                    const isNear = t.status_label === "Near Limit" || memberPct >= 90 || voicePct >= 90;

                    return (
                      <tr key={t.tenant_id} className="hover:bg-muted/20 transition-colors">
                        {/* Tenant Brand */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                              {t.tenant_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{t.tenant_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{t.tenant_id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-foreground">{t.plan_name || t.tenant_tier}</span>
                          <span className="text-[11px] text-muted-foreground block">{t.locations_count} Studio{t.locations_count !== 1 ? "s" : ""}</span>
                        </td>

                        {/* Members */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[130px]">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{t.active_members_count}</span>
                              <span className="text-muted-foreground">/ {t.max_members}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  memberPct >= 100 ? "bg-rose-500" : memberPct >= 90 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${memberPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{memberPct}% Used</span>
                          </div>
                        </td>

                        {/* AI Voice */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{t.ai_minutes_used} m</span>
                              <span className="text-muted-foreground">/ {t.max_ai_minutes} m</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  voicePct >= 100 ? "bg-rose-500" : voicePct >= 90 ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${voicePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{voicePct}% Used</span>
                          </div>
                        </td>

                        {/* Cloud Storage */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{(t.storage_used_mb / 1024).toFixed(1)} GB</span>
                              <span className="text-muted-foreground">/ {(t.max_storage_mb / 1024).toFixed(0)} GB</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                                style={{ width: `${storagePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{storagePct}% Used</span>
                          </div>
                        </td>

                        {/* API Requests */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {t.api_requests_count.toLocaleString()}
                          <span className="text-[10px] text-muted-foreground block font-sans">Calls/mo</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isLimit
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : isNear
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isLimit ? <AlertCircle className="h-3 w-3" /> : isNear ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                            {t.status_label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetails(t.tenant_id)}
                            className="h-8 text-xs gap-1"
                          >
                            Inspect <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredUsages.map((t) => {
              const memberPct = t.member_utilization_pct ?? Math.min(100, Math.round((t.active_members_count / (t.max_members || 1)) * 100));
              const voicePct = t.voice_utilization_pct ?? Math.min(100, Math.round((t.ai_minutes_used / (t.max_ai_minutes || 1)) * 100));
              const storagePct = t.storage_utilization_pct ?? Math.min(100, Math.round((t.storage_used_mb / (t.max_storage_mb || 1)) * 100));
              const isNearLimit = memberPct >= 90 || voicePct >= 90;

              return (
                <div
                  key={t.tenant_id}
                  className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-primary/40 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                        {t.tenant_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{t.tenant_name}</h3>
                        <span className="text-xs text-muted-foreground">ID: {t.tenant_id} • {t.plan_name || t.tenant_tier}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetails(t.tenant_id)}
                      className="h-8 text-xs gap-1"
                    >
                      Diagnostics <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Members */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Members
                        </span>
                        <span className="font-semibold">{t.active_members_count}/{t.max_members}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${memberPct >= 90 ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${memberPct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">{memberPct}% Used</div>
                    </div>

                    {/* AI Voice */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <PhoneCall className="h-3.5 w-3.5" /> AI Calling
                        </span>
                        <span className="font-semibold">{t.ai_minutes_used}/{t.max_ai_minutes}m</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${voicePct >= 90 ? "bg-rose-500" : "bg-blue-500"}`}
                          style={{ width: `${voicePct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">{voicePct}% Used</div>
                    </div>

                    {/* Storage */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5" /> Storage
                        </span>
                        <span className="font-semibold">{(t.storage_used_mb / 1024).toFixed(1)} GB</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${storagePct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">{storagePct}% Used</div>
                    </div>

                    {/* API */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" /> API Calls
                        </span>
                        <span className="font-semibold font-mono">{t.api_requests_count.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        99.98% Healthy Throughput
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Tenant Usage Diagnostics Modal / Drawer */}
        {selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg border border-primary/20">
                    {selectedTenant.tenant_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedTenant.tenant_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Tenant ID: <span className="font-mono">{selectedTenant.tenant_id}</span> • Plan: {selectedTenant.plan_name || selectedTenant.tenant_tier} • Billing Cycle: {selectedTenant.billing_period || "Current Month"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTenant(null)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Resource Quotas Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-primary" /> Live Resource Quota Breakdown
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Members */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-blue-500" /> Active Member Base
                      </span>
                      <span className="font-bold text-sm">{selectedTenant.active_members_count} / {selectedTenant.max_members}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (selectedTenant.member_utilization_pct ?? 0) >= 90 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${selectedTenant.member_utilization_pct ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{selectedTenant.member_utilization_pct}% Utilized</span>
                      <span>{Math.max(0, selectedTenant.max_members - selectedTenant.active_members_count)} Remaining</span>
                    </div>
                  </div>

                  {/* AI Voice Minutes */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <PhoneCall className="h-4 w-4 text-purple-500" /> AI Telephony Minutes
                      </span>
                      <span className="font-bold text-sm">{selectedTenant.ai_minutes_used} / {selectedTenant.max_ai_minutes} m</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (selectedTenant.voice_utilization_pct ?? 0) >= 90 ? "bg-rose-500" : "bg-purple-500"
                        }`}
                        style={{ width: `${selectedTenant.voice_utilization_pct ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{selectedTenant.voice_utilization_pct}% Utilized</span>
                      <span>{Math.max(0, selectedTenant.max_ai_minutes - selectedTenant.ai_minutes_used)} mins left</span>
                    </div>
                  </div>

                  {/* Object Storage */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4 text-emerald-500" /> Cloud Media Storage
                      </span>
                      <span className="font-bold text-sm">{(selectedTenant.storage_used_mb / 1024).toFixed(1)} / {(selectedTenant.max_storage_mb / 1024).toFixed(0)} GB</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${selectedTenant.storage_utilization_pct ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{selectedTenant.storage_utilization_pct}% Utilized</span>
                      <span>{((selectedTenant.max_storage_mb - selectedTenant.storage_used_mb) / 1024).toFixed(1)} GB left</span>
                    </div>
                  </div>

                  {/* API Gateway Requests */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-amber-500" /> API Gateway Requests
                      </span>
                      <span className="font-bold text-sm font-mono">{selectedTenant.api_requests_count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${selectedTenant.api_utilization_pct ?? 15}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{selectedTenant.api_utilization_pct ?? 15}% Utilized</span>
                      <span>Quota: {(selectedTenant.max_api_requests ?? 250000).toLocaleString()} req/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-Day Usage Trend Snapshots */}
              {selectedTenant.historical_snapshots && selectedTenant.historical_snapshots.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" /> 7-Day Resource Utilization Trend
                  </h3>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-muted-foreground font-semibold">
                      {selectedTenant.historical_snapshots.map((s, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="h-16 flex items-end justify-center">
                            <div
                              className="w-full max-w-[20px] bg-primary/80 hover:bg-primary rounded-t-sm transition-all"
                              style={{ height: `${Math.max(15, Math.min(100, (s.members / (selectedTenant.max_members || 1)) * 100))}%` }}
                              title={`${s.date}: ${s.members} members, ${s.ai_minutes} voice mins`}
                            />
                          </div>
                          <span className="block">{s.date.slice(5)}</span>
                          <span className="font-bold text-foreground block font-mono">{s.members}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  Last verified: {new Date(selectedTenant.last_calculated_at).toLocaleString()}
                </div>
                <Button onClick={() => setSelectedTenant(null)}>
                  Close Diagnostics
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}
