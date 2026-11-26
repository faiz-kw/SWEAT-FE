import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

// The whole intake lives in memory, so a refresh or an accidental navigation used to wipe it.
// We keep a local draft so a coach can pick up exactly where they left off.
const ASSESSMENT_DRAFT_KEY = 'sweat_assessment_draft_v1';

export const AssessmentStudioWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const clearAssessmentDraft = React.useCallback(() => {
    try { localStorage.removeItem(ASSESSMENT_DRAFT_KEY); } catch { /* storage unavailable */ }
  }, []);
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
      clearAssessmentDraft();
      toast.success('Assessment approved. Studio TV display unlocked.');
      setCurrentStep('tv_display');
    },
    onError: () => toast.error('Approval failed. Staff role required.'),
  });

  const resetAll = () => {
    clearAssessmentDraft();
    setResumableDraft(null);
    setActiveSession(null); setCurrentStep('intake'); setMemberName(''); setMemberPhone('+91');
    setHeightCm(null); setWeightKg(null); setWaistCm(null); setRestingHr(null); setRestingBp('');
    setFunctionalTests({}); setSymptoms({}); setConsentBody(false); setConsentPhotos(false);
    setConsentAi(false); setConsentSecondary(false);
  };

  // A saved draft is OFFERED as an explicit "Resume", never auto-filled — otherwise opening
  // "New Assessment" would show the last member's data. A remount cannot tell "new" from
  // "returned after a refresh", so we always ask rather than guess.
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [resumableDraft, setResumableDraft] = useState<any | null>(null);

  const applyDraft = (d: any) => {
        if (d.currentStep) setCurrentStep(d.currentStep);
        if (d.activeSession) setActiveSession(d.activeSession);
        if (d.selectedMember) setSelectedMember(d.selectedMember);
        if (d.manualEntry != null) setManualEntry(d.manualEntry);
        if (d.memberName != null) setMemberName(d.memberName);
        if (d.memberPhone != null) setMemberPhone(d.memberPhone);
        if (d.assessmentType) setAssessmentType(d.assessmentType);
        if (d.trainingExperience) setTrainingExperience(d.trainingExperience);
        if (d.activityLevel) setActivityLevel(d.activityLevel);
        if (d.preferredStyle) setPreferredStyle(d.preferredStyle);
        if (d.userNotes != null) setUserNotes(d.userNotes);
        if (d.screeningAnswers) setScreeningAnswers(d.screeningAnswers);
        if (d.screeningOutcome) setScreeningOutcome(d.screeningOutcome);
        if (d.screeningCoachNotes != null) setScreeningCoachNotes(d.screeningCoachNotes);
        if (d.heightCm !== undefined) setHeightCm(d.heightCm);
        if (d.weightKg !== undefined) setWeightKg(d.weightKg);
        if (d.waistCm !== undefined) setWaistCm(d.waistCm);
        if (d.restingHr !== undefined) setRestingHr(d.restingHr);
        if (d.restingBp != null) setRestingBp(d.restingBp);
        if (d.provenance) setProvenance(d.provenance);
        if (d.functionalTests) setFunctionalTests(d.functionalTests);
        if (d.symptoms) setSymptoms(d.symptoms);
        if (d.targetGoal) setTargetGoal(d.targetGoal);
        if (d.customGoalOutcome != null) setCustomGoalOutcome(d.customGoalOutcome);
        if (d.durationWeeks != null) setDurationWeeks(d.durationWeeks);
        if (d.weeklyFrequency != null) setWeeklyFrequency(d.weeklyFrequency);
        if (d.perceivedBarrier != null) setPerceivedBarrier(d.perceivedBarrier);
        if (d.confidenceScore != null) setConfidenceScore(d.confidenceScore);
        if (d.consentBody != null) setConsentBody(d.consentBody);
        if (d.consentPhotos != null) setConsentPhotos(d.consentPhotos);
        if (d.consentAi != null) setConsentAi(d.consentAi);
        if (d.consentSecondary != null) setConsentSecondary(d.consentSecondary);
        if (d.consentImageGeneration != null) setConsentImageGeneration(d.consentImageGeneration);
        if (d.memberAcknowledged != null) setMemberAcknowledged(d.memberAcknowledged);
        if (d.memberAcknowledgementName != null) setMemberAcknowledgementName(d.memberAcknowledgementName);
        if (d.coachSignOffName != null) setCoachSignOffName(d.coachSignOffName);
        if (d.agreedFirstMilestone != null) setAgreedFirstMilestone(d.agreedFirstMilestone);
        if (d.goalReviewDate != null) setGoalReviewDate(d.goalReviewDate);
        if (d.coachStrengths != null) setCoachStrengths(d.coachStrengths);
        if (d.coachAreasToDevelop != null) setCoachAreasToDevelop(d.coachAreasToDevelop);
        if (d.workoutPrescription != null) setWorkoutPrescription(d.workoutPrescription);
        if (d.dietPrescription != null) setDietPrescription(d.dietPrescription);
        if (d.reassessmentWeeks != null) setReassessmentWeeks(d.reassessmentWeeks);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ASSESSMENT_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const meaningful = !!d && (d.selectedMember || d.activeSession || d.memberName
          || (d.currentStep && d.currentStep !== 'intake'));
        if (meaningful) setResumableDraft(d);
        else clearAssessmentDraft();
      }
    } catch { clearAssessmentDraft(); }
    setDraftHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResumeDraft = () => { if (resumableDraft) applyDraft(resumableDraft); setResumableDraft(null); };
  const handleDiscardDraft = () => { clearAssessmentDraft(); setResumableDraft(null); };

  useEffect(() => {
    if (!draftHydrated || resumableDraft) return;
    try {
      localStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify({
        currentStep, activeSession, selectedMember, manualEntry, memberName, memberPhone,
        assessmentType, trainingExperience, activityLevel, preferredStyle, userNotes,
        screeningAnswers, screeningOutcome, screeningCoachNotes,
        heightCm, weightKg, waistCm, restingHr, restingBp, provenance,
        functionalTests, symptoms,
        targetGoal, customGoalOutcome, durationWeeks, weeklyFrequency, perceivedBarrier, confidenceScore,
        consentBody, consentPhotos, consentAi, consentSecondary, consentImageGeneration,
        memberAcknowledged, memberAcknowledgementName, coachSignOffName, agreedFirstMilestone,
        goalReviewDate, coachStrengths, coachAreasToDevelop, workoutPrescription, dietPrescription,
        reassessmentWeeks,
      }));
    } catch { /* storage full/unavailable: progress simply is not persisted */ }
  });

  const stepsList: Array<{ id: AssessmentStep; label: string }> = [
    { id: 'intake', label: '1. Intake' }, { id: 'safety_gate', label: '2. Safety Gate' },
    { id: 'vitals', label: '3. Vitals' }, { id: 'movement', label: '4. Movement' },
    { id: 'goals', label: '5. Goals' }, { id: 'review', label: '6. Sign-Off' },
    { id: 'tv_display', label: '7. Studio TV' },
  ];

  return (
    <>
        {resumableDraft && (
          <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <p className="text-xs text-foreground">
              Unfinished assessment
              {resumableDraft.selectedMember?.name
                ? ` — ${resumableDraft.selectedMember.name}`
                : resumableDraft.memberName
                ? ` — ${resumableDraft.memberName}`
                : ''}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500 text-foreground"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-xs font-semibold px-3 py-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                Discard
              </button>
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border">
            {stepsList.map((s, i) => {
              const activeIdx = stepsList.findIndex((x) => x.id === currentStep);
              const done = i < activeIdx;
              const active = s.id === currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStep(s.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg transition-all ${
                    active
                      ? 'bg-amber-500 text-foreground shadow-sm'
                      : done
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-card'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
                      active ? 'bg-foreground/15' : done ? 'bg-emerald-500/15' : 'bg-muted'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span>{s.label.replace(/^\d+\.\s*/, '')}</span>
                </button>
              );
            })}
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
    </>
  );
};
