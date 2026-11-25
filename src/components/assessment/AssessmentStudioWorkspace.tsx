import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import {
  assessmentApi,
  type AssessmentSession,
  type HealthScreeningData,
  type FunctionalTestsPayload,
  type ProvenanceTag,
  type SymptomRecord,
} from '@/api/endpoints/assessmentApi';

import { AssessmentIntakeStep } from './steps/AssessmentIntakeStep';
import type { SelectedMember } from './shared/MemberPicker';
import { AssessmentSafetyGateStep } from './steps/AssessmentSafetyGateStep';
import { AssessmentVitalsStep } from './steps/AssessmentVitalsStep';
import { AssessmentMovementStep } from './steps/AssessmentMovementStep';
import { AssessmentGoalsStep } from './steps/AssessmentGoalsStep';
import { AssessmentReviewSignOffStep } from './steps/AssessmentReviewSignOffStep';
import { AssessmentTvDisplayStep } from './steps/AssessmentTvDisplayStep';

export type AssessmentStep = 'intake' | 'safety_gate' | 'vitals' | 'movement' | 'goals' | 'review' | 'tv_display';

export const AssessmentStudioWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('intake');
  const [memberAcknowledgementName, setMemberAcknowledgementName] = useState('');
  const [coachSignOffName, setCoachSignOffName] = useState('');
  const [agreedFirstMilestone, setAgreedFirstMilestone] = useState('');
  const [goalReviewDate, setGoalReviewDate] = useState('');
  const [consentImageGeneration, setConsentImageGeneration] = useState(false);

  // Picking from the directory links the assessment to a real member and carries across the
  // details the record needs, including the date of birth and sex the metabolic equation
  // takes. Manual entry stays available for a walk-in who is not in the system.
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  const handleSelectMember = (member: SelectedMember | null) => {
    setSelectedMember(member);
    if (member) {
      setMemberName(member.name);
      setMemberPhone(member.phone || '');
    }
  };
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null);

  // Profile & Intake
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('+91');
  const [assessmentType, setAssessmentType] = useState('INITIAL');
  const [trainingExperience, setTrainingExperience] = useState('BEGINNER');
  const [activityLevel, setActivityLevel] = useState('MODERATELY_ACTIVE');
  const [preferredStyle, setPreferredStyle] = useState('PILATES');
  const [userNotes, setUserNotes] = useState('');

  // Health Screening (PAR-Q)
  const [screeningAnswers, setScreeningAnswers] = useState<HealthScreeningData>({
    heart_condition: false, chest_pain_activity: false, chest_pain_rest: false,
    dizziness_loss_of_balance: false, bone_joint_problem: false, blood_pressure_medication: false,
    unexplained_shortness_of_breath: false, recent_surgery_injury: false,
    pregnancy_or_postpartum: false, other_medical_condition: false,
  });
  const [screeningOutcome, setScreeningOutcome] = useState('CLEARED');
  const [screeningCoachNotes, setScreeningCoachNotes] = useState('');

  // Vitals & Metrics (Empty Defaults)
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [waistCm, setWaistCm] = useState<number | null>(null);
  const [restingHr, setRestingHr] = useState<number | null>(null);
  const [restingBp, setRestingBp] = useState<string>('');
  const [provenance, setProvenance] = useState<Record<string, ProvenanceTag>>({
    height: 'MEASURED', weight: 'MEASURED', waist: 'MEASURED', resting_hr: 'MEASURED', resting_bp: 'MEASURED',
  });

  // Movement & Decoupled Symptoms
  const [functionalTests, setFunctionalTests] = useState<FunctionalTestsPayload>({});
  const [symptoms, setSymptoms] = useState<Record<string, SymptomRecord>>({});

  // Goals
  const [targetGoal, setTargetGoal] = useState('POSTURE_ALIGNMENT');
  const [customGoalOutcome, setCustomGoalOutcome] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number>(12);
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(3);
  const [perceivedBarrier, setPerceivedBarrier] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(8);

  // Consents & Sign-off
  const [consentBody, setConsentBody] = useState(false);
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [consentSecondary, setConsentSecondary] = useState(false);

  // Consents are part of the record, not a local preference. Ticking one has to reach the
  // server, otherwise the transformation endpoint keeps refusing against the stored value
  // while the checkbox on screen says otherwise.
  const persistConsents = React.useCallback(
    (overrides: Record<string, boolean> = {}) => {
      if (!activeSession?.id) return;
      const payload = {
        consent_body_measurements: consentBody,
        consent_movement_photos: consentPhotos,
        consent_ai_analysis: consentAi,
        consent_secondary_use: consentSecondary,
        consent_image_generation: consentImageGeneration,
        ...overrides,
      };
      assessmentApi
        .updateAssessment(activeSession.id, payload as any)
        .then((fresh) => setActiveSession(fresh))
        .catch(() => toast.error('Could not save the consent change.'));
    },
    [activeSession?.id, consentBody, consentPhotos, consentAi, consentSecondary, consentImageGeneration],
  );

  const [memberAcknowledged, setMemberAcknowledged] = useState(false);
  const [coachStrengths, setCoachStrengths] = useState('');
  const [coachAreasToDevelop, setCoachAreasToDevelop] = useState('');
  const [workoutPrescription, setWorkoutPrescription] = useState('');
  const [dietPrescription, setDietPrescription] = useState('');
  const [reassessmentWeeks, setReassessmentWeeks] = useState(6);

  const startSessionMutation = useMutation({
    mutationFn: () => assessmentApi.startAssessment({
      member_name: selectedMember?.name || memberName,
      member_phone: selectedMember?.phone || memberPhone,
      ...(selectedMember?.user_profile_id ? { user_profile_id: selectedMember.user_profile_id } : {}),
      ...(selectedMember?.branch_id ? { branch_id: selectedMember.branch_id } : {}),
      ...(selectedMember?.date_of_birth ? { member_date_of_birth: selectedMember.date_of_birth } : {}),
      ...(selectedMember?.gender ? { member_sex: String(selectedMember.gender).toUpperCase() } : {}),
      assessment_type: assessmentType,
      training_experience: trainingExperience, current_activity_level: activityLevel,
      preferred_training_style: preferredStyle, target_goal: targetGoal, stated_goal_outcome: customGoalOutcome,
      target_timeline_weeks: durationWeeks, target_timeline_months: Math.max(1, Math.round(durationWeeks / 4.33)),
      weekly_frequency_days: weeklyFrequency, perceived_barrier: perceivedBarrier,
      member_confidence_score: confidenceScore, user_notes: userNotes, health_screening: screeningAnswers,
      screening_outcome: screeningOutcome, screening_coach_notes: screeningCoachNotes, measured_height_cm: heightCm,
      measured_weight_kg: weightKg, waist_circumference_cm: waistCm, resting_heart_rate_bpm: restingHr,
      resting_blood_pressure: restingBp, functional_tests_payload: functionalTests,
      symptoms_and_safety_events: symptoms, consent_body_measurements: consentBody,
      consent_movement_photos: consentPhotos, consent_ai_analysis: consentAi, consent_secondary_use: consentSecondary,
      consent_image_generation: consentImageGeneration,
    }),
    onSuccess: (data) => {
      setActiveSession(data);
      if (data.status === 'DEFERRED' || data.status === 'CANCELLED') {
        toast.error(`Assessment ${data.status}: Physical movement testing halted per Safety Gate.`);
        setCurrentStep('tv_display');
      } else {
        toast.success('Assessment intake initialized.');
        setCurrentStep('vitals');
      }
    },
    onError: () => toast.error('Failed to initialize assessment session.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error('No active session.');
      return assessmentApi.approveAndSend(activeSession.id, {
        coach_notes: `${coachStrengths} | ${coachAreasToDevelop}`.trim(),
        workout_prescription: workoutPrescription, diet_prescription: dietPrescription,
        reassessment_interval_weeks: reassessmentWeeks,
        member_acknowledgement_name: memberAcknowledgementName,
        coach_sign_off_name: coachSignOffName,
        agreed_first_milestone: agreedFirstMilestone,
        ...(goalReviewDate ? { goal_review_date: goalReviewDate } : {}),
      });
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment approved. Studio TV display unlocked.');
      setCurrentStep('tv_display');
    },
    onError: () => toast.error('Approval failed. Staff role required.'),
  });

  const resetAll = () => {
    setActiveSession(null); setCurrentStep('intake'); setMemberName(''); setMemberPhone('+91');
    setHeightCm(null); setWeightKg(null); setWaistCm(null); setRestingHr(null); setRestingBp('');
    setFunctionalTests({}); setSymptoms({}); setConsentBody(false); setConsentPhotos(false);
    setConsentAi(false); setConsentSecondary(false);
  };

  const stepsList: Array<{ id: AssessmentStep; label: string }> = [
    { id: 'intake', label: '1. Intake' }, { id: 'safety_gate', label: '2. Safety Gate' },
    { id: 'vitals', label: '3. Vitals' }, { id: 'movement', label: '4. Movement' },
    { id: 'goals', label: '5. Goals' }, { id: 'review', label: '6. Sign-Off' },
    { id: 'tv_display', label: '7. Studio TV' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Assessment Studio Workspace"
        description="Standardized 17-section functional movement assessment, safety readiness gate & clinical roadmap."
      />
      <PageBody>
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-border">
            {stepsList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg transition-all ${
                  currentStep === s.id ? 'bg-amber-500 text-foreground shadow-md shadow-amber-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {currentStep === 'intake' && (
          <AssessmentIntakeStep
            selectedMember={selectedMember} onSelectMember={handleSelectMember}
            manualEntry={manualEntry} setManualEntry={setManualEntry}
            memberName={memberName} setMemberName={setMemberName} memberPhone={memberPhone} setMemberPhone={setMemberPhone}
            assessmentType={assessmentType} setAssessmentType={setAssessmentType} trainingExperience={trainingExperience}
            setTrainingExperience={setTrainingExperience} activityLevel={activityLevel} setActivityLevel={setActivityLevel}
            preferredStyle={preferredStyle} setPreferredStyle={setPreferredStyle} userNotes={userNotes} setUserNotes={setUserNotes}
            onNext={() => setCurrentStep('safety_gate')}
          />
        )}
        {currentStep === 'safety_gate' && (
          <AssessmentSafetyGateStep
            screeningAnswers={screeningAnswers} setScreeningAnswers={setScreeningAnswers}
            screeningOutcome={screeningOutcome} setScreeningOutcome={setScreeningOutcome}
            screeningCoachNotes={screeningCoachNotes} setScreeningCoachNotes={setScreeningCoachNotes}
            onPrev={() => setCurrentStep('intake')}
            onNext={() => {
              // The record is created once screening is done, whatever the outcome. It used
              // to be created only when screening deferred or stopped, so on the normal
              // cleared path there was no assessment to attach anything to: captures could
              // not upload and the body scan could never run.
              if (activeSession) {
                const halted = screeningOutcome === 'DEFER_MEDICAL_CLEARANCE'
                  || screeningOutcome === 'STOPPED_SAFETY_CONCERNS';
                setCurrentStep(halted ? 'tv_display' : 'vitals');
              } else {
                startSessionMutation.mutate();
              }
            }}
          />
        )}
        {currentStep === 'vitals' && (
          <AssessmentVitalsStep
            assessmentId={activeSession?.id ?? null}
            heightCm={heightCm} setHeightCm={setHeightCm} weightKg={weightKg} setWeightKg={setWeightKg}
            waistCm={waistCm} setWaistCm={setWaistCm} restingHr={restingHr} setRestingHr={setRestingHr}
            restingBp={restingBp} setRestingBp={setRestingBp} provenance={provenance} setProvenance={setProvenance}
            onPrev={() => setCurrentStep('safety_gate')} onNext={() => setCurrentStep('movement')}
          />
        )}
        {currentStep === 'movement' && (
          <AssessmentMovementStep
            tests={functionalTests} setTests={setFunctionalTests} symptoms={symptoms} setSymptoms={setSymptoms}
            onPrev={() => setCurrentStep('vitals')} onNext={() => setCurrentStep('goals')}
          />
        )}
        {currentStep === 'goals' && (
          <AssessmentGoalsStep
            targetGoal={targetGoal} setTargetGoal={setTargetGoal} customGoalOutcome={customGoalOutcome}
            setCustomGoalOutcome={setCustomGoalOutcome} durationWeeks={durationWeeks} setDurationWeeks={setDurationWeeks}
            weeklyFrequency={weeklyFrequency} setWeeklyFrequency={setWeeklyFrequency} perceivedBarrier={perceivedBarrier}
            setPerceivedBarrier={setPerceivedBarrier} confidenceScore={confidenceScore} setConfidenceScore={setConfidenceScore}
            onPrev={() => setCurrentStep('movement')}
            onNext={() => {
              if (!activeSession) startSessionMutation.mutate();
              setCurrentStep('review');
            }}
          />
        )}
        {currentStep === 'review' && (
          <AssessmentReviewSignOffStep
            session={activeSession} capabilityMatrix={activeSession?.capability_matrix || {}}
            consentBody={consentBody} setConsentBody={setConsentBody} consentPhotos={consentPhotos} setConsentPhotos={setConsentPhotos}
            consentAi={consentAi} setConsentAi={setConsentAi} consentSecondary={consentSecondary} setConsentSecondary={setConsentSecondary}
            memberAcknowledged={memberAcknowledged} setMemberAcknowledged={setMemberAcknowledged}
            coachStrengths={coachStrengths} setCoachStrengths={setCoachStrengths} coachAreasToDevelop={coachAreasToDevelop}
            setCoachAreasToDevelop={setCoachAreasToDevelop} workoutPrescription={workoutPrescription}
            setWorkoutPrescription={setWorkoutPrescription} dietPrescription={dietPrescription}
            setDietPrescription={setDietPrescription} reassessmentWeeks={reassessmentWeeks} setReassessmentWeeks={setReassessmentWeeks}
            consentImageGeneration={consentImageGeneration}
            setConsentImageGeneration={(v: boolean) => { setConsentImageGeneration(v); persistConsents({ consent_image_generation: v }); }}
            memberAcknowledgementName={memberAcknowledgementName} setMemberAcknowledgementName={setMemberAcknowledgementName}
            coachSignOffName={coachSignOffName} setCoachSignOffName={setCoachSignOffName}
            agreedFirstMilestone={agreedFirstMilestone} setAgreedFirstMilestone={setAgreedFirstMilestone}
            goalReviewDate={goalReviewDate} setGoalReviewDate={setGoalReviewDate}
            isApproving={approveMutation.isPending} onApproveAndSignOff={() => approveMutation.mutate()} onPrev={() => setCurrentStep('goals')}
          />
        )}
        {currentStep === 'tv_display' && (
          <AssessmentTvDisplayStep session={activeSession} onNewSession={resetAll} />
        )}
      </PageBody>
    </div>
  );
};
