import * as React from "react";
import { 
  Headphones, 
  Circle, 
  ChevronDown, 
  Check, 
  Coffee, 
  PhoneOff, 
  Radio
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebRTCPhone } from "./WebRTCPhoneContext";

export function AgentPresenceWidget() {
  const queryClient = useQueryClient();
  const { agentCredentials } = useWebRTCPhone();
  const sipDomain = agentCredentials?.sip_domain || "registrar.vobiz.ai";

  const { data: presence } = useQuery({
    queryKey: ['telephony-presence'],
    queryFn: () => crmApi.getAgentPresence(),
    refetchInterval: 15000, // Poll presence every 15s
  });

  const updateMutation = useMutation({
    mutationFn: (newStatus: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'OFFLINE') =>
      crmApi.updateAgentPresence(newStatus),
    onSuccess: (updated) => {
      if (updated.is_registered_endpoint === false) {
        toast.info("No Vobiz SIP line assigned — account remains Offline for inbound routing.");
      } else {
        toast.success(`Softphone status set to ${updated.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ['telephony-presence'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || "Failed to update presence.");
    },
  });

  const isRegisteredEndpoint =
    presence?.is_registered_endpoint !== false &&
    !presence?.sip_username?.startsWith('unassigned_') &&
    !presence?.sip_username?.startsWith('agent_');

  const status = !isRegisteredEndpoint ? 'OFFLINE' : (presence?.status || 'AVAILABLE');

  const statusConfig = {
    AVAILABLE: {
      label: "Available",
      color: "bg-emerald-500",
      text: "text-emerald-500",
      border: "border-emerald-500/30",
      bgLight: "bg-emerald-500/10",
      ping: true,
    },
    ON_CALL: {
      label: "On Call",
      color: "bg-rose-500",
      text: "text-rose-500",
      border: "border-rose-500/30",
      bgLight: "bg-rose-500/10",
      ping: true,
    },
    WRAP_UP: {
      label: "Wrap Up",
      color: "bg-amber-500",
      text: "text-amber-500",
      border: "border-amber-500/30",
      bgLight: "bg-amber-500/10",
      ping: false,
    },
    OFFLINE: {
      label: "Offline",
      color: "bg-muted-foreground",
      text: "text-muted-foreground",
      border: "border-border",
      bgLight: "bg-muted",
      ping: false,
    },
  }[status] || {
    label: status,
    color: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border",
    bgLight: "bg-muted",
    ping: false,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${statusConfig.border} ${statusConfig.bgLight} ${statusConfig.text} hover:opacity-90`}
          title={`Vobiz WebPhone: ${statusConfig.label}`}
        >
          <span className="relative flex h-2 w-2">
            {statusConfig.ping && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.color}`}></span>
          </span>
          <Headphones className="size-3" />
          <span className="hidden sm:inline font-bold">{statusConfig.label}</span>
          <ChevronDown className="size-2.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-xl border-border bg-popover text-popover-foreground">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
          Vobiz WebPhone Status
          {isRegisteredEndpoint && presence?.sip_username ? (
            <div className="font-mono text-[10px] text-foreground font-normal truncate mt-0.5">
              sip:{presence.sip_username}@{sipDomain}
            </div>
          ) : (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              No dedicated Vobiz SIP line assigned
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!isRegisteredEndpoint || updateMutation.isPending}
          onClick={() => isRegisteredEndpoint && updateMutation.mutate('AVAILABLE')}
          className="flex items-center justify-between text-xs cursor-pointer py-2"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available for Inbound</span>
          </div>
          {status === 'AVAILABLE' && <Check className="size-3.5 text-emerald-500" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => updateMutation.mutate('OFFLINE')}
          className="flex items-center justify-between text-xs cursor-pointer py-2"
        >
          <div className="flex items-center gap-2">
            <Coffee className="size-3 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Break / Offline</span>
          </div>
          {status === 'OFFLINE' && <Check className="size-3.5 text-muted-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
