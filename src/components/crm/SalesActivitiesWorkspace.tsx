import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Users,
  Search,
  Plus,
  Clock,
  Building2,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  PhoneCall,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePermissions } from '@/lib/permissions';
import { crmApi } from '@/services/crmApi';
import type { ActivityType, Lead } from '@/types/crm';
import { LeadDetailModal } from './LeadDetailModal';
import { CRMPageHeader } from './common/CRMPageHeader';
import { CRMKpiTile } from './common/CRMKpiTile';
import { CRMFilterBar } from './common/CRMFilterBar';
import { CRMEmptyState } from './common/CRMEmptyState';
import { CRMErrorState } from './common/CRMErrorState';
import { CRMLoadingState } from './common/CRMLoadingState';
import { formatCrmLabel } from '@/lib/crmLabels';

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  CALL: { label: 'Phone Call', icon: Phone, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  EMAIL: { label: 'Email', icon: Mail, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  VISIT: { label: 'Studio Visit', icon: Building2, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  MEETING: { label: 'Consultation', icon: Users, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  FOLLOW_UP: { label: 'Follow-up Call', icon: Phone, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  TRIAL: { label: 'Trial Session', icon: Calendar, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  PAYMENT_LINK: { label: 'Payment Link', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  OTHER: { label: 'Other', icon: Clock, color: 'text-muted-foreground bg-muted/40 border-border/40' },
};

export function SalesActivitiesWorkspace() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('crm.leads.create') || can('crm.leads.edit');

  // Filters state
  const [search, setSearch] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('ALL');
  const [dateFilter, setDateFilter] = React.useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7'>('ALL');

  // Lead 360 modal state
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [leadModalOpen, setLeadModalOpen] = React.useState(false);

  // Log Activity Modal state
  const [isLogOpen, setIsLogOpen] = React.useState(false);
  const [logLeadId, setLogLeadId] = React.useState('');
  const [logType, setLogType] = React.useState<ActivityType>('CALL');
  const [logOutcome, setLogOutcome] = React.useState('');
  const [logNotes, setLogNotes] = React.useState('');
  const [logDateTime, setLogDateTime] = React.useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  // Calculate start/end dates from dateFilter
  const dateParams = React.useMemo(() => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      return { start_date: todayStr, end_date: todayStr };
    }
    if (dateFilter === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      return { start_date: yestStr, end_date: yestStr };
    }
    if (dateFilter === 'LAST_7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return { start_date: past.toISOString().slice(0, 10), end_date: now.toISOString().slice(0, 10) };
    }
    return {};
  }, [dateFilter]);

  // Fetch activities from real backend
  const {
    data: activities = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sales-activities', selectedType, dateParams],
    queryFn: () =>
      crmApi.getActivities({
        activity_type: selectedType !== 'ALL' ? (selectedType as ActivityType) : undefined,
        ...dateParams,
      }),
  });

  // Fetch real leads list for the log activity dropdown
  const { data: leadsData } = useQuery({
    queryKey: ['leads-brief-for-activities'],
    queryFn: () => crmApi.getLeads({ page_size: 100 }),
    staleTime: 60 * 1000,
  });
  const leadsList = leadsData?.results || [];

  // Filter activities locally by search term
  const filteredActivities = React.useMemo(() => {
    if (!search.trim()) return activities;
    const q = search.toLowerCase();
    return activities.filter(
      (a) =>
        (a.lead_name && a.lead_name.toLowerCase().includes(q)) ||
        (a.outcome && a.outcome.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.performed_by_name && a.performed_by_name.toLowerCase().includes(q))
    );
  }, [activities, search]);

  // Log activity mutation
  const logMutation = useMutation({
    mutationFn: (data: {
      lead: string;
      activity_type: ActivityType;
      outcome?: string;
      notes?: string;
      activity_at?: string;
    }) => crmApi.logActivity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activities'] });
      setIsLogOpen(false);
      setLogLeadId('');
      setLogOutcome('');
      setLogNotes('');
    },
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logLeadId) return;
    logMutation.mutate({
      lead: logLeadId,
      activity_type: logType,
      outcome: logOutcome.trim() || undefined,
      notes: logNotes.trim() || undefined,
      activity_at: logDateTime ? new Date(logDateTime).toISOString() : undefined,
    });
  };

  const handleOpenLead = async (leadId: string) => {
    try {
      const fullLead = await crmApi.getLead(leadId);
      setSelectedLead(fullLead);
      setLeadModalOpen(true);
    } catch {
      // Graceful fallback
    }
  };

  // Metrics derived from authoritative loaded data
  const metrics = React.useMemo(() => {
    const total = activities.length;
    const calls = activities.filter((a) => a.activity_type === 'CALL' || a.activity_type === 'FOLLOW_UP').length;
    const whatsapp = activities.filter((a) => a.activity_type === 'WHATSAPP').length;
    const visitsAndMeetings = activities.filter(
      (a) => a.activity_type === 'VISIT' || a.activity_type === 'MEETING' || a.activity_type === 'TRIAL'
    ).length;
    return { total, calls, whatsapp, visitsAndMeetings };
  }, [activities]);

  const hasActiveFilters = Boolean(search || selectedType !== 'ALL' || dateFilter !== 'ALL');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <CRMPageHeader
        title="Sales Activities"
        subtitle="Chronological log of prospect interactions: calls, WhatsApp conversations, studio visits, and staff outreach."
        icon={PhoneCall}
        badgeText="Real-time"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
              title="Refresh activities"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsLogOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Activity</span>
              </Button>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <CRMKpiTile
            label="Total Logged"
            value={metrics.total}
            isLoading={isLoading}
            isError={isError}
            hint="All recorded outreach events"
          />
          <CRMKpiTile
            label="Calls"
            value={metrics.calls}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'Phone', variant: 'info' }}
            hint="Outreach phone calls"
          />
          <CRMKpiTile
            label="WhatsApp"
            value={metrics.whatsapp}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'Chat', variant: 'positive' }}
            hint="WhatsApp conversations"
          />
          <CRMKpiTile
            label="Visits & Meetings"
            value={metrics.visitsAndMeetings}
            isLoading={isLoading}
            isError={isError}
            badge={{ text: 'In-person', variant: 'warning' }}
            hint="Walk-ins & consultations"
          />
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <CRMFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by lead name, outcome, notes..."
          onReset={() => {
            setSearch('');
            setSelectedType('ALL');
            setDateFilter('ALL');
          }}
          hasActiveFilters={hasActiveFilters}
          secondaryFilters={
            <>
              {/* Type Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Activity Type</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Activity Types</option>
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="VISIT">Studio Visit</option>
                  <option value="MEETING">Consultation</option>
                  <option value="FOLLOW_UP">Follow-up Call</option>
                  <option value="TRIAL">Trial Session</option>
                  <option value="PAYMENT_LINK">Payment Link</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Time Horizon</span>
                <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/30 text-xs h-8">
                  <button
                    type="button"
                    onClick={() => setDateFilter('ALL')}
                    className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      dateFilter === 'ALL' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('TODAY')}
                    className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      dateFilter === 'TODAY' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('YESTERDAY')}
                    className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      dateFilter === 'YESTERDAY' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('LAST_7')}
                    className={`flex-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      dateFilter === 'LAST_7' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    7 Days
                  </button>
                </div>
              </div>
            </>
          }
        />

        {/* ACTIVITIES FEED / LIST */}
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <CRMLoadingState message="Loading sales activities..." />
          ) : isError ? (
            <CRMErrorState
              title="Unable to Load Activities"
              message="Failed to fetch sales activities from the CRM backend. Please verify permissions or retry."
              onRetry={() => refetch()}
            />
          ) : filteredActivities.length === 0 ? (
            <CRMEmptyState
              icon={Activity}
              title="No Activities Recorded"
              description="No sales activities match your current filter criteria. Record calls, WhatsApp chats, and studio visits to build comprehensive client interaction history."
              actionLabel={canCreate ? '+ Log Activity' : undefined}
              onAction={() => setIsLogOpen(true)}
              canAction={canCreate}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Lead</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Outcome</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Logged By</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActivities.map((act) => {
                      const conf =
                        ACTIVITY_TYPE_CONFIG[act.activity_type as ActivityType] || ACTIVITY_TYPE_CONFIG.OTHER;
                      const Icon = conf.icon;
                      return (
                        <tr key={act.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenLead(act.lead)}
                              className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                            >
                              <span>{act.lead_name || 'Lead'}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60" />
                            </button>
                            {act.lead_phone && (
                              <span className="font-mono text-[11px] text-muted-foreground block">
                                {act.lead_phone}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs gap-1 font-medium ${conf.color}`}>
                              <Icon className="w-3 h-3" />
                              {conf.label || formatCrmLabel(act.activity_type)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground">{act.outcome || '—'}</span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-muted-foreground" title={act.notes || ''}>
                            {act.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {act.performed_by_name || 'Staff'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(act.activity_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenLead(act.lead)}
                              className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              View 360°
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="md:hidden divide-y divide-border">
                {filteredActivities.map((act) => {
                  const conf =
                    ACTIVITY_TYPE_CONFIG[act.activity_type as ActivityType] || ACTIVITY_TYPE_CONFIG.OTHER;
                  const Icon = conf.icon;
                  return (
                    <div
                      key={act.id}
                      className="p-4 space-y-2.5 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenLead(act.lead)}
                            className="font-bold text-foreground hover:text-primary text-sm flex items-center gap-1 text-left"
                          >
                            {act.lead_name || 'Lead'}
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                          </button>
                          {act.lead_phone && (
                            <span className="font-mono text-xs text-muted-foreground block">
                              {act.lead_phone}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[11px] gap-1 font-medium ${conf.color}`}>
                          <Icon className="w-3 h-3" />
                          {conf.label || formatCrmLabel(act.activity_type)}
                        </Badge>
                      </div>

                      {act.outcome && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Outcome: </span>
                          <strong className="text-foreground">{act.outcome}</strong>
                        </div>
                      )}

                      {act.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md italic">
                          "{act.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border font-mono">
                        <span>By {act.performed_by_name || 'Staff'}</span>
                        <span>{new Date(act.activity_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* LOG ACTIVITY MODAL */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Log Sales Activity
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a call, message, consultation, or studio interaction against an active prospect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogSubmit} className="space-y-4 pt-2">
            {/* Select Lead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Lead *</Label>
              <select
                required
                value={logLeadId}
                onChange={(e) => setLogLeadId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Lead --</option>
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name} ({l.phone_normalized || l.email_normalized || 'No contact'})
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Activity Type *</Label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as ActivityType)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="VISIT">Studio Visit</option>
                  <option value="MEETING">Consultation Meeting</option>
                  <option value="FOLLOW_UP">Follow-up Call</option>
                  <option value="TRIAL">Trial Session</option>
                  <option value="PAYMENT_LINK">Payment Link</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Occurred At</Label>
                <Input
                  type="datetime-local"
                  value={logDateTime}
                  onChange={(e) => setLogDateTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Outcome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Outcome / Result</Label>
              <Input
                placeholder="e.g. Interested in evening Pilates, Scheduled trial, Voicemail"
                value={logOutcome}
                onChange={(e) => setLogOutcome(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes & Context</Label>
              <textarea
                rows={3}
                placeholder="Provide detailed notes from the conversation or visit..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full p-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLogOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!logLeadId || logMutation.isPending}
                className="h-9 text-xs font-semibold"
              >
                {logMutation.isPending ? 'Saving...' : 'Save Activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LEAD 360 MODAL */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          open={leadModalOpen}
          onOpenChange={(open) => {
            setLeadModalOpen(open);
            if (!open) {
              setSelectedLead(null);
            }
          }}
        />
      )}
    </div>
  );
}
