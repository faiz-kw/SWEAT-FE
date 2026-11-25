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
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 1 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Member Profile</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Who they are and how they train today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Coach-led</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Member Name */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Full name <span className="text-amber-600 dark:text-amber-400">*</span>
          </label>
          <Input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="h-10 bg-card border-border text-sm text-foreground focus:border-amber-500"
          />
        </div>

        {/* Member Phone */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Mobile number
          </label>
          <Input
            value={memberPhone}
            onChange={(e) => setMemberPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-10 bg-card border-border text-sm text-foreground focus:border-amber-500"
          />
        </div>

        {/* Assessment Type */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Assessment Type</label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            className="w-full h-10 rounded-md bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:border-amber-500"
          >
            <option value="INITIAL">Initial baseline</option>
            <option value="REASSESSMENT">Reassessment</option>
            <option value="PROGRESS_CHECK">Progress check</option>
          </select>
        </div>

        {/* Training Experience */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Training experience</label>
          <select
            value={trainingExperience}
            onChange={(e) => setTrainingExperience(e.target.value)}
            className="w-full h-10 rounded-md bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:border-amber-500"
          >
            <option value="BEGINNER">Beginner — under 6 months</option>
            <option value="INTERMEDIATE">Intermediate — 6 months to 2 years</option>
            <option value="ADVANCED">Advanced — 2 years or more</option>
            <option value="ATHLETE">Athlete</option>
          </select>
        </div>

        {/* Current Activity Level */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Current Activity Level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full h-10 rounded-md bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:border-amber-500"
          >
            <option value="SEDENTARY">Sedentary — desk work</option>
            <option value="LIGHTLY_ACTIVE">Lightly active — 1–2 days a week</option>
            <option value="MODERATELY_ACTIVE">Moderately active — 3–4 days a week</option>
            <option value="HIGHLY_ACTIVE">Highly active — 5 or more days a week</option>
          </select>
        </div>

        {/* Preferred Training Style */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Preferred training</label>
          <select
            value={preferredStyle}
            onChange={(e) => setPreferredStyle(e.target.value)}
            className="w-full h-10 rounded-md bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:border-amber-500"
          >
            <option value="PILATES">Pilates</option>
            <option value="STRENGTH">Strength</option>
            <option value="HIIT_BOOTCAMP">Conditioning</option>
            <option value="HYBRID">Mixed</option>
          </select>
        </div>
      </div>

      {/* User Notes */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Notes
        </label>
        <Textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Member noted tightness in upper traps from laptop posture; interested in improving core engagement."
          className="bg-card border-border text-sm text-foreground"
        />
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={onNext}
          disabled={!isFormValid}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
