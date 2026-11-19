import * as React from 'react';
import { PhoneCall, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { crmApi } from '@/api/endpoints/crmApi';
import { isMaskedPhone } from '@/lib/phonePrivacy';
import { useWebRTCPhone } from './WebRTCPhoneContext';
import { cn } from '@/lib/utils';

export interface LeadCallButtonProps {
  leadId?: string | null;
  memberId?: string | null;
  sessionId?: string | null;
  phone?: string | null;
  contactName?: string;
  doNotContact?: boolean;
  label?: string;
  compact?: boolean;
  className?: string;
  onCallStarted?: () => void;
}

/**
 * Reusable 1-tap Vobiz Call Button across Leads, Follow-ups, Trial Management,
 * Missed Calls, and Member 360.
 *
 * Privacy-safe dialing:
 * - When the user has an unmasked phone number and WebPhone is registered, places a
 *   direct WebRTC call via Vobiz (preserving existing fast dialing behavior).
 * - When the phone number is masked (******7890) due to RBAC privacy rules, dials
 *   server-side via /tenant/crm/telephony/click-to-call/ using lead_id / member_id /
 *   session_id so the RM can speak to the customer without ever receiving the raw number.
 */
export function LeadCallButton({
  leadId,
  memberId,
  sessionId,
  phone,
  contactName = 'Prospect',
  doNotContact = false,
  label = 'Call',
  compact = false,
  className,
  onCallStarted,
}: LeadCallButtonProps) {
  const { isRegistered: isWebPhoneReady, makeCall: makeWebPhoneCall, callState: webPhoneCallState } =
    useWebRTCPhone();
  const [isDialing, setIsDialing] = React.useState(false);

  const rawPhone = (phone || '').trim();
  const masked = isMaskedPhone(rawPhone);
  const rawDigits = rawPhone.replace(/\D/g, '');
  const hasUnmaskedPhone = !masked && rawDigits.length >= 7;
  const hasServerTarget = Boolean(leadId || memberId || sessionId);
  const canPlaceCall = !doNotContact && (hasUnmaskedPhone || (masked && hasServerTarget) || (!rawPhone && hasServerTarget));

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDialing || webPhoneCallState !== 'IDLE') return;

    if (doNotContact) {
      toast.warning('This contact is marked Do Not Contact.');
      return;
    }

    if (!canPlaceCall) {
      toast.error('No phone number available for this contact.');
      return;
    }

    setIsDialing(true);
    try {
      // 1. Authorized user with unmasked phone + registered WebPhone -> direct browser dial
      if (hasUnmaskedPhone && isWebPhoneReady) {
        toast.info(`Dialing ${contactName} via Vobiz WebPhone...`);
        const ok = await makeWebPhoneCall(rawPhone, contactName, {
          leadId: leadId || undefined,
          leadName: contactName,
          memberId: memberId || undefined,
        });
        if (ok) {
          onCallStarted?.();
        }
        return;
      }

      // 2. Masked phone (privacy-enforced) OR WebPhone server-bridge -> server-side Click-to-Call
      if (hasServerTarget) {
        const res = await crmApi.clickToCall({
          ...(leadId ? { lead_id: leadId } : {}),
          ...(memberId ? { member_id: memberId } : {}),
          ...(sessionId ? { session_id: sessionId } : {}),
        });
        toast.success(`Calling ${contactName}`, {
          description: res.message || 'Ringing your Vobiz WebPhone first, then bridging customer.',
        });
        onCallStarted?.();
        return;
      }

      toast.error('Vobiz WebPhone Not Ready', {
        description: 'Please connect WebPhone in the top navigation bar before placing calls.',
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to initiate call via Vobiz.';
      toast.error(msg);
    } finally {
      setIsDialing(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!canPlaceCall || isDialing || webPhoneCallState !== 'IDLE'}
      onClick={handleClick}
      title={
        doNotContact
          ? 'Do Not Contact'
          : webPhoneCallState !== 'IDLE'
          ? 'Finish current active call first'
          : `Call ${contactName} via Vobiz`
      }
      className={cn(
        compact ? 'h-7 px-2 text-[11px] gap-1' : 'h-8 px-2.5 text-xs gap-1.5',
        'font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 cursor-pointer shrink-0',
        className
      )}
    >
      {isDialing ? (
        <Loader2 className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5', 'animate-spin')} />
      ) : (
        <PhoneCall className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      )}
      {label && <span>{isDialing ? 'Dialing...' : label}</span>}
    </Button>
  );
}
