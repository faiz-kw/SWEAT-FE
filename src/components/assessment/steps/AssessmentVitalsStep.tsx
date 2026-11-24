import React, { useMemo } from 'react';
import { Activity, Scale, ArrowRight, ArrowLeft, Info, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProvenanceSelect } from '../shared/ProvenanceSelect';
import type { ProvenanceTag } from '@/api/endpoints/assessmentApi';

interface AssessmentVitalsStepProps {
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

  // Real-time calculations
  const bmiInfo = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    const hM = heightCm / 100;
    const bmiVal = Math.round((weightKg / (hM * hM)) * 10) / 10;
    let category = 'Normal weight';
    let color = 'text-emerald-400';
    if (bmiVal < 18.5) {
      category = 'Underweight';
      color = 'text-blue-400';
    } else if (bmiVal >= 30.0) {
      category = 'Obesity Class';
      color = 'text-red-400';
    } else if (bmiVal >= 25.0) {
      category = 'Overweight';
      color = 'text-amber-400';
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
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Section 3
            </span>
            <h2 className="text-lg font-bold text-zinc-100">Vitals & Body Metrics</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Log physical biometrics with data-source provenance tags. Inputs initialize empty.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Validated Provenance</span>
        </div>
      </div>

      {/* Grid of Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Height */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Height (cm)</label>
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
            className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-100"
          />
        </div>

        {/* Weight */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Weight (kg)</label>
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
            className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-100"
          />
        </div>

        {/* Waist Circumference */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Waist Circumference (cm)</label>
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
            className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-100"
          />
        </div>

        {/* Resting Heart Rate */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Resting Heart Rate (BPM)</label>
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
            className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-100"
          />
        </div>

        {/* Blood Pressure */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">Resting Blood Pressure (Systolic/Diastolic)</label>
            <ProvenanceSelect
              value={provenance['resting_bp'] || 'MEASURED'}
              onChange={(t) => updateProvenance('resting_bp', t)}
            />
          </div>
          <Input
            placeholder="e.g. 118/76"
            value={restingBp}
            onChange={(e) => setRestingBp(e.target.value)}
            className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-100"
          />
        </div>
      </div>

      {/* Calculated Preview & Disclaimers */}
      {bmiInfo && metabolicInfo && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2 text-zinc-200">
            <Scale className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Calculated Metabolic Preview</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Body Mass Index</span>
              <div className="text-xl font-bold text-zinc-100">{bmiInfo.val}</div>
              <span className={`text-[11px] font-semibold ${bmiInfo.color}`}>{bmiInfo.category}</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Estimated RMR</span>
              <div className="text-xl font-bold text-zinc-100">{metabolicInfo.rmr} <span className="text-xs font-normal text-zinc-400">kcal</span></div>
              <span className="text-[11px] text-zinc-400">Resting metabolism</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Estimated TDEE</span>
              <div className="text-xl font-bold text-zinc-100">{metabolicInfo.tdee} <span className="text-xs font-normal text-zinc-400">kcal</span></div>
              <span className="text-[11px] text-zinc-400">Daily burn</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Protein Target</span>
              <div className="text-xl font-bold text-zinc-100">{Math.round((weightKg || 60) * 1.8)} <span className="text-xs font-normal text-zinc-400">g</span></div>
              <span className="text-[11px] text-zinc-400">1.8g / kg target</span>
            </div>
          </div>

          {/* Mandatory Disclaimers */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0 mt-0.5" />
              <span><strong>BMI Disclaimer:</strong> BMI is a screening metric, not a direct measure of body fat or muscularity.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0 mt-0.5" />
              <span><strong>Metabolic Disclaimer:</strong> Estimated via Mifflin-St Jeor formula with physical activity multiplier. Individual metabolic rates vary.</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-zinc-400 gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Safety Gate</span>
        </Button>
        <Button
          onClick={onNext}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-6 h-10 gap-2"
        >
          <span>Continue to Movement Battery</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
