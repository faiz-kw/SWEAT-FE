/**
 * app-context.tsx — Application-level UI State (Phase 0 · Updated)
 *
 * WHAT THIS FILE DOES
 * -------------------
 * This context stores UI preferences and session-scope filters that every
 * component in the shell needs to share:
 *
 *   locationId  → Which gym location is currently selected in the header filter.
 *   range       → Which date range is selected in the header filter.
 *   density     → How compact the data tables are (tight / default / comfortable).
 *   collapsed   → Whether the sidebar is collapsed.
 *
 * WHAT CHANGED IN PHASE 0
 * -----------------------
 * Previously:
 *   tenantId = "TEN-001"          ← hardcoded string
 *   role     = "Super Admin"       ← hardcoded mock, switchable via dropdown
 *   setRole  = (v) => ...          ← fake role switcher
 *
 * Now:
 *   tenantId  → read from the real JWT token (via useAuth())
 *   role      → read from the real JWT token (via useAuth())
 *   setRole   → REMOVED. Role is real now — you cannot change it in the UI.
 *
 * tenantName still has a placeholder here. In Phase 1, we will fetch the full
 * tenant profile from GET /tenants/{tid}/ and replace this placeholder.
 *
 * IMPORTANT: AppProvider is rendered inside _shell.tsx, which is itself inside
 * AuthProvider (set up in __root.tsx). So useAuth() is safe to call here.
 */

import * as React from "react";

import { useAuth } from "./auth-context";
import { type TenantBrandingProfile } from "@/services/auth";

type Density = "tight" | "default" | "comfortable";

interface AppState {
  // ── UI preferences ──
  locationId: string;
  setLocationId: (v: string) => void;
  range: string;
  setRange: (v: string) => void;
  density: Density;
  setDensity: (v: Density) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  toggleMobile: () => void;

  // ── Theme preference ──
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;

  // ── Identity (now from real JWT, not hardcoded) ──
  tenantId: string;
  tenantName: string;
  role: string;
  branding: TenantBrandingProfile | null;
}

const Ctx = React.createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Phase 0: read the real user identity from the JWT instead of hardcoding
  const { user } = useAuth();

  // UI preference state — these are still local, frontend-only
  const [locationId, setLocationId] = React.useState("all");
  const [range, setRange] = React.useState("Last 30 days");
  const [density, setDensity] = React.useState<Density>("default");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Theme state with localStorage persistence
  const [theme, setThemeState] = React.useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_theme");
      if (saved === "dark" || saved === "light") return saved;
      return "light";
    }
    return "light";
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  // ── Dynamic White-Label Brand Theme & Asset Injection ──
  const brandingHash = user?.branding
    ? `${user.branding.primary_color}_${user.branding.accent_color}_${user.branding.app_name}_${user.branding.favicon_url}`
    : "";

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const branding = user?.branding;

    if (branding?.primary_color) {
      root.style.setProperty("--primary", branding.primary_color);
      root.style.setProperty("--ring", branding.primary_color);
      root.style.setProperty("--sidebar-primary", branding.primary_color);
      root.style.setProperty("--primary-foreground", "#ffffff");
      root.style.setProperty("--sidebar-primary-foreground", "#ffffff");
      root.style.setProperty("--chart-1", branding.primary_color);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--sidebar-primary-foreground");
      root.style.removeProperty("--chart-1");
    }

    if (branding?.accent_color) {
      root.style.setProperty("--accent", branding.accent_color);
    } else {
      root.style.removeProperty("--accent");
    }

    // Dynamic Favicon
    if (branding?.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }

    // Dynamic Document Title Branding
    if (branding?.app_name) {
      const current = document.title;
      if (current.includes("PerformanceOS")) {
        document.title = current.replace(/PerformanceOS(?:\s+Admin)?/g, branding.app_name);
      } else if (!current.includes(branding.app_name)) {
        document.title = `${current} · ${branding.app_name}`;
      }
    }
  }, [brandingHash]);

  const setTheme = React.useCallback((t: "light" | "dark") => {
    setThemeState(t);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value: AppState = {
    // UI preferences
    locationId,
    setLocationId,
    range,
    setRange,
    density,
    setDensity,
    collapsed,
    toggleCollapsed: () => setCollapsed((c) => !c),
    mobileOpen,
    setMobileOpen,
    toggleMobile: () => setMobileOpen((m) => !m),

    // Theme preferences
    theme,
    setTheme,
    toggleTheme,

    // Identity — now from real JWT claims + /me/ profile
    tenantId: user?.tenantId ?? '',
    tenantName: user?.tenantName || (user?.userType === 'platform' || (!user?.tenantId && user?.isSuperAdmin) ? 'Global Platform HQ' : 'Tenant Organization'),
    role: user?.role ?? (user?.userType === 'platform' || (!user?.tenantId && user?.isSuperAdmin) ? 'Super Admin' : 'Member'),
    branding: user?.branding ?? null,
  };


  return (
    <Ctx.Provider value={value}>
      {/* data-density applies the CSS token for table row height */}
      <div data-density={density === "default" ? undefined : density} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** Scope filter derived from the global header controls. */
export function useScope() {
  const { locationId, tenantId } = useApp();
  return React.useMemo(() => ({ tenantId, locationId }), [tenantId, locationId]);
}

/** Returns the real locations from the authenticated user profile. */
export function useLocations() {
  const { user } = useAuth();
  return user?.locations ?? [];
}

