import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { assessmentApi } from '@/api/endpoints/assessmentApi';
import { WebCameraCaptureModal } from './WebCameraCaptureModal';

/**
 * The four standardised capture views.
 *
 * Front and back carry the frontal-plane angles (shoulder tilt, hip tilt, midline shift);
 * the two profiles carry forward-head and trunk lean, and supply the depth axis the girth
 * estimate needs. Capturing both profiles also gives a repeatability check: if the two
 * disagree, the member rotated between shots and the baseline is not yet trustworthy.
 */
export type CaptureViewId = 'photo_front' | 'photo_back' | 'photo_side_left' | 'photo_side_right';

const CAPTURE_VIEWS: Array<{
  id: CaptureViewId;
  scanKey: 'front' | 'back' | 'left' | 'right';
  label: string;
  instruction: string;
  framing: 'front' | 'side';
}> = [
  { id: 'photo_front', scanKey: 'front', label: '1. Front Standing', instruction: 'Face the camera, look straight ahead at the 2.5m marker', framing: 'front' },
  { id: 'photo_back', scanKey: 'back', label: '2. Back Standing', instruction: 'Face away, heels on the floor markers, arms relaxed', framing: 'front' },
  { id: 'photo_side_left', scanKey: 'left', label: '3. Left Profile', instruction: 'Left shoulder to camera, arms resting naturally at sides', framing: 'side' },
  { id: 'photo_side_right', scanKey: 'right', label: '4. Right Profile', instruction: 'Right shoulder to camera, same stance as the left', framing: 'side' },
];

const EMPTY_CAPTURES: Record<CaptureViewId, null> = {
  photo_front: null,
  photo_back: null,
  photo_side_left: null,
  photo_side_right: null,
};

interface BodyScanCapturePanelProps {
  assessmentId: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  /** Called once captures are stored, so the parent can advance its own step. */
  onCaptured?: () => void;
}

/**
 * Baseline capture and body scan.
 *
 * Uploads are stored immediately and the pose analysis runs in the background, so this panel
 * polls until the scan settles. Every number it shows is nullable on purpose: "Not assessed"
 * is a different statement from a measured zero, and a view that failed its quality gate
 * produces no numbers at all.
 */
