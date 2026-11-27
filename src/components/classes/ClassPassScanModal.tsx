import React from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Keyboard,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowDownUp,
} from 'lucide-react';
import { bookingsApi } from '@/api/endpoints/bookingsApi';

interface ScanResult {
  ok: boolean;
  action?: 'IN' | 'OUT' | 'USED';
  reason?: string;
  member_name?: string;
  member_number?: string;
  class_name?: string;
  time?: string;
  message: string;
}

interface LogEvent {
  member_name: string;
  direction: string;
  time: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrenceId: string;
  className?: string;
  classDate?: string;
}

const READER_ID = 'sweat-class-pass-reader';

export const ClassPassScanModal: React.FC<Props> = ({
  open,
  onOpenChange,
  occurrenceId,
  className,
  classDate,
}) => {
  const [mode, setMode] = React.useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<LogEvent[]>([]);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const busyRef = React.useRef(false);

  const refreshLog = React.useCallback(async () => {
    try {
      const res = await bookingsApi.getClassPassLog(occurrenceId);
      setLog(res?.events || []);
    } catch {
      /* non-fatal */
    }
  }, [occurrenceId]);

  const submitToken = React.useCallback(
    async (rawToken: string) => {
      const token = (rawToken || '').trim();
      if (!token || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await bookingsApi.scanClassPass(occurrenceId, token);
        setResult(res);
        if (res.ok) {
          await refreshLog();
        }
      } catch (err: any) {
        setResult({
          ok: false,
          message:
            err?.response?.data?.message ||
            err?.response?.data?.detail ||
            'Could not verify this pass. Please try again.',
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [occurrenceId, refreshLog],
  );

  const handleManualSubmit = async () => {
    const code = manualCode.trim();
    if (!code) return;
    await submitToken(code);
    setManualCode('');
  };

  // Camera scanner lifecycle
  React.useEffect(() => {
    if (!open || mode !== 'camera') return;
    let cancelled = false;
    let instance: Html5Qrcode | null = null;

    const start = async () => {
      setCameraError(null);
      try {
        instance = new Html5Qrcode(READER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        } as any);
        scannerRef.current = instance;
        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (w: number, h: number) => {
              const size = Math.floor(Math.min(w, h) * 0.75);
              return { width: size, height: size };
            },
          },
          (decoded: string) => {
            const now = Date.now();
            if (
              decoded === lastScanRef.current.code &&
              now - lastScanRef.current.at < 3000
            ) {
              return; // ignore rapid duplicate of same code
            }
            lastScanRef.current = { code: decoded, at: now };
            submitToken(decoded);
          },
          () => {
            /* per-frame decode failure: ignore */
          },
        );
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(
            'Could not start the camera — allow camera access for this site, or use the Manual code tab.',
          );
        }
      }
    };

    // small delay so the dialog's reader element is mounted before the scanner attaches
    const startTimer = setTimeout(start, 250);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst
          .stop()
          .then(() => inst?.clear())
          .catch(() => {
            try {
              inst?.clear();
            } catch {
              /* noop */
            }
          });
      }
    };
  }, [open, mode, submitToken]);

  // Load the in/out log when opened
  React.useEffect(() => {
    if (open) {
      setResult(null);
      refreshLog();
    }
  }, [open, refreshLog]);

  const resultTone = (() => {
    if (!result) return null;
    if (result.ok && result.action === 'IN') return 'in';
    if (result.ok && result.action === 'OUT') return 'out';
    return 'error';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[92vh] overflow-y-auto p-0 border border-border shadow-2xl rounded-2xl bg-card">
        <DialogHeader className="p-4 pb-2 text-left">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <QrCode className="size-4 text-primary" />
            Scan Pass — Check In / Out
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {className || 'Class'}
            {classDate ? ` · ${classDate}` : ''}
          </p>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                mode === 'camera'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <QrCode className="size-3.5" /> Camera
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                mode === 'manual'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <Keyboard className="size-3.5" /> Manual code
            </button>
          </div>

          {/* Camera view */}
          {mode === 'camera' && (
            <div className="space-y-2">
              <div
                id={READER_ID}
                className="w-full overflow-hidden rounded-xl border border-border bg-black/90 min-h-[220px]"
              />
              {cameraError && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {cameraError}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                Point the camera at the member&apos;s booking QR.
              </p>
            </div>
          )}

          {/* Manual entry */}
          {mode === 'manual' && (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
                placeholder="Enter / paste pass code"
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                onClick={handleManualSubmit}
                disabled={busy || !manualCode.trim()}
                className="h-9"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : 'Check'}
              </Button>
            </div>
          )}

          {/* Result banner */}
          {result && (
            <div
              className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                resultTone === 'in'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : resultTone === 'out'
                    ? 'bg-sky-500/10 border-sky-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              {resultTone === 'in' ? (
                <LogIn className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : resultTone === 'out' ? (
                <LogOut className="size-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                {result.member_name && (
                  <p className="text-sm font-bold text-foreground truncate">
                    {result.member_name}
                    {result.member_number ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · {result.member_number}
                      </span>
                    ) : null}
                  </p>
                )}
                <p
                  className={`text-xs font-semibold ${
                    resultTone === 'in'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : resultTone === 'out'
                        ? 'text-sky-700 dark:text-sky-300'
                        : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {result.ok && result.action === 'IN'
                    ? '✓ Checked IN'
                    : result.ok && result.action === 'OUT'
                      ? '✓ Checked OUT'
                      : result.message}
                </p>
                {result.ok && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {result.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* In/out log */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <ArrowDownUp className="size-3.5" /> In / Out log
              <span className="text-[10px] font-normal">({log.length})</span>
            </div>
            {log.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No check-ins yet for this class.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {log.map((e, i) => {
                  const isIn = (e.direction || '').toUpperCase() === 'ENTRY';
                  const t = e.time
                    ? new Date(e.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium text-foreground truncate">
                        {e.member_name}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isIn
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {isIn ? (
                            <LogIn className="size-3" />
                          ) : (
                            <LogOut className="size-3" />
                          )}
                          {isIn ? 'IN' : 'OUT'}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {t}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <CheckCircle2 className="size-3" />
            Each pass works once to enter and once to exit, then it&apos;s used
            up.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassPassScanModal;
