import * as React from "react";
import { Settings, Phone, ShieldCheck, Save, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { crmApi } from "@/api/endpoints/crmApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TelephonySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TelephonySettingsModal({ open, onOpenChange }: TelephonySettingsModalProps) {
  const queryClient = useQueryClient();

  // Fetch live configuration from backend
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ["telephony-config"],
    queryFn: () => crmApi.getTelephonyConfig(),
    enabled: open,
  });

  const [fromNumber, setFromNumber] = React.useState("");
  const [authId, setAuthId] = React.useState("");
  const [authToken, setAuthToken] = React.useState("");
  const [registrarHost, setRegistrarHost] = React.useState("");
  const [webrtcUrl, setWebrtcUrl] = React.useState("");
  const [ringTimeout, setRingTimeout] = React.useState<number>(20);
  const [recordAll, setRecordAll] = React.useState<boolean>(true);

  // Sync state when config loads
  React.useEffect(() => {
    if (config) {
      setFromNumber(config.from_number || "");
      setAuthId(config.auth_id || "");
      setAuthToken(""); // Never prefill real secret
      setRegistrarHost(config.registrar_host || "registrar.vobiz.ai");
      setWebrtcUrl(config.webrtc_gateway_url || "wss://registrar.vobiz.ai");
      setRingTimeout(config.ring_timeout_sec || 20);
      setRecordAll(config.record_all_calls !== false);
    }
  }, [config]);

  // Mutation to update configuration
  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => crmApi.updateTelephonyConfig(payload),
    onSuccess: () => {
      toast.success("Telephony Settings Saved", {
        description: "New carrier configuration is now live across the platform.",
      });
      queryClient.invalidateQueries({ queryKey: ["telephony-config"] });
      queryClient.invalidateQueries({ queryKey: ["telephony-webrtc-credentials"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error("Failed to save configuration", {
        description: err?.response?.data?.error || "An error occurred while saving.",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      from_number: fromNumber.trim(),
      auth_id: authId.trim(),
      registrar_host: registrarHost.trim(),
      webrtc_gateway_url: webrtcUrl.trim(),
      ring_timeout_sec: Number(ringTimeout) || 20,
      record_all_calls: recordAll,
    };
    if (authToken.trim()) {
      payload.auth_token = authToken.trim();
    }
    updateMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Settings className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Telephony & WebRTC Settings</DialogTitle>
                <DialogDescription className="text-xs">
                  Configure live Vobiz carrier DIDs, WebRTC gateways, and recording policies.
                </DialogDescription>
              </div>
            </div>
            {config?.status === "ACTIVE" && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="size-3 mr-1" /> Active
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading carrier configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Virtual DID Number</Label>
                <Input
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  placeholder="+919240954144"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ring Timeout (Seconds)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={ringTimeout}
                  onChange={(e) => setRingTimeout(Number(e.target.value))}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vobiz Auth ID</Label>
              <Input
                value={authId}
                onChange={(e) => setAuthId(e.target.value)}
                placeholder="MA_WQX7YN42"
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Vobiz Auth Token</Label>
                {config?.auth_token_masked && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Current: {config.auth_token_masked}
                  </span>
                )}
              </div>
              <Input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Leave blank to keep existing token"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SIP Registrar Host</Label>
                <Input
                  value={registrarHost}
                  onChange={(e) => setRegistrarHost(e.target.value)}
                  placeholder="registrar.vobiz.ai"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WebRTC Gateway (WSS)</Label>
                <Input
                  value={webrtcUrl}
                  onChange={(e) => setWebrtcUrl(e.target.value)}
                  placeholder="wss://registrar.vobiz.ai"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Record All Calls</Label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically record calls on Vobiz and archive to private storage.
                </p>
              </div>
              <Switch checked={recordAll} onCheckedChange={setRecordAll} />
            </div>

            <DialogFooter className="pt-2 border-t border-border/40 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" /> Save Configuration
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

