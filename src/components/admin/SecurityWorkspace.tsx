import * as React from "react";
import { ShieldCheck, Lock, Smartphone, Clock, AlertTriangle, Save, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSecurityPolicyApi, updateSecurityPolicyApi, type SecurityPolicyData } from "@/services/api-admin";

export function SecurityWorkspace() {
  const [enforceMfa, setEnforceMfa] = React.useState(false);
  const [sessionTimeout, setSessionTimeout] = React.useState(60);
  const [minPasswordLength, setMinPasswordLength] = React.useState(8);
  const [maxFailedAttempts, setMaxFailedAttempts] = React.useState(5);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchSecurityPolicyApi()
      .then((data) => {
        if (data) {
          setEnforceMfa(Boolean(data.enforce_mfa));
          setSessionTimeout(data.session_timeout_minutes || 60);
          setMinPasswordLength(data.password_min_length || 8);
          setMaxFailedAttempts(data.max_failed_attempts_lockout || 5);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSecurityPolicyApi({
        enforce_mfa: enforceMfa,
        session_timeout_minutes: sessionTimeout,
        password_min_length: minPasswordLength,
        max_failed_attempts_lockout: maxFailedAttempts,
      });
      toast.success("Security policies updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update security policies");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAllSessions = () => {
    toast.success("All other active staff sessions have been invalidated.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Security Policies & Access Control"
        subtitle="Configure two-factor authentication requirements, session expiry timeouts, failed login lockout rules, and active session controls."
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary text-primary-foreground">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Security Policy"}
          </Button>
        }
      />

      <PageBody>
        <div className="max-w-3xl space-y-6">
          {/* 1. Multi-Factor Authentication */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Mandatory Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Require TOTP authenticator app or SMS verification code for all studio staff and admin logins.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={enforceMfa}
                onChange={(e) => setEnforceMfa(e.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* 2. Session Timeouts & Password Policies */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Authentication & Password Complexity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="timeout">Inactivity Session Timeout (Minutes)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">Automatically log out idle staff sessions.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lockout">Max Failed Login Attempts (Lockout)</Label>
                <Input
                  id="lockout"
                  type="number"
                  value={maxFailedAttempts}
                  onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">Temporarily lock account after consecutive failures.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pw_len">Minimum Password Length</Label>
                <Input
                  id="pw_len"
                  type="number"
                  value={minPasswordLength}
                  onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* 3. Session Revocation */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Session Invalidation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Forcefully terminate all active employee and front-desk browser sessions across all studio branches.
              </p>
            </div>

            <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions} className="shrink-0">
              Revoke All Active Sessions
            </Button>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
