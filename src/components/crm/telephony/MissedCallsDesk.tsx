import * as React from "react";
import { 
  PhoneMissed, 
  PhoneOutgoing, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  RotateCw,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { crmApi } from "@/api/endpoints/crmApi";
import { useWebRTCPhone } from "./WebRTCPhoneContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface MissedCallItem {
  id: string;
  call_uuid: string;
  started_at: string;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    branch_name?: string;
    masked_phone: string;
    status: string;
  } | null;
  user_phone_number: string;
  sales_rep_name?: string;
  status: string;
}

export function MissedCallsDesk() {
  const queryClient = useQueryClient();

  const { isRegistered: isWebPhoneReady, makeCall: makeWebPhoneCall, callState: webPhoneCallState } = useWebRTCPhone();

  const handleCallback = async (item: any) => {
    if (isWebPhoneReady) {
      const leadName = item.lead
        ? `${item.lead.first_name} ${item.lead.last_name || ''}`.trim()
        : "Prospect";
      const phoneToCall = item.lead?.phone_normalized || item.user_phone_number;
      await makeWebPhoneCall(phoneToCall, leadName, {
        leadId: item.lead?.id,
        leadName,
      });
    } else if (item.lead?.id) {
      callbackMutation.mutate(item.lead.id);
    }
  };

  const { data: missedCalls = [], isLoading, refetch } = useQuery({
    queryKey: ['telephony-missed-calls'],
    queryFn: () => crmApi.getMissedCalls(),
    refetchInterval: 30000, // Poll every 30s
  });

  const callbackMutation = useMutation({
    mutationFn: (leadId: string) => crmApi.clickToCall(leadId),
    onSuccess: (res) => {
      toast.success(res.message || "Calling your Vobiz WebPhone first, then bridging lead.");
      queryClient.invalidateQueries({ queryKey: ['telephony-missed-calls'] });
    },
    onError: (err: any) => {
      console.error("Callback error:", err);
      toast.error(err?.response?.data?.error || err.message || "Failed to initiate callback.");
    },
  });

  const formatTimeAgo = (dateStr: string) => {
    try {
      const dt = new Date(dateStr);
      const diffMs = Date.now() - dt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return dt.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const count = missedCalls.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors border border-border bg-card shrink-0"
          aria-label="Missed Calls Desk"
          title="Inbound Missed Calls Queue"
        >
          <PhoneMissed className={`size-3.5 ${count > 0 ? 'text-rose-500' : ''}`} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-background animate-pulse">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 p-0 shadow-2xl rounded-2xl border-border bg-popover text-popover-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/40">
          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <PhoneMissed className="size-3.5 text-rose-500" />
            <span>Missed Inbound Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] font-bold ${count > 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-muted text-muted-foreground'}`}>
              {count} Pending
            </Badge>
            <button
              onClick={() => refetch()}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              title="Refresh Queue"
            >
              <RotateCw className="size-3" />
            </button>
          </div>
        </div>

        {/* List of Missed Calls */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading missed calls...
            </div>
          ) : count === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="size-6 text-emerald-500/60 mx-auto mb-2" />
              All inbound calls addressed. Zero missed calls in queue!
            </div>
          ) : (
            missedCalls.map((item) => {
              const leadName = item.lead
                ? `${item.lead.first_name} ${item.lead.last_name || ''}`.trim()
                : "New Prospect";
              const maskedPhone = item.lead?.masked_phone || item.user_phone_number.replace(/\d(?=\d{4})/g, "X");

              return (
                <div key={item.id} className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-foreground truncate">
                        {leadName}
                      </span>
                      {item.lead?.status && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-border/80">
                          {item.lead.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{maskedPhone}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 font-sans">
                        <Clock className="size-3" />
                        {formatTimeAgo(item.started_at)}
                      </span>
                    </div>
                    {item.lead?.branch_name && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="size-2.5" />
                        <span className="truncate">{item.lead.branch_name}</span>
                      </div>
                    )}
                  </div>

                  {item.lead?.id ? (
                    <Button
                      size="sm"
                      onClick={() => handleCallback(item)}
                      disabled={callbackMutation.isPending || webPhoneCallState !== 'IDLE'}
                      className="h-7 text-xs font-bold gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer shadow-sm"
                    >
                      <PhoneOutgoing className="size-3" />
                      {webPhoneCallState === 'CONNECTED' ? 'In Call' : 'Call'}
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Unmapped
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
