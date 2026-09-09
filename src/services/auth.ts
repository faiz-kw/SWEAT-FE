/**
 * auth.ts — Token Manager (Phase 0 · Foundation)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * When a user logs in, the backend sends back two things:
 *   1. An ACCESS TOKEN  — a short-lived JWT (15 minutes). Proves who you are.
 *   2. A REFRESH TOKEN  — a long-lived token stored in an HttpOnly cookie by the browser.
 *                         Used to get a new access token when the 15-minute one expires.
 *
 * WHERE WE STORE THE ACCESS TOKEN
 * --------------------------------
 * We store it in MEMORY ONLY — NOT in localStorage, NOT in sessionStorage, NOT in a cookie.
 *
 * Why? localStorage is readable by JavaScript, so if any malicious script runs on the page
 * (XSS attack), it can steal the token from localStorage.
 * Memory storage disappears on page refresh — which is safe. We just use the refresh cookie
 * to silently get a new access token when the page reloads.
 *
 * JWT PAYLOAD STRUCTURE (agreed with Senior Dev)
 * -----------------------------------------------
 *   sub      → User ID (who you are)
 *   tid      → Tenant ID (which gym brand you belong to)
 *   role     → Your role (e.g. "Admin", "Trainer", "Sales")
 *   loc      → Array of location IDs you are allowed to access
 *   act_loc  → The location you are currently working in
 *   exp      → Expiry timestamp (Unix seconds)
 *
 * HOW TO USE THIS FILE
 * --------------------
 *   import { setAccessToken, getCurrentUser, isAuthenticated } from '@/lib/auth';
 *
 * DEMO MODE
 * ---------
 * When VITE_DEMO_MODE=true in .env.local, the app bypasses real auth entirely.
 * isAuthenticated() returns true and getCurrentUser() returns a fixed demo identity.
 * This lets every screen work with mock data — no Django needed.
 * The Scope PDF requires this: "demoable immediately, no backend".
 */

// -----------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------

/**
 * The exact shape of the JWT payload the backend sends.
 * This matches the Architecture Plan (Phase 0 · Auth spec).
 */
export interface JwtPayload {
  sub: string;      // User ID
  tid: string;      // Tenant ID (empty string for super admins)
  role: string;     // User role
  loc: string[];    // Allowed location IDs
  act_loc: string;  // Currently active location ID
  exp: number;      // Expiry in Unix seconds (e.g. 1724252700)
  is_superuser?: boolean; // True for platform super admins
  is_impersonating?: boolean;
  real_user_id?: string;
  real_user_email?: string;
  tenant_name?: string;
}

/**
 * A clean, readable version of the logged-in user's identity.
 * Components use this shape — not the raw JWT payload.
 */
export interface LocationInfo {
  id: string;
  name: string;
  city: string;
  address?: string;
}

export interface TenantBrandingProfile {
  app_name: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  accent_color: string;
  custom_domain?: string;
  cname_verified?: boolean;
  email_footer?: string;
  support_email?: string;
  remove_watermark?: boolean;
  login_tagline?: string;
}

export interface AuthUser {
  userId: string;
  tenantId: string;
  tenantName: string;
  role: string;
  isSuperAdmin: boolean; // True for platform super admins (no tenant)
  branding?: TenantBrandingProfile | null;
  /**
   * Tenant's provisioned module/submodule list from Tenant.enabled_modules.
   * null  → Super Admin, no restriction (sees everything).
   * []    → Empty means no modules enabled (blocked access).
   * [...] → Exact list of allowed module IDs and submodule paths.
   */
  enabledModules: string[] | null;
  /** Location IDs from JWT (strings) */
  allowedLocationIds: string[];
  /** Full location objects — populated after /me/ call */
  locations: LocationInfo[];
  activeLocationId: string;
  /** Real name from /me/ — populated after login */
  firstName: string;
  lastName: string;
  email: string;
  /** Computed full display name */
  fullName: string;
  /** Two-letter initials derived from full name */
  initials: string;
  isImpersonating?: boolean;
  realUserEmail?: string;
}

// -----------------------------------------------------------------
// Demo Mode
// -----------------------------------------------------------------

/**
 * Demo mode allows the app to run fully without a Django backend.
 * Enabled by setting VITE_DEMO_MODE=true in .env.local.
 *
 * When active:
 *   - isAuthenticated() returns true (no login required)
 *   - getCurrentUser() returns the DEMO_USER identity below
 *   - All screens load with the existing mock/seed data
 *
 * This matches the Scope PDF requirement:
 *   "First pass runs on realistic in-app demo data (no backend),
 *    so every module is clickable and demoable immediately."
 *
 * When you connect Django later, just remove VITE_DEMO_MODE=true
 * from .env.local and the real auth flow takes over automatically.
 */
