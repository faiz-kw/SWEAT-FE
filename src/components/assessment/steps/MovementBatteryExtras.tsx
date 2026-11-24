import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type {
  CardiovascularTest,
  FunctionalTestsPayload,
  MobilityTests,
  TestResultStatus,
  WarmUpObservation,
} from '@/api/endpoints/assessmentApi';

/**
 * The parts of the movement battery that had no inputs: warm-up observation (section 4),
 * mobility (section 9) and cardio (section 10).
 *
 * Until these existed, the capability matrix reported mobility, cardiovascular and functional
 * movement from hardcoded constants, because nothing ever collected them.
 *
 * Every card carries a result status. "Not assessed" is the default on purpose: a test the
 * coach skipped must not contribute a capability level, and the backend drops any entry
 * marked not assessed or incomplete.
 */

const STATUS_OPTIONS: Array<{ value: TestResultStatus; label: string }> = [
  { value: 'NOT_ASSESSED', label: 'Not assessed' },
  { value: 'VALID', label: 'Valid' },
  { value: 'MODIFIED', label: 'Modified' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
];

const SCREEN_OPTIONS = ['Comfortable', 'Modified', 'Restricted'];
const OBSERVATION_OPTIONS = ['Normal', 'Modified', 'Uses support', 'Unable today'];

const CARDIO_PROTOCOLS = [
  'Comfortable treadmill walk',
  'Submaximal treadmill walk',
  '2-minute step test',
  '6-minute walk test',
  'Stationary cycle',
];

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
  const mobility = (tests.mobility || {}) as MobilityTests;
  const cardio = (tests.cardiovascular || {}) as CardiovascularTest;

  const setWarmUp = (field: keyof WarmUpObservation, value: unknown) =>
    setTests((prev) => ({ ...prev, warm_up_observation: { ...(prev.warm_up_observation || {}), [field]: value } }));

  const setMobility = (field: keyof MobilityTests, value: unknown) =>
    setTests((prev) => ({ ...prev, mobility: { ...(prev.mobility || {}), [field]: value } }));

  const setCardio = (field: keyof CardiovascularTest, value: unknown) =>
    setTests((prev) => ({ ...prev, cardiovascular: { ...(prev.cardiovascular || {}), [field]: value } }));

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

      {/* Section 9 — mobility */}
      <CardShell
        title="Mobility"
        status={mobility.status}
        onStatus={(v) => setMobility('status', v)}
        onLogSymptom={() => onLogSymptom('mobility')}
        hasSymptom={!!symptoms['mobility']}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Shoulder</label>
            <select value={mobility.shoulder_mobility || ''} onChange={(e) => setMobility('shoulder_mobility', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {SCREEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ankle (knee to wall)</label>
            <select value={mobility.ankle_knee_to_wall || ''} onChange={(e) => setMobility('ankle_knee_to_wall', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {SCREEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ankle left (cm)</label>
            <Input type="number" placeholder="—" value={mobility.ankle_left_cm ?? ''}
              onChange={(e) => setMobility('ankle_left_cm', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Ankle right (cm)</label>
            <Input type="number" placeholder="—" value={mobility.ankle_right_cm ?? ''}
              onChange={(e) => setMobility('ankle_right_cm', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Hamstring reach</label>
            <select value={mobility.hamstring_reach || ''} onChange={(e) => setMobility('hamstring_reach', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {SCREEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sit &amp; reach (cm)</label>
            <Input type="number" placeholder="—" value={mobility.sit_and_reach_cm ?? ''}
              onChange={(e) => setMobility('sit_and_reach_cm', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
        </div>
        {mobility.ankle_left_cm != null && mobility.ankle_right_cm != null &&
          Math.abs(Number(mobility.ankle_left_cm) - Number(mobility.ankle_right_cm)) >= 4 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              {Math.abs(Number(mobility.ankle_left_cm) - Number(mobility.ankle_right_cm)).toFixed(1)}cm
              side-to-side difference — worth addressing in the plan.
            </p>
          )}
      </CardShell>

      {/* Section 10 — cardio */}
      <CardShell
        title="Cardio"
        status={cardio.status}
        onStatus={(v) => setCardio('status', v)}
        onLogSymptom={() => onLogSymptom('cardiovascular')}
        hasSymptom={!!symptoms['cardiovascular']}
      >
        <div>
          <label className={labelClass}>Protocol</label>
          <select value={cardio.protocol || ''} onChange={(e) => setCardio('protocol', e.target.value)} className={selectClass}>
            <option value="">—</option>
            {CARDIO_PROTOCOLS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Duration (min)</label>
            <Input type="number" placeholder="0" value={cardio.duration_minutes ?? ''}
              onChange={(e) => setCardio('duration_minutes', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Distance (m)</label>
            <Input type="number" placeholder="0" value={cardio.distance_m ?? ''}
              onChange={(e) => setCardio('distance_m', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Steps / reps</label>
            <Input type="number" placeholder="0" value={cardio.repetitions ?? ''}
              onChange={(e) => setCardio('repetitions', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>HR after (bpm)</label>
            <Input type="number" placeholder="0" value={cardio.hr_after_bpm ?? ''}
              onChange={(e) => setCardio('hr_after_bpm', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Recovery HR</label>
            <Input type="number" placeholder="0" value={cardio.recovery_hr_bpm ?? ''}
              onChange={(e) => setCardio('recovery_hr_bpm', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
          <div>
            <label className={labelClass}>Exertion (0–10)</label>
            <Input type="number" min={0} max={10} placeholder="0" value={cardio.perceived_exertion ?? ''}
              onChange={(e) => setCardio('perceived_exertion', numeric(e.target.value))}
              className="h-9 bg-muted border-border text-xs text-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Talk test</label>
            <select value={cardio.talk_test || ''} onChange={(e) => setCardio('talk_test', e.target.value)} className={selectClass}>
              <option value="">—</option>
              <option value="Comfortable">Comfortable</option>
              <option value="Somewhat difficult">Somewhat difficult</option>
              <option value="Difficult">Difficult</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Stopped because</label>
            <select value={cardio.stopping_reason || ''} onChange={(e) => setCardio('stopping_reason', e.target.value)} className={selectClass}>
              <option value="">—</option>
              <option value="Protocol complete">Protocol complete</option>
              <option value="Fatigue">Fatigue</option>
              <option value="Symptoms">Symptoms</option>
              <option value="Safety">Safety</option>
            </select>
          </div>
        </div>
      </CardShell>
    </>
  );
};
