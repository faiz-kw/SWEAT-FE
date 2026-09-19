/**
 * src/lib/permissions.ts — Centralized Frontend RBAC Permission Engine
 * Fast / Zero Role Hardcoding / Fail-Closed
 *
 * Provides central permission checking across:
 * - Navigation & Sidebar filtering
 * - Route guards & direct URL access
 * - Tab visibility & default tab selection
 * - Action buttons (Create, Edit, Delete, Custom actions)
 * - Data fetching enablement
 */

import { useAuth } from '@/contexts';
import type { AuthUser } from '@/services';

/**
 * Pure evaluation function for permission code matching.
 *
 * Rules:
 * 1. If no permissionCode requested -> true
 * 2. If user is null/undefined or loading -> false (Fail-closed)
 * 3. If user.isSuperAdmin -> true
 * 4. If user.permissions has '*' -> true
 * 5. If user.permissions has exact code -> true
 * 6. If user.permissions has wildcard prefix (e.g. 'ops.*' or 'ops.trainers.*') -> true
 */
export function hasPermission(
  user: AuthUser | null | undefined,
  permissionCode?: string | null
): boolean {
  if (!permissionCode) return true;
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const perms = user.permissions || [];
  if (perms.length === 0) return false;
  if (perms.includes('*')) return true;

  const target = permissionCode.toLowerCase().trim();

  return perms.some((p) => {
    const perm = p.toLowerCase().trim();
    if (perm === target || perm === '*') return true;
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2);
      if (target.startsWith(prefix)) return true;
    }
    return false;
  });
}

/**
 * Checks if the user has AT LEAST ONE of the provided permissions.
 */
export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissionCodes?: (string | null | undefined)[]
): boolean {
  if (!permissionCodes || permissionCodes.length === 0) return true;
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const validCodes = permissionCodes.filter((c): c is string => Boolean(c));
  if (validCodes.length === 0) return true;

  return validCodes.some((code) => hasPermission(user, code));
}

/**
 * Checks if the user has ALL of the provided permissions.
 */
export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissionCodes?: (string | null | undefined)[]
): boolean {
  if (!permissionCodes || permissionCodes.length === 0) return true;
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const validCodes = permissionCodes.filter((c): c is string => Boolean(c));
  if (validCodes.length === 0) return true;

  return validCodes.every((code) => hasPermission(user, code));
}

/**
 * React Hook providing permission helpers bound to the active authentication session.
 */
export function usePermissions() {
  const { user, isLoading, refreshUserProfile } = useAuth();

  const can = (permissionCode?: string | null): boolean => {
    if (isLoading) return false;
    return hasPermission(user, permissionCode);
  };

  const canAny = (permissionCodes?: (string | null | undefined)[]): boolean => {
    if (isLoading) return false;
    return hasAnyPermission(user, permissionCodes);
  };

  const canAll = (permissionCodes?: (string | null | undefined)[]): boolean => {
    if (isLoading) return false;
    return hasAllPermissions(user, permissionCodes);
  };

  return {
    can,
    canAny,
    canAll,
    user,
    isLoading,
    permissions: user?.permissions || [],
    isSuperAdmin: Boolean(user?.isSuperAdmin || (user?.userType === 'platform' && !user?.tenantId)),
    refreshPermissions: refreshUserProfile,
  };
}
