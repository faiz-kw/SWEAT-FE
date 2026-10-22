import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Clock, Receipt, ShieldAlert, Sparkles, RefreshCw, RotateCcw, CreditCard, Banknote, ShieldCheck, Smartphone, Landmark, Wallet, AlertCircle, Building2, BellRing, Play, Check, Snowflake, Sliders, CheckCircle2 } from "lucide-react";
import { crmApi } from "@/api/endpoints/crmApi";
import { membershipsApi } from "@/api/endpoints/membershipsApi";
import type { MembershipPolicyConfig, MembershipChangePolicy } from "@/types/memberships";
import { usePermissions } from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  fetchTenantSettingsApi, 
  updateTenantSettingsApi, 
  type TenantSettingsData,
  fetchLocationsApi,
  type LocationRow,
  fetchBookingPolicyApi,
  updateBookingPolicyApi,
  runBookingAutoCancellationApi,
  resetBranchBookingPolicyApi,
  type BookingPolicyData
} from "@/api/endpoints/api-admin";

export function ConfigurationWorkspace() {
  const [settings, setSettings] = React.useState<TenantSettingsData>({
    currency: "INR",
    timezone: "Asia/Kolkata",
    tax_rate_gst: 18.0,
    tax_id_number: "29ABCDE1234F1Z5",
    booking_cancellation_window_hours: 12,
    late_cancellation_fee: 250.0,
    allow_guest_passes: true,
    guest_passes_per_month: 2,
    membership_grace_period_days: 7,
    allow_member_freeze: true,
    max_freeze_days_per_year: 60,
    business_open_time: "06:00",
    business_close_time: "22:00",
  });

  const [bookingPolicy, setBookingPolicy] = React.useState<BookingPolicyData>({
    auto_cancel_unpaid_enabled: true,
    auto_cancel_unpaid_minutes: 30,
    auto_cancel_unconfirmed_enabled: true,
    auto_cancel_unconfirmed_minutes: 60,
    cancellation_cutoff_hours: 2,
    rescheduling_cutoff_hours: 2,
    max_reschedules_per_booking: 2,
    late_cancellation_allowed: true,
    late_cancellation_session_action: 'CONSUME',
    late_cancellation_fee: 0,
    late_cancellation_treated_as_no_show: false,
    allowed_booking_types: ['CLASS', 'PT_SESSION', 'FACILITY', 'TRIAL'],
    require_active_membership: true,
    max_upcoming_bookings: 5,
    advance_booking_days_max: 14,
    notify_unpaid_auto_cancellation: true,
    notify_unconfirmed_auto_cancellation: true,
    notify_late_cancellation: true,
    notification_channels: ['WHATSAPP', 'IN_APP'],
  });
  const [branches, setBranches] = React.useState<LocationRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");
  const [isBranchOverride, setIsBranchOverride] = React.useState<boolean>(false);
  const [applyToExisting, setApplyToExisting] = React.useState<boolean>(false);
  const [runningAutoCancel, setRunningAutoCancel] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"general" | "booking" | "billing" | "lifecycle" | "payment" | "rewards">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["general", "booking", "billing", "lifecycle", "payment", "rewards"].includes(tabParam)) {
        return tabParam as any;
      }
    }
    return "general";
  });
  const [paymentPolicy, setPaymentPolicy] = React.useState<any>({
    payment_methods: {
      staff_cash_enabled: true,
      staff_razorpay_enabled: true,
      member_razorpay_enabled: true,
    },
    razorpay_methods: {
      upi: true,
      card: true,
      emi: true,
      netbanking: true,
      wallet: true,
      paylater: false,
    },
    cash_policy: {
      require_approval: true,
      no_self_approval: true,
      provisional_sessions_allowed: 4,
      approval_required_for_success: true,
      approval_required_for_activation: true,
      allowed_recorder_roles: ['ADMIN', 'MANAGER', 'SALES_REP', 'CASHIER'],
      allowed_approver_roles: ['ADMIN', 'MANAGER', 'FINANCE'],
    },
    partial_payment_policy: {
      enabled: true,
      min_first_payment_type: 'PERCENTAGE',
      min_first_payment_percentage: '30.00',
      min_first_payment_amount: '1000.00',
      max_installments: 3,
      min_installment_amount: '500.00',
      balance_due_days: 30,
      activation_rule: 'FULL_PAYMENT_ONLY',
      allow_booking_with_outstanding_balance: false,
      overdue_grace_days: 7,
    },
  });

  const queryClient = useQueryClient();
  const { can, user } = usePermissions();
  const isOrgAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.isOrgWide ||
    user?.role?.toUpperCase().includes('ADMIN') ||
    user?.roles?.some((r: any) => (r.code || '').toUpperCase().includes('ADMIN')) ||
    can('membership.policy.manage')
  );

  const [isEditingPolicy, setIsEditingPolicy] = React.useState(false);
  const [policyForm, setPolicyForm] = React.useState<Partial<MembershipPolicyConfig>>({});

  const {
    data: policyConfig,
    isLoading: loadingPolicyConfig,
    refetch: refetchPolicyConfig,
  } = useQuery({
    queryKey: ['membership-policy-config'],
    queryFn: () => membershipsApi.getPolicyConfig(),
  });

  const {
    data: changePolicies = [],
    isLoading: loadingChangePolicies,
    refetch: refetchChangePolicies,
  } = useQuery({
    queryKey: ['membership-change-policies'],
    queryFn: () => membershipsApi.getChangePolicies(),
  });

  React.useEffect(() => {
    if (policyConfig) {
      setPolicyForm({
        extension_per_day_fee: policyConfig.extension_per_day_fee,
        extension_activation_fee: policyConfig.extension_activation_fee,
        extension_min_days: policyConfig.extension_min_days,
        extension_max_days: policyConfig.extension_max_days,
        extension_requires_remaining_sessions: policyConfig.extension_requires_remaining_sessions,
        freeze_per_day_fee: policyConfig.freeze_per_day_fee,
        freeze_min_days: policyConfig.freeze_min_days,
        freeze_max_days: policyConfig.freeze_max_days,
        freeze_max_count_per_cycle: policyConfig.freeze_max_count_per_cycle,
      });
    }
  }, [policyConfig]);

  const updatePolicyMutation = useMutation({
    mutationFn: (data: Partial<MembershipPolicyConfig>) => membershipsApi.updatePolicyConfig(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['membership-policy-config'], updated);
      queryClient.invalidateQueries({ queryKey: ['membership-policy-config'] });
      setIsEditingPolicy(false);
      toast.success("Upgrade & extension rules saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.data?.detail || err?.message || "Failed to save upgrade & extension rules");
    }
  });

  React.useEffect(() => {
    fetchTenantSettingsApi()
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchLocationsApi()
      .then((locs) => setBranches(locs || []))
      .catch((err) => console.error("Failed to load branches", err));

    crmApi.getPaymentPolicy()
      .then((data) => {
        if (data && typeof data === 'object') {
          setPaymentPolicy((prev: any) => ({
            ...prev,
            ...data,
            payment_methods: { ...prev.payment_methods, ...(data.payment_methods || {}) },
            razorpay_methods: { ...prev.razorpay_methods, ...(data.razorpay_methods || {}) },
            cash_policy: { ...prev.cash_policy, ...(data.cash_policy || {}) },
            partial_payment_policy: { ...prev.partial_payment_policy, ...(data.partial_payment_policy || {}) },
          }));
        }
      })
      .catch((err) => console.error("Failed to load payment policy", err));
  }, []);

  React.useEffect(() => {
    fetchBookingPolicyApi(selectedBranchId || undefined)
      .then((res) => {
        if (res && res.effective_policy) {
          setBookingPolicy(res.effective_policy);
          setIsBranchOverride(res.is_branch_override);
        }
      })
      .catch((err) => console.error("Failed to load booking policy", err));
  }, [selectedBranchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "booking") {
        await updateBookingPolicyApi(bookingPolicy, applyToExisting, selectedBranchId || undefined);
        const branchLabel = selectedBranchId
          ? branches.find((b) => b.id === selectedBranchId)?.name || "Selected Branch"
          : "Organization Defaults";
        toast.success(`Booking policy configuration saved successfully for ${branchLabel}!`);
        // Refresh policy state after save
        const refreshed = await fetchBookingPolicyApi(selectedBranchId || undefined);
        if (refreshed?.effective_policy) {
          setBookingPolicy(refreshed.effective_policy);
          setIsBranchOverride(refreshed.is_branch_override);
        }
      } else if (activeTab === "payment") {
        await crmApi.updatePaymentPolicy(paymentPolicy);
        toast.success("Payment & checkout policy saved successfully!");
      } else if (activeTab === "lifecycle") {
        await updateTenantSettingsApi(settings);
        if (isEditingPolicy) {
          await updatePolicyMutation.mutateAsync(policyForm);
        }
        toast.success("Membership upgrade, extension & hold rules saved successfully!");
      } else {
        await updateTenantSettingsApi(settings);
        toast.success("Business configuration saved successfully!");
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleResetBranchOverride = async () => {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      const res = await resetBranchBookingPolicyApi(selectedBranchId);
      toast.success(res?.detail || "Branch override removed. Reverted to organization defaults.");
      setIsBranchOverride(false);
      if (res?.effective_policy) {
        setBookingPolicy(res.effective_policy);
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to reset branch override");
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutoCancellationNow = async () => {
    setRunningAutoCancel(true);
    try {
      const res = await runBookingAutoCancellationApi(selectedBranchId || undefined);
      toast.success(res?.detail || `Auto-cancellations processed: ${res?.auto_cancelled_count || 0} cancelled, ${res?.promoted_from_waitlist_count || 0} waitlist promoted.`);
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to run auto-cancellation");
    } finally {
      setRunningAutoCancel(false);
    }
  };

  const update = (key: keyof TenantSettingsData, val: any) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const updateBooking = (key: keyof BookingPolicyData, val: any) => {
    setBookingPolicy((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Business Settings & Policies"
        subtitle="Configure operating hours, taxes, class booking cancellation rules, and membership policies."
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary text-primary-foreground">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <PageBody>
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-6 border-b border-border/50 scrollbar-none">
          {[
            { id: "general", label: "Hours & Timezone", icon: Clock },
            { id: "billing", label: "Taxes & GST", icon: Receipt },
            { id: "booking", label: "Booking & Cancellation Rules", icon: Settings },
            { id: "lifecycle", label: "Upgrade & Extension Rules", icon: Sliders },
            { id: "payment", label: "Payment & Checkout", icon: CreditCard },
            { id: "rewards", label: "Reward Points", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", tab.id);
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="w-full max-w-4xl rounded-2xl border border-border/70 bg-card p-4 sm:p-6 lg:p-7 shadow-xs space-y-6">
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="font-semibold text-base border-b border-border/40 pb-2">Operating Hours, Timezone & Currency</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="open_time">Facility Opening Time</Label>
                  <Input
                    id="open_time"
                    type="time"
                    value={settings.business_open_time}
                    onChange={(e) => update("business_open_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="close_time">Facility Closing Time</Label>
                  <Input
                    id="close_time"
                    type="time"
                    value={settings.business_close_time}
                    onChange={(e) => update("business_close_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Operational Timezone</Label>
                  <select
                    id="timezone"
                    value={settings.timezone || "Asia/Kolkata"}
                    onChange={(e) => update("timezone", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <optgroup label="South Asia & Middle East">
                      <option value="Asia/Kolkata">India (IST) — Asia/Kolkata (GMT+5:30)</option>
                      <option value="Asia/Dubai">UAE (GST) — Asia/Dubai (GMT+4:00)</option>
                      <option value="Asia/Riyadh">Saudi Arabia (AST) — Asia/Riyadh (GMT+3:00)</option>
                      <option value="Asia/Qatar">Qatar (AST) — Asia/Qatar (GMT+3:00)</option>
                    </optgroup>
                    <optgroup label="Southeast & East Asia">
                      <option value="Asia/Singapore">Singapore (SGT) — Asia/Singapore (GMT+8:00)</option>
                      <option value="Asia/Bangkok">Thailand (ICT) — Asia/Bangkok (GMT+7:00)</option>
                      <option value="Asia/Tokyo">Japan (JST) — Asia/Tokyo (GMT+9:00)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT) — Asia/Hong_Kong (GMT+8:00)</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Europe/London">UK (GMT/BST) — Europe/London</option>
                      <option value="Europe/Paris">France (CET) — Europe/Paris (GMT+1:00)</option>
                      <option value="Europe/Berlin">Germany (CET) — Europe/Berlin (GMT+1:00)</option>
                    </optgroup>
                    <optgroup label="North America">
                      <option value="America/New_York">US Eastern (EST) — America/New_York (GMT-5:00)</option>
                      <option value="America/Chicago">US Central (CST) — America/Chicago (GMT-6:00)</option>
                      <option value="America/Denver">US Mountain (MST) — America/Denver (GMT-7:00)</option>
                      <option value="America/Los_Angeles">US Pacific (PST) — America/Los_Angeles (GMT-8:00)</option>
                      <option value="America/Toronto">Canada (EST) — America/Toronto (GMT-5:00)</option>
                    </optgroup>
                    <optgroup label="Australia & Oceania">
                      <option value="Australia/Sydney">Sydney (AEST) — Australia/Sydney (GMT+10:00)</option>
                      <option value="Australia/Perth">Perth (AWST) — Australia/Perth (GMT+8:00)</option>
                      <option value="Pacific/Auckland">New Zealand (NZST) — Pacific/Auckland (GMT+12:00)</option>
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">System Default Currency</Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="font-semibold text-base border-b border-border/40 pb-2">Goods & Services Tax (GST) Compliance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gst_rate">Standard GST Tax Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    value={settings.tax_rate_gst}
                    onChange={(e) => update("tax_rate_gst", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Standard fitness services GST is 18% in India.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gstin">GSTIN / Tax Identification Number</Label>
                  <Input
                    id="gstin"
                    value={settings.tax_id_number}
                    onChange={(e) => update("tax_id_number", e.target.value)}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BOOKING TAB */}
          {activeTab === "booking" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* STUDIO LOCATION / BRANCH SELECTOR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <Label htmlFor="branch_selector" className="text-sm font-semibold text-foreground">
                      Studio Location
                    </Label>
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                      isBranchOverride 
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                      {isBranchOverride ? "Custom rules for this branch" : "Default for all locations"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose whether these rules apply to all gym locations or just a specific branch.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <select
                    id="branch_selector"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full sm:w-auto h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All Studios (Main Rules)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Branch: {b.name} ({b.city || "Location"})
                      </option>
                    ))}
                  </select>

                  {selectedBranchId && isBranchOverride && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={handleResetBranchOverride}
                      className="gap-1 text-xs text-destructive hover:bg-destructive/10 h-9 shrink-0"
                      title="Remove custom branch rules and use main studio rules"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to Main
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={runningAutoCancel}
                    onClick={handleRunAutoCancellationNow}
                    className="gap-1.5 text-xs font-semibold h-9 shrink-0 ml-auto sm:ml-0"
                    title="Check and release expired spots right now"
                  >
                    <Play className={`h-3.5 w-3.5 text-primary ${runningAutoCancel ? "animate-spin" : ""}`} />
                    {runningAutoCancel ? "Checking..." : "Run Auto-Cancel Check"}
                  </Button>
                </div>
              </div>

              {/* 1. AUTO-RELEASE UNUSED SPOTS */}
              <div className="rounded-xl border border-border/70 p-4 sm:p-5 bg-card/60 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">Auto-Release Unused Spots</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically free up spots when members don't pay or confirm in time, so waitlisted members get a chance.
                  </p>
                </div>

                {/* Unpaid Bookings */}
                <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-background space-y-3">
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground cursor-pointer">
                        Cancel if not paid in time
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        If a member reserves a class spot but doesn't finish payment, release the spot automatically.
                      </p>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={bookingPolicy.auto_cancel_unpaid_enabled}
                      onCheckedChange={(val) => updateBooking("auto_cancel_unpaid_enabled", val)}
                    />
                  </div>
                  {bookingPolicy.auto_cancel_unpaid_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label htmlFor="unpaid_min" className="text-xs font-medium">Cancel after how many minutes?</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="unpaid_min"
                            type="number"
                            min="1"
                            value={bookingPolicy.auto_cancel_unpaid_minutes}
                            onChange={(e) => updateBooking("auto_cancel_unpaid_minutes", Number(e.target.value))}
                            className="h-9 text-xs sm:text-sm"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">minutes</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Timer starts right when the booking is made.</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 border border-border/40 self-start">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium cursor-pointer">Send alert to member</Label>
                          <p className="text-[11px] text-muted-foreground">Notify member that their unpaid spot was released</p>
                        </div>
                        <Switch
                          className="shrink-0"
                          checked={bookingPolicy.notify_unpaid_auto_cancellation}
                          onCheckedChange={(val) => updateBooking("notify_unpaid_auto_cancellation", val)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Unconfirmed Bookings */}
                <div className="p-3.5 sm:p-4 rounded-lg border border-border/60 bg-background space-y-3">
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground cursor-pointer">
                        Cancel if pending confirmation
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        If a booking requires confirmation and is left pending, release the spot automatically.
                      </p>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={bookingPolicy.auto_cancel_unconfirmed_enabled}
                      onCheckedChange={(val) => updateBooking("auto_cancel_unconfirmed_enabled", val)}
                    />
                  </div>
                  {bookingPolicy.auto_cancel_unconfirmed_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label htmlFor="unconfirmed_min" className="text-xs font-medium">Cancel after how many minutes?</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="unconfirmed_min"
                            type="number"
                            min="1"
                            value={bookingPolicy.auto_cancel_unconfirmed_minutes}
                            onChange={(e) => updateBooking("auto_cancel_unconfirmed_minutes", Number(e.target.value))}
                            className="h-9 text-xs sm:text-sm"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">minutes</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Timer starts right when the booking is made.</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 border border-border/40 self-start">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium cursor-pointer">Send alert to member</Label>
                          <p className="text-[11px] text-muted-foreground">Notify member that their unconfirmed booking expired</p>
                        </div>
                        <Switch
                          className="shrink-0"
                          checked={bookingPolicy.notify_unconfirmed_auto_cancellation}
                          onCheckedChange={(val) => updateBooking("notify_unconfirmed_auto_cancellation", val)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. CANCELLATION & RESCHEDULING DEADLINES */}
              <div className="rounded-xl border border-border/70 p-4 sm:p-5 bg-card/60 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">Cancellation & Rescheduling Deadlines</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set how many hours before class starts members are allowed to cancel for free or move to another class.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <Label htmlFor="cancel_cutoff" className="text-xs font-semibold text-foreground">
                      Free Cancellation Deadline
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="cancel_cutoff"
                        type="number"
                        min="0"
                        value={bookingPolicy.cancellation_cutoff_hours}
                        onChange={(e) => updateBooking("cancellation_cutoff_hours", Number(e.target.value))}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">hours before</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cancellations made after this time count as late cancellations.
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <Label htmlFor="resched_cutoff" className="text-xs font-semibold text-foreground">
                      Reschedule Deadline
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="resched_cutoff"
                        type="number"
                        min="0"
                        value={bookingPolicy.rescheduling_cutoff_hours}
                        onChange={(e) => updateBooking("rescheduling_cutoff_hours", Number(e.target.value))}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">hours before</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Members cannot switch classes once inside this time window.
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <Label htmlFor="max_resched" className="text-xs font-semibold text-foreground">
                      Max Times a Booking Can Move
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="max_resched"
                        type="number"
                        min="0"
                        value={bookingPolicy.max_reschedules_per_booking}
                        onChange={(e) => updateBooking("max_reschedules_per_booking", Number(e.target.value))}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">times</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Limit how many times one booking can be rescheduled.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. LATE CANCELLATION RULES & PENALTIES */}
              <div className="rounded-xl border border-border/70 p-4 sm:p-5 bg-card/60 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">Late Cancellation Rules & Penalties</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose what happens when a member cancels after the free cancellation deadline.
                  </p>
                </div>

                <div className="flex items-start sm:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-lg border border-border/60 bg-background">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground cursor-pointer">
                      Allow late cancellations in app
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If turned off, members cannot cancel inside the deadline and must contact the gym directly.
                    </p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={bookingPolicy.late_cancellation_allowed}
                    onCheckedChange={(val) => updateBooking("late_cancellation_allowed", val)}
                  />
                </div>

                {bookingPolicy.late_cancellation_allowed && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                      <Label htmlFor="session_action" className="text-xs font-semibold text-foreground">
                        What happens to class credit?
                      </Label>
                      <select
                        id="session_action"
                        value={bookingPolicy.late_cancellation_session_action}
                        onChange={(e) => updateBooking("late_cancellation_session_action", e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="CONSUME">Deduct Credit (Standard — credit is used up)</option>
                        <option value="RESTORE">Refund Credit (Return credit to member)</option>
                        <option value="NO_ACTION">No Change (Keep credit balance as is)</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Deducting credit is standard studio practice for late cancellations.
                      </p>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                      <Label htmlFor="late_fee_input" className="text-xs font-semibold text-foreground">
                        Late Cancellation Fee (₹)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="late_fee_input"
                          type="number"
                          min="0"
                          value={bookingPolicy.late_cancellation_fee}
                          onChange={(e) => updateBooking("late_cancellation_fee", Number(e.target.value))}
                          className="h-9 text-xs sm:text-sm"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">₹ fine</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Optional cash penalty charged to member. Enter 0 if no fine.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/50 bg-background flex flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-semibold text-foreground cursor-pointer">
                            Mark as Attendance Strike
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Record a no-show strike on the member's profile for dropping out late.
                          </p>
                        </div>
                        <Switch
                          className="shrink-0 mt-0.5"
                          checked={bookingPolicy.late_cancellation_treated_as_no_show}
                          onCheckedChange={(val) => updateBooking("late_cancellation_treated_as_no_show", val)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. WHO CAN BOOK & BOOKING LIMITS */}
              <div className="rounded-xl border border-border/70 p-4 sm:p-5 bg-card/60 space-y-4">
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">Who Can Book & Booking Limits</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which services follow these rules and set how many classes members can book at once.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    These rules apply to:
                  </Label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {[
                      { id: "CLASS", label: "Group Fitness Classes" },
                      { id: "PT_SESSION", label: "1-on-1 Personal Training" },
                      { id: "FACILITY", label: "Court & Facility Hire" },
                      { id: "TRIAL", label: "Free Intro Trials" },
                    ].map((type) => {
                      const isSelected = bookingPolicy.allowed_booking_types.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            const current = new Set(bookingPolicy.allowed_booking_types);
                            if (isSelected) {
                              if (current.size > 1) current.delete(type.id);
                            } else {
                              current.add(type.id);
                            }
                            updateBooking("allowed_booking_types", Array.from(current));
                          }}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                              : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <Label htmlFor="max_upcoming" className="text-xs font-semibold text-foreground">
                      Max Active Bookings at a Time
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="max_upcoming"
                        type="number"
                        min="1"
                        value={bookingPolicy.max_upcoming_bookings}
                        onChange={(e) => updateBooking("max_upcoming_bookings", Number(e.target.value))}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">classes</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Maximum future reservations one member can hold at the same time.
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <Label htmlFor="advance_days" className="text-xs font-semibold text-foreground">
                      Advance Booking Window
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="advance_days"
                        type="number"
                        min="1"
                        value={bookingPolicy.advance_booking_days_max}
                        onChange={(e) => updateBooking("advance_booking_days_max", Number(e.target.value))}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">days ahead</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      How many days into the future members can book classes (e.g. 14 days).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/50 bg-background flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold text-foreground cursor-pointer">
                          Require Active Membership
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Members must have an active membership or class credits to reserve.
                        </p>
                      </div>
                      <Switch
                        className="shrink-0 mt-0.5"
                        checked={bookingPolicy.require_active_membership}
                        onCheckedChange={(val) => updateBooking("require_active_membership", val)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. NOTIFICATION CHANNELS */}
              <div className="rounded-xl border border-border/70 p-4 sm:p-5 bg-card/60 space-y-3">
                <div className="border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">How Members Receive Notifications</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose which messaging channels send cancellation alerts and reminder messages to members.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 pt-1">
                  {[
                    { id: "WHATSAPP", label: "WhatsApp Message" },
                    { id: "IN_APP", label: "App Notification & Inbox" },
                    { id: "SMS", label: "SMS Text Message" },
                    { id: "EMAIL", label: "Email" },
                  ].map((ch) => {
                    const active = bookingPolicy.notification_channels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          const current = new Set(bookingPolicy.notification_channels);
                          if (active) {
                            if (current.size > 1) current.delete(ch.id);
                          } else {
                            current.add(ch.id);
                          }
                          updateBooking("notification_channels", Array.from(current));
                        }}
                        className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? "bg-primary/10 border-primary text-primary shadow-2xs"
                            : "bg-background border-border/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {active ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-border/60 shrink-0" />
                        )}
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. WHEN SHOULD THESE CHANGES TAKE EFFECT? */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">When Should These Changes Take Effect?</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose whether you want these rules to apply only to future bookings or also update existing ones.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => setApplyToExisting(false)}
                    className={`cursor-pointer flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border text-xs transition-all ${
                      !applyToExisting
                        ? "border-primary bg-primary/10 text-foreground font-semibold ring-1 ring-primary shadow-xs"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      id="policy_scope_new"
                      name="policy_scope_choice"
                      checked={!applyToExisting}
                      onChange={() => setApplyToExisting(false)}
                      className="mt-0.5 text-primary focus:ring-primary shrink-0"
                    />
                    <div>
                      <label htmlFor="policy_scope_new" className="font-bold text-foreground cursor-pointer block">
                        New Bookings Only (Recommended)
                      </label>
                      <div className="text-[11px] text-muted-foreground mt-1 font-normal leading-relaxed">
                        Members who already booked will keep the cancellation deadlines and rules that were active when they booked.
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setApplyToExisting(true)}
                    className={`cursor-pointer flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border text-xs transition-all ${
                      applyToExisting
                        ? "border-amber-500 bg-amber-500/10 text-foreground font-semibold ring-1 ring-amber-500 shadow-xs"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      id="policy_scope_existing"
                      name="policy_scope_choice"
                      checked={applyToExisting}
                      onChange={() => setApplyToExisting(true)}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500 shrink-0"
                    />
                    <div>
                      <label htmlFor="policy_scope_existing" className="font-bold text-foreground cursor-pointer block">
                        Apply to Existing Open Bookings Too
                      </label>
                      <div className="text-[11px] text-muted-foreground mt-1 font-normal leading-relaxed">
                        Any currently open unpaid or unconfirmed bookings will immediately be checked against these new time limits.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DEDICATED IN-TAB SAVE BAR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  Saving for:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedBranchId
                      ? branches.find((b) => b.id === selectedBranchId)?.name || "Selected Branch"
                      : "All Studios (Main Rules)"}
                  </span>
                  {selectedBranchId && (
                    <span className="ml-1.5 text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium inline-block">
                      {isBranchOverride ? "Custom Branch Rules" : "Using All Studios Default"}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-end">
                  {selectedBranchId && isBranchOverride && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={handleResetBranchOverride}
                      className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Main Rules
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-2 w-full sm:w-auto h-9"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving Rules..." : "Save Booking Rules"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* LIFECYCLE / UPGRADE & EXTENSION RULES TAB */}
          {activeTab === "lifecycle" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Tenant Admin Package Extend & Freeze Policy Settings */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        Package Validity Extension & Freeze Configuration
                      </h2>
                      {isOrgAdmin ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
                          Admin Configurable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border/60 rounded-md">
                          Read Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tenant-wide operational settings governing daily extension fees, reactivation penalties, freeze durations, and renewal grace periods.
                    </p>
                  </div>
                  {isOrgAdmin && (
                    <div>
                      {isEditingPolicy ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingPolicy(false);
                              if (policyConfig) {
                                setPolicyForm({
                                  extension_per_day_fee: policyConfig.extension_per_day_fee,
                                  extension_activation_fee: policyConfig.extension_activation_fee,
                                  extension_min_days: policyConfig.extension_min_days,
                                  extension_max_days: policyConfig.extension_max_days,
                                  extension_requires_remaining_sessions: policyConfig.extension_requires_remaining_sessions,
                                  freeze_per_day_fee: policyConfig.freeze_per_day_fee,
                                  freeze_min_days: policyConfig.freeze_min_days,
                                  freeze_max_days: policyConfig.freeze_max_days,
                                  freeze_max_count_per_cycle: policyConfig.freeze_max_count_per_cycle,
                                });
                              }
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={updatePolicyMutation.isPending || saving}
                            onClick={async () => {
                              try {
                                await updatePolicyMutation.mutateAsync(policyForm);
                                await updateTenantSettingsApi(settings);
                                toast.success("Configuration updated successfully!");
                              } catch (err: any) {
                                toast.error(err?.data?.detail || err?.message || "Failed to save configuration");
                              }
                            }}
                            className="gap-1.5"
                          >
                            {updatePolicyMutation.isPending ? 'Saving...' : 'Save Settings'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (policyConfig) {
                              setPolicyForm({
                                extension_per_day_fee: policyConfig.extension_per_day_fee,
                                extension_activation_fee: policyConfig.extension_activation_fee,
                                extension_min_days: policyConfig.extension_min_days,
                                extension_max_days: policyConfig.extension_max_days,
                                extension_requires_remaining_sessions: policyConfig.extension_requires_remaining_sessions,
                                freeze_per_day_fee: policyConfig.freeze_per_day_fee,
                                freeze_min_days: policyConfig.freeze_min_days,
                                freeze_max_days: policyConfig.freeze_max_days,
                                freeze_max_count_per_cycle: policyConfig.freeze_max_count_per_cycle,
                              });
                            }
                            setIsEditingPolicy(true);
                          }}
                          className="gap-1.5"
                        >
                          <Settings className="size-3.5" />
                          <span>Configure Rules</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {loadingPolicyConfig ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading policy parameters...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Extension Rules Card */}
                    <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock className="size-4 text-amber-500" />
                        <span>Package Validity Extension Rules</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Per-Day Extension Fee (₹)</Label>
                          {isEditingPolicy ? (
                            <Input
                              type="number"
                              step="1"
                              value={policyForm.extension_per_day_fee ?? policyConfig?.extension_per_day_fee ?? ''}
                              onChange={(e) => setPolicyForm({ ...policyForm, extension_per_day_fee: e.target.value })}
                              className="mt-1"
                            />
                          ) : (
                            <div className="font-semibold text-foreground text-sm mt-0.5">
                              ₹{policyConfig?.extension_per_day_fee || '35.00'} / day
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Standard fee charged per validity day added to an active package.
                          </span>
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">Expired Package Activation Surcharge (₹)</Label>
                          {isEditingPolicy ? (
                            <Input
                              type="number"
                              step="1"
                              value={policyForm.extension_activation_fee ?? policyConfig?.extension_activation_fee ?? ''}
                              onChange={(e) => setPolicyForm({ ...policyForm, extension_activation_fee: e.target.value })}
                              className="mt-1"
                            />
                          ) : (
                            <div className="font-semibold text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                              ₹{policyConfig?.extension_activation_fee || '200.00'} (One-time)
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Mandatory fee charged before extending packages that have already expired.
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Min Days</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={policyForm.extension_min_days ?? policyConfig?.extension_min_days ?? ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, extension_min_days: parseInt(e.target.value) || 1 })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{policyConfig?.extension_min_days || 1} day</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Max Days</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={policyForm.extension_max_days ?? policyConfig?.extension_max_days ?? ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, extension_max_days: parseInt(e.target.value) || 30 })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{policyConfig?.extension_max_days || 30} days</div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                          {isEditingPolicy ? (
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={policyForm.extension_requires_remaining_sessions !== undefined ? Boolean(policyForm.extension_requires_remaining_sessions) : Boolean(policyConfig?.extension_requires_remaining_sessions ?? true)}
                                onChange={(e) => setPolicyForm({ ...policyForm, extension_requires_remaining_sessions: e.target.checked })}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                              />
                              <span className="text-foreground font-medium">Require remaining sessions to extend</span>
                            </label>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className={`size-3.5 ${policyConfig?.extension_requires_remaining_sessions ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span>{policyConfig?.extension_requires_remaining_sessions ? 'Requires unconsumed sessions remaining to extend' : 'Allows extension even without remaining sessions'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Freeze Rules Card */}
                    <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Snowflake className="size-4 text-blue-500" />
                        <span>Membership Freeze & Grace Rules</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Per-Day Freeze Fee (₹)</Label>
                          {isEditingPolicy ? (
                            <Input
                              type="number"
                              step="1"
                              value={policyForm.freeze_per_day_fee ?? policyConfig?.freeze_per_day_fee ?? ''}
                              onChange={(e) => setPolicyForm({ ...policyForm, freeze_per_day_fee: e.target.value })}
                              className="mt-1"
                            />
                          ) : (
                            <div className="font-semibold text-foreground text-sm mt-0.5">
                              ₹{policyConfig?.freeze_per_day_fee || '25.00'} / day
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Daily charge while membership validity is paused and extended forward.
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Min Freeze Days</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={policyForm.freeze_min_days ?? policyConfig?.freeze_min_days ?? ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, freeze_min_days: parseInt(e.target.value) || 3 })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{policyConfig?.freeze_min_days || 3} days</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Max Freeze Days (Per Instance)</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={policyForm.freeze_max_days ?? policyConfig?.freeze_max_days ?? ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, freeze_max_days: parseInt(e.target.value) || 60 })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{policyConfig?.freeze_max_days || 60} days</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Max Freezes / Package</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={policyForm.freeze_max_count_per_cycle ?? policyConfig?.freeze_max_count_per_cycle ?? ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, freeze_max_count_per_cycle: parseInt(e.target.value) || 3 })}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{policyConfig?.freeze_max_count_per_cycle || 3} freezes</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Max Freeze Days / Year</Label>
                            {isEditingPolicy ? (
                              <Input
                                type="number"
                                value={settings.max_freeze_days_per_year}
                                onChange={(e) => update("max_freeze_days_per_year", Number(e.target.value))}
                                className="mt-1"
                              />
                            ) : (
                              <div className="font-medium text-foreground mt-0.5">{settings.max_freeze_days_per_year || 60} days/year</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">Renewal Grace Period (Days)</Label>
                          {isEditingPolicy ? (
                            <Input
                              type="number"
                              value={settings.membership_grace_period_days}
                              onChange={(e) => update("membership_grace_period_days", Number(e.target.value))}
                              className="mt-1"
                            />
                          ) : (
                            <div className="font-medium text-foreground mt-0.5">{settings.membership_grace_period_days || 7} days</div>
                          )}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Days after package expiry before turnstile access is automatically locked.
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-blue-500" />
                          <span>Lockout enforced during freeze; bookings auto-resume thereafter</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Change & Upgrade Policies */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-xs">
                <h2 className="text-base font-semibold text-foreground">Change & Upgrade Policies</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Versioned contractual rules governing proration, cancellation fees, and package transitions.
                </p>

                {loadingChangePolicies ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Loading policies...
                  </div>
                ) : changePolicies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No change policies defined.</div>
                ) : (
                  <div className="divide-y divide-border/60 mt-4">
                    {changePolicies.map((p) => (
                      <div key={p.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">
                            {p.policy_name} v{p.version_number}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            {p.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {p.rules?.length || 0} active rule(s) configured for upgrades, downgrades, and cancellations.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAYMENT & CHECKOUT POLICY TAB */}
          {activeTab === "payment" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* SECTION 1: CASH PAYMENT & OUTLET COLLECTION */}
              <div className="rounded-xl border border-border/70 p-5 bg-card/60 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">Cash Payment & Outlet Collection Policy</h3>
                    <p className="text-xs text-muted-foreground">Manage physical cash collections by staff at SWEAT fitness outlets.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-background">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Cash Payment for Staff / Outlets</Label>
                      <p className="text-xs text-muted-foreground">Allow authorized centre staff to record cash transactions</p>
                    </div>
                    <Switch
                      checked={paymentPolicy.payment_methods?.staff_cash_enabled ?? true}
                      onCheckedChange={(val) => setPaymentPolicy((prev: any) => ({
                        ...prev,
                        payment_methods: { ...prev.payment_methods, staff_cash_enabled: val }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-background">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Require Manager Cash Approval</Label>
                      <p className="text-xs text-muted-foreground">Cash transactions require separate authorized approval (Default: ON)</p>
                    </div>
                    <Switch
                      checked={paymentPolicy.cash_policy?.require_approval ?? true}
                      onCheckedChange={(val) => setPaymentPolicy((prev: any) => ({
                        ...prev,
                        cash_policy: { ...prev.cash_policy, require_approval: val }
                      }))}
                    />
                  </div>

                    <div className="p-3.5 rounded-lg border border-border/60 bg-background space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="provisional_sessions_allowed" className="text-sm font-medium text-foreground">Cash Provisional Session Limit</Label>
                          <p className="text-xs text-muted-foreground">Provisional sessions allowed to member before manager approves cash collection</p>
                        </div>
                        <Input
                          id="provisional_sessions_allowed"
                          type="number"
                          min={0}
                          max={50}
                          className="w-24 text-right"
                          value={paymentPolicy.cash_policy?.provisional_sessions_allowed ?? 4}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            cash_policy: { ...prev.cash_policy, provisional_sessions_allowed: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                </div>

                {/* Segregation of Duties Notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">Segregation of Duties Enforced:</span> Staff recording cash cannot approve their own requests. Approvals require an authorized manager or finance role with audit rationale recorded on rejection.
                  </div>
                </div>
              </div>

              {/* SECTION 2: ONLINE PAYMENT METHODS (RAZORPAY) */}
              <div className="rounded-xl border border-border/70 p-5 bg-card/60 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">Online Payment Methods (Razorpay Checkout)</h3>
                    <p className="text-xs text-muted-foreground">Select customer payment methods enabled on Razorpay Standard Checkout for SWEAT.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    { key: "upi", label: "UPI", desc: "Google Pay, PhonePe, Paytm, QR", icon: Smartphone },
                    { key: "card", label: "Cards", desc: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
                    { key: "emi", label: "EMI", desc: "Credit / Debit Card EMIs", icon: Receipt },
                    { key: "netbanking", label: "Netbanking", desc: "All major Indian retail banks", icon: Landmark },
                    { key: "wallet", label: "Wallet", desc: "Paytm, Mobikwik, Freecharge", icon: Wallet },
                    { key: "paylater", label: "Pay Later", desc: "BNPL (Disabled by SWEAT policy)", icon: AlertCircle },
                  ].map((m) => {
                    const isChecked = paymentPolicy.razorpay_methods?.[m.key] ?? (m.key !== "paylater");
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          setPaymentPolicy((prev: any) => ({
                            ...prev,
                            razorpay_methods: {
                              ...prev.razorpay_methods,
                              [m.key]: !isChecked
                            }
                          }));
                        }}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/5 border-primary/40 text-foreground"
                            : "bg-background border-border/60 text-muted-foreground opacity-70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary pointer-events-none"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold">{m.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  * Note: Selected methods reflect tenant policy. Availability on checkout also depends on merchant enablement in your Razorpay Dashboard. Pay Later is excluded by default.
                </p>
              </div>

              {/* SECTION 3: PARTIAL PAYMENT POLICY */}
              <div className="rounded-xl border border-border/70 p-5 bg-card/60 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">Partial Payment & Installment Rules</h3>
                      <p className="text-xs text-muted-foreground">Configure multi-installment payments for Online Razorpay purchases.</p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentPolicy.partial_payment_policy?.enabled ?? true}
                    onCheckedChange={(val) => setPaymentPolicy((prev: any) => ({
                      ...prev,
                      partial_payment_policy: { ...prev.partial_payment_policy, enabled: val }
                    }))}
                  />
                </div>

                {paymentPolicy.partial_payment_policy?.enabled && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="min_type">Minimum First Payment Type</Label>
                        <select
                          id="min_type"
                          value={paymentPolicy.partial_payment_policy?.min_first_payment_type || "PERCENTAGE"}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            partial_payment_policy: { ...prev.partial_payment_policy, min_first_payment_type: e.target.value }
                          }))}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="PERCENTAGE">Percentage of Order Total (%)</option>
                          <option value="FIXED">Fixed Amount (INR ₹)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="min_val">
                          {paymentPolicy.partial_payment_policy?.min_first_payment_type === "FIXED"
                            ? "Minimum First Payment Amount (₹)"
                            : "Minimum First Payment Percentage (%)"}
                        </Label>
                        <Input
                          id="min_val"
                          type="number"
                          value={
                            paymentPolicy.partial_payment_policy?.min_first_payment_type === "FIXED"
                              ? (paymentPolicy.partial_payment_policy?.min_first_payment_amount || 1000)
                              : (paymentPolicy.partial_payment_policy?.min_first_payment_percentage || 30)
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setPaymentPolicy((prev: any) => ({
                              ...prev,
                              partial_payment_policy: {
                                ...prev.partial_payment_policy,
                                ...(prev.partial_payment_policy?.min_first_payment_type === "FIXED"
                                  ? { min_first_payment_amount: val }
                                  : { min_first_payment_percentage: val })
                              }
                            }));
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="max_inst">Maximum Allowed Installments</Label>
                        <Input
                          id="max_inst"
                          type="number"
                          value={paymentPolicy.partial_payment_policy?.max_installments || 3}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            partial_payment_policy: { ...prev.partial_payment_policy, max_installments: Number(e.target.value) }
                          }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="min_inst_amt">Minimum Subsequent Installment (₹)</Label>
                        <Input
                          id="min_inst_amt"
                          type="number"
                          value={paymentPolicy.partial_payment_policy?.min_installment_amount || 500}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            partial_payment_policy: { ...prev.partial_payment_policy, min_installment_amount: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="act_rule">Membership Activation Condition</Label>
                        <select
                          id="act_rule"
                          value={paymentPolicy.partial_payment_policy?.activation_rule || "FULL_PAYMENT_ONLY"}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            partial_payment_policy: { ...prev.partial_payment_policy, activation_rule: e.target.value }
                          }))}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="FULL_PAYMENT_ONLY">Activate only upon FULL 100% payment</option>
                          <option value="MINIMUM_PARTIAL_PAYMENT">Activate immediately once minimum payment is paid</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="balance_due">Balance Due Window (Days)</Label>
                        <Input
                          id="balance_due"
                          type="number"
                          value={paymentPolicy.partial_payment_policy?.balance_due_days || 30}
                          onChange={(e) => setPaymentPolicy((prev: any) => ({
                            ...prev,
                            partial_payment_policy: { ...prev.partial_payment_policy, balance_due_days: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-background">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Allow Workout Bookings with Outstanding Balance</Label>
                        <p className="text-xs text-muted-foreground">Allow member to book sessions and attend while installment balance is pending</p>
                      </div>
                      <Switch
                        checked={paymentPolicy.partial_payment_policy?.allow_booking_with_outstanding_balance ?? false}
                        onCheckedChange={(val) => setPaymentPolicy((prev: any) => ({
                          ...prev,
                          partial_payment_policy: { ...prev.partial_payment_policy, allow_booking_with_outstanding_balance: val }
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reward Points & Loyalty Policy */}
          {activeTab === "rewards" && (
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Loyalty Points & Rewards Engine
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure how members accrue reward coins on purchases and set point conversion values.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-foreground">Enable Reward Points Accrual</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically award loyalty points to members upon successful plan and renewal payments.
                    </p>
                  </div>
                  <Switch
                    checked={settings.membership_config?.reward_points?.is_enabled ?? true}
                    onCheckedChange={(val) => {
                      setSettings((prev) => ({
                        ...prev,
                        membership_config: {
                          ...(prev.membership_config || {}),
                          reward_points: {
                            ...(prev.membership_config?.reward_points || {
                              earn_rate_rupees: 100,
                              points_per_rate: 1,
                              point_value_rupees: 1,
                            }),
                            is_enabled: val,
                          },
                        },
                      }));
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 rounded-lg border border-border bg-card">
                    <Label className="text-sm font-semibold text-foreground">Spend Amount for 1 Point (₹)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Rupees spent to earn 1 point (e.g. 100 = 1 point earned per ₹100 spent)
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={settings.membership_config?.reward_points?.earn_rate_rupees ?? 100}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 100;
                          setSettings((prev) => ({
                            ...prev,
                            membership_config: {
                              ...(prev.membership_config || {}),
                              reward_points: {
                                ...(prev.membership_config?.reward_points || {
                                  point_value_rupees: 1,
                                  is_enabled: true,
                                }),
                                earn_rate_rupees: val,
                                points_per_rate: 1,
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-lg border border-border bg-card">
                    <Label className="text-sm font-semibold text-foreground">Point Redemption Value (₹)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Discount value in INR per 1 redeemed point (e.g. 1 point = ₹1 discount)
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={settings.membership_config?.reward_points?.point_value_rupees ?? 1}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setSettings((prev) => ({
                            ...prev,
                            membership_config: {
                              ...(prev.membership_config || {}),
                              reward_points: {
                                ...(prev.membership_config?.reward_points || {
                                  earn_rate_rupees: 100,
                                  is_enabled: true,
                                }),
                                point_value_rupees: val,
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                  <span className="font-semibold">Active Earning Formula:</span> Members receive{' '}
                  <strong>
                    {settings.membership_config?.reward_points?.points_per_rate || 1} Point
                  </strong>{' '}
                  for every{' '}
                  <strong>
                    ₹{settings.membership_config?.reward_points?.earn_rate_rupees || 100}
                  </strong>{' '}
                  spent on memberships and renewals. Points are worth{' '}
                  <strong>
                    ₹{settings.membership_config?.reward_points?.point_value_rupees || 1}
                  </strong>{' '}
                  each during redemption.
                </div>
              </div>
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}
