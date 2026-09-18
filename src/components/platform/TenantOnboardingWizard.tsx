import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Building2, MapPin, User, CheckCircle2, ArrowRight, ArrowLeft, 
  Sparkles, Shield, Layers, CreditCard, Loader2, AlertCircle,
  ChevronDown, ChevronUp, SlidersHorizontal, Check, CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardTenantApi, type OnboardTenantPayload } from "@/services/api-platform";
import { 
  FEATURE_MODULES_CATALOG, 
  getSubmodulePathsForModule,
  type ModuleDefinition 
} from "@/lib/modules-config";

const STEPS = [
  { id: 1, title: "Brand & Identity", desc: "Organization details & subdomain", icon: Building2 },
  { id: 2, title: "Primary Studio", desc: "Flagship location & branch", icon: MapPin },
  { id: 3, title: "Admin Account", desc: "Owner login credentials", icon: User },
  { id: 4, title: "Plan & Modules", desc: "Tier limits & AI features", icon: Layers },
  { id: 5, title: "Review & Deploy", desc: "Instant provisioning", icon: Sparkles },
];

const FIELD_ELEMENT_MAP: Record<string, string> = {
  brand_name: "brand_name",
  slug: "slug",
  currency: "currency",
  timezone: "timezone",
  location_name: "loc_name",
  city: "city",
  address: "address",
  admin_first_name: "first_name",
  admin_last_name: "last_name",
  admin_email: "email",
  admin_phone: "phone",
  admin_password: "password",
  tier: "tier-selection-grid",
  enabled_modules: "modules-catalog-container",
};

