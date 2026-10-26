import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  PenTool,
  ShieldCheck,
  AlertTriangle,
  FileText,
  History,
  CopyCheck,
  FileEdit,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { membershipsApi } from '@/api/endpoints/membershipsApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface MemberParqSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  onSuccess?: () => void;
}

export function MemberParqSigningModal({
  open,
  onOpenChange,
  membershipId,
  onSuccess,
}: MemberParqSigningModalProps) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // 3-Option PAR-Q Decision State: 'REUSE' | 'EDIT' | 'NEW'
  const [parqDecision, setParqDecision] = useState<'REUSE' | 'EDIT' | 'NEW'>('REUSE');

  // Fetch requirement definition & form
  const { data: requirement, isLoading, error } = useQuery({
    queryKey: ['membership-parq-requirement', membershipId],
    queryFn: () => membershipsApi.getParqRequirement(membershipId),
    enabled: open && Boolean(membershipId),
  });

  const hasExisting = Boolean(requirement?.has_existing_submission && requirement?.existing_submission);

  // Initialize decision mode and answers based on existing submission
  useEffect(() => {
    if (requirement) {
      if (hasExisting) {
        setParqDecision('REUSE');
      } else {
        setParqDecision('NEW');
      }
    }
  }, [requirement, hasExisting]);

  // When switching to EDIT, pre-fill answers from existing submission
  useEffect(() => {
    if (parqDecision === 'EDIT' && requirement?.existing_submission?.answers) {
      const initialAnswers: Record<string, any> = {};
      if (Array.isArray(requirement.existing_submission.answers)) {
        requirement.existing_submission.answers.forEach((a: any) => {
          const val = a.answer ?? a.value ?? a.text_value ?? a.boolean_value;
          if (a.question_id) initialAnswers[a.question_id] = val;
          if (a.order || a.display_order) initialAnswers[`q_${a.order || a.display_order}`] = val;
        });
      } else if (typeof requirement.existing_submission.answers === 'object') {
        Object.assign(initialAnswers, requirement.existing_submission.answers);
      }
      setAnswers(initialAnswers);
      setConsentAccepted(false);
      setHasSignature(false);
    } else if (parqDecision === 'NEW') {
      setAnswers({});
      setConsentAccepted(false);
      setHasSignature(false);
    }
  }, [parqDecision, requirement]);

  // Setup canvas high-DPI scaling
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5 * dpr;
    ctx.strokeStyle = '#0284c7';
  };

  useEffect(() => {
    if (open && requirement && !isLoading && (parqDecision === 'EDIT' || parqDecision === 'NEW' || !hasExisting)) {
      const timer = setTimeout(setupCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [open, requirement, isLoading, parqDecision, hasExisting]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async (payload: any) => {
      return membershipsApi.signParq(membershipId, payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || 'PAR-Q processed successfully! You may now book classes.');
      queryClient.invalidateQueries({ queryKey: ['member-360'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-parq-requirement', membershipId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to process PAR-Q.';
      setValidationError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    setValidationError(null);

    // OPTION A: REUSE EXISTING PAR-Q
    if (hasExisting && parqDecision === 'REUSE') {
      signMutation.mutate({
        parq_decision: 'REUSE',
        existing_submission_id: requirement.existing_submission.id,
      });
      return;
    }

    if (!requirement?.form) {
      setValidationError('No active PAR-Q form configured.');
      return;
    }

    // Required questions validation for EDIT / NEW
    const questions: any[] = requirement.form.questions || [];
    for (const q of questions) {
      if (q.is_required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '') {
          setValidationError(`Please answer question: "${q.question_text}"`);
          toast.error(`Required question missing: "${q.question_text}"`);
          return;
        }
      }
    }

    // Validate agreement checkbox
    if (!consentAccepted) {
      setValidationError('You must explicitly review and accept the agreement before proceeding.');
      toast.error('Please check the agreement acceptance box.');
      return;
    }

    // Validate digital signature
    if (!hasSignature || !canvasRef.current) {
      setValidationError('Please draw your digital signature in the signature area.');
      toast.error('Newly drawn digital signature is required.');
      return;
    }

    const signatureData = canvasRef.current.toDataURL('image/png');
    if (!signatureData || signatureData.length < 100) {
      setValidationError('Please provide a complete drawn digital signature.');
      toast.error('Valid digital signature is required.');
      return;
    }

    const answersList = Object.entries(answers).map(([qId, val]) => ({
      question_id: qId,
      value: val,
    }));

    signMutation.mutate({
      parq_decision: parqDecision,
      agreement_accepted: true,
      signature_data: signatureData,
      answers: answersList,
    });
  };

  const form = requirement?.form;
  const questions: any[] = form?.questions || [];
  const isAlreadyCompleted = requirement?.parq_status === 'COMPLETED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {form?.name || 'Physical Activity Readiness Questionnaire (PAR-Q)'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {requirement ? `${requirement.program_name} • ${requirement.package_name} (${requirement.membership_number})` : 'Loading requirement...'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading PAR-Q questionnaire & agreement...</p>
            </div>
          ) : error || !requirement?.is_configured ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">Questionnaire Temporarily Unavailable</h4>
              <p className="text-xs text-muted-foreground">
                No active physical readiness questionnaire is currently configured by gym administration for this program. Studio administration must publish the active form before health clearance can be completed.
              </p>
            </div>
          ) : isAlreadyCompleted ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">PAR-Q Already Completed</h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                  This membership already has a valid digital signature on file. You are cleared for booking classes!
                </p>
              </div>
              {requirement.submission?.signature_data && (
                <div className="pt-2">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Stored Digital Signature Preview:</p>
                  <div className="inline-block p-2 bg-white rounded-lg border border-border shadow-xs">
                    <img
                      src={requirement.submission.signature_data}
                      alt="Signature"
                      className="max-h-16 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* If an existing completed submission exists, present the 3 explicit options */}
              {hasExisting && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">Completed PAR-Q on File</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                      Previous Clearance Available
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A completed health readiness questionnaire already exists for this member. Please select how you wish to handle this purchase:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Option A: Reuse */}
                    <button
                      type="button"
                      onClick={() => setParqDecision('REUSE')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        parqDecision === 'REUSE'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500'
                          : 'border-border/80 bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <CopyCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Option A: Reuse</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Use existing verified questionnaire. Preserves original record without duplicates.
                      </p>
                    </button>

                    {/* Option B: Edit */}
                    <button
                      type="button"
                      onClick={() => setParqDecision('EDIT')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        parqDecision === 'EDIT'
                          ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                          : 'border-border/80 bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <FileEdit className="w-3.5 h-3.5 text-blue-500" />
                        <span>Option B: Edit</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Update answers & sign newly drawn signature. Creates an audited revision.
                      </p>
                    </button>

                    {/* Option C: New */}
                    <button
                      type="button"
                      onClick={() => setParqDecision('NEW')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        parqDecision === 'NEW'
                          ? 'border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500'
                          : 'border-border/80 bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>Option C: New Form</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Complete a fresh blank questionnaire with a new digital signature.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Render content based on decision */}
              {hasExisting && parqDecision === 'REUSE' ? (
                /* OPTION A: REUSE VIEW */
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-card space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Reusing Historical PAR-Q Record</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Original answers, submission timestamp, and digital signature remain permanent and untampered.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Zero Duplicates
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Original Submission Date</span>
                      <span className="font-semibold text-foreground font-mono">
                        {requirement.existing_submission?.submitted_at
                          ? new Date(requirement.existing_submission.submitted_at).toLocaleDateString()
                          : 'On file'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Form Version</span>
                      <span className="font-semibold text-foreground font-mono">
                        v{requirement.existing_submission?.version_number || 1}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Signer Identity</span>
                      <span className="font-semibold text-foreground truncate block">
                        {requirement.existing_submission?.signer_identity || 'Member on file'}
                      </span>
                    </div>
                  </div>

                  {requirement.existing_submission?.signature_data && (
                    <div className="pt-2 border-t border-border/60 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">Stored Signature:</span>
                      <div className="p-1.5 bg-white rounded-lg border border-border/80 shadow-xs inline-flex items-center justify-center min-w-[120px] min-h-[44px]">
                        <img
                          src={
                            requirement.existing_submission.signature_data.startsWith('data:image/') ||
                            requirement.existing_submission.signature_data.startsWith('http://') ||
                            requirement.existing_submission.signature_data.startsWith('https://')
                              ? requirement.existing_submission.signature_data
                              : requirement.existing_submission.signature_data.startsWith('/media/')
                              ? requirement.existing_submission.signature_data
                              : `/media/${requirement.existing_submission.signature_data.replace(/^\/+/, '')}`
                          }
                          alt="Stored Signature"
                          className="h-10 w-auto max-w-[200px] object-contain block"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-[11px] text-muted-foreground">
                    Clicking <strong>Confirm & Reuse PAR-Q</strong> will associate this verified clearance with membership <code>{requirement.membership_number}</code> and immediately clear class booking eligibility.
                  </div>
                </div>
              ) : (
                /* OPTION B (EDIT) OR OPTION C (NEW) OR FIRST-TIME */
                <>
                  {/* Revision Info Banner for Option B */}
                  {hasExisting && parqDecision === 'EDIT' && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <History className="w-3.5 h-3.5" />
                        <span>Creating Revised Version (Revision #{(requirement.submission_history?.length || 1) + 1})</span>
                      </div>
                      <p className="text-[11px]">
                        Review and modify any responses below. The previous submission and its original signature remain permanently archived in compliance records. A newly drawn signature is required.
                      </p>
                    </div>
                  )}

                  {/* Informational banner for first-time */}
                  {!hasExisting && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">Required Before Class Booking</p>
                        <p className="text-muted-foreground mt-0.5">
                          For your health and safety, all members must complete this readiness assessment and draw a digital signature before booking any class with this membership.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Questions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Readiness Questions</span>
                      </h3>
                      <span className="text-[11px] text-muted-foreground">Version {form?.version_number || 1}</span>
                    </div>

                    {questions.map((q, idx) => {
                      const qId = q.id;
                      const currentVal = answers[qId] ?? answers[`q_${q.display_order || idx + 1}`];

                      return (
                        <div
                          key={qId}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-card/90 transition-colors space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="text-xs sm:text-sm font-medium text-foreground leading-snug">
                              <span className="text-muted-foreground font-semibold mr-1.5">{idx + 1}.</span>
                              {q.question_text}
                              {q.is_required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                            </label>
                          </div>

                          {/* Question input control based on type */}
                          {q.question_type === 'BOOLEAN' ? (
                            <div className="flex items-center gap-2 pt-1 max-w-xs">
                              <button
                                type="button"
                                onClick={() => setAnswers((prev) => ({ ...prev, [qId]: true, [`q_${q.display_order || idx + 1}`]: true }))}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                  currentVal === true || currentVal === 'yes' || currentVal === 'YES' || currentVal === 'true'
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnswers((prev) => ({ ...prev, [qId]: false, [`q_${q.display_order || idx + 1}`]: false }))}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                  currentVal === false || currentVal === 'no' || currentVal === 'NO' || currentVal === 'false'
                                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-700 shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                No
                              </button>
                            </div>
                          ) : q.question_type === 'SINGLE_SELECT' || q.question_type === 'SINGLE_CHOICE' || q.question_type === 'CHOICE' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(q.options || []).map((opt: any) => {
                                const optVal = opt.value ?? opt.label ?? opt.option_text ?? opt;
                                const optLabel = opt.label ?? opt.option_text ?? opt.value ?? opt;
                                const isSelected = currentVal === optVal;
                                return (
                                  <button
                                    key={optVal}
                                    type="button"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [qId]: optVal }))}
                                    className={`py-1.5 px-3 rounded-lg text-xs text-left font-medium border transition-all ${
                                      isSelected
                                        ? 'bg-primary/10 text-primary border-primary font-semibold shadow-xs'
                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    {optLabel}
                                  </button>
                                );
                              })}
                            </div>
                          ) : q.question_type === 'MULTI_SELECT' || q.question_type === 'MULTIPLE_CHOICE' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(q.options || []).map((opt: any) => {
                                const optVal = opt.value ?? opt.label ?? opt.option_text ?? opt;
                                const optLabel = opt.label ?? opt.option_text ?? opt.value ?? opt;
                                const selectedArr: string[] = Array.isArray(currentVal)
                                  ? currentVal
                                  : currentVal
                                  ? [String(currentVal)]
                                  : [];
                                const isSelected = selectedArr.includes(optVal);
                                return (
                                  <button
                                    key={optVal}
                                    type="button"
                                    onClick={() => {
                                      const next = isSelected
                                        ? selectedArr.filter((x) => x !== optVal)
                                        : [...selectedArr, optVal];
                                      setAnswers((prev) => ({ ...prev, [qId]: next }));
                                    }}
                                    className={`py-1.5 px-3 rounded-lg text-xs text-left font-medium border transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-primary/10 text-primary border-primary font-semibold shadow-xs'
                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    <span>{optLabel}</span>
                                    <span className={`w-3.5 h-3.5 rounded border text-[10px] flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30'}`}>
                                      {isSelected ? '✓' : ''}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={typeof currentVal === 'string' ? currentVal : (typeof currentVal === 'number' ? String(currentVal) : (Array.isArray(currentVal) ? currentVal.join(', ') : ''))}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [qId]: e.target.value }))}
                              placeholder="Your answer..."
                              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Agreement Section */}
                  <div className="space-y-3 pt-2">
                    <div className="border-b border-border/60 pb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {form?.agreement_title || 'Physical Activity Readiness & Assumption of Risk Agreement'}
                      </h3>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 max-h-36 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {form?.agreement_text ||
                        'By signing below, you acknowledge and agree that physical exercise involves inherent risks of physical injury. You certify that you are physically fit and capable of participating in fitness programs, and you assume full responsibility for any risks or injuries.'}
                    </div>

                    {/* Consent Checkbox */}
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">
                          I have read, understood, and explicitly agree to the Physical Activity Readiness Agreement.
                        </span>
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          I understand that submitting this questionnaire is required before I can book any class.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Digital Signature Pad */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-primary" />
                        <span>{parqDecision === 'EDIT' ? 'Newly Drawn Digital Signature (Required for Revision)' : 'Drawn Digital Signature'}</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSignature}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear & Redraw</span>
                      </Button>
                    </div>

                    <div className="relative rounded-xl border-2 border-dashed border-border bg-white dark:bg-zinc-950 overflow-hidden shadow-inner">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-32 block cursor-crosshair touch-none"
                      />
                      {!hasSignature && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-muted-foreground/60 select-none">
                          <PenTool className="w-5 h-5 mb-1 opacity-40" />
                          <p className="text-xs font-medium">Draw your signature here using mouse or touch</p>
                          <p className="text-[10px] opacity-75">Touch-screen and stylus supported</p>
                        </div>
                      )}
                      <div className="pointer-events-none absolute bottom-3 left-4 right-4 border-b border-muted-foreground/20 flex justify-between text-[10px] text-muted-foreground/50 pb-0.5">
                        <span>Sign above this line</span>
                        <span>{hasSignature ? '✓ Signature detected' : 'Signature required'}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {validationError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={signMutation.isPending}
            className="rounded-xl h-9 text-xs"
          >
            Cancel
          </Button>

          {!isAlreadyCompleted && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={signMutation.isPending || isLoading || !requirement?.is_configured}
              className={`rounded-xl h-9 px-5 text-xs font-semibold text-white gap-1.5 shadow-sm ${
                hasExisting && parqDecision === 'REUSE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : hasExisting && parqDecision === 'EDIT'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : hasExisting && parqDecision === 'REUSE' ? (
                <>
                  <CopyCheck className="w-3.5 h-3.5" />
                  <span>Confirm & Reuse PAR-Q</span>
                </>
              ) : hasExisting && parqDecision === 'EDIT' ? (
                <>
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Sign & Save Revised PAR-Q</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Submit & Sign PAR-Q</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
