/**
 * login.tsx — Login Page Route (Phase 0 · Foundation)
 *
 * This is the entry point of the app for unauthenticated users.
 * If you are not logged in and try to visit any page, the _shell.tsx guard
 * will redirect you here.
 *
 * WHAT THIS FILE DOES
 * -------------------
 * 1. Renders a clean enterprise login form (email + password).
 * 2. Calls useAuth().login() when the form is submitted.
 * 3. On success: navigates to the dashboard ("/").
 * 4. On failure: shows the error message from the backend.
 *
 * IMPORTANT: If the user is already authenticated (has a valid token),
 * the beforeLoad guard redirects them away from /login to the dashboard.
 * Nobody should see the login page if they are already logged in.
 */

import * as React from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
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
      { name: 'description', content: 'Sign in to PerformanceOS Admin' },
      { name: 'robots', content: 'noindex, nofollow' }, // login page should not be indexed
    ],
  }),
});

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

  // Form state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // UI state
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * Handle form submission.
   *
   * Flow:
   *   1. Prevent the default browser form submit (which would reload the page).
   *   2. Clear any previous error message.
   *   3. Call login() from the auth context — this calls the backend.
   *   4. On success: navigate to the dashboard.
   *   5. On failure: show the error message.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      // Login successful — navigate to the dashboard
      await router.navigate({ to: '/' });
    } catch (err) {
      // Show the error message to the user
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid email or password. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Full-screen centered layout with ambient glow
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      {/* Subtle radial ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[400px] rounded-full bg-accent/20 blur-[100px]" />

      <div className="relative z-10 w-full max-w-[390px] animate-in fade-in zoom-in-95 duration-300">

        {/* ── Brand header ── */}
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

        {/* ── Login card ── */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-6 shadow-xl shadow-black/5">

          {/* Card header */}
          <div className="pb-4">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Enter your staff or admin credentials to access your fitness center command center.
            </p>
          </div>

          <Separator className="my-3 opacity-60" />

          {/* Card body — the form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">

            {/* Email / Username field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Email Address or Username
              </Label>
              <Input
                id="login-email"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="admin or admin@yourgym.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Password field with Show/Hide Eye Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="login-password"
                  className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
              </div>
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

            {/* Error message — shown only when login fails */}
            {error !== null && (
              <div
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
              {isSubmitting ? 'Authenticating…' : 'Sign in to Console'}
            </Button>

          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          PerformanceOS Enterprise · Protected by Token RTR Security
        </p>

      </div>
    </div>
  );
}

