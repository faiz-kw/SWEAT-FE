import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type {
  FunctionalTestsPayload,
  TestResultStatus,
  WarmUpObservation,
} from '@/api/endpoints/assessmentApi';

/**
 * Section 4 warm-up observation.
 *
 * Mobility and cardio were here too until the test catalogue took them over; they offer a
 * choice of protocol, whereas warm-up is one fixed set of observations.
 *
 * The card carries a result status defaulting to "Not assessed", because a skipped
 * observation must not contribute a capability level.
 */

const STATUS_OPTIONS: Array<{ value: TestResultStatus; label: string }> = [
  { value: 'NOT_ASSESSED', label: 'Not assessed' },
  { value: 'VALID', label: 'Valid' },
  { value: 'MODIFIED', label: 'Modified' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
];

const SCREEN_OPTIONS = ['Comfortable', 'Modified', 'Restricted'];
const OBSERVATION_OPTIONS = ['Normal', 'Modified', 'Uses support', 'Unable today'];


const selectClass = 'w-full h-9 rounded bg-muted border border-border px-2 text-xs text-foreground';
const labelClass = 'block text-xs text-muted-foreground mb-1';

function StatusSelect({
  value,
  onChange,
}: {
  value?: TestResultStatus | undefined;
  onChange: (v: TestResultStatus) => void;
}) {
  return (
    <select
      value={value || 'NOT_ASSESSED'}
      onChange={(e) => onChange(e.target.value as TestResultStatus)}
      className="h-7 rounded bg-muted border border-border px-2 text-[11px] text-foreground"
      aria-label="Result status"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function CardShell({
  title,
  status,
  onStatus,
  onLogSymptom,
  hasSymptom,
  children,
}: {
  title: string;
  status?: TestResultStatus | undefined;
  onStatus: (v: TestResultStatus) => void;
  onLogSymptom?: (() => void) | undefined;
  hasSymptom?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <StatusSelect value={status} onChange={onStatus} />
          {onLogSymptom && (
            <button
              type="button"
              onClick={onLogSymptom}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                hasSymptom
                  ? 'bg-destructive/20 text-destructive border-destructive/40'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{hasSymptom ? 'Symptom logged' : 'Log symptom'}</span>
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface MovementBatteryExtrasProps {
  tests: FunctionalTestsPayload;
  setTests: React.Dispatch<React.SetStateAction<FunctionalTestsPayload>>;
  onLogSymptom: (domain: string) => void;
  symptoms: Record<string, unknown>;
}

export const MovementBatteryExtras: React.FC<MovementBatteryExtrasProps> = ({
  tests,
  setTests,
  onLogSymptom,
  symptoms,
}) => {
  const warmUp = (tests.warm_up_observation || {}) as WarmUpObservation;

  const setWarmUp = (field: keyof WarmUpObservation, value: unknown) =>
    setTests((prev) => ({ ...prev, warm_up_observation: { ...(prev.warm_up_observation || {}), [field]: value } }));


  const numeric = (v: string) => (v === '' ? null : Number(v));

  return (
    <>
      {/* Section 4 — warm-up observation */}
      <CardShell
        title="Warm-up"
        status={warmUp.status}
        onStatus={(v) => setWarmUp('status', v)}
        onLogSymptom={() => onLogSymptom('warm_up_observation')}
        hasSymptom={!!symptoms['warm_up_observation']}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Walking</label>
            <select value={warmUp.walking || ''} onChange={(e) => setWarmUp('walking', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {OBSERVATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sit to stand</label>
            <select value={warmUp.sit_to_stand || ''} onChange={(e) => setWarmUp('sit_to_stand', e.target.value)} className={selectClass}>
              <option value="">—</option>
              <option value="Independent">Independent</option>
              <option value="Uses support">Uses support</option>
              <option value="Unable today">Unable today</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Squat pattern</label>
            <select value={warmUp.squat_pattern || ''} onChange={(e) => setWarmUp('squat_pattern', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {SCREEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value="Pain reported">Pain reported</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Overhead reach</label>
            <select value={warmUp.overhead_reach || ''} onChange={(e) => setWarmUp('overhead_reach', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {SCREEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Step-up</label>
            <select value={warmUp.step_up || ''} onChange={(e) => setWarmUp('step_up', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {OBSERVATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value="Needs cueing">Needs cueing</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Warm-up (min)</label>
            <Input
              type="number"
              placeholder="0"
              value={warmUp.warm_up_minutes ?? ''}
              onChange={(e) => setWarmUp('warm_up_minutes', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground"
            />
          </div>
        </div>
      </CardShell>

    </>
  );
};
