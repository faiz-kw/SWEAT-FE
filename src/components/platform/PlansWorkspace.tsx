import * as React from "react";
import { Layers, Check, Plus, Edit2, Shield, Zap, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  fetchPlatformPlansApi, 
  createPlatformPlanApi, 
  updatePlatformPlanApi, 
  deletePlatformPlanApi, 
  type PlatformPlanRow 
} from "@/services/api-platform";

export function PlansWorkspace() {
  const [plans, setPlans] = React.useState<PlatformPlanRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<PlatformPlanRow | null>(null);

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formPriceMonthly, setFormPriceMonthly] = React.useState(7999);
  const [formDescription, setFormDescription] = React.useState("");
  const [formMaxLocations, setFormMaxLocations] = React.useState(1);
  const [formMaxMembers, setFormMaxMembers] = React.useState(500);
  const [formMaxTrainers, setFormMaxTrainers] = React.useState(10);
  const [formAiMinutes, setFormAiMinutes] = React.useState(100);
  const [formFeatures, setFormFeatures] = React.useState("CRM & Leads, Member Check-ins, Class Booking, POS Invoicing");
  const [formPopular, setFormPopular] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const loadPlans = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformPlansApi();
      setPlans(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load platform plans");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName("");
    setFormPriceMonthly(9999);
    setFormDescription("");
    setFormMaxLocations(2);
    setFormMaxMembers(1000);
    setFormMaxTrainers(15);
    setFormAiMinutes(200);
    setFormFeatures("CRM & Leads, Member Check-ins, Class Booking, POS Invoicing, WhatsApp Notifications");
    setFormPopular(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: PlatformPlanRow) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormPriceMonthly(Number(plan.price_monthly));
    setFormDescription(plan.description || "");
    setFormMaxLocations(plan.max_locations ?? 1);
    setFormMaxMembers(plan.max_members ?? 500);
    setFormMaxTrainers(plan.max_trainers ?? 10);
    setFormAiMinutes(plan.ai_voice_minutes ?? 100);
    setFormFeatures(Array.isArray(plan.features) ? plan.features.join(", ") : "");
    setFormPopular(plan.is_popular ?? false);
    setModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Plan name is required");
      return;
    }

    setSaving(true);
    try {
      const featuresArray = formFeatures.split(",").map((f) => f.trim()).filter(Boolean);
      const code = formName.toLowerCase().replace(/[^a-z0-9]+/g, "_");

      const payload: Partial<PlatformPlanRow> = {
        name: formName.trim(),
        code: editingPlan ? editingPlan.code : code,
        description: formDescription.trim(),
        price_monthly: formPriceMonthly,
        price_annual: formPriceMonthly * 10,
        currency: "INR",
        max_locations: formMaxLocations,
        max_members: formMaxMembers,
        max_trainers: formMaxTrainers,
        ai_voice_minutes: formAiMinutes,
        features: featuresArray,
        is_popular: formPopular,
        is_active: true,
      };

      if (editingPlan) {
        await updatePlatformPlanApi(editingPlan.id, payload);
        toast.success(`Plan "${formName}" updated successfully`);
      } else {
        await createPlatformPlanApi(payload);
        toast.success(`Plan "${formName}" created successfully`);
      }

      setModalOpen(false);
      loadPlans();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: PlatformPlanRow) => {
    if (!window.confirm(`Are you sure you want to delete plan "${plan.name}"?`)) return;
    try {
      await deletePlatformPlanApi(plan.id);
      toast.success(`Plan "${plan.name}" deleted`);
      loadPlans();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete plan");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="SaaS Plans & Feature Modules"
        subtitle="Manage subscription tiers, resource quotas, and modular add-on capabilities available across all tenants."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary text-primary-foreground shadow-xs">
              <Plus className="h-4 w-4" />
              Create Custom Plan
            </Button>
          </div>
        }
      />

      <PageBody>
        {loading ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading plans from PostgreSQL database...
          </div>
        ) : plans.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            No platform plans found. Click &quot;Create Custom Plan&quot; to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => {
              const features = Array.isArray(p.features) ? p.features : [];
              const priceFormatted = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: p.currency || "INR",
                maximumFractionDigits: 0,
              }).format(Number(p.price_monthly));

              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 bg-card transition-all relative ${
                    p.is_popular
                      ? "border-primary shadow-lg ring-1 ring-primary/30"
                      : "border-border/60 hover:border-primary/40 shadow-xs"
                  }`}
                >
                  {p.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground flex items-center gap-1 shadow-sm">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                      <span className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                        {p.tenants_count ?? 0} active brand{p.tenants_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground min-h-[36px] line-clamp-2">
                      {p.description || "Comprehensive fitness studio management tier."}
                    </p>

                    <div className="my-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-foreground">{priceFormatted}</span>
                      <span className="text-xs text-muted-foreground font-medium">/ month</span>
                    </div>

                    <div className="space-y-2 py-3 border-y border-border/40 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Max Studio Branches</span>
                        <span className="font-semibold text-foreground">{p.max_locations}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Active Members Limit</span>
                        <span className="font-semibold text-foreground">{p.max_members.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Trainer Accounts</span>
                        <span className="font-semibold text-foreground">{p.max_trainers}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>AI Voice Calling</span>
                        <span className="font-semibold text-foreground">{p.ai_voice_minutes} min/mo</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-semibold text-foreground">Included Features:</div>
                      {features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 mt-6 border-t border-border/40 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 text-xs gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Plan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlan(p)}
                      className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-9 px-2.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create Custom SaaS Plan"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p_name">Plan Name *</Label>
                    <Input
                      id="p_name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Franchise Enterprise"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_price">Monthly Price (INR) *</Label>
                    <Input
                      id="p_price"
                      type="number"
                      value={formPriceMonthly}
                      onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p_desc">Description</Label>
                  <Input
                    id="p_desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of this tier"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p_loc">Max Branches</Label>
                    <Input
                      id="p_loc"
                      type="number"
                      value={formMaxLocations}
                      onChange={(e) => setFormMaxLocations(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_mem">Max Members</Label>
                    <Input
                      id="p_mem"
                      type="number"
                      value={formMaxMembers}
                      onChange={(e) => setFormMaxMembers(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_tr">Max Trainers</Label>
                    <Input
                      id="p_tr"
                      type="number"
                      value={formMaxTrainers}
                      onChange={(e) => setFormMaxTrainers(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_ai">AI Mins/mo</Label>
                    <Input
                      id="p_ai"
                      type="number"
                      value={formAiMinutes}
                      onChange={(e) => setFormAiMinutes(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p_feat">Included Features (Comma-separated)</Label>
                  <textarea
                    id="p_feat"
                    rows={3}
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono"
                    placeholder="CRM & Leads, Member Check-ins, Class Booking, POS Invoicing"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="p_pop"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <Label htmlFor="p_pop" className="cursor-pointer">
                    Highlight as &quot;Most Popular&quot; tier
                  </Label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                    {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}
