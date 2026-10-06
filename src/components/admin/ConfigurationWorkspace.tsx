import * as React from "react";
import { Settings, Save, Clock, Receipt, ShieldAlert, Sparkles, RefreshCw, CreditCard, Banknote, ShieldCheck, Smartphone, Landmark, Wallet, AlertCircle } from "lucide-react";
import { crmApi } from "@/api/endpoints/crmApi";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  fetchTenantSettingsApi, 
  updateTenantSettingsApi, 
  type TenantSettingsData 
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

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"general" | "booking" | "billing" | "lifecycle" | "payment">("general");
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

  React.useEffect(() => {
    fetchTenantSettingsApi()
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTenantSettingsApi(settings);
      await crmApi.updatePaymentPolicy(paymentPolicy);
      toast.success("Business configuration & payment policies saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof TenantSettingsData, val: any) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Business Configuration & System Policies"
        subtitle="Global tenant operating parameters, GST tax rules, class booking cancellation windows, and membership freeze policies."
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary text-primary-foreground">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <PageBody>
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-border/50">
          {[
            { id: "general", label: "General & Operating Hours", icon: Clock },
            { id: "billing", label: "Tax & GST Billing", icon: Receipt },
            { id: "booking", label: "Booking & Cancellation Policies", icon: Settings },
            { id: "lifecycle", label: "Membership Lifecycle & Freeze", icon: ShieldAlert },
            { id: "payment", label: "Payment & Checkout Policy", icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
        <div className="max-w-3xl rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-6">
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
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="font-semibold text-base border-b border-border/40 pb-2">Class & PT Cancellation Policies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cancel_window">Cancellation Window (Hours before start)</Label>
                  <Input
                    id="cancel_window"
                    type="number"
                    value={settings.booking_cancellation_window_hours}
                    onChange={(e) => update("booking_cancellation_window_hours", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Cancellations made within this window are flagged as Late.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="late_fee">Late Cancellation Penalty Fee (₹)</Label>
                  <Input
                    id="late_fee"
                    type="number"
                    value={settings.late_cancellation_fee}
                    onChange={(e) => update("late_cancellation_fee", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* LIFECYCLE TAB */}
          {activeTab === "lifecycle" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="font-semibold text-base border-b border-border/40 pb-2">Membership Freeze & Grace Periods</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="freeze_days">Max Freeze Days Allowed per Year</Label>
                  <Input
                    id="freeze_days"
                    type="number"
                    value={settings.max_freeze_days_per_year}
                    onChange={(e) => update("max_freeze_days_per_year", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grace_days">Renewal Grace Period (Days)</Label>
                  <Input
                    id="grace_days"
                    type="number"
                    value={settings.membership_grace_period_days}
                    onChange={(e) => update("membership_grace_period_days", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Days after expiry before turnstile access is automatically locked.</p>
                </div>
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
        </div>
      </PageBody>
    </div>
  );
}
