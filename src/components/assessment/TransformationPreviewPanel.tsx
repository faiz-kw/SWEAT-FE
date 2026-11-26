import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { assessmentApi, resolveMediaUrl } from '@/api/endpoints/assessmentApi';

/**
 * The transformation preview.
 *
 * Shows the member's baseline beside the illustrated milestones, labelled as a simulation —
 * the module specification's "honest comparison" step. A milestone that failed pose
 * verification is reported as rejected rather than shown with a caveat, which is why the
 * rejection reasons are rendered as prominently as the images.
 */

interface TransformationPreviewPanelProps {
  assessmentId: string;
  baselineUrl?: string | null | undefined;
  consentGiven: boolean;
  onRequestConsent?: (() => void) | undefined;
}

export const TransformationPreviewPanel: React.FC<TransformationPreviewPanelProps> = ({
  assessmentId,
  baselineUrl,
  consentGiven,
  onRequestConsent,
}) => {
  const { data: preview, refetch } = useQuery({
    queryKey: ['assessment-transformation', assessmentId],
    queryFn: () => assessmentApi.getTransformation(assessmentId),
    enabled: !!assessmentId,
  });

  const build = useMutation({
    mutationFn: (renderer?: 'morph' | 'fal') => assessmentApi.buildTransformation(assessmentId, renderer),
    onSuccess: (data) => {
      refetch();
      if (data.status === 'COMPLETED') toast.success('Preview generated and verified.');
      else if (data.status === 'PARTIAL') toast.warning('Some milestones failed verification and were discarded.');
      else toast.error(data.error || 'The preview could not be produced.');
    },
    onError: (err: any) => toast.error(err?.data?.error || 'The preview could not be produced.'),
  });

  const milestones = preview?.milestones || {};
  const rejected = preview?.rejected || {};
  const hasAny = Object.keys(milestones).length > 0;

  // Click-to-zoom: the morph change is subtle, so a full-size view (with prev/next through
  // baseline → month 1/2/3) is the only way to actually see the difference.
  const viewable = React.useMemo(() => {
    const list: Array<{ url: string; label: string; sub?: string }> = [];
    if (baselineUrl) list.push({ url: resolveMediaUrl(baselineUrl), label: 'Starting point', sub: 'Measured today' });
    [1, 2, 3].forEach((m) => {
      const ms = (milestones as any)[`month_${m}`];
      if (ms?.url) list.push({ url: resolveMediaUrl(ms.url), label: `Month ${m}`, sub: `Waist −${ms.waist_reduction_pct}% · illustrative` });
    });
    return list;
  }, [baselineUrl, milestones]);
  const [zoomIndex, setZoomIndex] = React.useState<number | null>(null);
  const openZoom = (url?: string | null) => {
    if (!url) return;
    const resolved = resolveMediaUrl(url);
    const idx = viewable.findIndex((v) => v.url === resolved);
    if (idx >= 0) setZoomIndex(idx);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-foreground">Transformation Preview</h4>
          <p className="text-[11px] text-muted-foreground">
            An illustration of the trajectory, built from this member's own baseline photo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {preview?.renderer && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {preview.is_generative ? 'Generated' : 'Morph'} · {preview.renderer}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5"
            disabled={build.isPending || !consentGiven}
            onClick={() => build.mutate(undefined)}
          >
            {build.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {hasAny ? 'Rebuild' : 'Generate'}
          </Button>
        </div>
      </div>

      {!consentGiven && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            The member has not agreed to a generated preview. This is a separate consent from
            posture analysis, and nothing is produced without it.
          </p>
          {onRequestConsent && (
            <Button size="sm" variant="ghost" className="h-7 text-[11px] mt-1.5 px-0" onClick={onRequestConsent}>
              Go to consents
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl p-3 border border-border text-center space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Starting point
          </span>
          <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
            {baselineUrl ? (
              <img src={resolveMediaUrl(baselineUrl)} alt="Baseline capture" onClick={() => openZoom(baselineUrl)} className="w-full h-full object-cover cursor-zoom-in transition hover:opacity-90" />
            ) : (
              <span className="text-[10px] text-muted-foreground px-2">Not captured</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Measured today</p>
        </div>

        {[1, 2, 3].map((month) => {
          const milestone = milestones[`month_${month}`];
          const rejection = rejected[`month_${month}`];
          return (
            <div key={month} className="bg-card rounded-2xl p-3 border border-border text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Month {month}
              </span>
              <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                {milestone ? (
                  <img src={resolveMediaUrl(milestone.url)} alt={`Illustrative month ${month}`} onClick={() => openZoom(milestone.url)} className="w-full h-full object-cover cursor-zoom-in transition hover:opacity-90" />
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2">
                    {rejection ? 'Discarded' : 'Not generated'}
                  </span>
                )}
              </div>
              {milestone ? (
                <>
                  <p className="text-[10px] text-muted-foreground">
                    Waist −{milestone.waist_reduction_pct}% · illustrative
                  </p>
                  {milestone.verification?.accepted && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Pose verified
                    </p>
                  )}
                </>
              ) : rejection ? (
                <p className="text-[10px] text-destructive leading-tight">{rejection}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {preview?.disclosure && (
        <p className="text-[10px] text-muted-foreground">{preview.disclosure}</p>
      )}

      {/* Full-size view — tap any image to compare baseline → milestones up close. */}
      {zoomIndex !== null && viewable[zoomIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setZoomIndex(null)}
        >
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewable[zoomIndex].url}
              alt={viewable[zoomIndex].label}
              className="w-full max-h-[78vh] object-contain rounded-xl bg-black"
            />
            <div className="mt-3 text-center text-white">
              <p className="text-sm font-semibold">{viewable[zoomIndex].label}</p>
              {viewable[zoomIndex].sub && <p className="text-xs text-white/70 mt-0.5">{viewable[zoomIndex].sub}</p>}
              <p className="text-[11px] text-white/50 mt-1">{zoomIndex + 1} / {viewable.length}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setZoomIndex(null)}
              className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90"
            >
              <X className="h-4 w-4" />
            </button>
            {zoomIndex > 0 && (
              <button
                type="button"
                aria-label="Previous"
                onClick={() => setZoomIndex(zoomIndex - 1)}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {zoomIndex < viewable.length - 1 && (
              <button
                type="button"
                aria-label="Next"
                onClick={() => setZoomIndex(zoomIndex + 1)}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
