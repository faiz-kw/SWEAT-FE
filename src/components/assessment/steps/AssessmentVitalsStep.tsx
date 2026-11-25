import React, { useMemo, useRef, useState } from 'react';
import { Activity, Scale, ArrowRight, ArrowLeft, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProvenanceSelect } from '../shared/ProvenanceSelect';
import { BodyScanCapturePanel, type BodyScanCaptureHandle } from '../BodyScanCapturePanel';
import type { ProvenanceTag } from '@/api/endpoints/assessmentApi';

interface AssessmentVitalsStepProps {
  /** Active assessment, needed to upload captures and poll the scan. */
  assessmentId?: string | null;
  heightCm: number | null;
  setHeightCm: (val: number | null) => void;
  weightKg: number | null;
  setWeightKg: (val: number | null) => void;
  waistCm: number | null;
  setWaistCm: (val: number | null) => void;
  restingHr: number | null;
  setRestingHr: (val: number | null) => void;
  restingBp: string;
  setRestingBp: (val: string) => void;
  provenance: Record<string, ProvenanceTag>;
  setProvenance: React.Dispatch<React.SetStateAction<Record<string, ProvenanceTag>>>;
  onPrev: () => void;
  onNext: () => void;
}

export const AssessmentVitalsStep: React.FC<AssessmentVitalsStepProps> = ({
  assessmentId = null,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  waistCm,
  setWaistCm,
  restingHr,
  setRestingHr,
  restingBp,
  setRestingBp,
  provenance,
  setProvenance,
  onPrev,
  onNext,
}) => {
  const updateProvenance = (metric: string, tag: ProvenanceTag) => {
    setProvenance((prev) => ({ ...prev, [metric]: tag }));
  };

  // "Continue" should save the photos it finds, so nobody loses a capture by pressing the
  // wrong button. If the upload fails we stay on the step (the panel shows the error) so it
  // can be retried rather than silently moving on without a scan.
  const captureRef = useRef<BodyScanCaptureHandle>(null);
  const [savingCaptures, setSavingCaptures] = useState(false);

  const handleContinue = async () => {
    if (captureRef.current?.hasPending()) {
      setSavingCaptures(true);
      try {
        await captureRef.current.commit();
      } catch {
        setSavingCaptures(false);
        return;
      }
      setSavingCaptures(false);
    }
    onNext();
  };

  // Real-time calculations
  const bmiInfo = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    const hM = heightCm / 100;
    const bmiVal = Math.round((weightKg / (hM * hM)) * 10) / 10;
    let category = 'Normal weight';
    let color = 'text-emerald-600 dark:text-emerald-400';
    if (bmiVal < 18.5) {
      category = 'Underweight';
      color = 'text-blue-400';
    } else if (bmiVal >= 30.0) {
      category = 'Obesity Class';
      color = 'text-destructive';
    } else if (bmiVal >= 25.0) {
      category = 'Overweight';
      color = 'text-amber-600 dark:text-amber-400';
    }
    return { val: bmiVal, category, color };
  }, [heightCm, weightKg]);

  const metabolicInfo = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    // Standard baseline estimate (female formula as conservative baseline):
    // 10 * W + 6.25 * H - 5 * 30 - 161
    const rmr = Math.round(10 * weightKg + 6.25 * heightCm - 150 - 161);
    const tdee = Math.round(rmr * 1.55);
    return { rmr, tdee };
  }, [heightCm, weightKg]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 3 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Vitals</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tag each value with how it was obtained.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Source tagged</span>
        </div>
      </div>

      {/* Grid of Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Height */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Height (cm)</label>
            <ProvenanceSelect
              value={provenance['height'] || 'MEASURED'}
              onChange={(t) => updateProvenance('height', t)}
            />
          </div>
          <Input
            type="number"
            step="0.5"
            placeholder="e.g. 165"
            value={heightCm !== null ? heightCm : ''}
            onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : null)}
            className="h-10 bg-muted border-border text-sm text-foreground"
          />
        </div>

        {/* Weight */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Weight (kg)</label>
            <ProvenanceSelect
              value={provenance['weight'] || 'MEASURED'}
              onChange={(t) => updateProvenance('weight', t)}
            />
          </div>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 62.5"
            value={weightKg !== null ? weightKg : ''}
            onChange={(e) => setWeightKg(e.target.value ? parseFloat(e.target.value) : null)}
            className="h-10 bg-muted border-border text-sm text-foreground"
          />
        </div>

        {/* Waist Circumference */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Waist (cm)</label>
            <ProvenanceSelect
              value={provenance['waist'] || 'MEASURED'}
              onChange={(t) => updateProvenance('waist', t)}
            />
          </div>
          <Input
            type="number"
            step="0.5"
            placeholder="e.g. 74.0"
            value={waistCm !== null ? waistCm : ''}
            onChange={(e) => setWaistCm(e.target.value ? parseFloat(e.target.value) : null)}
            className="h-10 bg-muted border-border text-sm text-foreground"
          />
        </div>

        {/* Resting Heart Rate */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Resting heart rate (bpm)</label>
            <ProvenanceSelect
              value={provenance['resting_hr'] || 'MEASURED'}
              onChange={(t) => updateProvenance('resting_hr', t)}
            />
          </div>
          <Input
            type="number"
            placeholder="e.g. 68"
            value={restingHr !== null ? restingHr : ''}
            onChange={(e) => setRestingHr(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="h-10 bg-muted border-border text-sm text-foreground"
          />
        </div>

        {/* Blood Pressure */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Blood pressure</label>
            <ProvenanceSelect
              value={provenance['resting_bp'] || 'MEASURED'}
              onChange={(t) => updateProvenance('resting_bp', t)}
            />
          </div>
          <Input
            placeholder="e.g. 118/76"
            value={restingBp}
            onChange={(e) => setRestingBp(e.target.value)}
            className="h-10 bg-muted border-border text-sm text-foreground"
          />
        </div>
      </div>

      {/* Calculated Preview & Disclaimers */}
      {bmiInfo && metabolicInfo && (
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Calculated</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/80 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">BMI</span>
              <div className="text-xl font-bold text-foreground">{bmiInfo.val}</div>
              <span className={`text-[11px] font-semibold ${bmiInfo.color}`}>{bmiInfo.category}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/80 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Estimated RMR</span>
              <div className="text-xl font-bold text-foreground">{metabolicInfo.rmr} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
              <span className="text-[11px] text-muted-foreground">Resting metabolism</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/80 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Estimated TDEE</span>
              <div className="text-xl font-bold text-foreground">{metabolicInfo.tdee} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
              <span className="text-[11px] text-muted-foreground">Daily burn</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/80 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Protein Target</span>
              <div className="text-xl font-bold text-foreground">{Math.round((weightKg || 60) * 1.8)} <span className="text-xs font-normal text-muted-foreground">g</span></div>
              <span className="text-[11px] text-muted-foreground">1.8g / kg target</span>
            </div>
          </div>

          {/* Mandatory Disclaimers */}
          <div className="space-y-1.5 pt-2 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400/80 flex-shrink-0 mt-0.5" />
              <span><strong>BMI Disclaimer:</strong> A screening number. It does not measure body fat.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400/80 flex-shrink-0 mt-0.5" />
              <span><strong>Metabolic Disclaimer:</strong> Estimated, not measured. Individual rates vary.</span>
            </div>
          </div>
        </div>
      )}

      {/* Baseline captures and the body scan they feed */}
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <BodyScanCapturePanel
          ref={captureRef}
          assessmentId={assessmentId}
          heightCm={heightCm}
          weightKg={weightKg}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={handleContinue}
          disabled={savingCaptures}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2"
        >
          {savingCaptures ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving photos…</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
