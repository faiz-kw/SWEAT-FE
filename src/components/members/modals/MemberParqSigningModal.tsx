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
} from 'lucide-react';
import { toast } from 'sonner';
import { membershipsApi } from '@/api/endpoints/membershipsApi';
import { Button } from '@/components/ui/button';
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

  // Fetch requirement definition & form
  const { data: requirement, isLoading, error } = useQuery({
    queryKey: ['membership-parq-requirement', membershipId],
    queryFn: () => membershipsApi.getParqRequirement(membershipId),
    enabled: open && Boolean(membershipId),
  });

  // Setup canvas high-DPI scaling
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0284c7'; // modern primary blue / teal
  };

  useEffect(() => {
    if (open && requirement && !isLoading) {
      // Delay slightly for modal layout to stabilize dimensions
      const timer = setTimeout(setupCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [open, requirement, isLoading]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Coordinates helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
    mutationFn: async (payload: { agreement_accepted: boolean; signature_data: string; answers: any[] }) => {
      return membershipsApi.signParq(membershipId, payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || 'PAR-Q completed and digitally signed! You may now book classes.');
      queryClient.invalidateQueries({ queryKey: ['member-360'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-parq-requirement', membershipId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to submit PAR-Q.';
      setValidationError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    setValidationError(null);

    if (!requirement?.form) {
      toast.error('No PAR-Q form is configured for this membership.');
      return;
    }

    const questions: any[] = requirement.form.questions || [];
    // Validate required questions
    for (const q of questions) {
      if (q.is_required) {
        const val = answers[q.id];
        // Legitimate false (boolean No) is valid! Only undefined, null, or empty string is invalid
        if (val === undefined || val === null || val === '') {
          setValidationError(`Please answer the required question: "${q.question_text}"`);
          toast.error(`Please answer required question: "${q.question_text}"`);
          return;
        }
      }
    }

    // Validate consent
    if (!consentAccepted) {
      setValidationError('You must explicitly review and accept the agreement before proceeding.');
      toast.error('Please check the agreement acceptance box.');
      return;
    }

    // Validate signature
    if (!hasSignature || !canvasRef.current) {
      setValidationError('Please draw your digital signature in the signature area.');
      toast.error('Drawn digital signature is required.');
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
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <h4 className="text-sm font-semibold text-destructive">Configuration Error</h4>
              <p className="text-xs text-muted-foreground">
                No active PAR-Q form is configured for this program or organization. Please contact your gym administrator.
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
              {/* Informational banner */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Required Before Class Booking</p>
                  <p className="text-muted-foreground mt-0.5">
                    For your health and safety, all members must complete this readiness assessment and draw a digital signature before booking any class with this membership.
                  </p>
                </div>
              </div>

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
                  const currentVal = answers[qId];

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
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [qId]: true }))}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              currentVal === true
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [qId]: false }))}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              currentVal === false
                                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-700 shadow-xs'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      ) : q.question_type === 'SINGLE_CHOICE' || q.question_type === 'CHOICE' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt: any) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAnswers((prev) => ({ ...prev, [qId]: opt.value }))}
                              className={`py-1.5 px-3 rounded-lg text-xs text-left font-medium border transition-all ${
                                currentVal === opt.value
                                  ? 'bg-primary/10 text-primary border-primary font-semibold'
                                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {opt.label || opt.value}
                            </button>
                          ))}
                        </div>
                      ) : q.question_type === 'NUMBER' ? (
                        <input
                          type="number"
                          value={currentVal ?? ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [qId]: e.target.value }))}
                          placeholder="Enter numeric value..."
                          className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal ?? ''}
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

                {/* Consent Checkbox - starts UNCHECKED */}
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
                    <span>Drawn Digital Signature</span>
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
              className="rounded-xl h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing & Submitting...</span>
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
