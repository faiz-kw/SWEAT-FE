/**
 * src/components/crm/ConversionWizard.tsx
 * CRM Phase 8 - Lead to Member Conversion Wizard
 * Theme-aware (Light & Dark), zero-mock, backend-authoritative payment & pricing.
 */
import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, Loader2, Package, CreditCard,
  Tag, Sparkles, AlertTriangle, ShieldCheck, X, Zap, Scale,
  Building2, Flame, HeartPulse, Wallet, Phone, Copy, FileText, Calendar, Clock,
  UserCheck, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/permissions';
import { crmApi } from '@/api/endpoints/crmApi';
import type { Lead, ConversionQuote, ConversionPayload, ConversionResult, PaymentProvider } from '@/types/crm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined || amount === '') return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDuration(value: number, unit: string): string {
  const labels: Record<string, string> = {
    DAY: value === 1 ? 'Day' : 'Days',
    WEEK: value === 1 ? 'Week' : 'Weeks',
    MONTH: value === 1 ? 'Month' : 'Months',
    YEAR: value === 1 ? 'Year' : 'Years',
  };
  return `${value} ${labels[unit] ?? unit}`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `conv-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `conv-${Date.now()}-${Date.now().toString(36)}`;
}

// ─── Visual Brand Logos & Badges ─────────────────────────────────────────────

export function RazorpayLogoIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-[#0C2340] dark:bg-[#02042B] p-1.5 flex items-center justify-center shadow-xs border border-sky-400/30 shrink-0 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.07 1L1.734 19.397h4.743L18.813 1H14.07z" fill="#3395FF" />
        <path d="M15.47 1H2.072L0 4.09h13.398l2.072-3.09z" fill="#3395FF" />
        <path d="M7.747 12.455L2.83 19.784H.123L5.04 12.455h2.707z" fill="#0284C7" />
        <path d="M22.436 1l-11.91 17.733h4.945L24 1h-1.564z" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

export function CashPaymentIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 p-1.5 shrink-0 shadow-xs ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    </div>
  );
}

export function getProgramIcon(name: string) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('bootcamp') || lower.includes('boot') || lower.includes('camp')) {
    return <Flame size={13} className="text-orange-500 fill-orange-500/20 shrink-0" />;
  }
  if (lower.includes('online') || lower.includes('transform')) {
    return <Sparkles size={13} className="text-sky-500 shrink-0" />;
  }
  if (lower.includes('pilates') || lower.includes('studio') || lower.includes('reformer')) {
    return <HeartPulse size={13} className="text-rose-500 shrink-0" />;
  }
  return <Package size={13} className="text-primary shrink-0" />;
}

// Presentation metadata for supported payment providers
const PROVIDER_METADATA: Record<string, { label: string; icon: string; description?: string }> = {
  CASH: { label: 'Centre Cash', icon: '💵', description: 'Handed over at reception desk (requires manager review)' },
  RAZORPAY: { label: 'Razorpay Online', icon: '💳', description: 'UPI · Debit/Credit Cards · Netbanking · Instant Activation' },
};

const STEPS = [
  { id: 1, label: 'Package', shortLabel: 'Pkg', title: 'Package Selection', icon: Package },
  { id: 2, label: 'Pricing', shortLabel: 'Price', title: 'Pricing & Discounts', icon: Tag },
  { id: 3, label: 'Terms', shortLabel: 'Terms', title: 'Terms & Conditions Agreement', icon: Scale },
  { id: 4, label: 'Payment', shortLabel: 'Pay', title: 'Payment Method & Schedule', icon: CreditCard },
  { id: 5, label: 'Confirm', shortLabel: 'Confirm', title: 'Review & Final Confirmation', icon: ShieldCheck },
];

// ─── Step Indicator (Responsive Desktop & Mobile) ────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const activeStepObj = STEPS.find((s) => s.id === current) ?? STEPS[0];

  return (
    <div className="w-full">
      {/* Mobile-Optimized Stepper (< sm) */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[11px] font-bold flex items-center justify-center shadow-xs">
              {current}
            </span>
            <span className="text-xs font-bold text-foreground">
              {activeStepObj?.title ?? `Step ${current}`}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">
            Step {current} of {STEPS.length}
          </span>
        </div>

        {/* 5-segment Progress Track */}
        <div className="grid grid-cols-5 gap-1.5">
          {STEPS.map((s) => {
            const done = current > s.id;
            const active = current === s.id;
            return (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  done
                    ? 'bg-emerald-600'
                    : active
                    ? 'bg-zinc-950 dark:bg-zinc-100 ring-2 ring-zinc-500/20'
                    : 'bg-muted/70 border border-border/50'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop / Tablet Stepper (sm:) - Modern Progress Capsules */}
      <div className="hidden sm:flex items-center justify-between gap-1.5 w-full">
        {STEPS.map((stepItem, idx) => {
          const Icon = stepItem.icon;
          const isDone = current > stepItem.id;
          const isActive = current === stepItem.id;
          return (
            <React.Fragment key={stepItem.id}>
              <div
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 select-none shrink-0',
                  isActive
                    ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm ring-2 ring-primary/20 scale-[1.02]'
                    : isDone
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                    : 'text-muted-foreground/70 hover:text-muted-foreground',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                    isActive
                      ? 'bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-950'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-background border border-border/80 text-muted-foreground',
                  ].join(' ')}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : <Icon size={11} />}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">
                  {stepItem.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="flex-1 mx-1.5 h-0.5 rounded-full overflow-hidden bg-border/60">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isDone ? 'w-full bg-emerald-600' : 'w-0 bg-transparent'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function cleanPackageDisplayName(nameSnapshot?: string, packageName?: string): string {
  if (packageName && packageName.trim()) {
    return packageName.trim().replace(/[\s\-_]+v\d+(\.\d+)?$/i, '');
  }
  const raw = (nameSnapshot || '').trim();
  return raw.replace(/[\s\-_]+v\d+(\.\d+)?$/i, '').trim() || raw;
}

function formatEntitlementLabel(e: { entitlement_type: string; allocated_units?: number | string; is_unlimited?: boolean }): string {
  const words = (e.entitlement_type || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (e.is_unlimited) {
    return `Unlimited ${words}`;
  }
  const units = Math.round(Number(e.allocated_units || 0));
  const plural = units === 1 ? words : (words.endsWith('s') ? words : `${words}s`);
  return `${units} ${plural}`;
}

function formatBranchOptionText(b: any): string {
  if (!b) return '';
  const addr = (b.address || b.address_line_1 || b.location_name || b.city || '').trim();
  const name = (b.name || b.code || 'Studio').trim();
  if (addr && !name.toLowerCase().includes(addr.toLowerCase())) {
    return `${name} — ${addr}`;
  }
  return name;
}

// ─── Step 1: Package Picker ───────────────────────────────────────────────────

function PackagePickerStep({
  branchId,
  onBranchChange,
  selectedProgram,
  onProgramChange,
  selectedVersionId,
  onSelect,
}: {
  branchId: string;
  onBranchChange: (id: string) => void;
  selectedProgram: string | null;
  onProgramChange: (id: string) => void;
  selectedVersionId: string | null;
  onSelect: (id: string) => void;
}) {
  const currentUser = getCurrentUser();
  const tenantId = currentUser?.tenantId || 'default';

  const { data: branches = [] } = useQuery({
    queryKey: ['active-branches', tenantId],
    queryFn: () => crmApi.getBranches(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['catalog-programs', tenantId, branchId, 'conversion'],
    queryFn: () => crmApi.getCatalogPrograms({ branch_id: branchId, context: 'conversion' }),
    staleTime: 2 * 60 * 1000,
    enabled: !!branchId,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['catalog-versions', tenantId, branchId, selectedProgram, 'sellable'],
    queryFn: () => crmApi.getCatalogPackageVersions({
      branch_id: branchId,
      program_id: selectedProgram || undefined,
      sellable_only: true,
    }),
    staleTime: 2 * 60 * 1000,
    enabled: !!branchId && !!selectedProgram,
  });

  // Authoritative dependent state: if selectedProgram is not in the branch's eligible programs, reset it
  useEffect(() => {
    if (selectedProgram && programs.length > 0 && !programs.some((p) => p.id === selectedProgram)) {
      onProgramChange('');
    }
  }, [programs, selectedProgram, onProgramChange]);

  return (
    <div className="space-y-4">
      {/* 1 & 2. Studio Branch & Program Selection */}
      <div className="rounded-2xl border border-border bg-card/60 p-3.5 sm:p-4 space-y-3.5 shadow-xs">
        {/* Branch Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-bold text-foreground">Select Studio Branch</Label>
                <span className="text-rose-500 font-bold">*</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{branches.length} locations available</p>
            </div>
          </div>
          <div className="relative sm:w-80">
            <select
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full h-10 px-3.5 pr-9 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer shadow-xs transition-colors"
            >
              <option value="" disabled>Choose a studio branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatBranchOptionText(b)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <ChevronDown size={15} />
            </div>
          </div>
        </div>

        {/* Program Segmented Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500 fill-amber-500/20" />
              <span>Select Program</span>
            </Label>
            {programs.length > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">{programs.length} programs</span>
            )}
          </div>
          {!branchId ? (
            <div className="h-10 px-3 flex items-center text-xs text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border">
              Select branch first
            </div>
          ) : programsLoading ? (
            <div className="h-10 flex items-center gap-2 text-muted-foreground px-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-xs font-medium">Loading programs&hellip;</span>
            </div>
          ) : programs.length === 0 ? (
            <div className="h-10 px-3 flex items-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
              No active programs configured
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {programs.map((p) => {
                const isActive = selectedProgram === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onProgramChange(p.id)}
                    className={[
                      'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer text-center active:scale-[0.98] shadow-xs hover:-translate-y-0.5',
                      isActive
                        ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-950 dark:border-zinc-100 shadow-sm ring-2 ring-zinc-500/15'
                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/80',
                    ].join(' ')}
                  >
                    <span className="shrink-0">{getProgramIcon(p.name)}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Package Version Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Package size={13} className="text-primary" />
            <span>Select Package Version</span>
          </Label>
          {selectedProgram && (
            <span className="text-[11px] font-medium text-muted-foreground">{versions.length} available</span>
          )}
        </div>
        {!selectedProgram ? (
          <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-dashed border-border">
            Please select a program above to view available packages.
          </p>
        ) : versionsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
            <Loader2 size={16} className="animate-spin text-primary" />
            <span className="text-xs sm:text-sm font-medium">Loading packages for program&hellip;</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
            <Package size={24} className="mx-auto mb-1.5 opacity-40 text-primary" />
            <p className="text-xs sm:text-sm font-medium">No active packages for this program at this branch</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 max-h-72 overflow-y-auto pr-0.5">
            {versions.map((v) => {
              const selected = selectedVersionId === v.id;
              const activePrice = v.prices?.find((p: any) => p.status === 'ACTIVE') || v.prices?.[0];
              const rawPrice = v.effective_price ?? activePrice?.base_price;
              const currency = v.currency ?? activePrice?.currency ?? 'INR';
              const days = v.validity_days || v.total_days;

              // Dynamically extract session entitlements from package version
              const homeEnt = v.entitlement_definitions?.find((e: any) => e.entitlement_type === 'HOME_BRANCH_SESSION');
              const crossEnt = v.entitlement_definitions?.find((e: any) => e.entitlement_type === 'CROSS_BRANCH_SESSION');
              const otherSessionEnts = v.entitlement_definitions?.filter((e: any) =>
                e.entitlement_type !== 'HOME_BRANCH_SESSION' &&
                e.entitlement_type !== 'CROSS_BRANCH_SESSION' &&
                e.entitlement_type?.includes('SESSION')
              ) || [];

              const isUnlimited = Boolean(homeEnt?.is_unlimited || crossEnt?.is_unlimited);
              const homeUnits = homeEnt && !homeEnt.is_unlimited ? Math.round(Number(homeEnt.allocated_units || 0)) : 0;
              const crossUnits = crossEnt && !crossEnt.is_unlimited ? Math.round(Number(crossEnt.allocated_units || 0)) : 0;
              const otherUnits = otherSessionEnts.reduce((acc: number, e: any) => acc + (e.is_unlimited ? 0 : Math.round(Number(e.allocated_units || 0))), 0);
              const totalSessions = homeUnits + crossUnits + otherUnits;

              let sessionsBadge: string | null = null;
              if (isUnlimited) {
                sessionsBadge = 'Unlimited Sessions';
              } else if (totalSessions > 0) {
                sessionsBadge = `${totalSessions} ${totalSessions === 1 ? 'Session' : 'Sessions'}`;
              }

              const priceNum = rawPrice ? parseFloat(String(rawPrice)) : 0;
              const perSessionCost = (!isUnlimited && totalSessions > 0 && priceNum > 0)
                ? Math.round(priceNum / totalSessions)
                : null;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className={[
                    'w-full text-left rounded-xl p-3.5 transition-all duration-200 border relative group flex flex-col justify-between gap-2.5 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
                    selected
                      ? 'bg-primary/[0.06] dark:bg-primary/[0.12] border-primary shadow-sm ring-2 ring-primary/40'
                      : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                          {cleanPackageDisplayName(v.name_snapshot, v.package_name)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        {sessionsBadge && (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                            <Zap size={9} className="text-blue-500 fill-blue-500/30" />
                            {sessionsBadge}
                          </span>
                        )}
                        {days && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                            <Calendar size={10} className="text-emerald-600 dark:text-emerald-400" />
                            {days} Days
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20 scale-100'
                            : 'border-2 border-border/80 group-hover:border-primary/50'
                        }`}
                      >
                        {selected ? <Check size={11} strokeWidth={3} className="animate-in zoom-in-50 duration-150" /> : null}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                    <div>
                      {homeUnits > 0 && crossUnits > 0 ? (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {homeUnits} Home + {crossUnits} Cross
                        </span>
                      ) : perSessionCost ? (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatCurrency(perSessionCost, currency)} / sess
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      {rawPrice ? (
                        <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                          {formatCurrency(rawPrice, currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Price TBD</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Pricing Preview ──────────────────────────────────────────────────

function PricingStep({
  quote, couponCode, onCouponChange, onApplyCoupon, isApplyingCoupon,
}: {
  quote: ConversionQuote;
  couponCode: string;
  onCouponChange: (c: string) => void;
  onApplyCoupon: () => void;
  isApplyingCoupon: boolean;
}) {
  const p = quote.pricing;
  const pv = quote.package_version;
  const isUnlimited = quote.entitlements.some((e: any) => e.is_unlimited);
  const totalSessions = quote.entitlements.reduce((acc: number, e: any) => {
    if (e.is_unlimited) return acc;
    return acc + Math.round(Number(e.allocated_units || 0));
  }, 0);
  const sessionsBadge = isUnlimited ? 'Unlimited Sessions' : totalSessions > 0 ? `${totalSessions} Sessions` : null;

  return (
    <div className="space-y-4">
      {/* 1. Selected Package Summary Hero with integrated Inclusions */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/[0.06] via-card to-card border border-primary/20 p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/15">
              <Package size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-foreground text-sm sm:text-base tracking-tight">
                  {cleanPackageDisplayName(pv.name, (quote as any).package?.name)}
                </h4>
                {sessionsBadge && (
                  <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                    <Zap size={10} className="text-blue-500 fill-blue-500/30" />
                    {sessionsBadge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                  {quote.program.name}
                </span>
                {(pv.validity_days || pv.total_days) && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    <Calendar size={11} className="text-emerald-600 dark:text-emerald-400" />
                    {pv.validity_days || pv.total_days} Days Validity
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground block">Base Total</span>
            <span className="text-base sm:text-lg font-black text-foreground">
              {formatCurrency(p.subtotal, p.currency)}
            </span>
          </div>
        </div>

        {quote.entitlements.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Inclusions:</span>
            {quote.entitlements.map((e, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                <Star size={10} className="text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                {formatEntitlementLabel(e)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2 & 3: Coupon on Left, Price Breakdown on Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Left: Coupon Code Card */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs flex flex-col justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
              Coupon Code (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                className="bg-background border-border font-mono uppercase text-xs sm:text-sm h-10 tracking-wider"
              />
              <Button
                type="button"
                size="sm"
                onClick={onApplyCoupon}
                disabled={!couponCode.trim() || isApplyingCoupon}
                className="h-10 px-4 shrink-0 font-semibold rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-xs gap-1.5 cursor-pointer"
              >
                {isApplyingCoupon ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Apply</span>
                  </>
                )}
              </Button>
            </div>
            {quote.coupon && (
              <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${quote.coupon.is_valid ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium'}`}>
                {quote.coupon.is_valid ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                <span className="text-[11px] leading-tight">
                  {quote.coupon.is_valid
                    ? `Discount applied: ${formatCurrency(quote.coupon.discount_amount ?? '0', p.currency)}`
                    : quote.coupon.reason ?? 'Invalid coupon code'}
                </span>
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Tag size={13} className="text-primary shrink-0" />
            <span>Promotional discounts automatically adjust final payable amount.</span>
          </div>
        </div>

        {/* Right: Price Breakdown Card */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Price Breakdown
              </Label>
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                {p.currency}
              </span>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium text-xs">Subtotal</span>
                <span className="font-semibold text-foreground text-xs">{formatCurrency(p.subtotal, p.currency)}</span>
              </div>
              {parseFloat(p.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Discount</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">&minus;{formatCurrency(p.discount_amount, p.currency)}</span>
                </div>
              )}
              {parseFloat(p.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium text-xs">GST ({Math.round(parseFloat(quote.package_price.tax_percent || '0'))}%)</span>
                  <span className="font-semibold text-foreground text-xs">{formatCurrency(p.tax_amount, p.currency)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border/80 pt-2.5 flex justify-between items-center">
            <div>
              <span className="font-bold text-sm text-foreground block">Total Payable</span>
              <span className="text-[10px] text-muted-foreground">Taxes included</span>
            </div>
            <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(p.total_payable, p.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Payment Details ──────────────────────────────────────────────────

function PaymentStep({
  quote, paymentProvider, paymentAmount, startDate,
  onProviderChange, onAmountChange, onStartDateChange,
}: {
  quote: ConversionQuote;
  paymentProvider: PaymentProvider | '';
  paymentAmount: string;
  startDate: string;
  onProviderChange: (p: PaymentProvider) => void;
  onAmountChange: (a: string) => void;
  onStartDateChange: (d: string) => void;
}) {
  const quoted = parseFloat(quote.pricing.total_payable);
  const entered = parseFloat(paymentAmount || '0');
  const isShort = entered < quoted && entered > 0;
  const exceedsTotal = entered > quoted;

  // STRICT BACKEND-DRIVEN: Only render providers present in backend response. Zero fallback!
  const backendProviders = quote.payment_providers || [];
  const availableOptions = backendProviders.map((code) => ({
    value: code as PaymentProvider,
    label: PROVIDER_METADATA[code]?.label ?? code,
    icon: PROVIDER_METADATA[code]?.icon ?? '💳',
    description: PROVIDER_METADATA[code]?.description,
  }));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Payment Method Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
          Payment Method
        </Label>
        {availableOptions.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm">
            <AlertTriangle size={16} className="inline mr-2" />
            No payment method is currently configured for this branch or package. Please contact an administrator.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableOptions.map((p) => {
              const isSelected = paymentProvider === p.value;
              const isRazorpay = p.value === 'RAZORPAY';
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onProviderChange(p.value);
                    onAmountChange(quote.pricing.total_payable);
                  }}
                  className={[
                    'flex items-start justify-between p-4 rounded-xl border text-left transition-all duration-200 relative group active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
                    isSelected
                      ? 'bg-primary/[0.05] dark:bg-primary/[0.08] border-primary shadow-sm ring-2 ring-primary/30'
                      : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30 text-muted-foreground',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 mt-0.5">
                      {isRazorpay ? (
                        <RazorpayLogoIcon className="w-8 h-8" />
                      ) : (
                        <CashPaymentIcon className="w-8 h-8" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-bold block ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                          {isRazorpay ? 'Online Payment (Razorpay)' : 'Centre Cash Collection'}
                        </span>
                        {isRazorpay ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            Instant
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Approval Req.
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {p.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {isRazorpay ? (
                          <>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">UPI</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">Cards</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">EMI / PayLater</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">Netbanking</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">Paper Receipt</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">Cash In Hand</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20 scale-100'
                          : 'border-2 border-border/80 group-hover:border-primary/50'
                      }`}
                    >
                      {isSelected ? <Check size={12} strokeWidth={3} className="animate-in zoom-in-50 duration-150" /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Contextual Workflow Alerts */}
      {paymentProvider === 'CASH' && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 shadow-xs">
          <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
            <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Cash Collection & Approval Workflow</span>
          </div>
          <p className="leading-relaxed text-amber-800 dark:text-amber-300">
            Segregation of Duties Enforced: Cash collections are submitted for manager review under <strong>Automation → Approvals</strong>. The recording agent cannot self-approve. The membership activates once verified.
          </p>
        </div>
      )}

      {paymentProvider === 'RAZORPAY' && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs space-y-1.5 shadow-xs">
          <div className="font-bold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
            <CreditCard size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Full Upfront Settlement & Built-in Bank EMI / BNPL</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Razorpay natively provides Credit Card EMI, Debit Card EMI, and Cardless Pay Later (BNPL) at checkout. The club receives 100% upfront settlement immediately while the member pays in flexible monthly installments.
          </p>
        </div>
      )}

      {/* 3. Payment Amount Input & 4. Membership Start Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 items-start">
        {/* Payment Amount */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Payment to Record ({quote.pricing.currency})
            </Label>
            {paymentProvider === 'RAZORPAY' && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Full Upfront
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm sm:text-base font-bold">
              {new Intl.NumberFormat('en', { style: 'currency', currency: quote.pricing.currency ?? 'INR' })
                .formatToParts(0)
                .find((part) => part.type === 'currency')?.value ?? quote.pricing.currency}
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              disabled={paymentProvider === 'RAZORPAY'}
              value={paymentAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="bg-background border-border pl-8 h-10 text-base font-bold"
              placeholder={quote.pricing.total_payable}
            />
          </div>
          {paymentProvider === 'RAZORPAY' && (
            <p className="text-[11px] text-muted-foreground">
              EMI & BNPL installment options available at checkout.
            </p>
          )}
          {exceedsTotal && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
              <AlertTriangle size={13} />
              Cannot exceed {formatCurrency(quote.pricing.total_payable, quote.pricing.currency)}
            </p>
          )}
          {paymentProvider === 'CASH' && isShort && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <AlertTriangle size={13} />
              Less than quoted total of {formatCurrency(quote.pricing.total_payable, quote.pricing.currency)}
            </p>
          )}
        </div>

        {/* Membership Start Date */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border space-y-2.5 shadow-xs">
          <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            Membership Start Date
          </Label>
          <div className="relative">
            <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-background border-border pl-10 h-10 text-xs sm:text-sm font-medium"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Leave blank to activate immediately starting today.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── High-Fidelity Responsive Signature Pad ──────────────────────────────────

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null, hasSignature: boolean) => void;
}

function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef<boolean>(!!value);
  const initialLoadedRef = useRef<boolean>(false);

  // Synchronize internal canvas resolution with bounding dimensions & DPR
  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      let savedData: string | null = null;
      if (canvas.width > 0 && hasDrawnRef.current) {
        try {
          savedData = canvas.toDataURL('image/png');
        } catch {
          // ignore
        }
      } else if (value) {
        savedData = value;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      if (savedData) {
        const img = new Image();
        img.onload = () => {
          const ctx2 = canvas.getContext('2d');
          if (ctx2) {
            ctx2.clearRect(0, 0, canvas.width, canvas.height);
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = savedData;
      }
    }
  }, [value]);

  useEffect(() => {
    syncCanvasDimensions();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      syncCanvasDimensions();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [syncCanvasDimensions]);

  // Load existing signature on initial mount
  useEffect(() => {
    if (value && canvasRef.current && !initialLoadedRef.current) {
      initialLoadedRef.current = true;
      const canvas = canvasRef.current;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          hasDrawnRef.current = true;
          setHasSignature(true);
        }
      };
      img.src = value;
    }
  }, [value]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? canvas.width / rect.width : 1;
    ctx.lineWidth = Math.max(2.5 * scale, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0f172a';

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    const last = lastPointRef.current;

    const midX = (last.x + coords.x) / 2;
    const midY = (last.y + coords.y) / 2;

    ctx.quadraticCurveTo(last.x, last.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = coords;
    hasDrawnRef.current = true;
    if (!hasSignature) setHasSignature(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const dataUrl = canvas.toDataURL('image/png');
    const isValid = hasDrawnRef.current && dataUrl.length > 250;
    setHasSignature(isValid);
    onChange(isValid ? dataUrl : null, isValid);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPointRef.current = null;
    hasDrawnRef.current = false;
    setHasSignature(false);
    onChange(null, false);
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-primary" />
            <span>Personal Digital Signature</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={12} /> Captured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Clock size={12} /> Required
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 disabled:opacity-40"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear & Redraw</span>
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative h-36 sm:h-40 w-full rounded-2xl border-2 border-dashed border-border bg-white dark:bg-zinc-950 overflow-hidden shadow-inner transition-colors"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="w-full h-full block cursor-crosshair touch-none select-none"
        />

        {!hasSignature && !isDrawing && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-muted-foreground/60 select-none">
            <PenTool className="w-5 h-5 mb-1.5 opacity-40 text-primary" />
            <p className="text-xs font-semibold text-foreground/80">Draw member digital signature here</p>
            <p className="text-[11px] text-muted-foreground">Touch-screen, stylus, or mouse supported</p>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2.5 left-4 right-4 border-b border-muted-foreground/25 flex justify-between text-[10px] text-muted-foreground/60 pb-0.5 font-medium select-none">
          <span>Sign above this line</span>
          <span>{hasSignature ? '✓ Signature Verified & Active' : 'Draw inside the dashed box'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Terms & Conditions Agreement ─────────────────────────────────────

function TermsAndConditionsStep({
  quote,
  consentAccepted,
  onConsentChange,
  signatureData,
  onSignatureChange,
}: {
  quote: ConversionQuote;
  consentAccepted: boolean;
  onConsentChange: (accepted: boolean) => void;
  signatureData: string | null;
  onSignatureChange: (dataUrl: string | null, hasSignature: boolean) => void;
}) {
  const isUnlimited = quote.entitlements.some((e: any) => e.is_unlimited);
  const totalSessions = quote.entitlements.reduce((acc: number, e: any) => {
    if (e.is_unlimited) return acc;
    return acc + Math.round(Number(e.allocated_units || 0));
  }, 0);
  const sessionsBadge = isUnlimited ? 'Unlimited Sessions' : totalSessions > 0 ? `${totalSessions} Sessions` : null;
  const pkgName = cleanPackageDisplayName(quote.package_version.name, (quote as any).package?.name);
  const validityDays = quote.package_version.validity_days || quote.package_version.total_days || 730;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Header & Package Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Membership Terms & Agreement</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">SWEAT Studio Legal Terms · Version 1.0 (Active)</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Step 3 of 5
          </span>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">
              {pkgName}
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              {totalSessions > 0 ? `${totalSessions} sessions` : 'Sessions'} to be used at the Sweat Fit Wellness Studio.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sessionsBadge && (
              <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {sessionsBadge}
              </span>
            )}
            <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">
              {validityDays} Days Validity
            </span>
          </div>
        </div>
      </div>

      {/* 2. Important Legal Notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] sm:text-xs leading-relaxed">
          <strong className="font-semibold inline mr-1">Notice of Agreement Terms:</strong>
          Membership transfer to another individual is permissible for a ₹2,999 transfer fee. Standard memberships and services remain non-refundable. Both legal clauses apply upon package activation.
        </div>
      </div>

      {/* 3. Scrollable Clauses Reader */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 max-h-40 sm:max-h-44 overflow-y-auto text-xs text-foreground/90 leading-relaxed space-y-3 font-sans shadow-inner">
        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
            Introduction & Studio Standards
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            We are pleased to have you with us at Sweat Pilates, a product of Sweat Fit Wellness marketed as Sweat Pilates. At Sweat Pilates we prioritise your fitness goals, safety & comfort. Below mentioned terms & conditions to bring you the best experience at any given time.
            <br /><em>Note: Sweat Fit Wellness is mentioned as Sweat in most of the places in this document.</em>
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
            Agreement & Acknowledgment
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            Agreeing to all the terms & conditions of Sweat Fit Wellness before purchasing or taking any services from Sweat Fit Wellness is of utmost importance. By agreeing to terms & conditions you are agreeing that you have understood & agree to all the mentioned terms.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
            Results & Fitness Progression
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            Your results are an outcome of your lifestyle where Sweat can become an utmost important aspect to bring them into reality by providing correct guidance & information but implementation stays fully at your responsibility. As you continue your journey with the Sweat Pilates program, workouts that once felt difficult may become easier as your body adapts and gets stronger. Our program evolves with you by introducing new variations and intensity levels to keep you challenged and progressing.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">4</span>
            Pre Exercise Questionnaire & Health Safety
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            Your health and well-being are always our top priority. If at any point during your workout you feel unwell or experience discomfort, pause and seek medical advice. Consulting a healthcare professional before starting any new fitness program is recommended. While our trainers provide expert guidance, Sweat Fit Wellness and its trainers cannot be held liable for any health-related incidents.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">5</span>
            Class Booking, Attendance & Cancellation
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            You can book classes up to 30 days in advance and reserve spots in up to 7 classes at a time. Cancellations within 24 hours of scheduled class may result in deduction of the session from your package. Please arrive 10–15 minutes early. If a member is not scanned in by exact start time, the system will automatically release the reserved spot as an attended session.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">6</span>
            Membership Transfer & Refund Policy
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            Membership packages can be transferred to another individual for a fee of ₹2,999. Memberships and services are non-transferable and non-refundable. Access to Sweat premises requires an active booking. Kids and pets are discouraged inside premises for safety reasons. Support: support@sweatfitwellness.com.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-foreground flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">7</span>
            Closing Declaration
          </h5>
          <p className="text-muted-foreground text-[11px] mt-1 pl-5.5">
            By signing this agreement you have confirmed that you have understood and agreed to the T&C of this package.
          </p>
        </div>
      </div>

      {/* 4. Explicit Consent Checkbox */}
      <label
        className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
          consentAccepted
            ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20'
            : 'border-border bg-card hover:bg-muted/30'
        }`}
      >
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4"
        />
        <div className="text-xs">
          <span className="font-bold text-foreground block">
            By signing this agreement you have confirmed that you have understood and agreed to the T&C of this package.
          </span>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Explicit member consent and digital signature are mandatory before proceeding to payment.
          </p>
        </div>
      </label>

      {/* 5. Personal Digital Signature Capture Area */}
      <SignaturePad
        value={signatureData}
        onChange={onSignatureChange}
      />
    </div>
  );
}

// ─── Step 5: Review & Confirm ─────────────────────────────────────────────────

function ReviewStep({
  lead,
  quote,
  paymentProvider,
  paymentAmount,
  startDate,
  couponCode,
  signatureData,
  onEditTerms,
}: {
  lead: Lead;
  quote: ConversionQuote;
  paymentProvider: PaymentProvider;
  paymentAmount: string;
  startDate: string;
  couponCode: string;
  signatureData: string | null;
  onEditTerms?: () => void;
}) {
  const p = quote.pricing;
  const providerLabel = PROVIDER_METADATA[paymentProvider]?.label ?? paymentProvider;
  const isUnlimited = quote.entitlements.some((e: any) => e.is_unlimited);
  const totalSessions = quote.entitlements.reduce((acc: number, e: any) => {
    if (e.is_unlimited) return acc;
    return acc + Math.round(Number(e.allocated_units || 0));
  }, 0);
  const sessionsBadge = isUnlimited ? 'Unlimited Sessions' : totalSessions > 0 ? `${totalSessions} Sessions` : null;

  const pkgName = cleanPackageDisplayName(quote.package_version.name, (quote as any).package?.name);
  const validityDays = quote.package_version.validity_days || quote.package_version.total_days || 730;

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Member / Prospect', value: `${lead.first_name} ${lead.last_name}` },
    { label: 'Phone', value: lead.phone_normalized ?? '—' },
    { label: 'Program', value: quote.program.name },
    { label: 'Selected Package', value: pkgName },
    ...(sessionsBadge ? [{ label: 'Sessions Included', value: sessionsBadge, highlight: true }] : []),
    { label: 'Expiration Validity', value: `${validityDays} Days from Start Date` },
    ...(couponCode ? [{ label: 'Coupon Applied', value: couponCode }] : []),
    { label: 'Total Payable', value: formatCurrency(p.total_payable, p.currency), highlight: true },
    { label: 'Payment to Record', value: `${formatCurrency(paymentAmount, p.currency)} via ${providerLabel}`, highlight: true },
    { label: 'Package Start Date', value: startDate || 'Immediate / Today' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-start">
      {/* 1. Commercial Summary Table (Left Column) */}
      <div className="md:col-span-7 rounded-2xl bg-card border border-border divide-y divide-border/70 shadow-xs overflow-hidden">
        <div className="px-3.5 sm:px-4 py-2.5 bg-muted/30 border-b border-border/70 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Commercial Summary
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {rows.length} parameters verified
          </span>
        </div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-3.5 sm:px-4 py-2 text-xs sm:text-sm gap-2">
            <span className="text-muted-foreground font-medium text-[11px] sm:text-xs shrink-0">{r.label}</span>
            <span className={`text-right font-semibold truncate ${r.highlight ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {/* 2. Right Column: Payment Hero & Verified Signature */}
      <div className="md:col-span-5 space-y-3">
        {/* Payable Hero Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            Total Payable
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
            {formatCurrency(p.total_payable, p.currency)}
          </div>
          <div className="pt-2 border-t border-emerald-500/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Payment Method</span>
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              {paymentProvider === 'RAZORPAY' ? (
                <>
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.07 1L1.734 19.397h4.743L18.813 1H14.07z" fill="#3395FF" />
                      <path d="M15.47 1H2.072L0 4.09h13.398l2.072-3.09z" fill="#3395FF" />
                      <path d="M7.747 12.455L2.83 19.784H.123L5.04 12.455h2.707z" fill="#0284C7" />
                      <path d="M22.436 1l-11.91 17.733h4.945L24 1h-1.564z" fill="#0C2340" />
                    </svg>
                  </div>
                  <span>Razorpay Online</span>
                </>
              ) : (
                <>
                  <Wallet size={13} className="text-emerald-600" />
                  <span>Centre Cash</span>
                </>
              )}
            </div>
          </div>
          {startDate && (
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Start Date</span>
              <span className="font-semibold text-foreground">{startDate}</span>
            </div>
          )}
        </div>

        {/* Verified Agreement & Digital Signature Card */}
        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Terms Accepted</h4>
                <p className="text-[10px] text-muted-foreground">Digital signature verified</p>
              </div>
            </div>
            {onEditTerms && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEditTerms}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 rounded-lg border border-border/60 hover:bg-muted active:scale-95 transition-all cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Modify</span>
              </Button>
            )}
          </div>

          {signatureData ? (
            <div className="rounded-xl border border-border bg-white dark:bg-zinc-950 p-2.5 flex flex-col items-center justify-center shadow-xs gap-1.5">
              <div className="h-12 w-full flex items-center justify-center min-w-0">
                <img
                  src={signatureData}
                  alt="Member Signature"
                  className="max-h-12 max-w-full object-contain"
                />
              </div>
              <div className="w-full flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Verified
                </span>
                <span className="text-[10px] text-muted-foreground">Signed by {lead.first_name}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl">
              No digital signature attached
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStep({ result, lead, onClose }: { result: ConversionResult; lead: Lead; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Membership ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (result.status === 'PENDING_APPROVAL') {
    return (
      <div className="flex flex-col items-center text-center py-2 sm:py-4 space-y-6 max-w-lg mx-auto">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/5 dark:from-amber-400/20 dark:via-zinc-900 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Clock size={36} className="text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-background animate-pulse" />
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1.5">
            Cash Payment Submitted! 💵
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Receipt recorded for <span className="font-semibold text-foreground">{lead.first_name}</span>. A studio manager will verify this payment in the Approvals queue to activate full access.
          </p>
        </div>

        {/* Highlight Card */}
        <div className="w-full rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 p-4 sm:p-5 flex items-center justify-between gap-3 text-left shadow-xs">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock size={13} /> Provisional Membership
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground mt-0.5 truncate">
              {result.membership_number || 'Awaiting Verification'}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            Pending Sign-off
          </span>
        </div>

        {/* Structured Details with Equal Spacing */}
        <div className="w-full rounded-2xl bg-card border border-border/80 divide-y divide-border/60 text-left shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Receipt size={14} className="text-muted-foreground/70" /> Order Reference
            </span>
            <span className="font-semibold font-mono text-foreground">{result.order_number}</span>
          </div>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Wallet size={14} className="text-muted-foreground/70" /> Cash Amount to Collect
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(result as any).amount || result.total_paid}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Package size={14} className="text-muted-foreground/70" /> Temporary Sessions
            </span>
            <span className="font-medium text-foreground">
              {(result as any).provisional_sessions ?? 4} Sessions (Grace Access)
            </span>
          </div>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <FileText size={14} className="text-muted-foreground/70" /> Approval Ticket
            </span>
            <span className="font-mono text-xs text-muted-foreground">{result.approval_request_id}</span>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full h-11 sm:h-12 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-sm shadow-md gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          <CheckCircle2 size={16} />
          <span>Done & Return to Leads</span>
        </Button>
      </div>
    );
  }

  const isPartial = result.status === 'PARTIAL_PAYMENT_RECORDED';

  return (
    <div className="flex flex-col items-center text-center py-2 sm:py-4 space-y-6 max-w-lg mx-auto">
      {/* Celebratory Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/5 dark:from-emerald-400/20 dark:via-zinc-900 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <CheckCircle2 size={40} className="text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
        </div>
        <div className="absolute -top-1.5 -right-1.5">
          <Sparkles size={20} className="text-amber-400 animate-bounce" />
        </div>
      </div>

      {/* Heading & Friendly Subtitle */}
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1.5">
          {isPartial ? 'First Installment Recorded! 💳' : `Welcome, ${lead.first_name}! 🎉`}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {isPartial
            ? 'First payment received. The remaining balance has been scheduled on the member profile.'
            : 'Membership is officially active! They are now ready to book sessions and check in.'}
        </p>
      </div>

      {/* Featured Membership ID Card */}
      <div className="w-full rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/25 p-4 sm:p-5 flex items-center justify-between gap-3 text-left shadow-xs">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Official Membership Number
          </span>
          <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-foreground mt-0.5 truncate">
            {result.membership_number}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleCopy(result.membership_number)}
          className="rounded-xl border-emerald-500/30 bg-background/80 hover:bg-background text-emerald-700 dark:text-emerald-300 gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all active:scale-95"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>

      {/* Details Grid with Equal Spacing & User-Friendly Labels */}
      <div className="w-full rounded-2xl bg-card border border-border/80 divide-y divide-border/60 text-left shadow-sm overflow-hidden">
        {isPartial ? (
          <>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Receipt size={14} className="text-muted-foreground/70" /> Order Reference
              </span>
              <span className="font-semibold font-mono text-foreground">{result.order_number}</span>
            </div>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Wallet size={14} className="text-muted-foreground/70" /> Amount Paid Today
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{result.total_paid}</span>
            </div>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground/70" /> Remaining Balance
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">₹{result.outstanding_balance}</span>
            </div>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <ShieldCheck size={14} className="text-muted-foreground/70" /> Membership Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {result.membership_activated ? 'Active (Grace Access)' : 'Pending Settlement'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Receipt size={14} className="text-muted-foreground/70" /> Order Reference
              </span>
              <span className="font-semibold font-mono text-foreground">{result.order_number}</span>
            </div>

            {result.invoice_number && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <FileText size={14} className="text-muted-foreground/70" /> Tax Invoice #
                </span>
                <span className="font-semibold font-mono text-foreground">{result.invoice_number}</span>
              </div>
            )}

            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <UserCheck size={14} className="text-muted-foreground/70" /> Member Account
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {result.identity_created ? 'Profile Created & Active' : 'Profile Ready & Linked'}
              </span>
            </div>

            <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground/70" /> Enrolled On
              </span>
              <span className="font-medium text-foreground">
                {result.converted_at
                  ? new Date(result.converted_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Today'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Done Button */}
      <Button
        onClick={onClose}
        className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 gap-2 cursor-pointer transition-all active:scale-[0.99]"
      >
        <CheckCircle2 size={16} />
        <span>Done & Return to Leads</span>
      </Button>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export interface ConversionWizardProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function ConversionWizard({ lead, open, onOpenChange, onConverted }: ConversionWizardProps) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRecordPayment = can('finance.payments.create') || can('core.settings.edit');
  const [step, setStep] = useState(1);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(lead.branch ?? '');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(lead.interested_program ?? null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | ''>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const rzpInstanceRef = useRef<any>(null);
  const [termsConsentAccepted, setTermsConsentAccepted] = useState(false);
  const [termsSignatureData, setTermsSignatureData] = useState<string | null>(null);
  const [termsHasSignature, setTermsHasSignature] = useState(false);

  const handleSignatureChange = useCallback((dataUrl: string | null, hasSig: boolean) => {
    setTermsSignatureData(dataUrl);
    setTermsHasSignature(hasSig);
  }, []);
const handleCancelRazorpay = useCallback(() => {
    setIsProcessingPayment(false);
    rzpInstanceRef.current = null;
    const rzpContainer = document.querySelector('.razorpay-container');
    if (rzpContainer) {
      rzpContainer.remove();
    }
    document.body.style.pointerEvents = 'auto';
    toast.info('Payment was cancelled. You can retry checkout when ready.');
  }, []);

  useEffect(() => {
    if (!isProcessingPayment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancelRazorpay();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isProcessingPayment, handleCancelRazorpay]);

  useEffect(() => {
    if (!isProcessingPayment) return;
    const interval = setInterval(() => {
      const container = document.querySelector('.razorpay-container') as HTMLElement | null;
      if (container && !container.dataset.hasCloseHandler) {
        container.dataset.hasCloseHandler = 'true';
        container.addEventListener('click', (e) => {
          if (e.target === container) {
            handleCancelRazorpay();
          }
        });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isProcessingPayment, handleCancelRazorpay]);

  useEffect(() => {
    if (open) {
      setSelectedBranchId(lead.branch ?? '');
      setSelectedProgramId(lead.interested_program ?? null);
      setSelectedVersionId(null);
      setQuote(null);
      setError(null);
    } else {
      setStep(1); setSelectedVersionId(null); setCouponCode(''); setAppliedCoupon('');
      setPaymentProvider(''); setPaymentAmount(''); setStartDate('');
      setQuote(null); setResult(null); setError(null);
      setTermsSignatureData(null); setTermsHasSignature(false); setTermsConsentAccepted(false);
    }
  }, [open, lead.branch, lead.interested_program]);

  const currentUser = getCurrentUser();
  const tenantId = currentUser?.tenantId || 'default';

  const handleBranchChange = useCallback((newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setSelectedProgramId(null);
    setSelectedVersionId(null);
    setCouponCode('');
    setAppliedCoupon('');
    setQuote(null);
    setError(null);
  }, []);

  const handleProgramChange = useCallback((newProgId: string) => {
    setSelectedProgramId(newProgId || null);
    setSelectedVersionId(null);
    setCouponCode('');
    setAppliedCoupon('');
    setQuote(null);
    setError(null);
  }, []);

  const handleVersionSelect = useCallback((verId: string | null) => {
    setSelectedVersionId(verId);
    setCouponCode('');
    setAppliedCoupon('');
    setQuote(null);
    setError(null);
  }, []);

  const { data: eligibility } = useQuery({
    queryKey: ['conversion-eligibility', tenantId, lead.id],
    queryFn: () => crmApi.getConversionEligibility(lead.id),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const fetchQuote = useCallback(async (versionId: string, coupon?: string) => {
    if (!selectedBranchId) return null;
    setError(null);
    setIsFetchingQuote(true);
    try {
      const quotePayload: { package_version_id: string; branch_id: string; coupon_code?: string } = {
        package_version_id: versionId,
        branch_id: selectedBranchId,
      };
      if (coupon) quotePayload.coupon_code = coupon;
      const q = await crmApi.getConversionQuote(lead.id, quotePayload);
      setQuote(q);
      setPaymentAmount(q.pricing.total_payable);
      // Backend authoritative: set default provider if none selected
      if (q.payment_providers && q.payment_providers.length > 0 && !paymentProvider) {
        setPaymentProvider(q.payment_providers[0] as PaymentProvider);
      }
      return q;
    } catch (err: any) {
      const resp = err?.response;
      const data = resp?.data;
      const msg = (data?.error ?? data?.detail ?? err?.message ?? 'Failed to get quote') as string;
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsFetchingQuote(false);
    }
  }, [lead.id, selectedBranchId, paymentProvider]);

  const handleApplyCoupon = useCallback(async () => {
    if (!selectedVersionId || !couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      await fetchQuote(selectedVersionId, couponCode.trim());
      setAppliedCoupon(couponCode.trim());
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [selectedVersionId, couponCode, fetchQuote]);

  const convertMutation = useMutation<ConversionResult, Error, ConversionPayload>({
    mutationFn: (payload: ConversionPayload) => crmApi.executeConversion(lead.id, payload),
    onSuccess: (data) => {
      setResult(data);
      setStep(6);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['conversion-eligibility', lead.id] });
      if (data.status === 'PENDING_APPROVAL') {
        toast.info('Cash payment recorded and submitted for manager approval');
      } else {
        toast.success(`${lead.first_name} is now a member!`);
      }
      onConverted?.();
    },
    onError: (err: any) => {
      const resp = err?.response;
      const data = resp?.data;
      const code = data?.code as string | undefined;
      const msg = (data?.error ?? data?.detail ?? err?.message ?? 'Conversion failed') as string;
      if (code === 'ALREADY_CONVERTED') {
        setError('This lead is already converted. Refresh the page to see updated status.');
      } else if (code === 'PAYMENT_AUTHORITY_REQUIRED') {
        setError('Payment authority required: You do not have permission to record payments (finance.payments.create).');
      } else if (code === 'IDEMPOTENCY_CONFLICT') {
        setError(`Idempotency conflict: ${msg}`);
      } else if (code === 'IDENTITY_CONFLICT') {
        setError(`Identity conflict: ${msg}. Please resolve manually before converting.`);
      } else {
        setError(msg);
      }
      toast.error(msg);
    },
  });

  const handleNext = useCallback(async () => {
    setError(null);
    if (step === 1) {
      if (!selectedBranchId) { toast.error('Please select a branch'); return; }
      if (!selectedVersionId) { toast.error('Please select a package'); return; }
      const q = await fetchQuote(selectedVersionId);
      if (q) setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!termsConsentAccepted) {
        toast.error('You must explicitly agree to the Terms & Conditions before proceeding.');
        setError('Please check the Terms & Conditions agreement box.');
        return;
      }
      if (!termsHasSignature || !termsSignatureData) {
        toast.error('Member digital signature is required before proceeding.');
        setError('Please draw the member digital signature in the signature pad.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!paymentProvider) { toast.error('Please select a payment method'); return; }
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) { toast.error('Please enter a valid payment amount'); return; }
      if (paymentProvider === 'RAZORPAY' && quote && parseFloat(paymentAmount) < parseFloat(quote.pricing.total_payable)) {
        toast.error('Razorpay online checkout requires full package payment'); return;
      }
      setStep(5);
    } else if (step === 5) {
      if (!selectedVersionId || !selectedBranchId || !paymentProvider || !paymentAmount) return;

      if (!termsConsentAccepted) {
        toast.error('You must explicitly agree to the Terms & Conditions.');
        setStep(3);
        return;
      }

      if (!termsHasSignature || !termsSignatureData) {
        toast.error('Member digital signature is required.');
        setStep(3);
        return;
      }

      const sigData = termsSignatureData;
      const payload: ConversionPayload = {
        package_version_id: selectedVersionId,
        branch_id: selectedBranchId,
        payment_provider: paymentProvider,
        payment_amount: paymentAmount,
        idempotency_key: idempotencyKey,
        signature_data: sigData,
        agreement_accepted: true,
      } as any;
      if (appliedCoupon) payload.coupon_code = appliedCoupon;
      if (startDate) payload.start_date = startDate;

      if (paymentProvider === 'RAZORPAY') {
        try {
          setIsProcessingPayment(true);
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
            toast.error('Razorpay SDK failed to load. Please check your network.');
            setIsProcessingPayment(false);
            return;
          }

          const checkoutOrder = await crmApi.createCheckoutOrder(lead.id, {
            package_version_id: selectedVersionId,
            branch_id: selectedBranchId,
            coupon_code: appliedCoupon || undefined,
            is_partial_payment: false,
            channel: 'STAFF',
          });

          const options = {
            key: checkoutOrder.key_id,
            amount: checkoutOrder.amount,
            currency: checkoutOrder.currency,
            name: checkoutOrder.name || 'SWEAT',
            description: checkoutOrder.description,
            order_id: checkoutOrder.razorpay_order_id,
            prefill: checkoutOrder.prefill,
            theme: { color: '#0f172a' },
            config: checkoutOrder.config,
            ...(checkoutOrder.config_id ? { config_id: checkoutOrder.config_id } : {}),
            handler: function (response: any) {
              rzpInstanceRef.current = null;
              const rzpContainer = document.querySelector('.razorpay-container');
              if (rzpContainer) {
                rzpContainer.remove();
              }
              document.body.style.pointerEvents = 'auto';
              const completePayload: ConversionPayload = {
                ...payload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: checkoutOrder.order_id,
                is_partial_payment: false,
                idempotency_key: response.razorpay_order_id,
                signature_data: sigData,
                agreement_accepted: true,
              } as any;
              convertMutation.mutate(completePayload);
              setIsProcessingPayment(false);
            },
            modal: {
              backdropclose: true,
              escape: true,
              confirm_close: false,
              ondismiss: function () {
                handleCancelRazorpay();
              },
            },
          };

          if (rzpInstanceRef.current) {
            return;
          }
          const rzp = new (window as any).Razorpay(options);
          rzpInstanceRef.current = rzp;
          rzp.on('payment.failed', function (resp: any) {
            setIsProcessingPayment(false);
            rzpInstanceRef.current = null;
            const rzpContainer = document.querySelector('.razorpay-container');
            if (rzpContainer) {
              rzpContainer.remove();
            }
            document.body.style.pointerEvents = 'auto';
            const desc = resp?.error?.description || 'Payment failed';
            toast.error(`Razorpay: ${desc}`);
          });
          rzp.open();
        } catch (err: any) {
          setIsProcessingPayment(false);
          const msg = err?.response?.data?.error || err?.message || 'Failed to initialize Razorpay checkout';
          toast.error(msg);
          setError(msg);
        }
      } else {
        convertMutation.mutate(payload);
      }
    }
  }, [step, selectedVersionId, selectedBranchId, fetchQuote, paymentProvider, paymentAmount, quote, appliedCoupon, startDate, idempotencyKey, convertMutation, termsConsentAccepted, termsHasSignature, termsSignatureData, handleCancelRazorpay]);

  const handleBack = () => { setError(null); setStep((s) => Math.max(1, s - 1)); };
  const handleClose = () => {
    if (isProcessingPayment) {
      handleCancelRazorpay();
    }
    onOpenChange(false);
  };
  const isConverting = convertMutation.isPending;
  const showSuccess = step === 6 && result;
  const notEligible = eligibility && !eligibility.eligible && lead.current_status === 'CONVERTED';

  return (
    <Dialog
      open={open}
      modal={!isProcessingPayment}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isProcessingPayment) {
          handleCancelRazorpay();
        }
        onOpenChange(nextOpen);
      }}
    >
        <DialogContent
          onClose={handleClose}
          onPointerDownOutside={(e) => {
            if (isProcessingPayment) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isProcessingPayment) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isProcessingPayment) e.preventDefault();
          }}
          className="w-[96vw] sm:w-[94vw] md:w-[840px] max-w-[840px] h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[min(90vh,740px)] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-2xl"
        >
        {/* Header */}
        <DialogHeader className="px-5 sm:px-6 pt-4 sm:pt-5 pb-3.5 sm:pb-4 border-b border-border/80 shrink-0 bg-background/95 backdrop-blur-sm pr-12 sm:pr-14">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {showSuccess ? (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-500/5 dark:from-emerald-400/20 dark:via-zinc-900 border border-emerald-500/30 dark:border-emerald-400/30 flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={22} className="text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/5 dark:from-amber-400/20 dark:via-zinc-900 dark:to-zinc-950 border border-amber-500/30 dark:border-amber-400/30 flex items-center justify-center shadow-xs">
                  <Zap size={20} className="fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500/30" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Primary Title + Status Row */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {showSuccess ? 'Member Enrolled Successfully' : 'Convert to Member'}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {showSuccess ? 'Active Member' : 'Active Lead'}
                  </span>
                </div>

                {/* Step Progress Pill */}
                {showSuccess ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs shrink-0">
                    <Check size={12} strokeWidth={2.5} />
                    Onboarding Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted/80 text-foreground/80 border border-border/70 shadow-xs shrink-0">
                    <span className="text-primary font-bold">Step {step} of 5</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-muted-foreground font-medium">{STEPS.find((s) => s.id === step)?.title}</span>
                  </span>
                )}
              </div>

              {/* Lead Identity & Context Chips */}
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                {/* Lead Name with Initials Avatar */}
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/25 text-[10px] font-bold inline-flex items-center justify-center shrink-0 shadow-xs">
                    {lead.first_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <span className="font-semibold text-foreground/90">
                    {lead.first_name} {lead.last_name}
                  </span>
                </span>

                {/* Phone Chip */}
                {lead.phone_normalized && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-[11px] text-muted-foreground">
                    <Phone size={10} className="text-muted-foreground/70 shrink-0" />
                    <span className="font-mono tracking-tight">{lead.phone_normalized}</span>
                  </span>
                )}

                {/* Branch / Studio Chip */}
                {lead.branch_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium">
                    <Building2 size={11} className="text-primary shrink-0" />
                    <span>{lead.branch_name}</span>
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Pinned Stepper Toolbar */}
        {!notEligible && !showSuccess && (
          <div className="px-4 sm:px-6 py-2 sm:py-2.5 border-b border-border/70 bg-muted/20 shrink-0">
            <StepIndicator current={step} />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">
          {notEligible ? (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-foreground mb-1">Already a Member</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{eligibility!.message}</p>
              </div>
              <Button onClick={handleClose} variant="outline">Close</Button>
            </div>
          ) : showSuccess && result ? (
            <SuccessStep result={result} lead={lead} onClose={handleClose} />
          ) : (
            <>
              <div key={step} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 fill-mode-both">
                {step === 1 && (
                  <PackagePickerStep
                    branchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    selectedProgram={selectedProgramId}
                    onProgramChange={handleProgramChange}
                    selectedVersionId={selectedVersionId}
                    onSelect={handleVersionSelect}
                  />
                )}
                {step === 2 && quote && (
                  <PricingStep
                    quote={quote}
                    couponCode={couponCode}
                    onCouponChange={setCouponCode}
                    onApplyCoupon={handleApplyCoupon}
                    isApplyingCoupon={isApplyingCoupon}
                  />
                )}
                {step === 3 && quote && (
                  <TermsAndConditionsStep
                    quote={quote}
                    consentAccepted={termsConsentAccepted}
                    onConsentChange={setTermsConsentAccepted}
                    signatureData={termsSignatureData}
                    onSignatureChange={handleSignatureChange}
                  />
                )}
                {step === 4 && quote && (
                  <PaymentStep
                    quote={quote}
                    paymentProvider={paymentProvider}
                    paymentAmount={paymentAmount}
                    startDate={startDate}
                    onProviderChange={setPaymentProvider}
                    onAmountChange={setPaymentAmount}
                    onStartDateChange={setStartDate}
                  />
                )}
                {step === 5 && quote && (
                  <ReviewStep
                    lead={lead}
                    quote={quote}
                    paymentProvider={paymentProvider as PaymentProvider}
                    paymentAmount={paymentAmount}
                    startDate={startDate}
                    couponCode={appliedCoupon}
                    signatureData={termsSignatureData}
                    onEditTerms={() => setStep(3)}
                  />
                )}
              </div>

              {!canRecordPayment && (step === 4 || step === 5) && (
                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Payment Authority Required</p>
                    <p className="text-muted-foreground mt-0.5">
                      You have permission to prepare this conversion (<code>crm.leads.convert</code>), but payment recording permission (<code>finance.payments.create</code>) is required to record offline payment collections. Please have an authorized staff member confirm the payment.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showSuccess && !notEligible && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border/80 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={step === 1 ? handleClose : handleBack}
              disabled={isConverting || isFetchingQuote || isProcessingPayment}
              className="rounded-xl h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm text-muted-foreground hover:text-foreground gap-1.5 font-semibold group active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-200" />
              <span>{step === 1 ? 'Cancel' : 'Back'}</span>
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={
                isConverting || isProcessingPayment || isApplyingCoupon || isFetchingQuote ||
                (step === 1 && !selectedVersionId) ||
                (step === 3 && (!termsConsentAccepted || !termsHasSignature)) ||
                (step === 4 && (!paymentProvider || !paymentAmount)) ||
                (step === 5 && !canRecordPayment)
              }
              className={`rounded-xl h-10 sm:h-11 px-4 sm:px-6 gap-2 font-bold text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer group ${
                step === 5
                  ? (canRecordPayment && termsConsentAccepted && termsHasSignature)
                    ? paymentProvider === 'RAZORPAY'
                      ? 'bg-gradient-to-r from-[#0C2340] via-[#102d52] to-[#0C2340] hover:from-[#14345c] hover:to-[#102d52] text-white border border-sky-400/40 shadow-lg shadow-sky-950/20'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              }`}
            >
              {(isConverting || isProcessingPayment || isFetchingQuote) ? (
                <><Loader2 size={14} className="animate-spin" />{isProcessingPayment ? 'Opening Razorpay…' : isConverting ? 'Converting…' : 'Loading…'}</>
              ) : step === 5 ? (
                canRecordPayment ? (
                  paymentProvider === 'RAZORPAY' ? (
                    <>
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.07 1L1.734 19.397h4.743L18.813 1H14.07z" fill="#3395FF" />
                          <path d="M15.47 1H2.072L0 4.09h13.398l2.072-3.09z" fill="#3395FF" />
                          <path d="M7.747 12.455L2.83 19.784H.123L5.04 12.455h2.707z" fill="#0284C7" />
                          <path d="M22.436 1l-11.91 17.733h4.945L24 1h-1.564z" fill="#FFFFFF" />
                        </svg>
                      </div>
                      <span>Pay with Razorpay</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-white" />
                      <span>Confirm Conversion</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )
                ) : (
                  <><ShieldCheck size={14} />Payment Authority Required</>
                )
              ) : step === 3 ? (
                <>
                  <span>Continue to Payment</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </>
              ) : step === 4 ? (
                <>
                  <span>Review & Confirm</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>

    </Dialog>
  );
}