export const BodyScanCapturePanel: React.FC<BodyScanCapturePanelProps> = ({
  assessmentId,
  heightCm,
  weightKg,
  onCaptured,
}) => {
  const [captureFiles, setCaptureFiles] = useState<Record<CaptureViewId, File | null>>({ ...EMPTY_CAPTURES });
  const [capturePreviews, setCapturePreviews] = useState<Record<CaptureViewId, string | null>>({ ...EMPTY_CAPTURES });
  const [cameraForView, setCameraForView] = useState<CaptureViewId | null>(null);

  // Capture conditions the camera cannot infer, recorded by the coach.
  const [clothingFit, setClothingFit] = useState<'CLOSE_FITTING' | 'ORDINARY' | 'LOOSE'>('ORDINARY');
  const [captureMode, setCaptureMode] = useState<'PUBLIC_STUDIO' | 'PRIVATE_ROOM'>('PUBLIC_STUDIO');
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [consentAiAnalysis, setConsentAiAnalysis] = useState(false);
  const [scanPollingId, setScanPollingId] = useState<string | null>(null);

  const capturedCount = useMemo(
    () => CAPTURE_VIEWS.filter((view) => capturePreviews[view.id]).length,
    [capturePreviews],
  );

  const { data: scanState } = useQuery({
    queryKey: ['assessment-scan', scanPollingId],
    queryFn: () => assessmentApi.getScanStatus(scanPollingId as string),
    enabled: !!scanPollingId,
    refetchInterval: (query) => (query.state.data?.is_terminal ? false : 2500),
  });

  useEffect(() => {
    if (!scanState?.is_terminal) return;
    setScanPollingId(null);
    if (scanState.status === 'FAILED') {
      toast.error(scanState.error || 'The body scan failed. The captures are saved — you can retry the scan.');
    } else if (scanState.status === 'PARTIAL') {
      toast.warning('Body scan finished, but some views were unusable. Check the notes below.');
    } else if (scanState.status === 'COMPLETED') {
      toast.success('Body scan complete.');
    }
  }, [scanState?.is_terminal, scanState?.status, scanState?.error]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!assessmentId) throw new Error('No active assessment');
      const formData = new FormData();
      (Object.keys(captureFiles) as CaptureViewId[]).forEach((view) => {
        const file = captureFiles[view];
        if (file) formData.append(view, file);
      });
      if (heightCm) formData.append('height_cm', String(heightCm));
      if (weightKg) formData.append('weight_kg', String(weightKg));
      formData.append('consent_movement_photos', String(consentPhotos));
      formData.append('consent_ai_analysis', String(consentAiAnalysis));
      formData.append('clothing_fit', clothingFit);
      formData.append('capture_mode', captureMode);
      return assessmentApi.capturePhotos(assessmentId, formData);
    },
    onSuccess: (data: any) => {
      const scanStatus = data?.scan?.status;
      if (scanStatus === 'QUEUED' || scanStatus === 'PROCESSING') {
        setScanPollingId(data.id);
        toast.success('Captures stored. Body scan running — results appear below.');
      } else if (scanStatus === 'UNAVAILABLE') {
        toast.warning('Captures stored. Body scanning is not configured, so no measurements were produced.');
      } else if (scanStatus === 'SKIPPED_NO_CONSENT') {
        toast.info('Captures stored without analysis, as consent was not given.');
      } else {
        toast.success('Captures saved.');
      }
      onCaptured?.();
    },
    onError: (err: any) => toast.error(err?.data?.error || 'Failed to store the captures.'),
  });

  const rescanMutation = useMutation({
    mutationFn: () => assessmentApi.rescan(assessmentId as string),
    onSuccess: () => {
      if (assessmentId) setScanPollingId(assessmentId);
      toast.success('Re-running the scan against the stored captures.');
    },
    onError: (err: any) => toast.error(err?.data?.error || 'Could not restart the scan.'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Baseline Captures</h4>
          <p className="text-[11px] text-muted-foreground">
            Front, back and both profiles. Same stance and distance every time.
          </p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-semibold text-foreground">
          {capturedCount} / 4 captured
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CAPTURE_VIEWS.map((view) => {
          const preview = capturePreviews[view.id];
          const quality = scanState?.capture_quality?.[view.scanKey];
          const rejected = quality && quality.usable === false;
          return (
            <div key={view.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{view.label}</label>
              <div
                className={`aspect-3/4 rounded-2xl border-2 border-dashed relative flex flex-col items-center justify-center overflow-hidden transition ${
                  rejected
                    ? 'border-destructive/60 bg-destructive/5'
                    : quality?.usable
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-border/80 bg-muted/30 hover:border-primary/50'
                }`}
              >
                {preview ? (
                  <img src={preview} alt={view.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-3 space-y-1.5">
                    <Camera className="w-7 h-7 text-muted-foreground mx-auto" />
                    <p className="text-[11px] font-medium text-foreground">Tap to take photo</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{view.instruction}</p>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Capture ${view.label}`}
                  onClick={() => setCameraForView(view.id)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              {quality && (
                <p className={`text-[10px] leading-tight ${rejected ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-600 dark:text-emerald-400'}`}>
                  {rejected ? quality.reason : 'Usable for measurement'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Conditions and consent — neither can be inferred from the image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-foreground">Clothing fit</label>
          <select
            value={clothingFit}
            onChange={(e) => setClothingFit(e.target.value as typeof clothingFit)}
            className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="CLOSE_FITTING">Close-fitting athletic wear</option>
            <option value="ORDINARY">Ordinary studio clothing</option>
            <option value="LOOSE">Loose clothing</option>
          </select>
          {clothingFit === 'LOOSE' && (
            <p className="text-[10px] text-amber-600 dark:text-amber-600 dark:text-amber-400">
              Posture angles still hold. Girth estimates will read low.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-foreground">Capture setting</label>
          <select
            value={captureMode}
            onChange={(e) => setCaptureMode(e.target.value as typeof captureMode)}
            className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="PUBLIC_STUDIO">Public studio floor</option>
            <option value="PRIVATE_ROOM">Private assessment room</option>
          </select>
        </div>
        <label className="flex items-start gap-2 text-[11px] text-foreground sm:col-span-2">
          <input type="checkbox" checked={consentPhotos} onChange={(e) => setConsentPhotos(e.target.checked)} className="mt-0.5" />
          <span>Member agrees to photos being stored.</span>
        </label>
        <label className="flex items-start gap-2 text-[11px] text-foreground sm:col-span-2">
          <input type="checkbox" checked={consentAiAnalysis} onChange={(e) => setConsentAiAnalysis(e.target.checked)} className="mt-0.5" />
          <span>Member agrees to automated analysis of those photos.</span>
        </label>
        {(!consentPhotos || !consentAiAnalysis) && (
          <p className="text-[10px] text-muted-foreground sm:col-span-2">
            Without both, photos are stored but not analysed.
          </p>
        )}
      </div>

      <Button
        size="sm"
        className="gap-1.5"
        disabled={!assessmentId || capturedCount === 0 || uploadMutation.isPending}
        onClick={() => uploadMutation.mutate()}
      >
        {uploadMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save &amp; scan
      </Button>

      {/* Scan result */}
      {scanState && (
        <div className="rounded-xl border border-border/70 bg-background p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Body scan</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">{scanState.status}</span>
              {!scanState.is_terminal && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            {scanState.is_terminal && scanState.status !== 'SKIPPED_NO_CONSENT' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={rescanMutation.isPending}
                onClick={() => rescanMutation.mutate()}
              >
                Re-run scan
              </Button>
            )}
          </div>

          {scanState.error && <p className="text-[11px] text-destructive">{scanState.error}</p>}
          {(scanState.warnings || []).map((warning: string, index: number) => (
            <p key={index} className="text-[11px] text-amber-600 dark:text-amber-600 dark:text-amber-400">{warning}</p>
          ))}

          {scanState.posture?.posture_score != null && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {([
                { label: 'Posture', value: scanState.posture.posture_score, unit: '/100' },
                { label: 'Shoulder tilt', value: scanState.posture.shoulder_tilt_degrees, unit: '°' },
                { label: 'Hip tilt', value: scanState.posture.hip_tilt_degrees, unit: '°' },
                { label: 'Forward head', value: scanState.posture.forward_head_angle_degrees, unit: '°' },
                { label: 'Midline shift', value: scanState.posture.lateral_shift_degrees, unit: '°' },
              ] as Array<{ label: string; value: number | null; unit: string }>).map((tile) => (
                <div key={tile.label} className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground">{tile.label}</p>
                  <p className="text-sm font-bold text-foreground">
                    {tile.value == null ? 'Not assessed' : `${tile.value}${tile.unit}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!!Object.keys(scanState.circumference_estimates?.values || {}).length && (
            <div className="pt-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                {Object.entries(scanState.circumference_estimates?.values || {}).map(([key, value]) => (
                  <span key={key} className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                    {key.replace(/_/g, ' ')}: <strong>{String(value)}</strong>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Estimates. Use them to track change, not as tape measurements.
              </p>
            </div>
          )}
        </div>
      )}

      {cameraForView && (
        <WebCameraCaptureModal
          isOpen={!!cameraForView}
          onClose={() => setCameraForView(null)}
          title={CAPTURE_VIEWS.find((v) => v.id === cameraForView)?.label || 'Baseline Capture'}
          viewType={CAPTURE_VIEWS.find((v) => v.id === cameraForView)?.framing || 'general'}
          onPhotoCaptured={(file, previewUrl) => {
            const view = cameraForView;
            if (!view) return;
            setCaptureFiles((prev) => ({ ...prev, [view]: file }));
            setCapturePreviews((prev) => ({ ...prev, [view]: previewUrl }));
            setCameraForView(null);
          }}
        />
      )}
    </div>
  );
};