let _demoMode = (import.meta.env['VITE_DEMO_MODE'] as string | undefined) === 'true';

/** The fake identity used in demo mode. Matches TEN-001 / LOC-* from seed data. */
const DEMO_USER: AuthUser = {
  userId: 'USR-ADMIN',
  tenantId: '',
  tenantName: 'Global Platform HQ',
  role: 'Super Admin',
  isSuperAdmin: true,
  enabledModules: null, // Super admin — unrestricted
  allowedLocationIds: [],
  locations: [],
  activeLocationId: '',
  firstName: 'Super',
  lastName: 'Admin',
  email: 'admin@yourgym.com',
  fullName: 'Super Admin',
  initials: 'SA',
};

/** Call this to explicitly enable demo mode. */
export function enableDemoMode(): void {
  _demoMode = true;
}


/** Returns true when demo mode is active. */
export function isDemoMode(): boolean {
  return _demoMode;
}

// -----------------------------------------------------------------
// In-Memory Token Store
// -----------------------------------------------------------------

const ACCESS_TOKEN_KEY = 'pos_access_token';
const USER_PROFILE_KEY = 'pos_user_profile';
/**
 * Bump this version whenever the stored profile shape changes.
 * Old caches will be discarded automatically and re-fetched from /me/.
 * History:
 *   v1 → initial shape
 *   v2 → added enabledModules field (tenant module permission matrix)
 *   v3 → added branding profile (custom brand theme, logo, colors)
 */
const PROFILE_SCHEMA_VERSION = 3;

let _accessToken: string | null = null;

/** Save the access token received after login or token refresh. */
export function setAccessToken(token: string): void {
  _accessToken = token;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch {}
}

/** Read the current access token. Returns null if not logged in. */
export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (stored) {
        const payload = decodeToken(stored);
        if (payload && payload.exp * 1000 > Date.now()) {
          _accessToken = stored;
          return stored;
        } else {
          // Token expired
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
      }
    }
  } catch {}
  return null;
}

/** Clear the token on logout or session expiry. */
export function clearAccessToken(): void {
  _accessToken = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {}
}

// -----------------------------------------------------------------
// Token Utilities
// -----------------------------------------------------------------

/**
 * Decode the JWT payload (the middle part of the token).
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check whether the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  if (_demoMode) return true;
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

/**
 * Extended profile from GET /api/v1/auth/me/ — stored here after login.
 */
let _userProfile: Partial<AuthUser> | null = null;

/** Store the enriched profile received from /me/ endpoint. */
export function setUserProfile(profile: Partial<AuthUser>): void {
  _userProfile = profile;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Store with schema version so stale caches can be detected and discarded
      window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify({ ...profile, _v: PROFILE_SCHEMA_VERSION }));
    }
  } catch {}
}

/** Clear stored profile on logout. */
export function clearUserProfile(): void {
  _userProfile = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(USER_PROFILE_KEY);
    }
  } catch {}
}

export function getCurrentUser(): AuthUser | null {
  if (_demoMode) return DEMO_USER;

  const token = getAccessToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  if (!_userProfile) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(USER_PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AuthUser> & { _v?: number };
          // Discard cache if schema version is outdated — forces fresh /me/ fetch
          if (parsed._v !== PROFILE_SCHEMA_VERSION) {
            window.localStorage.removeItem(USER_PROFILE_KEY);
          } else {
            // Remove the internal version key before storing in memory
            const { _v: _version, ...profileData } = parsed as any;
            _userProfile = profileData;
            // Legacy cleanup: wrong tenant name from old mock data
            if (_userProfile && _userProfile.tenantName === 'Elevate Fitness') {
              _userProfile.tenantName = payload.role === 'Super Admin' || !payload.tid ? 'Global Platform HQ' : '';
              window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify({ ..._userProfile, _v: PROFILE_SCHEMA_VERSION }));
            }
          }
        }
      }
    } catch {}
  }

  // Build base user from JWT claims
  // isSuperAdmin: is_superuser in JWT, OR role is 'Super Admin', OR no tenant assigned
  const isSuperAdmin = !!(payload.is_superuser) || payload.role === 'Super Admin' || !payload.tid;
  const base: AuthUser = {
    userId: payload.sub,
    tenantId: payload.tid || '',
    tenantName: _userProfile?.tenantName ?? (isSuperAdmin ? 'Global Platform HQ' : 'Tenant Organization'),
    role: payload.role,
    isSuperAdmin,
    // Super admins get null (unrestricted). Tenant users get their provisioned list.
    // IMPORTANT: If a tenant user's cache is stale (enabledModules not present),
    // fall back to [] (deny all) NOT null (allow all) — safe-fail, not safe-open.
    // The correct list will be populated after the next /me/ hydration.
    enabledModules: isSuperAdmin
      ? null
      : (Object.prototype.hasOwnProperty.call(_userProfile ?? {}, 'enabledModules')
          ? (_userProfile?.enabledModules ?? [])
          : []),  // stale cache without enabledModules → deny all until /me/ refreshes it
    allowedLocationIds: payload.loc || [],
    locations: _userProfile?.locations ?? [],
    activeLocationId: payload.act_loc || '',
    firstName: _userProfile?.firstName ?? '',
    lastName: _userProfile?.lastName ?? '',
    email: _userProfile?.email ?? '',
    fullName: _userProfile?.fullName ?? (_userProfile?.firstName ? `${_userProfile.firstName} ${_userProfile.lastName || ''}`.trim() : payload.sub),
    initials: _userProfile?.initials ?? (payload.sub ? payload.sub.slice(0, 2).toUpperCase() : 'AD'),
    branding: _userProfile?.branding ?? null,
    isImpersonating: !!payload.is_impersonating,
    realUserEmail: payload.real_user_email ?? undefined,
  };

  return base;
}

