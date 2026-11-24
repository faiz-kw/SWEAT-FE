import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Award, Calendar, AlertCircle, ShieldCheck } from 'lucide-react';
import { TestProgressionRecord, assessmentApi } from '@/api/endpoints/assessmentApi';
import { toast } from 'sonner';

interface IndividualProgressionCardProps {
  progression: TestProgressionRecord;
  onApproved?: (updated: TestProgressionRecord) => void;
  isCoach?: boolean;
}

export const IndividualProgressionCard: React.FC<IndividualProgressionCardProps> = ({
  progression,
  onApproved,
  isCoach = true,
}) => {
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [nextVariation, setNextVariation] = useState(progression.next_progression_target || '');
  const [criteriaNotes, setCriteriaNotes] = useState('');
  const [reviewDate, setReviewDate] = useState(progression.review_date || '');
  const [submitting, setSubmitting] = useState(false);

  const isApproved = Boolean(progression.coach_approved_by);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextVariation.trim()) {
      toast.error('Please specify the next target variation.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: { next_variation: string; criteria_met_notes?: string | undefined; review_date?: string | undefined } = {
        next_variation: nextVariation.trim(),
        criteria_met_notes: criteriaNotes.trim() ? criteriaNotes.trim() : undefined,
        review_date: reviewDate ? reviewDate : undefined,
      };
      const updated = await assessmentApi.approveTestProgression(progression.id, payload);
      toast.success(`Approved progression for ${progression.exercise_name}`);
      setShowApprovalForm(false);
      onApproved?.(updated);
    } catch {
      toast.error('Failed to record progression approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/70 p-5 shadow-lg backdrop-blur-md transition hover:border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{progression.exercise_name}</h3>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertCircle className="h-3 w-3" /> Pending Evaluation
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Exercise progression</p>
        </div>

        {isCoach && !isApproved && (
          <button
            type="button"
            onClick={() => setShowApprovalForm(!showApprovalForm)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-emerald-500 active:scale-95"
          >
            {showApprovalForm ? 'Cancel' : 'Approve Next Step'}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/80 bg-background/50 p-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current Variation</span>
          <p className="mt-0.5 text-sm font-medium text-foreground">{progression.current_variation}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {progression.current_reps_or_duration && <span>Reps: {progression.current_reps_or_duration}</span>}
            {progression.current_load_kg != null && <span>Load: {progression.current_load_kg} kg</span>}
            {progression.current_assistance && <span>Assist: {progression.current_assistance}</span>}
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-background/50 p-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Next variation</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
            <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{progression.next_progression_target || 'Target to be prescribed'}</span>
          </div>
          {progression.review_date && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Review: {progression.review_date}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {progression.movement_quality && (
          <div className="flex items-start gap-2">
            <Award className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span><strong className="text-foreground">Quality Rubric:</strong> {progression.movement_quality}</span>
          </div>
        )}
        {progression.progression_criteria && (
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span><strong className="text-foreground">Criteria:</strong> {progression.progression_criteria}</span>
          </div>
        )}
        {progression.coach_approved_by_name && (
          <p className="text-[11px] text-muted-foreground">
            Approved by Coach: <span className="text-muted-foreground">{progression.coach_approved_by_name}</span>
          </p>
        )}
      </div>

      {showApprovalForm && (
        <form onSubmit={handleApprove} className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Sign off progression
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">Next variation *</label>
              <input
                type="text"
                required
                value={nextVariation}
                onChange={(e) => setNextVariation(e.target.value)}
                placeholder="e.g. Standard Floor Push-Up"
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">Target Review Date</label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground">Notes</label>
            <input
              type="text"
              value={criteriaNotes}
              onChange={(e) => setCriteriaNotes(e.target.value)}
              placeholder="e.g. 3 sets of 12 reps completed with neutral spine & zero elbow flare"
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowApprovalForm(false)}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-1 text-xs font-medium text-foreground hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Authorize Advancement'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
