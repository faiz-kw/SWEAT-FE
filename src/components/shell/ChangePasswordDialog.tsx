/**
 * ChangePasswordDialog.tsx
 *
 * A polished modal for changing the logged-in user's password directly
 * from the frontend — no Django admin panel required.
 *
 * Features:
 *   - Current password verification (backend checks it)
 *   - New password + confirm password fields with show/hide toggles
 *   - Real-time password strength indicator (Weak / Fair / Strong)
 *   - Live "passwords match" feedback
 *   - Success state with auto-close after 2 s
 *   - Full error display from backend
 */

import * as React from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '@/services';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ── Password strength helper ──────────────────────────────────────────────────

function getStrength(pw: string): { level: 'weak' | 'fair' | 'strong'; score: number } {
  if (!pw) return { level: 'weak', score: 0 };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 'weak',   score };
  if (score <= 3) return { level: 'fair',   score };
  return             { level: 'strong', score };
}

const STRENGTH_CONFIG = {
  weak:   { label: 'Weak',   color: 'bg-destructive',        width: 'w-1/3',  text: 'text-destructive' },
  fair:   { label: 'Fair',   color: 'bg-amber-500',          width: 'w-2/3',  text: 'text-amber-500'   },
  strong: { label: 'Strong', color: 'bg-emerald-500',        width: 'w-full', text: 'text-emerald-500' },
};

// ── ShowHide button ───────────────────────────────────────────────────────────

function ShowHide({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent]     = React.useState('');
  const [newPw, setNewPw]         = React.useState('');
  const [confirm, setConfirm]     = React.useState('');

  const [showCurrent, setShowCurrent]   = React.useState(false);
  const [showNew, setShowNew]           = React.useState(false);
  const [showConfirm, setShowConfirm]   = React.useState(false);

  const [error, setError]       = React.useState<string | null>(null);
  const [success, setSuccess]   = React.useState(false);
  const [loading, setLoading]   = React.useState(false);

  // Reset state whenever dialog opens
  React.useEffect(() => {
    if (open) {
      setCurrent(''); setNewPw(''); setConfirm('');
      setShowCurrent(false); setShowNew(false); setShowConfirm(false);
      setError(null); setSuccess(false); setLoading(false);
    }
  }, [open]);

  // Auto-close after success
  React.useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => onOpenChange(false), 2000);
    return () => clearTimeout(timer);
  }, [success, onOpenChange]);

  const strength = getStrength(newPw);
  const strengthCfg = STRENGTH_CONFIG[strength.level];
  const matches = newPw.length > 0 && confirm.length > 0 && newPw === confirm;
  const mismatch = confirm.length > 0 && newPw !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!current) { setError('Please enter your current password.'); return; }
    if (newPw.length < 3) { setError('New password must be at least 3 characters.'); return; }
    if (newPw !== confirm) { setError('New passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post<{ detail: string }>('/auth/change-password/', {
        current_password: current,
        new_password: newPw,
        confirm_password: confirm,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold tracking-tight">
                Change Password
              </DialogTitle>
              <DialogDescription className="text-[12px] mt-0.5">
                Update your login credentials below.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Success State ── */}
        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 animate-in zoom-in-50 duration-300">
              <ShieldCheck className="size-7 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-foreground">Password changed!</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Closing automatically…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="px-6 py-5 space-y-4">

              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-current" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="cp-current"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    autoFocus
                    required
                    placeholder="Your current password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    disabled={loading}
                    className="h-9.5 pr-10 text-[13px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                  />
                  <ShowHide show={showCurrent} toggle={() => setShowCurrent(!showCurrent)} />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-new" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="cp-new"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Choose a new password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    disabled={loading}
                    className="h-9.5 pr-10 text-[13px] rounded-lg bg-muted/30 focus:bg-surface transition-all"
                  />
                  <ShowHide show={showNew} toggle={() => setShowNew(!showNew)} />
                </div>

                {/* Strength bar */}
                {newPw.length > 0 && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${strengthCfg.color} ${strengthCfg.width}`}
                      />
                    </div>
                    <p className={`text-[10.5px] font-medium ${strengthCfg.text}`}>
                      {strengthCfg.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-confirm" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="cp-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Repeat the new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    className={`h-9.5 pr-10 text-[13px] rounded-lg bg-muted/30 focus:bg-surface transition-all ${
                      mismatch ? 'border-destructive/60 focus-visible:ring-destructive/40' :
                      matches  ? 'border-emerald-500/60 focus-visible:ring-emerald-500/40' : ''
                    }`}
                  />
                  <ShowHide show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} />
                </div>
                {confirm.length > 0 && (
                  <p className={`text-[10.5px] font-medium animate-in fade-in duration-150 ${
                    matches ? 'text-emerald-500' : 'text-destructive'
                  }`}>
                    {matches ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] font-medium text-destructive animate-in fade-in"
                >
                  {error}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <DialogFooter className="px-6 pb-5 pt-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 text-[12.5px] cursor-pointer"
                disabled={loading}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                id="cp-submit-btn"
                type="submit"
                className="flex-1 h-9 text-[12.5px] font-semibold cursor-pointer"
                disabled={loading || mismatch || !current || !newPw || !confirm}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

      </DialogContent>
    </Dialog>
  );
}
