/**
 * login.tsx — Login Page Route (Sprint 1 Remediation)
 *
 * Provides dedicated tenant slug resolution and input flow:
 * 1. Derives tenant_slug from URL subdomain (e.g. cult-fit.performanceos.io) or query param (?tenant=slug).
 * 2. If not derived, offers explicit Tenant Staff login with required Organization Slug input.
 * 3. Provides clean toggle for Platform Super Admin login (Master DB without tenant slug).
 * 4. Fails closed with clear validation when tenant_slug is missing in tenant login.
 */

import * as React from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff, Building2, Shield } from 'lucide-react';
import { isAuthenticated } from '@/services';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/BrandLogo';

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
      { title: 'Sign In — PerformanceOS Admin' },
      { name: 'description', content: 'Sign in to PerformanceOS Fitness Command Center' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

// -----------------------------------------------------------------
// Helper: Derive tenant slug from URL / hostname
// -----------------------------------------------------------------

function getDerivedTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check URL query parameters (?tenant=slug or ?tenant_slug=slug or ?org=slug)
  try {
    const params = new URLSearchParams(window.location.search);
    const qTenant = params.get('tenant') || params.get('tenant_slug') || params.get('org');
    if (qTenant && qTenant.trim()) {
      return qTenant.trim().toLowerCase();
    }
  } catch {}

  // 2. Check hostname subdomain (e.g. cult-fit.performanceos.io or cult-fit.localhost)
  try {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const sub = parts[0]?.toLowerCase() ?? '';
        const reserved = ['www', 'app', 'admin', 'platform', 'api', 'stage', 'staging', 'dev'];
        if (sub && !reserved.includes(sub)) {
          return sub;
        }
      }
    }
  } catch {}

  return null;
}

// -----------------------------------------------------------------
// Login Page Component
// -----------------------------------------------------------------

function LoginPage() {
  const { login, isAuthenticated: isAuth, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && isAuth) {
      router.navigate({ to: '/' });
    }
  }, [isLoading, isAuth, router]);

  // Derived tenant slug from subdomain / query param
  const derivedSlug = React.useMemo(() => getDerivedTenantSlug(), []);

  // Login mode: 'tenant' (gym staff) vs 'platform' (super admin)
  const [loginMode, setLoginMode] = React.useState<'tenant' | 'platform'>(() =>
    derivedSlug ? 'tenant' : 'tenant'
  );

  // Form inputs
  const [tenantSlug, setTenantSlug] = React.useState(derivedSlug || '');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // UI state
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * Handle form submission with strict client-side validation.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email address or username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    const cleanSlug = (derivedSlug || tenantSlug).trim().toLowerCase();

    // In tenant login mode, tenant_slug is strictly required
    if (loginMode === 'tenant' && !cleanSlug) {
      setError('Organization slug is required. Enter your gym or organization identifier.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: cleanEmail,
        password,
        tenant_slug: loginMode === 'tenant' ? cleanSlug : undefined,
      });
      // Login successful — navigate to the dashboard
      await router.navigate({ to: '/' });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
      setError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      {/* Radial ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[400px] rounded-full bg-accent/20 blur-[100px]" />

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
        {/* Brand header */}
        <div className="mb-6 flex items-center justify-center gap-3 text-center sm:text-left sm:justify-start">
          <BrandLogo size={42} showStatusDot={false} />
          <div>
            <div className="text-base font-bold leading-tight tracking-tight text-foreground">
              PerformanceOS
            </div>
            <div className="text-xs text-muted-foreground">
              Fitness Command Center
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-6 shadow-xl shadow-black/5">
          {/* Card header */}
          <div className="pb-3">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {loginMode === 'tenant'
                ? 'Sign in with your organization slug and staff credentials.'
                : 'Sign in to the PerformanceOS Master Control Plane.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted/50 border border-border/50 text-xs font-medium my-2">
            <button
              id="mode-tenant-btn"
              type="button"
              onClick={() => {
                setLoginMode('tenant');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                loginMode === 'tenant'
                  ? 'bg-surface text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-3.5" />
              <span>Gym / Tenant</span>
            </button>
            <button
              id="mode-platform-btn"
              type="button"
              onClick={() => {
                setLoginMode('platform');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                loginMode === 'platform'
                  ? 'bg-surface text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="size-3.5" />
              <span>Platform Admin</span>
            </button>
          </div>

          <Separator className="my-3 opacity-60" />

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-1">
            {/* Organization Identifier field (only in Tenant mode) */}
            {loginMode === 'tenant' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="login-tenant-slug"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Organization Slug
                  </Label>
                  {derivedSlug && (
                    <span className="text-[10px] text-primary font-medium">
                      Auto-detected from URL
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="login-tenant-slug"
                    type="text"
                    required
                    placeholder="e.g. cult-fit or elevate-fitness"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                    className="h-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all font-mono"
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your dedicated gym brand identifier (e.g. <span className="font-semibold">cult-fit</span>).
                </p>
              </div>
            )}

            {/* Email / Username field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {loginMode === 'tenant' ? 'Staff Email' : 'Platform Admin Email'}
              </Label>
              <Input
                id="login-email"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder={
                  loginMode === 'tenant'
                    ? 'staff@cultfit.in'
                    : 'admin@performanceos.io'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Password field with Show/Hide Eye Toggle */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-password"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error !== null && (
              <div
                id="login-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in"
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              id="login-submit-btn"
              type="submit"
              className="w-full h-10 font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Authenticating…'
                : loginMode === 'tenant'
                ? 'Sign in to Organization'
                : 'Sign in to Platform HQ'}
            </Button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          PerformanceOS Enterprise · Protected by Multi-Tenant Fail-Closed Routing
        </p>
      </div>
    </div>
  );
}
