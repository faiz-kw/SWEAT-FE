import React, { useState } from 'react';
import { Dumbbell, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SymptomLoggerModal } from '../shared/SymptomLoggerModal';
import { MovementBatteryExtras } from './MovementBatteryExtras';
import type { FunctionalTestsPayload, FunctionalTestItem, SymptomRecord } from '@/api/endpoints/assessmentApi';

interface AssessmentMovementStepProps {
  tests: FunctionalTestsPayload;
  setTests: React.Dispatch<React.SetStateAction<FunctionalTestsPayload>>;
  symptoms: Record<string, SymptomRecord>;
  setSymptoms: React.Dispatch<React.SetStateAction<Record<string, SymptomRecord>>>;
  onPrev: () => void;
  onNext: () => void;
}

export const AssessmentMovementStep: React.FC<AssessmentMovementStepProps> = ({
  tests,
  setTests,
  symptoms,
  setSymptoms,
  onPrev,
  onNext,
}) => {
  const [activeModalDomain, setActiveModalDomain] = useState<string | null>(null);

  const handleSymptomLogged = (sym: SymptomRecord) => {
    if (!activeModalDomain) return;
    setSymptoms((prev) => ({ ...prev, [activeModalDomain]: sym }));
  };

  const updateDomain = (
    domain: 'lower_body' | 'upper_body' | 'core' | 'balance',
    defaultTestName: string,
    field: keyof FunctionalTestItem,
    val: string | number | null
  ) => {
    setTests((prev) => {
      const existing = (typeof prev[domain] === 'object' && prev[domain] && !('assessed_tests' in (prev[domain] || {})))
        ? (prev[domain] as FunctionalTestItem)
        : {};
      return {
        ...prev,
        [domain]: {
          ...existing,
          test_name: existing.test_name || defaultTestName,
          [field]: val,
        },
      };
    });
  };

  const lb = (typeof tests.lower_body === 'object' && !('assessed_tests' in (tests.lower_body || {})) ? tests.lower_body : {}) as FunctionalTestItem;
  const ub = (typeof tests.upper_body === 'object' && !('assessed_tests' in (tests.upper_body || {})) ? tests.upper_body : {}) as FunctionalTestItem;
  const core = (typeof tests.core === 'object' && !('assessed_tests' in (tests.core || {})) ? tests.core : {}) as FunctionalTestItem;
  const bal = (typeof tests.balance === 'object' && !('assessed_tests' in (tests.balance || {})) ? tests.balance : {}) as FunctionalTestItem;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 4 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Movement Tests</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Record symptoms separately from performance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Dumbbell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Protocol v1.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lower body (Squat) */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Lower body</span>
            <button
              type="button"
              onClick={() => setActiveModalDomain('lower_body')}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                symptoms['lower_body'] ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{symptoms['lower_body'] ? 'Symptom Logged' : 'Log Symptom'}</span>
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Squat</label>
            <select
              value={lb.variation || 'Bodyweight squat'}
              onChange={(e) => updateDomain('lower_body', 'Squat', 'variation', e.target.value)}
              className="w-full h-9 rounded bg-muted border border-border px-2.5 text-xs text-foreground"
            >
              <option value="Box squat">Box squat</option>
              <option value="Bodyweight squat">Bodyweight squat</option>
              <option value="Goblet squat">Goblet squat</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Reps</label>
              <Input
                type="number"
                placeholder="0"
                value={lb.reps ?? ''}
                onChange={(e) => updateDomain('lower_body', 'Squat', 'reps', e.target.value ? parseInt(e.target.value, 10) : null)}
                className="h-9 bg-muted border-border text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Quality</label>
              <select
                value={lb.movement_quality || 'Meets criteria'}
                onChange={(e) => updateDomain('lower_body', 'Squat', 'movement_quality', e.target.value)}
                className="w-full h-9 rounded bg-muted border border-border px-2 text-xs text-foreground"
              >
                <option value="Meets criteria">Meets criteria</option>
                <option value="Needs cueing">Needs cueing</option>
                <option value="Modified">Modified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upper body (Push-up) */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Upper body</span>
            <button
              type="button"
              onClick={() => setActiveModalDomain('upper_body')}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                symptoms['upper_body'] ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{symptoms['upper_body'] ? 'Symptom Logged' : 'Log Symptom'}</span>
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Push-up</label>
            <select
              value={ub.variation || 'Wall Push-up'}
              onChange={(e) => updateDomain('upper_body', 'Push-up', 'variation', e.target.value)}
              className="w-full h-9 rounded bg-muted border border-border px-2.5 text-xs text-foreground"
            >
              <option value="Wall Push-up">Wall Push-up</option>
              <option value="High incline">High incline</option>
              <option value="Knee Push-up">Knee Push-up</option>
              <option value="Floor">Floor</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Reps</label>
              <Input
                type="number"
                placeholder="0"
                value={ub.reps ?? ''}
                onChange={(e) => updateDomain('upper_body', 'Push-up', 'reps', e.target.value ? parseInt(e.target.value, 10) : null)}
                className="h-9 bg-muted border-border text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Quality</label>
              <select
                value={ub.movement_quality || 'Meets criteria'}
                onChange={(e) => updateDomain('upper_body', 'Push-up', 'movement_quality', e.target.value)}
                className="w-full h-9 rounded bg-muted border border-border px-2 text-xs text-foreground"
              >
                <option value="Meets criteria">Meets criteria</option>
                <option value="Needs cueing">Needs cueing</option>
                <option value="Modified">Modified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Domain 3: Core (Plank) */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Domain 3: Core</span>
            <button
              type="button"
              onClick={() => setActiveModalDomain('core')}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                symptoms['core'] ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{symptoms['core'] ? 'Symptom Logged' : 'Log Symptom'}</span>
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Plank Protocol</label>
            <select
              value={core.variation || 'Forearm plank'}
              onChange={(e) => updateDomain('core', 'Plank', 'variation', e.target.value)}
              className="w-full h-9 rounded bg-muted border border-border px-2.5 text-xs text-foreground"
            >
              <option value="Elevated Plank">Elevated plank</option>
              <option value="Forearm plank">Forearm plank</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Hold (seconds)</label>
            <Input
              type="number"
              placeholder="e.g. 45"
              value={core.hold_seconds ?? ''}
              onChange={(e) => updateDomain('core', 'Plank', 'hold_seconds', e.target.value ? parseInt(e.target.value, 10) : null)}
              className="h-9 bg-muted border-border text-xs text-foreground"
            />
          </div>
        </div>

        {/* Balance */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Balance</span>
            <button
              type="button"
              onClick={() => setActiveModalDomain('balance')}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                symptoms['balance'] ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{symptoms['balance'] ? 'Symptom Logged' : 'Log Symptom'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Left Leg (Sec)</label>
              <Input
                type="number"
                placeholder="25"
                value={bal.hold_seconds ?? ''}
                onChange={(e) => updateDomain('balance', 'Single Leg Balance', 'hold_seconds', e.target.value ? parseInt(e.target.value, 10) : null)}
                className="h-9 bg-muted border-border text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Support Used</label>
              <select
                value={bal.movement_quality || 'None (Independent)'}
                onChange={(e) => updateDomain('balance', 'Single Leg Balance', 'movement_quality', e.target.value)}
                className="w-full h-9 rounded bg-muted border border-border px-2 text-xs text-foreground"
              >
                <option value="None (Independent)">None</option>
                <option value="Fingertip touch">Fingertip touch</option>
                <option value="Hand support">Hand support</option>
              </select>
            </div>
          </div>

        <MovementBatteryExtras
          tests={tests}
          setTests={setTests}
          symptoms={symptoms}
          onLogSymptom={(domain) => setActiveModalDomain(domain)}
        />
        </div>
      </div>

      {activeModalDomain && (
        <SymptomLoggerModal
          isOpen={true}
          domainName={activeModalDomain.replace('_', ' ').toUpperCase()}
          onClose={() => setActiveModalDomain(null)}
          onSaveSymptom={handleSymptomLogged}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vitals</span>
        </Button>
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2">
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
