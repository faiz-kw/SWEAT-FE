import React from 'react';
import { Target, ArrowRight, ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AssessmentGoalsStepProps {
  targetGoal: string;
  setTargetGoal: (val: string) => void;
  customGoalOutcome: string;
  setCustomGoalOutcome: (val: string) => void;
  durationWeeks: number;
  setDurationWeeks: (val: number) => void;
  weeklyFrequency: number;
  setWeeklyFrequency: (val: number) => void;
  perceivedBarrier: string;
  setPerceivedBarrier: (val: string) => void;
  confidenceScore: number;
  setConfidenceScore: (val: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const GOALS = [
  { id: 'POSTURE_ALIGNMENT', label: 'Posture & Spinal Alignment', desc: 'Pilates reform, core de-rotation, and pelvic neutral.' },
  { id: 'FAT_LOSS', label: 'Fat Loss & Recomposition', desc: 'Metabolic conditioning with lean muscle preservation.' },
  { id: 'STRENGTH_CONDITIONING', label: 'Functional Strength & Conditioning', desc: 'Progressive overload across primary movement patterns.' },
  { id: 'HYPERTROPHY_GLUTES', label: 'Hypertrophy (Glutes & Lower Body)', desc: 'Targeted resistance training for lower body development.' },
];

export const AssessmentGoalsStep: React.FC<AssessmentGoalsStepProps> = ({
  targetGoal,
  setTargetGoal,
  customGoalOutcome,
  setCustomGoalOutcome,
  durationWeeks,
  setDurationWeeks,
  weeklyFrequency,
  setWeeklyFrequency,
  perceivedBarrier,
  setPerceivedBarrier,
  confidenceScore,
  setConfidenceScore,
  onPrev,
  onNext,
}) => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 5 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Goals</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            What they want, and what they can commit to.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Goals</span>
        </div>
      </div>

      {/* Primary Goal Selector */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Primary goal <span className="text-amber-600 dark:text-amber-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOALS.map((g) => {
            const isSelected = targetGoal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setTargetGoal(g.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-foreground shadow-md shadow-amber-500/5'
                    : 'bg-card border-border text-muted-foreground hover:border-border'
                }`}
              >
                <div className={`text-xs font-bold ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'} mb-1`}>
                  {g.label}
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">{g.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stated Goal in Member's Own Words */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          In the member's words
        </label>
        <Textarea
          value={customGoalOutcome}
          onChange={(e) => setCustomGoalOutcome(e.target.value)}
          rows={2}
          placeholder="e.g. Relieve neck and shoulder stiffness, tone core, and feel energized without fatigue."
          className="bg-card border-border text-sm text-foreground"
        />
      </div>

      {/* Timeline & Commitment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-card border border-border">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Timeline (weeks)
          </label>
          <select
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10))}
            className="w-full h-10 rounded-md bg-muted border border-border px-3 text-xs text-foreground"
          >
            <option value={6}>6 Weeks (Kickstart Baseline)</option>
            <option value={12}>12 Weeks (Quarterly Recomposition)</option>
            <option value={24}>24 Weeks (Full Transformation Cycle)</option>
            <option value={52}>52 Weeks (Yearly Progression)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Sessions per week
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWeeklyFrequency(d)}
                className={`flex-1 h-10 rounded-md text-xs font-bold border transition-all ${
                  weeklyFrequency === d
                    ? 'bg-amber-500 text-foreground border-amber-500'
                    : 'bg-muted text-muted-foreground border-border hover:border-border-strong'
                }`}
              >
                {d}x / week
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Main barrier
          </label>
          <Input
            value={perceivedBarrier}
            onChange={(e) => setPerceivedBarrier(e.target.value)}
            placeholder="e.g. Busy work schedule, travel, or past knee injury"
            className="h-10 bg-muted border-border text-xs text-foreground"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Confidence (1–10)
            </label>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{confidenceScore} / 10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={confidenceScore}
            onChange={(e) => setConfidenceScore(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={onNext}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
