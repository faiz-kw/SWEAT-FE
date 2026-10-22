/**
 * src/components/members/modals/MemberActionModals.tsx — Production Modals for Member Lifecycle Actions
 * Supports: Renew, Upgrade, Extend, Freeze, Transfer, Cancel, Adjust Entitlements, and Collect Payment.
 */

import React, { useState, useMemo } from 'react';
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
  UserCheck,
  Receipt,
  Download,
  Printer,
  Globe,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { membersApi } from '@/api/endpoints/membersApi';
import { discountsApi } from '@/api/endpoints/discountsApi';
import { crmApi } from '@/api/endpoints/crmApi';
import { formatCurrency } from '@/utils/currencyUtils';
import type { Member } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { PaymentLinkShareModal } from './PaymentLinkShareModal';

// ----------------------------------------------------------------------------
// 1. RENEW MEMBERSHIP MODAL
// ----------------------------------------------------------------------------
export const RenewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  activeContracts?: any[];
}> = ({ isOpen, onClose, member, activeContracts = [] }) => {
  const queryClient = useQueryClient();
  const [startSchedule, setStartSchedule] = useState<'CONTINUOUS' | 'FIRST_VISIT' | 'CUSTOM'>('CONTINUOUS');
  const [customStartDate, setCustomStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'PAYMENT_LINK'>('PAYMENT_LINK');
  const [carryForward, setCarryForward] = useState(true);
  const [reason, setReason] = useState('Same package membership renewal');
  const [generatedLink, setGeneratedLink] = useState<any | null>(null);

  const contracts = useMemo(() => {
    if (activeContracts && activeContracts.length > 0) {
      return activeContracts.map((c: any) => ({
        ...c,
        membership_id: c.membership_id || c.id,
      }));
    }
    return [{
      membership_id: member?.id,
      membership_number: member?.membership_number,
      package_id: member?.package_id,
      package_name: member?.package_name,
      program_name: member?.program_name,
      end_date: member?.expiry_date,
      home_sessions_remaining: member?.home_sessions_remaining,
      contract_snapshot: (member as any)?.contract_snapshot,
    }];
  }, [activeContracts, member]);

  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.membership_id || contracts[0]?.id || member?.id || '';
  });

  const selectedContract = useMemo(() => {
    return contracts.find((c: any) => (c.membership_id || c.id) === selectedContractId) || contracts[0];
  }, [contracts, selectedContractId]);

  const { data: rawPlans = [] } = useQuery({
    queryKey: ['renewal-plans'],
    queryFn: () => membersApi.getPlans(),
    enabled: isOpen,
  });

  const plans = useMemo(() => {
    if (Array.isArray(rawPlans)) return rawPlans;
    if (rawPlans && Array.isArray((rawPlans as any).results)) return (rawPlans as any).results;
    if (rawPlans && Array.isArray((rawPlans as any).data)) return (rawPlans as any).data;
    return [];
  }, [rawPlans]);

  const selectedPlan = useMemo(() => {
    if (!Array.isArray(plans)) return null;
    const targetPkgId = selectedContract?.package_id || member?.package_id;
    const targetName = (selectedContract?.package_name || member?.package_name || '').trim().toLowerCase();
    const cleanTargetName = targetName.replace(/\s*\([^)]*\)/g, '').trim();

    return (
      (targetPkgId && plans.find((p: any) => p.package_id === targetPkgId || p.id === targetPkgId)) ||
      (cleanTargetName && plans.find((p: any) => (p.name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase() === cleanTargetName)) ||
      (targetName && plans.find((p: any) => (p.name || '').toLowerCase().includes(cleanTargetName) || cleanTargetName.includes((p.name || '').toLowerCase()))) ||
      plans[0] ||
      null
    );
  }, [plans, selectedContract, member]);

  const formatSafeDate = (d?: string | null) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const priceEstimate = useMemo(() => {
    if (selectedPlan && selectedPlan.price && Number(selectedPlan.price) > 0) {
      return Number(selectedPlan.price);
    }
    const snapPrice = selectedContract?.contract_snapshot?.purchase_price ?? selectedContract?.contract_snapshot?.final_amount;
    if (snapPrice && !isNaN(Number(snapPrice)) && Number(snapPrice) > 0) {
      return Number(snapPrice);
    }
    return 15000;
  }, [selectedPlan, selectedContract]);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.renewMembership(selectedContract?.membership_id || member?.id, {
        package_id: selectedPlan?.package_id || selectedContract?.package_id || member?.package_id,
        start_schedule: startSchedule,
        custom_start_date: startSchedule === 'CUSTOM' ? customStartDate : undefined,
        payment_provider: paymentMethod === 'PAYMENT_LINK' ? 'PAYMENT_LINK' : (paymentMethod === 'CASH' ? 'CASH' : (paymentMethod === 'CARD' ? 'ICICI_POS' : 'RAZORPAY')),
        payment_method: paymentMethod,
        payment_amount: priceEstimate,
        carry_forward: carryForward,
        reason: `${reason} (${startSchedule})`,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      if (res.status === 'PAYMENT_LINK_GENERATED' && res.payment_url) {
        setGeneratedLink({
          paymentUrl: res.payment_url,
          amount: res.amount || priceEstimate,
          orderNumber: res.order_number,
          memberName: member?.name,
          memberPhone: member?.phone,
          packageName: selectedPlan?.name || selectedContract?.package_name || member?.package_name,
        });
      } else if (res.status === 'PENDING_APPROVAL') {
        toast.info(res.message || 'Renewal submitted for cash approval');
        onClose();
      } else {
        toast.success(res.message || 'Membership renewed successfully');
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to renew membership');
    },
  });

  if (generatedLink) {
    return (
      <PaymentLinkShareModal
        isOpen={Boolean(generatedLink)}
        onClose={() => {
          setGeneratedLink(null);
          onClose();
        }}
        data={generatedLink}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Renew Membership Plan
          </DialogTitle>
          <DialogDescription>
            Renew {member?.name || 'Member'}'s current package ({selectedContract?.package_name || member?.package_name || 'Standard'}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Active Contract Selector if multiple exist */}
          {contracts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Active Membership to Renew</Label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                {contracts.map((c: any) => (
                  <option key={c.membership_id} value={c.membership_id}>
                    {c.package_name || 'Membership'} ({c.program_name || 'General'}) — Valid till {formatSafeDate(c.end_date) || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Package Details Being Renewed */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Renewing Plan</Label>
                <div className="font-bold text-sm text-foreground">{selectedContract?.package_name || selectedPlan?.name || member?.package_name || 'Standard Package'}</div>
                <div className="text-xs text-muted-foreground">
                  Program: {selectedContract?.program_name || member?.program_name || selectedPlan?.program_name || 'Bootcamp'} · {selectedPlan?.total_sessions || selectedPlan?.session_count || 36} Sessions
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                ₹{priceEstimate.toLocaleString()}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
              <span>Current Expiry: <strong>{formatSafeDate(selectedContract?.end_date || member?.expiry_date) || 'Expired'}</strong></span>
              <span>Catalog Validity: <strong>{selectedPlan?.validity_days || 90} Days</strong></span>
            </div>
          </div>

          {/* Start Date / Activation Schedule */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">When should the renewed plan start?</Label>
            <div className="space-y-2">
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${startSchedule === 'CONTINUOUS' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <input
                  type="radio"
                  name="start_schedule"
                  className="mt-0.5"
                  checked={startSchedule === 'CONTINUOUS'}
                  onChange={() => setStartSchedule('CONTINUOUS')}
                />
                <div>
                  <span className="font-semibold text-foreground block">Continuous Renewal (Recommended)</span>
                  <span className="text-muted-foreground">
                    Starts automatically when current plan expires on {formatSafeDate(selectedContract?.end_date || member?.expiry_date) || 'activation'}.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${startSchedule === 'FIRST_VISIT' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <input
                  type="radio"
                  name="start_schedule"
                  className="mt-0.5"
                  checked={startSchedule === 'FIRST_VISIT'}
                  onChange={() => setStartSchedule('FIRST_VISIT')}
                />
                <div>
                  <span className="font-semibold text-foreground block">On First Booking / Attendance</span>
                  <span className="text-muted-foreground">
                    Plan stays queued in reserve; validity countdown begins when member attends their next class session.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${startSchedule === 'CUSTOM' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <input
                  type="radio"
                  name="start_schedule"
                  className="mt-0.5"
                  checked={startSchedule === 'CUSTOM'}
                  onChange={() => setStartSchedule('CUSTOM')}
                />
                <div className="w-full">
                  <span className="font-semibold text-foreground block">Specific Custom Start Date</span>
                  <span className="text-muted-foreground">Member requests plan to start on a chosen date.</span>
                  {startSchedule === 'CUSTOM' && (
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="mt-2 h-8 text-xs"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-medium"
            >
              <option value="PAYMENT_LINK">Send Payment Link (Online / WhatsApp / UPI)</option>
              <option value="CARD">Credit/Debit Card (POS Terminal)</option>
              <option value="ONLINE">Online Payment (Instant Gateway)</option>
              <option value="CASH">Cash (Requires Manager Approval)</option>
            </select>
            {paymentMethod === 'PAYMENT_LINK' && (
              <p className="text-[11px] text-primary">
                🔗 Generates a secure checkout link to share with {member.name} via WhatsApp, SMS, or email. Plan activates upon completion.
              </p>
            )}
            {paymentMethod === 'CASH' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠ Cash renewal creates a provisional contract pending manager approval before entitlement activation.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="carry_forward"
              checked={carryForward}
              onChange={(e) => setCarryForward(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            <Label htmlFor="carry_forward" className="text-xs cursor-pointer font-normal">
              Carry forward remaining sessions ({selectedContract?.home_sessions_remaining ?? member.home_sessions_remaining ?? 0} sessions)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Renewal Notes / Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. In-gym renewal agreement"
            />
          </div>

          <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Estimated Renewal Total:</span>
            <span className="font-bold text-base text-foreground">₹{priceEstimate.toLocaleString()}</span>
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
  activeContracts?: any[];
}> = ({ isOpen, onClose, member, activeContracts = [] }) => {
  const queryClient = useQueryClient();
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'PAYMENT_LINK'>('PAYMENT_LINK');
  const [reason, setReason] = useState('Upgraded to higher session tier plan');

  const contracts = useMemo(() => {
    if (activeContracts && activeContracts.length > 0) {
      return activeContracts.map((c: any) => ({
        ...c,
        membership_id: c.membership_id || c.id,
      }));
    }
    return [{
      membership_id: member?.id,
      membership_number: member?.membership_number,
      package_id: member?.package_id,
      package_name: member?.package_name,
      program_name: member?.program_name,
      program_id: (member as any)?.program_id,
      end_date: member?.expiry_date,
      home_sessions_remaining: member?.home_sessions_remaining,
      contract_snapshot: (member as any)?.contract_snapshot,
    }];
  }, [activeContracts, member]);

  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.membership_id || contracts[0]?.id || member?.id || '';
  });

  const selectedContract = useMemo(() => {
    return contracts.find((c: any) => (c.membership_id || c.id) === selectedContractId) || contracts[0];
  }, [contracts, selectedContractId]);

  const { data: rawPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membersApi.getPlans(),
    enabled: isOpen,
  });

  // Parse current session count from snapshot or package name (e.g., "144 Sessions" -> 144)
  const currentSessions = useMemo(() => {
    const snap = selectedContract?.contract_snapshot;
    if (snap?.total_sessions && Number(snap.total_sessions) > 0) return Number(snap.total_sessions);
    if (snap?.session_count && Number(snap.session_count) > 0) return Number(snap.session_count);
    const match = (selectedContract?.package_name || member?.package_name || '').match(/(\d+)\s*session/i);
    return match ? parseInt(match[1], 10) : (selectedContract?.home_sessions_remaining || 36);
  }, [selectedContract, member?.package_name]);

  // Current plan base price estimate from snapshot or catalog plans
  const currentPlanPrice = useMemo(() => {
    const snap = selectedContract?.contract_snapshot;
    const snapPrice = snap?.purchase_price ?? snap?.final_amount;
    if (snapPrice && !isNaN(Number(snapPrice)) && Number(snapPrice) > 0) {
      return Number(snapPrice);
    }
    const plansList = Array.isArray(rawPlans) ? rawPlans : (rawPlans as any)?.results || (rawPlans as any)?.data || [];
    const curPkgId = selectedContract?.package_id || member?.package_id;
    const curPlan = plansList.find((p: any) => (p.package_id && p.package_id === curPkgId) || (p.id && p.id === curPkgId));
    if (curPlan?.price && Number(curPlan.price) > 0) return Number(curPlan.price);

    if (currentSessions === 36) return 15000;
    if (currentSessions === 72) return 25000;
    if (currentSessions === 108) return 35000;
    if (currentSessions === 144) return 45000;
    return currentSessions * 350;
  }, [selectedContract, member?.package_id, rawPlans, currentSessions]);

  const catalogMRP = useMemo(() => {
    return Number(selectedContract?.catalog_price || selectedContract?.contract_snapshot?.catalog_price || 0);
  }, [selectedContract]);

  // Real Active Packages matching the member's current program, filtered for HIGHER tiers
  const candidateUpgradePlans = useMemo(() => {
    const plansList = Array.isArray(rawPlans) ? rawPlans : (rawPlans as any)?.results || (rawPlans as any)?.data || [];
    if (!Array.isArray(plansList) || plansList.length === 0) {
      return [];
    }

    const currentProg = (selectedContract?.program_name || member?.program_name || '').trim().toLowerCase();
    const currentProgId = selectedContract?.program_id || (member as any)?.program_id;
    const currentPkgId = selectedContract?.package_id || member?.package_id;

    return plansList
      .filter((p: any) => {
        // Must be currently active in the system
        if (p.is_active === false || p.status === 'INACTIVE' || p.status === 'ARCHIVED') return false;

        // Exclude current package ID
        const pId = p.id || p.package_id;
        if (currentPkgId && (pId === currentPkgId || p.package_id === currentPkgId)) return false;

        // Program match: by program_id OR by program_name equality OR containment (e.g. Bootcamp)
        if (currentProgId && p.program_id && p.program_id === currentProgId) {
          return true;
        }
        if (currentProg) {
          const pProg = (p.program_name || '').trim().toLowerCase();
          const pName = (p.name || '').trim().toLowerCase();
          if (pProg === currentProg) return true;
          if (pProg && (pProg.includes(currentProg) || currentProg.includes(pProg))) return true;
          if (pName && pName.includes(currentProg)) return true;
        }
        return false;
      })
      .map((p: any) => {
        const match = (p.name || '').match(/(\d+)\s*session/i);
        const sCount = match
          ? parseInt(match[1], 10)
          : (p.total_sessions || p.session_count || (p.duration_months ? p.duration_months * 24 : 0));
        return {
          id: p.id || p.package_id,
          name: p.name,
          program: p.program_name || selectedContract?.program_name || member?.program_name || 'Standard Program',
          sessions: sCount,
          price: Number(p.price || 0),
          validity_days: p.validity_days || (p.duration_months ? p.duration_months * 30 : 90),
        };
      })
      // Strictly higher tier: more sessions OR higher price with equal/more sessions
      .filter((p: any) => p.sessions > currentSessions || (p.price > currentPlanPrice && p.sessions >= currentSessions))
      .sort((a: any, b: any) => a.sessions - b.sessions || a.price - b.price);
  }, [rawPlans, currentSessions, currentPlanPrice, selectedContract, member]);

  // Default select first higher package
  React.useEffect(() => {
    if (candidateUpgradePlans.length > 0) {
      if (!selectedPackageId || !candidateUpgradePlans.find((p) => p.id === selectedPackageId)) {
        setSelectedPackageId(candidateUpgradePlans[0].id);
      }
    } else {
      setSelectedPackageId('');
    }
  }, [candidateUpgradePlans, selectedPackageId]);

  const selectedTargetPlan = useMemo(() => {
    return candidateUpgradePlans.find((p) => p.id === selectedPackageId) || candidateUpgradePlans[0] || null;
  }, [candidateUpgradePlans, selectedPackageId]);

  // Calculate Difference to Pay: Target Price - Current Paid Price
  const targetPrice = selectedTargetPlan ? selectedTargetPlan.price : 0;
  const differenceToPay = Math.max(0, targetPrice - currentPlanPrice);
  const extraSessionsAdded = selectedTargetPlan ? Math.max(0, selectedTargetPlan.sessions - currentSessions) : 0;

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.upgradeMembership(member.id, {
        membership_id: selectedContract?.membership_id || selectedContract?.id,
        package_id: selectedTargetPlan?.id || selectedPackageId,
        package_version_id: (selectedTargetPlan as any)?.package_version_id,
        payment_method: paymentMethod,
        payment_amount: differenceToPay,
        difference_amount: differenceToPay,
        reason: `${reason}: upgraded from ${currentSessions} to ${selectedTargetPlan?.sessions} sessions`,
      } as any),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership upgraded successfully!');
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
            Upgrade to Higher Session Package
          </DialogTitle>
          <DialogDescription>
            Upgrade {member.name}'s membership to a higher session tier by paying only the difference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Active Contract Selector if multiple exist */}
          {contracts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Enrolled Contract to Upgrade</Label>
              <select
                value={selectedContractId}
                onChange={(e) => {
                  setSelectedContractId(e.target.value);
                  setSelectedPackageId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                {contracts.map((c: any) => (
                  <option key={c.membership_id} value={c.membership_id}>
                    {c.package_name || 'Membership'} ({c.program_name || 'General'}) — {c.home_sessions_remaining ?? 0} sessions remaining
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Currently Enrolled Package Banner */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1.5 text-xs">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Current Enrolled Package</Label>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-foreground">{selectedContract?.package_name || member.package_name || `${currentSessions} Sessions`}</div>
                <div className="text-muted-foreground">Program: {selectedContract?.program_name || member.program_name || 'Bootcamp'} · {currentSessions} Sessions</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">
                  {catalogMRP && catalogMRP > currentPlanPrice ? 'Amount Paid' : 'Plan Value'}
                </span>
                <span className="font-semibold text-foreground">₹{currentPlanPrice.toLocaleString()}</span>
                {catalogMRP > currentPlanPrice && (
                  <span className="block text-[10px] text-muted-foreground line-through">
                    MRP: ₹{catalogMRP.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Select Higher Sessional Package */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Higher Session Package (Same Program)</Label>
            {loadingPlans ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : candidateUpgradePlans.length === 0 ? (
              <div className="p-3 bg-muted/30 border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                No higher session package tiers available for {selectedContract?.program_name || member?.program_name || 'this program'}. Member is on the maximum tier.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {candidateUpgradePlans.map((p) => {
                  const planDiff = Math.max(0, p.price - currentPlanPrice);
                  const isSelected = selectedTargetPlan?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPackageId(p.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-indigo-600 dark:text-indigo-400">Pay Diff: ₹{planDiff.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground mt-1 text-[11px]">
                        <span>Total: {p.sessions} Sessions ({p.validity_days} Days)</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{p.sessions - currentSessions} Extra Sessions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Difference Calculation Breakdown */}
          {selectedTargetPlan && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>New Package Total ({selectedTargetPlan.sessions} Sessions):</span>
                <span className="font-medium text-foreground">₹{targetPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Current Plan Paid Credit ({currentSessions} Sessions):</span>
                <span className="font-medium text-foreground">-₹{currentPlanPrice.toLocaleString()}</span>
              </div>
              {catalogMRP > currentPlanPrice && (
                <div className="flex justify-between text-[11px] text-muted-foreground/80">
                  <span>Current Package Catalog MRP:</span>
                  <span>₹{catalogMRP.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-indigo-500/20 pt-2 flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-foreground block">Difference Amount to Pay:</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    +{extraSessionsAdded} sessions will be added to bucket
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                    ₹{differenceToPay.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Payment Mode</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
            >
              <option value="PAYMENT_LINK">Send Payment Link (Online / WhatsApp / UPI)</option>
              <option value="CARD">Credit/Debit Card (POS Terminal)</option>
              <option value="ONLINE">Online Payment (Instant Gateway)</option>
              <option value="CASH">Cash Payment</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Upgrade Reason / Reference</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member requested higher session tier"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedTargetPlan}
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
  activeContracts?: any[];
  pricingConfig?: any;
}> = ({ isOpen, onClose, member, activeContracts = [], pricingConfig }) => {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'PAYMENT_LINK'>('PAYMENT_LINK');
  const [reason, setReason] = useState('Purchased validity extension to preserve unconsumed sessions');

  const contracts = useMemo(() => {
    if (activeContracts && activeContracts.length > 0) {
      return activeContracts.map((c: any) => ({
        ...c,
        membership_id: c.membership_id || c.id,
      }));
    }
    return [{
      membership_id: member?.id,
      membership_number: member?.membership_number,
      package_id: member?.package_id,
      package_name: member?.package_name,
      program_name: member?.program_name,
      end_date: member?.expiry_date,
      home_sessions_remaining: member?.home_sessions_remaining,
    }];
  }, [activeContracts, member]);

  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.membership_id || contracts[0]?.id || member?.id || '';
  });

  const selectedContract = useMemo(() => {
    return contracts.find((c: any) => (c.membership_id || c.id) === selectedContractId) || contracts[0];
  }, [contracts, selectedContractId]);

  // Guard: Member must have sessions remaining or active status
  const pendingSessions = selectedContract?.home_sessions_remaining ?? (member?.home_sessions_remaining ?? member?.sessions_remaining ?? 0);
  const canExtend = pendingSessions > 0 || (member?.status === 'ACTIVE');

  // Configured extension tiers from pricingConfig
  const extensionTiers = useMemo(() => {
    if (Array.isArray(pricingConfig?.extension_tiers) && pricingConfig.extension_tiers.length > 0) {
      return pricingConfig.extension_tiers;
    }
    const per30 = Number(pricingConfig?.extension_fee_per_30_days) || 1000;
    return [
      { days: 15, fee: Math.round(per30 * 0.5) },
      { days: 30, fee: per30 },
      { days: 45, fee: Math.round(per30 * 1.5) },
      { days: 60, fee: per30 * 2 },
    ];
  }, [pricingConfig]);

  const currentTier = extensionTiers.find((t: any) => t.days === days) || { days, fee: Math.round(days * 33.33) };

  // Calculate New Extended Expiry Date preview safely
  const newExtendedExpiry = useMemo(() => {
    const raw = selectedContract?.end_date || member?.expiry_date;
    const baseDate = raw && !isNaN(new Date(raw).getTime()) ? new Date(raw) : new Date();
    const extended = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    return !isNaN(extended.getTime())
      ? extended.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : `${days} days extended`;
  }, [selectedContract?.end_date, member?.expiry_date, days]);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.extendMembership(selectedContract?.membership_id || member?.id, {
        days,
        fee: currentTier.fee,
        payment_method: paymentMethod,
        reason: `${reason} (+${days} days)`,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Validity extension applied successfully!');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
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
            Purchase Validity Extension
          </DialogTitle>
          <DialogDescription>
            Extend {member.name}'s membership validity window to preserve unconsumed sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Active Contract Selector if multiple exist */}
          {contracts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Active Membership to Extend</Label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                {contracts.map((c: any) => (
                  <option key={c.membership_id} value={c.membership_id}>
                    {c.package_name || 'Membership'} ({c.program_name || 'General'}) — Valid till {c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} ({c.home_sessions_remaining ?? 0} sessions)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Eligibility Guard Alert */}
          {!canExtend ? (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Extension Unavailable (0 Pending Sessions)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Validity extension is strictly allowed only when unconsumed sessions remain in the member's bucket.
                Current balance is <strong>0 sessions</strong>. Member should <strong>Renew Plan</strong> to add new sessions.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Active Session Bucket</span>
                <span className="font-bold text-sm text-foreground">{pendingSessions} Sessions Pending</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-[10px]">
                Eligible for Extension
              </Badge>
            </div>
          )}

          {/* Configured Extension Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Select Extension Duration</Label>
              {pricingConfig?.extension_fee_per_30_days && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Base Fee: ₹{pricingConfig.extension_fee_per_30_days} / 30 days
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {extensionTiers.map((tier: any) => {
                const isSelected = days === tier.days;
                return (
                  <button
                    key={tier.days}
                    type="button"
                    disabled={!canExtend}
                    onClick={() => setDays(tier.days)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : 'border-border hover:bg-muted/40 disabled:opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">+{tier.days} Days</span>
                      <span className="font-bold text-xs text-amber-600 dark:text-amber-400">₹{tier.fee}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Preserves {pendingSessions} sessions
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New Validity Preview */}
          {canExtend && (
            <div className="p-3.5 bg-muted/40 border border-border/70 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Expiry:</span>
                <span className="font-medium text-foreground">
                  {selectedContract?.end_date || member.expiry_date
                    ? new Date(selectedContract?.end_date || member.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-foreground font-semibold">
                <span className="text-purple-600 dark:text-purple-400">New Extended Validity:</span>
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-bold">
                  Valid till {newExtendedExpiry}
                </Badge>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between items-center">
                <span className="font-bold text-sm">Extension Amount to Pay:</span>
                <span className="font-extrabold text-base text-amber-600 dark:text-amber-400">
                  ₹{currentTier.fee.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {canExtend && (
            <div className="space-y-2">
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="PAYMENT_LINK">Send Payment Link (Online / WhatsApp / UPI)</option>
                <option value="CARD">Credit/Debit Card (POS Terminal)</option>
                <option value="ONLINE">Online Payment (Instant Gateway)</option>
                <option value="CASH">Cash Payment</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canExtend}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Pay & Extend Validity
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
  activeContracts?: any[];
  pricingConfig?: any;
}> = ({ isOpen, onClose, member, activeContracts = [], pricingConfig }) => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const twoWeeksStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const contracts = useMemo(() => {
    if (activeContracts && activeContracts.length > 0) {
      return activeContracts.map((c: any) => ({
        ...c,
        membership_id: c.membership_id || c.id,
      }));
    }
    return [{
      membership_id: member?.id,
      membership_number: member?.membership_number,
      package_id: member?.package_id,
      package_name: member?.package_name,
      program_name: member?.program_name,
      end_date: member?.expiry_date,
    }];
  }, [activeContracts, member]);

  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.membership_id || contracts[0]?.id || member?.id || '';
  });

  const selectedContract = useMemo(() => {
    return contracts.find((c: any) => (c.membership_id || c.id) === selectedContractId) || contracts[0];
  }, [contracts, selectedContractId]);

  const [freezeFrom, setFreezeFrom] = useState(todayStr);
  const [freezeUntil, setFreezeUntil] = useState(twoWeeksStr);
  const [reason, setReason] = useState('Medical / Travel freeze request');

  const freezeDays = useMemo(() => {
    try {
      const fromD = new Date(freezeFrom);
      const toD = new Date(freezeUntil);
      if (isNaN(fromD.getTime()) || isNaN(toD.getTime()) || toD < fromD) return 0;
      return Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
    } catch {
      return 0;
    }
  }, [freezeFrom, freezeUntil]);

  const configuredFreezeFee = pricingConfig?.freeze_fee ?? 500;
  const [chargeFee, setChargeFee] = useState(true);
  const [feeAmount, setFeeAmount] = useState(String(configuredFreezeFee));
  const [paymentMethod, setPaymentMethod] = useState<'PAYMENT_LINK' | 'CARD' | 'ONLINE' | 'CASH'>('PAYMENT_LINK');
  const [generatedLink, setGeneratedLink] = useState<any | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.freezeMembership(selectedContract?.membership_id || member?.id, {
        freeze_from: freezeFrom,
        freeze_until: freezeUntil,
        reason: `${reason}${chargeFee ? ` (Fee: ₹${feeAmount} via ${paymentMethod})` : ' (Fee Waived)'}`,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      if (chargeFee && paymentMethod === 'PAYMENT_LINK') {
        const payUrl = res.payment_url || `https://pay.sweatfitness.in/frz/${member?.id || 'pay'}`;
        setGeneratedLink({
          paymentUrl: payUrl,
          amount: parseFloat(feeAmount || String(configuredFreezeFee)),
          orderNumber: res.order_number || `FRZ-${Date.now().toString().slice(-6)}`,
          memberName: member?.name,
          memberPhone: member?.phone,
          packageName: `Membership Freeze Fee (${freezeDays} days)`,
        });
      } else {
        toast.success(res.message || `Membership frozen for ${freezeDays} days! Fee recorded.`);
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to freeze membership');
    },
  });

  if (generatedLink) {
    return (
      <PaymentLinkShareModal
        isOpen={Boolean(generatedLink)}
        onClose={() => {
          setGeneratedLink(null);
          onClose();
        }}
        data={generatedLink}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-sky-500" />
            Freeze Membership & Collect Fee
          </DialogTitle>
          <DialogDescription>
            Pause {member?.name || 'Member'}'s membership and collect the configured freeze administration fee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Active Contract Selector if multiple exist */}
          {contracts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Active Membership to Freeze</Label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                {contracts.map((c: any) => (
                  <option key={c.membership_id} value={c.membership_id}>
                    {c.package_name || 'Membership'} ({c.program_name || 'General'}) — Valid till {c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Freeze From</Label>
              <Input
                type="date"
                value={freezeFrom}
                onChange={(e) => setFreezeFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Freeze Until</Label>
              <Input
                type="date"
                value={freezeUntil}
                min={freezeFrom}
                onChange={(e) => setFreezeUntil(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Freeze Duration</span>
              <span className="font-bold text-foreground text-sm">{freezeDays} Days</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[11px]">Automatic Validity Extension</span>
              <span className="font-semibold text-sky-500">+{freezeDays} Days to Expiry</span>
            </div>
          </div>

          {/* Freeze Fee & Payment Section */}
          <div className="p-3.5 bg-sky-500/5 rounded-xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-sky-500" />
                Configured Freeze Fee
                <span className="text-[10px] text-muted-foreground font-mono font-normal">
                  (Default: ₹{configuredFreezeFee})
                </span>
              </Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!chargeFee}
                  onChange={(e) => setChargeFee(!e.target.checked)}
                  className="rounded border-input text-sky-500"
                />
                Waive Fee
              </label>
            </div>

            {chargeFee ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs text-muted-foreground font-semibold">₹</span>
                    <Input
                      type="number"
                      min={0}
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      className="pl-7 h-8 text-xs font-bold"
                    />
                  </div>
                  <Badge variant="outline" className="h-8 px-2 text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/40">
                    Policy Fee
                  </Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Payment Mode</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background font-medium"
                  >
                    <option value="PAYMENT_LINK">Send Payment Link (Online / WhatsApp / UPI)</option>
                    <option value="CARD">Credit/Debit Card (POS Terminal)</option>
                    <option value="ONLINE">Online Payment (Instant Gateway)</option>
                    <option value="CASH">Cash (Front Desk)</option>
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Freeze fee is waived for this request (e.g. medical emergency or manager approval).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Reason for Freeze</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Member medical leave / overseas travel"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || freezeDays <= 0}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {chargeFee && Number(feeAmount) > 0 ? `Pay ₹${feeAmount} & Freeze` : 'Confirm Freeze'}
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
  branches?: Array<{ id: string; name: string }>;
}> = ({ isOpen, onClose, member, branches = [] }) => {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState('Member relocation request');

  const { data: fetchedBranches = [] } = useQuery({
    queryKey: ['tenant-branches'],
    queryFn: () => crmApi.getBranches(),
    enabled: isOpen && (!branches || branches.length === 0),
  });

  const availableBranches = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return fetchedBranches;
  }, [branches, fetchedBranches]);

  const mutation = useMutation({
    mutationFn: () => membersApi.transferBranch(member?.id, { branch_id: branchId, reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Branch transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
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
            Current Home Branch: <span className="font-medium text-foreground">{member?.home_branch || 'Main Branch'}</span>
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
              {availableBranches
                .filter((b: any) => b.id !== member?.home_branch_id && b.name !== member?.home_branch)
                .map((b: any) => (
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
    mutationFn: () => membersApi.cancelMembership(member?.id, { reason }),
    onSuccess: (res) => {
      toast.success(res.message || 'Membership cancelled');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
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
            This action will immediately terminate {member?.name || 'Member'}'s active membership and expire all remaining entitlement sessions.
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
// 7. ADJUST ENTITLEMENTS MODAL (ADMIN SESSION ALLOWANCE & CONSUMPTION)
// ----------------------------------------------------------------------------
export const AdjustEntitlementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [entitlementType, setEntitlementType] = useState<'HOME_BRANCH_SESSION' | 'CROSS_BRANCH_SESSION' | 'PERSONAL_TRAINING_SESSION' | 'ASSESSMENT'>('HOME_BRANCH_SESSION');
  const [adjustTarget, setAdjustTarget] = useState<'ALLOWANCE' | 'CONSUMPTION'>('ALLOWANCE');
  const [direction, setDirection] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState('ADMIN_COMPENSATION');
  const [reasonText, setReasonText] = useState('Admin session allowance grant');
  const idempotencyKey = useMemo(() => `adj-${member?.id || 'id'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, [member?.id]);

  // Current session baseline
  const currentBase = useMemo(() => {
    if (entitlementType === 'CROSS_BRANCH_SESSION') {
      return Number(member?.cross_branch_sessions_remaining ?? 0);
    }
    return Number(member?.home_sessions_remaining ?? member?.sessions_remaining ?? 0);
  }, [entitlementType, member]);

  // Signed units delta:
  // - If adjusting allowance: + means grant more sessions, - means deduct allowance
  // - If adjusting consumption: - means reverse consumption (adds back remaining), + means record consumption (reduces remaining)
  const effectiveDelta = useMemo(() => {
    const rawQty = Math.max(1, Number(quantity) || 1);
    if (adjustTarget === 'ALLOWANCE') {
      return direction === 'ADD' ? rawQty : -rawQty;
    } else {
      // Reversing consumption adds to balance (+), recording consumption reduces balance (-)
      return direction === 'ADD' ? -rawQty : rawQty;
    }
  }, [adjustTarget, direction, quantity]);

  const projectedBalance = Math.max(0, currentBase + effectiveDelta);

  const mutation = useMutation({
    mutationFn: () => {
      if (!reasonText || !reasonText.trim()) {
        throw new Error('A specific reason is required for session adjustment.');
      }
      return membersApi.adjustEntitlement(member?.id, {
        entitlement_type: entitlementType,
        units_delta: effectiveDelta,
        reason_code: reasonCode,
        reason_text: `[${adjustTarget === 'ALLOWANCE' ? 'Quota Allowance' : 'Consumption Correction'}] ${reasonText.trim()}`,
        idempotency_key: idempotencyKey,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Sessions adjusted successfully!');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to adjust sessions');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            Adjust Sessions & Passport Allowance
          </DialogTitle>
          <DialogDescription>
            Modify session allowance or correct consumption for {member?.name || 'Member'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* 1. Target Entitlement Pool */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Session Pool / Category</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntitlementType('HOME_BRANCH_SESSION')}
                className={`p-2.5 rounded-lg border text-left transition-colors text-xs ${
                  entitlementType === 'HOME_BRANCH_SESSION'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="font-semibold">Home Sessions</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Current: {member?.home_sessions_remaining ?? 0} available
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntitlementType('CROSS_BRANCH_SESSION')}
                className={`p-2.5 rounded-lg border text-left transition-colors text-xs ${
                  entitlementType === 'CROSS_BRANCH_SESSION'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold'
                    : 'border-border hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="font-semibold flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Passport Sessions
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Current: {member?.cross_branch_sessions_remaining ?? 0} available
                </div>
              </button>
            </div>
          </div>

          {/* 2. Adjustment Target: Allowance vs Consumption */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Adjustment Operation</Label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAdjustTarget('ALLOWANCE');
                  setReasonCode('ADMIN_COMPENSATION');
                }}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  adjustTarget === 'ALLOWANCE'
                    ? 'border-primary bg-primary/10 font-bold text-primary'
                    : 'border-border hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                Change Total Allowance
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustTarget('CONSUMPTION');
                  setReasonCode('MANUAL_CORRECTION');
                }}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  adjustTarget === 'CONSUMPTION'
                    ? 'border-primary bg-primary/10 font-bold text-primary'
                    : 'border-border hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                Correct Consumption
              </button>
            </div>
          </div>

          {/* 3. Direction and Quantity */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                {adjustTarget === 'ALLOWANCE' ? 'Allowance Action' : 'Consumption Action'}
              </span>
              <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setDirection('ADD')}
                  className={`px-2.5 py-0.5 rounded font-medium ${
                    direction === 'ADD'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {adjustTarget === 'ALLOWANCE' ? '+ Add Quota' : '+ Deduct Used'}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('DEDUCT')}
                  className={`px-2.5 py-0.5 rounded font-medium ${
                    direction === 'DEDUCT'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {adjustTarget === 'ALLOWANCE' ? '- Deduct Quota' : '↺ Reverse Used'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Session Quantity</Label>
                <div className="flex gap-1">
                  {[1, 2, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className="px-2 py-0.5 rounded text-[11px] bg-background hover:bg-primary hover:text-primary-foreground border border-border font-medium transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-8 text-xs font-bold"
              />
            </div>

            {/* Balance Preview */}
            <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Projected Available Balance:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground line-through">{currentBase}</span>
                <span className="font-bold text-foreground text-sm">➔ {projectedBalance} Sessions</span>
                <Badge variant="outline" className={`text-[10px] ${effectiveDelta >= 0 ? 'text-emerald-500 border-emerald-500/40' : 'text-rose-500 border-rose-500/40'}`}>
                  {effectiveDelta >= 0 ? `+${effectiveDelta}` : effectiveDelta}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Reason Category</Label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background"
            >
              <option value="ADMIN_COMPENSATION">Admin Courtesy / Goodwill Allowance</option>
              <option value="CLASS_CANCELLATION_CREDIT">Class Cancellation Compensation</option>
              <option value="MANUAL_CORRECTION">Billing / Attendance Quota Correction</option>
              <option value="PASSPORT_TOPUP">Passport Session Manual Top-up</option>
              <option value="PROMOTIONAL_CREDIT">Promotional Bonus Sessions</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Staff Audit Note *</Label>
            <Input
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Reversed 1 session for class cancelled due to weather"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !quantity}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Apply Session Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 7B. BUY PASSPORT SESSIONS MODAL
// ----------------------------------------------------------------------------
export const BuyPassportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [packType, setPackType] = useState<'PACK_5' | 'PACK_10' | 'PACK_20' | 'CUSTOM'>('PACK_10');
  const [customSessions, setCustomSessions] = useState(15);
  const [paymentMethod, setPaymentMethod] = useState<'PAYMENT_LINK' | 'CARD' | 'ONLINE' | 'CASH'>('PAYMENT_LINK');
  const [generatedLink, setGeneratedLink] = useState<any | null>(null);

  const packs = [
    { id: 'PACK_5', name: '5 Sessions Pack', sessions: 5, price: 2500, perSession: 500, badge: 'Standard' },
    { id: 'PACK_10', name: '10 Sessions Pack', sessions: 10, price: 4500, perSession: 450, badge: 'Popular • 10% OFF' },
    { id: 'PACK_20', name: '20 Sessions Pack', sessions: 20, price: 8000, perSession: 400, badge: 'Best Value • 20% OFF' },
  ];

  const selectedSessions = packType === 'CUSTOM' ? customSessions : (packs.find((p) => p.id === packType)?.sessions || 10);
  const selectedPrice = packType === 'CUSTOM' ? customSessions * 450 : (packs.find((p) => p.id === packType)?.price || 4500);

  const idempotencyKey = useMemo(() => `passport-${member?.id || 'id'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, [member?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.adjustEntitlement(member?.id, {
        entitlement_type: 'CROSS_BRANCH_SESSION',
        units_delta: selectedSessions,
        reason_code: 'PASSPORT_PURCHASE',
        reason_text: `Purchased Passport Access pack (${selectedSessions} sessions) for ₹${selectedPrice} via ${paymentMethod}`,
        idempotency_key: idempotencyKey,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      if (paymentMethod === 'PAYMENT_LINK') {
        const payUrl = `https://pay.sweatfitness.in/passport/${member?.id || 'pay'}?amount=${selectedPrice}`;
        setGeneratedLink({
          paymentUrl: payUrl,
          amount: selectedPrice,
          orderNumber: `ORD-PASS-${Date.now().toString().slice(-6)}`,
          memberName: member?.name,
          memberPhone: member?.phone,
          packageName: `Passport Access (${selectedSessions} Cross-Branch Sessions)`,
        });
      } else {
        toast.success(`Successfully allocated ${selectedSessions} Passport Sessions to ${member?.name || 'Member'}!`);
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to purchase passport sessions');
    },
  });

  if (generatedLink) {
    return (
      <PaymentLinkShareModal
        isOpen={Boolean(generatedLink)}
        onClose={() => {
          setGeneratedLink(null);
          onClose();
        }}
        data={generatedLink}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Buy Passport Sessions
          </DialogTitle>
          <DialogDescription>
            Unlock cross-branch studio access for {member?.name || 'Member'}. Sessions can be consumed across all branch locations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Current Passport Quota */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Current Passport Balance</span>
              <span className="font-bold text-foreground text-sm">
                {member?.cross_branch_sessions_remaining ?? 0} Sessions
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[11px]">Home Branch</span>
              <span className="font-medium text-foreground">{member?.home_branch || 'Main Studio'}</span>
            </div>
          </div>

          {/* Select Passport Pack */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Passport Session Pack</Label>
            <div className="grid grid-cols-1 gap-2">
              {packs.map((pack) => {
                const isSelected = packType === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setPackType(pack.id as any)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {pack.name}
                        {pack.badge && (
                          <Badge variant="outline" className="text-[10px] text-indigo-600 dark:text-indigo-400 border-indigo-500/40">
                            {pack.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        ₹{pack.perSession} / cross-branch session
                      </div>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      ₹{pack.price.toLocaleString()}
                    </div>
                  </div>
                );
              })}

              <div
                onClick={() => setPackType('CUSTOM')}
                className={`p-3 rounded-xl border cursor-pointer transition-colors text-xs ${
                  packType === 'CUSTOM'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>Custom Quantity</span>
                  <span>₹{selectedPrice.toLocaleString()}</span>
                </div>
                {packType === 'CUSTOM' && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customSessions}
                      onChange={(e) => setCustomSessions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="h-8 text-xs font-bold"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">sessions (@ ₹450/ea)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Mode</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
            >
              <option value="PAYMENT_LINK">Send Payment Link (Online / WhatsApp / UPI)</option>
              <option value="CARD">Credit/Debit Card (POS Terminal)</option>
              <option value="ONLINE">Online Payment (Instant Gateway)</option>
              <option value="CASH">Cash (Front Desk)</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || selectedSessions <= 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Pay ₹{selectedPrice.toLocaleString()} & Allocate
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
  const idempotencyKey = useMemo(() => `pay-modal-${member?.id || 'id'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, [member?.id]);

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
    mutationFn: () => {
      const payload: {
        order_id?: string;
        amount?: string | number;
        provider?: string;
        payment_method?: string;
        idempotency_key?: string;
      } = {
        amount: parseFloat(amount),
        provider,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      };
      if (defaultOrderId) payload.order_id = defaultOrderId;
      return membersApi.collectOutstanding(member?.id, payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
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
            Record payment for {member?.name || 'Member'}. Total Outstanding: <span className="font-semibold text-rose-500">₹{Number(member?.outstanding_balance || 0).toLocaleString()}</span>
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
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<string>('PAYMENT_LINK');
  const [paymentMethod, setPaymentMethod] = useState<string>('PAYMENT_LINK');
  const [reason, setReason] = useState<string>('Former member returning to active status');
  const [generatedLink, setGeneratedLink] = useState<any | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setIsApplyingCoupon(true);
    try {
      const res = await discountsApi.validateCoupon({
        code: couponCode.trim().toUpperCase(),
        user_profile_id: member.id,
        order_subtotal: String(selectedPlan.price),
        branch_id: (member as any).branch_id || (member as any).branch || undefined,
        package_id: selectedPlan.package_id || selectedPlan.id,
      });
      if (res.is_valid) {
        setAppliedCoupon(res);
        setPaymentAmount(res.final_subtotal ? String(res.final_subtotal) : String(Number(selectedPlan.price) - Number(res.discount_amount || 0)));
        toast.success(`Coupon "${res.code}" applied! Discount: ${formatCurrency(res.discount_amount)}`);
      } else {
        setAppliedCoupon(null);
        toast.error(res.reason || 'Coupon is not eligible for this member/package');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      toast.error(err?.response?.data?.error || 'Failed to validate coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membersApi.getPlans(),
  });

  const { data: methodsData = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => membersApi.getPaymentMethods(),
  });

  const availableMethods = [
    { id: 'PAYMENT_LINK', label: 'Send Payment Link (Online / WhatsApp / UPI)', provider: 'PAYMENT_LINK', category: 'ONLINE' },
    { id: 'CASH', label: 'Cash (Front Desk)', provider: 'CASH', category: 'OFFLINE' },
    { id: 'CARD', label: 'Card / POS Terminal', provider: 'CARD', category: 'OFFLINE' },
    { id: 'UPI', label: 'Direct UPI / QR Scan', provider: 'UPI', category: 'OFFLINE' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT', provider: 'BANK_TRANSFER', category: 'OFFLINE' },
  ];

  const selectedPlan = plans.find((p: any) => p.package_id === selectedPlanId || p.id === selectedPlanId);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: {
        package_id: string;
        package_version_id?: string;
        branch_id?: string;
        payment_amount?: number;
        payment_provider?: string;
        payment_method?: string;
        reason?: string;
      } = {
        package_id: selectedPlan?.package_id || selectedPlan?.id || selectedPlanId,
        payment_provider: paymentProvider,
        payment_method: paymentMethod,
        reason,
      };
      if (selectedPlan?.package_version_id) payload.package_version_id = selectedPlan.package_version_id;
      if (paymentAmount) payload.payment_amount = parseFloat(paymentAmount);
      return membersApi.rejoinMember(member.id, payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      if (res.status === 'PAYMENT_LINK_GENERATED' && res.payment_url) {
        setGeneratedLink({
          paymentUrl: res.payment_url,
          amount: res.amount || paymentAmount,
          orderNumber: res.order_number,
          memberName: member.name,
          memberPhone: member.phone,
          packageName: selectedPlan?.name,
        });
      } else {
        toast.success(res.message || 'Member successfully rejoined!');
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to rejoin member');
    },
  });

  if (generatedLink) {
    return (
      <PaymentLinkShareModal
        isOpen={Boolean(generatedLink)}
        onClose={() => {
          setGeneratedLink(null);
          onClose();
        }}
        data={generatedLink}
      />
    );
  }

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
                  setCouponCode('');
                  setAppliedCoupon(null);
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
            <Label>Promotional Coupon (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Enter promo coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="font-mono text-xs uppercase"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || !selectedPlanId || isApplyingCoupon}
                className="text-xs h-9"
              >
                {isApplyingCoupon ? 'Checking...' : 'Apply'}
              </Button>
            </div>
            {appliedCoupon && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Coupon {appliedCoupon.code} applied: Saved {formatCurrency(appliedCoupon.discount_amount)}
              </div>
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

  const handleDownload = () => {
    const pkgName = invoice.package_name || (invoice.order && typeof invoice.order === 'object' && invoice.order.items?.[0]?.item_name_snapshot) || 'Membership Plan Subscription';
    const orderRef = invoice.order_number || invoice.order_id || (typeof invoice.order === 'string' ? invoice.order : invoice.order?.order_number) || 'ORD-CANONICAL';
    const payRef = invoice.payment_reference || (invoice.order && typeof invoice.order === 'object' && invoice.order.payments?.[0]?.provider_transaction_id) || invoice.order_number || 'TXN-REF';

    const text = [
      '====================================================',
      '           SWEAT FITNESS - OFFICIAL TAX INVOICE     ',
      '====================================================',
      `Invoice Number : ${invoice.invoice_number}`,
      `Date           : ${new Date(invoice.issued_at || Date.now()).toLocaleDateString('en-IN')}`,
      `Status         : ${invoice.status}`,
      '----------------------------------------------------',
      'MEMBER DETAILS',
      `Name           : ${member?.name || invoice.member_name || 'Member Customer'}`,
      `Member Ref     : ${member?.member_number || invoice.user_profile || 'N/A'}`,
      `Branch         : ${member?.home_branch || invoice.branch_name || 'Main Branch'}`,
      `Phone          : ${member?.phone || '-'}`,
      `Email          : ${member?.email || '-'}`,
      '----------------------------------------------------',
      'ORDER & PAYMENT',
      `Order Ref      : ${orderRef}`,
      `Package        : ${pkgName}`,
      `Payment Ref    : ${payRef}`,
      '----------------------------------------------------',
      'FINANCIAL SUMMARY',
      `Subtotal       : INR ${Number(invoice.subtotal || invoice.total_amount).toFixed(2)}`,
      `Discount       : INR ${Number(invoice.discount_amount || 0).toFixed(2)}`,
      `Tax / GST (18%): INR ${Number(invoice.tax_amount || 0).toFixed(2)}`,
      '----------------------------------------------------',
      `TOTAL PAID     : INR ${Number(invoice.total_amount).toFixed(2)}`,
      '====================================================',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoice.invoice_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pkgName = invoice.package_name || (invoice.order && typeof invoice.order === 'object' && invoice.order.items?.[0]?.item_name_snapshot) || 'Membership Plan Subscription';
  const orderRef = invoice.order_number || invoice.order_id || (typeof invoice.order === 'string' ? invoice.order : invoice.order?.order_number) || 'ORD-CANONICAL';
  const payRef = invoice.payment_reference || (invoice.order && typeof invoice.order === 'object' && invoice.order.payments?.[0]?.provider_transaction_id) || invoice.order_number || 'TXN-REF';

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
                    <span id="invoice-package-name" className="font-semibold text-foreground">{pkgName}</span>
                    <div id="invoice-order-ref" className="text-[10px] text-muted-foreground font-mono">Order Ref: {orderRef}</div>
                    <div id="invoice-payment-ref" className="text-[10px] text-muted-foreground font-mono">Payment Ref: {payRef}</div>
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
          <Button id="btn-download-invoice" variant="outline" onClick={handleDownload} className="gap-1.5">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button id="btn-print-invoice" onClick={() => window.print()} className="bg-primary text-primary-foreground gap-1.5">
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



// ----------------------------------------------------------------------------
// 10. CHECK-IN MODAL
// ----------------------------------------------------------------------------
export const CheckInModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [recordType, setRecordType] = useState<'FACILITY' | 'CLASS'>('FACILITY');
  const [method, setMethod] = useState<string>('Front Desk');
  const [consumeSession, setConsumeSession] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.checkInMember(member?.id, {
        record_type: recordType,
        method,
        consume_session: recordType === 'CLASS' || consumeSession,
      }),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Check-in recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Check-in failed');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            Record Member Check-in
          </DialogTitle>
          <DialogDescription>
            Record attendance for {member?.name || 'Member'} at {member?.home_branch || 'Home Branch'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Check-in Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={recordType === 'FACILITY' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center p-3 h-auto text-left"
                onClick={() => {
                  setRecordType('FACILITY');
                  setConsumeSession(false);
                }}
              >
                <span className="font-semibold text-xs">Facility Entry</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">No session consumed</span>
              </Button>
              <Button
                type="button"
                variant={recordType === 'CLASS' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center p-3 h-auto text-left"
                onClick={() => {
                  setRecordType('CLASS');
                  setConsumeSession(true);
                }}
              >
                <span className="font-semibold text-xs">Class Attendance</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Deducts 1 session credit</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Check-in Verification Method</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              <option value="Front Desk">Front Desk Verification</option>
              <option value="QR">Member App QR Scan</option>
              <option value="ACCESS_DEVICE">Turnstile / Access Gate</option>
            </select>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Branch:</span>
              <span className="font-medium">{member.home_branch || 'Primary Branch'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session Balance:</span>
              <span className="font-medium">{member.home_sessions_remaining ?? 'Unlimited'} remaining</span>
            </div>
            {recordType === 'FACILITY' ? (
              <p className="text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                ✓ Facility entry preserves session entitlements.
              </p>
            ) : (
              <p className="text-amber-600 dark:text-amber-400 mt-1 font-medium">
                ℹ 1 session credit will be debited with append-only ledger tracking.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 11. DETAILED TRANSACTION STATEMENT & RECEIPT MODAL (ORIGINAL SYSTEM MATCH)
// ----------------------------------------------------------------------------
export const TransactionReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  member?: Member | any;
}> = ({ isOpen, onClose, transaction, member }) => {
  if (!transaction) return null;

  const meta = transaction.metadata || {};
  const orderRef = transaction.order_number || meta.order_number || meta.bpc_transaction_id || 'N/A';
  const bpcTxnId = meta.bpc_transaction_id || transaction.provider_transaction_id || transaction.id;
  const isOnlineRzp = (transaction.payment_method || '').toLowerCase().includes('razorpay') || (transaction.provider || '').toLowerCase().includes('razorpay');
  const rzpTxnId = meta.razorpay_payment_id || (isOnlineRzp ? transaction.provider_transaction_id : '—') || '—';
  const rzpOrderId = meta.razorpay_order_id || '—';
  const contact = transaction.contact || meta.contact || member?.phone || member?.contact?.phone || '—';

  // Payment mode & method
  const paymentMode = transaction.payment_mode || meta.payment_mode || (isOnlineRzp ? 'ONLINE' : 'OFFLINE');
  const paymentMethod = transaction.payment_method || meta.payment_method || (transaction.provider === 'CASH' ? 'Cash / UPI' : transaction.provider) || 'Direct';
  const invoiceNum = transaction.invoice_number || meta.invoice_number || (transaction.order_number ? `INV-${transaction.order_number}` : `INV-${orderRef}`);

  // Coupon & Discount Attribution
  const couponCode = transaction.coupon_code || transaction.couponCode || meta.coupon_code || transaction.campaign_name || '';
  const discountCost = Number(transaction.discount_amount ?? transaction.discountAmount ?? meta.coupon_discount ?? meta.coupon_cost ?? 0);
  const discountType = transaction.discount_type || meta.discount_type || (couponCode ? 'COUPON' : (discountCost > 0 ? 'OFFLINE_BRANCH_AUTHORIZED' : 'STANDARD'));

  const agent = transaction.sold_by || transaction.soldBy || meta.agent || meta.sold_by || 'Sweat Front Desk POS';
  const trainer = meta.trainer || transaction.trainer_name || 'N/A';

  const baseCost = Number(meta.base_cost ?? meta.plan_base_cost ?? transaction.subtotal ?? transaction.amount ?? 0);
  const catalogPrice = Number(transaction.catalog_price ?? transaction.originalPrice ?? meta.catalog_price ?? (discountCost > 0 ? (baseCost + discountCost) : baseCost));
  const rewardCoins = Number(meta.reward_points_used ?? meta.use_coins ?? transaction.reward_amount ?? 0);
  const taxRate = Number(meta.tax_rate ?? 18);
  const taxCost = Number(meta.tax_cost ?? transaction.tax_amount ?? (baseCost * (taxRate / 100)));
  const totalCost = Number(meta.total_cost ?? transaction.total_amount ?? transaction.amount ?? 0);
  const amountPaid = Number(meta.amount_paid ?? transaction.paid_amount ?? transaction.amount ?? 0);
  const pendingAmount = Number(meta.pending_amount ?? transaction.outstanding_amount ?? 0);
  const status = (meta.status || transaction.status || 'SUCCESS').toUpperCase();
  const txnDate = transaction.paid_at || transaction.created_at || transaction.date || new Date().toISOString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold">Transaction Statement & Receipt</DialogTitle>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                status === 'SUCCESS' || status === 'PAID'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {status}
            </span>
          </div>
          <DialogDescription className="text-xs pt-1">
            Authoritative transaction receipt with payment gateway audit identifiers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Header Metadata Grid */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Transaction Date</span>
              <span className="font-semibold text-foreground">{new Date(txnDate).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Contact</span>
              <span className="font-semibold text-foreground">{contact}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Invoice #</span>
              <span className="font-mono font-semibold text-primary">{invoiceNum}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Payment Mode</span>
              <span className="font-semibold text-foreground">{paymentMode}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Payment Method</span>
              <span className="font-semibold text-foreground">{paymentMethod}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">System Ref / Legacy ID</span>
              <span className="font-mono text-xs font-semibold text-foreground truncate block" title={bpcTxnId}>
                {bpcTxnId.length > 20 ? `${bpcTxnId.slice(0, 8)}...${bpcTxnId.slice(-6)}` : bpcTxnId}
              </span>
              <span className="text-[10px] text-muted-foreground">(Migrated Historical Record)</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Razorpay Txn ID</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate block">{rzpTxnId}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Razorpay Order ID</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate block">{rzpOrderId}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Coupon / Discount Applied</span>
              <span className="font-semibold text-foreground">
                {couponCode ? (
                  <span className="text-purple-400 font-mono font-bold">🎟️ {couponCode}</span>
                ) : discountCost > 0 ? (
                  <span className="text-blue-400 font-medium">🛡️ Offline Authorized Rate</span>
                ) : (
                  <span>None</span>
                )}
                {discountCost > 0 && (
                  <span className="ml-1 text-emerald-400 font-normal">(-₹{discountCost.toLocaleString()})</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Agent / Sold By</span>
              <span className="font-medium text-foreground">{agent}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Trainer</span>
              <span className="font-medium text-foreground">{trainer || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">Order Reference</span>
              <span className="font-mono text-xs text-muted-foreground">{orderRef}</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Financial Component</th>
                  <th className="p-3 text-right">Calculation / Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catalogPrice > baseCost && (
                  <tr>
                    <td className="p-3 font-medium text-foreground">Plan Catalog MRP</td>
                    <td className="p-3 text-right font-medium text-muted-foreground">₹{catalogPrice.toLocaleString()}</td>
                  </tr>
                )}
                {discountCost > 0 && (
                  <tr>
                    <td className="p-3 text-emerald-500 font-medium">
                      {couponCode ? `Coupon Discount (🎟️ ${couponCode})` : `Branch Authorized Discount (${agent})`}
                    </td>
                    <td className="p-3 text-right text-emerald-500 font-medium">-₹{discountCost.toLocaleString()}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-3 font-medium text-foreground">Plan Base Cost (Billed)</td>
                  <td className="p-3 text-right font-medium">₹{baseCost.toLocaleString()}</td>
                </tr>
                {rewardCoins > 0 && (
                  <tr>
                    <td className="p-3 text-amber-500 font-medium">Reward Coins / Loyalty Redeemed</td>
                    <td className="p-3 text-right text-amber-500 font-medium">-₹{rewardCoins.toLocaleString()}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-3 text-muted-foreground">GST / Tax Cost ({taxRate}%)</td>
                  <td className="p-3 text-right text-muted-foreground">₹{taxCost.toLocaleString()}</td>
                </tr>
                <tr className="bg-muted/40 font-bold text-sm">
                  <td className="p-3 text-foreground">Total Transaction Cost</td>
                  <td className="p-3 text-right text-foreground">₹{totalCost.toLocaleString()}</td>
                </tr>
                <tr className="text-emerald-500 font-bold">
                  <td className="p-3">Amount Paid</td>
                  <td className="p-3 text-right">₹{amountPaid.toLocaleString()}</td>
                </tr>
                {pendingAmount > 0 ? (
                  <tr className="text-rose-500 font-bold">
                    <td className="p-3">Pending / Balance Amount</td>
                    <td className="p-3 text-right">₹{pendingAmount.toLocaleString()}</td>
                  </tr>
                ) : (
                  <tr className="text-muted-foreground">
                    <td className="p-3">Pending Balance</td>
                    <td className="p-3 text-right font-medium">₹0.00 (Fully Settled)</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground gap-1.5">
            <Printer className="w-4 h-4" /> Print Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------------------
// 12. PURCHASE NEW PROGRAM / PACKAGE MODAL
// ----------------------------------------------------------------------------
export const PurchaseProgramPackageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: Member;
}> = ({ isOpen, onClose, member }) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [startSchedule, setStartSchedule] = useState<'CONTINUOUS' | 'FIRST_VISIT' | 'CUSTOM' | 'TODAY'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(member?.home_branch_id || '');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'PAYMENT_LINK'>('PAYMENT_LINK');
  const [reason, setReason] = useState('New program & package purchase');
  const [generatedLink, setGeneratedLink] = useState<any | null>(null);

  // Load programs
  const { data: rawPrograms = [] } = useQuery<Array<{ id: string; name: string; status?: string; category_name?: string }>>({
    queryKey: ['purchase-modal-programs'],
    queryFn: () => crmApi.getPrograms(),
    enabled: isOpen,
  });

  // Filter ONLY active programs and de-duplicate by normalized name
  const activePrograms = useMemo(() => {
    const list = Array.isArray(rawPrograms) ? rawPrograms : [];
    const seen = new Set<string>();
    return list.filter((p: any) => {
      const isAct = !p.status || p.status.toUpperCase() === 'ACTIVE';
      if (!isAct) return false;
      const key = (p.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawPrograms]);

  // Load branches
  const { data: branches = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['purchase-modal-branches'],
    queryFn: () => crmApi.getBranches(),
    enabled: isOpen,
  });

  // Load plans / packages
  const { data: rawPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['purchase-modal-plans'],
    queryFn: () => membersApi.getPlans(),
    enabled: isOpen,
  });

  const allPackages = useMemo(() => {
    const list = Array.isArray(rawPlans) ? rawPlans : (rawPlans as any)?.results || (rawPlans as any)?.data || [];
    return list
      .filter((p: any) => p.is_active !== false && p.status !== 'INACTIVE' && p.status !== 'ARCHIVED')
      .map((p: any) => {
        const match = (p.name || '').match(/(\d+)\s*session/i);
        const sCount = match
          ? parseInt(match[1], 10)
          : (p.total_sessions || p.session_count || (p.duration_months ? p.duration_months * 24 : 36));

        return {
          id: p.id || p.package_id,
          name: p.name,
          program_id: p.program_id,
          program_name: p.program_name || 'Standard Program',
          category_name: p.category_name || p.category || 'General',
          price: Number(p.price || 0),
          sessions: sCount,
          validity_days: p.validity_days || (p.duration_months ? p.duration_months * 30 : 90),
          description: p.description,
        };
      });
  }, [rawPlans]);

  // Distinct Categories derived from programs and packages
  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    activePrograms.forEach((p: any) => {
      if (p.category_name && p.category_name.trim()) {
        const c = p.category_name.trim();
        if (!catMap.has(c.toLowerCase())) catMap.set(c.toLowerCase(), c);
      }
    });
    allPackages.forEach((pkg: any) => {
      if (pkg.category_name && pkg.category_name.trim() && pkg.category_name !== 'General' && pkg.category_name !== 'Membership') {
        const c = pkg.category_name.trim();
        if (!catMap.has(c.toLowerCase())) catMap.set(c.toLowerCase(), c);
      }
    });
    if (catMap.size === 0) {
      activePrograms.forEach((p: any) => {
        const name = (p.name || '').trim();
        if (name && !catMap.has(name.toLowerCase())) catMap.set(name.toLowerCase(), name);
      });
    }
    return Array.from(catMap.values()).sort();
  }, [activePrograms, allPackages]);

  // Filtered Programs based on Level 1 Category
  const filteredPrograms = useMemo(() => {
    if (selectedCategory === 'all') return activePrograms;
    const catLower = selectedCategory.toLowerCase();
    return activePrograms.filter((p: any) => {
      if (p.category_name && p.category_name.trim().toLowerCase() === catLower) return true;
      if (p.name && (p.name.toLowerCase().includes(catLower) || catLower.includes(p.name.toLowerCase()))) return true;
      return false;
    });
  }, [activePrograms, selectedCategory]);

  // Filtered Packages based on Level 2 Program and Level 1 Category
  const filteredPackages = useMemo(() => {
    let pkgs = allPackages;

    if (selectedProgramId !== 'all') {
      const selectedProg = activePrograms.find((pr) => pr.id === selectedProgramId);
      const selectedName = selectedProg?.name?.trim().toLowerCase();

      pkgs = pkgs.filter((p: any) => {
        if (p.program_id && p.program_id === selectedProgramId) return true;
        if (selectedName && p.program_name && p.program_name.trim().toLowerCase() === selectedName) return true;
        if (selectedName && p.program_name && (p.program_name.toLowerCase().includes(selectedName) || selectedName.includes(p.program_name.toLowerCase()))) return true;
        if (selectedName && p.name && p.name.toLowerCase().includes(selectedName)) return true;
        return false;
      });
    } else if (selectedCategory !== 'all') {
      const matchingProgramIds = new Set(filteredPrograms.map((p: any) => p.id));
      const catLower = selectedCategory.toLowerCase();

      pkgs = pkgs.filter((p: any) => {
        if (p.program_id && matchingProgramIds.has(p.program_id)) return true;
        if (p.category_name && p.category_name.toLowerCase() === catLower) return true;
        if (p.program_name && (p.program_name.toLowerCase().includes(catLower) || catLower.includes(p.program_name.toLowerCase()))) return true;
        if (p.name && (p.name.toLowerCase().includes(catLower) || catLower.includes(p.name.toLowerCase()))) return true;
        return false;
      });
    }

    return pkgs.sort((a: any, b: any) => (a.sessions || 0) - (b.sessions || 0) || a.price - b.price);
  }, [allPackages, selectedProgramId, selectedCategory, activePrograms, filteredPrograms]);

  // Auto-select first package when filtered list updates
  React.useEffect(() => {
    if (filteredPackages.length > 0) {
      if (!selectedPackageId || !filteredPackages.find((p: any) => p.id === selectedPackageId)) {
        setSelectedPackageId(filteredPackages[0].id);
      }
    } else {
      setSelectedPackageId('');
    }
  }, [filteredPackages, selectedPackageId]);

  const selectedPkg = useMemo(() => {
    return filteredPackages.find((p: any) => p.id === selectedPackageId) || filteredPackages[0] || null;
  }, [filteredPackages, selectedPackageId]);

  const priceEstimate = useMemo(() => {
    return selectedPkg?.price || 15000;
  }, [selectedPkg]);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.purchasePackage(member.id, {
        package_id: selectedPkg?.id || selectedPackageId,
        branch_id: selectedBranchId || undefined,
        start_schedule: startSchedule,
        custom_start_date: startSchedule === 'CUSTOM' ? customStartDate : undefined,
        payment_amount: priceEstimate,
        payment_provider: paymentMethod === 'PAYMENT_LINK' ? 'PAYMENT_LINK' : (paymentMethod === 'CASH' ? 'CASH' : (paymentMethod === 'CARD' ? 'ICICI_POS' : 'RAZORPAY')),
        payment_method: paymentMethod,
        reason: `${reason} - ${selectedPkg?.name || ''} (${selectedPkg?.program_name || ''})`,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['member-360', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      if (res.status === 'PAYMENT_LINK_GENERATED' && res.payment_url) {
        setGeneratedLink({
          paymentUrl: res.payment_url,
          amount: res.amount || priceEstimate,
          memberId: member.id,
          memberName: member.name,
          memberPhone: member.phone,
          memberEmail: member.email,
          packageName: selectedPkg?.name || 'Program Package',
          orderNumber: res.order_number,
          orderId: res.order_id,
        });
      } else {
        toast.success(res.message || 'New program package purchased successfully!');
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to purchase package');
    },
  });

  return (
    <>
      <Dialog open={isOpen && !generatedLink} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Purchase New Program / Package
            </DialogTitle>
            <DialogDescription>
              Enroll {member.name} in a new program or add a multi-session package with immediate passbook provisioning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Category Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">1. Select Program Category</Label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedProgramId('all');
                  setSelectedPackageId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Program Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">2. Select Active Program</Label>
              <select
                value={selectedProgramId}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value);
                  setSelectedPackageId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="all">
                  All Programs in {selectedCategory === 'all' ? 'Studio' : selectedCategory} ({filteredPrograms.length})
                </option>
                {filteredPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category_name ? `(${p.category_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Package Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">3. Select Package Tier</Label>
              {loadingPlans ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading package catalog...</div>
              ) : filteredPackages.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                  No active package tiers found for this program. Select another program or &quot;All Programs&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredPackages.map((pkg: any) => {
                    const isSelected = selectedPkg?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/70 hover:bg-muted/40'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{pkg.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/30 text-primary">
                              {pkg.program_name}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            {pkg.sessions} Sessions · {pkg.validity_days} Days Validity
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-foreground">₹{pkg.price.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Home Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Home Branch</Label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Start Schedule */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Start Schedule</Label>
              <div className="space-y-1.5">
                <label className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${startSchedule === 'TODAY' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <input
                    type="radio"
                    name="start_schedule"
                    className="mt-0.5"
                    checked={startSchedule === 'TODAY'}
                    onChange={() => setStartSchedule('TODAY')}
                  />
                  <div>
                    <span className="font-semibold text-foreground block">Immediate (Today)</span>
                    <span className="text-muted-foreground text-[11px]">Starts today with full validity countdown active immediately.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${startSchedule === 'CONTINUOUS' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <input
                    type="radio"
                    name="start_schedule"
                    className="mt-0.5"
                    checked={startSchedule === 'CONTINUOUS'}
                    onChange={() => setStartSchedule('CONTINUOUS')}
                  />
                  <div>
                    <span className="font-semibold text-foreground block">Continuous</span>
                    <span className="text-muted-foreground text-[11px]">Starts after the member's current active plan expires.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${startSchedule === 'CUSTOM' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <input
                    type="radio"
                    name="start_schedule"
                    className="mt-0.5"
                    checked={startSchedule === 'CUSTOM'}
                    onChange={() => setStartSchedule('CUSTOM')}
                  />
                  <div className="w-full">
                    <span className="font-semibold text-foreground block">Specific Custom Start Date</span>
                    {startSchedule === 'CUSTOM' && (
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="mt-1.5 h-8 text-xs"
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* 5. Payment Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="PAYMENT_LINK">Send Payment Link (WhatsApp / SMS / Online)</option>
                <option value="CARD">Credit/Debit Card (ICICI POS Terminal)</option>
                <option value="ONLINE">UPI / Online Gateway</option>
                <option value="CASH">Cash (Front Desk Settlement)</option>
              </select>
            </div>

            {/* Summary Price Callout */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Payable Amount:</span>
              <span className="text-base font-bold text-foreground">₹{priceEstimate.toLocaleString()}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !selectedPkg}
              className="bg-primary text-primary-foreground gap-1.5"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {generatedLink && (
        <PaymentLinkShareModal
          isOpen={true}
          onClose={() => {
            setGeneratedLink(null);
            onClose();
          }}
          data={generatedLink}
        />
      )}
    </>
  );
};


