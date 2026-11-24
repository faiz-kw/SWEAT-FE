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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Section 12
            </span>
            <h2 className="text-lg font-bold text-zinc-100">Member Goals & Commitment Framework</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Establish the member's target outcome, realistic timeline, and attendance commitment.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Target className="w-4 h-4 text-amber-400" />
          <span>Outcome Alignment</span>
        </div>
      </div>

      {/* Primary Goal Selector */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-zinc-300">
          Primary Transformation Target <span className="text-amber-400">*</span>
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
                    ? 'bg-amber-500/10 border-amber-500 text-zinc-100 shadow-md shadow-amber-500/5'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-zinc-200'} mb-1`}>
                  {g.label}
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">{g.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stated Goal in Member's Own Words */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Stated Goal Outcome (Member's Exact Words)
        </label>
        <Textarea
          value={customGoalOutcome}
          onChange={(e) => setCustomGoalOutcome(e.target.value)}
          rows={2}
          placeholder="e.g. Relieve neck and shoulder stiffness, tone core, and feel energized without fatigue."
          className="bg-zinc-900 border-zinc-800 text-sm text-zinc-100"
        />
      </div>

      {/* Timeline & Commitment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Commitment Timeline (Weeks)
          </label>
          <select
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10))}
            className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-xs text-zinc-200"
          >
            <option value={6}>6 Weeks (Kickstart Baseline)</option>
            <option value={12}>12 Weeks (Quarterly Recomposition)</option>
            <option value={24}>24 Weeks (Full Transformation Cycle)</option>
            <option value={52}>52 Weeks (Yearly Progression)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Weekly Frequency (Days / Week)
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWeeklyFrequency(d)}
                className={`flex-1 h-10 rounded-md text-xs font-bold border transition-all ${
                  weeklyFrequency === d
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {d}x / week
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Perceived Barriers & Obstacles
          </label>
          <Input
            value={perceivedBarrier}
            onChange={(e) => setPerceivedBarrier(e.target.value)}
            placeholder="e.g. Busy work schedule, travel, or past knee injury"
            className="h-10 bg-zinc-800 border-zinc-700 text-xs text-zinc-100"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-zinc-300">
              Member Confidence Score (1 - 10)
            </label>
            <span className="text-xs font-bold text-amber-400">{confidenceScore} / 10</span>
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
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-zinc-400 gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Movement Tests</span>
        </Button>
        <Button
          onClick={onNext}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-6 h-10 gap-2"
        >
          <span>Review & Consents</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
