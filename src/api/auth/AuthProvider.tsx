/**
 * auth-context.tsx — Authentication State Provider (Phase 0 · Foundation)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * This is the React "Who Am I?" box.
 *
 * When a user logs in, we need to know — for the entire lifetime of the app session —
 * who they are. Their name, their role, their tenant, their location.
 *
 * React Context is the right tool for this: it lets ANY component in the entire app
 * read the logged-in user's identity, without passing it down through props manually.
 *
 * This file REPLACES the old mock approach where role was hardcoded as "Super Admin".
 *
 * WHAT THIS FILE PROVIDES
 * -----------------------
 *   user             → The logged-in user's identity (from JWT), or null if not logged in.
 *   isAuthenticated  → true if the user is logged in with a valid, unexpired token.
 *   isLoading        → true while the app checks for an existing session on startup.
 *   login(creds)     → Call this from the login page. Sends credentials to backend.
 *   logout()         → Call this when the user clicks "Sign Out".
 *
 * SESSION RESTORATION ON PAGE REFRESH
 * ------------------------------------
 * Access tokens live only in memory — they disappear on page refresh.
 * But the refresh token cookie persists in the browser.
 *
 * So on every page load, this provider:
 *   1. Calls POST /auth/token/refresh/ with the cookie.
 *   2. If the cookie is valid, the backend returns a new access token.
 *   3. We store that token in memory and set the user as logged in.
 *   4. If there is no cookie (never logged in / expired), we stay logged out.
 *
 * During this check, isLoading = true. The app shell waits for this to complete
 * before deciding whether to render the dashboard or redirect to /login.
 *
 * HOW TO USE THIS FILE
 * --------------------
 * In any component:
 *   import { useAuth } from '@/lib/auth-context';
 *
 *   function MyComponent() {
 *     const { user, logout } = useAuth();
 *     return <span>{user?.role}</span>;
 *   }
 *
 * The AuthProvider must wrap the app in __root.tsx (already done in Phase 0).
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  api,
  setAccessToken,
  clearAccessToken,
  clearUserProfile,
  getCurrentUser,
  isAuthenticated,
  refreshAndHydrateSession,
  setUserProfile,
  type AuthUser,
  type LocationInfo,
} from '@/api';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

export interface LoginCredentials {
  identifier?: string;
  email?: string;
  password: string;
  tenant_slug?: string;
}

/** The shape of what the login API returns */
interface LoginApiResponse {
  access: string;
  // The refresh token is set as an HttpOnly cookie by the backend automatically.
  // We never see it or touch it here.
}

/** Shape of /api/v1/auth/me/ response */
interface MeApiResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role?: string;
  role_code?: string;
  roles?: { code: string; name: string; scope: string; branch_id?: string | null; branch_name?: string | null }[];
  permissions?: string[];
  user_type?: 'platform' | 'tenant';
  is_org_wide?: boolean;
  is_superuser: boolean;
  tenant_id: string | null;
  tenant_name: string | null;
  active_location_id: string | null;
  /** Provisioned module list from tenant. null = super admin (unrestricted). */
  enabled_modules: string[] | null;
  tenant_enabled_modules?: string[] | null;
  allowed_locations: { id: string; name: string; city: string; address?: string }[];
  branding?: import('@/services').TenantBrandingProfile | null;
}


/** Everything the auth context exposes to the rest of the app */
export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ defaultRoute?: string; userType?: string }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

// -----------------------------------------------------------------
// Context
// -----------------------------------------------------------------

const AuthContext = React.createContext<AuthContextValue | null>(null);

// -----------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------