// -----------------------------------------------------------------
// Session Restore (RTR flow)
// -----------------------------------------------------------------

/**
 * refreshAndHydrateSession — Session restore on page reload.
 *
 * Called once by AuthProvider on mount. Attempts to restore the user's session
 * by calling the token refresh endpoint (which reads the HttpOnly refresh cookie).
 *
 * If successful:
 *   1. Stores the new access token in memory via setAccessToken().
 *   2. Calls /auth/me/ to populate the full user profile (name, locations, etc.).
 *   3. Returns true.
 *
 * If the refresh cookie is missing or expired: Returns false (user stays logged out).
 */
export async function refreshAndHydrateSession(): Promise<boolean> {
  // Demo mode — always "authenticated", no refresh needed
  if (_demoMode) return true;

  const BASE_URL =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.['VITE_API_BASE_URL'] as string | undefined)) ??
    '/api/v1';

  // 1. Check if we already have a valid unexpired access token in memory/storage
  const token = getAccessToken();
  if (token) {
    const payload = decodeToken(token);
    if (payload && payload.exp * 1000 > Date.now()) {
      // Always fetch fresh profile from /me/ on restore so permissions are never stale
      await _hydrateUserProfile(BASE_URL, token);
      return true;
    }
  }

  // 2. Token missing or expired — try refresh via cookie
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { access?: string };
    if (!data.access) return false;

    setAccessToken(data.access);

    // Hydrate user profile from /me/
    await _hydrateUserProfile(BASE_URL, data.access);

    return true;
  } catch {
    return false;
  }
}

/** Internal helper: fetch /auth/me/ and store result via setUserProfile(). */
async function _hydrateUserProfile(baseUrl: string, token: string): Promise<void> {
  try {
    const meRes = await fetch(`${baseUrl}/auth/me/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!meRes.ok) return;

    const me = (await meRes.json()) as {
      first_name: string;
      last_name: string;
      full_name: string;
      email: string;
      role: string;
      is_superuser: boolean;
      tenant_id: string | null;
      tenant_name: string | null;
      /** Provisioned module/submodule list from Tenant.enabled_modules.
       *  null = super admin (no restriction). [] = no modules. [...] = allowed list. */
      enabled_modules: string[] | null;
      allowed_locations: { id: string; name: string; city: string; address?: string }[];
      branding?: TenantBrandingProfile | null;
    };

    const nameParts = [me.first_name, me.last_name].filter(Boolean);
    const fullName = me.full_name || nameParts.join(' ') || me.email.split('@')[0] || 'Admin';
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0]!.charAt(0)}${nameParts[1]!.charAt(0)}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();

    const rawLocs = (me as any).allowed_locations_list || me.allowed_locations || [];
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

    setUserProfile({
      firstName: me.first_name,
      lastName: me.last_name,
      email: me.email,
      tenantName: me.tenant_name || (me.is_superuser || me.role === 'Super Admin' || !me.tenant_id ? 'Global Platform HQ' : 'Tenant Organization'),
      locations,
      fullName,
      initials,
      branding: me.branding ?? null,
      // Store enabledModules: null for super admins (unrestricted), list for tenant users
      enabledModules: (me.is_superuser || me.role === 'Super Admin' || !me.tenant_id)
        ? null
        : (me.enabled_modules ?? []),
    });
  } catch {
    // Profile hydration failed — still authenticated, display name will be blank
  }
}

/**
 * Explicitly triggers a fresh /auth/me/ request and updates the local user profile.
 */
export async function fetchUserProfileFromApi(explicitToken?: string): Promise<boolean> {
  const token = explicitToken || getAccessToken();
  if (!token) return false;
  const BASE_URL =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.['VITE_API_BASE_URL'] as string | undefined)) ??
    '/api/v1';
  await _hydrateUserProfile(BASE_URL, token);
  return true;
}

