/**
 * login.tsx — Universal Authentication Route
 *
 * Universal / Unified Login for all user roles:
 * Platform Super Admin, Platform Users, Tenant Org Admin, Branch Manager,
 * Trainer, Sales Staff, Front Desk, Member / End User.
 *
 * Clean single-card UI requiring ONLY:
 * - Username or Email
 * - Password
 * - Sign in button
 *
 * Automatic server-side identity directory routing.
 */

import * as React from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { isAuthenticated } from '@/services';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      { title: 'Sign In — PerformanceOS' },
      { name: 'description', content: 'Sign in to your PerformanceOS account' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

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
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // UI state
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      });

      // Post-login automatic routing to the server-determined default workspace
      const targetRoute = res?.defaultRoute || '/';
      await router.navigate({ to: targetRoute as any });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Invalid username/email or password.');
      setError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 lg:px-8"
      role="main"
    >
      {/* Background ambient lighting effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-[360px] sm:size-[500px] rounded-full bg-primary/10 blur-[100px] sm:blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 size-[280px] sm:size-[420px] rounded-full bg-accent/15 blur-[90px] sm:blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-[400px] mx-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-3 mb-2">
            <BrandLogo size={42} showStatusDot={false} />
            <span className="text-xl font-bold tracking-tight text-foreground">
              PerformanceOS
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Fitness Command Center
          </p>
        </div>

        {/* Universal Login Card */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-6 sm:p-7 shadow-xl shadow-black/5">
          {/* Card header */}
          <div className="pb-4 text-center sm:text-left">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Sign in to your PerformanceOS account.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4 pt-1"
            noValidate
            aria-label="Universal Login Form"
          >
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
          PerformanceOS Enterprise Security
        </p>
      </div>
    </main>
  );
}
