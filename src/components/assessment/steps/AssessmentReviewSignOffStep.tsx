import React from 'react';
import { Award, Package as PackageIcon, CheckCircle2, ShieldCheck, ArrowLeft, Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AssessmentSession, CapabilityMatrix } from '@/api/endpoints/assessmentApi';

interface AssessmentReviewSignOffStepProps {
  session: AssessmentSession | null;
  capabilityMatrix: CapabilityMatrix;
  consentBody: boolean;
  setConsentBody: (val: boolean) => void;
  consentPhotos: boolean;
  setConsentPhotos: (val: boolean) => void;
  consentAi: boolean;
  setConsentAi: (val: boolean) => void;
  consentSecondary: boolean;
  setConsentSecondary: (val: boolean) => void;
  memberAcknowledged: boolean;
  setMemberAcknowledged: (val: boolean) => void;
  coachStrengths: string;
  setCoachStrengths: (val: string) => void;
  coachAreasToDevelop: string;
  setCoachAreasToDevelop: (val: string) => void;
  workoutPrescription: string;
  setWorkoutPrescription: (val: string) => void;
  dietPrescription: string;
  setDietPrescription: (val: string) => void;
  reassessmentWeeks: number;
  setReassessmentWeeks: (val: number) => void;
  memberAcknowledgementName: string;
  setMemberAcknowledgementName: (val: string) => void;
  coachSignOffName: string;
  setCoachSignOffName: (val: string) => void;
  agreedFirstMilestone: string;
  setAgreedFirstMilestone: (val: string) => void;
  goalReviewDate: string;
  setGoalReviewDate: (val: string) => void;
  isApproving: boolean;
  onApproveAndSignOff: () => void;
  onPrev: () => void;
}

