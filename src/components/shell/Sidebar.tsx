import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Apple,
  BarChart3,
  Building2,
  CalendarRange,
  ChevronDown,
  Dumbbell,
  LifeBuoy,
  Sparkles,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Target,
  Users,
  Wallet,
  Workflow,
  X,
  Zap,
  Radio,
  Sun,
  Moon,
  ShieldCheck,
  Search,
  Cpu,
} from "lucide-react";

import { NAV, getFilteredNav } from "@/lib/nav";
import { isSubmoduleAllowed } from "@/lib/modules-config";
import { useApp } from "@/contexts";
import { useAuth } from "@/contexts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Target, Users, CalendarRange, Activity, Apple, Package, Wallet,
  HeartPulse, Megaphone, Workflow, BarChart3, Settings, Building2, Sparkles, Dumbbell, LifeBuoy,
};

// Subtle colorful category tags
const SECTION_BADGES: Record<string, { label: string; color: string }> = {
  "platform": { label: "CORE", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  "admin": { label: "ADMIN", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  "ai": { label: "AI", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  "crm": { label: "HOT", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

const DEFAULT_SIDEBAR_WIDTH = 264;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 460;

export function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen, tenantName, theme, toggleTheme, branding } = useApp();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [filterQuery, setFilterQuery] = React.useState("");

  // Role-based nav filtering — Super Admins see Platform Core, tenant users don't
  const isSuperAdmin = (user?.userType === 'platform' || !user?.tenantId) && (!!(user?.isSuperAdmin) || user?.role === 'Super Admin');
  const roleFilteredNav = React.useMemo(() => getFilteredNav(isSuperAdmin), [isSuperAdmin]);

  // Tenant's provisioned module/submodule list. null = unrestricted (super admin).
  const enabledModules = user?.enabledModules ?? null;

  // ── Drag Resizing State & Handlers ──
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setSidebarWidth((latestWidth) => {
        try {
          localStorage.setItem("app_sidebar_width", String(latestWidth));
        } catch {}
        return latestWidth;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDoubleClickReset = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem("app_sidebar_width", String(DEFAULT_SIDEBAR_WIDTH));
    } catch {}
  };

  const getActiveSectionId = React.useCallback((currentPath: string): string | null => {
    for (const s of roleFilteredNav) {
      if (s.items.some((i) => (i.to === "/" ? currentPath === "/" : currentPath.startsWith(i.to)))) {
        return s.id;
      }
    }
    return null;
  }, [roleFilteredNav]);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    const activeId = getActiveSectionId(pathname);
    for (const s of NAV) {
      init[s.id] = s.id === activeId;
    }
    return init;
  });

  // Auto-expand active module smoothly without collapsing user-opened sections
  React.useEffect(() => {
    const activeId = getActiveSectionId(pathname);
    if (activeId) {
      setOpen((prev) => (prev[activeId] ? prev : { ...prev, [activeId]: true }));
    }
  }, [pathname, getActiveSectionId]);

  const isDark = theme === "dark";

  // Nav list rendered directly in both desktop and mobile modes (prevents unmount jumps)
  const renderNavContent = (isMobile = false) => {
    // 1. Role-based filter (super admin vs tenant visibility)
    // 2. Module/submodule permission filter (tenant's enabledModules list)
    // 3. Search query filter
    const filteredNav = roleFilteredNav
      .map((sec) => {
        // Filter items to only those allowed by the tenant's provisioned modules
        const allowedItems = sec.items.filter((item) => {
          // Dashboard ("/") and admin sections are always visible (not in FEATURE_MODULES_CATALOG)
          if (sec.id === 'dashboard' || sec.id === 'admin' || sec.id === 'platform') return true;
          // Use isSubmoduleAllowed to check against tenant's enabledModules
          return isSubmoduleAllowed(enabledModules, item.to, sec.id);
        });

        // Apply search filter on top
        const searchedItems = filterQuery
          ? allowedItems.filter(
              (item) =>
                item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
                sec.label.toLowerCase().includes(filterQuery.toLowerCase())
            )
          : allowedItems;

        return { ...sec, items: searchedItems };
      })
      // Hide sections that have no visible items after filtering
      .filter((sec) => sec.items.length > 0);

    return (
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map((section) => {
          const Icon = ICONS[section.icon] ?? LayoutDashboard;
          const isOpen = open[section.id] ?? false;
          const sectionActive = section.items.some((i) =>
            i.to === "/" ? pathname === "/" : pathname.startsWith(i.to)
          );
          const badge = SECTION_BADGES[section.id];

          if (section.items.length === 1) {
            const item = section.items[0]!;
            const isActive = pathname === item.to;
            return (
              <Link
                key={section.id}
                to={item.to}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-muted/70",
                )}
                title={section.label}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
                )}
                <Icon className={cn("size-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {(!collapsed || isMobile) && (
                  <span className="truncate flex-1 tracking-tight">{section.label}</span>
                )}
                {badge && (!collapsed || isMobile) && (
                  <span className={cn("text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border tracking-wider uppercase", badge.color)}>
                    {badge.label}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <div key={section.id} className="space-y-0.5">
              <button
                onClick={() => setOpen((p) => ({ ...p, [section.id]: !isOpen }))}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer",
                  sectionActive
                    ? "text-primary font-bold bg-primary/5"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-muted/60",
                )}
                title={section.label}
              >
                {sectionActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(13,148,136,0.4)]" />
                )}
                <Icon className={cn("size-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110", sectionActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="truncate flex-1 text-left tracking-tight">{section.label}</span>
                    {badge && (
                      <span className={cn("text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border tracking-wider uppercase mr-1.5", badge.color)}>
                        {badge.label}
                      </span>
                    )}
                    <ChevronDown
                      className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-primary")}
                    />
                  </>
                )}
              </button>

              {(!collapsed || isMobile) && isOpen && (
                <div className="relative mt-1 ml-4 pl-3 space-y-0.5 border-l border-sidebar-border animate-in fade-in duration-150">
                  {section.items.map((item) => {
                    const isItemActive = pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => isMobile && setMobileOpen(false)}
                        className={cn(
                          "group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] transition-all duration-150",
                          isItemActive
                            ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {isItemActive && (
                          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(13,148,136,0.6)]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <>
      {/* ── Desktop Adaptive Sidebar (md+) ── */}
      <aside
        style={{ width: collapsed ? 64 : `${sidebarWidth}px` }}
        className={cn(
          "scrollbar-thin z-30 hidden md:flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xs relative",
          isDragging ? "select-none transition-none" : "transition-[width] duration-150 ease-out"
        )}
      >
        {/* ── Drag Resizer Handle ── */}
        {!collapsed && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClickReset}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors z-40 group flex items-center justify-center",
              isDragging && "bg-primary/50"
            )}
            title="Drag to resize sidebar width • Double-click to reset"
          >
            <div className="h-8 w-0.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
          </div>
        )}
        {/* Brand Header */}
        <div className="relative z-10 flex h-15 shrink-0 items-center justify-between border-b border-sidebar-border px-4 bg-sidebar">
          <div className="flex items-center gap-3 min-w-0">
            {/* Custom Brand Logo or PerformanceOS Cyber-Shield Brand Emblem */}
            {branding?.logo_url ? (
              <div className="relative flex shrink-0 items-center justify-center rounded-xl overflow-hidden size-[34px] bg-muted/40 border border-border/80 shadow-2xs">
                <img
                  src={branding.logo_url}
                  alt={branding.app_name || "Logo"}
                  className="size-6 object-contain rounded"
                />
              </div>
            ) : (
              <BrandLogo
                size={34}
                showStatusDot={true}
                primaryColor={branding?.primary_color}
                accentColor={branding?.accent_color}
              />
            )}

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold tracking-tight text-foreground">
                    {branding?.app_name || (
                      <>
                        Performance<span className="text-primary">OS</span>
                      </>
                    )}
                  </span>
                  <span
                    className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shadow-2xs"
                    style={
                      branding?.accent_color
                        ? { backgroundColor: branding.accent_color, color: "#fff", borderColor: "transparent" }
                        : undefined
                    }
                  >
                    PRO
                  </span>
                </div>
                <div className="truncate text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate">{tenantName || branding?.app_name || "Global Platform HQ"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Filter Search inside Sidebar */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search modules…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation Content */}
        {renderNavContent(false)}

        {/* Bottom Dock */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border bg-muted/30 space-y-2 text-xs">
            {/* Theme Switcher Button */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-muted-foreground font-medium">Interface Mode</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border shadow-2xs transition-all cursor-pointer"
              >
                {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-primary" />}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile Sidebar Drawer (< md) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl border-r border-sidebar-border animate-in slide-in-from-left duration-250">
            <div className="flex h-15 shrink-0 items-center justify-between border-b border-sidebar-border px-4 bg-sidebar">
              <div className="flex items-center gap-3">
                {branding?.logo_url ? (
                  <div className="relative flex shrink-0 items-center justify-center rounded-xl overflow-hidden size-[32px] bg-muted/40 border border-border/80 shadow-2xs">
                    <img
                      src={branding.logo_url}
                      alt={branding.app_name || "Logo"}
                      className="size-5 object-contain rounded"
                    />
                  </div>
                ) : (
                  <BrandLogo
                    size={32}
                    showStatusDot={true}
                    primaryColor={branding?.primary_color}
                    accentColor={branding?.accent_color}
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-foreground">
                    {branding?.app_name || (
                      <>
                        Performance<span className="text-primary">OS</span>
                      </>
                    )}
                  </div>
                  <div className="truncate text-[10.5px] text-muted-foreground font-medium">{tenantName}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {renderNavContent(true)}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
