import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { assessmentApi, type AssessmentSession } from '@/api/endpoints/assessmentApi';
import { catalogApi } from '@/api/endpoints/catalogApi';
import type { Package } from '@/types/catalog';
import { useAuth, useApp } from '@/contexts';

export const AssessmentStudioWorkspace: React.FC = () => {
  const { user } = useAuth();
  const { locationId } = useApp();
  const queryClient = useQueryClient();

  // Workflow Steps: 'intake' | 'capture' | 'review' | 'display_mode'
  const [currentStep, setCurrentStep] = useState<'intake' | 'capture' | 'review' | 'display_mode'>('intake');

  // Intake State
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('+91');

  // Flexible Goal: Custom text for what the client wants to achieve
  const [customGoalOutcome, setCustomGoalOutcome] = useState(
    'De-rotate spine, relieve lower back tightness, and tone core & lower belly.'
  );
  const [modalityFocus, setModalityFocus] = useState<'PILATES' | 'BOOTCAMP' | 'HYBRID' | 'STRENGTH' | 'CUSTOM'>('PILATES');

  // Flexible Duration: Custom value and unit (Weeks or Months)
  const [durationValue, setDurationValue] = useState<number>(12);
  const [durationUnit, setDurationUnit] = useState<'WEEKS' | 'MONTHS'>('WEEKS');
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(3);
  const [userNotes, setUserNotes] = useState('');

  // Selected Database Package (ID of package chosen from live catalog)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [showCatalogPicker, setShowCatalogPicker] = useState<boolean>(false);

  // Active Assessment Session
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null);

  // Photos & Camera
  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null);
  const [sidePhotoPreview, setSidePhotoPreview] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);

  // Approval Form
  const [coachNotes, setCoachNotes] = useState('');
  const [workoutPrescription, setWorkoutPrescription] = useState('3x Weekly Reformer Pilates for spine de-rotation and deep core stability.');
  const [dietPrescription, setDietPrescription] = useState('High-protein recovery diet with 2.5L daily hydration.');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Display Screen Pairing
  const [pairingCodeInput, setPairingCodeInput] = useState('');

  // Dynamic Session & Timeline Calculations
  const durationInWeeks = durationUnit === 'WEEKS' ? durationValue : durationValue * 4.33;
  const estimatedSessions = Math.max(1, Math.round(weeklyFrequency * durationInWeeks));
  const timelineMonths = Math.max(1, Math.round(durationUnit === 'WEEKS' ? durationValue / 4.33 : durationValue));

  // Query Real Packages from Database
  const { data: dbPackages = [], isLoading: isLoadingPackages } = useQuery({
    queryKey: ['active-studio-packages', locationId],
    queryFn: () => catalogApi.getPackages({ status: 'ACTIVE' }),
  });

  // Extract Package Metadata helper (session count, price, currency)
  const getPackageDetails = (pkg: Package) => {
    let sessions = 0;
    let price = 0;
    let currency = 'INR';

    const version = pkg.active_version || pkg.versions?.[0];
    if (version) {
      // Check entitlements
      const ents = (version as any).entitlements || (version as any).entitlement_definitions || [];
      for (const ent of ents) {
        if (['HOME_BRANCH_SESSION', 'CLASS_SESSION', 'PERSONAL_TRAINING_SESSION', 'OPEN_ACCESS'].includes(ent.entitlement_type)) {
          if (ent.is_unlimited) {
            sessions = 365;
          } else if (ent.allocated_units) {
            sessions = parseInt(ent.allocated_units, 10) || 0;
          }
        }
      }

      // Check prices
      const prices = version.prices || [];
      const activePrice = prices.find((p: any) => p.status === 'ACTIVE') || prices[0];
      if (activePrice) {
        price = parseFloat(activePrice.total_price || activePrice.sale_price || activePrice.base_price || '0');
        currency = activePrice.currency || 'INR';
      }
    }

    // Fallback: extract sessions from package name if not explicitly set
    if (sessions === 0) {
      const match = (pkg.name || '').match(/\b(\d{2,3})\b/);
      if (match) {
        sessions = parseInt(match[1], 10);
      } else {
        sessions = 72;
      }
    }

    return { sessions, price, currency };
  };

  // Score & Rank real packages against user intake
  const scoredPackages = useMemo(() => {
    if (!dbPackages || dbPackages.length === 0) return [];

    return dbPackages.map((pkg) => {
      const details = getPackageDetails(pkg);
      const pkgNameLower = (pkg.name || '').toLowerCase();
      const progNameLower = (pkg.program_name || '').toLowerCase();

      let score = 100;

      // Modality match
      if (modalityFocus === 'PILATES') {
        if (pkgNameLower.includes('pilates') || progNameLower.includes('pilates')) score += 60;
      } else if (modalityFocus === 'BOOTCAMP') {
        if (pkgNameLower.includes('bootcamp') || progNameLower.includes('bootcamp') || pkgNameLower.includes('hiit')) score += 60;
      } else if (modalityFocus === 'HYBRID') {
        if (pkgNameLower.includes('hybrid') || pkgNameLower.includes('combo')) score += 60;
      }

      // Proximity to estimated session requirement
      const diff = Math.abs(details.sessions - estimatedSessions);
      score -= Math.min(diff, 60);

      return {
        pkg,
        details,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [dbPackages, modalityFocus, estimatedSessions]);

  // Top Matched Package from real DB
  const topMatchedPackage = scoredPackages[0]?.pkg || null;
  const topMatchedDetails = topMatchedPackage ? getPackageDetails(topMatchedPackage) : null;

  // Selected package (user override or auto-matched)
  const activePackage = useMemo(() => {
    if (selectedPackageId) {
      const found = dbPackages.find((p) => p.id === selectedPackageId);
      if (found) return found;
    }
    return topMatchedPackage;
  }, [selectedPackageId, dbPackages, topMatchedPackage]);

  const activePackageDetails = activePackage ? getPackageDetails(activePackage) : null;

  // Fallback package display name if DB catalog is empty
  const fallbackPackageName =
    modalityFocus === 'PILATES'
      ? estimatedSessions <= 80
        ? 'Reformer Pilates 72 Sessions Pack'
        : 'Reformer Pilates 144 Sessions Annual Pack'
      : estimatedSessions <= 80
      ? 'Bootcamp 72 Sessions Pack'
      : 'Bootcamp 144 Sessions Pack';

  // Step 1: Start Session Mutation
  const startSessionMutation = useMutation({
    mutationFn: () => {
      const goalKey =
        modalityFocus === 'PILATES'
          ? 'POSTURE_ALIGNMENT'
          : modalityFocus === 'BOOTCAMP'
          ? 'FAT_LOSS'
          : modalityFocus === 'STRENGTH'
          ? 'STRENGTH_CONDITIONING'
          : 'CUSTOM';

      const combinedNotes = [
        customGoalOutcome ? `Target Outcome: ${customGoalOutcome}` : '',
        userNotes ? `Client Notes: ${userNotes}` : '',
        `Committed Duration: ${durationValue} ${durationUnit.toLowerCase()} at ${weeklyFrequency} days/wk (~${estimatedSessions} sessions required)`,
      ]
        .filter(Boolean)
        .join(' | ');

      return assessmentApi.startAssessment({
        member_name: memberName.trim() || 'Guest Client',
        member_phone: memberPhone.trim(),
        target_goal: goalKey,
        target_timeline_months: timelineMonths,
        weekly_frequency_days: weeklyFrequency,
        user_notes: combinedNotes,
        branch_id: locationId && locationId !== 'all' ? locationId : undefined,
        package_id: activePackage?.id,
        bypass_paywall: true,
      });
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setCurrentStep('capture');
      toast.success('Session started! Please capture baseline photos.');
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || 'Failed to start assessment session.');
    },
  });

  // Step 2: Upload Photos Mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error('No active assessment session');
      const formData = new FormData();
      if (frontFile) formData.append('photo_front', frontFile);
      if (sideFile) formData.append('photo_side', sideFile);
      formData.append('height_cm', '168');
      formData.append('weight_kg', '64');
      return assessmentApi.capturePhotos(activeSession.id, formData);
    },
    onSuccess: () => {
      assessmentApi.getAssessment(activeSession!.id).then((fresh) => {
        setActiveSession(fresh);
        setCurrentStep('review');
        toast.success('Computer vision analysis complete!');
      });
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || 'Failed to analyze baseline photos.');
    },
  });

  // Step 3: Admin Approval & WhatsApp Dispatch Mutation
  const approveMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error('No active session');
      return assessmentApi.approveAndSend(activeSession.id, {
        coach_notes: coachNotes,
        workout_prescription: workoutPrescription,
        diet_prescription: dietPrescription,
        send_whatsapp: sendWhatsApp,
      });
    },
    onSuccess: () => {
      toast.success('Assessment approved! Report dispatched to member via WhatsApp.');
      assessmentApi.getAssessment(activeSession!.id).then(setActiveSession);
    },
    onError: (err: any) => {
      toast.error(err?.data?.error || 'Failed to approve assessment.');
    },
  });

  // File Handlers
  const handleFrontPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontFile(file);
      setFrontPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSidePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSideFile(file);
      setSidePhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
      <PageHeader
        title="Assessment & Transformation Studio"
        description="Dual-device assessment engine: Tablet controller, AI posture & body composition auto-fill, and manual WhatsApp approval gate."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={currentStep === 'display_mode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentStep(currentStep === 'display_mode' ? 'intake' : 'display_mode')}
              className="gap-1.5"
            >
              <Tv className="w-4 h-4" />
              <span>{currentStep === 'display_mode' ? 'Exit TV Mirror' : 'Studio TV Display'}</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* ========================================================================= */}
        {/* MODE 1: STUDIO TV DISPLAY SCREEN (FULLSCREEN MIRROR) */}
        {/* ========================================================================= */}
        {currentStep === 'display_mode' ? (
          <div className="bg-card border border-border/80 rounded-3xl p-8 max-w-4xl mx-auto text-center space-y-6 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
              <Tv className="w-4 h-4" /> Studio Display Monitor Mirror
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Connect to Trainer's Tablet
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Enter the 6-digit session pairing code shown on the trainer's tablet to broadcast live framing and transformation reveal onto this studio screen.
            </p>

            <div className="max-w-xs mx-auto flex gap-2">
              <Input
                placeholder="Enter 6-digit Code"
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
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{activeSession.member_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeSession.target_goal_display} · {activeSession.timeline_months} Months
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Live Paired
                  </Badge>
                </div>

                {/* Milestone Progress Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/60 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Month 1 Baseline</span>
                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={activeSession.milestones?.month_1 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80'}
                        alt="Month 1"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Postural realignment & neuromuscular adaptation</p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/60 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Month 2 Progression</span>
                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={activeSession.milestones?.month_2 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                        alt="Month 2"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Core hypertrophy & subcutaneous fat reduction</p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/60 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Month 3 Milestone</span>
                    <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={activeSession.milestones?.month_3 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                        alt="Month 3"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Target silhouette & functional posture score 92+</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MODE 2: TRAINER TABLET & INTAKE WORKSPACE */
          /* ========================================================================= */
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Step Navigation Pill */}
            <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-2xl border border-border/60 text-xs font-medium">
              <button
                onClick={() => setCurrentStep('intake')}
                className={`flex-1 py-2 rounded-xl transition ${
                  currentStep === 'intake' ? 'bg-background shadow-xs font-bold text-foreground' : 'text-muted-foreground'
                }`}
              >
                1. Member Intake
              </button>
              <button
                onClick={() => activeSession && setCurrentStep('capture')}
                disabled={!activeSession}
                className={`flex-1 py-2 rounded-xl transition ${
                  currentStep === 'capture' ? 'bg-background shadow-xs font-bold text-foreground' : 'text-muted-foreground'
                }`}
              >
                2. Photo Capture
              </button>
              <button
                onClick={() => activeSession && setCurrentStep('review')}
                disabled={!activeSession}
                className={`flex-1 py-2 rounded-xl transition ${
                  currentStep === 'review' ? 'bg-background shadow-xs font-bold text-foreground' : 'text-muted-foreground'
                }`}
              >
                3. Review & Approval
              </button>
            </div>

            {/* STEP 1: INTERACTIVE USER INTAKE */}
            {currentStep === 'intake' && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span>Member Goals & Commitment Intake</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Capture what the member wants to achieve and their exact timeframe. The system pairs their answer to active database studio packages.
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
                    <label className="text-xs font-semibold text-foreground">WhatsApp Mobile Number</label>
                    <Input
                      placeholder="+919876543210"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* 1. What does the member want to achieve? (Direct Free-Text Intake) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>What do you want to achieve?</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Type specific target outcomes</span>
                  </div>
                  <Textarea
                    placeholder="e.g., Tone lower belly fat, fix forward head posture and anterior pelvic tilt, strengthen core for lower back relief..."
                    value={customGoalOutcome}
                    onChange={(e) => setCustomGoalOutcome(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />

                  {/* Quick-tap suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: '+ Posture & Core Alignment', focus: 'PILATES' },
                      { label: '+ Lower Belly Fat Reduction', focus: 'BOOTCAMP' },
                      { label: '+ Glutes & Posterior Chain', focus: 'PILATES' },
                      { label: '+ Full-Body Athletic Conditioning', focus: 'BOOTCAMP' },
                      { label: '+ Spine & Back Pain Rehab', focus: 'PILATES' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          if (!customGoalOutcome.includes(chip.label.replace('+ ', ''))) {
                            setCustomGoalOutcome((prev) =>
                              prev ? `${prev.trim()}, ${chip.label.replace('+ ', '')}` : chip.label.replace('+ ', '')
                            );
                          }
                          setModalityFocus(chip.focus as any);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/60 transition text-muted-foreground cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Modality Focus */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Primary Studio Modality</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'PILATES', label: 'Reformer Pilates', desc: 'Spine & Core Focus' },
                      { id: 'BOOTCAMP', label: 'HIIT Bootcamp', desc: 'Fat Loss & Cardio' },
                      { id: 'HYBRID', label: 'Hybrid Studio', desc: 'Pilates + Bootcamp' },
                      { id: 'STRENGTH', label: 'Strength & Tone', desc: 'Hypertrophy & Power' },
                    ].map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setModalityFocus(mod.id as any)}
                        className={`p-3 rounded-2xl border text-left transition select-none ${
                          modalityFocus === mod.id
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

                {/* 3. Flexible Time Duration & Weekly Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Duration Intake */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Commitment Duration</span>
                      </label>
                      <div className="flex rounded-lg bg-muted p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (durationUnit !== 'WEEKS') {
                              setDurationUnit('WEEKS');
                              setDurationValue(durationValue * 4);
                            }
                          }}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${
                            durationUnit === 'WEEKS' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          Weeks
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (durationUnit !== 'MONTHS') {
                              setDurationUnit('MONTHS');
                              setDurationValue(Math.max(1, Math.round(durationValue / 4)));
                            }
                          }}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${
                            durationUnit === 'MONTHS' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          Months
                        </button>
                      </div>
                    </div>

                    {/* Numeric Input + Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={durationUnit === 'WEEKS' ? 104 : 24}
                          value={durationValue}
                          onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="h-10 text-center font-bold text-sm w-28"
                        />
                        <span className="text-xs text-muted-foreground font-medium">
                          {durationUnit === 'WEEKS' ? 'Weeks of training' : 'Months of training'}
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {durationUnit === 'WEEKS'
                          ? [8, 12, 16, 24].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setDurationValue(w)}
                                className={`py-1.5 rounded-xl border text-xs font-semibold transition ${
                                  durationValue === w
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border/60 bg-muted/30 hover:bg-muted text-foreground'
                                }`}
                              >
                                {w} Wks
                              </button>
                            ))
                          : [1, 3, 6, 12].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setDurationValue(m)}
                                className={`py-1.5 rounded-xl border text-xs font-semibold transition ${
                                  durationValue === m
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border/60 bg-muted/30 hover:bg-muted text-foreground'
                                }`}
                              >
                                {m} Mo
                              </button>
                            ))}
                      </div>
                    </div>
                  </div>

                  {/* Frequency Intake */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Weekly Workout Frequency</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={7}
                          value={weeklyFrequency}
                          onChange={(e) => setWeeklyFrequency(Math.max(1, Math.min(7, parseInt(e.target.value, 10) || 1)))}
                          className="h-10 text-center font-bold text-sm w-28"
                        />
                        <span className="text-xs text-muted-foreground font-medium">Workout days per week</span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {[2, 3, 4, 5, 6].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setWeeklyFrequency(f)}
                            className={`py-1.5 rounded-xl border text-xs font-semibold transition ${
                              weeklyFrequency === f
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border/60 bg-muted/30 hover:bg-muted text-foreground'
                            }`}
                          >
                            {f}x/wk
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Real Database Package Suggestion Card */}
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <PackageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Catalog Package Match
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          {activePackage?.name || fallbackPackageName}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-foreground block">
                        {activePackageDetails?.price
                          ? `₹${activePackageDetails.price.toLocaleString('en-IN')}`
                          : '₹54,000 - ₹96,000'}
                      </span>
                      <span className="text-[11px] text-primary font-semibold">
                        ~{activePackageDetails?.sessions || estimatedSessions} Sessions
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
                    <span>
                      Required volume: <strong>~{estimatedSessions} sessions</strong> ({weeklyFrequency}x/wk over {durationValue} {durationUnit.toLowerCase()}).
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCatalogPicker(!showCatalogPicker)}
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1 text-[11px] ml-2"
                    >
                      <span>{showCatalogPicker ? 'Hide Catalog' : 'Change Package'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition ${showCatalogPicker ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Expandable Live Catalog Picker */}
                  {showCatalogPicker && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Available Packages in Studio Catalog:
                      </span>
                      {dbPackages.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No custom packages loaded from database yet; standard 72/144 session packs will be used.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {dbPackages.map((pkg) => {
                            const details = getPackageDetails(pkg);
                            const isSelected = (activePackage?.id === pkg.id);
                            return (
                              <div
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPackageId(pkg.id);
                                  setShowCatalogPicker(false);
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition select-none flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                    : 'border-border/60 bg-background hover:bg-muted/30'
                                }`}
                              >
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-foreground truncate">{pkg.name}</h5>
                                  <p className="text-[10px] text-muted-foreground">
                                    {details.sessions} sessions · {pkg.program_name || 'Studio Program'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-foreground block">
                                    {details.price ? `₹${details.price.toLocaleString('en-IN')}` : '₹--'}
                                  </span>
                                  {isSelected && <Badge className="text-[9px] px-1.5 py-0 bg-primary">Selected</Badge>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                  className="w-full h-11 text-sm font-semibold gap-2"
                >
                  <span>Continue to Photo Capture</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: CAMERA CAPTURE */}
            {currentStep === 'capture' && activeSession && (
              <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Capture Baseline Photos
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stand 2.5m away against clean studio wall. Hold posture for 3 seconds.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">TV Pairing Code</span>
                    <span className="text-base font-mono font-bold text-primary">{activeSession.pairing_code}</span>
                  </div>
                </div>

                {/* Upload Photo Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Photo */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">1. Front Standing View</label>
                    <div className="aspect-3/4 rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 relative flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition cursor-pointer">
                      {frontPhotoPreview ? (
                        <img src={frontPhotoPreview} alt="Front View" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
                          <p className="text-xs font-medium text-foreground">Tap to take photo</p>
                          <p className="text-[10px] text-muted-foreground">Look straight ahead</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFrontPhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Side Photo */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">2. Side Profile View</label>
                    <div className="aspect-3/4 rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 relative flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition cursor-pointer">
                      {sidePhotoPreview ? (
                        <img src={sidePhotoPreview} alt="Side View" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
                          <p className="text-xs font-medium text-foreground">Tap to take photo</p>
                          <p className="text-[10px] text-muted-foreground">Arms resting naturally at sides</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSidePhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('intake')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => uploadPhotosMutation.mutate()}
                    disabled={uploadPhotosMutation.isPending}
                    className="flex-2 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{uploadPhotosMutation.isPending ? 'Analyzing Posture...' : 'Analyze Posture & Milestones'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW, AUTO-FILLED METRICS & ADMIN APPROVAL GATE */}
            {currentStep === 'review' && activeSession && (
              <div className="space-y-6">
                {/* Metrics & Posture Card */}
                <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground">
                        Posture & Body Composition Report
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Extracted via Computer Vision. Auto-filled on tablet.
                      </p>
                    </div>
                    <Badge
                      className={
                        activeSession.status === 'APPROVED' || activeSession.status === 'DISPATCHED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                      }
                    >
                      {activeSession.status}
                    </Badge>
                  </div>

                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">Posture Score</span>
                      <h3 className="text-2xl font-black text-primary mt-1">
                        {activeSession.metrics?.posture_score || 85.0}
                        <span className="text-xs font-normal text-muted-foreground">/100</span>
                      </h3>
                    </div>
                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">Shoulder Tilt</span>
                      <h3 className="text-2xl font-black text-foreground mt-1">
                        {activeSession.metrics?.shoulder_tilt_degrees || 1.8}°
                      </h3>
                    </div>
                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">Est. Body Fat</span>
                      <h3 className="text-2xl font-black text-foreground mt-1">
                        {activeSession.metrics?.estimated_body_fat_pct || 24.2}%
                      </h3>
                    </div>
                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-center">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase">Waist-Hip Ratio</span>
                      <h3 className="text-2xl font-black text-foreground mt-1">
                        {activeSession.metrics?.waist_to_hip_ratio || 0.78}
                      </h3>
                    </div>
                  </div>

                  {/* Matched System Program */}
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Selected Database Studio Package
                      </span>
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        SWEAT Catalog Package
                      </Badge>
                    </div>
                    <h3 className="text-base font-extrabold text-foreground">
                      {activeSession.recommended_package?.name || activePackage?.name || fallbackPackageName}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activeSession.recommended_package?.reason ||
                        `Tailored to fulfill commitment of ${weeklyFrequency} days/week for ${durationValue} ${durationUnit.toLowerCase()} to target ${customGoalOutcome}.`}
                    </p>
                  </div>

                  {/* Month 1, 2, 3 Transformation Progression */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">
                      Month-by-Month Transformation Progression
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-muted/30 rounded-2xl border border-border/60 text-center space-y-2">
                        <span className="text-[11px] font-bold text-primary">Month 1 Baseline</span>
                        <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                          <img
                            src={activeSession.milestones?.month_1 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80'}
                            alt="Month 1"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-2xl border border-border/60 text-center space-y-2">
                        <span className="text-[11px] font-bold text-primary">Month 2 Progression</span>
                        <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                          <img
                            src={activeSession.milestones?.month_2 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                            alt="Month 2"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-2xl border border-border/60 text-center space-y-2">
                        <span className="text-[11px] font-bold text-emerald-400">Month 3 Target</span>
                        <div className="aspect-3/4 rounded-xl overflow-hidden bg-muted">
                          <img
                            src={activeSession.milestones?.month_3 || activeSession.photo_front_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                            alt="Month 3"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MANUAL ADMIN APPROVAL GATE */}
                <div className="bg-card border-2 border-primary/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Coach Review & WhatsApp Approval Gate
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        No report will be dispatched to the member until you verify and click "Approve & Send".
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Coach Guidance & Advice</label>
                      <Input
                        value={coachNotes}
                        onChange={(e) => setCoachNotes(e.target.value)}
                        placeholder="e.g. Excellent symmetry. Focus on core engagement during Reformer leg springs."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Workout Prescription</label>
                      <Input
                        value={workoutPrescription}
                        onChange={(e) => setWorkoutPrescription(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="send_whatsapp_check"
                        checked={sendWhatsApp}
                        onChange={(e) => setSendWhatsApp(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="send_whatsapp_check" className="text-xs font-medium text-foreground cursor-pointer">
                        Dispatch official summary to member's WhatsApp ({activeSession.member_phone || '+91...'}) via Gupshup
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || activeSession.status === 'APPROVED' || activeSession.status === 'DISPATCHED'}
                    className="w-full h-12 text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {activeSession.status === 'DISPATCHED'
                        ? 'Report Already Approved & Dispatched'
                        : approveMutation.isPending
                        ? 'Approving & Sending...'
                        : 'Approve & Send Report to Member'}
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageBody>
    </div>
  );
};