export function TenantOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState<OnboardTenantPayload>({
    brand_name: "",
    slug: "",
    tier: "Growth",
    plan_id: "PLAN-GROWTH",
    currency: "INR",
    timezone: "Asia/Kolkata",
    location_name: "Flagship Studio",
    city: "Bengaluru",
    address: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
    enabled_modules: [
      "crm", "/crm/leads", "/crm/pipeline", "/crm/ai-calling", "/crm/trials", "/crm/activities", "/crm/follow-ups", "/crm/offers", "/crm/coupons", "/crm/campaigns",
      "members", "/members", "/members/client-360", "/members/memberships", "/members/renewals", "/members/freeze", "/members/transfers", "/members/attendance",
      "ops", "/ops/calendar", "/ops/classes", "/ops/bookings", "/ops/personal-training", "/ops/pilates", "/ops/assessments", "/ops/trainers", "/ops/programs",
      "finance", "/finance/invoices", "/finance/payments", "/finance/refunds", "/finance/outstanding", "/finance/expenses", "/finance/revenue",
      "ai", "/ai/coach", "/ai/trainer-copilot", "/ai/business-intelligence", "/ai/computer-vision", "/ai/live-sessions", "/ai/group-tracking",
      "nutrition", "/nutrition/diet-plans", "/nutrition/consultations", "/nutrition/food-logs", "/nutrition/supplements",
      "inventory", "/inventory/products", "/inventory/stock", "/inventory/purchases", "/inventory/movement", "/inventory/expiry",
      "cs", "/cs/member-health", "/cs/at-risk", "/cs/feedback", "/cs/grievances", "/cs/retention"
    ],
  });

  // Validation Errors State
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  // Expand/Collapse submodule groups in Step 4
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({
    crm: true,
    members: false,
    ops: false,
    finance: false,
    ai: false,
    nutrition: false,
    inventory: false,
    cs: false,
  });

  const toggleExpand = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const updateField = (field: keyof OnboardTenantPayload, value: any) => {
    // Clear error for the field being modified
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }

    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "brand_name" && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      }
      return updated;
    });
  };

  const toggleParentModule = (mod: ModuleDefinition) => {
    if (errors.enabled_modules) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.enabled_modules;
        return next;
      });
    }

    setFormData((prev) => {
      const current = prev.enabled_modules || [];
      const isCurrentlyEnabled = current.includes(mod.id);
      const subPaths = mod.submodules.map((s) => s.to);

      let next: string[];
      if (isCurrentlyEnabled) {
        // Disable parent and all its submodules
        next = current.filter((item) => item !== mod.id && !subPaths.includes(item));
      } else {
        // Enable parent and all its submodules
        const uniqueSet = new Set([...current, mod.id, ...subPaths]);
        next = Array.from(uniqueSet);
      }
      return { ...prev, enabled_modules: next };
    });
  };

  const toggleSubmodule = (mod: ModuleDefinition, subPath: string) => {
    if (errors.enabled_modules) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.enabled_modules;
        return next;
      });
    }

    setFormData((prev) => {
      const current = prev.enabled_modules || [];
      const subPaths = mod.submodules.map((s) => s.to);
      const isSubActive = current.includes(subPath);

      let next: string[];
      if (isSubActive) {
        next = current.filter((item) => item !== subPath);
        // Check if all submodules of this parent are now disabled
        const remainingSubs = subPaths.filter((p) => p !== subPath && next.includes(p));
        if (remainingSubs.length === 0) {
          next = next.filter((item) => item !== mod.id);
        }
      } else {
        // Enable submodule and ensure parent is enabled
        const uniqueSet = new Set([...current, mod.id, subPath]);
        next = Array.from(uniqueSet);
      }
      return { ...prev, enabled_modules: next };
    });
  };

  const setAllSubmodulesForModule = (mod: ModuleDefinition, enable: boolean) => {
    setFormData((prev) => {
      const current = prev.enabled_modules || [];
      const subPaths = mod.submodules.map((s) => s.to);
      let next: string[];
      if (enable) {
        const uniqueSet = new Set([...current, mod.id, ...subPaths]);
        next = Array.from(uniqueSet);
      } else {
        next = current.filter((item) => item !== mod.id && !subPaths.includes(item));
      }
      return { ...prev, enabled_modules: next };
    });
  };

  const navigateAndFocusField = (step: number, fieldName: string, errorMsg: string) => {
    setCurrentStep(step);
    toast.error(errorMsg, {
      duration: 4000,
    });

    setTimeout(() => {
      const elementId = FIELD_ELEMENT_MAP[fieldName] || fieldName;
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof (el as any).focus === "function") {
          (el as HTMLElement).focus({ preventScroll: true });
        }
        // Add a visual pulsating outline to draw immediate attention
        el.classList.add("ring-2", "ring-destructive", "ring-offset-2", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
        }, 3000);
      }
    }, 120);
  };

  const validateStep = (step: number, autoNavigate: boolean = true): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.brand_name.trim()) {
        newErrors.brand_name = "Brand / Gym Name is required.";
      }
      if (!formData.slug?.trim()) {
        newErrors.slug = "Subdomain slug is required.";
      } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        newErrors.slug = "Subdomain can only contain lowercase letters, numbers, and hyphens.";
      }
      if (!formData.currency?.trim()) {
        newErrors.currency = "Operational Currency is required.";
      }
      if (!formData.timezone?.trim()) {
        newErrors.timezone = "Timezone is required.";
      }
    }

    if (step === 2) {
      if (!formData.location_name.trim()) {
        newErrors.location_name = "Studio / Branch Name is required.";
      }
      if (!formData.city.trim()) {
        newErrors.city = "City is required.";
      }
      if (!formData.address?.trim()) {
        newErrors.address = "Physical Address is required.";
      }
    }

    if (step === 3) {
      if (!formData.admin_first_name.trim()) {
        newErrors.admin_first_name = "Admin First Name is required.";
      }
      if (!formData.admin_last_name?.trim()) {
        newErrors.admin_last_name = "Admin Last Name is required.";
      }
      if (!formData.admin_email.trim()) {
        newErrors.admin_email = "Admin Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email.trim())) {
        newErrors.admin_email = "Please enter a valid email address (e.g. admin@gym.com).";
      }
      if (!formData.admin_phone?.trim()) {
        newErrors.admin_phone = "Contact Phone number is required.";
      }
      if (!formData.admin_password || formData.admin_password.length < 3) {
        newErrors.admin_password = "Password must be at least 3 characters long.";
      }
    }

    if (step === 4) {
      if (!formData.tier) {
        newErrors.tier = "Please select a Subscription Plan Tier.";
      }
      if (!formData.enabled_modules || formData.enabled_modules.length === 0) {
        newErrors.enabled_modules = "Please enable at least 1 feature module.";
      }
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0]!;
      const firstError = newErrors[firstKey]!;
      if (autoNavigate) {
        navigateAndFocusField(step, firstKey, firstError);
      }
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep, true)) {
      setCurrentStep((s) => Math.min(s + 1, 5));
    }
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all previous steps in order, and auto-navigate to the first invalid step/field
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s, true)) {
        return;
      }
    }

    setLoading(true);
    try {
      const res = await onboardTenantApi(formData);
      toast.success(res?.message || "Tenant organization onboarded successfully!");
      setTimeout(() => {
        void navigate({ to: "/platform/tenants" });
      }, 1000);
    } catch (err: any) {
      const errorMsg = err?.response?.data
        ? (typeof err.response.data === "string" 
            ? err.response.data 
            : Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | "))
        : (err?.message || "Failed to onboard tenant");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Tenant Onboarding Wizard"
        subtitle="Provision a brand-new tenant organization, primary studio location, administrator account, and system policies."
      />

      <PageBody>
        {/* Step Progress Stepper */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex items-center justify-between min-w-[700px] border-b border-border/60 pb-5">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = currentStep > s.id;
              const isCurrent = currentStep === s.id;

              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all border ${
                        isCompleted
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                          : isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        Step {s.id}
                      </div>
                      <div className={`text-sm font-medium ${isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {s.title}
                      </div>
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-4 rounded-full transition-all ${
                        currentStep > s.id ? "bg-emerald-500" : "bg-border/60"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs">
          {/* STEP 1: BRAND DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-semibold">Brand & Organization Information</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the legal and commercial brand identity for the gym or fitness chain. All fields are mandatory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="brand_name" className="text-xs font-semibold">
                    Brand / Gym Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="brand_name"
                    placeholder="e.g. IronPeak Athletic Club"
                    value={formData.brand_name}
                    onChange={(e) => updateField("brand_name", e.target.value)}
                    className={errors.brand_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.brand_name && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.brand_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs font-semibold">
                    Subdomain / Slug <span className="text-destructive font-bold">*</span>
                  </Label>
                  <div className={`flex items-center rounded-md border bg-background pl-3 ${errors.slug ? "border-destructive focus-within:ring-1 focus-within:ring-destructive" : "border-input"}`}>
                    <span className="text-xs text-muted-foreground">https://</span>
                    <input
                      id="slug"
                      className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                      placeholder="ironpeak"
                      value={formData.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground pr-3">.performanceos.in</span>
                  </div>
                  {errors.slug && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.slug}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-semibold">
                    Operational Currency <span className="text-destructive font-bold">*</span>
                  </Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className={`w-full h-10 rounded-md border bg-background px-3 py-2 text-sm ${errors.currency ? "border-destructive" : "border-input"}`}
                  >
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="AED">AED (AED - UAE Dirham)</option>
                    <option value="SAR">SAR (SAR - Saudi Riyal)</option>
                    <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                    <option value="AUD">AUD (A$ - Australian Dollar)</option>
                    <option value="CAD">CAD (C$ - Canadian Dollar)</option>
                  </select>
                  {errors.currency && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.currency}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="timezone" className="text-xs font-semibold">
                    Timezone <span className="text-destructive font-bold">*</span>
                  </Label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className={`w-full h-10 rounded-md border bg-background px-3 py-2 text-sm ${errors.timezone ? "border-destructive" : "border-input"}`}
                  >
                    <optgroup label="South Asia & Middle East">
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30) — India</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +4:00) — UAE / Dubai</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (AST +3:00) — Saudi Arabia</option>
                      <option value="Asia/Qatar">Asia/Qatar (AST +3:00) — Qatar</option>
                    </optgroup>
                    <optgroup label="Southeast & East Asia">
                      <option value="Asia/Singapore">Asia/Singapore (SGT +8:00) — Singapore / Malaysia</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (ICT +7:00) — Thailand / Vietnam</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST +9:00) — Japan</option>
                      <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT +8:00) — Hong Kong</option>
                    </optgroup>
                    <optgroup label="Europe & United Kingdom">
                      <option value="Europe/London">Europe/London (GMT/BST +0:00) — United Kingdom</option>
                      <option value="Europe/Paris">Europe/Paris (CET/CEST +1:00) — France / Central Europe</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET/CEST +1:00) — Germany</option>
                    </optgroup>
                    <optgroup label="North America (US & Canada)">
                      <option value="America/New_York">America/New_York (EST/EDT -5:00) — Eastern Time</option>
                      <option value="America/Chicago">America/Chicago (CST/CDT -6:00) — Central Time</option>
                      <option value="America/Denver">America/Denver (MST/MDT -7:00) — Mountain Time</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT -8:00) — Pacific Time</option>
                      <option value="America/Toronto">America/Toronto (EST/EDT -5:00) — Eastern Canada</option>
                    </optgroup>
                    <optgroup label="Australia & Oceania">
                      <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT +10:00) — Eastern Australia</option>
                      <option value="Australia/Perth">Australia/Perth (AWST +8:00) — Western Australia</option>
                      <option value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT +12:00) — New Zealand</option>
                    </optgroup>
                  </select>
                  {errors.timezone && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.timezone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRIMARY STUDIO LOCATION */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-semibold">Primary Flagship Studio Location</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure the primary physical studio location for member check-ins and bookings. All fields are mandatory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="loc_name" className="text-xs font-semibold">
                    Studio / Branch Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="loc_name"
                    placeholder="e.g. Indiranagar Flagship Studio"
                    value={formData.location_name}
                    onChange={(e) => updateField("location_name", e.target.value)}
                    className={errors.location_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.location_name && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.location_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    City <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className={errors.city ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold">
                    Physical Address <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g. 100ft Road, HAL 2nd Stage"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={errors.address ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADMIN ACCOUNT */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-semibold">Tenant Primary Administrator Account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This user will have organization-level administrator privileges for this tenant (members, trainers, scheduling, and billing). Platform Core &amp; White Label remain exclusively managed by Platform Super Admins.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-xs font-semibold">
                    First Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="e.g. Vikram"
                    value={formData.admin_first_name}
                    onChange={(e) => updateField("admin_first_name", e.target.value)}
                    className={errors.admin_first_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.admin_first_name && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.admin_first_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-xs font-semibold">
                    Last Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="e.g. Malhotra"
                    value={formData.admin_last_name}
                    onChange={(e) => updateField("admin_last_name", e.target.value)}
                    className={errors.admin_last_name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.admin_last_name && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.admin_last_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Admin Email <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="owner@ironpeak.com"
                    value={formData.admin_email}
                    onChange={(e) => updateField("admin_email", e.target.value)}
                    className={errors.admin_email ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.admin_email && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.admin_email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Contact Phone <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={formData.admin_phone}
                    onChange={(e) => updateField("admin_phone", e.target.value)}
                    className={errors.admin_phone ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.admin_phone && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.admin_phone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Initial Password <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 3 characters (e.g. 123 or Pass@123)"
                    value={formData.admin_password}
                    onChange={(e) => updateField("admin_password", e.target.value)}
                    className={errors.admin_password ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.admin_password ? (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" /> {errors.admin_password}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">The tenant admin can log in with this password immediately or reset it upon login.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PLAN & MODULES */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-semibold">SaaS Subscription Tier & Add-on Modules</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the subscription plan and toggle optional AI & hardware modules. All choices are mandatory.
                </p>
              </div>

              <div id="tier-selection-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { id: "Starter", plan_id: "PLAN-STARTER", price: "₹7,999/mo", locs: "1 Studio", members: "500 Members" },
                  { id: "Growth", plan_id: "PLAN-GROWTH", price: "₹19,999/mo", locs: "5 Studios", members: "2,500 Members", popular: true },
                  { id: "Enterprise", plan_id: "PLAN-ENTERPRISE", price: "₹49,999/mo", locs: "50 Studios", members: "50,000 Members" },
                ].map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => {
                      updateField("tier", tier.id);
                      updateField("plan_id", tier.plan_id);
                    }}
                    className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                      formData.tier === tier.id
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Popular
                      </span>
                    )}
                    <div className="font-semibold text-base">{tier.id}</div>
                    <div className="text-lg font-bold text-primary mt-1">{tier.price}</div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>✓ {tier.locs}</div>
                      <div>✓ {tier.members}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div id="modules-catalog-container" className="pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="block font-semibold text-xs">
                      Enabled Feature Modules & Submodules <span className="text-destructive font-bold">*</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Enable or disable entire modules, or expand any module to configure granular access to individual submodules.
                    </p>
                  </div>
                </div>

                {errors.enabled_modules && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertCircle className="size-3 shrink-0" /> {errors.enabled_modules}
                  </p>
                )}

                <div className="space-y-3">
                  {FEATURE_MODULES_CATALOG.map((m) => {
                    const isParentEnabled = formData.enabled_modules?.includes(m.id);
                    const subPaths = m.submodules.map((s) => s.to);
                    const enabledSubCount = subPaths.filter((p) => formData.enabled_modules?.includes(p)).length;
                    const totalSubCount = m.submodules.length;
                    const isExpanded = expandedModules[m.id] ?? false;

                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl border transition-all duration-150 ${
                          isParentEnabled
                            ? "border-primary/40 bg-card shadow-2xs"
                            : "border-border/60 bg-muted/20 opacity-85"
                        }`}
                      >
                        {/* Parent Module Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleParentModule(m)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                isParentEnabled
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary"
                              }`}
                            >
                              {isParentEnabled && <Check className="size-3.5 stroke-[3]" />}
                            </button>

                            <div className="min-w-0 cursor-pointer" onClick={() => toggleParentModule(m)}>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs sm:text-sm font-semibold truncate ${isParentEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                  {m.label}
                                </span>
                                {m.badge && (
                                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
                                    {m.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {m.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                !isParentEnabled || enabledSubCount === 0
                                  ? "bg-muted text-muted-foreground"
                                  : enabledSubCount === totalSubCount
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {enabledSubCount} / {totalSubCount} Submodules
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleExpand(m.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal className="size-3 text-primary" />
                              <span className="hidden sm:inline">Submodules</span>
                              {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Submodules Drawer */}
                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/10 p-3 sm:p-4 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1">
                              <span className="font-semibold uppercase tracking-wider text-[10px]">
                                Available Submodules in {m.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAllSubmodulesForModule(m, true)}
                                  className="text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  Select All
                                </button>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => setAllSubmodulesForModule(m, false)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Deselect All
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {m.submodules.map((sub) => {
                                const isSubActive = formData.enabled_modules?.includes(sub.to);
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => toggleSubmodule(m, sub.to)}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                      isSubActive
                                        ? "bg-background border-primary/40 shadow-2xs"
                                        : "bg-muted/30 border-border/40 opacity-70 hover:opacity-100 hover:bg-background/60"
                                    }`}
                                  >
                                    <div className="pt-0.5">
                                      <div
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                          isSubActive
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-border bg-background"
                                        }`}
                                      >
                                        {isSubActive && <Check className="size-3 stroke-[3]" />}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`font-semibold text-xs truncate ${isSubActive ? "text-foreground" : "text-muted-foreground"}`}>
                                        {sub.label}
                                      </div>
                                      {sub.description && (
                                        <p className="text-[10.5px] text-muted-foreground line-clamp-1 mt-0.5">
                                          {sub.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & DEPLOY */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-semibold">Review & Provision Tenant Organization</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Confirm the details below. Once confirmed, the system will initialize database schemas, primary location, and admin account.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-xs">Brand Name:</span>
                    <span className="font-semibold">{formData.brand_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Domain:</span>
                    <span className="font-semibold">{formData.slug}.performanceos.in</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Primary Location:</span>
                    <span className="font-semibold">{formData.location_name} ({formData.city})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Plan Tier:</span>
                    <span className="font-semibold text-primary">{formData.tier} Tier</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-xs">Admin Owner:</span>
                    <span className="font-semibold">{formData.admin_first_name} {formData.admin_last_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Admin Email:</span>
                    <span className="font-semibold">{formData.admin_email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Enabled Features:</span>
                    <span className="font-semibold text-primary">
                      {FEATURE_MODULES_CATALOG.filter(m => formData.enabled_modules?.includes(m.id)).length} Modules (
                      {formData.enabled_modules?.filter(item => item.startsWith("/")).length} Submodules Active)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Timezone:</span>
                    <span className="font-semibold">{formData.timezone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Currency:</span>
                    <span className="font-semibold">{formData.currency}</span>
                  </div>
                </div>

                {/* Module Pills in Review */}
                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block text-xs mb-1.5 font-medium">Provisioned Modules Overview:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_MODULES_CATALOG.filter(m => formData.enabled_modules?.includes(m.id)).map(m => {
                      const activeSubCount = m.submodules.filter(s => formData.enabled_modules?.includes(s.to)).length;
                      return (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs font-medium"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{m.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({activeSubCount}/{m.submodules.length})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/60">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button onClick={handleNext} className="gap-2 bg-primary text-primary-foreground">
                Next Step
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Provision & Deploy Brand
              </Button>
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
