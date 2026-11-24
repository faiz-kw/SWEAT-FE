import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  RefreshCw,
  Search,
  Plus,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  RotateCcw,
  Activity,
  Layers,
  Sliders,
  Tv,
  Smartphone,
  Eye,
  Calendar,
  Lock,
  UserCheck,
  MessageSquare,
  Flame,
  Award,
  Check,
  ChevronDown,
  Package as PackageIcon,
  Clock,
  Target,
  Heart,
  Scale,
  Utensils,
  Dumbbell,
  Timer,
  AlertTriangle,
  Play,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { WebCameraCaptureModal } from './WebCameraCaptureModal';

/**
 * The four standardised capture views.
 *
 * Front and back carry the frontal-plane angles (shoulder tilt, hip tilt, midline shift);
 * the two profiles carry forward-head and trunk lean, and supply the depth axis the girth
 * estimate needs. Capturing both profiles also gives a repeatability check: if the two
 * disagree, the member rotated between shots and the baseline is not yet trustworthy.
 */
type CaptureViewId = 'photo_front' | 'photo_back' | 'photo_side_left' | 'photo_side_right';

const CAPTURE_VIEWS: Array<{
  id: CaptureViewId;
  scanKey: 'front' | 'back' | 'left' | 'right';
  label: string;
  instruction: string;
  framing: 'front' | 'side';
}> = [
  { id: 'photo_front', scanKey: 'front', label: '1. Front Standing', instruction: 'Face the camera, look straight ahead at the 2.5m marker', framing: 'front' },
  { id: 'photo_back', scanKey: 'back', label: '2. Back Standing', instruction: 'Face away, heels on the floor markers, arms relaxed', framing: 'front' },
  { id: 'photo_side_left', scanKey: 'left', label: '3. Left Profile', instruction: 'Left shoulder to camera, arms resting naturally at sides', framing: 'side' },
  { id: 'photo_side_right', scanKey: 'right', label: '4. Right Profile', instruction: 'Right shoulder to camera, same stance as the left', framing: 'side' },
];

import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { assessmentApi, type AssessmentSession, type HealthScreeningData, type FunctionalTestsPayload } from '@/api/endpoints/assessmentApi';
import { catalogApi } from '@/api/endpoints/catalogApi';
import type { Package } from '@/types/catalog';
import { useAuth, useApp } from '@/contexts';

