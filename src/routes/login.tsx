/**
 * login.tsx — Universal Authentication Route
 *
 * Universal / Unified Login for all user roles:
 * Platform Super Admin, Platform Users, Tenant Org Admin, Branch Manager,
 * Trainer, Sales Staff, Front Desk, Member / End User.
 *
 * Supports two authentication pathways:
 * 1. Password Login (Default for Staff & Admins)
 * 2. WhatsApp OTP Login (Fast passwordless login for Members & Mobile Apps via Gupshup BpcUAT)
 *
 * Branding is fully dynamic — fetched from /api/v1/auth/branding/
 * so white-label tenants see their own logo, colors, and name.
 */

import * as React from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2, Building2, KeyRound, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { isAuthenticated } from '@/services';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { fetchPublicBrandingApi, type PublicBrandingData } from '@/api/endpoints/api-platform';
import { cn } from '@/lib/utils';

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
  const { login, loginWithOtp, sendOtp, isAuthenticated: isAuth, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && isAuth) {
      void router.navigate({ to: '/' });
    }
  }, [isLoading, isAuth, router]);

  // Auth Mode: 'password' vs 'otp'
  const [authMode, setAuthMode] = React.useState<'password' | 'otp'>('password');

  // Form inputs (Password flow)
  const [identifier, setIdentifier] = React.useState('');
  const [organizationCode, setOrganizationCode] = React.useState('');
  const [acknowledgment, setAcknowledgment] = React.useState<string | null>(null);
  const organizationInput = React.useRef<HTMLInputElement>(null);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // Form inputs (WhatsApp OTP flow)
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [otpSuccessMsg, setOtpSuccessMsg] = React.useState<string | null>(null);

  // UI state
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dynamic branding state
  const [branding, setBranding] = React.useState<PublicBrandingData>(DEFAULT_BRANDING);
  const [brandingLoading, setBrandingLoading] = React.useState(true);
  const [tenantBrandingFetched, setTenantBrandingFetched] = React.useState('');

  // Countdown timer for OTP resend
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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
          if (data.primary_color) {
            document.documentElement.style.setProperty('--primary', data.primary_color);
            document.documentElement.style.setProperty('--ring', data.primary_color);
          }
          if (data.accent_color) {
            document.documentElement.style.setProperty('--accent', data.accent_color);
          }
        })
        .catch(() => {
          setTenantBrandingFetched(slug);
        })
        .finally(() => setBrandingLoading(false));
    }, 600);

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

  // Submit Password Form
  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  // Request WhatsApp OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setOtpSuccessMsg(null);

    const clean = phoneNumber.replace(/\D/g, '').trim();
    if (!clean || clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendOtp(clean, organizationCode.trim() || undefined);
      if (res.success) {
        setOtpSent(true);
        setCountdown(res.retry_after_seconds || 60);
        setOtpSuccessMsg(res.message || 'OTP sent successfully to your WhatsApp!');
      } else {
        setError(res.message || 'Failed to send OTP. Please check your phone number.');
      }
    } catch (err: any) {
      const serverMsg =
        err?.data?.error || err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to send WhatsApp OTP.');
      setError(serverMsg);
    } finally {
      setIsSendingOtp(false);
    }
  }

  // Verify WhatsApp OTP
  async function handleVerifyOtp(codeToVerify?: string) {
    setError(null);
    setOtpSuccessMsg(null);
    const code = (codeToVerify || otpCode).trim();
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit OTP received on WhatsApp.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const clean = phoneNumber.replace(/\D/g, '').trim();
      const res = await loginWithOtp(clean, code, organizationCode.trim() || undefined);
      const targetRoute = res?.defaultRoute || '/';
      await router.navigate({ to: targetRoute as any });
    } catch (err: any) {
      const serverMsg =
        err?.data?.error || err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Invalid or expired OTP.');
      setError(serverMsg);
    } finally {
      setIsVerifyingOtp(false);
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

      {/* Background ambient lighting effects */}
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

      <div className="relative z-10 w-full max-w-[420px] mx-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Brand header */}
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
          <div className="pb-3 text-center sm:text-left">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {authMode === 'otp' ? 'Member Login' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {authMode === 'otp'
                ? 'Sign in instantly with a 6-digit WhatsApp verification code.'
                : isTenant
                  ? `Sign in to your ${appName} studio account.`
                  : `Sign in to your ${appName} account.`}
            </p>
          </div>

          {/* Auth Mode Toggle Pill */}
          <div className="flex rounded-xl bg-muted/60 p-1 mb-5 border border-border/50">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
                setOtpSuccessMsg(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                authMode === 'password'
                  ? "bg-surface text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KeyRound className="size-3.5" />
              <span>Staff / Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setError(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                authMode === 'otp'
                  ? "bg-surface text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="size-3.5 text-emerald-500" />
              <span>WhatsApp OTP</span>
            </button>
          </div>

          {/* Organization code (Shared for both methods) */}
          <div className="space-y-1.5 mb-4">
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
              placeholder="e.g. sweat"
              value={organizationCode}
              onChange={(e) => setOrganizationCode(e.target.value)}
              disabled={isSubmitting || isSendingOtp || isVerifyingOtp}
              aria-describedby="organization-help"
              className="h-10 text-[13.5px] rounded-lg bg-muted/30"
            />
            <p id="organization-help" className="text-[11px] text-muted-foreground">
              Defaults to active studio if left blank.
            </p>
          </div>

          {/* Error Banner */}
          {error !== null && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in duration-150"
            >
              {error}
            </div>
          )}

          {/* Success Banner */}
          {otpSuccessMsg !== null && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-150"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{otpSuccessMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASSWORD LOGIN FORM                                           */}
          {/* ============================================================ */}
          {authMode === 'password' && (
            <form
              onSubmit={(e) => void handlePasswordSubmit(e)}
              className="space-y-4"
              noValidate
              aria-label="Universal Login Form"
            >
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

              <Button
                id="login-submit-btn"
                type="submit"
                className="w-full h-10 font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
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
          )}

          {/* ============================================================ */}
          {/* WHATSAPP OTP LOGIN FORM                                       */}
          {/* ============================================================ */}
          {authMode === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                // Step 1: Phone number input & Send OTP button
                <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-phone" className="text-xs font-semibold text-foreground tracking-wide">
                      Mobile Number (WhatsApp)
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 items-center justify-center rounded-lg border border-input bg-muted/40 px-3 text-xs font-semibold text-muted-foreground select-none">
                        +91
                      </div>
                      <Input
                        id="login-phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoFocus
                        required
                        placeholder="9876543210"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="h-10 text-[13.5px] rounded-lg bg-muted/30 focus:bg-surface transition-all flex-1"
                        disabled={isSendingOtp}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      We'll send a 6-digit WhatsApp verification code to this number.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isSendingOtp || phoneNumber.length < 10}
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        <span>Sending WhatsApp OTP…</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="size-4" />
                        <span>Send WhatsApp Code</span>
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                // Step 2: 6-Digit OTP input & Verify
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        Enter 6-Digit WhatsApp OTP
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sent to <span className="font-semibold text-foreground">+91 {phoneNumber}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setError(null);
                        setOtpSuccessMsg(null);
                      }}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ArrowLeft className="size-3" />
                      <span>Edit Number</span>
                    </button>
                  </div>

                  {/* Input OTP Component */}
                  <div className="flex justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={(val) => setOtpCode(val)}
                      disabled={isVerifyingOtp}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                        <InputOTPSlot index={1} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                        <InputOTPSlot index={2} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                        <InputOTPSlot index={3} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                        <InputOTPSlot index={4} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                        <InputOTPSlot index={5} className="size-11 rounded-lg border text-base font-bold bg-muted/20" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Verify button */}
                  <Button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    className="w-full h-10 font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        <span>Verifying code…</span>
                      </>
                    ) : (
                      <span>Verify & Sign In</span>
                    )}
                  </Button>

                  {/* Resend cooldown */}
                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Resend code in <span className="font-semibold text-foreground">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSendOtp()}
                        disabled={isSendingOtp}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                      >
                        {isSendingOtp ? 'Sending…' : 'Resend OTP via WhatsApp'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/80 font-normal">
          {appName} Enterprise Security
        </p>
      </div>
    </main>
  );
}
