import * as React from "react";
import {
  Palette,
  Globe,
  Upload,
  CheckCircle2,
  Shield,
  Eye,
  Sparkles,
  RefreshCw,
  Building2,
  Copy,
  Check,
  Smartphone,
  Mail,
  Sliders,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  ExternalLink,
  Sun,
  Moon,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  Sparkle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { useAuth } from "@/contexts";
import { getCurrentUser, setUserProfile } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchTenantsApi,
  fetchTenantBrandingApi,
  updateTenantBrandingApi,
  verifyTenantDnsApi,
  type TenantRow,
  type TenantBrandingData,
  type DnsVerificationResult,
} from "@/services/api-platform";

// ── Curated Luxury & Athletic Brand Presets ───────────────────────────
const THEME_PRESETS = [
  {
    name: "Titanium Teal",
    tagline: "PerformanceOS Default",
    primary: "#0f766e",
    accent: "#2dd4bf",
    category: "Telemetry",
  },
  {
    name: "Equinox Obsidian & Gold",
    tagline: "Ultra-Luxury Boutique",
    primary: "#b45309",
    accent: "#f59e0b",
    category: "Luxury",
  },
  {
    name: "F45 High-Octane Crimson",
    tagline: "High-Intensity Athletic",
    primary: "#dc2626",
    accent: "#f87171",
    category: "Athletic",
  },
  {
    name: "SoulCycle Sunburst Yellow",
    tagline: "Rhythm & Energy",
    primary: "#ca8a04",
    accent: "#facc15",
    category: "Energy",
  },
  {
    name: "PureGym Electric Cyan",
    tagline: "Modern High-Paced",
    primary: "#0284c7",
    accent: "#38bdf8",
    category: "Urban",
  },
  {
    name: "Reboot Cyber Violet",
    tagline: "Boutique Strength Studio",
    primary: "#7c3aed",
    accent: "#c084fc",
    category: "Boutique",
  },
  {
    name: "Minimalist Stealth Onyx",
    tagline: "Monochrome Precision",
    primary: "#18181b",
    accent: "#71717a",
    category: "Minimal",
  },
];

// Helper: Calculate WCAG Contrast Ratio against white
function getWcagContrast(hex: string): { ratio: number; isGood: boolean } {
  try {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return { ratio: 4.5, isGood: true };
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum =
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    const ratio = (1.0 + 0.05) / (lum + 0.05);
    const rounded = Math.round(ratio * 10) / 10;
    return { ratio: rounded, isGood: rounded >= 3.0 };
  } catch {
    return { ratio: 4.5, isGood: true };
  }
}

