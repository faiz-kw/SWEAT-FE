/**
 * src/components/members/modals/MemberActionModals.tsx — Production Modals for Member Lifecycle Actions
 * Supports: Renew, Upgrade, Extend, Freeze, Transfer, Cancel, Adjust Entitlements, and Collect Payment.
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Snowflake,
  CreditCard,
  ArrowUpRight,
  Clock,
  Building2,
  Trash2,
  Sliders,
  DollarSign,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { membersApi } from '@/api/endpoints/membersApi';
import type { Member } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ----------------------------------------------------------------------------
// 1. RENEW MEMBERSHIP MODAL
// ----------------------------------------------------------------------------
export const RenewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState('Standard membership renewal');

  const mutation = useMutation({
    mutationFn: () => membersApi.renewMembership(member.id, { months, reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership renewed successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to renew membership');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Renew Membership
          </DialogTitle>
          <DialogDescription>
            Extend {member.name}'s active plan ({member.package_name}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Duration (Months)</Label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={months === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMonths(m)}
                >
                  {m} mo
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Renewal Notes / Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. In-gym renewal agreement"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 2. UPGRADE PACKAGE MODAL
// ----------------------------------------------------------------------------
export const UpgradeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [reason, setReason] = useState('Upgraded to higher tier plan');

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membersApi.getPlans(),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.upgradeMembership(member.id, {
        package_id: selectedPackageId,
        reason,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership upgraded successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to upgrade membership');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-indigo-500" />
            Upgrade Package
          </DialogTitle>
          <DialogDescription>
            Current Plan: <span className="font-medium text-foreground">{member.package_name}</span> ({member.package_version_name})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Select Target Package</Label>
            {loadingPlans ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPackageId(p.id)}
                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                      selectedPackageId === p.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{p.name}</span>
                      <span>₹{Number(p.price).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.duration_months} month(s) · {p.description || 'Full club access'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Upgrade Reason / Reference</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member requested unlimited access"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedPackageId}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Execute Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 3. EXTEND VALIDITY MODAL
// ----------------------------------------------------------------------------
export const ExtendModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('Staff courtesy extension');

  const mutation = useMutation({
    mutationFn: () => membersApi.extendMembership(member.id, { days, reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership extended successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to extend membership');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Extend Membership Validity
          </DialogTitle>
          <DialogDescription>
            Current Expiry: <span className="font-medium text-foreground">{member.expiry_date || 'N/A'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Extension Days</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[7, 14, 30, 60].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  +{d} days
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason / Authorization Note</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Compensatory extension for club maintenance"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Apply Extension
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 4. FREEZE MEMBERSHIP MODAL
// ----------------------------------------------------------------------------
export const FreezeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const twoWeeksStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [freezeFrom, setFreezeFrom] = useState(todayStr);
  const [freezeUntil, setFreezeUntil] = useState(twoWeeksStr);
  const [reason, setReason] = useState('Medical / Travel freeze request');

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.freezeMembership(member.id, {
        freeze_from: freezeFrom,
        freeze_until: freezeUntil,
        reason,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership frozen successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to freeze membership');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-sky-500" />
            Freeze Membership
          </DialogTitle>
          <DialogDescription>
            Temporarily pause membership and automatically extend expiry date by frozen days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Freeze From</Label>
              <Input
                type="date"
                value={freezeFrom}
                onChange={(e) => setFreezeFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Freeze Until</Label>
              <Input
                type="date"
                value={freezeUntil}
                min={freezeFrom}
                onChange={(e) => setFreezeUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for Freeze</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member medical leave / overseas travel"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Freeze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 5. TRANSFER BRANCH MODAL
// ----------------------------------------------------------------------------
export const TransferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  branches: Array<{ id: string; name: string }>;
}> = ({ isOpen, onClose, member, branches }) => {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState('Member relocation request');

  const mutation = useMutation({
    mutationFn: () => membersApi.transferBranch(member.id, { branch_id: branchId, reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Branch transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to transfer branch');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            Transfer Home Branch
          </DialogTitle>
          <DialogDescription>
            Current Home Branch: <span className="font-medium text-foreground">{member.home_branch}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Target Home Branch</Label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              <option value="">Select a branch...</option>
              {branches
                .filter((b) => b.id !== member.home_branch_id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Transfer Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Relocated residence closer to Downtown"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !branchId}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Execute Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 6. CANCEL MEMBERSHIP MODAL
// ----------------------------------------------------------------------------
export const CancelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => membersApi.cancelMembership(member.id, { reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership cancelled');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to cancel membership');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            Cancel Membership
          </DialogTitle>
          <DialogDescription>
            This action will immediately terminate {member.name}'s active membership and expire all remaining entitlement sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Cancellation Reason *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member relocated out of state"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-input text-rose-500 focus:ring-rose-500"
            />
            I confirm that I want to cancel this contract.
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Abort
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason || !confirmed}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 7. ADJUST ENTITLEMENTS MODAL
// ----------------------------------------------------------------------------
export const AdjustEntitlementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [entitlementType, setEntitlementType] = useState('HOME_BRANCH_SESSION');
  const [unitsDelta, setUnitsDelta] = useState(1);
  const [reasonCode, setReasonCode] = useState('ADMIN_COMPENSATION');
  const [reasonText, setReasonText] = useState('Session credit adjustment');

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.adjustEntitlement(member.id, {
        entitlement_type: entitlementType,
        units_delta: unitsDelta,
        reason_code: reasonCode,
        reason_text: reasonText,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Entitlement adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to adjust entitlement');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            Adjust Session Passbook
          </DialogTitle>
          <DialogDescription>
            Record controlled entitlement units with immutable audit passbook tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Entitlement Type</Label>
            <select
              value={entitlementType}
              onChange={(e) => setEntitlementType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              <option value="HOME_BRANCH_SESSION">Home Branch Sessions</option>
              <option value="CROSS_BRANCH_SESSION">Cross Branch Sessions</option>
              <option value="PERSONAL_TRAINING_SESSION">Personal Training Session</option>
              <option value="ASSESSMENT">Body Assessment</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Unit Adjustment (+ to add, - to deduct)</Label>
            <Input
              type="number"
              value={unitsDelta}
              onChange={(e) => setUnitsDelta(parseFloat(e.target.value) || 0)}
              step="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Reason Code</Label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              <option value="ADMIN_COMPENSATION">Admin Courtesy / Compensation</option>
              <option value="CLASS_CANCELLATION_CREDIT">Class Cancellation Credit</option>
              <option value="MANUAL_CORRECTION">Manual Billing Correction</option>
              <option value="PROMOTIONAL_CREDIT">Promotional Bonus Sessions</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Reason Details</Label>
            <Input
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Added 2 sessions due to trainer unavailability"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || unitsDelta === 0}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Record Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 8. COLLECT OUTSTANDING PAYMENT MODAL
// ----------------------------------------------------------------------------
export const CollectPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  defaultOrderId?: string;
  defaultAmount?: number;
}> = ({ isOpen, onClose, member, defaultOrderId, defaultAmount }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : String(member.outstanding_balance || 0));
  const [provider, setProvider] = useState<string>('CASH');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const idempotencyKey = useMemo(() => `pay-modal-${member.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, [member.id]);

  const { data: methodsData = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => membersApi.getPaymentMethods(),
  });

  const availableMethods = methodsData.length > 0 ? methodsData : [
    { id: 'CASH', label: 'Cash (Front Desk)', provider: 'CASH', category: 'OFFLINE' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT', provider: 'BANK_TRANSFER', category: 'OFFLINE' },
    { id: 'UPI', label: 'UPI / QR Scan', provider: 'CASH', category: 'OFFLINE' },
  ];

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.collectOutstanding(member.id, {
        order_id: defaultOrderId,
        amount: parseFloat(amount),
        provider,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to record payment');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Collect Outstanding Balance
          </DialogTitle>
          <DialogDescription>
            Record payment for {member.name}. Total Outstanding: <span className="font-semibold text-rose-500">₹{member.outstanding_balance?.toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Payment Amount (₹) *</Label>
            <Input
              type="number"
              min={1}
              max={member.outstanding_balance || undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Backend Payment Method *</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={paymentMethod === m.id ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start truncate"
                  onClick={() => {
                    setPaymentMethod(m.id);
                    setProvider(m.provider);
                  }}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Record Payment of ₹{parseFloat(amount || '0').toLocaleString()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 9. REJOIN / REACTIVATION MODAL
// ----------------------------------------------------------------------------
export const RejoinModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<string>('CASH');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [reason, setReason] = useState<string>('Former member returning to active status');

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membersApi.getPlans(),
  });

  const { data: methodsData = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => membersApi.getPaymentMethods(),
  });

  const availableMethods = methodsData.length > 0 ? methodsData : [
    { id: 'CASH', label: 'Cash (Front Desk)', provider: 'CASH', category: 'OFFLINE' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT', provider: 'BANK_TRANSFER', category: 'OFFLINE' },
    { id: 'UPI', label: 'UPI / QR Scan', provider: 'CASH', category: 'OFFLINE' },
  ];

  const selectedPlan = plans.find((p: any) => p.package_id === selectedPlanId || p.id === selectedPlanId);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.rejoinMember(member.id, {
        package_id: selectedPlan?.package_id || selectedPlan?.id || selectedPlanId,
        package_version_id: selectedPlan?.package_version_id,
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        payment_provider: paymentProvider,
        payment_method: paymentMethod,
        reason,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Member successfully rejoined!');
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to rejoin member');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <UserCheck className="w-5 h-5 text-primary" />
            Rejoin / New Plan
          </DialogTitle>
          <DialogDescription>
            Reactivate former member <strong className="text-foreground">{member.name}</strong> ({member.member_number}). Reuses existing profile and preserves historical records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Select Membership Plan *</Label>
            {plansLoading ? (
              <div className="text-xs text-muted-foreground">Loading plans...</div>
            ) : (
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  const p = plans.find((pl: any) => pl.id === e.target.value || pl.package_id === e.target.value);
                  if (p) setPaymentAmount(String(p.price));
                }}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value="">-- Choose Plan --</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.package_id || p.id}>
                    {p.name} — ₹{Number(p.price).toLocaleString()} ({p.duration_months} mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Initial Payment Amount (₹)</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Leave blank to charge full amount"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={paymentMethod === m.id ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start truncate"
                  onClick={() => {
                    setPaymentMethod(m.id);
                    setPaymentProvider(m.provider);
                  }}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rejoin Reason / Staff Notes</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member returned after hiatus"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedPlanId}
            className="bg-primary text-primary-foreground"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Rejoin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 10. INVOICE DETAIL / PREVIEW MODAL
// ----------------------------------------------------------------------------
export const InvoiceDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  member: Member;
}> = ({ isOpen, onClose, invoice, member }) => {
  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span>Tax Invoice</span>
            </div>
            <span className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded">
              {invoice.invoice_number}
            </span>
          </DialogTitle>
          <DialogDescription className="pt-2 text-xs">
            Issued on {new Date(invoice.issued_at).toLocaleDateString()} for {member.name} ({member.member_number}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-muted/30 border border-border rounded-lg grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Billed To</span>
              <strong className="text-foreground text-sm">{member.name}</strong>
              <div className="text-muted-foreground">{member.phone}</div>
              <div className="text-muted-foreground truncate">{member.email}</div>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Branch</span>
              <strong className="text-foreground">{member.home_branch || 'Main Branch'}</strong>
              <div className="text-emerald-500 font-bold uppercase mt-1">Status: {invoice.status}</div>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-muted-foreground text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2.5">
                    <span className="font-semibold text-foreground">Membership Plan Subscription</span>
                    <div className="text-[10px] text-muted-foreground">Order Ref: {invoice.order_id || 'Canonical Order'}</div>
                  </td>
                  <td className="p-2.5 text-right font-medium">₹{Number(invoice.subtotal || invoice.total_amount).toLocaleString()}</td>
                </tr>
                {Number(invoice.discount_amount || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 text-muted-foreground">Discount Applied</td>
                    <td className="p-2.5 text-right text-emerald-500 font-medium">-₹{Number(invoice.discount_amount).toLocaleString()}</td>
                  </tr>
                )}
                {Number(invoice.tax_amount || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 text-muted-foreground">GST / Tax Snapshot</td>
                    <td className="p-2.5 text-right text-muted-foreground">₹{Number(invoice.tax_amount).toLocaleString()}</td>
                  </tr>
                )}
                <tr className="bg-muted/40 font-bold text-sm">
                  <td className="p-2.5 text-foreground">Total Paid</td>
                  <td className="p-2.5 text-right text-foreground">₹{Number(invoice.total_amount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            Print Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