export const AssessmentReviewSignOffStep: React.FC<AssessmentReviewSignOffStepProps> = ({
  session,
  capabilityMatrix,
  consentBody,
  setConsentBody,
  consentPhotos,
  setConsentPhotos,
  consentAi,
  setConsentAi,
  consentSecondary,
  setConsentSecondary,
  memberAcknowledged,
  setMemberAcknowledged,
  coachStrengths,
  setCoachStrengths,
  coachAreasToDevelop,
  setCoachAreasToDevelop,
  workoutPrescription,
  setWorkoutPrescription,
  dietPrescription,
  setDietPrescription,
  reassessmentWeeks,
  setReassessmentWeeks,
  memberAcknowledgementName,
  setMemberAcknowledgementName,
  coachSignOffName,
  setCoachSignOffName,
  agreedFirstMilestone,
  setAgreedFirstMilestone,
  goalReviewDate,
  setGoalReviewDate,
  isApproving,
  onApproveAndSignOff,
  onPrev,
}) => {
  const recPkg = session?.recommended_package;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Sections 13-17
            </span>
            <h2 className="text-lg font-bold text-foreground">Review & Sign-Off</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Confirm the plan with the member, then sign off.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Needs sign-off</span>
        </div>
      </div>

      {/* Domain Capability Matrix Summary */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Capability</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {Object.entries({
            'Lower Body': capabilityMatrix.lower_body || 'Developing',
            'Upper Body': capabilityMatrix.upper_body || 'Developing',
            'Core': capabilityMatrix.core || 'Developing',
            'Balance': capabilityMatrix.balance || 'Developing',
            'Mobility': capabilityMatrix.mobility || 'Within Protocol',
            'Cardio': capabilityMatrix.cardiovascular || 'Baseline',
          }).map(([domain, status]) => (
            <div key={domain} className="p-2.5 rounded-lg bg-muted/80 border border-border/60 text-center">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">{domain}</span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Catalog Package Card */}
      {recPkg && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <PackageIcon className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Recommended package</span>
            </div>
            <span className="text-xs font-bold text-foreground px-2.5 py-1 rounded bg-muted border border-border">
              ₹{recPkg.price ? recPkg.price.toLocaleString('en-IN') : 'Custom'}
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">{recPkg.name || 'Studio Program'}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {recPkg.reason || 'Matched directly to member commitment and goal profile.'}
            </p>
          </div>
        </div>
      )}

      {/* Step 6 of 6: Explicit Opt-In Consents (Default False) */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-3.5">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Consents</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ask the member for each one. Nothing is assumed.
        </p>

        <div className="space-y-2.5">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={consentBody}
              onChange={(e) => setConsentBody(e.target.checked)}
              className="mt-0.5 accent-amber-500 rounded"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Body measurements</span>
              <p className="text-muted-foreground mt-0.5">Height, weight, waist and blood pressure.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={consentPhotos}
              onChange={(e) => setConsentPhotos(e.target.checked)}
              className="mt-0.5 accent-amber-500 rounded"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Movement photos</span>
              <p className="text-muted-foreground mt-0.5">Baseline photos, stored encrypted.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={consentAi}
              onChange={(e) => setConsentAi(e.target.checked)}
              className="mt-0.5 accent-amber-500 rounded"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Automated analysis</span>
              <p className="text-muted-foreground mt-0.5">Estimates calorie needs and posture angles.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={consentSecondary}
              onChange={(e) => setConsentSecondary(e.target.checked)}
              className="mt-0.5 accent-amber-500 rounded"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Anonymised research</span>
              <p className="text-muted-foreground mt-0.5">Optional. Anonymised, used to improve benchmarks.</p>
            </div>
          </label>
        </div>

        <div className="pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={memberAcknowledged}
              onChange={(e) => setMemberAcknowledged(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span>Member acknowledged this in person</span>
          </label>
        </div>
      </div>

      {/* Coach Prescriptions */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Prescriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Strengths</label>
            <Textarea
              value={coachStrengths}
              onChange={(e) => setCoachStrengths(e.target.value)}
              rows={2}
              placeholder="e.g. Excellent hip hinge mechanics, strong core endurance."
              className="bg-muted border-border text-xs text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Areas to Develop</label>
            <Textarea
              value={coachAreasToDevelop}
              onChange={(e) => setCoachAreasToDevelop(e.target.value)}
              rows={2}
              placeholder="e.g. Thoracic spine mobility, ankle dorsiflexion."
              className="bg-muted border-border text-xs text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Training plan</label>
            <Textarea
              value={workoutPrescription}
              onChange={(e) => setWorkoutPrescription(e.target.value)}
              rows={2}
              placeholder="e.g. 3x weekly Reformer Pilates focusing on pelvic neutral."
              className="bg-muted border-border text-xs text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nutrition plan</label>
            <Textarea
              value={dietPrescription}
              onChange={(e) => setDietPrescription(e.target.value)}
              rows={2}
              placeholder="e.g. 100g daily protein, ~2.5L water daily."
              className="bg-muted border-border text-xs text-foreground"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Reassess in (weeks)</label>
          <select
            value={reassessmentWeeks}
            onChange={(e) => setReassessmentWeeks(parseInt(e.target.value, 10))}
            className="w-48 h-9 rounded bg-muted border border-border px-3 text-xs text-foreground"
          >
            <option value={4}>4 Weeks</option>
            <option value={6}>6 Weeks (Recommended)</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
          </select>
        </div>

        {/* Section 12 closes with something concrete to work toward and a date to check it. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Agreed first milestone</label>
            <input
              value={agreedFirstMilestone}
              onChange={(e) => setAgreedFirstMilestone(e.target.value)}
              placeholder="e.g. Three sessions a week for four weeks"
              className="w-full h-9 rounded bg-muted border border-border px-3 text-xs text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Review date</label>
            <input
              type="date"
              value={goalReviewDate}
              onChange={(e) => setGoalReviewDate(e.target.value)}
              className="w-full h-9 rounded bg-muted border border-border px-3 text-xs text-foreground"
            />
          </div>
        </div>

        {/* Section 16 sign-off. Typed confirmations, stamped server-side at approval. */}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3 mt-2">
          <p className="text-xs font-semibold text-foreground">Sign-off</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Member name</label>
              <input
                value={memberAcknowledgementName}
                onChange={(e) => setMemberAcknowledgementName(e.target.value)}
                placeholder="Typed by the member"
                className="w-full h-9 rounded bg-background border border-border px-3 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Coach name</label>
              <input
                value={coachSignOffName}
                onChange={(e) => setCoachSignOffName(e.target.value)}
                placeholder="Assessing coach"
                className="w-full h-9 rounded bg-background border border-border px-3 text-xs text-foreground"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Recorded with the time of approval and the account that approved it.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Goals</span>
        </Button>
        <Button
          onClick={onApproveAndSignOff}
          disabled={isApproving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2 shadow-lg shadow-primary/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isApproving ? 'Submitting Sign-Off...' : 'Coach Approve & Unlock Screen'}</span>
        </Button>
      </div>
    </div>
  );
};
