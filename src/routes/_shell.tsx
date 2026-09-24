import * as React from "react";
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AppProvider, useAuth } from "@/contexts";
import { isAuthenticated, refreshAndHydrateSession } from "@/services";
import { isSubmoduleAllowed } from "@/lib/modules-config";
import { hasPermission } from "@/lib/permissions";
import { NAV, isOrganizationAdmin } from "@/lib/nav";
import { toast } from "sonner";

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
const ALWAYS_ALLOWED_SECTIONS = new Set(["dashboard"]);

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

  // Route-level access guard: redirect if a tenant user navigates directly to an unpermitted URL.
  // This closes the "sidebar-only" gap — even if someone pastes a blocked URL in the address bar,
  // they get bounced back to the dashboard with an Access Denied alert.
  React.useEffect(() => {
    if (isLoading || !user) return;

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
