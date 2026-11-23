import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Sparkles, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { mobileApi, MobileCoupon } from '@/api/endpoints/mobileApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface AppliedCouponState {
  code: string;
  discount_amount: number;
  discount_type?: string | undefined;
  discount_value?: number | undefined;
  final_price?: number | undefined;
}

interface ApplicableOffersSelectorProps {
  packageId?: string | undefined;
  subtotal: number;
  orderType?: 'RENEWAL' | 'UPGRADE' | 'NEW_MEMBERSHIP' | 'PACKAGE_PURCHASE' | 'REJOIN' | string | undefined;
  branchId?: string | undefined;
  memberId?: string | undefined;
  appliedCoupon: AppliedCouponState | null;
  onApplyCoupon: (result: AppliedCouponState) => void;
  onRemoveCoupon: () => void;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}

export const ApplicableOffersSelector: React.FC<ApplicableOffersSelectorProps> = ({
  packageId,
  subtotal,
  orderType = 'RENEWAL',
  branchId,
  memberId,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  disabled = false,
  compact = false,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch applicable coupons dynamically for this package, order type, and member lifecycle
  const { data: availableCoupons = [], isLoading } = useQuery<MobileCoupon[]>({
    queryKey: ['available-coupons', packageId, orderType, branchId, subtotal, memberId],
    queryFn: async () => {
      const res = await mobileApi.getAvailableCoupons({
        package_id: packageId,
        order_type: orderType,
        branch_id: branchId,
        subtotal: subtotal,
        member_id: memberId,
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(subtotal > 0),
    staleTime: 60 * 1000,
  });

  const handleValidateAndApply = async (codeToTest: string) => {
    const cleanCode = (codeToTest || manualCode).trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a coupon code.');
      return;
    }

    setErrorMsg(null);
    setValidating(true);
    try {
      const res = await mobileApi.validateCoupon({
        code: cleanCode,
        package_id: packageId,
        subtotal: subtotal,
        order_type: orderType,
        branch_id: branchId,
        member_id: memberId,
      });

      const data = res.data;
      if (data.is_valid && Number(data.discount_amount) > 0) {
        onApplyCoupon({
          code: cleanCode,
          discount_amount: Number(data.discount_amount),
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          final_price: Number(data.final_price ?? Math.max(0, subtotal - Number(data.discount_amount))),
        });
        setManualCode('');
        toast.success(`Coupon ${cleanCode} applied! Saved ₹${Number(data.discount_amount).toLocaleString('en-IN')}`);
      } else {
        const msg = data.reason || data.error || data.message || 'Coupon is not eligible for this package or member.';
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.reason || err?.response?.data?.error || err.message || 'Failed to validate coupon';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  // If already applied, show the active coupon banner with removal option
  if (appliedCoupon) {
    return (
      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wide text-foreground uppercase">{appliedCoupon.code}</span>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">APPLIED</Badge>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              You save ₹{appliedCoupon.discount_amount.toLocaleString('en-IN')}
              {appliedCoupon.discount_value && appliedCoupon.discount_type === 'PERCENTAGE'
                ? ` (${appliedCoupon.discount_value}% OFF)`
                : ''}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRemoveCoupon}
          disabled={disabled}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Manual Coupon Input Box */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Have a Promo Code?</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleValidateAndApply(manualCode);
                }
              }}
              placeholder="ENTER PROMO CODE"
              disabled={disabled || validating}
              className="h-8 text-xs font-mono tracking-wider uppercase pr-8"
            />
            {manualCode && (
              <button
                type="button"
                onClick={() => setManualCode('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
              >
                ×
              </button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => handleValidateAndApply(manualCode)}
            disabled={disabled || validating || !manualCode.trim()}
            className="h-8 text-xs px-3 font-semibold"
          >
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Apply
          </Button>
        </div>
        {errorMsg && (
          <p className="text-[11px] text-destructive font-medium pl-1">{errorMsg}</p>
        )}
      </div>

      {/* Available 1-Click Offers Pills */}
      {availableCoupons.length > 0 && !compact && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Available Offers ({availableCoupons.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {availableCoupons.map((coupon) => {
              const estDiscount =
                coupon.discount_type === 'PERCENTAGE'
                  ? Math.min(
                      (subtotal * coupon.discount_value) / 100,
                      coupon.max_discount && coupon.max_discount > 0 ? coupon.max_discount : Infinity
                    )
                  : coupon.discount_value;

              return (
                <div
                  key={coupon.id}
                  onClick={() => !disabled && !validating && handleValidateAndApply(coupon.code)}
                  className="group relative p-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="font-mono font-bold text-xs text-foreground tracking-wide group-hover:text-primary">
                        {coupon.code}
                      </span>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{coupon.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 font-bold bg-primary/10 text-primary border-primary/20">
                      {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40 text-[10px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Save ₹{estDiscount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Apply <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
