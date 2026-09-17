import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  RefreshCw,
  Video,
  Award,
  Sparkles,
  Play,
  RotateCw,
  UserCheck,
} from 'lucide-react';
import { classesApi } from '../../services/classesApi';
import {
  ClassTemplate,
  ClassOccurrence,
  DeliveryMode,
} from '../../types/classes';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ClassesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'occurrences' | 'templates' | 'rules' | 'content'>('occurrences');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal / Drawer state
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAssignTrainerOpen, setIsAssignTrainerOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<ClassOccurrence | null>(null);
  const [trainerProfileIdInput, setTrainerProfileIdInput] = useState('');
  const [trainerRoleInput, setTrainerRoleInput] = useState<'LEAD' | 'ASSISTANT'>('LEAD');

  // New Template form state
  const [templateForm, setTemplateForm] = useState<{
    code: string;
    name: string;
    description: string;
    default_duration_minutes: number;
    default_capacity: number;
    default_waitlist_capacity: number;
    default_delivery_mode: DeliveryMode;
  }>({
    code: '',
    name: '',
    description: '',
    default_duration_minutes: 45,
    default_capacity: 20,
    default_waitlist_capacity: 5,
    default_delivery_mode: 'OFFLINE',
  });

  // Queries
  const {
    data: occurrences = [],
    isLoading: loadingOccurrences,
    refetch: refetchOccurrences,
  } = useQuery({
    queryKey: ['class-occurrences', selectedDate],
    queryFn: () => classesApi.getOccurrences({ occurrence_date: selectedDate }),
  });

  const {
    data: templates = [],
    isLoading: loadingTemplates,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ['class-templates'],
    queryFn: () => classesApi.getTemplates(),
  });

  const {
    data: rules = [],
    isLoading: loadingRules,
  } = useQuery({
    queryKey: ['class-rules'],
    queryFn: () => classesApi.getScheduleRules(),
  });

  const {
    data: contentItems = [],
    isLoading: loadingContent,
  } = useQuery({
    queryKey: ['class-content'],
    queryFn: () => classesApi.getContentItems(),
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) => classesApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-templates'] });
      setIsCreateTemplateOpen(false);
      setTemplateForm({
        code: '',
        name: '',
        description: '',
        default_duration_minutes: 45,
        default_capacity: 20,
        default_waitlist_capacity: 5,
        default_delivery_mode: 'OFFLINE',
      });
    },
  });

  const assignTrainerMutation = useMutation({
    mutationFn: ({
      occurrenceId,
      trainerId,
      role,
    }: {
      occurrenceId: string;
      trainerId: string;
      role: 'LEAD' | 'ASSISTANT';
    }) => classesApi.assignTrainer(occurrenceId, trainerId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      setIsAssignTrainerOpen(false);
      setSelectedOccurrence(null);
      setTrainerProfileIdInput('');
    },
  });

  const assignContentMutation = useMutation({
    mutationFn: (occurrenceId: string) => classesApi.rotateContent(occurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
    },
  });

  const filteredOccurrences = occurrences.filter((occ) => {
    const term = searchTerm.toLowerCase();
    const name = occ.template_name || '';
    const branch = occ.branch_name || '';
    return name.toLowerCase().includes(term) || branch.toLowerCase().includes(term);
  });

  const filteredTemplates = templates.filter((tpl) => {
    const term = searchTerm.toLowerCase();
    return (
      tpl.name.toLowerCase().includes(term) ||
      tpl.code.toLowerCase().includes(term) ||
      (tpl.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Group Classes Command Center"
        subtitle="Class Scheduling, Timetable Management & Content Studio"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Layer 2 Module E
            </span>
            <span className="text-muted-foreground text-xs">
              Showing {occurrences.length} sessions for {selectedDate}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'templates' && (
              <Button
                size="sm"
                onClick={() => setIsCreateTemplateOpen(true)}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>New Template</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchOccurrences();
                refetchTemplates();
              }}
              title="Refresh"
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* Navigation Tabs - Responsive Scrollbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'occurrences'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Daily Schedule & Sessions ({occurrences.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Class Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Recurring Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Content Studio ({contentItems.length})
          </button>
        </div>

        {/* TAB 1: OCCURRENCES */}
        {activeTab === 'occurrences' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search occurrences by class or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0 hidden sm:block" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background w-full sm:w-auto"
                />
              </div>
            </div>

            {loadingOccurrences ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading daily schedule from tenant database...
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Calendar className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Occurrences Scheduled</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  No sessions generated for {selectedDate}. Generate sessions from recurring timetable rules or schedule one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOccurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {occ.delivery_mode}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-2">
                            {occ.template_name || 'Class Session'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{occ.branch_name || 'Branch Session'}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            occ.status === 'OPEN' || occ.status === 'SCHEDULED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {occ.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {new Date(occ.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(occ.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Capacity: {occ.capacity} (Waitlist: {occ.waitlist_capacity})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Trainers:{' '}
                            {occ.assigned_trainers && occ.assigned_trainers.length > 0
                              ? occ.assigned_trainers.map((t) => t.trainer_name || t.trainer_code).join(', ')
                              : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOccurrence(occ);
                          setIsAssignTrainerOpen(true);
                        }}
                        className="flex-1 text-xs"
                      >
                        Assign Trainer
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => assignContentMutation.mutate(occ.id)}
                        disabled={assignContentMutation.isPending}
                        className="flex-1 text-xs"
                      >
                        Rotate Content
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search templates by code or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            {loadingTemplates ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading class templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Award className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Templates Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Create high-intensity, yoga, or strength workout templates to schedule group classes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary">{tpl.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {tpl.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{tpl.name}</h3>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Duration</span>
                          <span className="font-semibold text-foreground">{tpl.default_duration_minutes} mins</span>
                        </div>
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Capacity</span>
                          <span className="font-semibold text-foreground">
                            {tpl.default_capacity} (WL: {tpl.default_waitlist_capacity})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Delivery: {tpl.default_delivery_mode}</span>
                      <span>{tpl.allow_booking ? 'Bookable' : 'Internal'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECURRING RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {loadingRules ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading recurring schedule rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <RotateCw className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Recurring Schedule Rules</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Configure recurring weekly timetable patterns to automatically populate occurrence slots.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Class Template</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Weekdays</th>
                        <th className="px-4 py-3">Time Window</th>
                        <th className="px-4 py-3">Validity</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{rule.template_name || rule.class_template}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rule.branch_name || rule.branch}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs">
                              {(rule.days_of_week || []).map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(', ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {rule.start_time} - {rule.end_time}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {rule.valid_from} to {rule.valid_until || 'Ongoing'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                              {rule.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONTENT STUDIO */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
              <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground block">NO_REPEAT_UNTIL_EXHAUSTED Engine</span>
                Content rotation strictly serves workout media and session plans in deterministic sequence by display order.
                Items repeat only after the complete pool for a class template has been exhausted.
              </div>
            </div>

            {loadingContent ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading Content Studio items...
              </div>
            ) : contentItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Video className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Content Items Registered</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Upload workout playlists, video instructions, and workout cards for the Content Studio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">Order #{item.display_order}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                          {item.content_type}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Status: {item.status}</span>
                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Play className="w-3 h-3" /> Stream Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* CREATE TEMPLATE MODAL */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Class Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Code</Label>
              <Input
                type="text"
                value={templateForm.code}
                onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                placeholder="e.g. HIIT-45"
              />
            </div>
            <div>
              <Label className="mb-1 block">Title</Label>
              <Input
                type="text"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g. High Intensity Tabata"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={templateForm.default_duration_minutes}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, default_duration_minutes: parseInt(e.target.value) || 45 })
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block">Capacity</Label>
                <Input
                  type="number"
                  value={templateForm.default_capacity}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, default_capacity: parseInt(e.target.value) || 20 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate(templateForm)}
              disabled={!templateForm.code || !templateForm.name || createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? 'Creating...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TRAINER MODAL */}
      <Dialog open={isAssignTrainerOpen && !!selectedOccurrence} onOpenChange={setIsAssignTrainerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Trainer to Occurrence</DialogTitle>
          </DialogHeader>
          {selectedOccurrence && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Session: <strong className="text-foreground">{selectedOccurrence.template_name}</strong> on{' '}
                {selectedOccurrence.occurrence_date}
              </p>

              <div>
                <Label className="mb-1 block">Trainer Profile ID (UUID)</Label>
                <Input
                  type="text"
                  value={trainerProfileIdInput}
                  onChange={(e) => setTrainerProfileIdInput(e.target.value)}
                  placeholder="Paste Trainer Profile UUID"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block">Role</Label>
                <select
                  value={trainerRoleInput}
                  onChange={(e) => setTrainerRoleInput(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="LEAD">Lead Trainer</option>
                  <option value="ASSISTANT">Assistant Trainer</option>
                </select>
              </div>

              {assignTrainerMutation.isError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                  Eligibility error: {(assignTrainerMutation.error as any)?.response?.data?.error || 'Validation failed'}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignTrainerOpen(false);
                setSelectedOccurrence(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOccurrence &&
                assignTrainerMutation.mutate({
                  occurrenceId: selectedOccurrence.id,
                  trainerId: trainerProfileIdInput,
                  role: trainerRoleInput,
                })
              }
              disabled={!trainerProfileIdInput || assignTrainerMutation.isPending}
            >
              {assignTrainerMutation.isPending ? 'Verifying...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
