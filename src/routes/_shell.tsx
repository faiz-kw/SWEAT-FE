import * as React from "react";
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AppProvider, useAuth } from "@/contexts";
import { isAuthenticated, refreshAndHydrateSession } from "@/services";
import { isSubmoduleAllowed } from "@/lib/modules-config";
import { hasPermission } from "@/lib/permissions";
import { NAV, isOrganizationAdmin, isMemberUser } from "@/lib/nav";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell")({
  beforeLoad: async ({ location }) => {
    // If running on server during SSR, skip guard so SSR doesn't redirect before client hydration
    if (typeof window === "undefined") return;
    if (location.pathname === "/login") return;

    if (isAuthenticated()) return;

    try {
      // Bounded race: abort after 4.5s so stalled networks cannot hang router navigation
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4500));
      const success = await Promise.race([refreshAndHydrateSession(), timeoutPromise]);
      if (success) return;
    } catch (err) {
      console.warn("[_shell beforeLoad] Session hydration failed:", err);
    }

    throw redirect({ to: "/login" });
  },
  component: ShellLayout,
});

/** System-level section IDs that are always accessible regardless of enabledModules */
const ALWAYS_ALLOWED_SECTIONS = new Set(["dashboard"]);

function ShellLayout() {
  const { isAuthenticated: isAuth, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const mainRef = React.useRef<HTMLElement>(null);
  const { pathname, searchStr, hash } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      searchStr: s.location.searchStr,
      hash: s.location.hash,
    }),
  });

  // Automatically reset main scroll container to top whenever route or search parameters change
  React.useLayoutEffect(() => {
    const resetScroll = () => {
      if (hash) {
        const el = document.getElementById(hash.replace(/^#/, ''));
        if (el) {
          el.scrollIntoView();
          return;
        }
      }
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
        mainRef.current.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
    };

    resetScroll();
    const r1 = requestAnimationFrame(resetScroll);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(resetScroll));

    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [pathname, searchStr, hash]);

  // Auth redirect (loop-safe: only navigate if not already on /login)
  React.useEffect(() => {
    if (!isLoading && !isAuth) {
      if (pathname !== "/login") {
        navigate({ to: "/login" });
      }
    }
  }, [isLoading, isAuth, pathname, navigate]);

  // Safety watchdog: ensure unauthenticated/failed sessions never freeze on 'Authenticating session...'
  React.useEffect(() => {
    if (!isLoading) return;
    const watchdog = setTimeout(() => {
      console.warn("[ShellLayout] Auth session check timed out after 5s. Redirecting to /login.");
      if (pathname !== "/login") {
        navigate({ to: "/login" });
      }
    }, 5000);
    return () => clearTimeout(watchdog);
  }, [isLoading, pathname, navigate]);

  // Route-level access guard: redirect if a tenant user navigates directly to an unpermitted URL.
  // This closes the "sidebar-only" gap — even if someone pastes a blocked URL in the address bar,
  // they get bounced back to the dashboard with an Access Denied alert.
  React.useEffect(() => {
    if (isLoading || !user) return;

    // Members should only access the member workspace
    if (isMemberUser(user)) {
      if (pathname !== "/" && !pathname.startsWith("/member")) {
        void navigate({ to: "/" });
        return;
      }
      return;
    }

    const isSuper = user.userType === "platform" || (!user.tenantId && (!!user.isSuperAdmin || user.role === "Super Admin"));

    // Platform Core (including White Label) is STRICTLY Platform Super Admin only
    if (pathname.startsWith("/platform")) {
      if (!isSuper || user.userType === "tenant") {
        toast.error("Access denied: Platform Core is restricted to super administrators.");
        void navigate({ to: "/" });
        return;
      }
    }

    // Administration (/admin/*) is STRICTLY Organization Admin or Platform Super Admin only
    if (pathname.startsWith("/admin")) {
      if (!isSuper && !isOrganizationAdmin(user)) {
        toast.error("Access denied: Administration is restricted to organization administrators.");
        void navigate({ to: "/" });
        return;
      }
    }

    if (isSuper) return; // Super admin unrestricted
    if (pathname === "/") return; // Dashboard is always allowed

    // Find which nav section this path belongs to
    const section = NAV.find((s) =>
      s.items.some((item) => item.to !== "/" && (pathname === item.to || pathname.startsWith(item.to + "/")))
    );
    if (!section) return; // Unknown route — let router 404

    // Find the specific nav item that matches this path
    const navItem = section.items.find(
      (item) => item.to !== "/" && (pathname === item.to || pathname.startsWith(item.to + "/"))
    );
    if (!navItem) return;

    // Guard items restricted to super admins
    if (navItem.visibility === "superadmin_only" || section.visibility === "superadmin_only") {
      toast.error("Access denied: You do not have permission to view this administration page.");
      void navigate({ to: "/" });
      return;
    }

    // Check tenant provisioned module restriction (skip dashboard and admin)
    if (section.id !== "dashboard" && section.id !== "admin") {
      const isProvisioned = isSubmoduleAllowed(user.enabledModules, navItem.to, section.id);
      if (!isProvisioned) {
        toast.error(`Access denied: Module '${section.label}' is not provisioned for this tenant.`);
        void navigate({ to: "/" });
        return;
      }
    }

    // Check granular effective user permission
    if (navItem.permission && !hasPermission(user, navItem.permission)) {
      toast.error("Access denied: You do not have permission to view this page. Please contact your administrator.");
      void navigate({ to: "/" });
    }
  }, [pathname, user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  // If user is a Member, render the clean, dedicated Web Member Portal shell
  if (isMemberUser(user)) {
    return (
      <AppProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <Topbar />
          <main ref={mainRef} className="scrollbar-thin flex-1 min-h-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
