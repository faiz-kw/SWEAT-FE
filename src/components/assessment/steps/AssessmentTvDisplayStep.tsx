import React from 'react';
import { Tv, Sparkles, CheckCircle2, RotateCcw, Package as PackageIcon, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransformationPreviewPanel } from '../TransformationPreviewPanel';
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
    <div className="space-y-6 max-w-4xl">
      {/* Mirror Mode Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-amber-500/10 border border-amber-500/30 text-center space-y-3 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved</span>
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          Studio screen ready
        </h2>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          Enter this code on the studio screen to show the report.
        </p>

        {session?.pairing_code && (
          <div className="inline-block py-3 px-6 rounded-xl bg-background border border-border shadow-inner">
            <span className="text-xs text-muted-foreground block mb-1">Pairing code</span>
            <span className="text-3xl font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400">
              {session.pairing_code}
            </span>
          </div>
        )}
      </div>

      {/* Presentation Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Member Outcome Summary */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Member Roadmap</h3>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Member Name</span>
            <div className="text-base font-bold text-foreground">{session?.member_name || 'Member'}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Primary Target</span>
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">{session?.target_goal || 'Posture Alignment'}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Timeline</span>
            <div className="text-xs text-muted-foreground">
              {session?.target_timeline_weeks || 12} Weeks ({session?.weekly_frequency_days || 3}x weekly workouts)
            </div>
          </div>
        </div>

        {/* Tailored Studio Package */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <PackageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Programme</h3>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Package</span>
            <div className="text-base font-bold text-foreground">{recPkg?.name || 'Studio Program'}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Sessions</span>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{recPkg?.session_units || 72} Sessions</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Price</span>
            <div className="text-xs text-muted-foreground">₹{recPkg?.price ? recPkg.price.toLocaleString('en-IN') : 'Custom'}</div>
          </div>
        </div>
      </div>

      {/* Capability Matrix */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Movement baseline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {/* A domain with no data reads "Not assessed". Defaulting to a flattering label
              here would undo the backend's refusal to invent one. */}
          {Object.entries({
            'Lower Body': matrix.lower_body,
            'Upper Body': matrix.upper_body,
            'Core': matrix.core,
            'Balance': matrix.balance,
            'Mobility': matrix.mobility,
            'Cardio': matrix.cardiovascular,
            'Functional': matrix.functional_movement,
          }).map(([k, v]) => {
            const assessed = !!v && v !== 'Not assessed';
            return (
              <div key={k} className="p-2.5 rounded-lg bg-muted border border-border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">{k}</span>
                <span className={`text-xs font-semibold ${assessed ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {v || 'Not assessed'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Starting point beside the illustrated milestones, labelled as a simulation. */}
      {session?.id && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <TransformationPreviewPanel
            assessmentId={session.id}
            baselineUrl={(session as any)?.photos?.front || session.photo_front_url}
            consentGiven={!!(session as any)?.consent_image_generation}
          />
        </div>
      )}

      {/* Action to Start New Session */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={onNewSession}
          variant="outline"
          className="text-xs border-border text-foreground hover:bg-muted gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New assessment</span>
        </Button>
      </div>
    </div>
  );
};
