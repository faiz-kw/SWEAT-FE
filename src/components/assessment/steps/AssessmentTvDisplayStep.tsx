import React from 'react';
import { Tv, Sparkles, CheckCircle2, RotateCcw, Package as PackageIcon, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssessmentSession } from '@/api/endpoints/assessmentApi';

interface AssessmentTvDisplayStepProps {
  session: AssessmentSession | null;
  onNewSession: () => void;
}

export const AssessmentTvDisplayStep: React.FC<AssessmentTvDisplayStepProps> = ({
  session,
  onNewSession,
}) => {
  const recPkg = session?.recommended_package;
  const matrix = session?.capability_matrix || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mirror Mode Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 border border-amber-500/30 text-center space-y-3 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Assessment Approved & Unlocked for Studio TV</span>
        </div>
        <h2 className="text-2xl font-black text-zinc-100 tracking-tight">
          Studio Screen Mirror Active
        </h2>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Presentation data is now live. Enter the 6-digit pairing code on the studio wall screen to mirror this report.
        </p>

        {session?.pairing_code && (
          <div className="inline-block py-3 px-6 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner">
            <span className="text-xs text-zinc-400 block mb-1">Studio Pairing Code</span>
            <span className="text-3xl font-mono font-bold tracking-widest text-amber-400">
              {session.pairing_code}
            </span>
          </div>
        )}
      </div>

      {/* Presentation Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Member Outcome Summary */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-zinc-200">
            <Target className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Member Roadmap</h3>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Member Name</span>
            <div className="text-base font-bold text-zinc-100">{session?.member_name || 'Member'}</div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Primary Target</span>
            <div className="text-sm font-semibold text-amber-400">{session?.target_goal || 'Posture Alignment'}</div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Target Timeline & Commitment</span>
            <div className="text-xs text-zinc-300">
              {session?.target_timeline_weeks || 12} Weeks ({session?.weekly_frequency_days || 3}x weekly workouts)
            </div>
          </div>
        </div>

        {/* Tailored Studio Package */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-zinc-200">
            <PackageIcon className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Approved Program</h3>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Prescribed Package</span>
            <div className="text-base font-bold text-zinc-100">{recPkg?.name || 'Studio Program'}</div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Included Sessions</span>
            <div className="text-sm font-semibold text-emerald-400">{recPkg?.session_units || 72} Sessions</div>
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Total Investment</span>
            <div className="text-xs text-zinc-300">₹{recPkg?.price ? recPkg.price.toLocaleString('en-IN') : 'Custom'}</div>
          </div>
        </div>
      </div>

      {/* Capability Matrix */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Validated Movement Baseline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {Object.entries({
            'Lower Body': matrix.lower_body || 'Developing',
            'Upper Body': matrix.upper_body || 'Developing',
            'Core': matrix.core || 'Developing',
            'Balance': matrix.balance || 'Developing',
            'Mobility': matrix.mobility || 'Within Protocol',
            'Cardio': matrix.cardiovascular || 'Baseline',
          }).map(([k, v]) => (
            <div key={k} className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-center">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">{k}</span>
              <span className="text-xs font-semibold text-amber-400">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action to Start New Session */}
      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <Button
          onClick={onNewSession}
          variant="outline"
          className="text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Start Another Assessment</span>
        </Button>
      </div>
    </div>
  );
};
