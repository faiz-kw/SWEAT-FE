/**
 * AuditLogsWorkspace.tsx — Enterprise Activity & Audit Command Center
 * 100% Dynamic, Zero Hardcoding, Fulfilling the 9-Point Contract.
 */

import * as React from "react";
import {
  History,
  Search,
  ShieldAlert,
  ShieldCheck,
  Filter,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  User,
  Cpu,
  Bot,
  Radio,
  Layers,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  fetchActivityLogsApi,
  fetchActivityFiltersApi,
  exportActivityLogsCsvApi,
  type ActivityAuditLog,
  type ActivityFiltersResponse,
  type ActivityQueryParams,
  type FieldChange,
} from "@/api/endpoints/activityAuditApi";

export function AuditLogsWorkspace() {
  // State
  const [logs, setLogs] = React.useState<ActivityAuditLog[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = React.useState(true);
  const [filtersData, setFiltersData] = React.useState<ActivityFiltersResponse | null>(null);

  // Active Query Parameters
  const [page, setPage] = React.useState(1);
  const pageSize = 25;
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedModule, setSelectedModule] = React.useState("ALL");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [selectedRole, setSelectedRole] = React.useState("ALL");
  const [selectedActorKey, setSelectedActorKey] = React.useState("ALL");
  const [selectedResult, setSelectedResult] = React.useState("ALL");
  const [selectedBranch, setSelectedBranch] = React.useState("ALL");
  const [selectedChannel, setSelectedChannel] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Slide-over detail drawer
  const [selectedLog, setSelectedLog] = React.useState<ActivityAuditLog | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = React.useState(false);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Group CRM staff and system actors (members are excluded as they operate via mobile/portal)
  const staffActors = React.useMemo(() => {
    return (filtersData?.actors || []).filter((a) => {
      const t = (a.actor_type || 'STAFF').toUpperCase();
      return t === 'STAFF' || t === 'ADMIN' || t === 'SUPER_ADMIN';
    });
  }, [filtersData?.actors]);

  const systemActors = React.useMemo(() => {
    return (filtersData?.actors || []).filter((a) => {
      const t = (a.actor_type || '').toUpperCase();
      return t === 'SYSTEM' || t === 'GATEWAY';
    });
  }, [filtersData?.actors]);

  // Build active query params dynamically
  const buildActiveParams = React.useCallback(
    (includePagination: boolean): ActivityQueryParams => {
      let actorId: string | undefined = undefined;
      let actorEmail: string | undefined = undefined;
      let actorName: string | undefined = undefined;
      if (selectedActorKey !== "ALL") {
        if (selectedActorKey.startsWith("id:")) {
          actorId = selectedActorKey.slice(3);
        } else if (selectedActorKey.startsWith("email:")) {
          actorEmail = selectedActorKey.slice(6);
        } else if (selectedActorKey.startsWith("name:")) {
          actorName = selectedActorKey.slice(5);
        }
      }
      return {
        page: includePagination ? page : undefined,
        page_size: includePagination ? pageSize : undefined,
        search: debouncedSearch || undefined,
        module: selectedModule !== "ALL" ? selectedModule : undefined,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        role: selectedRole !== "ALL" ? selectedRole : undefined,
        actor_type: selectedRole !== "ALL" ? selectedRole : undefined,
        actor_id: actorId,
        actor_email: actorEmail,
        actor_name: actorName,
        result: selectedResult !== "ALL" ? selectedResult : undefined,
        branch_id: selectedBranch !== "ALL" ? selectedBranch : undefined,
        source_channel: selectedChannel !== "ALL" ? selectedChannel : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
    },
    [
      page,
      pageSize,
      debouncedSearch,
      selectedModule,
      selectedCategory,
      selectedRole,
      selectedActorKey,
      selectedResult,
      selectedBranch,
      selectedChannel,
      startDate,
      endDate,
    ]
  );

  // Load Dynamic Filter Metadata & KPIs (Zero Hardcoding)
  const loadFilters = React.useCallback(async () => {
    setFiltersLoading(true);
    try {
      const data = await fetchActivityFiltersApi();
      setFiltersData(data);
    } catch (err) {
      console.error("Failed to fetch dynamic audit filters:", err);
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  // Load Activity Logs
  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = buildActiveParams(true);
      const response = await fetchActivityLogsApi(params);
      setLogs(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      console.error("Failed to fetch activity audit logs:", err);
      setErrorMsg(err?.message || "Unable to load activity audit logs. Please check your permissions or try again.");
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildActiveParams]);

  React.useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Clear all filters
  const resetFilters = () => {
    setSearch("");
    setSelectedModule("ALL");
    setSelectedCategory("ALL");
    setSelectedRole("ALL");
    setSelectedActorKey("ALL");
    setSelectedResult("ALL");
    setSelectedBranch("ALL");
    setSelectedChannel("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
      selectedModule !== "ALL" ||
      selectedCategory !== "ALL" ||
      selectedRole !== "ALL" ||
      selectedActorKey !== "ALL" ||
      selectedResult !== "ALL" ||
      selectedBranch !== "ALL" ||
      selectedChannel !== "ALL" ||
      startDate ||
      endDate
  );

  // Authenticated CSV Blob Export Handler
  const handleExportCsv = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const params = buildActiveParams(false);
      const blob = await exportActivityLogsCsvApi(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `activity_audit_logs_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to export audit logs CSV:", err);
      setErrorMsg(err?.message || "Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Format diff values cleanly (avoid [object Object] for nested dicts/arrays)
  const formatDiffValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined || val === "") {
      return <span className="text-muted-foreground italic">None</span>;
    }
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const openLogDetails = (log: ActivityAuditLog) => {
    setRawJsonOpen(false);
    setSelectedLog(log);
  };

  // Helper for Role & Performer Badge
  const renderActorBadge = (roleName?: string, actorType?: string) => {
    const r = (roleName || "").toUpperCase();
    const t = (actorType || "").toUpperCase();
    if (r.includes("ADMIN") || t === "ADMIN") {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1 text-[10px] font-semibold">
          <ShieldCheck className="w-3 h-3" /> {roleName || "Admin"}
        </Badge>
      );
    }
    if (r.includes("TRAINER") || r.includes("COACH")) {
      return (
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 gap-1 text-[10px] font-semibold">
          <User className="w-3 h-3" /> {roleName || "Trainer"}
        </Badge>
      );
    }
    if (r.includes("SALES") || r.includes("CRM")) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 text-[10px] font-semibold">
          <User className="w-3 h-3" /> {roleName || "Sales Rep"}
        </Badge>
      );
    }
    if (r.includes("MANAGER") || r.includes("DESK") || t === "STAFF" || r.includes("STAFF")) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1 text-[10px] font-semibold">
          <User className="w-3 h-3" /> {roleName || "Staff"}
        </Badge>
      );
    }
    if (t === "IOT_DEVICE" || r.includes("TURNSTILE") || r.includes("IOT")) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 text-[10px] font-semibold">
          <Cpu className="w-3 h-3" /> Turnstile IoT
        </Badge>
      );
    }
    if (t === "AI_AGENT" || r.includes("AI")) {
      return (
        <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 gap-1 text-[10px] font-semibold">
          <Bot className="w-3 h-3" /> AI Copilot
        </Badge>
      );
    }
    if (t === "WEBHOOK" || r.includes("GATEWAY") || r.includes("WEBHOOK")) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 gap-1 text-[10px] font-semibold">
          <Radio className="w-3 h-3" /> Webhook
        </Badge>
      );
    }
    if (t === "MEMBER" || r.includes("MEMBER")) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[10px] font-semibold">
          <User className="w-3 h-3" /> Member
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 gap-1 text-[10px] font-semibold">
        <Layers className="w-3 h-3" /> {roleName || actorType || "System"}
      </Badge>
    );
  };

  // Helper for Result Status Badge
  const renderResultBadge = (result: string) => {
    if (result === "SUCCESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-2.5 h-2.5" /> SUCCESS
        </span>
      );
    }
    if (result === "FAILURE") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-2.5 h-2.5" /> FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-2.5 h-2.5" /> WARNING
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="CRM Activity & Audit Command Center"
        subtitle="Immutable, centralized, cryptographically timestamped audit trail tracking every activity, mutation, and state change across the entire CRM."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || exporting || totalCount === 0}
              className="gap-2 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? "animate-pulse" : ""}`} />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadFilters();
                loadLogs();
              }}
              disabled={loading}
              className="gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total CRM Activities</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {filtersData?.kpis?.total_activities?.toLocaleString() ?? "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Across all 18 modules</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <History className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Security & Auth Events</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {filtersData?.kpis?.security_events?.toLocaleString() ?? "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Logins, MFA & sessions</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Commercial Mutations</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {filtersData?.kpis?.commercial_mutations?.toLocaleString() ?? "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Orders, payments, refunds</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <FileText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Failed Operations</p>
                <h3 className="text-2xl font-bold text-rose-500 mt-1">
                  {filtersData?.kpis?.failed_operations?.toLocaleString() ?? "—"}
                </h3>
                <p className="text-[11px] text-rose-500/80 mt-0.5">Gate denials & auth errors</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs()}
              className="h-7 text-xs cursor-pointer"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Dynamic Filter Controls (ZERO HARDCODING) */}
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm mb-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search who did what, member, order, action code, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/80 text-xs sm:text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Inputs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 h-9">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">From</span>
                <input
                  type="date"
                  aria-label="Start date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 h-9">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">To</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Backend-Driven Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              {filtersData?.modules?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Action Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {filtersData?.categories?.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Specific Staff / User Filter (Dynamic from DB) */}
            <select
              value={selectedActorKey}
              onChange={(e) => {
                setSelectedActorKey(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">All Staff / Users</option>
              {staffActors.length > 0 && (
                <optgroup label="Staff & Management">
                  {staffActors.map((a, idx) => {
                    const keyVal = a.actor_id
                      ? `id:${a.actor_id}`
                      : a.actor_email
                      ? `email:${a.actor_email}`
                      : `name:${a.actor_name}`;
                    const label = a.actor_role
                      ? `${a.actor_name} (${a.actor_role})`
                      : a.actor_name;
                    return (
                      <option key={`staff-${keyVal}-${idx}`} value={keyVal}>
                        {label}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {systemActors.length > 0 && (
                <optgroup label="System Automations & Services">
                  {systemActors.map((a, idx) => {
                    const keyVal = a.actor_id
                      ? `id:${a.actor_id}`
                      : a.actor_email
                      ? `email:${a.actor_email}`
                      : `name:${a.actor_name}`;
                    const label = a.actor_role
                      ? `${a.actor_name} (${a.actor_role})`
                      : a.actor_name;
                    return (
                      <option key={`system-${keyVal}-${idx}`} value={keyVal}>
                        {label}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>

            {/* Roles Filter (Dynamic from CRM Backend Role Models) */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {filtersData?.roles && filtersData.roles.length > 0
                ? filtersData.roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))
                : filtersData?.actor_types?.map((at) => (
                    <option key={at} value={at}>
                      {at}
                    </option>
                  ))}
            </select>

            {/* Result Status Filter (Dynamic from DB) */}
            <select
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {filtersData?.results?.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Branches</option>
              {filtersData?.branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Source Channel Filter (Dynamic from DB) */}
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg border border-border/60 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              {filtersData?.source_channels?.map((ch) => (
                <option key={ch} value={ch}>
                  {ch.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            {/* Reset button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Activity Ledger Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/40 border-b border-border/60 text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Performer / Role</th>
                  <th className="py-3 px-4">Status & Action</th>
                  <th className="py-3 px-4">Module & Target</th>
                  <th className="py-3 px-4 min-w-[280px]">Activity Narrative (Plain English)</th>
                  <th className="py-3 px-4">Channel & Origin</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span className="font-sans text-xs">Loading unified activity stream...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground/50 mb-1" />
                        <span className="font-sans font-medium text-foreground text-sm">No Activity Logs Found</span>
                        <span className="font-sans text-xs text-muted-foreground max-w-sm">
                          {hasActiveFilters
                            ? "No activities match your current search or filter criteria. Try clearing some filters."
                            : "No activity logs have been recorded in this organization yet."}
                        </span>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    return (
                      <tr
                        key={log.id}
                        onClick={() => openLogDetails(log)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-sans">
                          <div className="font-medium text-foreground text-xs">
                            {log.occurred_at_ist || new Date(log.occurred_at).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(log.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Performer / Role */}
                        <td className="py-3 px-4 font-sans max-w-[200px]">
                          <div className="font-semibold text-foreground truncate">
                            {log.actor_name || log.actor_email || log.actor_type}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {log.actor_email || log.actor_role || "—"}
                          </div>
                          <div className="mt-1">{renderActorBadge(log.actor_role, log.actor_type)}</div>
                        </td>

                        {/* Status & Action */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>{renderResultBadge(log.result)}</div>
                          <div className="mt-1 font-mono font-bold text-xs text-foreground tracking-tight">
                            {log.action_code}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-sans uppercase">
                            {log.action_verb || "MUTATION"}
                          </span>
                        </td>

                        {/* Module & Target */}
                        <td className="py-3 px-4 font-sans max-w-[180px]">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border border-border/60 uppercase">
                            {log.module}
                          </span>
                          <div className="font-medium text-foreground text-xs mt-1 truncate">
                            {log.entity_name || log.entity_type}
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}
                          </span>
                        </td>

                        {/* Plain English Narrative */}
                        <td className="py-3 px-4 font-sans text-xs text-foreground max-w-sm">
                          <p className="line-clamp-2 leading-relaxed">
                            {log.event_description || "Activity recorded."}
                          </p>
                          {log.field_changes_count > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              <SlidersHorizontal className="w-2.5 h-2.5" />
                              {log.field_changes_count} field{log.field_changes_count > 1 ? "s" : ""} changed
                            </span>
                          )}
                          {log.reason && (
                            <span className="text-[10px] text-muted-foreground block mt-0.5 italic truncate">
                              Reason: {log.reason}
                            </span>
                          )}
                        </td>

                        {/* Channel & Origin */}
                        <td className="py-3 px-4 font-sans whitespace-nowrap">
                          <span className="text-[11px] font-medium text-foreground block">
                            {(log.source_channel || "").replace(/_/g, " ") || "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {log.ip_address || "Internal"}
                          </span>
                          {log.branch_name && (
                            <span className="text-[10px] text-muted-foreground/80 block truncate max-w-[120px]">
                              {log.branch_name}
                            </span>
                          )}
                        </td>

                        {/* View Details Button */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLogDetails(log);
                            }}
                            className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                          >
                            Details
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{logs.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{" "}
              <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 9-Point Contract Slide-Over Detail Drawer */}
        <Sheet
          open={!!selectedLog}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLog(null);
              setRawJsonOpen(false);
            }
          }}
        >
          <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto p-6 space-y-6">
            {selectedLog && (
              <>
                <SheetHeader className="text-left pb-4 border-b border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      ID: {selectedLog.id}
                    </span>
                    {renderResultBadge(selectedLog.result)}
                  </div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    {selectedLog.action_code}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {selectedLog.occurred_at_ist || new Date(selectedLog.occurred_at).toLocaleString()}
                  </SheetDescription>
                </SheetHeader>

                {/* Narrative Summary Card */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Plain English Narrative
                  </h4>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {selectedLog.event_description || "Activity recorded."}
                  </p>
                </div>

                {/* Error Banner if Failed */}
                {selectedLog.result === "FAILURE" && (
                  <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1 text-rose-600 dark:text-rose-400">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Failure Reason: {selectedLog.error_code || "OPERATION_FAILED"}
                    </div>
                    {selectedLog.error_message && (
                      <p className="text-xs text-rose-500/90 leading-relaxed font-mono">
                        {selectedLog.error_message}
                      </p>
                    )}
                  </div>
                )}

                {/* The 9-Point Contract Breakdown */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    The 9-Point Activity Contract
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* 1. Who performed it */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        1. Who performed the activity?
                      </span>
                      <p className="font-semibold text-foreground">
                        {selectedLog.actor_name || selectedLog.actor_email || selectedLog.actor_type}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Role: {selectedLog.actor_role || selectedLog.actor_type || "—"} | Performer Type: {selectedLog.actor_type}
                      </p>
                    </div>

                    {/* 2. What did they do */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        2. What exactly did they do?
                      </span>
                      <p className="font-semibold text-foreground font-mono">
                        {selectedLog.action_code}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Verb: {selectedLog.action_verb || "—"} | Category: {selectedLog.action_category}
                      </p>
                    </div>

                    {/* 3. Which module was involved */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        3. Which CRM module was involved?
                      </span>
                      <p className="font-semibold text-foreground">
                        {selectedLog.module}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Submodule: {selectedLog.submodule || "Core"}
                      </p>
                    </div>

                    {/* 4. Which record was affected */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        4. Which customer/record was affected?
                      </span>
                      <p className="font-semibold text-foreground truncate">
                        {selectedLog.entity_name || selectedLog.entity_type}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Type: {selectedLog.entity_type} {selectedLog.entity_id ? `(ID: ${selectedLog.entity_id})` : ""}
                      </p>
                    </div>

                    {/* 7. When did it happen */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        7. When exactly did it happen?
                      </span>
                      <p className="font-semibold text-foreground">
                        {selectedLog.occurred_at_ist}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        UTC: {selectedLog.occurred_at}
                      </p>
                    </div>

                    {/* 8. Success or failure */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        8. Was the activity successful?
                      </span>
                      <div className="mt-0.5">{renderResultBadge(selectedLog.result)}</div>
                      {selectedLog.error_code && (
                        <p className="text-[11px] text-rose-500 font-mono mt-0.5">
                          Code: {selectedLog.error_code}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 9. Additional details, reasons & remarks */}
                  {(selectedLog.reason || selectedLog.remarks || selectedLog.source_channel || selectedLog.ip_address) && (
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        9. Additional Details, Reasons & Origin
                      </span>
                      {selectedLog.reason && (
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Reason:</span> {selectedLog.reason}
                        </p>
                      )}
                      {selectedLog.remarks && (
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Remarks:</span> {selectedLog.remarks}
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
                        <div>Channel: <span className="text-foreground font-sans">{(selectedLog.source_channel || "").replace(/_/g, " ") || "—"}</span></div>
                        <div>IP: <span className="text-foreground">{selectedLog.ip_address || "—"}</span></div>
                        <div>Branch: <span className="text-foreground font-sans">{selectedLog.branch_name || "—"}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5 & 6. Granular Multi-Field Diff Breakdown Table */}
                {selectedLog.field_changes && selectedLog.field_changes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        5 & 6. Granular Field-by-Field Breakdown ({selectedLog.field_changes.length} Changes)
                      </h4>
                    </div>

                    <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 border-b border-border/60 text-[11px] text-muted-foreground uppercase font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Field / Attribute</th>
                            <th className="py-2.5 px-3 bg-rose-500/5 text-rose-600 dark:text-rose-400">Previous Value</th>
                            <th className="py-2.5 px-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">New Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono text-xs">
                          {selectedLog.field_changes.map((change, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                                {change.field_label || change.field_name}
                                <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                                  {change.field_name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 bg-rose-500/5 text-rose-600 dark:text-rose-400 max-w-[180px] break-words">
                                {formatDiffValue(change.old_value)}
                              </td>
                              <td className="py-2.5 px-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 max-w-[180px] break-words font-semibold">
                                {formatDiffValue(change.new_value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-border/40 bg-muted/10 text-xs text-muted-foreground italic text-center">
                    No granular field mutations recorded for this event.
                  </div>
                )}

                {/* Collapsible Technical JSON Inspection */}
                <div className="border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRawJsonOpen((v) => !v)}
                    className="w-full text-xs text-muted-foreground justify-between cursor-pointer"
                  >
                    <span>Technical JSON Inspection (Raw Payload)</span>
                    <span>{rawJsonOpen ? "Hide" : "Show"}</span>
                  </Button>

                  {rawJsonOpen && (
                    <div className="mt-3 space-y-3">
                      {selectedLog.before_state && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1 font-mono">before_state:</p>
                          <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
                            {JSON.stringify(selectedLog.before_state, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.after_state && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1 font-mono">after_state:</p>
                          <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
                            {JSON.stringify(selectedLog.after_state, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.metadata && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1 font-mono">metadata:</p>
                          <pre className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
                            {JSON.stringify(selectedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </PageBody>
    </div>
  );
}
