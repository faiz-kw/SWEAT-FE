import * as React from "react";
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AppProvider, useAuth } from "@/contexts";
import { isAuthenticated, refreshAndHydrateSession } from "@/services";
import { isSubmoduleAllowed } from "@/lib/modules-config";
import { NAV } from "@/lib/nav";

export const Route = createFileRoute("/_shell")({
  beforeLoad: async () => {
    // If running on server during SSR, skip guard so SSR doesn't redirect before client hydration
    if (typeof window === "undefined") return;

    if (isAuthenticated()) return;

    const success = await refreshAndHydrateSession();
    if (success) return;

    throw redirect({ to: "/login" });
  },
  component: ShellLayout,
});

/** System-level section IDs that are always accessible regardless of enabledModules */
const ALWAYS_ALLOWED_SECTIONS = new Set(["dashboard", "admin"]);

function ShellLayout() {
  const { isAuthenticated: isAuth, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Auth redirect
  React.useEffect(() => {
    if (!isLoading && !isAuth) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuth, navigate]);

  // Route-level access guard: redirect if a tenant user navigates directly to a blocked URL.
  // This closes the "sidebar-only" gap — even if someone pastes a blocked URL in the address bar,
  // they get bounced back to the dashboard.
  React.useEffect(() => {
    if (!user) return;

    // Platform Core (including White Label) is STRICTLY Platform Super Admin only
    if (pathname.startsWith("/platform")) {
      const isSuper = user.userType === "platform" || (!user.tenantId && (!!user.isSuperAdmin || user.role === "Super Admin"));
      if (!isSuper || user.userType === "tenant") {
        void navigate({ to: "/" });
        return;
      }
    }

    if (user.enabledModules === null) return;  // super admin — unrestricted
    if (pathname === "/") return;  // dashboard is always allowed

    // Find which nav section this path belongs to
    const section = NAV.find((s) =>
      s.items.some((item) => item.to !== "/" && pathname.startsWith(item.to))
    );
    if (!section) return;  // unknown route — let the router 404 it

    // Find the specific nav item that matches this path
    const navItem = section.items.find(
      (item) => item.to !== "/" && pathname.startsWith(item.to)
    );
    if (!navItem) return;

    // Guard items restricted to super admins (e.g. Services, Configuration, Forms, Integrations, API)
    if (navItem.visibility === "superadmin_only") {
      const isSuper = user.userType === "platform" || (!user.tenantId && (!!user.isSuperAdmin || user.role === "Super Admin"));
      if (!isSuper || user.userType === "tenant") {
        void navigate({ to: "/" });
        return;
      }
    }

    // Always-allowed system sections
    if (ALWAYS_ALLOWED_SECTIONS.has(section.id)) return;

    // Check permission against tenant's provisioned modules
    const allowed = isSubmoduleAllowed(user.enabledModules, navItem.to, section.id);
    if (!allowed) {
      // Access denied — redirect to dashboard silently
      void navigate({ to: "/" });
    }
  }, [pathname, user, navigate]);

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

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="scrollbar-thin flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