export function BrandingWorkspace() {
  const { user } = useAuth();
  const [tenants, setTenants] = React.useState<TenantRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [verifyingDns, setVerifyingDns] = React.useState(false);
  const [copiedTokens, setCopiedTokens] = React.useState(false);
  const [sessionApplied, setSessionApplied] = React.useState(false);

  // Preview options
  const [previewTab, setPreviewTab] = React.useState<"shell" | "mobile" | "email">("shell");
  const [previewTheme, setPreviewTheme] = React.useState<"dark" | "light">("light");

  const [appName, setAppName] = React.useState("PerformanceOS");
  const [primaryColor, setPrimaryColor] = React.useState("#0f766e");
  const [accentColor, setAccentColor] = React.useState("#f59e0b");
  const [themePresetCode, setThemePresetCode] = React.useState<string>("titanium-teal");
  const [themeTokens, setThemeTokens] = React.useState<Record<string, any> | null>(null);
  const [customDomain, setCustomDomain] = React.useState("");
  const [cnameVerified, setCnameVerified] = React.useState(false);
  const [dnsResult, setDnsResult] = React.useState<DnsVerificationResult | null>(null);
  const [logoUrl, setLogoUrl] = React.useState("");
  const [faviconUrl, setFaviconUrl] = React.useState("");
  const [emailFooter, setEmailFooter] = React.useState(
    "© {{year}} {{company_name}} · All rights reserved. Powered by PerformanceOS."
  );
  const [supportEmail, setSupportEmail] = React.useState("support@fitnessbrand.com");
  const [removeWatermark, setRemoveWatermark] = React.useState(false);
  const [loginTagline, setLoginTagline] = React.useState(
    "Enterprise Operating System for Modern Athletic Franchises"
  );

  // Baseline state for dirty-tracking
  const [initialData, setInitialData] = React.useState<TenantBrandingData | null>(null);

  // File upload refs
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const faviconInputRef = React.useRef<HTMLInputElement>(null);

  const selectedTenant = React.useMemo(
    () => tenants.find((t) => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  );

  const isDirty = React.useMemo(() => {
    if (!initialData) return false;
    return (
      appName !== (initialData.app_name || "PerformanceOS") ||
      primaryColor !== (initialData.primary_color || "#0f766e") ||
      accentColor !== (initialData.accent_color || "#f59e0b") ||
      customDomain !== (initialData.custom_domain || "") ||
      logoUrl !== (initialData.logo_url || "") ||
      faviconUrl !== (initialData.favicon_url || "") ||
      emailFooter !== (initialData.email_footer || "") ||
      supportEmail !== (initialData.support_email || "") ||
      removeWatermark !== Boolean(initialData.remove_watermark) ||
      loginTagline !== (initialData.login_tagline || "")
    );
  }, [
    initialData,
    appName,
    primaryColor,
    accentColor,
    customDomain,
    logoUrl,
    faviconUrl,
    emailFooter,
    supportEmail,
    removeWatermark,
    loginTagline,
  ]);

  // Load Tenants list
  const loadTenants = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantsApi();
      setTenants(data);
      if (data.length > 0 && !selectedTenantId) {
        setSelectedTenantId(data[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  React.useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Load selected tenant's branding
  const loadBranding = React.useCallback(async (tId: string) => {
    if (!tId) return;
    try {
      const b = await fetchTenantBrandingApi(tId);
      if (b) {
        setAppName(b.app_name || "PerformanceOS");
        setPrimaryColor(b.primary_color || "#0f766e");
        setAccentColor(b.accent_color || "#f59e0b");
        setThemePresetCode(b.theme_preset_code || "titanium-teal");
        setThemeTokens(b.theme_tokens || null);
        setCustomDomain(b.custom_domain || "");
        setCnameVerified(Boolean(b.cname_verified));
        setLogoUrl(b.logo_url || "");
        setFaviconUrl(b.favicon_url || "");
        setEmailFooter(
          b.email_footer ||
            "© {{year}} {{company_name}} · All rights reserved. Powered by PerformanceOS."
        );
        setSupportEmail(b.support_email || "support@fitnessbrand.com");
        setRemoveWatermark(Boolean(b.remove_watermark));
        setLoginTagline(
          b.login_tagline ||
            "Enterprise Operating System for Modern Athletic Franchises"
        );
        setInitialData(b);
      }
    } catch {
      // Fallback defaults for new tenant
      setAppName("PerformanceOS");
      setPrimaryColor("#0f766e");
      setAccentColor("#f59e0b");
      setThemePresetCode("titanium-teal");
      setThemeTokens(null);
      setCustomDomain("");
      setCnameVerified(false);
      setLogoUrl("");
      setFaviconUrl("");
      setEmailFooter("© {{year}} {{company_name}} · All rights reserved.");
      setSupportEmail("support@fitnessbrand.com");
      setRemoveWatermark(false);
      setLoginTagline("Enterprise Operating System for Modern Athletic Franchises");
      setInitialData(null);
    }
  }, []);

  React.useEffect(() => {
    if (selectedTenantId) {
      loadBranding(selectedTenantId);
    }
  }, [selectedTenantId, loadBranding]);

  // Clean up session style injection on unmount
  React.useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--accent");
    };
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoUrl(result);
      toast.success(`Logo "${file.name}" loaded successfully.`);
    };
    reader.readAsDataURL(file);
  };

  // Handle Favicon Upload
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error("Favicon file size must be less than 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFaviconUrl(result);
      toast.success(`Favicon "${file.name}" loaded successfully.`);
    };
    reader.readAsDataURL(file);
  };

  // Apply Preset Palette
  const applyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    const code = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setThemePresetCode(code);
    setThemeTokens({ primary: preset.primary, accent: preset.accent, name: preset.name });
    toast.info(`Applied "${preset.name}" color palette.`);
  };

  // Live Session Styling Toggle
  const toggleSessionPreview = () => {
    if (!sessionApplied) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--ring", primaryColor);
      document.documentElement.style.setProperty("--accent", accentColor);
      setSessionApplied(true);
      toast.success("Theme applied to your current active session!");
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--accent");
      setSessionApplied(false);
      toast.info("Session theme reverted to default system styles.");
    }
  };

  // Copy CSS Tokens
  const handleCopyTokens = () => {
    const cssTokens = `:root {\n  --brand-primary: ${primaryColor};\n  --brand-accent: ${accentColor};\n  --brand-app-name: "${appName}";\n  --brand-custom-domain: "${customDomain}";\n  --brand-theme-preset: "${themePresetCode}";\n}`;
    navigator.clipboard.writeText(cssTokens);
    setCopiedTokens(true);
    toast.success("CSS theme tokens copied to clipboard!");
    setTimeout(() => setCopiedTokens(false), 2000);
  };

  // Reset Changes
  const handleReset = () => {
    if (initialData) {
      setAppName(initialData.app_name || "PerformanceOS");
      setPrimaryColor(initialData.primary_color || "#0f766e");
      setAccentColor(initialData.accent_color || "#f59e0b");
      setThemePresetCode(initialData.theme_preset_code || "titanium-teal");
      setThemeTokens(initialData.theme_tokens || null);
      setCustomDomain(initialData.custom_domain || "");
      setCnameVerified(Boolean(initialData.cname_verified));
      setLogoUrl(initialData.logo_url || "");
      setFaviconUrl(initialData.favicon_url || "");
      setEmailFooter(initialData.email_footer || "");
      setSupportEmail(initialData.support_email || "support@fitnessbrand.com");
      setRemoveWatermark(Boolean(initialData.remove_watermark));
      setLoginTagline(
        initialData.login_tagline ||
          "Enterprise Operating System for Modern Athletic Franchises"
      );
      toast.info("Branding changes reset to saved database state.");
    }
  };

  // Verify Custom Domain DNS
  const handleVerifyDns = async () => {
    if (!customDomain.trim()) {
      toast.error("Please enter a custom domain or vanity subdomain first.");
      return;
    }
    if (!selectedTenantId) return;

    setVerifyingDns(true);
    try {
      const res = await verifyTenantDnsApi(selectedTenantId, customDomain.trim());
      setCnameVerified(res.cname_verified);
      setDnsResult(res);
      toast.success(res.message || `DNS CNAME verified successfully for ${customDomain}`);
    } catch (err: any) {
      toast.error(err?.message || "DNS verification check failed. Please ensure records are published.");
    } finally {
      setVerifyingDns(false);
    }
  };

  // Save Branding
  const handleSaveBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTenantId) return;

    setSaving(true);
    try {
      const updated = await updateTenantBrandingApi(selectedTenantId, {
        app_name: appName,
        brand_name: appName,
        primary_color: primaryColor,
        secondary_color: accentColor,
        accent_color: accentColor,
        theme_preset_code: themePresetCode,
        theme_tokens: themeTokens,
        custom_domain: customDomain,
        cname_verified: cnameVerified,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        email_footer: emailFooter,
        support_email: supportEmail,
        remove_watermark: removeWatermark,
        login_tagline: loginTagline,
      });
      setInitialData(updated);
      toast.success("White-label branding and custom theme saved successfully!");

      // 1. Broadcast across all tabs and windows for instant real-time sync
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("pos_auth_sync");
          bc.postMessage({ type: "TENANT_UPDATED", tenantId: selectedTenantId, timestamp: Date.now() });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          "pos_last_tenant_update",
          JSON.stringify({ tenantId: selectedTenantId, timestamp: Date.now() })
        );
      } catch {}

      window.dispatchEvent(new CustomEvent("tenant_modules_updated", { detail: { tenantId: selectedTenantId } }));

      // 2. Update current active auth session if it matches this tenant or is impersonating
      const current = getCurrentUser();
      if (current && (current.tenantId === selectedTenantId || current.isImpersonating)) {
        setUserProfile({
          ...current,
          tenantName: updated.app_name || current.tenantName,
          branding: updated,
        });
      }

      // 3. If session preview is on, update live CSS variables too
      if (sessionApplied) {
        document.documentElement.style.setProperty("--primary", primaryColor);
        document.documentElement.style.setProperty("--ring", primaryColor);
        document.documentElement.style.setProperty("--accent", accentColor);
        document.documentElement.style.setProperty("--sidebar-primary", primaryColor);
        document.documentElement.style.setProperty("--chart-1", primaryColor);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  const contrastScore = getWcagContrast(primaryColor);
  const isPlatformSuperAdmin = !!user?.isSuperAdmin || user?.role === "Super Admin" || !user?.tenantId;

  if (!loading && !isPlatformSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-lg font-bold text-foreground">Platform Super Admin Clearance Required</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            White Label &amp; Brand Customization is strictly restricted to Platform Super Administrators. Tenant administrators do not have clearance to configure multi-tenant branding, vanity domains, or custom CSS tokens.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-2">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Sticky Enterprise Action Header ── */}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-6 w-6 object-contain rounded"
                />
              ) : (
                <Palette className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  White Label & Brand Customization
                </h1>
                {isDirty && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Domain routing, corporate themes, logos, email templates, and token injection.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTokens}
              className="gap-1.5 text-xs h-9"
              title="Copy CSS variables to clipboard"
            >
              {copiedTokens ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedTokens ? "Copied!" : "CSS Tokens"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSessionPreview}
              className={`gap-1.5 text-xs h-9 ${sessionApplied ? "border-primary text-primary bg-primary/10" : ""}`}
              title="Inject these colors into your current PerformanceOS session"
            >
              <Sparkle className="h-3.5 w-3.5" />
              {sessionApplied ? "Session Active" : "Apply to Session"}
            </Button>

            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}

            <Button
              type="button"
              onClick={() => handleSaveBranding()}
              disabled={saving || loading}
              className="gap-2 bg-primary text-primary-foreground text-xs h-9 shadow-sm"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving..." : "Save Theme Changes"}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content Body ── */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* ── Organization Selector Strip ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Tenant Configuration
              </div>
              <div className="text-sm font-bold text-foreground">
                {selectedTenant ? `${selectedTenant.name} (${selectedTenant.id})` : "Select Tenant"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">Switch Tenant:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="h-9.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id}) • {t.tier || "Growth"} Tier
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 2-Column Responsive Workspace Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Controls & Customization Panels (Col 7) ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Quick Fitness Brand Presets */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Curated Athletic & Luxury Palettes</h3>
                </div>
                <span className="text-[11px] text-muted-foreground">1-Click Apply</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {THEME_PRESETS.map((p) => {
                  const isActive = primaryColor === p.primary && accentColor === p.accent;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-border/60 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-2xs border border-white/20"
                          style={{ backgroundColor: p.primary }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-2xs border border-white/20 -ml-2"
                          style={{ backgroundColor: p.accent }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                          {p.category}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-foreground leading-tight truncate w-full">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate w-full">
                        {p.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Brand Identity & Color Tokens */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Brand Identity & Color Tokens</h3>
                </div>
                {/* Contrast Score Pill */}
                <div
                  className={`text-[10.5px] px-2 py-0.5 rounded-md font-mono font-semibold flex items-center gap-1 ${
                    contrastScore.isGood
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                  title="WCAG Contrast Ratio against White"
                >
                  <span>WCAG {contrastScore.ratio}:1</span>
                  {contrastScore.isGood ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="app_name" className="text-xs font-semibold">
                    Console Platform Title
                  </Label>
                  <Input
                    id="app_name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. Apex PerformanceOS"
                    className="text-xs h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Replaces &quot;PerformanceOS&quot; in the header, tab title, and authentication screens.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Color */}
                  <div className="space-y-1.5">
                    <Label htmlFor="primary_color" className="text-xs font-semibold">
                      Primary Brand Color (Hex)
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          id="primary_color_picker"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-9 w-10 rounded-md border border-border cursor-pointer p-0.5 bg-background shadow-2xs"
                        />
                      </div>
                      <Input
                        id="primary_color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono text-xs h-9 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-1.5">
                    <Label htmlFor="accent_color" className="text-xs font-semibold">
                      Accent Highlight Color (Hex)
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          id="accent_color_picker"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-9 w-10 rounded-md border border-border cursor-pointer p-0.5 bg-background shadow-2xs"
                        />
                      </div>
                      <Input
                        id="accent_color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="font-mono text-xs h-9 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Logo & Favicon Assets */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Corporate Logo & Favicon Assets</h3>
                </div>
                <span className="text-[11px] text-muted-foreground">PNG, SVG, or WebP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Uploader */}
                <div className="space-y-2 p-3.5 rounded-lg border border-border/60 bg-background/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Brand Logo</Label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="text-[10px] text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Preview box / dropzone */}
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-md border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors min-h-[90px]"
                  >
                    {logoUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={logoUrl}
                          alt="Brand Logo Preview"
                          className="h-10 max-w-[140px] object-contain rounded"
                        />
                        <span className="text-[10px] text-muted-foreground mt-1">Click to replace</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Click to upload logo</span>
                        <span className="text-[10px] text-muted-foreground">SVG, PNG up to 2MB</span>
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted-foreground">Or provide hosted URL:</span>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://cdn.brand.com/logo.svg"
                      className="text-[11px] h-7 font-mono"
                    />
                  </div>
                </div>

                {/* Favicon Uploader */}
                <div className="space-y-2 p-3.5 rounded-lg border border-border/60 bg-background/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Favicon</Label>
                    {faviconUrl && (
                      <button
                        type="button"
                        onClick={() => setFaviconUrl("")}
                        className="text-[10px] text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Favicon Dropzone */}
                  <div
                    onClick={() => faviconInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-md border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors min-h-[90px]"
                  >
                    {faviconUrl ? (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card border border-border/80 shadow-2xs">
                        <img
                          src={faviconUrl}
                          alt="Favicon Preview"
                          className="h-5 w-5 object-contain"
                        />
                        <div className="text-[11px] font-semibold truncate max-w-[100px]">
                          {appName}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Upload favicon</span>
                        <span className="text-[10px] text-muted-foreground">ICO, PNG (32x32)</span>
                      </div>
                    )}
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/x-icon,image/png,image/svg+xml"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted-foreground">Or provide hosted URL:</span>
                    <Input
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="https://cdn.brand.com/favicon.ico"
                      className="text-[11px] h-7 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Custom CNAME & Vanity Domain */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Custom CNAME & Vanity Domain</h3>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    cnameVerified
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {cnameVerified ? "CNAME Verified" : "Pending Verification"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="custom_domain" className="text-xs font-semibold">
                    Subdomain or Custom Vanity Domain
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="custom_domain"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                        setCnameVerified(false);
                        setDnsResult(null);
                      }}
                      placeholder="app.yourfitnessbrand.com"
                      className="text-xs h-9 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyDns}
                      disabled={verifyingDns || !customDomain.trim()}
                      className="shrink-0 text-xs h-9 gap-1.5"
                    >
                      {verifyingDns ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {verifyingDns ? "Checking..." : "Verify DNS"}
                    </Button>
                  </div>
                </div>

                {/* DNS Configuration Table */}
                <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Required DNS Records for Your Registrar (Cloudflare, GoDaddy, Route53)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-border/40 text-muted-foreground">
                          <th className="pb-1">Type</th>
                          <th className="pb-1">Host / Name</th>
                          <th className="pb-1">Target / Value</th>
                          <th className="pb-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        <tr>
                          <td className="py-1.5 font-bold text-primary">CNAME</td>
                          <td className="py-1.5 text-foreground">
                            {customDomain.split(".")[0] || "app"}
                          </td>
                          <td className="py-1.5 text-foreground">cname.performanceos.io</td>
                          <td className="py-1.5 text-right font-sans">
                            {cnameVerified ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Ready</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 font-bold text-muted-foreground">TXT</td>
                          <td className="py-1.5 text-foreground">_pos-verify</td>
                          <td className="py-1.5 text-foreground truncate max-w-[120px]">
                            pos-verify={selectedTenantId || "TEN-ID"}
                          </td>
                          <td className="py-1.5 text-right font-sans">
                            {cnameVerified ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
                            ) : (
                              <span className="text-muted-foreground">Optional</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {cnameVerified && (
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>SSL TLS 1.3 certificate active · Auto-renews via Let&apos;s Encrypt</span>
                      </div>
                      <a
                        href={`https://${customDomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold hover:underline"
                      >
                        Visit <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Email & Notification White-Label */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Email & Notification White-Label</h3>
                </div>
                <span className="text-[11px] text-muted-foreground">Receipts & Alerts</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="support_email" className="text-xs font-semibold">
                    Support / Reply-To Email
                  </Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@yourbrand.com"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_footer" className="text-xs font-semibold">
                      Custom Email Footer
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Tokens: {"{{company_name}}"}, {"{{year}}"}
                    </span>
                  </div>
                  <textarea
                    id="email_footer"
                    rows={3}
                    value={emailFooter}
                    onChange={(e) => setEmailFooter(e.target.value)}
                    placeholder="© {{year}} {{company_name}}. All rights reserved."
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* 6. Advanced Governance & Toggles */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Enterprise Governance & Badging</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-background/50">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Remove &quot;Powered by PerformanceOS&quot; Watermark
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Hides all upstream platform vendor watermarks on member logins, public booking URLs, and invoices.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={removeWatermark}
                    onChange={(e) => setRemoveWatermark(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login_tagline" className="text-xs font-semibold">
                    Custom Login Headline / Tagline
                  </Label>
                  <Input
                    id="login_tagline"
                    value={loginTagline}
                    onChange={(e) => setLoginTagline(e.target.value)}
                    placeholder="e.g. Elevate Your Athletic Mastery"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Multi-View Interactive Live Preview (Col 5) ── */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-sm">
              {/* Preview Controls Bar */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm">Live Theme Preview</h3>
                </div>

                {/* Light/Dark Preview Mode Toggle */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme(previewTheme === "dark" ? "light" : "dark")}
                    className="p-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    title={`Switch preview to ${previewTheme === "dark" ? "Light" : "Dark"} mode`}
                  >
                    {previewTheme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Viewport Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted/40 border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab("shell")}
                  className={`py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    previewTab === "shell"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" /> Shell
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("mobile")}
                  className={`py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    previewTab === "mobile"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("email")}
                  className={`py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    previewTab === "email"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Receipt
                </button>
              </div>

              {/* Dynamic Preview Canvas */}
              <div
                className={`rounded-xl border border-border/80 p-4 transition-colors min-h-[380px] flex flex-col ${
                  previewTheme === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
                }`}
              >
                {/* ── 1. Shell / Sidebar Preview ── */}
                {previewTab === "shell" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Simulated Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-5 w-5 object-contain" />
                          ) : (
                            appName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                            <span>{appName}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white shadow-2xs"
                              style={{ backgroundColor: accentColor }}
                            >
                              PRO
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {customDomain || "console.performanceos.app"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-muted-foreground font-medium">Online</span>
                      </div>
                    </div>

                    {/* Simulated Navigation items */}
                    <div className="space-y-1.5 py-2">
                      <div
                        className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-between transition-all"
                        style={{
                          backgroundColor: `${primaryColor}18`,
                          color: primaryColor,
                          borderLeft: `3px solid ${primaryColor}`,
                        }}
                      >
                        <span>Dashboard Analytics</span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                      <div className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/40 flex items-center justify-between">
                        <span>Members & Athletes</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/40 flex items-center justify-between">
                        <span>Schedule & Studios</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/40 flex items-center justify-between">
                        <span>Billing & Revenue</span>
                      </div>
                    </div>

                    {/* Metric Card Mockup */}
                    <div className="rounded-lg p-3 border border-border/40 bg-muted/20 space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Monthly Recurring</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+18.4%</span>
                      </div>
                      <div className="text-lg font-extrabold tracking-tight">₹ 8,42,000</div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: "72%", backgroundColor: primaryColor }}
                        />
                      </div>
                    </div>

                    {/* Buttons CTA */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        className="flex-1 py-1.5 rounded-md text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Action Primary
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:bg-muted/50"
                      >
                        Secondary
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 2. Mobile Member Portal Preview ── */}
                {previewTab === "mobile" && (
                  <div className="flex-1 flex flex-col justify-between max-w-[260px] mx-auto w-full border border-border/80 rounded-2xl p-3.5 shadow-md bg-card">
                    {/* Phone Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-5 w-5 rounded-md flex items-center justify-center font-bold text-white text-[10px]"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {appName.charAt(0)}
                        </div>
                        <span className="text-xs font-bold truncate">{appName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">9:41 AM</span>
                    </div>

                    {/* Class Booking Card */}
                    <div className="space-y-2.5 py-3">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Next Class · Today
                      </div>
                      <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">HIIT & Strength Pro</span>
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            INDINAGAR
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          06:30 PM • 50 mins • Coach Aryan
                        </div>
                        <button
                          type="button"
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-xs mt-1"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Check In Now
                        </button>
                      </div>

                      {/* Member Pass */}
                      <div className="p-2.5 rounded-xl border border-border/60 bg-muted/10 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Membership Tier</div>
                          <div className="text-xs font-bold">All-Access Black Pass</div>
                        </div>
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          ✓
                        </div>
                      </div>
                    </div>

                    {/* Mobile Navigation Bar */}
                    <div className="flex items-center justify-around pt-2 border-t border-border/40 text-[10px] font-medium">
                      <span className="font-bold" style={{ color: primaryColor }}>
                        Home
                      </span>
                      <span className="text-muted-foreground">Book</span>
                      <span className="text-muted-foreground">Pass</span>
                      <span className="text-muted-foreground">Profile</span>
                    </div>
                  </div>
                )}

                {/* ── 3. Branded Email Receipt Preview ── */}
                {previewTab === "email" && (
                  <div className="flex-1 flex flex-col justify-between border border-border/60 rounded-xl p-4 bg-muted/15 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center font-bold text-white text-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-4 w-4 object-contain" />
                          ) : (
                            appName.charAt(0)
                          )}
                        </div>
                        <span className="text-xs font-bold">{appName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Invoice #INV-2026-081</span>
                    </div>

                    <div className="space-y-2 py-1">
                      <div className="text-sm font-bold text-foreground">
                        Payment Confirmation
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Hi Anurag, your monthly subscription renewal for{" "}
                        <strong className="text-foreground">{appName}</strong> was successful.
                      </p>

                      <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quarterly Athlete Pass</span>
                          <span className="font-bold">₹ 14,999.00</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Tax (GST 18%)</span>
                          <span>₹ 2,699.82</span>
                        </div>
                        <div className="border-t border-border/40 pt-1 flex justify-between font-bold text-foreground">
                          <span>Total Paid</span>
                          <span style={{ color: primaryColor }}>₹ 17,698.82</span>
                        </div>
                      </div>
                    </div>

                    {/* Email Footer Rendered */}
                    <div className="pt-3 border-t border-border/40 text-center space-y-1">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {emailFooter
                          .replace("{{company_name}}", appName)
                          .replace("{{year}}", new Date().getFullYear().toString())}
                      </p>
                      {!removeWatermark && (
                        <p className="text-[9px] text-muted-foreground/80">
                          Powered by PerformanceOS Cloud Core
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Guidance */}
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1">
                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Preview reflects live client portals, mobile web apps, and member email receipts.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
