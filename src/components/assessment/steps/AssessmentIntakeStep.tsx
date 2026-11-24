import React from 'react';
import { UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AssessmentIntakeStepProps {
  memberName: string;
  setMemberName: (val: string) => void;
  memberPhone: string;
  setMemberPhone: (val: string) => void;
  assessmentType: string;
  setAssessmentType: (val: string) => void;
  trainingExperience: string;
  setTrainingExperience: (val: string) => void;
  activityLevel: string;
  setActivityLevel: (val: string) => void;
  preferredStyle: string;
  setPreferredStyle: (val: string) => void;
  userNotes: string;
  setUserNotes: (val: string) => void;
  onNext: () => void;
}

export const AssessmentIntakeStep: React.FC<AssessmentIntakeStepProps> = ({
  memberName,
  setMemberName,
  memberPhone,
  setMemberPhone,
  assessmentType,
  setAssessmentType,
  trainingExperience,
  setTrainingExperience,
  activityLevel,
  setActivityLevel,
  preferredStyle,
  setPreferredStyle,
  userNotes,
  setUserNotes,
  onNext,
}) => {
  const isFormValid = memberName.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Section 1
            </span>
            <h2 className="text-lg font-bold text-zinc-100">Member Intake & Baseline Profile</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Capture member identity, prior training background, and training style preferences.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Coach-Led Assessment</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Member Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Member Full Name <span className="text-amber-400">*</span>
          </label>
          <Input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="h-10 bg-zinc-900 border-zinc-800 text-sm text-zinc-100 focus:border-amber-500"
          />
        </div>

        {/* Member Phone */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Mobile Number (WhatsApp Enabled)
          </label>
          <Input
            value={memberPhone}
            onChange={(e) => setMemberPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-10 bg-zinc-900 border-zinc-800 text-sm text-zinc-100 focus:border-amber-500"
          />
        </div>

        {/* Assessment Type */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Assessment Type</label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="INITIAL">Initial Baseline Assessment (New Member)</option>
            <option value="REASSESSMENT">Follow-Up Reassessment (Longitudinal)</option>
            <option value="PROGRESS_CHECK">Mid-Program Progress Check</option>
          </select>
        </div>

        {/* Training Experience */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Training Background</label>
          <select
            value={trainingExperience}
            onChange={(e) => setTrainingExperience(e.target.value)}
            className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="BEGINNER">Beginner (&lt; 6 months structured training)</option>
            <option value="INTERMEDIATE">Intermediate (6 months - 2 years consistent training)</option>
            <option value="ADVANCED">Advanced (2+ years dedicated training)</option>
            <option value="ATHLETE">Competitive / Former Athlete</option>
          </select>
        </div>

        {/* Current Activity Level */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Current Activity Level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="SEDENTARY">Sedentary (Desk work, little to no regular exercise)</option>
            <option value="LIGHTLY_ACTIVE">Lightly Active (1-2 days/week light walks or yoga)</option>
            <option value="MODERATELY_ACTIVE">Moderately Active (3-4 days/week workouts)</option>
            <option value="HIGHLY_ACTIVE">Highly Active (5-7 days/week intense training)</option>
          </select>
        </div>

        {/* Preferred Training Style */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Preferred Modality</label>
          <select
            value={preferredStyle}
            onChange={(e) => setPreferredStyle(e.target.value)}
            className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="PILATES">Pilates Reformer & Mat (Alignment & Core)</option>
            <option value="STRENGTH">Functional Strength & Resistance</option>
            <option value="HIIT_BOOTCAMP">HIIT & Metabolic Conditioning</option>
            <option value="HYBRID">Hybrid (Pilates + Strength Blend)</option>
          </select>
        </div>
      </div>

      {/* User Notes */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Intake Observations & Member Comments
        </label>
        <Textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Member noted tightness in upper traps from laptop posture; interested in improving core engagement."
          className="bg-zinc-900 border-zinc-800 text-sm text-zinc-100"
        />
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <Button
          onClick={onNext}
          disabled={!isFormValid}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-6 h-10 gap-2"
        >
          <span>Continue to Safety Gate</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
