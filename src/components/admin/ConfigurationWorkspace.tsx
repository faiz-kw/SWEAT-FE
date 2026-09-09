import * as React from "react";
import { Settings, Save, Clock, Receipt, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  fetchTenantSettingsApi, 
  updateTenantSettingsApi, 
  type TenantSettingsData 
} from "@/services/api-admin";

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
  const [activeTab, setActiveTab] = React.useState<"general" | "booking" | "billing" | "lifecycle">("general");

  React.useEffect(() => {
    fetchTenantSettingsApi()
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTenantSettingsApi(settings);
      toast.success("Business configuration & policy settings updated successfully!");
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
        </div>
      </PageBody>
    </div>
  );
}
