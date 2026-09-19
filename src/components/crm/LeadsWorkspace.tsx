/**
 * src/components/crm/LeadsWorkspace.tsx — Layer 2 Production CRM & Leads Workspace
 * Real API integration with backend tenant database. Zero mock fallback.
 * Responsive across Mobile, Tablet, Laptop, and Desktop.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sparkles,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

import { crmApi } from '@/services/crmApi';
import type { Lead, LeadStatus, LeadSource } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/lib/permissions';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  NEW_LEAD: { label: 'New Lead', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  TRIAL_BOOKED: { label: 'Trial Booked', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  TRIAL_CONFIRMED: { label: 'Trial Confirmed', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  TRIAL_ATTENDED: { label: 'Trial Attended', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  NO_SHOW: { label: 'No Show', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  FOLLOW_UP_PENDING: { label: 'Follow-up Pending', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  INTERESTED: { label: 'Interested', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  HOT_LEAD: { label: 'Hot Lead', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  CONVERTED: { label: 'Converted Member', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'bg-muted text-muted-foreground border-border' },
  LOST: { label: 'Lost', color: 'bg-muted text-muted-foreground border-border' },
};

export function LeadsWorkspace() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('sales.leads.create');
  const canEdit = can('sales.leads.edit');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);
  const [isTrialOpen, setIsTrialOpen] = React.useState(false);

  // New Lead Form State
  const [newFirst, setNewFirst] = React.useState('');
  const [newLast, setNewLast] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newCompany, setNewCompany] = React.useState('');
  const [newSourceId, setNewSourceId] = React.useState('');

  // Status Change Form State
  const [targetStatus, setTargetStatus] = React.useState<LeadStatus>('INTERESTED');
  const [statusReason, setStatusReason] = React.useState('');

  // Trial Booking Form State
  const [trialDate, setTrialDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [trialTime, setTrialTime] = React.useState('10:00');
  const [trialType, setTrialType] = React.useState('GROUP_CLASS');

  // Queries
  const {
    data: leads = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', statusFilter, searchQuery],
    queryFn: () =>
      crmApi.getLeads({
        current_status: statusFilter,
        search: searchQuery || undefined,
      }),
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => crmApi.getLeadSources(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: crmApi.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully!');
      setIsCreateOpen(false);
      setNewFirst('');
      setNewLast('');
      setNewPhone('');
      setNewEmail('');
      setNewCompany('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create lead');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: any }) =>
      crmApi.transitionStatus(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated!');
      setIsStatusOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update status');
    },
  });

  const trialMutation = useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: any }) =>
      crmApi.bookTrial(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Trial booked and lead status updated!');
      setIsTrialOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to book trial');
    },
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst.trim() || !newLast.trim()) {
      toast.error('First and last name are required');
      return;
    }
    createMutation.mutate({
      first_name: newFirst.trim(),
      last_name: newLast.trim(),
      phone_normalized: newPhone.trim() || undefined,
      email_normalized: newEmail.trim() || undefined,
      company_name: newCompany.trim() || undefined,
      lead_source: newSourceId || undefined,
    });
  };

  const handleTransitionStatus = () => {
    if (!selectedLead) return;
    transitionMutation.mutate({
      leadId: selectedLead.id,
      payload: {
        new_status: targetStatus,
        reason_code: 'CRM_UI_CHANGE',
        reason_text: statusReason || undefined,
      },
    });
  };

  const handleBookTrial = () => {
    if (!selectedLead) return;
    const startIso = `${trialDate}T${trialTime}:00Z`;
    const endDt = new Date(`${trialDate}T${trialTime}:00Z`);
    endDt.setHours(endDt.getHours() + 1);
    const endIso = endDt.toISOString();

    trialMutation.mutate({
      leadId: selectedLead.id,
      payload: {
        branch_id: selectedLead.branch || '00000000-0000-0000-0000-000000000000',
        scheduled_start: startIso,
        scheduled_end: endIso,
        trial_type: trialType,
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-md px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">CRM & Leads Pipeline</h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Layer 2 Verified
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Commercial prospect lifecycle: lead intake, touchpoint history, trial bookings, and conversion.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
              title="Refresh leads"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Lead</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'NEW_LEAD', 'TRIAL_BOOKED', 'INTERESTED', 'HOT_LEAD', 'CONVERTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {st === 'ALL' ? 'All Leads' : STATUS_CONFIG[st as LeadStatus]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Unable to Load Leads</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {(error as Error)?.message || 'An error occurred while connecting to the backend API.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg">No Leads Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6">
              There are no prospective members in your database matching the current filter.
            </p>
            {canCreate && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Lead
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Data Table */}
            <div className="hidden md:block rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Lead Name</th>
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5">Source</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Assigned Rep</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {leads.map((lead) => {
                    const statusConf = STATUS_CONFIG[lead.current_status] || {
                      label: lead.current_status,
                      color: 'bg-muted text-muted-foreground',
                    };
                    return (
                      <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                              {lead.first_name.substring(0, 1)}
                              {lead.last_name.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {lead.first_name} {lead.last_name}
                              </div>
                              {lead.company_name && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3" />
                                  <span>{lead.company_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground space-y-0.5">
                          {lead.phone_normalized && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3 h-3 text-muted-foreground/80" />
                              <span>{lead.phone_normalized}</span>
                            </div>
                          )}
                          {lead.email_normalized && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-muted-foreground/80" />
                              <span>{lead.email_normalized}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {lead.source_name || lead.first_touch_source || 'Direct'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline" className={`text-xs ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {lead.assigned_sales_name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setTargetStatus(lead.current_status);
                                  setIsStatusOpen(true);
                                }}
                                className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                              >
                                Update Status
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsTrialOpen(true);
                                }}
                                className="h-8 text-xs"
                              >
                                Book Trial
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {leads.map((lead) => {
                const statusConf = STATUS_CONFIG[lead.current_status] || {
                  label: lead.current_status,
                  color: 'bg-muted text-muted-foreground',
                };
                return (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                          {lead.first_name.substring(0, 1)}
                          {lead.last_name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {lead.company_name && (
                            <div className="text-xs text-muted-foreground">{lead.company_name}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${statusConf.color}`}>
                        {statusConf.label}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      {lead.phone_normalized && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{lead.phone_normalized}</span>
                        </div>
                      )}
                      {lead.email_normalized && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{lead.email_normalized}</span>
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setTargetStatus(lead.current_status);
                            setIsStatusOpen(true);
                          }}
                          className="h-8 text-xs flex-1"
                        >
                          Status
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsTrialOpen(true);
                          }}
                          className="h-8 text-xs flex-1 bg-primary text-primary-foreground"
                        >
                          Book Trial
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* New Lead Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateLead}>
            <DialogHeader>
              <DialogTitle>Register New Lead</DialogTitle>
              <DialogDescription>
                Add a new prospective member to the dedicated tenant CRM database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    required
                    className="h-9 text-xs"
                    placeholder="e.g. Alex"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    required
                    className="h-9 text-xs"
                    placeholder="e.g. Mercer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="+1 555 019 2831"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="alex.mercer@company.com"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Company / Workplace</Label>
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="e.g. TechCorp Solutions"
                />
              </div>

              {sources.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Attribution Source</Label>
                  <select
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="">Direct / Walk-in</option>
                    {sources.map((src) => (
                      <option key={src.id} value={src.id}>
                        {src.name} ({src.source_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Create Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transition Status Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
            <DialogDescription>
              Transition {selectedLead?.first_name} {selectedLead?.last_name} to a new pipeline stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs">Target Pipeline Stage</Label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as LeadStatus)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {Object.entries(STATUS_CONFIG).map(([stKey, conf]) => (
                  <option key={stKey} value={stKey}>
                    {conf.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason / Note</Label>
              <Input
                placeholder="e.g. Spoke on call, interested in 12-month membership"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={transitionMutation.isPending} onClick={handleTransitionStatus}>
              {transitionMutation.isPending ? 'Updating...' : 'Save Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Trial Session Modal */}
      <Dialog open={isTrialOpen} onOpenChange={setIsTrialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Trial Session</DialogTitle>
            <DialogDescription>
              Schedule an introductory session for {selectedLead?.first_name} {selectedLead?.last_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Session Date</Label>
                <Input
                  type="date"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={trialTime}
                  onChange={(e) => setTrialTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Trial Type</Label>
              <select
                value={trialType}
                onChange={(e) => setTrialType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="GROUP_CLASS">Group Class Trial</option>
                <option value="PERSONAL_TRAINING">1-on-1 PT Consultation</option>
                <option value="FITNESS_ASSESSMENT">Body Assessment & Goal Review</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsTrialOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={trialMutation.isPending} onClick={handleBookTrial}>
              {trialMutation.isPending ? 'Booking...' : 'Confirm Trial Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
