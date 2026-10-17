/**
 * src/utils/razorpayCheckout.ts
 *
 * Reusable, robust Razorpay checkout utility for SWEAT.
 * Unifies the checkout lifecycle across CRM Lead Conversion and Member Portal Self-Service:
 * - Dynamic script loading with deduplication
 * - Complete DOM cleanup (.razorpay-container removal, pointer-events restoration)
 * - Safe escape and backdrop dismissal handlers
 * - Event binding for payment.failed, ondismiss, and success callback
 * - Safe paise-to-INR normalization
 */

import { toast } from 'sonner';

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string; // Internal Order UUID
  razorpayOrderId: string; // Razorpay Order ID (order_...)
  amount: number; // In Rupees (float) or Paise (integer)
  amountInPaise?: number; // Explicit paise amount if provided by backend
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  config?: any;
  configId?: string;
  onSuccess: (paymentId: string, signature: string) => Promise<void> | void;
  onCancel?: () => void;
  onFailure?: (error: any) => void;
}

/**
 * Removes any leftover Razorpay DOM elements and restores page interactivity.
 */
export function cleanupRazorpayDOM(): void {
  if (typeof document === 'undefined') return;

  const containers = document.querySelectorAll('.razorpay-container');
  containers.forEach((el) => {
    try {
      el.remove();
    } catch {
      // Ignore removal errors
    }
  });

  if (document.body) {
    document.body.style.pointerEvents = 'auto';
  }
}

/**
 * Dynamically loads the official Razorpay Checkout SDK.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Track active instance to prevent multiple modals opening simultaneously
let activeRazorpayInstance: any = null;

/**
 * Opens the Razorpay checkout modal with complete error recovery and DOM cleanup.
 */
export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    toast.error('Razorpay SDK failed to load. Please check your network connection.');
    opts.onFailure?.(new Error('SDK load failed'));
    return;
  }

  // Ensure any previous orphaned containers are removed
  cleanupRazorpayDOM();

  // Sandbox bypass check (for local development when keys are mock/placeholder)
  if (
    opts.razorpayOrderId?.startsWith('order_test_') &&
    (!opts.keyId || opts.keyId === 'rzp_test_placeholder')
  ) {
    const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
    const mockSig = 'test_signature';
    toast.info('Simulating test payment completion in sandbox environment...');
    try {
      await opts.onSuccess(mockPaymentId, mockSig);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Sandbox transaction failed');
      opts.onFailure?.(err);
    }
    return;
  }

  // Calculate amount in integer paise
  let finalAmountPaise: number;
  if (opts.amountInPaise && Number.isInteger(opts.amountInPaise) && opts.amountInPaise > 0) {
    finalAmountPaise = opts.amountInPaise;
  } else {
    finalAmountPaise = Math.round(Number(opts.amount) * 100);
  }

  const handleDismiss = () => {
    cleanupRazorpayDOM();
    activeRazorpayInstance = null;
    toast.info('Payment window dismissed. You can retry checkout whenever ready.');
    opts.onCancel?.();
  };

  const options: Record<string, any> = {
    key: opts.keyId || 'rzp_test_placeholder',
    amount: finalAmountPaise,
    currency: opts.currency || 'INR',
    name: opts.name || 'SWEAT',
    description: opts.description || 'SWEAT Membership Checkout',
    order_id: opts.razorpayOrderId,
    prefill: opts.prefill || {},
    theme: {
      color: opts.themeColor || '#10b981',
    },
    modal: {
      backdropclose: true,
      escape: true,
      confirm_close: false,
      ondismiss: handleDismiss,
    },
    handler: async (response: any) => {
      cleanupRazorpayDOM();
      activeRazorpayInstance = null;
      try {
        await opts.onSuccess(response.razorpay_payment_id, response.razorpay_signature);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to finalize transaction with server.';
        toast.error(msg);
        opts.onFailure?.(err);
      }
    },
  };

  if (opts.config) {
    options['config'] = opts.config;
  }
  if (opts.configId) {
    options['config_id'] = opts.configId;
  }

  try {
    const rzp = new (window as any).Razorpay(options);
    activeRazorpayInstance = rzp;

    rzp.on('payment.failed', (resp: any) => {
      cleanupRazorpayDOM();
      activeRazorpayInstance = null;
      const desc = resp?.error?.description || 'Payment was declined or cancelled';
      toast.error(`Razorpay: ${desc}`);
      opts.onFailure?.(resp?.error || new Error(desc));
    });

    rzp.open();
  } catch (err: any) {
    cleanupRazorpayDOM();
    activeRazorpayInstance = null;
    console.error('Razorpay initialization error:', err);
    toast.error('Could not launch Razorpay checkout modal.');
    opts.onFailure?.(err);
  }
}
