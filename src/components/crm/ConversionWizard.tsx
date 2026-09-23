/**
 * src/components/crm/ConversionWizard.tsx
 * CRM Phase 8 - Lead to Member Conversion Wizard
 * Theme-aware (Light & Dark), zero-mock, backend-authoritative payment & pricing.
 */
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, Loader2, Package, CreditCard,
  Tag, Calendar, Sparkles, AlertTriangle, ShieldCheck, X, Zap, UserCheck, Star, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/permissions';
import { crmApi } from '@/services/crmApi';
import type { Lead, ConversionQuote, ConversionPayload, ConversionResult, PaymentProvider } from '@/types/crm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number, currency = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
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

// Presentation metadata for supported payment providers
const PROVIDER_METADATA: Record<string, { label: string; icon: string }> = {
  CASH: { label: 'Cash', icon: '💵' },
  RAZORPAY: { label: 'Razorpay', icon: '⚡' },
  ICICI_POS: { label: 'ICICI POS', icon: '🏧' },
  BANK_TRANSFER: { label: 'Bank Transfer', icon: '🏦' },
  STRIPE: { label: 'Stripe', icon: '💳' },
  OTHER: { label: 'Other', icon: '💰' },
};

const STEPS = [
  { id: 1, label: 'Package', icon: Package },
  { id: 2, label: 'Pricing', icon: Tag },
  { id: 3, label: 'Payment', icon: CreditCard },
  { id: 4, label: 'Confirm', icon: ShieldCheck },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 px-2">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={[
                'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 text-xs sm:text-sm font-semibold',
                done ? 'bg-emerald-600 text-white shadow shadow-emerald-500/30' :
                  active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' :
                  'bg-muted text-muted-foreground border border-border',
              ].join(' ')}>
                {done ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium tracking-wide ${active ? 'text-primary font-semibold' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px flex-1 max-w-[2rem] sm:max-w-[3rem] mb-4 transition-all duration-500 ${done ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Package Picker ───────────────────────────────────────────────────

function PackagePickerStep({
  selectedVersionId,
  onSelect,
}: {
  selectedVersionId: string | null;
  onSelect: (id: string) => void;
}) {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['catalog-programs'],
    queryFn: () => crmApi.getCatalogPrograms(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['catalog-versions', selectedProgram],
    queryFn: () => crmApi.getCatalogPackageVersions({ program_id: selectedProgram ?? undefined }),
    staleTime: 2 * 60 * 1000,
    enabled: programs.length > 0,
  });

  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) setSelectedProgram(programs[0].id);
  }, [programs, selectedProgram]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Program</h3>
        {programsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-3">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs sm:text-sm">Loading programs&hellip;</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProgram(p.id)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border',
                  selectedProgram === p.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border-border',
                ].join(' ')}
              >{p.name}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Package Version</h3>
        {versionsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-3">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs sm:text-sm">Loading packages&hellip;</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
            <Package size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs sm:text-sm font-medium">No active packages for this program</p>
          </div>
        ) : (
          <div className="grid gap-2.5 max-h-64 overflow-y-auto pr-1">
            {versions.map((v) => {
              const selected = selectedVersionId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className={[
                    'w-full text-left rounded-xl p-3.5 sm:p-4 transition-all duration-200 border',
                    selected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card border-border hover:border-primary/50 hover:bg-accent/40',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-foreground text-sm truncate">{v.name_snapshot}</span>
                        {v.version_number > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            v{v.version_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />{formatDuration(v.duration_value, v.duration_unit)}
                        </span>
                        {v.package_name && <span className="opacity-70">&middot; {v.package_name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {v.effective_price
                        ? <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.effective_price, v.currency)}</div>
                        : <div className="text-xs text-muted-foreground">Price TBD</div>
                      }
                      {selected && <Check size={14} className="text-primary ml-auto mt-1" />}
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
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package size={16} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{pv.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{quote.program.name} &middot; {formatDuration(pv.duration_value, pv.duration_unit)}</p>
          </div>
        </div>
      </div>

      {quote.entitlements.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Included Entitlements</p>
          <div className="flex flex-wrap gap-2">
            {quote.entitlements.map((e, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                <Star size={11} />
                {e.is_unlimited ? `Unlimited ${e.entitlement_type.replace(/_/g, ' ')}` : `${e.allocated_units} x ${e.entitlement_type.replace(/_/g, ' ')}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Coupon Code (Optional)</Label>
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="bg-background border-border font-mono uppercase text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={onApplyCoupon}
            disabled={!couponCode.trim() || isApplyingCoupon}
            className="px-4 shrink-0"
          >
            {isApplyingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
          </Button>
        </div>
        {quote.coupon && (
          <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${quote.coupon.is_valid ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
            {quote.coupon.is_valid ? <Check size={12} /> : <X size={12} />}
            {quote.coupon.is_valid
              ? `Coupon valid — discount ${formatCurrency(quote.coupon.discount_amount ?? '0', p.currency)}`
              : quote.coupon.reason ?? 'Invalid coupon'}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-2.5 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Breakdown</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">{formatCurrency(p.subtotal, p.currency)}</span>
        </div>
        {parseFloat(p.discount_amount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">&minus;{formatCurrency(p.discount_amount, p.currency)}</span>
          </div>
        )}
        {parseFloat(p.tax_amount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({quote.package_price.tax_percent}%)</span>
            <span className="text-foreground">{formatCurrency(p.tax_amount, p.currency)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2.5 flex justify-between items-center">
          <span className="font-semibold text-foreground">Total Payable</span>
          <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(p.total_payable, p.currency)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Payment Details ──────────────────────────────────────────────────

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

  // STRICT BACKEND-DRIVEN: Only render providers present in backend response. Zero fallback!
  const backendProviders = quote.payment_providers || [];
  const availableOptions = backendProviders.map((code) => ({
    value: code as PaymentProvider,
    label: PROVIDER_METADATA[code]?.label ?? code,
    icon: PROVIDER_METADATA[code]?.icon ?? '💳',
  }));

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
          Payment Method (Configured Providers)
        </Label>
        {availableOptions.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm">
            <AlertTriangle size={16} className="inline mr-2" />
            No payment method is currently configured for this branch or package. Please contact an administrator.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onProviderChange(p.value)}
                className={[
                  'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all duration-200',
                  paymentProvider === p.value
                    ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm'
                    : 'bg-card border-border hover:bg-accent/40 text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="text-xs">{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Payment Amount to Record ({quote.pricing.currency})
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">&#8377;</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={paymentAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="bg-background border-border pl-7 text-base sm:text-lg font-semibold"
            placeholder={quote.pricing.total_payable}
          />
        </div>
        {isShort && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
            <AlertTriangle size={12} />
            Amount is less than quoted total of {formatCurrency(quote.pricing.total_payable, quote.pricing.currency)}
          </p>
        )}
        {entered >= quoted && entered > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
            Amount to record matches quote ({formatCurrency(quote.pricing.total_payable, quote.pricing.currency)})
          </p>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Membership Start Date</Label>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-background border-border pl-9 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Leave blank to start today</p>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Confirm ─────────────────────────────────────────────────

function ReviewStep({
  lead, quote, paymentProvider, paymentAmount, startDate, couponCode,
}: {
  lead: Lead;
  quote: ConversionQuote;
  paymentProvider: PaymentProvider;
  paymentAmount: string;
  startDate: string;
  couponCode: string;
}) {
  const p = quote.pricing;
  const providerLabel = PROVIDER_METADATA[paymentProvider]?.label ?? paymentProvider;
  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Lead', value: `${lead.first_name} ${lead.last_name}` },
    { label: 'Phone', value: lead.phone_normalized ?? '—' },
    { label: 'Program', value: quote.program.name },
    { label: 'Package', value: quote.package_version.name },
    { label: 'Duration', value: formatDuration(quote.package_version.duration_value, quote.package_version.duration_unit) },
    ...(couponCode ? [{ label: 'Coupon', value: couponCode }] : []),
    { label: 'Total Payable', value: formatCurrency(p.total_payable, p.currency), highlight: true },
    { label: 'Payment to Record', value: `${formatCurrency(paymentAmount, p.currency)} via ${providerLabel}`, highlight: true },
    { label: 'Start Date', value: startDate || 'Today' },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-card border border-border divide-y divide-border shadow-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`font-medium ${r.highlight ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm font-semibold text-foreground mb-1">Commercial Conversion Finalization</p>
          <p className="text-xs text-muted-foreground">
            Confirming will atomically record the payment transaction, activate membership entitlements, issue an invoice,
            and transition this lead to <strong>CONVERTED</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Success ──────────────────────────────────────────────────────────

function SuccessStep({ result, lead, onClose }: { result: ConversionResult; lead: Lead; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-4 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles size={18} className="text-amber-500 animate-bounce" />
        </div>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Welcome, {lead.first_name}! 🎉</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">Lead successfully converted to an active member</p>
      </div>

      <div className="w-full rounded-xl bg-card border border-border divide-y divide-border text-left shadow-sm">
        {([
          { label: 'Membership #', value: result.membership_number, accent: true },
          { label: 'Order #', value: result.order_number },
          ...(result.invoice_number ? [{ label: 'Invoice #', value: result.invoice_number }] : []),
          { label: 'Account', value: result.identity_created ? 'Account created — activation pending' : 'Existing account reused' },
          { label: 'Converted At', value: new Date(result.converted_at).toLocaleString('en-IN') },
        ] as Array<{ label: string; value: string; accent?: boolean }>).map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={`font-medium ${r.accent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>{r.value}</span>
          </div>
        ))}
      </div>

      {result.identity_created && (
        <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-3 text-left">
          <UserCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            A new member profile has been registered in <strong>INVITED</strong> status. Member password setup will take place upon onboarding activation.
          </p>
        </div>
      )}

      <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
        <CheckCircle2 size={16} className="mr-2" />Done
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

export function ConversionWizard({ lead, open, onOpenChange, onConverted }: ConversionWizardProps) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRecordPayment = can('finance.payments.create') || can('core.settings.edit');
  const [step, setStep] = useState(1);
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

  const branchId = lead.branch ?? '';

  useEffect(() => {
    if (!open) {
      setStep(1); setSelectedVersionId(null); setCouponCode(''); setAppliedCoupon('');
      setPaymentProvider(''); setPaymentAmount(''); setStartDate('');
      setQuote(null); setResult(null); setError(null);
    }
  }, [open]);

  const { data: eligibility } = useQuery({
    queryKey: ['conversion-eligibility', lead.id],
    queryFn: () => crmApi.getConversionEligibility(lead.id),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const fetchQuote = useCallback(async (versionId: string, coupon?: string) => {
    if (!branchId) return null;
    setError(null);
    setIsFetchingQuote(true);
    try {
      const q = await crmApi.getConversionQuote(lead.id, {
        package_version_id: versionId,
        branch_id: branchId,
        coupon_code: coupon || undefined,
      });
      setQuote(q);
      setPaymentAmount(q.pricing.total_payable);
      // Backend authoritative: set default provider if none selected
      if (q.payment_providers && q.payment_providers.length > 0 && !paymentProvider) {
        setPaymentProvider(q.payment_providers[0] as PaymentProvider);
      }
      return q;
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = e?.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const msg = (data?.error ?? data?.detail ?? (e as Error)?.message ?? 'Failed to get quote') as string;
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsFetchingQuote(false);
    }
  }, [lead.id, branchId, paymentProvider]);

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

  const convertMutation = useMutation({
    mutationFn: (payload: ConversionPayload) => crmApi.executeConversion(lead.id, payload),
    onSuccess: (data) => {
      setResult(data);
      setStep(5);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-detail', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['conversion-eligibility', lead.id] });
      toast.success(`${lead.first_name} is now a member!`);
      onConverted?.();
    },
    onError: (err: unknown) => {
      const e = err as Record<string, unknown>;
      const resp = e?.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const code = data?.code as string | undefined;
      const msg = (data?.error ?? data?.detail ?? (e as Error)?.message ?? 'Conversion failed') as string;
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
      if (!selectedVersionId) { toast.error('Please select a package'); return; }
      if (!branchId) { toast.error('Lead must have a branch assigned'); return; }
      const q = await fetchQuote(selectedVersionId);
      if (q) setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!paymentProvider) { toast.error('Please select a payment method'); return; }
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) { toast.error('Please enter a valid payment amount'); return; }
      if (quote && parseFloat(paymentAmount) < parseFloat(quote.pricing.total_payable)) {
        toast.error('Payment must be at least the quoted total'); return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!selectedVersionId || !branchId || !paymentProvider || !paymentAmount) return;
      convertMutation.mutate({
        package_version_id: selectedVersionId,
        branch_id: branchId,
        payment_provider: paymentProvider,
        payment_amount: paymentAmount,
        coupon_code: appliedCoupon || undefined,
        start_date: startDate || undefined,
        idempotency_key: idempotencyKey,
      });
    }
  }, [step, selectedVersionId, branchId, fetchQuote, paymentProvider, paymentAmount, quote, appliedCoupon, startDate, idempotencyKey, convertMutation]);

  const handleBack = () => { setError(null); setStep((s) => Math.max(1, s - 1)); };
  const handleClose = () => onOpenChange(false);
  const isConverting = convertMutation.isPending;
  const showSuccess = step === 5 && result;
  const notEligible = eligibility && !eligibility.eligible && lead.current_status === 'CONVERTED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-lg sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-xl sm:rounded-2xl"
      >
        {/* Header */}
        <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md text-primary-foreground">
              <Zap size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">Convert to Member</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {lead.first_name} {lead.last_name}{lead.phone_normalized && ` · ${lead.phone_normalized}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
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
              <StepIndicator current={step} />

              {step === 1 && (
                <PackagePickerStep
                  selectedVersionId={selectedVersionId}
                  onSelect={setSelectedVersionId}
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
              {step === 4 && quote && (
                <ReviewStep
                  lead={lead}
                  quote={quote}
                  paymentProvider={paymentProvider as PaymentProvider}
                  paymentAmount={paymentAmount}
                  startDate={startDate}
                  couponCode={appliedCoupon}
                />
              )}

              {!canRecordPayment && (step === 3 || step === 4) && (
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
          <div className="px-5 sm:px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={step === 1 ? handleClose : handleBack}
              disabled={isConverting || isFetchingQuote}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft size={14} />{step === 1 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={
                isConverting || isApplyingCoupon || isFetchingQuote ||
                (step === 1 && !selectedVersionId) ||
                (step === 3 && (!paymentProvider || !paymentAmount)) ||
                (step === 4 && !canRecordPayment)
              }
              className={`gap-2 font-semibold ${
                step === 4
                  ? canRecordPayment
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : ''
              }`}
            >
              {(isConverting || isFetchingQuote) ? (
                <><Loader2 size={14} className="animate-spin" />{isConverting ? 'Converting…' : 'Loading…'}</>
              ) : step === 4 ? (
                canRecordPayment ? (
                  <><CheckCircle2 size={14} />Confirm Conversion</>
                ) : (
                  <><ShieldCheck size={14} />Payment Authority Required</>
                )
              ) : (
                <>Continue<ArrowRight size={14} /></>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
