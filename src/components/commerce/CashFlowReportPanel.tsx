import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  RotateCcw,
  Banknote,
  CreditCard,
  Clock,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ArrowDownLeft,
  Layers,
  Receipt,
  Users,
  Building2,
  Dumbbell,
  UserCheck,
  Filter,
  ChevronDown,
  X,
  Check,
  Search,
} from "lucide-react";
import { commerceApi } from "@/api/endpoints/commerceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatINRFull(value: string | number | undefined | null): string {
  const num = typeof value === "number" ? value : parseFloat(String(value || "0"));
  if (!Number.isFinite(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatINRCompact(value: string | number | undefined | null): string {
  const num = typeof value === "number" ? value : parseFloat(String(value || "0"));
  if (!Number.isFinite(num) || num === 0) return "₹0";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

const MultiSelectDropdown: React.FC<{
  label: string;
  icon: React.ElementType;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ label, icon: Icon, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  const toggleItem = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
          selected.length > 0
            ? "border-primary bg-primary/10 text-primary font-semibold"
            : "border-border bg-background text-foreground hover:bg-muted/60"
        }`}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{label}</span>
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2">
            {selected.length}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-border bg-card shadow-lg p-2 space-y-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => onChange(filtered.map((o) => o.id))}
              className="hover:text-primary font-medium cursor-pointer"
            >
              Select all ({filtered.length})
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Clear ({selected.length})
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-border/40 pr-0.5">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No matching options</div>
            ) : (
              filtered.map((opt) => {
                const isChecked = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleItem(opt.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 text-left text-xs hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                  >
                    <span
                      className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {isChecked && <Check className="size-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-muted-foreground truncate">{opt.sublabel}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export type CashFlowTab = "cash_flow" | "branches_programs" | "sales_trainers" | "cash_ledger";

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  branchIds: string[];
  programIds: string[];
  packageIds: string[];
  salesUserIds: string[];
  trainerIds: string[];
}

export const CashFlowReportPanel: React.FC<{
  defaultTab?: CashFlowTab | "overview" | "monthly" | "packages";
  onFiltersChange?: (filters: ReportFilters) => void;
}> = ({ defaultTab = "cash_flow", onFiltersChange }) => {
  const initialMappedTab: CashFlowTab =
    defaultTab === "branches_programs" || defaultTab === "packages"
      ? "branches_programs"
      : defaultTab === "sales_trainers"
      ? "sales_trainers"
      : defaultTab === "cash_ledger"
      ? "cash_ledger"
      : "cash_flow";

  const [subTab, setSubTab] = useState<CashFlowTab>(initialMappedTab);

  // Filter states
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedSalesUsers, setSelectedSalesUsers] = useState<string[]>([]);
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);

  useEffect(() => {
    onFiltersChange?.({
      dateFrom,
      dateTo,
      branchIds: selectedBranches,
      programIds: selectedPrograms,
      packageIds: selectedPackages,
      salesUserIds: selectedSalesUsers,
      trainerIds: selectedTrainers,
    });
  }, [
    dateFrom,
    dateTo,
    selectedBranches,
    selectedPrograms,
    selectedPackages,
    selectedSalesUsers,
    selectedTrainers,
    onFiltersChange,
  ]);

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: [
      "commerce-summary",
      selectedBranches,
      selectedPrograms,
      selectedPackages,
      selectedSalesUsers,
      selectedTrainers,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      commerceApi.getSummary({
        branch_ids: selectedBranches,
        program_ids: selectedPrograms,
        package_ids: selectedPackages,
        sales_user_ids: selectedSalesUsers,
        trainer_ids: selectedTrainers,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });

  const {
    data: cashReport,
    isLoading: loadingCash,
    refetch: refetchCash,
  } = useQuery({
    queryKey: ["cash-report", selectedBranches, dateFrom, dateTo],
    queryFn: () =>
      commerceApi.getCashReport({
        branch_id: selectedBranches.length === 1 ? selectedBranches[0] : undefined,
        branch_ids: selectedBranches.length > 0 ? selectedBranches : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        date: !dateFrom && !dateTo ? "all" : undefined,
      }),
    enabled: subTab === "cash_ledger",
  });

  const filterOpts = summary?.filter_options;

  const branchOptions: MultiSelectOption[] = useMemo(
    () => (filterOpts?.branches || []).map((b) => ({ id: b.id, label: b.name })),
    [filterOpts?.branches]
  );

  const programOptions: MultiSelectOption[] = useMemo(
    () =>
      (filterOpts?.programs || []).map((p) => ({
        id: p.id,
        label: p.name,
        sublabel: p.category_name || undefined,
      })),
    [filterOpts?.programs]
  );

  const packageOptions: MultiSelectOption[] = useMemo(() => {
    const raw = filterOpts?.packages || [];
    const filteredByProg =
      selectedPrograms.length > 0
        ? raw.filter((pk) => pk.program_id && selectedPrograms.includes(pk.program_id))
        : raw;
    return filteredByProg.map((pk) => ({
      id: pk.id,
      label: pk.name,
      sublabel: pk.program_name || undefined,
    }));
  }, [filterOpts?.packages, selectedPrograms]);

  const salesUserOptions: MultiSelectOption[] = useMemo(
    () =>
      (filterOpts?.sales_users || []).map((u) => ({
        id: u.id,
        label: u.name,
        sublabel: u.email,
      })),
    [filterOpts?.sales_users]
  );

  const trainerOptions: MultiSelectOption[] = useMemo(
    () =>
      (filterOpts?.trainers || []).map((t) => ({
        id: t.id,
        label: t.name,
        sublabel: t.email,
      })),
    [filterOpts?.trainers]
  );

  const hasActiveFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    selectedBranches.length > 0 ||
    selectedPrograms.length > 0 ||
    selectedPackages.length > 0 ||
    selectedSalesUsers.length > 0 ||
    selectedTrainers.length > 0;

  const clearAllFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedBranches([]);
    setSelectedPrograms([]);
    setSelectedPackages([]);
    setSelectedSalesUsers([]);
    setSelectedTrainers([]);
  };

  const applyDatePreset = (preset: "all" | "this_month" | "last_3m" | "last_6m" | "this_year") => {
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const now = new Date();
    const toStr = now.toISOString().split("T")[0] || "";
    if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(start.toISOString().split("T")[0] || "");
      setDateTo(toStr);
    } else if (preset === "last_3m") {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      setDateFrom(start.toISOString().split("T")[0] || "");
      setDateTo(toStr);
    } else if (preset === "last_6m") {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      setDateFrom(start.toISOString().split("T")[0] || "");
      setDateTo(toStr);
    } else if (preset === "this_year") {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(toStr);
    }
  };

  const grossInflow = parseFloat(summary?.gross_revenue || summary?.total_settled_amount || "0");
  const refundedAmount = parseFloat(summary?.refunded_amount || "0");
  const refundCount = summary?.refund_count ?? 0;
  const netCashFlow = parseFloat(summary?.net_revenue || String(Math.max(0, grossInflow - refundedAmount)));
  const cashCollected = parseFloat(summary?.cash_collected || "0");
  const cashTxnCount = summary?.cash_txn_count ?? 0;
  const onlineCollected = parseFloat(summary?.online_collected || "0");
  const onlineTxnCount = summary?.online_txn_count ?? 0;
  const outstandingAmount = parseFloat(summary?.total_outstanding_amount || "0");
  const cancelledAmount = parseFloat(summary?.cancelled_amount || "0");
  const cancelledOrders = summary?.cancelled_orders ?? 0;
  const settledOrders = summary?.settled_orders ?? 0;
  const pendingOrders = summary?.pending_orders ?? 0;
  const taxCollected = parseFloat(summary?.tax_collected || "0");
  const discountGiven = parseFloat(summary?.discount_given || "0");
  const pendingCashApproval = parseFloat(summary?.pending_approval_cash_amount || "0");

  const paymentModes = summary?.payment_mode_breakdown || [];
  const monthlyCashFlow = summary?.monthly_cash_flow || [];
  const branchBreakdown = summary?.branch_breakdown || [];
  const programBreakdown = summary?.program_breakdown || [];
  const topPackages = summary?.top_packages || [];
  const salesUserBreakdown = summary?.sales_user_breakdown || [];
  const trainerBreakdown = summary?.trainer_breakdown || [];

  return (
    <div className="space-y-5">
      {/* 1. FILTER & NAVIGATION BAR */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3.5">
        {/* Top Row: Segmented Report Views + Sync */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "cash_flow", label: "Cash Flow & Payment Modes", icon: Layers },
              { id: "branches_programs", label: "Branch & Program Revenue", icon: Building2 },
              { id: "sales_trainers", label: "Sales Team & Trainer Referrals", icon: UserCheck },
              { id: "cash_ledger", label: "Cash Collection Ledger", icon: Banknote },
            ].map((t) => {
              const Icon = t.icon;
              const active = subTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as CashFlowTab)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllFilters}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1"
              >
                <X className="size-3.5" />
                <span>Reset Filters</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => {
                refetchSummary();
                if (subTab === "cash_ledger") refetchCash();
              }}
            >
              <RefreshCw className={`size-3.5 ${loadingSummary || loadingCash ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Second Row: Date Range + Multi-Select Filters (Branch, Program, Package, Sales User, Trainer) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="size-3.5 text-primary" />
            <span>Filters:</span>
          </div>

          {/* Multi-select dropdowns */}
          <MultiSelectDropdown
            label="Branches"
            icon={Building2}
            options={branchOptions}
            selected={selectedBranches}
            onChange={setSelectedBranches}
          />
          <MultiSelectDropdown
            label="Programs"
            icon={Dumbbell}
            options={programOptions}
            selected={selectedPrograms}
            onChange={setSelectedPrograms}
          />
          <MultiSelectDropdown
            label="Packages"
            icon={Receipt}
            options={packageOptions}
            selected={selectedPackages}
            onChange={setSelectedPackages}
          />
          <MultiSelectDropdown
            label="Sales Users"
            icon={Users}
            options={salesUserOptions}
            selected={selectedSalesUsers}
            onChange={setSelectedSalesUsers}
          />
          <MultiSelectDropdown
            label="Trainers (Referrals)"
            icon={UserCheck}
            options={trainerOptions}
            selected={selectedTrainers}
            onChange={setSelectedTrainers}
          />

          <div className="h-5 w-px bg-border hidden sm:block mx-1" />

          {/* Date Range Picker */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs w-36 bg-background"
            />
            <span className="text-xs text-muted-foreground">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs w-36 bg-background"
            />
          </div>

          {/* Date Quick Presets */}
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All Time" },
              { id: "this_month", label: "This Month" },
              { id: "last_3m", label: "3M" },
              { id: "last_6m", label: "6M" },
              { id: "this_year", label: "This Year" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id as any)}
                className="px-2 py-1 rounded text-[11px] font-medium bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SPACIOUS 3-COLUMN RESPONSIVE KPI GRID (Zero Text Collision) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Total Came In */}
        <div className="min-w-0 rounded-xl border border-emerald-500/25 bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Total Came In (Gross Inflow)
            </span>
            <span className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(grossInflow)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(grossInflow)} · {settledOrders.toLocaleString("en-IN")} paid orders
            </div>
          </div>
        </div>

        {/* Card 2: Total Refunded */}
        <div className="min-w-0 rounded-xl border border-rose-500/25 bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Total Refunded
            </span>
            <span className="size-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <RotateCcw className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(refundedAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(refundedAmount)} · {refundCount} processed refund(s)
            </div>
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div className="min-w-0 rounded-xl border border-primary/25 bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary">
              Net Cash Flow (Recognized)
            </span>
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(netCashFlow)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(netCashFlow)} · Gross minus refunds
            </div>
          </div>
        </div>

        {/* Card 4: Physical Cash Inflow */}
        <div className="min-w-0 rounded-xl border border-amber-500/25 bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Physical Cash Inflow
            </span>
            <span className="size-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Banknote className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(cashCollected)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(cashCollected)} · {cashTxnCount.toLocaleString("en-IN")} receipts (
              {grossInflow > 0 ? Math.round((cashCollected / grossInflow) * 100) : 0}%)
            </div>
          </div>
        </div>

        {/* Card 5: Digital / Online Inflow */}
        <div className="min-w-0 rounded-xl border border-blue-500/25 bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Digital / Online Inflow
            </span>
            <span className="size-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(onlineCollected)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(onlineCollected)} · {onlineTxnCount.toLocaleString("en-IN")} UPI / Card / Bank (
              {grossInflow > 0 ? Math.round((onlineCollected / grossInflow) * 100) : 0}%)
            </div>
          </div>
        </div>

        {/* Card 6: Pending / Outstanding Dues */}
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Pending / Outstanding Dues
            </span>
            <span className="size-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums truncate">
              {loadingSummary ? "..." : formatINRCompact(outstandingAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
              {formatINRFull(outstandingAmount)} · {pendingOrders.toLocaleString("en-IN")} unpaid/partial orders
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAB 1: CASH FLOW & PAYMENT MODES + MONTHLY STATEMENT */}
      {subTab === "cash_flow" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Payment Mode Breakdown */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Inflow Breakdown by Payment Mode
                </h4>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Settled Total: {formatINRFull(grossInflow)}
                </span>
              </div>

              <div className="space-y-3">
                {paymentModes.map((pm) => {
                  const amt = parseFloat(pm.amount || "0");
                  const pct = grossInflow > 0 ? Math.min(100, (amt / grossInflow) * 100) : 0;
                  return (
                    <div key={pm.mode} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground truncate">
                          {pm.mode}{" "}
                          <span className="text-muted-foreground font-mono text-[11px]">
                            ({pm.count.toLocaleString("en-IN")} txns)
                          </span>
                        </span>
                        <span className="font-bold text-foreground tabular-nums shrink-0">
                          {formatINRFull(amt)}{" "}
                          <span className="text-muted-foreground font-normal">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pm.category === "CASH" ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.max(pct, amt > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cash Flow Accounting Summary */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-2.5">
                Accounting & Reversals Summary
              </h4>
              <div className="divide-y divide-border text-xs">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Gross Sales Inflow:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINRFull(grossInflow)}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">GST / Tax Component:</span>
                  <span className="font-semibold text-foreground tabular-nums">{formatINRFull(taxCollected)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Promotional Discounts:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatINRFull(discountGiven)}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Processed Refunds ({refundCount}):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatINRFull(refundedAmount)}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Pending Cash Approval:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatINRFull(pendingCashApproval)}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    Cancelled / Failed ({cancelledOrders.toLocaleString("en-IN")}):
                  </span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {formatINRCompact(cancelledAmount)}
                  </span>
                </div>
                <div className="pt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-foreground">Net Cash Flow:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINRFull(netCashFlow)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Cash Flow Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Monthly Cash Flow Statement
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Settled Cash + Online Inflow vs Refunds
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Month</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Transactions</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Physical Cash</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Online / Digital</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Gross Came In</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Refunded</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Net Cash Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyCashFlow.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No monthly cash flow records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    monthlyCashFlow.map((m) => (
                      <tr key={m.month} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-semibold text-foreground">{m.month}</td>
                        <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                          {m.txn_count.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatINRFull(m.cash_inflow)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-blue-600 dark:text-blue-400 tabular-nums">
                          {formatINRFull(m.online_inflow)}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-right text-foreground tabular-nums">
                          {formatINRFull(m.gross_inflow)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-rose-600 tabular-nums">
                          {formatINRFull(m.refunded)}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatINRFull(m.net_cash_flow)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: BRANCH & PROGRAM REVENUE COMPARISON */}
      {subTab === "branches_programs" && (
        <div className="space-y-5">
          {/* Branch Revenue Comparison */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Branch Revenue Comparison — Which Branch Returns More Revenue
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Ranked by settled revenue
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Studio Branch</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Paid Orders</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Pending Orders</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Physical Cash</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Online / Digital</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Pending Dues</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Settled Revenue</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branchBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No branch records found.
                      </td>
                    </tr>
                  ) : (
                    branchBreakdown.map((b) => {
                      const rev = parseFloat(b.revenue || "0");
                      const share = grossInflow > 0 ? ((rev / grossInflow) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={b.id || b.name} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold text-foreground">{b.name}</td>
                          <td className="px-4 py-3 font-mono text-right tabular-nums">
                            {b.paid_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-amber-600 tabular-nums">
                            {b.pending_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatINRFull(b.cash_revenue)}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-blue-600 dark:text-blue-400 tabular-nums">
                            {formatINRFull(b.online_revenue)}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-muted-foreground tabular-nums">
                            {formatINRFull(b.outstanding)}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatINRFull(rev)}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-right tabular-nums">
                            {share}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Program Demand & Top Packages side-by-side on large screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Program Breakdown */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Program Demand & Revenue
                  </h4>
                </div>
                <span className="text-[11px] text-muted-foreground">Most popular programs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Program</th>
                      <th className="px-4 py-2.5 font-semibold">Category</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Total Interest</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {programBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          No program data for current filters.
                        </td>
                      </tr>
                    ) : (
                      programBreakdown.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{p.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.category}</td>
                          <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                            {p.total_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-emerald-600 font-semibold tabular-nums">
                            {p.paid_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-right text-foreground tabular-nums">
                            {formatINRFull(p.revenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Packages Breakdown */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Top Selling Packages
                  </h4>
                </div>
                <span className="text-[11px] text-muted-foreground">Ranked by settled revenue</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Package Name</th>
                      <th className="px-4 py-2.5 font-semibold">Program</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Paid Orders</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Settled Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topPackages.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          No package data for current filters.
                        </td>
                      </tr>
                    ) : (
                      topPackages.map((pkg, idx) => (
                        <tr key={`${pkg.id || pkg.name}-${idx}`} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{pkg.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{pkg.program_name || "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                            {pkg.orders_count.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatINRFull(pkg.revenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: SALES TEAM PERFORMANCE & TRAINER REFERRALS */}
      {subTab === "sales_trainers" && (
        <div className="space-y-5">
          {/* Sales Person Performance Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Sales Team Revenue & Conversion — Identify Who Needs Focus
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Ranked by settled revenue & conversion rate
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Sales Representative</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Total Orders</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Paid (Closed)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Pending Follow-up</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Cancelled</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Conversion %</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Revenue Generated</th>
                    <th className="px-4 py-2.5 font-semibold">Focus Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {salesUserBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No sales representative records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    salesUserBreakdown.map((s) => {
                      const needsFocus = s.conversion_rate < 50 || s.pending_orders > s.paid_orders;
                      return (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-foreground">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">{s.email}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                            {s.total_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-right text-emerald-600 tabular-nums">
                            {s.paid_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-amber-600 tabular-nums">
                            {s.pending_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-rose-600 tabular-nums">
                            {s.cancelled_orders.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-right tabular-nums">
                            {s.conversion_rate}%
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-right text-foreground tabular-nums">
                            {formatINRFull(s.revenue)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                needsFocus
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              }`}
                            >
                              {needsFocus ? "Needs Focus" : "Top Performer"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trainer Referrals Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Trainers Referring Members to Join
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Member signups & revenue attributed to trainers
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Trainer / Coach</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Members Joined (Paid)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Total Referrals / Orders</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Join Conversion %</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Referred Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trainerBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No trainer referral records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    trainerBreakdown.map((tr) => (
                      <tr key={tr.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-foreground">{tr.name}</div>
                          <div className="text-[11px] text-muted-foreground">{tr.email}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-right text-emerald-600 tabular-nums">
                          {tr.referrals_joined.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                          {tr.total_referrals.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-right tabular-nums">
                          {tr.conversion_rate}%
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-right text-foreground tabular-nums">
                          {formatINRFull(tr.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: PHYSICAL CASH COLLECTION LEDGER */}
      {subTab === "cash_ledger" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-border p-4 bg-card shadow-xs">
              <span className="text-xs text-muted-foreground font-semibold block">
                Total Physical Cash Recorded
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1 block tabular-nums">
                {formatINRCompact(cashReport?.total_physical_cash_recorded)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block tabular-nums">
                {formatINRFull(cashReport?.total_physical_cash_recorded)}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-card p-4 shadow-xs">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">
                Approved / Settled Cash
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                {formatINRCompact(cashReport?.approved_cash)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block tabular-nums">
                {formatINRFull(cashReport?.approved_cash)}
              </span>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-card p-4 shadow-xs">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block">
                Pending Manager Approval
              </span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block tabular-nums">
                {formatINRCompact(cashReport?.pending_approval_cash)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block tabular-nums">
                {formatINRFull(cashReport?.pending_approval_cash)}
              </span>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-card p-4 shadow-xs">
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold block">
                Cancelled / Failed Cash
              </span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block tabular-nums">
                {formatINRCompact(cashReport?.rejected_cash)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block tabular-nums">
                {formatINRFull(cashReport?.rejected_cash)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Staff & Front Desk Cash Collection Breakdown
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {cashReport?.date || "All Time"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Collection Channel / Staff</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Receipts</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Physical Cash Recorded</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Approved (Settled)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Pending</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Cancelled / Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(cashReport?.agent_collections || []).map((ag) => (
                    <tr key={ag.agent_id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold text-foreground">{ag.agent_name}</td>
                      <td className="px-4 py-2.5 font-mono text-right tabular-nums">
                        {ag.count.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-right tabular-nums">
                        {formatINRFull(ag.physical_cash)}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right tabular-nums">
                        {formatINRFull(ag.approved_cash)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-amber-600 text-right tabular-nums">
                        {formatINRFull(ag.pending_cash)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-rose-600 text-right tabular-nums">
                        {formatINRFull(ag.rejected_cash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
