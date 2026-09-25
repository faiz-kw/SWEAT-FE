/**
 * login.tsx — Universal Authentication Route
 *
 * Universal / Unified Login for all user roles:
 * Platform Super Admin, Platform Users, Tenant Org Admin, Branch Manager,
 * Trainer, Sales Staff, Front Desk, Member / End User.
 *
 * Single login form with an organization code for tenant access:
 * - Username or Email
 * - Password
 * - Sign in button
 *
 * Blank organization code is reserved for platform superadmins.
 *
 * Branding is fully dynamic — fetched from /api/v1/auth/branding/
 * so white-label tenants see their own logo, colors, and name.
 */

import * as React from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { isAuthenticated } from '@/services';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { fetchPublicBrandingApi, type PublicBrandingData } from '@/api/endpoints/api-platform';

// Route definition for /login
export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [
      { title: 'Sign In — PerformanceOS' },
      { name: 'description', content: 'Sign in to your PerformanceOS account' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

// Default fallback branding (platform-level)
const DEFAULT_BRANDING: PublicBrandingData = {
  type: 'platform',
  app_name: 'PerformanceOS',
  brand_name: 'PerformanceOS',
  primary_color: '#0f766e',
  accent_color: '#2dd4bf',
  logo_url: '',
  favicon_url: '',
  login_tagline: 'Enterprise Operating System for Modern Athletic Franchises',
  support_email: '',
};

function LoginPage() {
  const { login, isAuthenticated: isAuth, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && isAuth) {
      void router.navigate({ to: '/' });
    }
  }, [isLoading, isAuth, router]);

  // Form inputs
  const [identifier, setIdentifier] = React.useState('');
  const [organizationCode, setOrganizationCode] = React.useState('');
  const [acknowledgment, setAcknowledgment] = React.useState<string | null>(null);
  const organizationInput = React.useRef<HTMLInputElement>(null);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // UI state
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dynamic branding state
  const [branding, setBranding] = React.useState<PublicBrandingData>(DEFAULT_BRANDING);
  const [brandingLoading, setBrandingLoading] = React.useState(true);
  const [tenantBrandingFetched, setTenantBrandingFetched] = React.useState('');

  // Load platform-level branding on mount
  React.useEffect(() => {
    let cancelled = false;
    fetchPublicBrandingApi()
      .then((data) => {
        if (!cancelled) setBranding(data);
      })
      .catch(() => {
        // silently fall back to defaults
      })
      .finally(() => {
        if (!cancelled) setBrandingLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // When user types an organization code, debounce-fetch that tenant's branding
  React.useEffect(() => {
    const slug = organizationCode.trim().toLowerCase();
    if (!slug) {
      // Revert to platform branding when org code is cleared
      if (tenantBrandingFetched) {
        setBrandingLoading(true);
        fetchPublicBrandingApi()
          .then((data) => setBranding(data))
          .catch(() => setBranding(DEFAULT_BRANDING))
          .finally(() => setBrandingLoading(false));
        setTenantBrandingFetched('');
      }
      return;
    }
    if (slug === tenantBrandingFetched) return;

    const timer = setTimeout(() => {
      setBrandingLoading(true);
      fetchPublicBrandingApi(slug)
        .then((data) => {
          setBranding(data);
          setTenantBrandingFetched(slug);
          // Apply tenant colors to CSS for live preview
          if (data.primary_color) {
            document.documentElement.style.setProperty('--primary', data.primary_color);
            document.documentElement.style.setProperty('--ring', data.primary_color);
          }
          if (data.accent_color) {
            document.documentElement.style.setProperty('--accent', data.accent_color);
          }
        })
        .catch(() => {
          // Org code not found — silently stay on current branding
          setTenantBrandingFetched(slug); // mark as attempted so we don't retry
        })
        .finally(() => setBrandingLoading(false));
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [organizationCode, tenantBrandingFetched]);

  // Apply platform branding colors to CSS on load
  React.useEffect(() => {
    if (branding.primary_color && branding.type === 'platform') {
      document.documentElement.style.setProperty('--primary', branding.primary_color);
      document.documentElement.style.setProperty('--ring', branding.primary_color);
    }
    if (branding.accent_color && branding.type === 'platform') {
      document.documentElement.style.setProperty('--accent', branding.accent_color);
    }
  }, [branding.primary_color, branding.accent_color, branding.type]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Username/Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({
        identifier: cleanIdentifier,
        password,
        tenant_slug: organizationCode.trim().toLowerCase(),
      });

      // Post-login automatic routing to the server-determined default workspace
      const targetRoute = res?.defaultRoute || '/';
      await router.navigate({ to: targetRoute as any });
    } catch (err: any) {
      const serverMsg =
        err?.data?.error || err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Invalid username/email or password.');
      if ((err?.data?.code || err?.response?.data?.code) === 'organization_required') {
        setAcknowledgment(serverMsg);
      } else {
        setError(serverMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const appName = branding.app_name || 'PerformanceOS';
  const primaryColor = branding.primary_color || '#0f766e';
  const accentColor = branding.accent_color || '#2dd4bf';
  const loginTagline = branding.login_tagline || 'Enterprise Operating System for Modern Athletic Franchises';
  const logoUrl = branding.logo_url || '';
  const isTenant = branding.type === 'tenant';

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 lg:px-8"
      role="main"
    >
      <AlertDialog open={acknowledgment !== null} onOpenChange={(open) => { if (!open) setAcknowledgment(null); }}>
        <AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); organizationInput.current?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Organization code required</AlertDialogTitle>
            <AlertDialogDescription>{acknowledgment}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAcknowledgment(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Background ambient lighting effects — uses dynamic brand colors */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-[360px] sm:size-[500px] rounded-full blur-[100px] sm:blur-[140px] transition-colors duration-700"
        style={{ backgroundColor: `${primaryColor}1a` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 size-[280px] sm:size-[420px] rounded-full blur-[90px] sm:blur-[120px] transition-colors duration-700"
        style={{ backgroundColor: `${accentColor}26` }}
      />

      <div className="relative z-10 w-full max-w-[400px] mx-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand header — fully dynamic */}
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-3 mb-2">
            {logoUrl ? (
              <div
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10 border border-white/10 overflow-hidden transition-transform duration-200 hover:scale-105"
                style={{ borderColor: primaryColor }}
              >
                <img
                  src={logoUrl}
                  alt={`${appName} logo`}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback to BrandLogo if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <BrandLogo
                size={42}
                showStatusDot={false}
                primaryColor={primaryColor}
                accentColor={accentColor}
              />
            )}
            <span className="text-xl font-bold tracking-tight text-foreground transition-all duration-500">
              {brandingLoading ? (
                <span className="inline-block h-5 w-32 animate-pulse rounded bg-muted" />
              ) : appName}
            </span>
          </div>

          {/* Tenant indicator badge */}
          {isTenant && branding.tenant_slug && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/10 transition-all duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="size-3" aria-hidden="true" />
              <span>{branding.tenant_slug.toUpperCase()}</span>
            </div>
          )}

          {/* Dynamic tagline */}
          {!isTenant && (
            <p className="text-xs text-muted-foreground font-medium mt-0.5 transition-all duration-500">
              {brandingLoading ? (
                <span className="inline-block h-3 w-40 animate-pulse rounded bg-muted" />
              ) : loginTagline}
            </p>
          )}
        </div>

        {/* Universal Login Card */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-6 sm:p-7 shadow-xl shadow-black/5">
          {/* Card header */}
          <div className="pb-4 text-center sm:text-left">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {isTenant
                ? `Sign in to ${appName}.`
                : `Sign in to your ${appName} account.`}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4 pt-1"
            noValidate
            aria-label="Universal Login Form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-organization" className="text-xs font-semibold">
                Organization code
              </Label>
              <Input
                ref={organizationInput}
                id="login-organization"
                name="organization"
                autoComplete="organization"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Enter your gym's organization code"
                value={organizationCode}
                onChange={(e) => setOrganizationCode(e.target.value)}
                disabled={isSubmitting}
                aria-describedby="organization-help"
                className="h-10 text-[13.5px] rounded-lg bg-muted/30"
              />
              <p id="organization-help" className="text-xs text-muted-foreground">
                Required for gym accounts. Platform superadmins can leave this blank.
              </p>
            </div>

            {/* Username or Email field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-identifier"
                className="text-xs font-semibold text-foreground tracking-wide"
              >
                Username or email
              </Label>
              <Input
                id="login-identifier"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="name@example.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={error !== null}
              />
            </div>

            {/* Password field with Show/Hide Eye Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-foreground tracking-wide"
                >
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all font-sans"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={error !== null}
                />
                <button
                  type="button"
                  id="password-visibility-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5 transition-colors cursor-pointer"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Accessible error message banner */}
            {error !== null && (
              <div
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in duration-150"
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              id="login-submit-btn"
              type="submit"
              className="w-full h-10 font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/80 font-normal">
          {appName} Enterprise Security
        </p>
      </div>
    </main>
  );
}
