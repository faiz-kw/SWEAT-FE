import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { classesApi } from '@/api/endpoints/classesApi';
import { toast } from 'sonner';

interface PreviewRow {
  row: number;
  ok: boolean;
  errors: string[];
  date: string;
  branch: string;
  class: string;
  trainer: string;
  trainer_unresolved: boolean;
  start: string;
  end: string;
  capacity: number | null;
}
interface PreviewResp {
  summary: {
    total: number;
    ready: number;
    errors: number;
    with_trainer: number;
    trainer_unresolved: number;
  };
  rows: PreviewRow[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export const BulkScheduleImportModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onDone,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<PreviewResp | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
    setCommitting(false);
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setError(null);
    setLoading(true);
    try {
      const res = await classesApi.bulkImportSchedulePreview(f);
      setPreview(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Could not read the file.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setCommitting(true);
    try {
      const res = await classesApi.bulkImportScheduleCommit(file);
      const r = res.result;
      toast.success(
        `Created ${r.created} session${r.created === 1 ? '' : 's'}` +
          (r.duplicates ? ` · ${r.duplicates} already existed` : '') +
          (r.errors ? ` · ${r.errors} skipped (errors)` : ''),
      );
      onDone?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Import failed.',
      );
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-border shadow-2xl rounded-2xl bg-card">
        <DialogHeader className="p-4 pb-2 text-left">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            Upload Class Schedule (Excel)
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            One row per class. The importer matches by <b>ID</b> first (branch,
            class, trainer) and falls back to name — so no mismatches. Preview
            below before it creates anything.
          </p>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* File picker */}
          <div
            className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <Upload className="size-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : 'Click to choose your .xlsx file'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Use the template (Date, Branch ID/Name, Class ID/Name, Trainer
              ID/Name, Start, End, Capacity)
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="size-4 animate-spin" /> Reading &amp; validating…
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-chip bg-muted font-semibold">
                  {preview.summary.total} rows
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                  ✓ {preview.summary.ready} ready
                </span>
                {preview.summary.errors > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold">
                    {preview.summary.errors} with errors
                  </span>
                )}
                {preview.summary.trainer_unresolved > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                    {preview.summary.trainer_unresolved} trainer not found
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1.5 font-semibold">Date</th>
                      <th className="px-2 py-1.5 font-semibold">Branch</th>
                      <th className="px-2 py-1.5 font-semibold">Class</th>
                      <th className="px-2 py-1.5 font-semibold">Time</th>
                      <th className="px-2 py-1.5 font-semibold">Trainer</th>
                      <th className="px-2 py-1.5 font-semibold">Cap</th>
                      <th className="px-2 py-1.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.rows.map((r) => (
                      <tr
                        key={r.row}
                        className={!r.ok ? 'bg-rose-500/5' : undefined}
                      >
                        <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="px-2 py-1.5">{r.branch}</td>
                        <td className="px-2 py-1.5 font-medium text-foreground">
                          {r.class}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">
                          {r.start}–{r.end}
                        </td>
                        <td
                          className={`px-2 py-1.5 ${r.trainer_unresolved ? 'text-amber-600 dark:text-amber-400' : ''}`}
                        >
                          {r.trainer || '—'}
                          {r.trainer_unresolved ? ' (?)' : ''}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {r.capacity ?? '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" /> ok
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Rows with errors are skipped. Sessions that already exist are
                  not duplicated.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      reset();
                      onOpenChange(false);
                    }}
                  >
                    <X className="size-3.5 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCommit}
                    disabled={committing || preview.summary.ready === 0}
                  >
                    {committing ? (
                      <Loader2 className="size-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-1" />
                    )}
                    Create {preview.summary.ready} session
                    {preview.summary.ready === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkScheduleImportModal;
