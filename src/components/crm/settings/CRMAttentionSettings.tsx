import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Shield,
  Save,
  Play,
  RotateCw,
  Bell,
  UserCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/api/endpoints/crmApi';
import type { CRMAttentionPolicy } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface CRMAttentionSettingsProps {
  canEdit: boolean;
}

export function CRMAttentionSettings({ canEdit }: CRMAttentionSettingsProps) {
  const queryClient = useQueryClient();

  const {
    data: policy,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['crm-settings-attention-policy'],
    queryFn: () => crmApi.getAttentionPolicy(),
  });

  const [formData, setFormData] = React.useState<Partial<CRMAttentionPolicy>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (policy) {
      setFormData({
        is_enabled: policy.is_enabled ?? false,
        sla_breach_attention_enabled: policy.sla_breach_attention_enabled ?? false,
        no_followup_attention_enabled: policy.no_followup_attention_enabled ?? false,
        overdue_followup_attention_enabled: policy.overdue_followup_attention_enabled ?? false,
        no_response_attention_enabled: policy.no_response_attention_enabled ?? false,
        no_response_wait_hours: policy.no_response_wait_hours ?? 24,
        trial_not_booked_attention_enabled: policy.trial_not_booked_attention_enabled ?? false,
        trial_confirmation_attention_enabled: policy.trial_confirmation_attention_enabled ?? false,
        trial_no_show_attention_enabled: policy.trial_no_show_attention_enabled ?? false,
        post_trial_followup_attention_enabled: policy.post_trial_followup_attention_enabled ?? false,
        unassigned_lead_attention_enabled: policy.unassigned_lead_attention_enabled ?? false,
        unassigned_wait_minutes: policy.unassigned_wait_minutes ?? 60,
      });
      setHasChanges(false);
    }
  }, [policy]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CRMAttentionPolicy>) => {
      if (!policy?.id) throw new Error('Attention policy not found');
      return crmApi.updateAttentionPolicy(policy.id, payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['crm-settings-attention-policy'], updated);
      toast.success('Attention policy updated successfully');
      setHasChanges(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to update attention policy');
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => crmApi.scanSlaBreaches(),
    onSuccess: (res) => {
      toast.success(`SLA scan completed: ${res.emitted_events_count} events enqueued to outbox`);
      queryClient.invalidateQueries({ queryKey: ['crm-attention-metrics'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to trigger SLA scan');
    },
  });

  const handleChange = <K extends keyof CRMAttentionPolicy>(key: K, value: CRMAttentionPolicy[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs">Loading attention policy settings...</span>
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="p-6 bg-destructive/5 rounded-xl border border-destructive/20 text-center text-xs text-destructive space-y-2">
        <p>Failed to load attention policy configuration.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8 text-xs">
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-card p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Stuck Lead Detection & Next Best Action Policy
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Configure automated attention triggers and time thresholds. When triggered, the engine marks leads as stuck,
            determines the primary reason with overdue magnitude, and prescribes deterministic Next Best Actions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="gap-1.5 h-8 text-xs"
              title="Run on-demand SLA breach scan"
            >
              {scanMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-primary" />
              )}
              <span>Scan SLA Breaches</span>
            </Button>
          )}
          {canEdit && (
            <Button
              type="submit"
              size="sm"
              disabled={!hasChanges || updateMutation.isPending}
              className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Policy</span>
            </Button>
          )}
        </div>
      </div>

      {/* MASTER SWITCH CARD */}
      <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="master-switch" className="text-sm font-bold text-foreground cursor-pointer">
              Attention Engine Master Switch
            </Label>
            <p className="text-xs text-muted-foreground">
              When disabled, all attention checks are paused and no leads will be flagged as stuck.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={formData.is_enabled ? 'default' : 'secondary'}
              className="text-[10px] font-semibold"
            >
              {formData.is_enabled ? 'ACTIVE' : 'DISABLED'}
            </Badge>
            <Switch
              id="master-switch"
              checked={formData.is_enabled}
              onCheckedChange={(val) => handleChange('is_enabled', val)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* 2-COLUMN SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: Stage SLA & Follow-up Rules */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Stage SLAs & Follow-up Tasks
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Stage SLA Breaches</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag leads whose stage SLA has elapsed according to configured Stage SLA Policies.
                </p>
              </div>
              <Switch
                checked={formData.sla_breach_attention_enabled}
                onCheckedChange={(val) => handleChange('sla_breach_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Overdue Follow-up Tasks</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag leads with pending sales tasks past their scheduled due date/time.
                </p>
              </div>
              <Switch
                checked={formData.overdue_followup_attention_enabled}
                onCheckedChange={(val) => handleChange('overdue_followup_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">No Follow-up Scheduled</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag leads lacking an upcoming follow-up after their stage SLA window elapses.
                </p>
              </div>
              <Switch
                checked={formData.no_followup_attention_enabled}
                onCheckedChange={(val) => handleChange('no_followup_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Communication & Responsiveness */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Customer Responsiveness
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Awaiting Response Tracking</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag leads where outbound outreach awaits customer reply beyond the configured wait window.
                </p>
              </div>
              <Switch
                checked={formData.no_response_attention_enabled}
                onCheckedChange={(val) => handleChange('no_response_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            {formData.no_response_attention_enabled && (
              <div className="space-y-1.5 pt-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <Label className="text-xs font-medium text-foreground">
                  Response Wait Threshold (Hours)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={formData.no_response_wait_hours ?? 24}
                    onChange={(e) => handleChange('no_response_wait_hours', parseInt(e.target.value, 10) || 24)}
                    disabled={!canEdit || !formData.is_enabled}
                    className="h-8 text-xs font-mono w-28"
                  />
                  <span className="text-xs text-muted-foreground">hours after last outbound message</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Trial Booking & Attendance Lifecycle */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Trial Workout Lifecycle
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Trial Not Booked</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag interested / hot leads without a booked session once stage SLA expires.
                </p>
              </div>
              <Switch
                checked={formData.trial_not_booked_attention_enabled}
                onCheckedChange={(val) => handleChange('trial_not_booked_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Trial Confirmation Pending</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag bookings pending confirmation beyond the trial reminder wait duration.
                </p>
              </div>
              <Switch
                checked={formData.trial_confirmation_attention_enabled}
                onCheckedChange={(val) => handleChange('trial_confirmation_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Trial No-Show Recovery</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag missed sessions lacking completed re-engagement follow-up.
                </p>
              </div>
              <Switch
                checked={formData.trial_no_show_attention_enabled}
                onCheckedChange={(val) => handleChange('trial_no_show_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Post-Trial Conversion Follow-up</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag attended workouts needing membership consultation follow-up.
                </p>
              </div>
              <Switch
                checked={formData.post_trial_followup_attention_enabled}
                onCheckedChange={(val) => handleChange('post_trial_followup_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>
          </div>
        </div>

        {/* CARD 4: Lead Ownership & Assignment */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <UserCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Lead Ownership & Assignment
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-semibold text-foreground">Unassigned Lead Alerts</Label>
                <p className="text-[11px] text-muted-foreground">
                  Flag newly registered leads without an active sales representative.
                </p>
              </div>
              <Switch
                checked={formData.unassigned_lead_attention_enabled}
                onCheckedChange={(val) => handleChange('unassigned_lead_attention_enabled', val)}
                disabled={!canEdit || !formData.is_enabled}
              />
            </div>

            {formData.unassigned_lead_attention_enabled && (
              <div className="space-y-1.5 pt-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <Label className="text-xs font-medium text-foreground">
                  Unassigned Grace Period (Minutes)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={1440}
                    value={formData.unassigned_wait_minutes ?? 60}
                    onChange={(e) => handleChange('unassigned_wait_minutes', parseInt(e.target.value, 10) || 0)}
                    disabled={!canEdit || !formData.is_enabled}
                    className="h-8 text-xs font-mono w-28"
                  />
                  <span className="text-xs text-muted-foreground">minutes after lead creation</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