/**
 * Wrap the entire app with this provider (done in __root.tsx).
 * Any component inside the app can then call useAuth() to read the auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // Initialize directly from in-memory store if already populated in beforeLoad
  const [user, setUser] = React.useState<AuthUser | null>(() => getCurrentUser());

  // false if already authenticated and hydrated before load, true if still checking
  const [isLoading, setIsLoading] = React.useState(() => !isAuthenticated());

  // ---------------------------------------------------------------
  // On Mount: Restore Session from Refresh Cookie
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // On Mount: Restore Session from Refresh Cookie
  // ---------------------------------------------------------------
  React.useEffect(() => {
    async function restoreSession(): Promise<void> {
      // If already authenticated and profile is hydrated (from _shell.tsx beforeLoad)
      if (isAuthenticated()) {
        const existing = getCurrentUser();
        if (existing?.fullName) {
          setUser(existing);
          setIsLoading(false);
          // Still fetch fresh profile in background so any permission changes on DB are loaded immediately
          void fetchAndSetProfile();
          return;
        }
      }

      // Otherwise, execute combined refresh and profile hydration
      const ok = await refreshAndHydrateSession();
      if (ok) {
        setUser(getCurrentUser());
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }

    void restoreSession();
  }, []); // runs only once, on mount

  // ---------------------------------------------------------------
  // Helper: Fetch & populate /me/ profile with state update
  // ---------------------------------------------------------------
  const isFetchingRef = React.useRef(false);

  const fetchAndSetProfile = React.useCallback(async (): Promise<void> => {
    if (isFetchingRef.current) return;
    if (!isAuthenticated()) return;
    isFetchingRef.current = true;
    try {
      const meRes = await api.get<MeApiResponse>('/auth/me/');
      const me = meRes.data;
      const nameParts = [me.first_name, me.last_name].filter(Boolean);
      const rawName = me.full_name || nameParts.join(' ') || me.email.split('@')[0] || 'Admin';
      const fullName: string = rawName;
      const initials = nameParts.length >= 2
        ? `${nameParts[0]!.charAt(0)}${nameParts[1]!.charAt(0)}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();

      const rawLocs = (me as any).allowed_locations_list || me.allowed_locations || (me as any).allowed_branches || [];
      const locations = Array.isArray(rawLocs)
        ? rawLocs
            .map((l: any, idx: number) => {
              if (!l) return null;
              if (typeof l === "string") {
                return { id: l, name: `Location ${idx + 1}`, city: "Bengaluru" };
              }
              return {
                id: l.id || `LOC-00${idx + 1}`,
                name: l.name || "Studio Branch",
                city: l.city || "Bengaluru",
                ...(l.address ? { address: l.address } : {}),
              };
            })
            .filter(Boolean) as LocationInfo[]
        : [];

      const userRole = me.role || me.roles?.[0]?.name || me.roles?.[0]?.code || (me.is_superuser ? 'Super Admin' : 'Member');
      const isSuperAdminUser = (!me.tenant_id) && (me.is_superuser || userRole === 'Super Admin' || me.user_type === 'platform');
      const enabledModules = isSuperAdminUser
        ? null
        : (me.enabled_modules ?? []);

      const current = getCurrentUser();
      const newBranding = me.branding ?? (me as any).branding ?? null;
      const hasChanged =
        !current ||
        current.role !== userRole ||
        current.firstName !== me.first_name ||
        current.lastName !== me.last_name ||
        current.email !== me.email ||
        current.tenantName !== (me.tenant_name || '') ||
        JSON.stringify(current.roles) !== JSON.stringify(me.roles ?? []) ||
        JSON.stringify(current.permissions) !== JSON.stringify(me.permissions ?? []) ||
        JSON.stringify(current.enabledModules) !== JSON.stringify(enabledModules) ||
        JSON.stringify(current.branding) !== JSON.stringify(newBranding) ||
        JSON.stringify(current.locations) !== JSON.stringify(locations);

      if (hasChanged) {
        setUserProfile({
          role: userRole,
          roles: me.roles || [],
          permissions: me.permissions || [],
          userType: me.user_type || (isSuperAdminUser ? 'platform' : 'tenant'),
          isOrgWide: !!me.is_org_wide || isSuperAdminUser,
          firstName: me.first_name,
          lastName: me.last_name,
          email: me.email,
          tenantName: me.tenant_name || (isSuperAdminUser ? 'Global Platform HQ' : 'Tenant Organization'),
          locations,
          fullName,
          initials,
          branding: newBranding,
          // Enforce module access: null = unrestricted (super admin), list = tenant provisioned
          enabledModules,
        });

        // Update React state so all consumers (Sidebar, Shell, Nav) re-render immediately!
        const updatedUser = getCurrentUser();
        if (updatedUser) {
          setUser({ ...updatedUser });
        }
      }
    } catch {
      // /me/ failed (network, etc.) — still logged in, just missing profile details
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // ---------------------------------------------------------------
  // Real-time listeners: BroadcastChannel, Storage, CustomEvent, Focus & Visibility
  // ---------------------------------------------------------------
  React.useEffect(() => {
    // 1. BroadcastChannel for instant cross-tab sync in modern browsers
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("pos_auth_sync");
        bc.onmessage = (event) => {
          if (event?.data?.type === "TENANT_UPDATED") {
            void fetchAndSetProfile();
          }
        };
      }
    } catch {}

    // 2. CustomEvent for same-window updates
    function handleTenantModulesUpdated(event: any) {
      void fetchAndSetProfile();
    }
    window.addEventListener('tenant_modules_updated', handleTenantModulesUpdated);

    // 3. Storage event for multi-tab sync across normal tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "pos_last_tenant_update") {
        void fetchAndSetProfile();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Window focus & Tab visibility sync (essential for switching windows / incognito)
    const handleFocus = () => {
      const current = getCurrentUser();
      if (current && (!current.isSuperAdmin || current.isImpersonating)) {
        void fetchAndSetProfile();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const current = getCurrentUser();
        if (current && (!current.isSuperAdmin || current.isImpersonating)) {
          void fetchAndSetProfile();
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Safety background interval polling (every 15s) for tenant sessions
    // Real-time sync already happens via BroadcastChannel, storage, focus & visibility events
    const pollInterval = setInterval(() => {
      const current = getCurrentUser();
      if (current && (!current.isSuperAdmin || current.isImpersonating)) {
        void fetchAndSetProfile();
      }
    }, 15000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('tenant_modules_updated', handleTenantModulesUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [fetchAndSetProfile]);

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------

  /**
   * Called by the login page when the user submits the form.
   *
   * Sends email + password to the backend.
   * On success:
   *   - Backend returns an access token in the response body.
   *   - Backend sets the refresh token as an HttpOnly cookie (automatically).
   *   - We store the access token in memory and update the user state.
   *
   * On failure: Throws an error — the login page catches and shows the error message.
   */
  async function login(credentials: LoginCredentials): Promise<{ defaultRoute?: string; userType?: string }> {
    // CRITICAL: Purge any prior tenant query cache before establishing new session
    queryClient.clear();

    const id = (credentials.identifier || credentials.email || '').trim();
    const payload: Record<string, any> = {
      identifier: id,
      email: id, // compatibility
      password: credentials.password,
    };
    if (credentials.tenant_slug && credentials.tenant_slug.trim()) {
      payload.tenant_slug = credentials.tenant_slug.trim().toLowerCase();
    }
    const response = await api.post<LoginApiResponse & { default_route?: string; user_type?: string }>('/auth/login/', payload);
    setAccessToken(response.data.access);
    // Fetch full profile so name/locations are immediately available
    await fetchAndSetProfile();
    setUser(getCurrentUser());
    return {
      defaultRoute: response.data.default_route,
      userType: response.data.user_type,
    };
  }

  // ---------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------

  /**
   * Called when the user clicks "Sign Out".
   *
   * We tell the backend to invalidate the refresh token (RTR pattern).
   * Even if that call fails, we still clear the local state — the user is logged out.
   */
  async function logout(): Promise<void> {
    try {
      // Tell the backend to blacklist the refresh token cookie
      await api.post('/auth/logout/', {});
    } catch {
      // Backend call failed — still proceed with local logout
    } finally {
      // CRITICAL: Clear all TanStack Query cache to guarantee zero cross-tenant data leakage
      queryClient.clear();
      clearAccessToken();
      clearUserProfile();
      setUser(null);
      // Hard redirect to /login — clears in-memory token on page reload
      // and prevents the back button from returning to the dashboard.
      window.location.replace('/login');
    }
  }

  // ---------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------

  const value: AuthContextValue = {
    user,
    /**
     * isAuthenticated is derived from the in-memory token state.
     * We check the token expiry here — even if user state is set,
     * the token could theoretically have just expired.
     */
    isAuthenticated: isAuthenticated(),
    isLoading,
    login,
    logout,
    refreshUserProfile: fetchAndSetProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// -----------------------------------------------------------------
// Custom Hook
// -----------------------------------------------------------------

/**
 * useAuth — The hook every component uses to access auth state.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 * Throws if used outside of AuthProvider (which means something is wired wrong).
 */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (ctx === null) {
    throw new Error(
      '[auth-context] useAuth() was called outside of <AuthProvider>. ' +
      'Make sure AuthProvider wraps the app in __root.tsx.',
    );
  }
  return ctx;
}
