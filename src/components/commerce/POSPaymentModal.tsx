import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { posApi, POSTerminal, POSStatusResponse } from '@/api/endpoints/posApi';
import { Order } from '@/types/commerce';
import { toast } from 'sonner';
import {
  CreditCard,
  Wifi,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPaymentSuccess?: () => void;
}

type PaymentStep = 'SELECT' | 'SENDING' | 'WAITING_FOR_CUSTOMER' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [step, setStep] = useState<PaymentStep>('SELECT');
  const [externalRefId, setExternalRefId] = useState<string>('');
  const [statusData, setStatusData] = useState<POSStatusResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch terminals available at the order's branch
  const { data: terminalData, isLoading: loadingTerminals } = useQuery({
    queryKey: ['pos_terminals', order?.branch],
    queryFn: () => posApi.getTerminals(order?.branch),
    enabled: isOpen && !!order,
  });

  const terminals = terminalData?.terminals || [];

  // Set default terminal when terminals load
  useEffect(() => {
    if (terminals.length > 0 && !selectedTerminalId) {
      const defaultTerm = terminals.find((t) => t.is_default) || terminals[0];
      if (defaultTerm) {
        setSelectedTerminalId(defaultTerm.id);
      }
    }
  }, [terminals, selectedTerminalId]);

  // Cleanup timers on modal close
  const cleanup = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    pollIntervalRef.current = null;
    timerIntervalRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setStep('SELECT');
      setExternalRefId('');
      setStatusData(null);
      setTimeLeft(120);
      setErrorMessage('');
    }
  }, [isOpen]);

  // Polling loop
  const startPolling = (refId: string) => {
    cleanup();
    setTimeLeft(120);

    // 1. Timer countdown (120s timeout)
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          cleanup();
          setStep('FAILED');
          setErrorMessage('Transaction timed out. Customer did not complete payment in time.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Status Poller (every 2.5 seconds)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await posApi.checkStatus(refId);
        setStatusData(res);

        if (res.status === 'SUCCESS') {
          cleanup();
          setStep('SUCCESS');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          toast.success('Payment completed on POS machine!');
          if (onPaymentSuccess) onPaymentSuccess();
        } else if (res.status === 'FAILED') {
          cleanup();
          setStep('FAILED');
          setErrorMessage(res.error_message || 'Payment was declined by cardholder bank or terminal.');
        } else if (res.status === 'CANCELLED') {
          cleanup();
          setStep('CANCELLED');
          setErrorMessage('Payment was cancelled.');
        } else if (res.status === 'TIMEOUT') {
          cleanup();
          setStep('FAILED');
          setErrorMessage('Terminal timed out waiting for customer card.');
        }
      } catch (err: any) {
        // Continue polling on transient network drops
        console.warn('POS status poll error (retrying):', err);
      }
    }, 2500);
  };

  // Initiate push to machine
  const handleInitiate = async () => {
    if (!order) return;
    setStep('SENDING');
    setErrorMessage('');

    try {
      const res = await posApi.initiatePayment(order.id, selectedTerminalId);
      if (res.success && res.external_ref_id) {
        setExternalRefId(res.external_ref_id);
        setStep('WAITING_FOR_CUSTOMER');
        startPolling(res.external_ref_id);
      } else {
        setStep('FAILED');
        setErrorMessage(res.error_message || 'Failed to dispatch charge to card machine.');
      }
    } catch (err: any) {
      setStep('FAILED');
      setErrorMessage(
        err?.response?.data?.error || err?.message || 'Error communicating with POS cloud bridge.'
      );
    }
  };

  // Cancel in-flight payment
  const handleCancel = async () => {
    if (!externalRefId) {
      onClose();
      return;
    }
    try {
      await posApi.cancelPayment(externalRefId, 'Cashier cancelled from CRM');
      cleanup();
      setStep('CANCELLED');
      toast.info('Payment cancelled on machine.');
    } catch (err: any) {
      toast.error('Failed to cancel payment on terminal.');
    }
  };

  if (!order) return null;

  const selectedTerminal = terminals.find((t) => t.id === selectedTerminalId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (step === 'WAITING_FOR_CUSTOMER' ? handleCancel() : onClose())}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="size-5" />
            <DialogTitle className="text-base font-bold">In-Person Card Machine (POS)</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Order <span className="font-mono font-semibold text-foreground">{order.order_number}</span> &bull;{' '}
            {order.member_name || order.lead_name || 'Walk-in Member'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: SELECT TERMINAL & DISPATCH */}
        {step === 'SELECT' && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Amount to Collect</span>
              <div className="text-3xl font-extrabold text-foreground mt-1">
                ₹{parseFloat(order.outstanding_balance || String(order.total_amount)).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Accepts: EMV Chip & PIN &bull; Contactless Tap &bull; Dynamic UPI QR
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-primary" />
                Select Front-Desk Card Machine
              </label>

              {loadingTerminals ? (
                <div className="flex items-center justify-center p-3 text-xs text-muted-foreground border border-border rounded-lg bg-background">
                  <Loader2 className="size-3.5 animate-spin mr-2" />
                  Loading branch terminals...
                </div>
              ) : terminals.length === 0 ? (
                <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs">
                  No active card machines registered for this branch. Please configure a terminal in Settings or choose another payment method.
                </div>
              ) : (
                <select
                  value={selectedTerminalId}
                  onChange={(e) => setSelectedTerminalId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {terminals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (TID: {t.terminal_id}) {t.is_default ? '★ Default' : ''} [{t.provider_code}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedTerminal && (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30 text-[11px] space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Hardware Serial:</span>
                  <span className="font-mono text-foreground font-semibold">{selectedTerminal.device_serial_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="text-foreground font-semibold">{selectedTerminal.provider_name}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Wifi className="size-3" /> Machine Online
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ShieldCheck className="size-3 text-primary" /> PCI P2PE Encrypted
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="w-1/3" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-2/3 bg-primary text-primary-foreground font-semibold"
                disabled={!selectedTerminalId || terminals.length === 0}
                onClick={handleInitiate}
              >
                Send to Machine
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SENDING TO MACHINE */}
        {step === 'SENDING' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <h4 className="text-sm font-bold text-foreground">Waking up POS Machine...</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Sending payment instruction of ₹{parseFloat(order.outstanding_balance || String(order.total_amount)).toLocaleString('en-IN')} to terminal.
            </p>
          </div>
        )}

        {/* STEP 3: WAITING FOR CUSTOMER TO PAY */}
        {step === 'WAITING_FOR_CUSTOMER' && (
          <div className="py-4 text-center space-y-4">
            <div className="relative size-16 mx-auto">
              <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <CreditCard className="size-7 text-primary absolute inset-0 m-auto" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">Please Dip, Tap Card or Scan UPI QR</h4>
              <p className="text-xs text-muted-foreground mt-1">
                The card machine screen has lit up with{' '}
                <strong className="text-foreground">
                  ₹{parseFloat(order.outstanding_balance || String(order.total_amount)).toLocaleString('en-IN')}
                </strong>
                . Waiting for customer PIN/authorization.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-muted text-foreground border border-border">
              <Clock className="size-3 text-muted-foreground" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span> remaining
            </div>

            <div className="pt-2 border-t border-border flex justify-center">
              <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-500/10 text-xs" onClick={handleCancel}>
                Cancel Payment on Machine
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: PAYMENT SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="py-4 text-center space-y-4">
            <div className="size-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="size-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-foreground">Payment Approved & Settled!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paper receipt printed &bull; Order marked as PAID &bull; Invoice generated.
              </p>
            </div>

            {statusData && (
              <div className="rounded-xl border border-border bg-background p-3 text-left text-xs space-y-1.5 font-mono">
                {statusData.rrn && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank RRN:</span>
                    <span className="text-foreground font-bold">{statusData.rrn}</span>
                  </div>
                )}
                {statusData.auth_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Code:</span>
                    <span className="text-foreground">{statusData.auth_code}</span>
                  </div>
                )}
                {statusData.card_last4 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card:</span>
                    <span className="text-foreground font-semibold">
                      {statusData.card_network || 'Card'} **** {statusData.card_last4}
                    </span>
                  </div>
                )}
                {statusData.payment_mode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="text-foreground capitalize">{statusData.payment_mode.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            )}

            <Button type="button" size="sm" className="w-full bg-emerald-600 text-white font-semibold" onClick={onClose}>
              Done / Close
            </Button>
          </div>
        )}

        {/* STEP 5: PAYMENT FAILED OR TIMEOUT */}
        {step === 'FAILED' && (
          <div className="py-4 text-center space-y-4">
            <div className="size-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <XCircle className="size-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-foreground">Transaction Incomplete</h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-xs mx-auto">
                {errorMessage || 'Payment was declined or cancelled.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="w-1/2" onClick={onClose}>
                Close
              </Button>
              <Button type="button" size="sm" className="w-1/2 bg-primary text-primary-foreground font-semibold" onClick={() => setStep('SELECT')}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: CANCELLED */}
        {step === 'CANCELLED' && (
          <div className="py-4 text-center space-y-4">
            <div className="size-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">Payment Session Cancelled</h4>
              <p className="text-xs text-muted-foreground mt-1">The machine has returned to idle.</p>
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
