import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Video,
  Award,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { classesApi } from '../../services/classesApi';
import {
  ClassTemplate,
  ClassOccurrence,
  ClassScheduleRule,
  ClassContentItem,
  DeliveryMode,
} from '../../types/classes';

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
    queryKey: ['class-schedule-rules'],
    queryFn: () => classesApi.getScheduleRules(),
  });

  const {
    data: contentItems = [],
    isLoading: loadingContent,
  } = useQuery({
    queryKey: ['class-content-items'],
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
    mutationFn: ({ occurrenceId, trainerId, role }: { occurrenceId: string; trainerId: string; role: string }) =>
      classesApi.assignTrainer(occurrenceId, trainerId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      setIsAssignTrainerOpen(false);
      setSelectedOccurrence(null);
      setTrainerProfileIdInput('');
    },
  });

  const assignContentMutation = useMutation({
    mutationFn: (occurrenceId: string) => classesApi.assignContent(occurrenceId),
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                Layer 2 Module E
              </span>
              <span className="text-xs text-slate-400">Class Scheduling & Content Studio</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Group Classes Command Center
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeTab === 'templates' && (
              <button
                onClick={() => setIsCreateTemplateOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Class Template</span>
                <span className="sm:hidden">Template</span>
              </button>
            )}
            <button
              onClick={() => {
                refetchOccurrences();
                refetchTemplates();
              }}
              className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'occurrences'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Daily Schedule & Sessions ({occurrences.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Class Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Recurring Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'content'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Content Studio ({contentItems.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* TAB 1: OCCURRENCES */}
        {activeTab === 'occurrences' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search occurrences by class or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400 hidden sm:block" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {loadingOccurrences ? (
              <div className="p-8 text-center text-slate-400">Loading daily schedule from tenant database...</div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Class Occurrences Scheduled</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  No sessions generated for {selectedDate}. Generate sessions from recurring schedule rules or create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOccurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {occ.delivery_mode}
                          </span>
                          <h3 className="text-base font-semibold text-white mt-2">
                            {occ.template_name || 'Class Session'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{occ.branch_name || 'Branch Session'}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            occ.status === 'OPEN' || occ.status === 'SCHEDULED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {occ.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            {new Date(occ.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(occ.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            Capacity: {occ.capacity} (Waitlist: {occ.waitlist_capacity})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            Trainers:{' '}
                            {occ.assigned_trainers && occ.assigned_trainers.length > 0
                              ? occ.assigned_trainers.map((t) => t.trainer_name || t.trainer_code).join(', ')
                              : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedOccurrence(occ);
                          setIsAssignTrainerOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-center"
                      >
                        Assign Trainer
                      </button>
                      <button
                        onClick={() => assignContentMutation.mutate(occ.id)}
                        disabled={assignContentMutation.isPending}
                        className="flex-1 py-1.5 px-2.5 text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors text-center"
                      >
                        Rotate Content
                      </button>
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates by code or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {loadingTemplates ? (
              <div className="p-8 text-center text-slate-400">Loading class templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Class Templates Found</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Create high intensity interval, yoga, or strength workout templates to schedule group classes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-400">{tpl.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {tpl.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-2">{tpl.name}</h3>
                      {tpl.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tpl.description}</p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-500 block">Duration</span>
                          <span className="font-semibold text-slate-200">{tpl.default_duration_minutes} mins</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-500 block">Capacity</span>
                          <span className="font-semibold text-slate-200">
                            {tpl.default_capacity} (WL: {tpl.default_waitlist_capacity})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
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
              <div className="p-8 text-center text-slate-400">Loading recurring schedule rules...</div>
            ) : rules.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <RotateCw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Recurring Schedule Rules</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Configure recurring weekly timetable patterns to automatically populate occurrence slots.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Class Template</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Weekdays</th>
                      <th className="px-4 py-3">Time Window</th>
                      <th className="px-4 py-3">Validity</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-white">{rule.template_name || rule.class_template}</td>
                        <td className="px-4 py-3 text-slate-400">{rule.branch_name || rule.branch}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">
                            {(rule.days_of_week || []).map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(', ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {rule.start_time} - {rule.end_time}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {rule.valid_from} to {rule.valid_until || 'Ongoing'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {rule.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONTENT STUDIO */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white block">NO_REPEAT_UNTIL_EXHAUSTED Engine</span>
                Content rotation strictly serves workout media and session plans in deterministic sequence by display order.
                Items repeat only after the complete pool for a class template has been exhausted.
              </div>
            </div>

            {loadingContent ? (
              <div className="p-8 text-center text-slate-400">Loading Content Studio items...</div>
            ) : contentItems.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Content Items Registered</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Upload workout playlists, videos, and daily workout cards for the Content Studio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-slate-400">Order #{item.display_order}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {item.content_type}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Status: {item.status}</span>
                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1"
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
      </main>

      {/* CREATE TEMPLATE MODAL */}
      {isCreateTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Class Template</h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Code</label>
                <input
                  type="text"
                  value={templateForm.code}
                  onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                  placeholder="e.g. HIIT-45"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. High Intensity Tabata"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={templateForm.default_duration_minutes}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_duration_minutes: parseInt(e.target.value) || 45 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={templateForm.default_capacity}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_capacity: parseInt(e.target.value) || 20 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateTemplateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createTemplateMutation.mutate(templateForm)}
                disabled={!templateForm.code || !templateForm.name || createTemplateMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {createTemplateMutation.isPending ? 'Creating...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TRAINER MODAL */}
      {isAssignTrainerOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Assign Trainer to Occurrence</h3>
            <p className="text-xs text-slate-400">
              Session: <strong className="text-slate-200">{selectedOccurrence.template_name}</strong> on{' '}
              {selectedOccurrence.occurrence_date}
            </p>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Trainer Profile ID (UUID)</label>
                <input
                  type="text"
                  value={trainerProfileIdInput}
                  onChange={(e) => setTrainerProfileIdInput(e.target.value)}
                  placeholder="Paste Trainer Profile UUID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Role</label>
                <select
                  value={trainerRoleInput}
                  onChange={(e) => setTrainerRoleInput(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                >
                  <option value="LEAD">Lead Trainer</option>
                  <option value="ASSISTANT">Assistant Trainer</option>
                </select>
              </div>
            </div>

            {assignTrainerMutation.isError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                Eligibility error: {(assignTrainerMutation.error as any)?.response?.data?.error || 'Validation failed'}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsAssignTrainerOpen(false);
                  setSelectedOccurrence(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  assignTrainerMutation.mutate({
                    occurrenceId: selectedOccurrence.id,
                    trainerId: trainerProfileIdInput,
                    role: trainerRoleInput,
                  })
                }
                disabled={!trainerProfileIdInput || assignTrainerMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {assignTrainerMutation.isPending ? 'Verifying...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
