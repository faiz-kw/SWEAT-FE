import React, { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, Link2, MessageSquare, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface PaymentLinkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    paymentUrl: string;
    amount: string | number;
    orderNumber?: string;
    memberName: string;
    memberPhone?: string;
    packageName?: string;
  } | null;
}

export const PaymentLinkShareModal: React.FC<PaymentLinkShareModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.paymentUrl);
      setCopied(true);
      toast.success('Payment link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = (data.memberPhone || '').replace(/[^0-9]/g, '');
    const message = `Hello ${data.memberName},\n\nPlease find your secure payment link for ${data.packageName || 'your membership package'}:\n${data.paymentUrl}\n\nAmount: ₹${Number(data.amount).toLocaleString()}\nOrder Ref: ${data.orderNumber || 'Online Order'}\n\nThank you, PerformanceOS Studio.`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs px-2 py-0.5">
              Link Generated
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">{data.orderNumber}</span>
          </div>
          <DialogTitle className="flex items-center gap-2 pt-2 text-foreground">
            <Link2 className="w-5 h-5 text-primary" />
            Share Payment Link
          </DialogTitle>
          <DialogDescription>
            Share this payment link with <strong className="text-foreground">{data.memberName}</strong>. The membership will activate automatically once paid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount Summary */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Amount to Collect</div>
              <div className="text-xl font-bold text-foreground">
                ₹{Number(data.amount).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Package</div>
              <div className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                {data.packageName || 'Membership Package'}
              </div>
            </div>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Payment Link</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={data.paymentUrl}
                className="font-mono text-xs bg-muted/30 select-all"
              />
              <Button
                type="button"
                size="sm"
                variant={copied ? 'default' : 'outline'}
                onClick={handleCopy}
                className="shrink-0 gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* WhatsApp Share Action */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleShareWhatsApp}
              className="w-full gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Share via WhatsApp to {data.memberPhone || 'Member'}</span>
            </Button>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              The membership has been saved in <strong>Pending Payment</strong> status. As soon as the customer completes the transaction, their entitlements and session quotas will be activated in real-time.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.open(data.paymentUrl, '_blank', 'noopener,noreferrer')}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Checkout</span>
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
