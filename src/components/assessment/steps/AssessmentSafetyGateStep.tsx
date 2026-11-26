import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { HealthScreeningData } from '@/api/endpoints/assessmentApi';

interface AssessmentSafetyGateStepProps {
  screeningAnswers: HealthScreeningData;
  setScreeningAnswers: React.Dispatch<React.SetStateAction<HealthScreeningData>>;
  screeningOutcome: string;
  setScreeningOutcome: (val: string) => void;
  screeningCoachNotes: string;
  setScreeningCoachNotes: (val: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const QUESTIONS: Array<{
  key: keyof HealthScreeningData;
  title: string;
  isCritical: boolean;
}> = [
  { key: 'heart_condition', title: '1. Has your doctor ever said that you have a heart condition?', isCritical: false },
  { key: 'chest_pain_activity', title: '2. Do you feel pain in your chest when you engage in physical activity?', isCritical: true },
  { key: 'chest_pain_rest', title: '3. In the past month, have you had chest pain when not physically active?', isCritical: true },
  { key: 'dizziness_loss_of_balance', title: '4. Do you lose your balance due to dizziness, or have you ever lost consciousness/fainted?', isCritical: true },
  { key: 'bone_joint_problem', title: '5. Do you have a bone, joint, or spinal problem that could be worsened by exercise?', isCritical: false },
  { key: 'blood_pressure_medication', title: '6. Are you currently taking prescribed drugs for blood pressure or heart condition?', isCritical: false },
  { key: 'unexplained_shortness_of_breath', title: '7. Do you experience unexplained shortness of breath or breathing difficulty at rest?', isCritical: true },
  { key: 'recent_surgery_injury', title: '8. Have you undergone surgery, suffered a fracture, or had a major injury in the past 6 months?', isCritical: false },
  { key: 'pregnancy_or_postpartum', title: '9. Are you currently pregnant or within 6 months postpartum?', isCritical: false },
  { key: 'other_medical_condition', title: '10. Do you know of any other reason why you should not perform physical exercise?', isCritical: false },
];

export const AssessmentSafetyGateStep: React.FC<AssessmentSafetyGateStepProps> = ({
  screeningAnswers,
  setScreeningAnswers,
  screeningOutcome,
  setScreeningOutcome,
  screeningCoachNotes,
  setScreeningCoachNotes,
  onPrev,
  onNext,
}) => {
  const handleToggle = (key: keyof HealthScreeningData, val: boolean) => {
    setScreeningAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const criticalTriggered = useMemo(() => {
    return (
      screeningAnswers.chest_pain_activity ||
      screeningAnswers.chest_pain_rest ||
      screeningAnswers.dizziness_loss_of_balance ||
      screeningAnswers.unexplained_shortness_of_breath
    );
  }, [screeningAnswers]);

  const hasModifications = useMemo(() => {
    return (
      screeningAnswers.heart_condition ||
      screeningAnswers.bone_joint_problem ||
      screeningAnswers.blood_pressure_medication ||
      screeningAnswers.recent_surgery_injury ||
      screeningAnswers.pregnancy_or_postpartum ||
      screeningAnswers.other_medical_condition
    );
  }, [screeningAnswers]);

  // Reactive outcome recommendation
  const isTestingBlocked = screeningOutcome === 'DEFER_MEDICAL_CLEARANCE' || screeningOutcome === 'STOPPED_SAFETY_CONCERNS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 2 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Health & Readiness</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete this before any physical testing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground font-medium">PAR-Q</span>
        </div>
      </div>

      {/* Reactive Safety Alert Banner */}
      {criticalTriggered && (
        <div className="rounded-xl border border-destructive/40 bg-red-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h4 className="font-semibold text-sm">Stop — medical clearance needed</h4>
          </div>
          <p className="text-xs text-red-200/80 leading-relaxed">
            The member reported affirmative symptoms to cardiovascular or neurological risk factors (chest pain, syncope, or resting breathlessness). 
            Physical movement testing must be deferred until written clearance from a licensed physician is provided.
          </p>
        </div>
      )}

      {/* 10-Question Grid */}
      <div className="space-y-2.5">
        {QUESTIONS.map((q) => {
          const isYes = Boolean(screeningAnswers[q.key]);
          return (
            <div
              key={q.key}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isYes
                  ? q.isCritical
                    ? 'bg-red-950/20 border-destructive/50'
                    : 'bg-amber-950/20 border-amber-500/50'
                  : 'bg-card border-border/80'
              }`}
            >
              <div className="pr-4">
                <span className="text-xs font-medium text-foreground">{q.title}</span>
                {q.isCritical && (
                  <span className="ml-2 text-[10px] font-bold text-destructive uppercase tracking-wider">
                    [Critical Red Flag]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(q.key, false)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    !isYes
                      ? 'bg-muted text-foreground border border-border'
                      : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(q.key, true)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    isYes
                      ? q.isCritical
                        ? 'bg-red-500 text-foreground'
                        : 'bg-amber-500 text-foreground'
                      : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coach Safety Outcome Decision */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <label className="block text-xs font-semibold text-foreground">
          Your decision <span className="text-amber-600 dark:text-amber-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setScreeningOutcome('CLEARED')}
            className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
              screeningOutcome === 'CLEARED'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-border text-muted-foreground hover:border-border'
            }`}
          >
            <div className="font-semibold text-foreground mb-0.5">Cleared</div>
            <div>Full testing battery</div>
          </button>

          <button
            type="button"
            onClick={() => setScreeningOutcome('PROCEED_WITH_MODIFICATIONS')}
            className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
              screeningOutcome === 'PROCEED_WITH_MODIFICATIONS'
                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-border text-muted-foreground hover:border-border'
            }`}
          >
            <div className="font-semibold text-foreground mb-0.5">With Modifications</div>
            <div>Adjust exercises</div>
          </button>

          <button
            type="button"
            onClick={() => setScreeningOutcome('DEFER_MEDICAL_CLEARANCE')}
            className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
              screeningOutcome === 'DEFER_MEDICAL_CLEARANCE'
                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                : 'border-border text-muted-foreground hover:border-border'
            }`}
          >
            <div className="font-semibold text-foreground mb-0.5">Defer for Clearance</div>
            <div>Block physical tests</div>
          </button>

          <button
            type="button"
            onClick={() => setScreeningOutcome('STOPPED_SAFETY_CONCERNS')}
            className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
              screeningOutcome === 'STOPPED_SAFETY_CONCERNS'
                ? 'bg-destructive/20 border-destructive/40 text-destructive font-bold'
                : 'border-border text-muted-foreground hover:border-border'
            }`}
          >
            <div className="font-semibold text-foreground mb-0.5">Stop Assessment</div>
            <div>Halt session now</div>
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Notes
          </label>
          <Textarea
            value={screeningCoachNotes}
            onChange={(e) => setScreeningCoachNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Member noted mild knee ache on stairs. Cleared for box squats; avoid deep lunges."
            className="bg-muted border-border text-xs text-foreground"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Intake</span>
        </Button>

        {isTestingBlocked ? (
          <Button
            onClick={onNext}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs px-6 h-10 gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Save & defer</span>
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