export const AssessmentStudioWorkspace: React.FC = () => {
  const { user } = useAuth();
  const { locationId } = useApp();
  const queryClient = useQueryClient();

  // Workflow Steps: 'intake' | 'vitals_capture' | 'movement' | 'review' | 'display_mode'
  const [currentStep, setCurrentStep] = useState<
    'register' | 'intake' | 'vitals_capture' | 'movement' | 'review' | 'display_mode'
  >('register');

  // ---------------------------------------------------------------------------
  // Register (list) state. Paging, search and filtering all happen server-side:
  // an assessment register grows without bound, and a studio with three years of
  // history should not ship every row to the tablet to filter it in the browser.
  // ---------------------------------------------------------------------------
  const [registerPage, setRegisterPage] = useState(1);
  const [registerSearch, setRegisterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [registerBucket, setRegisterBucket] = useState<'' | 'needs_review' | 'in_progress' | 'approved'>('');
  const [registerType, setRegisterType] = useState('');
  const [registerScanStatus, setRegisterScanStatus] = useState('');
  const [registerFrom, setRegisterFrom] = useState('');
  const [registerTo, setRegisterTo] = useState('');
  const REGISTER_PAGE_SIZE = 20;

  // Active Session
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null);

  // =========================================================================
  // SECTION 1: PROFILE & GOALS STATE
  // =========================================================================
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('+91');
  const [assessmentType, setAssessmentType] = useState('INITIAL');
  const [trainingExperience, setTrainingExperience] = useState('BEGINNER');
  const [activityLevel, setActivityLevel] = useState('MODERATELY_ACTIVE');
  const [preferredStyle, setPreferredStyle] = useState('PILATES');
  const [targetGoal, setTargetGoal] = useState('POSTURE_ALIGNMENT');
  const [customGoalOutcome, setCustomGoalOutcome] = useState('De-rotate spine, relieve lower back tightness, and tone core & lower belly.');
  const [durationWeeks, setDurationWeeks] = useState<number>(12);
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(3);
  const [perceivedBarrier, setPerceivedBarrier] = useState('Time & consistency');
  const [confidenceScore, setConfidenceScore] = useState<number>(8);

  // =========================================================================
  // SECTION 2: HEALTH SCREENING (PAR-Q) STATE
  // =========================================================================
  const [screeningAnswers, setScreeningAnswers] = useState<HealthScreeningData>({
    feeling_well: true,
    chest_pain: 'NO',
    fainting_dizziness: false,
    unusual_breathlessness: false,
    pain_affecting_movement: 'No',
    physical_limitation_injury: 'No',
    recent_surgery: 'No',
    medical_exercise_restriction: 'No',
    other_considerations: '',
    medication_tolerance: 'No',
  });
  const [screeningNotes, setScreeningNotes] = useState('');

  // =========================================================================
  // SECTION 3: VITALS & BODY MEASUREMENTS STATE
  // =========================================================================
  const [heightCm, setHeightCm] = useState<number>(168);
  const [weightKg, setWeightKg] = useState<number>(64);
  const [waistCm, setWaistCm] = useState<number>(76);
  const [restingHr, setRestingHr] = useState<number>(72);
  const [restingBp, setRestingBp] = useState<string>('120/80');

  // Four standardised baseline captures. The scan combines frontal width with profile
  // depth, so front + at least one profile is the minimum that yields any geometry.
  const [captureFiles, setCaptureFiles] = useState<Record<CaptureViewId, File | null>>({
    photo_front: null,
    photo_back: null,
    photo_side_left: null,
    photo_side_right: null,
  });
  const [capturePreviews, setCapturePreviews] = useState<Record<CaptureViewId, string | null>>({
    photo_front: null,
    photo_back: null,
    photo_side_left: null,
    photo_side_right: null,
  });

  // Capture conditions the camera cannot infer. Recorded so a later reader knows how
  // comparable two assessments actually are.
  const [clothingFit, setClothingFit] = useState<'CLOSE_FITTING' | 'ORDINARY' | 'LOOSE'>('ORDINARY');
  const [captureMode, setCaptureMode] = useState<'PUBLIC_STUDIO' | 'PRIVATE_ROOM'>('PUBLIC_STUDIO');
  const [consentPhotos, setConsentPhotos] = useState(true);
  const [consentAiAnalysis, setConsentAiAnalysis] = useState(true);
  const [scanPollingId, setScanPollingId] = useState<string | null>(null);
  const [cameraForView, setCameraForView] = useState<CaptureViewId | null>(null);

  // =========================================================================
  // SECTIONS 4-11: FUNCTIONAL MOVEMENT BATTERY STATE (FAST-LOGGING)
  // =========================================================================
  const [functionalTests, setFunctionalTests] = useState<FunctionalTestsPayload>({
    warm_up_observation: { walking: 'Normal', sit_to_stand: 'Independent', squat_pattern: 'Comfortable', overhead_reach: 'Comfortable' },
    lower_body: { test_name: 'Squat Assessment', variation: 'Bodyweight Squat', reps: 14, movement_quality: 'Meets criteria', pain_reported: false },
    upper_body: { pushup_variation: 'High-Incline Push-Up', pushup_reps: 10, pushup_quality: 'Good control', pull_row_variation: 'Seated Cable Row', pull_row_reps: 12, pull_row_load_kg: 25 },
    core: { plank_variation: 'Standard Forearm Plank', hold_seconds: 45, stopping_reason: 'Fatigue', quality: 'Good alignment' },
    balance: { single_leg_left_sec: 25, single_leg_right_sec: 28, support_used: 'None', tandem_stance: 'Stable' },
    mobility: { ankle_knee_to_wall_left_cm: 11, ankle_knee_to_wall_right_cm: 10, shoulder_reach: 'Within protocol', sit_and_reach_cm: 22 },
    cardio: { protocol: 'Treadmill Submaximal Walk (4.5 km/h @ 2% Incline)', duration_minutes: 5, rpe_scale: 5, talk_test: 'Comfortable' },
  });

  // =========================================================================
  // SECTION 13 & REVIEW: COACH PRESCRIPTION & PACKAGE STATE
  // =========================================================================
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState<boolean>(false);
  const [coachNotes, setCoachNotes] = useState('Excellent baseline commitment. Focus on pelvis neutral alignment and progressive overload.');
  const [workoutPrescription, setWorkoutPrescription] = useState('3x Weekly Reformer Pilates & functional core de-rotation.');
  const [dietPrescription, setDietPrescription] = useState('115g daily protein target with 2.5L daily hydration.');
  const [pairingCodeInput, setPairingCodeInput] = useState('');

  // =========================================================================
  // COMPUTED CALCULATIONS (BMI, RMR, TDEE, SESSIONS)
  // =========================================================================
  const estimatedSessions = Math.max(1, Math.round(weeklyFrequency * durationWeeks));
  const timelineMonths = Math.max(1, Math.round(durationWeeks / 4.33));

  const computedBmi = useMemo(() => {
    if (!heightCm || !weightKg) return 22.5;
    const hM = heightCm / 100.0;
    return parseFloat((weightKg / (hM * hM)).toFixed(1));
  }, [heightCm, weightKg]);

  const computedRmr = useMemo(() => {
    if (!heightCm || !weightKg) return 1400;
    // Mifflin-St Jeor (women approx: 10*W + 6.25*H - 5*Age - 161)
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * 30 - 161);
  }, [heightCm, weightKg]);

  const computedTdee = useMemo(() => {
    const mult = activityLevel === 'SEDENTARY' ? 1.2 : activityLevel === 'LIGHTLY_ACTIVE' ? 1.375 : activityLevel === 'HIGHLY_ACTIVE' ? 1.725 : 1.55;
    return Math.round(computedRmr * mult);
  }, [computedRmr, activityLevel]);

  const computedCalorieTarget = useMemo(() => {
    if (targetGoal === 'FAT_LOSS') return Math.max(1200, computedTdee - 400);
    if (targetGoal === 'HYPERTROPHY_GLUTES' || targetGoal === 'STRENGTH_CONDITIONING') return computedTdee + 250;
    return computedTdee;
  }, [computedTdee, targetGoal]);

  const proteinTargetG = Math.round(weightKg * 1.8);
  const hydrationTargetL = (weightKg * 0.038).toFixed(1);

  // Safety screening warning check
  const hasSafetyFlag =
    screeningAnswers.chest_pain === 'YES' ||
    screeningAnswers.fainting_dizziness ||
    screeningAnswers.unusual_breathlessness;

  // Query Real Packages from Database
  const { data: dbPackages = [] } = useQuery({
    queryKey: ['active-studio-packages', locationId],
    queryFn: () => catalogApi.getPackages({ status: 'ACTIVE' }),
  });

  const getPackageDetails = (pkg: Package) => {
    let sessions = 0;
    let price = 0;
    let currency = 'INR';

    const version = pkg.active_version || pkg.versions?.[0];
    if (version) {
      const ents = (version as any).entitlements || (version as any).entitlement_definitions || [];
      for (const ent of ents) {
        if (['HOME_BRANCH_SESSION', 'CLASS_SESSION', 'PERSONAL_TRAINING_SESSION', 'OPEN_ACCESS'].includes(ent.entitlement_type)) {
          if (ent.is_unlimited) sessions = 365;
          else if (ent.allocated_units) sessions = parseInt(ent.allocated_units, 10) || 0;
        }
      }
      const prices = version.prices || [];
      const activePrice = prices.find((p: any) => p.status === 'ACTIVE') || prices[0];
      if (activePrice) {
        price = parseFloat(activePrice.total_price || activePrice.sale_price || activePrice.base_price || '0');
        currency = activePrice.currency || 'INR';
      }
    }
    if (sessions === 0) {
      const match = (pkg.name || '').match(/\b(\d{2,3})\b/);
      sessions = match ? parseInt(match[1], 10) : 72;
    }
    return { sessions, price, currency };
  };

  const topMatchedPackage = useMemo(() => {
    if (!dbPackages || dbPackages.length === 0) return null;
    return (
      dbPackages.find((p) => {
        const name = (p.name || '').toLowerCase();
        if (preferredStyle === 'PILATES' && name.includes('pilates')) return true;
        if (preferredStyle === 'BOOTCAMP' && name.includes('bootcamp')) return true;
        return false;
      }) || dbPackages[0]
    );
  }, [dbPackages, preferredStyle]);

  const activePackage = useMemo(() => {
    if (selectedPackageId) {
      const found = dbPackages.find((p) => p.id === selectedPackageId);
      if (found) return found;
    }
    return topMatchedPackage;
  }, [selectedPackageId, dbPackages, topMatchedPackage]);

  const activePackageDetails = activePackage ? getPackageDetails(activePackage) : null;

  // =========================================================================
  // MUTATIONS (START, UPDATE, CAPTURE, APPROVE)
  // =========================================================================
  const startSessionMutation = useMutation({
    mutationFn: () => {
      const screeningOutcome = hasSafetyFlag ? 'PROCEED_WITH_MODIFICATIONS' : 'CLEARED';
      return assessmentApi.startAssessment({
        member_name: memberName.trim() || 'Trial Client',
        member_phone: memberPhone.trim(),
        assessment_type: assessmentType,
        training_experience: trainingExperience,
        current_activity_level: activityLevel,
        preferred_training_style: preferredStyle,
        target_goal: targetGoal,
        stated_goal_outcome: customGoalOutcome,
        target_timeline_weeks: durationWeeks,
        target_timeline_months: timelineMonths,
        weekly_frequency_days: weeklyFrequency,
        perceived_barrier: perceivedBarrier,
        member_confidence_score: confidenceScore,
        health_screening: screeningAnswers,
        screening_outcome: screeningOutcome,
        screening_coach_notes: screeningNotes,
        branch_id: locationId && locationId !== 'all' ? locationId : undefined,
        package_id: activePackage?.id,
        bypass_paywall: true,
      });
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setCurrentStep('vitals_capture');
      toast.success('Member profile & health screening saved. Proceed to vitals & photos.');
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || 'Failed to start assessment.');
    },
  });

  // Debounce the search box so typing a member's name is one request, not eight.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(registerSearch.trim());
      setRegisterPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [registerSearch]);

  const registerParams = {
    page: registerPage,
    page_size: REGISTER_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(registerBucket ? { bucket: registerBucket } : {}),
    ...(registerType ? { assessment_type: registerType } : {}),
    ...(registerScanStatus ? { scan_status: registerScanStatus } : {}),
    ...(registerFrom ? { date_from: registerFrom } : {}),
    ...(registerTo ? { date_to: registerTo } : {}),
  };

  const {
    data: register,
    isLoading: registerLoading,
    isFetching: registerFetching,
    refetch: refetchRegister,
  } = useQuery({
    queryKey: ['assessment-register', registerParams],
    queryFn: () => assessmentApi.listAssessments(registerParams),
    enabled: currentStep === 'register',
    placeholderData: (previous) => previous,
  });

  const openAssessment = async (id: string, step: 'intake' | 'vitals_capture' | 'movement' | 'review') => {
    try {
      const session = await assessmentApi.getAssessment(id);
      setActiveSession(session);
      setCurrentStep(step);
      const scanStatus = (session as any)?.scan?.status;
      if (scanStatus === 'QUEUED' || scanStatus === 'PROCESSING') setScanPollingId(session.id);
    } catch (err: any) {
      toast.error(err?.data?.error || 'Could not open that assessment.');
    }
  };

  // Poll the scan while it is in flight. The provider call takes a few seconds per view, so
  // the capture request returns immediately and the result lands here.
  const { data: scanState } = useQuery({
    queryKey: ['assessment-scan', scanPollingId],
    queryFn: () => assessmentApi.getScanStatus(scanPollingId as string),
    enabled: !!scanPollingId,
    refetchInterval: (query) => (query.state.data?.is_terminal ? false : 2500),
  });

  React.useEffect(() => {
    if (scanState?.is_terminal) {
      setScanPollingId(null);
      if (scanState.status === 'FAILED') {
        toast.error(scanState.error || 'The body scan failed. The captures are saved — you can retry the scan.');
      } else if (scanState.status === 'PARTIAL') {
        toast.warning('Body scan finished, but some views were unusable. Check the notes below.');
      } else if (scanState.status === 'COMPLETED') {
        toast.success('Body scan complete.');
      }
    }
  }, [scanState?.is_terminal, scanState?.status]);

  const rescanMutation = useMutation({
    mutationFn: () => assessmentApi.rescan((activeSession as any).id),
    onSuccess: () => {
      if (activeSession) setScanPollingId(activeSession.id);
      toast.success('Re-running the scan against the stored captures.');
    },
    onError: (err: any) => toast.error(err?.data?.error || 'Could not restart the scan.'),
  });

  const uploadPhotosAndVitalsMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error('No active assessment session');
      // Update vitals
      await assessmentApi.updateAssessment(activeSession.id, {
        measured_height_cm: heightCm,
        measured_weight_kg: weightKg,
        waist_circumference_cm: waistCm,
        resting_heart_rate_bpm: restingHr,
        resting_blood_pressure: restingBp,
      });

      const formData = new FormData();
      (Object.keys(captureFiles) as CaptureViewId[]).forEach((view) => {
        const file = captureFiles[view];
        if (file) formData.append(view, file);
      });
      formData.append('height_cm', String(heightCm));
      formData.append('weight_kg', String(weightKg));
      formData.append('consent_movement_photos', String(consentPhotos));
      formData.append('consent_ai_analysis', String(consentAiAnalysis));
      formData.append('clothing_fit', clothingFit);
      formData.append('capture_mode', captureMode);

      return assessmentApi.capturePhotos(activeSession.id, formData);
    },
    onSuccess: (data) => {
      setActiveSession(data);
      const scanStatus = (data as any)?.scan?.status;
      if (scanStatus === 'QUEUED' || scanStatus === 'PROCESSING') {
        // The analysis runs in the background; keep the coach on this step so they can see
        // the per-view verdict and retake anything the scan rejected.
        setScanPollingId(data.id);
        toast.success('Captures stored. Body scan running — results appear below.');
      } else if (scanStatus === 'UNAVAILABLE') {
        toast.warning('Captures stored. Body scanning is not configured, so no measurements were produced.');
      } else if (scanStatus === 'SKIPPED_NO_CONSENT') {
        toast.info('Captures stored without analysis, as consent was not given.');
      } else {
        toast.success('Captures and vitals saved.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || 'Failed to save vitals/photos.');
    },
  });

  const saveMovementBatteryMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error('No active session');
      return assessmentApi.updateAssessment(activeSession.id, {
        functional_tests_payload: functionalTests,
      });
    },
    onSuccess: (fresh) => {
      setActiveSession(fresh);
      setCurrentStep('review');
      toast.success('Functional movement battery recorded! Ready for coach review.');
    },
    onError: () => toast.error('Failed to save movement tests.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error('No active session');
      return assessmentApi.approveAndSend(activeSession.id, {
        coach_notes: coachNotes,
        workout_prescription: workoutPrescription,
        diet_prescription: dietPrescription,
        send_whatsapp: false, // Output is displayed on studio screen on approval
      });
    },
    onSuccess: (approvedData) => {
      setActiveSession(approvedData);
      toast.success('Assessment approved! Studio TV Screen presentation unlocked.');
    },
    onError: () => toast.error('Failed to approve assessment.'),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
      <PageHeader
        title="Functional Fitness & Movement Assessment Studio"
        description="Coach-led baseline & movement evaluation: health screening (PAR-Q), vitals, scaled test battery, nutrition targets & TV presentation reveal."
        actions={
          <div className="flex items-center gap-2">
            {currentStep !== 'register' && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('register')} className="gap-1.5">
                <ClipboardList className="w-4 h-4" />
                <span>All Assessments</span>
              </Button>
            )}
            <Button
              variant={currentStep === 'display_mode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentStep(currentStep === 'display_mode' ? 'intake' : 'display_mode')}
              className="gap-1.5"
            >
              <Tv className="w-4 h-4" />
              <span>{currentStep === 'display_mode' ? 'Back to Coach Tablet' : 'Studio TV Screen Mirror'}</span>
            </Button>
            {currentStep === 'register' && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setActiveSession(null);
                  setCurrentStep('intake');
                }}
              >
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* ========================================================================= */}
        {/* MODE 1: STUDIO TV DISPLAY SCREEN (CLIENT PRESENTATION MIRROR) */}
        {/* ========================================================================= */}
        {currentStep === 'register' ? (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Filter chips, driven by server-computed counts */}
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: '', label: 'All', count: register?.summary?.total },
                { id: 'needs_review', label: 'Needs review', count: register?.summary?.needs_review },
                { id: 'in_progress', label: 'In progress', count: register?.summary?.in_progress },
                { id: 'approved', label: 'Approved', count: register?.summary?.approved },
              ] as Array<{ id: '' | 'needs_review' | 'in_progress' | 'approved'; label: string; count?: number }>).map((chip) => (
                <button
                  key={chip.id || 'all'}
                  onClick={() => { setRegisterBucket(chip.id); setRegisterPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    registerBucket === chip.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
                  }`}
                >
                  {chip.label}
                  {typeof chip.count === 'number' && (
                    <span className="ml-1.5 opacity-80">{chip.count}</span>
                  )}
                </button>
              ))}
              {(register?.summary?.scan_failed ?? 0) > 0 && (
                <button
                  onClick={() => { setRegisterScanStatus('FAILED,PARTIAL'); setRegisterPage(1); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-destructive/40 bg-destructive/10 text-destructive"
                >
                  Scan issues {register?.summary?.scan_failed}
                </button>
              )}
            </div>

            {/* Search and filters */}
            <div className="flex flex-wrap items-center gap-2 bg-card border border-border/70 rounded-2xl p-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  placeholder="Search by member name, phone or member number"
                  className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs"
                />
              </div>
              <select
                value={registerType}
                onChange={(e) => { setRegisterType(e.target.value); setRegisterPage(1); }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="">All types</option>
                <option value="INITIAL">Initial</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="POST_PROGRAM">Post-programme</option>
                <option value="RETURN_TO_TRAINING">Return to training</option>
              </select>
              <select
                value={registerScanStatus}
                onChange={(e) => { setRegisterScanStatus(e.target.value); setRegisterPage(1); }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="">Any scan state</option>
                <option value="COMPLETED">Scan complete</option>
                <option value="PARTIAL">Scan partial</option>
                <option value="FAILED">Scan failed</option>
                <option value="UNAVAILABLE">Scan unavailable</option>
                <option value="SKIPPED_NO_CONSENT">No consent</option>
              </select>
              <input
                type="date"
                value={registerFrom}
                onChange={(e) => { setRegisterFrom(e.target.value); setRegisterPage(1); }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
              <input
                type="date"
                value={registerTo}
                onChange={(e) => { setRegisterTo(e.target.value); setRegisterPage(1); }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
              {(registerSearch || registerType || registerScanStatus || registerFrom || registerTo || registerBucket) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setRegisterSearch(''); setRegisterType(''); setRegisterScanStatus('');
                    setRegisterFrom(''); setRegisterTo(''); setRegisterBucket(''); setRegisterPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => refetchRegister()}>
                <RefreshCw className={`w-3.5 h-3.5 ${registerFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Rows */}
            <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">Member</div>
                <div className="col-span-2">Date / Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Scan</div>
                <div className="col-span-2">Coach</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {registerLoading ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading assessments…
                </div>
              ) : !register?.results?.length ? (
                <div className="p-10 text-center space-y-2">
                  <ClipboardList className="w-7 h-7 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No assessments found</p>
                  <p className="text-xs text-muted-foreground">
                    {debouncedSearch || registerBucket || registerType
                      ? 'No assessment matches these filters.'
                      : 'Start the first assessment with the New Assessment button.'}
                  </p>
                </div>
              ) : (
                register.results.map((row) => {
                  const action =
                    row.status === 'PENDING_REVIEW'
                      ? { label: 'Review', step: 'review' as const }
                      : row.status === 'APPROVED'
                      ? { label: 'View', step: 'review' as const }
                      : { label: 'Resume', step: 'vitals_capture' as const };
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-t border-border/60 items-center hover:bg-muted/30 transition"
                    >
                      <div className="col-span-2 md:col-span-3 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{row.member_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {row.member_phone || '—'}{row.branch ? ` · ${row.branch.name}` : ''}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-foreground">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{row.assessment_type_display}</p>
                      </div>
                      <div className="md:col-span-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            row.status === 'APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : row.status === 'PENDING_REVIEW'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {row.status_display || row.status}
                        </span>
                        {row.posture_score != null && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">Posture {row.posture_score}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] text-muted-foreground">{row.scan_status.replace(/_/g, ' ').toLowerCase()}</p>
                        <p className="text-[10px] text-muted-foreground">{row.captures_taken}/4 captures</p>
                      </div>
                      <div className="md:col-span-2 text-[11px] text-muted-foreground truncate">
                        {row.conducted_by || '—'}
                      </div>
                      <div className="md:col-span-1 flex md:justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => openAssessment(row.id, action.step)}>
                          {action.label}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Server-side paging */}
            {!!register?.count && register.count > REGISTER_PAGE_SIZE && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {(registerPage - 1) * REGISTER_PAGE_SIZE + 1}–
                  {Math.min(registerPage * REGISTER_PAGE_SIZE, register.count)} of {register.count}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    disabled={registerPage === 1 || registerFetching}
                    onClick={() => setRegisterPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-muted-foreground">
                    Page {registerPage} of {Math.max(1, Math.ceil(register.count / REGISTER_PAGE_SIZE))}
                  </span>
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    disabled={registerPage >= Math.ceil(register.count / REGISTER_PAGE_SIZE) || registerFetching}
                    onClick={() => setRegisterPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : currentStep === 'display_mode' ? (
          <div className="bg-card border border-border/80 rounded-3xl p-8 max-w-4xl mx-auto text-center space-y-6 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
              <Tv className="w-4 h-4" /> Studio Display Monitor Mirror
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Connect to Active Studio Session</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Enter the 6-digit session pairing code from the coach's tablet. The TV screen stays on standby and reveals the output only upon coach approval.
            </p>

            <div className="max-w-xs mx-auto flex gap-2">
              <Input
                placeholder="6-Digit Code"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value)}
                className="text-center font-mono tracking-widest text-lg h-12"
                maxLength={6}
              />
              <Button
                onClick={() => {
                  if (pairingCodeInput.length === 6) {
                    assessmentApi.pairDisplayScreen(pairingCodeInput).then((res) => {
                      toast.success('Connected to tablet session!');
                      setActiveSession(res);
                    });
                  }
                }}
                className="h-12 px-6"
              >
                Connect
              </Button>
            </div>

            {activeSession && (
              <div className="mt-8 pt-8 border-t border-border/60 text-left space-y-6">
                {activeSession.status !== 'APPROVED' ? (
                  /* LOCKED STANDBY SCREEN (BEFORE COACH APPROVAL) */
                  <div className="bg-muted/30 border-2 border-dashed border-border/80 rounded-3xl p-10 text-center space-y-4">
                    <div className="p-3 bg-primary/10 text-primary w-fit mx-auto rounded-2xl">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Assessment in Progress with Coach</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Coach is conducting the movement battery and vitals evaluation for <strong>{activeSession.member_name}</strong>. The output, tailored roadmap, and nutrition plan will be presented here once approved.
                    </p>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10">
                      Standby · Coach Review Pending
                    </Badge>
                  </div>
                ) : (
                  /* UNLOCKED PRESENTATION SCREEN (AFTER COACH APPROVAL) */
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <h3 className="text-2xl font-black">{activeSession.member_name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeSession.target_goal_display} · {activeSession.timeline_weeks} Weeks Roadmap
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1">
                        Coach Approved & Unlocked
                      </Badge>
                    </div>

                    {/* KPI Highlights: Posture, Calories, Protein, Program */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase">Posture Score</span>
                        <h4 className="text-2xl font-black text-primary mt-1">
                          {activeSession.metrics?.posture_score ?? '—'}
                          <span className="text-xs font-normal text-muted-foreground">/100</span>
                        </h4>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase">Daily Calorie Target</span>
                        <h4 className="text-2xl font-black text-foreground mt-1">
                          {activeSession.vitals?.daily_calorie_target || computedCalorieTarget}
                          <span className="text-xs font-normal text-muted-foreground"> kcal</span>
                        </h4>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase">Daily Protein</span>
                        <h4 className="text-2xl font-black text-emerald-400 mt-1">
                          {activeSession.vitals?.macros?.protein_g || proteinTargetG}g
                        </h4>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase">Hydration Target</span>
                        <h4 className="text-2xl font-black text-primary mt-1">
                          {activeSession.vitals?.macros?.hydration_liters || hydrationTargetL}L
                        </h4>
                      </div>
                    </div>

                    {/* Recommended Program & Nutrition Plan Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 space-y-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">
                          Recommended Studio Program
                        </span>
                        <h4 className="text-base font-extrabold text-foreground">
                          {activeSession.recommended_package?.name || activePackage?.name}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {activeSession.recommended_package?.reason ||
                            `Tailored to fulfill commitment of ${weeklyFrequency}x weekly training over ${durationWeeks} weeks.`}
                        </p>
                      </div>

                      <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-2">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                          Personalized Nutrition Roadmap
                        </span>
                        <p className="text-xs text-foreground font-medium">
                          {activeSession.vitals?.macros?.meal_guidance ||
                            `Prioritize ${proteinTargetG}g protein daily. Split across 3-4 meals to accelerate muscle recovery and postural tone.`}
                        </p>
                      </div>
                    </div>

                    {/* Baseline captures.
                        Per the module specification, a "goal" image must be a pose-locked,
                        identity-preserving simulation of THIS member, clearly labelled as an
                        illustration. That pipeline is not built yet, so the roadmap shows the
                        member's own baseline captures and the plan behind them, rather than
                        stock photographs of other people presented as their future. */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-bold text-foreground">Baseline Captures</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {([
                          { key: 'front', label: 'Front' },
                          { key: 'back', label: 'Back' },
                          { key: 'left', label: 'Left Profile' },
                          { key: 'right', label: 'Right Profile' },
                        ] as Array<{ key: 'front' | 'back' | 'left' | 'right'; label: string }>).map((shot) => {
                          const src = (activeSession as any)?.photos?.[shot.key] as string | null | undefined;
                          return (
                            <div key={shot.key} className="bg-muted/40 rounded-2xl p-3 border border-border/60 text-center space-y-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{shot.label}</span>
                              <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                                {src ? (
                                  <img src={src} alt={`${shot.label} baseline capture`} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground px-2">Not captured</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Re-shoot these at the reassessment under the same framing, distance and clothing to make
                        the comparison meaningful.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MODE 2: COACH TABLET COCKPIT */
          /* ========================================================================= */
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Step Navigation Pill */}
            <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-2xl border border-border/60 text-xs font-medium">
              {[
                { id: 'intake', label: '1. Profile & Safety' },
                { id: 'vitals_capture', label: '2. Vitals & Photos', disabled: !activeSession },
                { id: 'movement', label: '3. Movement Battery', disabled: !activeSession },
                { id: 'review', label: '4. Review & Approval', disabled: !activeSession },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(s.id as any)}
                  disabled={s.disabled}
                  className={`flex-1 py-2 rounded-xl transition ${
                    currentStep === s.id
                      ? 'bg-background shadow-xs font-bold text-foreground'
                      : s.disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* ===================================================================== */}
            {/* STEP 1: MEMBER PROFILE, GOALS & PAR-Q HEALTH SCREENING */}
            {/* ===================================================================== */}
            {currentStep === 'intake' && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span>Member Goals & Health Screening</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Establish member readiness, training history, and target outcomes before testing.
                  </p>
                </div>

                {/* Member Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Member Full Name</label>
                    <Input
                      placeholder="e.g. Kavita Rao"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Mobile Number</label>
                    <Input
                      placeholder="+919876543210"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Stated Goal Outcome (Free Text) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>What does the member want to achieve?</span>
                  </label>
                  <Textarea
                    placeholder="e.g. Relieve lower back stiffness, de-rotate spine posture, and tone core & lower belly..."
                    value={customGoalOutcome}
                    onChange={(e) => setCustomGoalOutcome(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Preferred Training Style */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Preferred Training Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'PILATES', label: 'Reformer Pilates', desc: 'Core & Spine' },
                      { id: 'BOOTCAMP', label: 'HIIT Bootcamp', desc: 'Conditioning' },
                      { id: 'STRENGTH', label: 'Strength Training', desc: 'Hypertrophy' },
                      { id: 'MIXED', label: 'Mixed Studio', desc: 'Hybrid' },
                    ].map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setPreferredStyle(mod.id)}
                        className={`p-3 rounded-2xl border text-left transition select-none ${
                          preferredStyle === mod.id
                            ? 'border-primary bg-primary/10 ring-1 ring-primary text-foreground'
                            : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <h4 className="text-xs font-bold text-foreground">{mod.label}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{mod.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & Weekly Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Commitment Timeframe (Weeks)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={4}
                        max={52}
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(Math.max(4, parseInt(e.target.value, 10) || 4))}
                        className="h-10 text-center font-bold text-sm w-28"
                      />
                      <span className="text-xs text-muted-foreground">Weeks ({Math.round(durationWeeks / 4.33)} Months)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Weekly Training Frequency</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={weeklyFrequency}
                        onChange={(e) => setWeeklyFrequency(Math.max(1, Math.min(7, parseInt(e.target.value, 10) || 1)))}
                        className="h-10 text-center font-bold text-sm w-28"
                      />
                      <span className="text-xs text-muted-foreground">Days per week (~{estimatedSessions} sessions)</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: 10-QUESTION HEALTH & SAFETY SCREENING (PAR-Q) */}
                <div className="p-4 bg-muted/20 border border-border/70 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Readiness, Health & Safety Screening (PAR-Q)
                      </h4>
                    </div>
                    {hasSafetyFlag ? (
                      <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/40 text-[10px]">
                        Modification Required
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
                        Cleared for Testing
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'feeling_well', label: '1. Are you feeling well enough to exercise today?', isYesGood: true },
                      { key: 'chest_pain', label: '2. Have you experienced chest pain during activity or at rest recently?', isCritical: true },
                      { key: 'fainting_dizziness', label: '3. Have you experienced unexplained fainting, dizziness or loss of balance?', isCritical: true },
                      { key: 'unusual_breathlessness', label: '4. Have you experienced unusual breathlessness during ordinary activity?', isCritical: true },
                    ].map((q) => {
                      const val = (screeningAnswers as any)[q.key];
                      const isNo = q.key === 'chest_pain' ? val === 'NO' : val === false;
                      const isYes = q.key === 'chest_pain' ? val === 'YES' : val === true;

                      return (
                        <div key={q.key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                          <span className={`text-xs ${q.isCritical && isYes ? 'text-amber-500 font-semibold' : 'text-foreground'}`}>
                            {q.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setScreeningAnswers((prev) => ({
                                  ...prev,
                                  [q.key]: q.key === 'chest_pain' ? 'NO' : false,
                                }))
                              }
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                isNo ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border/60 text-muted-foreground'
                              }`}
                            >
                              No
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setScreeningAnswers((prev) => ({
                                  ...prev,
                                  [q.key]: q.key === 'chest_pain' ? 'YES' : true,
                                }))
                              }
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                isYes ? 'bg-amber-600 text-white border-amber-600' : 'border-border/60 text-muted-foreground'
                              }`}
                            >
                              Yes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hasSafetyFlag && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Safety alert: Member reported symptoms. Coach will modify test protocols to low-impact.</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                  className="w-full h-11 text-sm font-semibold gap-2"
                >
                  <span>Save & Continue to Vitals & Photos</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 2: VITALS & BASELINE PHOTOS */}
            {/* ===================================================================== */}
            {currentStep === 'vitals_capture' && activeSession && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Scale className="w-5 h-5 text-primary" />
                      <span>Baseline Body Vitals & Framing</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Record measured vitals from scale and capture baseline standing photos.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Session Code</span>
                    <span className="text-sm font-mono font-bold text-primary">{activeSession.pairing_code}</span>
                  </div>
                </div>

                {/* Vitals Input Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Height (cm)</label>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                      className="font-bold text-base h-9"
                    />
                  </div>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Weight (kg)</label>
                    <Input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                      className="font-bold text-base h-9"
                    />
                  </div>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Waist (cm)</label>
                    <Input
                      type="number"
                      value={waistCm}
                      onChange={(e) => setWaistCm(parseFloat(e.target.value) || 0)}
                      className="font-bold text-base h-9"
                    />
                  </div>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Resting HR (bpm)</label>
                    <Input
                      type="number"
                      value={restingHr}
                      onChange={(e) => setRestingHr(parseInt(e.target.value, 10) || 0)}
                      className="font-bold text-base h-9"
                    />
                  </div>
                </div>

                {/* Instant Calculated Vitals Summary */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">BMI</span>
                    <h4 className="text-lg font-black text-foreground">{computedBmi}</h4>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">RMR (Basal)</span>
                    <h4 className="text-lg font-black text-primary">{computedRmr} kcal</h4>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">TDEE (Daily)</span>
                    <h4 className="text-lg font-black text-emerald-400">{computedTdee} kcal</h4>
                  </div>
                </div>

                {/* Four standardised baseline captures */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Baseline Captures</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Four views: front, back and both profiles. Same stance, same distance, every time —
                        comparisons are only valid between captures taken the same way.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">Captured</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted font-semibold text-foreground">
                        {CAPTURE_VIEWS.filter((v) => capturePreviews[v.id]).length} / 4
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {CAPTURE_VIEWS.map((view) => {
                      const preview = capturePreviews[view.id];
                      const quality = scanState?.capture_quality?.[view.scanKey];
                      const rejected = quality && quality.usable === false;
                      return (
                        <div key={view.id} className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">{view.label}</label>
                          <div
                            className={`aspect-3/4 rounded-2xl border-2 border-dashed relative flex flex-col items-center justify-center overflow-hidden transition cursor-pointer ${
                              rejected
                                ? 'border-destructive/60 bg-destructive/5'
                                : quality?.usable
                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                : 'border-border/80 bg-muted/30 hover:border-primary/50'
                            }`}
                          >
                            {preview ? (
                              <img src={preview} alt={view.label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-3 space-y-1.5">
                                <Camera className="w-7 h-7 text-muted-foreground mx-auto" />
                                <p className="text-[11px] font-medium text-foreground">Tap to take photo</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">{view.instruction}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              aria-label={`Capture ${view.label}`}
                              onClick={() => setCameraForView(view.id)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          {quality && (
                            <p className={`text-[10px] leading-tight ${rejected ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {rejected ? quality.reason : 'Usable for measurement'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Capture conditions and consent — neither can be inferred from the image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-foreground">Clothing fit</label>
                    <select
                      value={clothingFit}
                      onChange={(e) => setClothingFit(e.target.value as typeof clothingFit)}
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="CLOSE_FITTING">Close-fitting athletic wear</option>
                      <option value="ORDINARY">Ordinary studio clothing</option>
                      <option value="LOOSE">Loose clothing</option>
                    </select>
                    {clothingFit === 'LOOSE' && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        Loose clothing hides body outline. Posture angles still hold; girth estimates will read low.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-foreground">Capture setting</label>
                    <select
                      value={captureMode}
                      onChange={(e) => setCaptureMode(e.target.value as typeof captureMode)}
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="PUBLIC_STUDIO">Public studio floor</option>
                      <option value="PRIVATE_ROOM">Private assessment room</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={consentPhotos}
                      onChange={(e) => setConsentPhotos(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Member consents to movement photographs being stored for this assessment.</span>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={consentAiAnalysis}
                      onChange={(e) => setConsentAiAnalysis(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Member consents to automated movement analysis of those photographs.</span>
                  </label>
                  {(!consentPhotos || !consentAiAnalysis) && (
                    <p className="text-[10px] text-muted-foreground sm:col-span-2">
                      Without both consents the captures are stored but not analysed, and the assessment
                      continues on coach-measured values alone.
                    </p>
                  )}
                </div>

                {/* Scan result */}
                {scanState && (
                  <div className="rounded-xl border border-border/70 bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Body scan</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">
                          {scanState.status}
                        </span>
                        {!scanState.is_terminal && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      </div>
                      {scanState.is_terminal && scanState.status !== 'SKIPPED_NO_CONSENT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={rescanMutation.isPending}
                          onClick={() => rescanMutation.mutate()}
                        >
                          Re-run scan
                        </Button>
                      )}
                    </div>

                    {scanState.error && <p className="text-[11px] text-destructive">{scanState.error}</p>}
                    {(scanState.warnings || []).map((w: string, i: number) => (
                      <p key={i} className="text-[11px] text-amber-600 dark:text-amber-400">{w}</p>
                    ))}

                    {scanState.posture?.posture_score != null && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                        {([
                          { label: 'Posture', value: scanState.posture.posture_score, unit: '/100' },
                          { label: 'Shoulder tilt', value: scanState.posture.shoulder_tilt_degrees, unit: '°' },
                          { label: 'Hip tilt', value: scanState.posture.hip_tilt_degrees, unit: '°' },
                          { label: 'Forward head', value: scanState.posture.forward_head_angle_degrees, unit: '°' },
                          { label: 'Midline shift', value: scanState.posture.lateral_shift_degrees, unit: '°' },
                        ] as Array<{ label: string; value: number | null; unit: string }>).map((tile) => (
                          <div key={tile.label} className="rounded-lg bg-muted/40 p-2">
                            <p className="text-[10px] text-muted-foreground">{tile.label}</p>
                            <p className="text-sm font-bold text-foreground">
                              {tile.value == null ? 'Not assessed' : `${tile.value}${tile.unit}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!!Object.keys(scanState.circumference_estimates?.values || {}).length && (
                      <div className="pt-1 space-y-1">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(scanState.circumference_estimates?.values || {}).map(([key, value]) => (
                            <span key={key} className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                              {key.replace(/_/g, ' ')}: <strong>{String(value)}</strong>
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Estimated from capture geometry, low confidence. Tape measurements stay authoritative;
                          use these for tracking change between assessments, not as absolute values.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('intake')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={() => uploadPhotosAndVitalsMutation.mutate()}
                    disabled={uploadPhotosAndVitalsMutation.isPending}
                    className="flex-2 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{uploadPhotosAndVitalsMutation.isPending ? 'Saving...' : 'Save & Move to Movement Battery'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 3: FUNCTIONAL MOVEMENT & PERFORMANCE BATTERY (FAST-LOG) */}
            {/* ===================================================================== */}
            {currentStep === 'movement' && activeSession && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    <span>Functional Movement Battery</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Coach fast-entry: select the scaled test variation and tap completed reps & movement quality.
                  </p>
                </div>

                {/* 1. Lower Body Strength */}
                <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      1. Lower Body: Squat / Chair-Stand Test
                    </span>
                    <Badge variant="outline" className="text-[10px]">Strength & Stability</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Box Squat', 'Bodyweight Squat', 'Goblet Squat', '30s Chair-Stand'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setFunctionalTests((prev) => ({
                            ...prev,
                            lower_body: { ...prev.lower_body, variation: v },
                          }))
                        }
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          functionalTests.lower_body?.variation === v
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted/40 border-border/60 text-muted-foreground'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Completed Reps</label>
                      <Input
                        type="number"
                        value={functionalTests.lower_body?.reps || 12}
                        onChange={(e) =>
                          setFunctionalTests((prev) => ({
                            ...prev,
                            lower_body: { ...prev.lower_body, reps: parseInt(e.target.value, 10) || 0 },
                          }))
                        }
                        className="h-9 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Movement Quality</label>
                      <div className="flex gap-1">
                        {['Meets criteria', 'Needs cueing', 'Modified'].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() =>
                              setFunctionalTests((prev) => ({
                                ...prev,
                                lower_body: { ...prev.lower_body, movement_quality: q },
                              }))
                            }
                            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                              functionalTests.lower_body?.movement_quality === q
                                ? 'bg-primary/20 text-primary border-primary'
                                : 'bg-background border-border/60 text-muted-foreground'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Upper Body Strength */}
                <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      2. Upper Body: Push-Up Assessment
                    </span>
                    <Badge variant="outline" className="text-[10px]">Pushing Capacity</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Wall Push-Up', 'High-Incline', 'Knee Push-Up', 'Floor Push-Up'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setFunctionalTests((prev) => ({
                            ...prev,
                            upper_body: { ...prev.upper_body, pushup_variation: v },
                          }))
                        }
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          functionalTests.upper_body?.pushup_variation === v
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted/40 border-border/60 text-muted-foreground'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Valid Repetitions</label>
                      <Input
                        type="number"
                        value={functionalTests.upper_body?.pushup_reps || 10}
                        onChange={(e) =>
                          setFunctionalTests((prev) => ({
                            ...prev,
                            upper_body: { ...prev.upper_body, pushup_reps: parseInt(e.target.value, 10) || 0 },
                          }))
                        }
                        className="h-9 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Quality</label>
                      <div className="flex gap-1">
                        {['Good control', 'Needs cueing', 'Modified'].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() =>
                              setFunctionalTests((prev) => ({
                                ...prev,
                                upper_body: { ...prev.upper_body, pushup_quality: q },
                              }))
                            }
                            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                              functionalTests.upper_body?.pushup_quality === q
                                ? 'bg-primary/20 text-primary border-primary'
                                : 'bg-background border-border/60 text-muted-foreground'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Core & Balance Quick Log */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Core Plank */}
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                      3. Core: Plank Hold
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={functionalTests.core?.hold_seconds || 45}
                        onChange={(e) =>
                          setFunctionalTests((prev) => ({
                            ...prev,
                            core: { ...prev.core, hold_seconds: parseInt(e.target.value, 10) || 0 },
                          }))
                        }
                        className="h-9 font-bold w-24 text-center"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">Hold Duration (Sec)</span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                      4. Balance: Single-Leg Stance
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-bold">L:</span>
                        <Input
                          type="number"
                          value={functionalTests.balance?.single_leg_left_sec || 25}
                          onChange={(e) =>
                            setFunctionalTests((prev) => ({
                              ...prev,
                              balance: { ...prev.balance, single_leg_left_sec: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9 font-bold w-16 text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-bold">R:</span>
                        <Input
                          type="number"
                          value={functionalTests.balance?.single_leg_right_sec || 28}
                          onChange={(e) =>
                            setFunctionalTests((prev) => ({
                              ...prev,
                              balance: { ...prev.balance, single_leg_right_sec: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9 font-bold w-16 text-center"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Seconds</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('vitals_capture')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={() => saveMovementBatteryMutation.mutate()}
                    disabled={saveMovementBatteryMutation.isPending}
                    className="flex-2 gap-2"
                  >
                    <span>Proceed to Review & Approval Gate</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 4: COACH REVIEW & APPROVAL GATE (THE COMMAND CENTER) */}
            {/* ===================================================================== */}
            {currentStep === 'review' && activeSession && (
              <div className="space-y-6">
                <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <span>Assessment Findings & Capability Matrix</span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generated from camera posture analysis, logged tests, and metabolic calculations.
                      </p>
                    </div>
                    <Badge
                      className={
                        activeSession.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                      }
                    >
                      {activeSession.status}
                    </Badge>
                  </div>

                  {/* Vitals & Posture KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Posture Score</span>
                      <h3 className="text-xl font-black text-primary mt-0.5">
                        {activeSession.metrics?.posture_score ?? '—'}
                        <span className="text-[10px] font-normal text-muted-foreground">/100</span>
                      </h3>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Calculated BMI</span>
                      <h3 className="text-xl font-black text-foreground mt-0.5">{computedBmi}</h3>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">RMR (Resting)</span>
                      <h3 className="text-xl font-black text-foreground mt-0.5">{computedRmr} kcal</h3>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Daily Calorie Target</span>
                      <h3 className="text-xl font-black text-emerald-400 mt-0.5">{computedCalorieTarget} kcal</h3>
                    </div>
                  </div>

                  {/* Domain Capability Matrix (Section 13) */}
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                      Domain Capability Matrix
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { domain: 'Lower Body', rating: functionalTests.lower_body?.movement_quality === 'Meets criteria' ? 'Established' : 'Developing' },
                        { domain: 'Upper Body', rating: functionalTests.upper_body?.pushup_quality === 'Good control' ? 'Developing' : 'Beginner' },
                        { domain: 'Core Stability', rating: (functionalTests.core?.hold_seconds || 0) >= 45 ? 'Established' : 'Developing' },
                        { domain: 'Balance Control', rating: (functionalTests.balance?.single_leg_left_sec || 0) >= 20 ? 'Established' : 'Needs Support' },
                        { domain: 'Mobility & Range', rating: 'Within Protocol' },
                        { domain: 'Cardiovascular', rating: 'Establishing Baseline' },
                      ].map((item) => (
                        <div key={item.domain} className="p-2.5 bg-background rounded-xl border border-border/50 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">{item.domain}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                            {item.rating}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personalized Nutrition Plan Card */}
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                          Personalized Nutrition & Metabolic Targets
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                        Goal-Calibrated
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-background/60 rounded-xl">
                        <span className="text-[10px] text-muted-foreground block">Daily Calories</span>
                        <span className="text-sm font-bold text-foreground">{computedCalorieTarget} kcal</span>
                      </div>
                      <div className="p-2 bg-background/60 rounded-xl">
                        <span className="text-[10px] text-muted-foreground block">Protein Target</span>
                        <span className="text-sm font-bold text-emerald-500">{proteinTargetG}g / day</span>
                      </div>
                      <div className="p-2 bg-background/60 rounded-xl">
                        <span className="text-[10px] text-muted-foreground block">Hydration</span>
                        <span className="text-sm font-bold text-primary">{hydrationTargetL} L / day</span>
                      </div>
                    </div>
                  </div>

                  {/* Matched Database Studio Package */}
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Recommended Studio Package Match
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCatalogDrawer(!showCatalogDrawer)}
                        className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{showCatalogDrawer ? 'Hide Catalog' : 'Change Package'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition ${showCatalogDrawer ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-extrabold text-foreground">
                          {activePackage?.name || 'Reformer Pilates 72 Sessions Pack'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activePackageDetails?.sessions || estimatedSessions} Sessions · Tailored for {weeklyFrequency}x/wk over {durationWeeks} weeks.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground block">
                          {activePackageDetails?.price ? `₹${activePackageDetails.price.toLocaleString('en-IN')}` : '₹54,000'}
                        </span>
                      </div>
                    </div>

                    {showCatalogDrawer && (
                      <div className="pt-2 border-t border-border/50 space-y-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Available Studio Catalog Packages:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {dbPackages.map((pkg) => {
                            const details = getPackageDetails(pkg);
                            const isSelected = activePackage?.id === pkg.id;
                            return (
                              <div
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPackageId(pkg.id);
                                  setShowCatalogDrawer(false);
                                }}
                                className={`p-2.5 rounded-xl border cursor-pointer transition select-none flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                    : 'border-border/60 bg-background hover:bg-muted/30'
                                }`}
                              >
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-foreground truncate">{pkg.name}</h5>
                                  <p className="text-[10px] text-muted-foreground">{details.sessions} sessions</p>
                                </div>
                                <span className="text-xs font-bold text-foreground shrink-0">
                                  {details.price ? `₹${details.price.toLocaleString('en-IN')}` : '₹--'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COACH SIGN-OFF & APPROVAL GATE */}
                <div className="bg-card border-2 border-primary/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Coach Approval & Screen Unlock Gate</h3>
                      <p className="text-xs text-muted-foreground">
                        Signs off the evaluation and unlocks the output on the studio screen. (No WhatsApp dispatch).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Coach Guidance & Feedback</label>
                      <Input
                        value={coachNotes}
                        onChange={(e) => setCoachNotes(e.target.value)}
                        placeholder="e.g. Solid baseline strength. Focus on core stability during Reformer footwork."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Workout Prescription</label>
                      <Input
                        value={workoutPrescription}
                        onChange={(e) => setWorkoutPrescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || activeSession.status === 'APPROVED'}
                    className="w-full h-12 text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {activeSession.status === 'APPROVED'
                        ? 'Assessment Approved & Display Unlocked'
                        : approveMutation.isPending
                        ? 'Approving & Unlocking Display...'
                        : 'Approve & Unlock Studio TV Presentation'}
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* Standardised capture: live preview with framing guides, so every assessment is shot
          the same way and two captures stay comparable. */}
      {cameraForView && (
        <WebCameraCaptureModal
          isOpen={!!cameraForView}
          onClose={() => setCameraForView(null)}
          title={CAPTURE_VIEWS.find((v) => v.id === cameraForView)?.label || 'Baseline Capture'}
          viewType={CAPTURE_VIEWS.find((v) => v.id === cameraForView)?.framing || 'general'}
          onPhotoCaptured={(file, previewUrl) => {
            const view = cameraForView;
            if (!view) return;
            setCaptureFiles((prev) => ({ ...prev, [view]: file }));
            setCapturePreviews((prev) => ({ ...prev, [view]: previewUrl }));
            setCameraForView(null);
          }}
        />
      )}
    </div>
  );
};
