import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  RefreshCw,
  Award,
  UserCheck,
  Activity,
} from 'lucide-react';
import { appointmentsApi } from '../../services/appointmentsApi';
import {
  Appointment,
  AppointmentDeliveryMode,
} from '../../types/appointments';
import { PageHeader, PageBody } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Individual Appointments Workspace"
        subtitle="Personal Training, 1-on-1 Consultations & Assessments"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Layer 2 Module F
            </span>
            <span className="text-muted-foreground text-xs">
              Showing {appointments.length} appointments for {selectedDate}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'types' && (
              <Button
                size="sm"
                onClick={() => setIsCreateTypeOpen(true)}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>New Service Type</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchAppointments();
                refetchTypes();
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
        {/* Navigation Tabs - Responsive Scroll */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Individual Sessions ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'types'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Service Catalog ({appointmentTypes.length})
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by member name, number or service..."
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

            {loadingAppointments ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading appointments from tenant database...
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Activity className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Appointments for {selectedDate}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  No personal training or consultation sessions scheduled on this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {appt.delivery_mode}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-2">
                            {appt.appointment_type_name || '1-on-1 Session'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Member: <span className="font-semibold text-foreground">{appt.member_name || 'Anonymous'}</span> ({appt.member_number || 'No ID'})
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            appt.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : appt.status === 'COMPLETED'
                              ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(appt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Trainer:{' '}
                            {appt.assigned_trainers && appt.assigned_trainers.length > 0
                              ? appt.assigned_trainers.map((t) => t.trainer_name || t.trainer_code).join(', ')
                              : 'Unassigned'}
                          </span>
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/40 p-2 rounded-lg border border-border/60">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                      {appt.status === 'CONFIRMED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAppointment(appt);
                              setIsAssignTrainerOpen(true);
                            }}
                            className="flex-1 text-xs"
                          >
                            Assign Coach
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => completeAppointmentMutation.mutate(appt.id)}
                            className="flex-1 text-xs text-emerald-600 dark:text-emerald-400"
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelAppointmentMutation.mutate({ apptId: appt.id, reason: 'Front desk cancellation' })}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                          >
                            Cancel
                          </Button>
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
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading service types...
              </div>
            ) : filteredTypes.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Award className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Service Types Configured</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Create personal training, nutrition coaching, or assessment service catalog items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map((t) => (
                  <div
                    key={t.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary">{t.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          {t.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{t.name}</h3>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Default Duration</span>
                          <span className="font-semibold text-foreground">{t.default_duration_minutes} mins</span>
                        </div>
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Delivery</span>
                          <span className="font-semibold text-foreground">{t.default_delivery_mode}</span>
                        </div>
                      </div>

                      {t.specialty_requirements && t.specialty_requirements.length > 0 && (
                        <div className="mt-3 text-xs">
                          <span className="text-muted-foreground block mb-1 text-[11px]">Required Specialties:</span>
                          <div className="flex flex-wrap gap-1">
                            {t.specialty_requirements.map((req) => (
                              <span
                                key={req.id}
                                className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border text-[11px]"
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
      </PageBody>

      {/* CREATE SERVICE TYPE MODAL */}
      <Dialog open={isCreateTypeOpen} onOpenChange={setIsCreateTypeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Appointment Service Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Code</Label>
              <Input
                type="text"
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                placeholder="e.g. PT-60"
              />
            </div>
            <div>
              <Label className="mb-1 block">Service Name</Label>
              <Input
                type="text"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="e.g. 1-on-1 Personal Training 60min"
              />
            </div>
            <div>
              <Label className="mb-1 block">Default Duration (minutes)</Label>
              <Input
                type="number"
                value={typeForm.default_duration_minutes}
                onChange={(e) => setTypeForm({ ...typeForm, default_duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateTypeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTypeMutation.mutate(typeForm)}
              disabled={!typeForm.code || !typeForm.name || createTypeMutation.isPending}
            >
              {createTypeMutation.isPending ? 'Saving...' : 'Save Service Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TRAINER MODAL */}
      <Dialog open={isAssignTrainerOpen && !!selectedAppointment} onOpenChange={setIsAssignTrainerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Trainer to Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Service: <strong className="text-foreground">{selectedAppointment.appointment_type_name}</strong> for{' '}
                <strong className="text-foreground">{selectedAppointment.member_name}</strong>
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
                  <option value="ASSISTANT">Assistant Coach</option>
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
                setSelectedAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedAppointment &&
                assignTrainerMutation.mutate({
                  apptId: selectedAppointment.id,
                  trainerId: trainerProfileIdInput,
                  role: trainerRoleInput,
                })
              }
              disabled={!trainerProfileIdInput || assignTrainerMutation.isPending}
            >
              {assignTrainerMutation.isPending ? 'Validating...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
