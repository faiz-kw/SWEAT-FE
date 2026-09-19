import * as React from "react";
import { 
  Bell, LogOut, Menu, PanelLeft, Search, ChevronRight, 
  CheckCircle2, AlertCircle, ArrowUpRight, KeyRound, Sparkles, MapPin, 
  Building, Radio, Bot, Command, ShieldCheck, Flame, Sun, Moon, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useApp, useLocations, useAuth } from "@/contexts";
import { ALL_NAV_ITEMS, findNavItem } from "@/lib/nav";
import { hasPermission } from "@/lib/permissions";
import { isSubmoduleAllowed } from "@/lib/modules-config";
import { useRouterState, useRouter, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { exitImpersonateApi } from "@/services/api-platform";
import { setAccessToken, setUserProfile } from "@/services/auth";
import { toast } from "sonner";

// ── Helper: derive breadcrumb segments from pathname ──────────────────────────
function buildBreadcrumbs(pathname: string, navLabel?: string, sectionLabel?: string) {
  const crumbs: { label: string; to?: string }[] = [{ label: "Console", to: "/" }];
  if (pathname === "/") return crumbs;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return crumbs;

  const sectionName = sectionLabel ?? parts[0]!.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (parts.length === 1) {
    crumbs.push({ label: sectionName });
    return crumbs;
  }

  const pageName = navLabel ?? parts.slice(1).join(" / ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  crumbs.push({ label: sectionName, to: `/${parts[0]!}/${parts[1] ?? ""}` });
  crumbs.push({ label: pageName });

  return crumbs;
}

export function Topbar() {
  const {
    toggleCollapsed,
    toggleMobile,
    locationId,
    setLocationId,
    tenantName,
    role,
    theme,
    toggleTheme,
  } = useApp();
  const { user, logout } = useAuth();
  const router = useRouter();
  const rawLocations = useLocations();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = findNavItem(pathname);

  const validLocations = React.useMemo(() => {
    if (rawLocations && rawLocations.length > 0) {
      return rawLocations
        .filter((l) => l && (l.id || l.name))
        .map((l, idx) => ({
          id: l.id || `LOC-00${idx + 1}`,
          name: l.name || `Studio Branch ${idx + 1}`,
          city: l.city || "Branch",
        }));
    }
    return [];
  }, [rawLocations]);

  const isOrgWide = user?.isOrgWide !== false;

  // Enforce branch scope: if branch-scoped, user cannot select 'all'
  React.useEffect(() => {
    if (!isOrgWide && validLocations.length > 0) {
      if (locationId === "all" || !validLocations.some((l) => l.id === locationId)) {
        setLocationId(validLocations[0].id);
      }
    }
  }, [isOrgWide, validLocations, locationId, setLocationId]);

  // ── Search State ──
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  const isSuperAdmin = (user?.userType === 'platform' || !user?.tenantId) && (!!(user?.isSuperAdmin) || user?.role === "Super Admin");
  const enabledModules = user?.enabledModules ?? null;

  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_NAV_ITEMS.filter((item) => {
      // Check section visibility
      if (item.sectionVisibility === "superadmin_only" && !isSuperAdmin) return false;
      if (item.sectionVisibility === "tenant_only" && isSuperAdmin) return false;
      // Check item visibility
      if (item.visibility === "superadmin_only" && !isSuperAdmin) return false;
      if (item.visibility === "tenant_only" && isSuperAdmin) return false;

      // Check tenant provisioned module restriction
      if (
        !isSuperAdmin &&
        item.sectionId !== "dashboard" &&
        item.sectionId !== "admin" &&
        item.sectionId !== "platform"
      ) {
        if (!isSubmoduleAllowed(enabledModules, item.to, item.sectionId)) {
          return false;
        }
      }

      // Check granular effective user permission
      if (item.permission && !hasPermission(user, item.permission)) {
        return false;
      }

      return (
        item.label.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [searchQuery, isSuperAdmin, user, enabledModules]);

  // Global Ctrl/Cmd + K shortcut listener
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = searchContainerRef.current?.querySelector("input");
        if (input) {
          input.focus();
          setSearchFocused(true);
        } else {
          setMobileSearchOpen(true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.fullName || user?.firstName || user?.email?.split("@")[0] || "Super Admin";
  const initials = user?.initials || displayName.slice(0, 2).toUpperCase();
  const userEmail = user?.email || "superadmin@performanceos.com";

  const breadcrumbs = buildBreadcrumbs(pathname, nav?.label, nav?.section);

  const [isExiting, setIsExiting] = React.useState(false);

  const handleExitImpersonation = async () => {
    setIsExiting(true);
    try {
      const res = await exitImpersonateApi();
      if (res && res.access) {
        setAccessToken(res.access);
        if (res.user) {
          setUserProfile({
            firstName: res.user.first_name,
            lastName: res.user.last_name,
            fullName: res.user.full_name || `${res.user.first_name} ${res.user.last_name}`.trim(),
            email: res.user.email,
            tenantName: res.user.tenant_name || "Platform Super Admin",
            locations: res.user.allowed_locations || [],
          });
        }
        toast.success("Exited tenant session. Returned to Super Admin platform scope.");
        void router.navigate({ to: "/platform/tenants" });
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to exit impersonation");
    } finally {
      setIsExiting(false);
    }
  };



  const isDark = theme === "dark";

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-1.5 sm:gap-3 border-b border-border/80 bg-surface/90 backdrop-blur-md px-2.5 sm:px-4 shadow-2xs w-full max-w-full overflow-hidden">
        {/* ── Left Side: Menu toggles + Adaptive Responsive Breadcrumbs ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Mobile Hamburger (< md) */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden text-foreground hover:bg-muted rounded-lg shrink-0 cursor-pointer"
            onClick={toggleMobile}
            aria-label="Open mobile navigation"
          >
            <Menu className="size-4" />
          </Button>

          {/* Desktop Sidebar Toggle (md+) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0 cursor-pointer"
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar width"
          >
            <PanelLeft className="size-4" />
          </Button>

          {/* Adaptive Responsive Breadcrumbs Hierarchy */}
          <nav aria-label="breadcrumb" className="flex items-center gap-1 sm:gap-1.5 text-xs min-w-0 overflow-hidden">
            {pathname === "/" ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold text-xs truncate max-w-[140px] sm:max-w-[220px]">
                <Sparkles className="size-3 text-primary shrink-0" />
                <span className="truncate">{tenantName || (role === "Super Admin" ? "Global Platform HQ" : "Console")}</span>
              </div>
            ) : (
              <>
                {/* Mobile / Compact tablet badge (< md) */}
                <div className="md:hidden flex items-center min-w-0">
                  <span className="font-bold px-2 py-0.5 rounded-md text-xs truncate max-w-[120px] sm:max-w-[180px] bg-primary/10 text-primary border border-primary/20">
                    {breadcrumbs[breadcrumbs.length - 1]?.label || "Console"}
                  </span>
                </div>

                {/* Desktop Breadcrumbs Trail (md+) with smart truncation */}
                <div className="hidden md:flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-hidden">
                  {breadcrumbs.map((crumb, i) => {
                    const isLast = i === breadcrumbs.length - 1;
                    const isHome = crumb.label === "Console" || crumb.label === "Home";
                    const isIntermediate = !isHome && !isLast;
                    const displayLabel = isHome ? (tenantName || (role === "Super Admin" ? "Platform HQ" : "Console")) : crumb.label;
                    return (
                      <React.Fragment key={`crumb-${i}-${crumb.label}`}>
                        {i > 0 && <ChevronRight className={cn("size-3 shrink-0 text-muted-foreground/40", isIntermediate && "hidden xl:inline")} />}
                        {isLast || !crumb.to ? (
                          <span className={cn(
                            "font-semibold px-2 py-0.5 rounded-md text-xs truncate max-w-[95px] lg:max-w-[140px] 2xl:max-w-[180px]",
                            isLast
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "text-muted-foreground"
                          )}>
                            {displayLabel}
                          </span>
                        ) : (
                          <Link
                            to={crumb.to as "/"}
                            className={cn(
                              "text-muted-foreground hover:text-foreground transition-colors truncate max-w-[80px] lg:max-w-[110px] 2xl:max-w-[150px] px-1.5 py-0.5 rounded hover:bg-muted font-medium text-xs",
                              isIntermediate ? "hidden xl:inline" : "inline"
                            )}
                          >
                            {displayLabel}
                          </Link>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* ── Center: Impersonation Banner if active ── */}
        {user?.isImpersonating && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0 animate-pulse">
            <Building className="size-3.5 shrink-0" />
            <span className="hidden xl:inline font-semibold">Managing:</span>
            <span className="font-extrabold max-w-[90px] xl:max-w-[140px] truncate">{tenantName || "Tenant"}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isExiting}
              onClick={handleExitImpersonation}
              className="h-5 px-1.5 text-[10px] font-bold border-amber-500/40 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 ml-1 rounded-md"
            >
              <LogOut className="size-3 mr-1" />
              {isExiting ? "Exiting…" : "Exit"}
            </Button>
          </div>
        )}

        {/* ── Right Side: Search, Branch Selector, Actions, Profile ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 ml-auto">
          {/* Quick Search Button on < 2xl screens */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSearchOpen(true)}
            className="2xl:hidden size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border bg-card cursor-pointer shrink-0"
            title="Search modules (⌘K)"
            aria-label="Search modules"
          >
            <Search className="size-3.5" />
          </Button>

          {/* Full Command Search on 2xl+ screens */}
          <div ref={searchContainerRef} className="relative hidden 2xl:block w-44 2xl:w-52 shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults[0]) {
                  void router.navigate({ to: searchResults[0].to as "/" });
                  setSearchQuery("");
                  setSearchFocused(false);
                } else if (e.key === "Escape") {
                  setSearchFocused(false);
                }
              }}
              placeholder="Search…"
              className="h-8 pl-8 pr-11 text-xs bg-muted/40 text-foreground placeholder:text-muted-foreground border-border/80 focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg transition-all"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.2 font-mono text-[9px] font-bold text-muted-foreground shadow-2xs">
              ⌘K
            </kbd>

            {/* Desktop Search Dropdown */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 w-76 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="border-b border-border/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-primary bg-muted/50 flex items-center justify-between">
                  <span>Matching Modules</span>
                  <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                    {searchResults.length}
                  </span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs text-muted-foreground">
                    No matching module found.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/50 py-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.to}
                        onClick={() => {
                          void router.navigate({ to: item.to as "/" });
                          setSearchQuery("");
                          setSearchFocused(false);
                        }}
                        className="flex w-full items-center justify-between px-3.5 py-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.label}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground">{item.section}</div>
                        </div>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Selector (Adaptive width with clean truncation) */}
          <Select value={locationId || "all"} onValueChange={setLocationId}>
            <SelectTrigger className="h-8 w-auto min-w-[6.5rem] sm:min-w-[8.5rem] md:min-w-[9.5rem] max-w-[110px] sm:max-w-[140px] md:max-w-[170px] text-xs font-semibold bg-card text-foreground border-border rounded-lg shadow-2xs hover:bg-muted/50 transition-colors shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Branches" />
              </div>
            </SelectTrigger>
            <SelectContent align="end" className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl min-w-[13rem]">
              {isOrgWide && (
                <SelectItem value="all" className="text-xs font-bold text-primary">
                  All Studio Branches
                </SelectItem>
              )}
              {validLocations.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs hover:bg-muted">
                  {l.city} · {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors border border-border bg-card shrink-0"
            title={`Switch to ${isDark ? "Light Mode" : "Dark Mode"}`}
            aria-label="Toggle theme mode"
          >
            {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-primary" />}
          </Button>



          {/* Notifications Center */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors border border-border bg-card shrink-0"
                aria-label="Notifications"
              >
                <Bell className="size-3.5" />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-card" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 shadow-2xl rounded-2xl border-border bg-popover text-popover-foreground">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/40">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-3.5 text-amber-500" /> Notifications & Alerts
                </div>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.2 text-[10px] font-bold text-primary">
                  0 New
                </span>
              </div>
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                No unread system alerts or notifications.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Pill */}
          <div className="border-l border-border pl-1.5 sm:pl-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg p-1 bg-muted/40 hover:bg-muted border border-border transition-all focus:outline-none cursor-pointer shrink-0"
                  aria-label="User menu"
                  id="user-menu-trigger"
                >
                  <div className="hidden 2xl:block text-right leading-tight px-1">
                    <div className="text-xs font-bold text-foreground leading-tight truncate max-w-[110px]">
                      {displayName}
                    </div>
                    <div className="text-[9.5px] text-primary font-extrabold uppercase tracking-wider mt-0.2">
                      {role || (isSuperAdmin ? "SUPER ADMIN" : "MEMBER")}
                    </div>
                  </div>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-tr from-teal-600 to-emerald-500 text-xs font-bold text-white shadow-2xs ring-1 ring-primary/20">
                    {initials}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-border bg-popover text-popover-foreground p-1.5">
                <DropdownMenuLabel className="pb-2">
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 text-xs font-bold text-white shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-foreground">{displayName}</div>
                      <div className="truncate text-[10.5px] text-muted-foreground font-mono">{userEmail}</div>
                      <div className="text-[9.5px] text-primary font-bold uppercase tracking-wider mt-0.5">{role}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2.5 py-1.5 bg-muted/40 rounded-lg my-1 border border-border/60">
                  <div className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">Tenant Scope</div>
                  <div className="text-xs font-bold text-foreground truncate mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="size-3 text-primary" />
                    {tenantName || (isSuperAdmin ? "Global Platform (Super Admin)" : "Tenant Organization")}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  id="change-password-btn"
                  className="text-xs cursor-pointer rounded-lg py-1.5 text-foreground hover:bg-muted"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <KeyRound className="mr-2 size-3.5 text-primary" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  id="logout-btn"
                  className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg py-1.5"
                  onClick={() => void logout()}
                >
                  <LogOut className="mr-2 size-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Quick Search Dialog Modal for Mobile / Tablet */}
      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-popover border-border rounded-2xl">
          <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search performance OS modules…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-border/60 p-1">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {searchQuery ? "No matching modules found." : "Type a module or feature name to jump directly…"}
              </div>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    void router.navigate({ to: item.to as "/" });
                    setMobileSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">{item.section}</div>
                  </div>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary ml-2" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
}
