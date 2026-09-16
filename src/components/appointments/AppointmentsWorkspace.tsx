import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Award,
  Video,
  AlertCircle,
  Filter,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { appointmentsApi } from '../../services/appointmentsApi';
import {
  Appointment,
  AppointmentType,
  AppointmentDeliveryMode,
  AppointmentStatus,
} from '../../types/appointments';

export const AppointmentsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'appointments' | 'types'>('appointments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal states
  const [isAssignTrainerOpen, setIsAssignTrainerOpen] = useState(false);
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [trainerProfileIdInput, setTrainerProfileIdInput] = useState('');
  const [trainerRoleInput, setTrainerRoleInput] = useState<'LEAD' | 'ASSISTANT'>('LEAD');

  // New Service Type form state
  const [typeForm, setTypeForm] = useState<{
    code: string;
    name: string;
    description: string;
    default_duration_minutes: number;
    default_delivery_mode: AppointmentDeliveryMode;
    requires_trainer: boolean;
  }>({
    code: '',
    name: '',
    description: '',
    default_duration_minutes: 60,
    default_delivery_mode: 'OFFLINE',
    requires_trainer: true,
  });

  // Queries
  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => appointmentsApi.getAppointments({ date: selectedDate }),
  });

  const {
    data: appointmentTypes = [],
    isLoading: loadingTypes,
    refetch: refetchTypes,
  } = useQuery({
    queryKey: ['appointment-types'],
    queryFn: () => appointmentsApi.getAppointmentTypes(),
  });

  // Mutations
  const assignTrainerMutation = useMutation({
    mutationFn: ({ apptId, trainerId, role }: { apptId: string; trainerId: string; role: string }) =>
      appointmentsApi.assignTrainer(apptId, trainerId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsAssignTrainerOpen(false);
      setSelectedAppointment(null);
      setTrainerProfileIdInput('');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: ({ apptId, reason }: { apptId: string; reason?: string }) =>
      appointmentsApi.cancelAppointment(apptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const completeAppointmentMutation = useMutation({
    mutationFn: (apptId: string) => appointmentsApi.completeAppointment(apptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: (data: typeof typeForm) => appointmentsApi.createAppointmentType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-types'] });
      setIsCreateTypeOpen(false);
      setTypeForm({
        code: '',
        name: '',
        description: '',
        default_duration_minutes: 60,
        default_delivery_mode: 'OFFLINE',
        requires_trainer: true,
      });
    },
  });

  const filteredAppointments = appointments.filter((appt) => {
    const term = searchTerm.toLowerCase();
    const member = appt.member_name || '';
    const service = appt.appointment_type_name || '';
    const number = appt.member_number || '';
    return (
      member.toLowerCase().includes(term) ||
      service.toLowerCase().includes(term) ||
      number.toLowerCase().includes(term)
    );
  });

  const filteredTypes = appointmentTypes.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.code.toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                Layer 2 Module F
              </span>
              <span className="text-xs text-slate-400">Personal Training & Consultations</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Individual Appointments Workspace
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeTab === 'types' && (
              <button
                onClick={() => setIsCreateTypeOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Service Type</span>
                <span className="sm:hidden">Service</span>
              </button>
            )}
            <button
              onClick={() => {
                refetchAppointments();
                refetchTypes();
              }}
              className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'appointments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Individual Sessions ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'types'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Service Catalog ({appointmentTypes.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by member name, number or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400 hidden sm:block" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {loadingAppointments ? (
              <div className="p-8 text-center text-slate-400">Loading appointments from tenant database...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Appointments for {selectedDate}</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  No personal training or consultation sessions scheduled on this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {appt.delivery_mode}
                          </span>
                          <h3 className="text-base font-semibold text-white mt-2">
                            {appt.appointment_type_name || '1-on-1 Session'}
                          </h3>
                          <p className="text-xs text-slate-300 font-medium mt-0.5">
                            Member: {appt.member_name || 'Anonymous'} ({appt.member_number || 'No ID'})
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            appt.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : appt.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            {new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(appt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            Trainer:{' '}
                            {appt.assigned_trainers && appt.assigned_trainers.length > 0
                              ? appt.assigned_trainers.map((t) => t.trainer_name || t.trainer_code).join(', ')
                              : 'Unassigned'}
                          </span>
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-slate-400 mt-2 bg-slate-950 p-2 rounded border border-slate-800">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {appt.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAppointment(appt);
                              setIsAssignTrainerOpen(true);
                            }}
                            className="flex-1 py-1.5 px-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-center"
                          >
                            Assign Coach
                          </button>
                          <button
                            onClick={() => completeAppointmentMutation.mutate(appt.id)}
                            className="flex-1 py-1.5 px-2 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 rounded-lg transition-colors text-center"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => cancelAppointmentMutation.mutate({ apptId: appt.id, reason: 'Front desk cancellation' })}
                            className="py-1.5 px-2 text-xs font-medium bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors text-center"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SERVICE CATALOG */}
        {activeTab === 'types' && (
          <div className="space-y-4">
            {loadingTypes ? (
              <div className="p-8 text-center text-slate-400">Loading service types...</div>
            ) : filteredTypes.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Service Types Configured</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Create personal training, nutrition coaching, or assessment service catalog items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-400">{t.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {t.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-2">{t.name}</h3>
                      {t.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-500 block">Default Duration</span>
                          <span className="font-semibold text-slate-200">{t.default_duration_minutes} mins</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-slate-500 block">Delivery</span>
                          <span className="font-semibold text-slate-200">{t.default_delivery_mode}</span>
                        </div>
                      </div>

                      {t.specialty_requirements && t.specialty_requirements.length > 0 && (
                        <div className="mt-3 text-xs">
                          <span className="text-slate-500 block mb-1">Required Specialties:</span>
                          <div className="flex flex-wrap gap-1">
                            {t.specialty_requirements.map((req) => (
                              <span
                                key={req.id}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                              >
                                {req.specialty_name || req.specialty_code} ({req.minimum_proficiency_level})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE SERVICE TYPE MODAL */}
      {isCreateTypeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">New Appointment Service Type</h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Code</label>
                <input
                  type="text"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="e.g. PT-60"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Service Name</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="e.g. 1-on-1 Personal Training 60min"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Default Duration (minutes)</label>
                <input
                  type="number"
                  value={typeForm.default_duration_minutes}
                  onChange={(e) => setTypeForm({ ...typeForm, default_duration_minutes: parseInt(e.target.value) || 60 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateTypeOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createTypeMutation.mutate(typeForm)}
                disabled={!typeForm.code || !typeForm.name || createTypeMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {createTypeMutation.isPending ? 'Saving...' : 'Save Service Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TRAINER MODAL */}
      {isAssignTrainerOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Assign Trainer to Appointment</h3>
            <p className="text-xs text-slate-400">
              Service: <strong className="text-slate-200">{selectedAppointment.appointment_type_name}</strong> for{' '}
              <strong className="text-slate-200">{selectedAppointment.member_name}</strong>
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
                  <option value="ASSISTANT">Assistant Coach</option>
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
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  assignTrainerMutation.mutate({
                    apptId: selectedAppointment.id,
                    trainerId: trainerProfileIdInput,
                    role: trainerRoleInput,
                  })
                }
                disabled={!trainerProfileIdInput || assignTrainerMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {assignTrainerMutation.isPending ? 'Validating...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
