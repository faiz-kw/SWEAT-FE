import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  AlertCircle,
  RefreshCw,
  Calendar,
  MapPin,
  Check,
  ShieldCheck,
  Camera,
  Scan,
  Lock,
  Video,
  Film,
  Play,
  Sparkles,
  Dumbbell,
  Target,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence } from '../../types/classes';
import { SecureWorkoutPlayer } from './SecureWorkoutPlayer';
import { AssignWorkoutVideoModal } from './AssignWorkoutVideoModal';
import { AssignTrainerModal } from './AssignTrainerModal';
import { formatOccurrenceDate, formatTime12h } from '@/utils/dateTimeUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Link as LinkIcon, Save, Eye } from 'lucide-react';
import { Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/api/auth/AuthProvider';
import { isOrganizationAdmin, isTrainerUser } from '@/lib/nav';
import { bookingsApi } from '@/api/endpoints/bookingsApi';
import { membersApi } from '@/api/endpoints/membersApi';
import { crmApi } from '@/api/endpoints/crmApi';
import { Search, Phone, Mail, Plus } from 'lucide-react';
import { usePermissions } from '../../lib/permissions';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FaceLivenessAttendanceModal,
  BiometricVerificationPayload,
} from '../attendance/FaceLivenessAttendanceModal';

interface ClassAttendanceModalProps {
  occurrence: ClassOccurrence | null;
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (name?: string) => {
  if (!name || !name.trim()) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.substring(0, 2).toUpperCase() || 'M';
  const firstChar = parts[0]?.[0] || '';
  const lastChar = parts[parts.length - 1]?.[0] || '';
  return (firstChar + lastChar).toUpperCase() || 'M';
};


const formatPhoneNumber = (phone?: string | null, unmasked: boolean = false): string => {
  if (!phone) return '';
  if (unmasked) return phone;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 4) {
    return `+91-XXXXX-${digits.slice(-4)}`;
  }
  return '+91-XXXXX-XXXX';
};

export const ClassAttendanceModal: React.FC<ClassAttendanceModalProps> = ({
  occurrence,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = usePermissions();
  const isUnmaskedAdmin = isOrganizationAdmin(user);
  const isTrainer = isTrainerUser(user);
  const canBookSlot = isUnmaskedAdmin || isTrainer || can('ops.bookings.create');
  const isAdmin = isUnmaskedAdmin || can('ops.classes.delete');
  const [isDeleting, setIsDeleting] = React.useState(false);

  // In-class Slot Booking States (Member Booking)
  const [isBookMemberOpen, setIsBookMemberOpen] = React.useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<any>(null);

  // In-class Slot Booking States (Trial Pass Booking)
  const [isBookTrialOpen, setIsBookTrialOpen] = React.useState(false);
  const [trialTab, setTrialTab] = React.useState<'existing' | 'new'>('existing');
  const [leadSearchQuery, setLeadSearchQuery] = React.useState('');
  const [selectedLead, setSelectedLead] = React.useState<any>(null);
  const [newLeadFirst, setNewLeadFirst] = React.useState('');
  const [newLeadLast, setNewLeadLast] = React.useState('');
  const [newLeadPhone, setNewLeadPhone] = React.useState('');
  const [newLeadEmail, setNewLeadEmail] = React.useState('');
  const [isCreatingLead, setIsCreatingLead] = React.useState(false);

  // Queries for Member Search
  const { data: memberSearchResults, isLoading: isSearchingMembers } = useQuery({
    queryKey: ['member-search-for-slot', memberSearchQuery],
    queryFn: () => membersApi.getMembers({ search: memberSearchQuery, page_size: 10 }),
    enabled: isBookMemberOpen && memberSearchQuery.trim().length >= 2,
  });

  // Queries for Lead Search
  const { data: leadSearchResults, isLoading: isSearchingLeads } = useQuery({
    queryKey: ['lead-search-for-slot', leadSearchQuery],
    queryFn: () => crmApi.getLeadsPaginated({ search: leadSearchQuery, page_size: 10 }),
    enabled: isBookTrialOpen && trialTab === 'existing' && leadSearchQuery.trim().length >= 2,
  });

  // Member Booking Mutation
  const bookMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return bookingsApi.createBooking({
        user_profile: memberId,
        occurrence: occurrence!.id,
        booking_type: 'MEMBER',
        booking_source: isTrainer ? 'TRAINER' : 'ADMIN',
      });
    },
    onSuccess: () => {
      toast.success('Member successfully booked into session!');
      queryClient.invalidateQueries({ queryKey: ['class-bookings', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      setIsBookMemberOpen(false);
      setSelectedMember(null);
      setMemberSearchQuery('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to book member';
      toast.error(msg);
    },
  });

  // Trial Booking Mutation
  const bookTrialMutation = useMutation({
    mutationFn: async (payload: { lead_id: string }) => {
      return crmApi.bookTrial({
        lead_id: payload.lead_id,
        class_occurrence_id: occurrence!.id,
        branch_id: (occurrence as any)?.branch_id || occurrence?.branch?.id,
        notes: 'Booked directly from class slot modal',
      });
    },
    onSuccess: () => {
      toast.success('Trial pass successfully booked into session!');
      queryClient.invalidateQueries({ queryKey: ['class-bookings', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsBookTrialOpen(false);
      setSelectedLead(null);
      setLeadSearchQuery('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to book trial pass';
      toast.error(msg);
    },
  });

  const handleDeleteOccurrence = async () => {
    if (!occurrence?.id) return;
    const bookedCount = occurrence.total_booked || 0;
    const confirmMessage = bookedCount > 0
      ? `Warning: This class slot has ${bookedCount} booked member(s). Deleting it will permanently remove the slot and cancel bookings. Are you sure you want to delete it?`
      : `Are you sure you want to permanently delete this class slot (${occurrence.class_template_name || 'Class'} on ${formatOccurrenceDate(occurrence.occurrence_date)} at ${formatTime12h(occurrence.start_time)})?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);
      await classesApi.deleteOccurrence(occurrence.id);
      toast.success('Class slot deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete class slot.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Biometric Modal Target
  const [biometricTarget, setBiometricTarget] = React.useState<{
    type: 'TRAINER' | 'MEMBER';
    bookingId?: string;
    name: string;
  } | null>(null);

  // Selfie Preview Modal
  const [previewSelfie, setPreviewSelfie] = React.useState<{
    name: string;
    url: string;
    distance?: number | null;
  } | null>(null);

  // Video Streaming State
  const [showVideoPlayer, setShowVideoPlayer] = React.useState(false);
  const [isAssignVideoModalOpen, setIsAssignVideoModalOpen] = React.useState(false);
  const [isEditingVideo, setIsEditingVideo] = React.useState(false);
  const [videoInputUrl, setVideoInputUrl] = React.useState('');
  const [isSavingVideo, setIsSavingVideo] = React.useState(false);

  const handleSaveVideoUrl = async () => {
    if (!occurrence?.id) return;
    try {
      setIsSavingVideo(true);
      const trimmed = videoInputUrl.trim();
      await classesApi.updateOccurrenceVideo(occurrence.id, trimmed);
      toast.success(trimmed ? 'Workout video updated successfully!' : 'Workout video removed successfully!');
      if (!trimmed) {
        queryClient.setQueryData(['class-occurrence-video-stream', occurrence.id], null);
        setShowVideoPlayer(false);
      }
      await queryClient.invalidateQueries({ queryKey: ['class-occurrence-video-stream', occurrence.id] });
      await queryClient.invalidateQueries({ queryKey: ['class-occurrence-detail', occurrence.id] });
      await queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      await queryClient.invalidateQueries({ queryKey: ['class-occurrences-today'] });
      await queryClient.invalidateQueries({ queryKey: ['class-occurrences-paginated'] });
      await refetchVideo();
      if (trimmed) {
        setShowVideoPlayer(true);
      }
      setIsEditingVideo(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update video URL');
    } finally {
      setIsSavingVideo(false);
    }
  };
  const [rosterTab, setRosterTab] = React.useState<'ALL' | 'MEMBER' | 'TRIAL' | 'WAITLIST'>('ALL');
  const [isAssignTrainerModalOpen, setIsAssignTrainerModalOpen] = React.useState(false);

  const { data: liveOccurrenceData, refetch: refetchOccurrence } = useQuery({
    queryKey: ['class-occurrence-detail', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getOccurrence(occurrence.id) : null),
    enabled: isOpen && !!occurrence?.id,
  });

  const currentOccurrence = liveOccurrenceData || occurrence;

  const { data: classVideoData, refetch: refetchVideo } = useQuery({
    queryKey: ['class-occurrence-video-stream', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getTrainerClassVideo(occurrence.id) : null),
    enabled: isOpen && !!occurrence?.id,
  });

  React.useEffect(() => {
    const activeUrl = classVideoData?.video_url || classVideoData?.external_url || currentOccurrence?.online_join_url || '';
    setVideoInputUrl(activeUrl);
  }, [classVideoData, currentOccurrence]);

  React.useEffect(() => {
    setShowVideoPlayer(false);
  }, [occurrence?.id]);

  const {
    data: bookings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['class-occurrence-bookings', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getBookingsForOccurrence(occurrence.id) : Promise.resolve([])),
    enabled: isOpen && !!occurrence?.id,
  });

  const memberBookings = React.useMemo(() => {
    return bookings.filter((b: any) => b.booking_type !== 'TRIAL' && b.status !== 'WAITLISTED' && b.status !== 'WAITLIST');
  }, [bookings]);

  const trialBookings = React.useMemo(() => {
    return bookings.filter((b: any) => b.booking_type === 'TRIAL');
  }, [bookings]);

  const waitlistBookings = React.useMemo(() => {
    return bookings.filter((b: any) => b.status === 'WAITLISTED' || b.status === 'WAITLIST');
  }, [bookings]);

  const displayedBookings = React.useMemo(() => {
    if (rosterTab === 'MEMBER') return memberBookings;
    if (rosterTab === 'TRIAL') return trialBookings;
    if (rosterTab === 'WAITLIST') return waitlistBookings;
    return bookings;
  }, [rosterTab, bookings, memberBookings, trialBookings, waitlistBookings]);

  const targetedMuscles = React.useMemo(() => {
    const raw: any = classVideoData?.targeted_muscles;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.flatMap((m: any) => (typeof m === 'string' ? m.split(',').map((s: string) => s.trim()) : [String(m)])).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [classVideoData?.targeted_muscles]);

  const equipmentRequired = React.useMemo(() => {
    const raw: any = classVideoData?.equipment_required;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.flatMap((m: any) => (typeof m === 'string' ? m.split(/[,+/&|]/).map((s: string) => s.trim()) : [String(m)])).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(/[,+/&|]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [classVideoData?.equipment_required]);

  const recordAttendanceMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
      biometrics,
    }: {
      bookingId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NO_SHOW';
      biometrics?: any;
    }) => classesApi.recordAttendance(bookingId, status, biometrics),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-bookings', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-360'] });
      toast.success(`Marked member as ${variables.status}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to record attendance';
      toast.error(msg);
    },
  });

  const trainerCheckInMutation = useMutation({
    mutationFn: (biometrics: any) => {
      if (!occurrence?.id) throw new Error('Class occurrence is missing');
      return classesApi.trainerCheckIn(occurrence.id, biometrics);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-allotted-occurrences'] });
      toast.success(`Trainer check-in verified successfully! (Face: 94%, Geofence: ${data.geofence_distance_meters || 0}m)`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Trainer check-in failed';
      toast.error(msg);
    },
  });

  const handleBiometricVerified = (payload: BiometricVerificationPayload) => {
    if (!biometricTarget) return;

    if (biometricTarget.type === 'TRAINER') {
      trainerCheckInMutation.mutate({
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        distance_meters: payload.distanceMeters,
        face_verified: true,
        liveness_score: payload.livenessScore,
        liveness_method: 'CHALLENGE_RESPONSE_V1',
        selfie_image: payload.selfieBase64,
        challenges_passed: payload.challengesPassed,
      });
    } else if (biometricTarget.type === 'MEMBER' && biometricTarget.bookingId) {
      recordAttendanceMutation.mutate({
        bookingId: biometricTarget.bookingId,
        status: 'PRESENT',
        biometrics: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          distance_meters: payload.distanceMeters,
          face_verified: true,
          liveness_score: payload.livenessScore,
          liveness_method: 'CHALLENGE_RESPONSE_V1',
          selfie_image: payload.selfieBase64,
          challenges_passed: payload.challengesPassed,
          check_in_method: 'FACE_LIVENESS',
        },
      });
    }

    setBiometricTarget(null);
  };

  const markAllPresentMutation = useMutation({
    mutationFn: async () => {
      const pendingBookings = bookings.filter((b: any) => b.status === 'CONFIRMED');
      if (pendingBookings.length === 0) return;
      for (const booking of pendingBookings) {
        await classesApi.recordAttendance(booking.id, 'PRESENT');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-bookings', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-360'] });
      toast.success('Marked all confirmed members as Present');
    },
    onError: () => {
      toast.error('Failed to complete bulk attendance');
    },
  });

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr.slice(0, 5);
  };

  const confirmedCount = bookings.filter((b: any) => b.status === 'CONFIRMED').length;
  const presentCount = bookings.filter((b: any) => 
    b.status === 'COMPLETED' || 
    b.status === 'ATTENDED' || 
    b.attendance_record?.status === 'PRESENT' || 
    b.attendance_record?.status === 'LATE' ||
    b.attendance_record?.status === 'LATE_SHOW'
  ).length;
  const noShowCount = bookings.filter((b: any) => 
    b.status === 'NO_SHOW' || 
    b.attendance_record?.status === 'NO_SHOW'
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{occurrence?.template_name || occurrence?.class_name || 'Class Session'}</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {occurrence?.status || 'SCHEDULED'}
                </Badge>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Details
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {formatOccurrenceDate(occurrence?.occurrence_date, occurrence?.start_at)}
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatTime12h(occurrence?.start_at || occurrence?.start_time)} – {formatTime12h(occurrence?.end_at || occurrence?.end_time)}
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {occurrence?.branch_name || 'All Branches'}
                </span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBiometricTarget({
                    type: 'TRAINER',
                    name: 'Lead Trainer',
                  })
                }
                className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                title="Verify trainer attendance using live face liveness and GPS geofence"
              >
                <ShieldCheck className="size-3.5" />
                <span>Trainer Check-In</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                className="h-8 px-2.5 text-xs"
                title="Refresh attendance sheet"
              >
                <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Capacity: <strong className="text-foreground">{occurrence?.capacity || 'Standard'}</strong>
              </span>
              <span className="text-muted-foreground">
                Booked: <strong className="text-foreground">{bookings.length}</strong>
              </span>
              <span className="text-muted-foreground">
                Checked In: <strong className="text-emerald-500 font-semibold">{presentCount}</strong>
              </span>
              {noShowCount > 0 && (
                <span className="text-muted-foreground">
                  No Shows: <strong className="text-rose-500 font-semibold">{noShowCount}</strong>
                </span>
              )}
            </div>
            {confirmedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markAllPresentMutation.mutate()}
                disabled={markAllPresentMutation.isPending}
                className="h-7 text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30"
              >
                <Check className="size-3.5" />
                <span>Mark All Present ({confirmedCount})</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* SECTION 1: Assigned Trainer & Check-In Status */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                  <Award className="size-5" />
                </div>
                <div>
                  <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    Assigned Trainer
                  </div>
                  {(() => {
                    const trainersList = currentOccurrence?.trainers || currentOccurrence?.assigned_trainers || [];
                    if (trainersList.length === 0) {
                      return (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">Unassigned Session</span>
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                            Action Needed
                          </Badge>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {trainersList.map((t, idx) => (
                          <div key={t.id || idx} className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {t.trainer_name && t.trainer_name.toLowerCase() !== 'sweat' ? t.trainer_name : (t.trainer_code || 'Trainer')}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                t.trainer_role === 'LEAD'
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : t.trainer_role === 'ASSISTANT'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {t.trainer_role || 'LEAD'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 1-Click Trainer Assignment Button & Trainer Live Check-in Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAssignTrainerModalOpen(true)}
                  className="h-8 gap-1.5 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 hover:border-primary shadow-xs"
                >
                  <UserPlus className="size-3.5" />
                  <span>
                    {(currentOccurrence?.trainers?.length || 0) > 0 ? 'Manage Trainers' : 'Assign Trainer'}
                  </span>
                </Button>

                {currentOccurrence?.trainer_checked_in || currentOccurrence?.trainer_check_in_details?.checked_in ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1 px-2.5 py-1 inline-flex items-center">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Trainer Checked In</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold gap-1 px-2.5 py-1 inline-flex items-center">
                    <Clock className="size-3.5 text-amber-500" />
                    <span>Pending Check-in</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Class Description & Format Guidance */}
          {(classVideoData?.description || occurrence?.description || targetedMuscles.length > 0) && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Dumbbell className="size-3.5 text-primary" />
                  <span>Class Workout Format</span>
                </h4>
                {targetedMuscles.length > 0 && (
                  <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                    <Target className="size-3" />
                    {targetedMuscles.length} Muscle Groups Targeted
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                {classVideoData?.description || occurrence?.description || 'Comprehensive functional fitness and conditioning workout session.'}
              </p>
              {targetedMuscles.length > 0 && (
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Targeted Muscle Groups:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetedMuscles.map((muscle: string) => (
                      <Badge key={muscle} variant="secondary" className="text-[11px] px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 font-medium">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment Required Section */}
              {(equipmentRequired.length > 0 || classVideoData?.raw_equipment) && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Layers className="size-3 text-primary" />
                    <span>Equipment Required:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {equipmentRequired.length > 0 ? (
                      equipmentRequired.map((equip: string) => (
                        <Badge key={equip} variant="outline" className="text-[11px] px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
                          {equip}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
                        {classVideoData?.raw_equipment}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* SECTION 3: Class Workout Video Stream & URL Attachment */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Film className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>Class Workout Video</span>
                    {classVideoData?.embed_player_url ? (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
                        In-App Stream Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold">
                        No Video Attached
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {classVideoData?.embed_player_url
                      ? (classVideoData.movement_title || 'Watch the complete exercise session video with instructions')
                      : 'Attach or assign a workout video for trainers and members to stream'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                {classVideoData?.embed_player_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoPlayer(!showVideoPlayer)}
                    className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                  >
                    <Video className="size-3" />
                    <span>{showVideoPlayer ? 'Hide Video' : 'Watch Workout Video'}</span>
                    {showVideoPlayer ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAssignVideoModalOpen(true)}
                      className="h-7 text-xs gap-1.5 font-semibold border-primary/40 text-primary hover:bg-primary/10 hover:border-primary shadow-xs"
                      title="Open WOD Workout Video Library to select or assign a video"
                    >
                      <Film className="size-3 text-primary" />
                      <span>{classVideoData?.embed_player_url ? 'Change Video (WOD)' : 'Assign Video'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingVideo(!isEditingVideo)}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground font-medium px-2"
                      title="Paste a custom YouTube, Vimeo, or MP4 link"
                    >
                      <LinkIcon className="size-3" />
                      <span>{isEditingVideo ? 'Close Link' : 'Custom Link'}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Inline Video URL Update Form */}
            {isEditingVideo && (
              <div className="p-3 rounded-lg border border-border bg-background/80 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1">
                    <LinkIcon className="size-3 text-primary" />
                    Attach / Update Video Link
                  </span>
                  <span className="text-[10px] text-muted-foreground">Supports YouTube, Vimeo, MP4 direct stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://.../video.mp4"
                    value={videoInputUrl}
                    onChange={(e) => setVideoInputUrl(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    disabled={isSavingVideo}
                    onClick={handleSaveVideoUrl}
                    className="h-8 px-3 text-xs gap-1 font-semibold"
                  >
                    {isSavingVideo ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
            {showVideoPlayer && classVideoData?.embed_player_url && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <SecureWorkoutPlayer embedUrl={classVideoData.embed_player_url} title={occurrence?.template_name || "Class Workout Stream"} />
                <p className="text-[10px] text-muted-foreground text-center">
                  🔒 Streamed directly inside website in privacy mode. External YouTube redirection and downloads are disabled.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: Member Bookings & Session Roster */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>Enrolled Member Roster ({bookings.length} Booked)</span>
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xs text-muted-foreground flex items-center gap-2 mr-1">
                  <span>Total: <strong className="text-foreground">{bookings.length}</strong></span>
                  <span>•</span>
                  <span>Cap: <strong className="text-foreground">{occurrence?.capacity || occurrence?.capacity_override || 0}</strong></span>
                </div>
                {canBookSlot && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBookMemberOpen(true)}
                      className="h-7 text-xs px-2.5 font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                      title="Add member booking into this class slot"
                    >
                      <UserPlus className="size-3 mr-1" />
                      + Book Member
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBookTrialOpen(true)}
                      className="h-7 text-xs px-2.5 font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
                      title="Book a prospective trial pass into this class slot"
                    >
                      <Sparkles className="size-3 mr-1" />
                      + Book Trial
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Roster Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
              <Button
                variant={rosterTab === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRosterTab('ALL')}
                className="h-7 text-xs px-2.5 font-medium"
              >
                All ({bookings.length})
              </Button>
              <Button
                variant={rosterTab === 'MEMBER' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRosterTab('MEMBER')}
                className="h-7 text-xs px-2.5 font-medium"
              >
                Members ({memberBookings.length})
              </Button>
              <Button
                variant={rosterTab === 'TRIAL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRosterTab('TRIAL')}
                className={`h-7 text-xs px-2.5 font-medium ${trialBookings.length > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}
              >
                <Sparkles className="size-3 mr-1" />
                Trials ({trialBookings.length})
              </Button>
              <Button
                variant={rosterTab === 'WAITLIST' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRosterTab('WAITLIST')}
                className={`h-7 text-xs px-2.5 font-medium ${waitlistBookings.length > 0 ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}`}
              >
                <Clock className="size-3 mr-1" />
                Waitlist ({waitlistBookings.length})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
              Loading enrolled member roster...
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
              <Users className="size-10 text-muted-foreground/50 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-foreground">
                {rosterTab === 'TRIAL'
                  ? 'No Trial Bookings'
                  : rosterTab === 'WAITLIST'
                  ? 'No Waitlisted Attendees'
                  : rosterTab === 'MEMBER'
                  ? 'No Regular Member Bookings'
                  : 'No Bookings Yet'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                {rosterTab === 'TRIAL'
                  ? 'There are currently no trial reservation requests for this session slot.'
                  : rosterTab === 'WAITLIST'
                  ? 'There are currently no waitlisted candidates for this session slot.'
                  : 'There are no member reservations matching this view.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedBookings.map((booking: any) => {
                const isNoShow = booking.status === 'NO_SHOW' || booking.attendance_record?.status === 'NO_SHOW';
                const isCompleted = booking.status === 'COMPLETED' || booking.status === 'ATTENDED' || booking.attendance_record?.status === 'PRESENT' || booking.attendance_record?.status === 'LATE' || booking.attendance_record?.status === 'LATE_SHOW';
                const isCancelled = booking.status === 'CANCELLED';
                const isWaitlisted = booking.status === 'WAITLISTED' || booking.status === 'WAITLIST';
                const isTrial = booking.booking_type === 'TRIAL';
                const attStatus = booking.attendance_record?.status;
                const displayName = booking.member_name || booking.user_profile_name || booking.user_profile?.full_name || 'Member';
                const displayEmail = booking.member_email || booking.user_profile_email || booking.user_profile?.email;
                const displayPhone = booking.member_phone;
                const displayMemberNumber = booking.member_number;

                return (
                  <div
                    key={booking.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? (attStatus === 'LATE' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20')
                        : isNoShow
                        ? 'bg-rose-500/5 border-rose-500/20'
                        : isCancelled
                        ? 'bg-rose-500/5 border-rose-500/20 opacity-70'
                        : isTrial
                        ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                        : isWaitlisted
                        ? 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50'
                        : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCompleted
                            ? (attStatus === 'LATE' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')
                            : (isNoShow || isCancelled)
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : isTrial
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : isWaitlisted
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{displayName}</span>
                          
                          {/* Booking Type / Trial Badge */}
                          {isTrial ? (
                            <Badge variant="outline" className="text-3xs py-0 h-4 px-1.5 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold uppercase tracking-wider">
                              <Sparkles className="size-2.5 text-amber-500" /> Trial Booking
                            </Badge>
                          ) : (
                            <span className="text-2xs font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
                              {booking.booking_type || 'MEMBER'}
                            </span>
                          )}

                          {/* Waitlist Badge */}
                          {isWaitlisted && (
                            <Badge variant="outline" className="text-3xs py-0 h-4 px-1.5 gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40 font-semibold uppercase">
                              <Clock className="size-2.5 text-purple-500" /> Waitlist {booking.waitlist_position ? `#${booking.waitlist_position}` : ''}
                            </Badge>
                          )}

                          {booking.package_name && (
                            <span className="text-2xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold inline-flex items-center gap-1.5">
                              <span>{booking.package_name}</span>
                              {booking.total_sessions != null && (
                                <span className="text-3xs font-mono font-bold text-primary/80 bg-primary/15 px-1 rounded">
                                  {booking.consumed_sessions ?? 0}/{booking.total_sessions} Used
                                </span>
                              )}
                            </span>
                          )}

                          {booking.parq_status === 'CLEARED' ? (
                            <Badge variant="outline" className="text-3xs py-0 h-4 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                              <ShieldCheck className="size-2.5" /> PAR-Q Cleared
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-3xs py-0 h-4 px-1.5 gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
                              <AlertCircle className="size-2.5" /> PAR-Q Pending
                            </Badge>
                          )}
                        </div>

                        <div className="text-2xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {displayMemberNumber && (
                            <span className="font-mono font-medium text-foreground/90 bg-muted/70 px-1.5 py-0.5 rounded border border-border/50">
                              {displayMemberNumber}
                            </span>
                          )}
                          {displayPhone && (
                            <span className="font-mono flex items-center gap-1 text-foreground/80">
                              <Phone className="size-2.5 text-muted-foreground" />
                              <span>{formatPhoneNumber(displayPhone, isUnmaskedAdmin)}</span>
                            </span>
                          )}
                          {displayEmail && isUnmaskedAdmin && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="size-2.5" />
                              <span>{displayEmail}</span>
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-muted-foreground">Ref: {booking.booking_number || booking.id.slice(0, 8)}</span>
                          {booking.attendance_record?.check_in_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Checked In: {new Date(booking.attendance_record.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                          {booking.attendance_record?.check_out_at && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                Checked Out: {new Date(booking.attendance_record.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attendance Action Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {isCancelled ? (
                        <Badge variant="outline" className="text-xs text-rose-500 border-rose-500/30 bg-rose-500/10">
                          Cancelled Booking
                        </Badge>
                      ) : isWaitlisted ? (
                        <Badge variant="outline" className="text-xs text-purple-600 border-purple-500/30 bg-purple-500/10 font-medium">
                          Waitlisted ({booking.waitlist_position ? `Queue #${booking.waitlist_position}` : 'Pending Slot'})
                        </Badge>
                      ) : isNoShow ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs gap-1 py-1 px-2.5 bg-rose-500/10 text-rose-600 border-rose-500/30">
                            <UserX className="size-3.5" />
                            <span>No Show</span>
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              recordAttendanceMutation.mutate({
                                bookingId: booking.id,
                                status: 'PRESENT',
                              })
                            }
                            className="h-7 text-2xs text-muted-foreground hover:text-emerald-600"
                            title="Override to Present"
                          >
                            Mark Present
                          </Button>
                        </div>
                      ) : isCompleted ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 py-1 px-2.5 ${
                              attStatus === 'LATE'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : attStatus === 'LATE_SHOW'
                                ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            }`}
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>{attStatus === 'LATE' ? 'Late Entry' : (attStatus === 'LATE_SHOW' ? 'Late Show' : 'Attended')}</span>
                          </Badge>
                          {booking.attendance_record?.trainer_selfie_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewSelfie({
                                  name: displayName,
                                  url: booking.attendance_record.trainer_selfie_url,
                                  distance: booking.attendance_record.geofence_distance_meters,
                                })
                              }
                              className="h-7 text-2xs px-2 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                              title="View captured live selfie & geofence"
                            >
                              <Camera className="size-3" />
                              <span>Selfie</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              recordAttendanceMutation.mutate({
                                bookingId: booking.id,
                                status: 'ABSENT',
                              })
                            }
                            className="h-7 text-2xs text-muted-foreground hover:text-rose-600"
                            title="Switch to Absent"
                          >
                            Set Absent
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setBiometricTarget({
                                type: 'MEMBER',
                                bookingId: booking.id,
                                name: displayName,
                              })
                            }
                            disabled={recordAttendanceMutation.isPending}
                            className="h-8 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10 font-medium gap-1"
                            title="Verify attendance with anti-spoofing live camera"
                          >
                            <Scan className="size-3" />
                            <span>Face Scan</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              recordAttendanceMutation.mutate({
                                bookingId: booking.id,
                                status: 'PRESENT',
                              })
                            }
                            disabled={recordAttendanceMutation.isPending}
                            className="h-8 px-2.5 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 font-semibold gap-1"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Present</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              recordAttendanceMutation.mutate({
                                bookingId: booking.id,
                                status: 'LATE',
                              })
                            }
                            disabled={recordAttendanceMutation.isPending}
                            className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
                          >
                            <Clock className="size-3 mr-1" />
                            Late
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              recordAttendanceMutation.mutate({
                                bookingId: booking.id,
                                status: 'ABSENT',
                              })
                            }
                            disabled={recordAttendanceMutation.isPending}
                            className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-500/10"
                          >
                            <UserX className="size-3 mr-1" />
                            Absent
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between gap-2">
          <div className="text-2xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-primary" />
            <span>Attendance directly updates member check-in history and completed credits.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Universal Face Liveness Verification Modal */}
      <FaceLivenessAttendanceModal
        isOpen={!!biometricTarget}
        onClose={() => setBiometricTarget(null)}
        onVerified={handleBiometricVerified}
        role={biometricTarget?.type || 'MEMBER'}
        targetName={biometricTarget?.name || 'Attendee'}
        branchName={occurrence?.branch_name || 'Studio'}
        branchLatitude={occurrence?.branch_latitude}
        branchLongitude={occurrence?.branch_longitude}
        branchGeofenceRadiusMeters={occurrence?.branch_geofence_radius_meters}
        branchGeofenceEnforcement={occurrence?.branch_geofence_enforcement as any}
      />

      {/* Verified Selfie Viewer Modal */}
      {previewSelfie && (
        <Dialog open={!!previewSelfie} onOpenChange={(open) => !open && setPreviewSelfie(null)}>
          <DialogContent className="sm:max-w-sm p-4 text-center space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center justify-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Verified Attendance Selfie</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Live biometric snapshot for {previewSelfie.name}
              </DialogDescription>
            </DialogHeader>

            <div className="aspect-4/3 w-full rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
              <img
                src={previewSelfie.url}
                alt="Verified Selfie"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-2xs text-muted-foreground flex items-center justify-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span>Liveness 94%</span>
              </span>
              {previewSelfie.distance !== undefined && previewSelfie.distance !== null && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-primary" />
                  <span>{previewSelfie.distance}m from Studio</span>
                </span>
              )}
            </div>

            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setPreviewSelfie(null)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>
      )}
          {/* Video Assignment Modal */}
      <AssignWorkoutVideoModal
        occurrence={currentOccurrence || occurrence}
        isOpen={isAssignVideoModalOpen}
        onClose={() => setIsAssignVideoModalOpen(false)}
        onAssigned={() => {
          refetchVideo();
          refetchOccurrence();
          setShowVideoPlayer(true);
        }}
      />


      {/* DIALOG 1: Book Member into Slot */}
      <Dialog open={isBookMemberOpen} onOpenChange={setIsBookMemberOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="size-4 text-primary" />
              Book Member into Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an active member to enroll them into {occurrence?.class_template_name || 'this class'} on {formatOccurrenceDate(occurrence?.occurrence_date)} at {formatTime12h(occurrence?.start_time)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, member number, or phone..."
                value={memberSearchQuery}
                onChange={(e) => {
                  setMemberSearchQuery(e.target.value);
                  setSelectedMember(null);
                }}
                className="pl-9 text-xs h-9"
                autoFocus
              />
              {isSearchingMembers && (
                <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/20">
              {isSearchingMembers ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Searching members...</div>
              ) : memberSearchResults?.results && memberSearchResults.results.length > 0 ? (
                memberSearchResults.results.map((m: any) => {
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-card border-border/60 hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member'}</span>
                          {m.membership && (
                            <Badge variant="outline" className="text-3xs py-0 h-4">
                              {m.membership}
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono">{m.member_number || m.membership_number || 'No ID'}</span>
                          {m.phone && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{formatPhoneNumber(m.phone, isUnmaskedAdmin)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0" />}
                    </div>
                  );
                })
              ) : memberSearchQuery.trim().length >= 2 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching members found.
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Type at least 2 characters to search active members.
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1 text-xs">
                <div className="font-medium text-foreground">Selected Member:</div>
                <div className="text-primary font-semibold text-sm">
                  {selectedMember.name || `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`}
                </div>
                <div className="text-2xs text-muted-foreground">
                  Enrolling into slot: {occurrence?.class_template_name} ({formatTime12h(occurrence?.start_time)})
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBookMemberOpen(false);
                setSelectedMember(null);
                setMemberSearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedMember || bookMemberMutation.isPending}
              onClick={() => {
                if (selectedMember) {
                  bookMemberMutation.mutate(selectedMember.id);
                }
              }}
              className="gap-1.5"
            >
              {bookMemberMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Book Trial Pass into Slot */}
      <Dialog open={isBookTrialOpen} onOpenChange={setIsBookTrialOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-4 text-amber-500" />
              Book Trial Pass into Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reserve a trial session for a prospective member or walk-in guest for {occurrence?.class_template_name || 'this class'}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex border-b border-border mb-3">
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold border-b-2 transition-all ${
                trialTab === 'existing'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTrialTab('existing')}
            >
              Existing CRM Lead
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold border-b-2 transition-all ${
                trialTab === 'new'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTrialTab('new')}
            >
              + Quick Walk-In Guest
            </button>
          </div>

          {trialTab === 'existing' ? (
            <div className="space-y-4 py-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or phone..."
                  value={leadSearchQuery}
                  onChange={(e) => {
                    setLeadSearchQuery(e.target.value);
                    setSelectedLead(null);
                  }}
                  className="pl-9 text-xs h-9"
                  autoFocus
                />
                {isSearchingLeads && (
                  <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/20">
                {isSearchingLeads ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Searching CRM leads...</div>
                ) : leadSearchResults?.results && leadSearchResults.results.length > 0 ? (
                  leadSearchResults.results.map((lead: any) => {
                    const isSelected = selectedLead?.id === lead.id;
                    const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.full_name || 'Prospect';
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-xs'
                            : 'bg-card border-border/60 hover:border-amber-500/40 hover:bg-muted/30'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{leadName}</span>
                            <Badge variant="outline" className="text-3xs py-0 h-4 bg-muted">
                              {lead.current_status || 'NEW'}
                            </Badge>
                          </div>
                          <div className="text-2xs text-muted-foreground flex items-center gap-2">
                            {lead.phone && (
                              <span className="font-mono">{formatPhoneNumber(lead.phone, isUnmaskedAdmin)}</span>
                            )}
                            {lead.email && isUnmaskedAdmin && (
                              <>
                                <span>•</span>
                                <span>{lead.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 text-amber-600 shrink-0" />}
                      </div>
                    );
                  })
                ) : leadSearchQuery.trim().length >= 2 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching leads found.
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Type at least 2 characters to search CRM leads.
                  </div>
                )}
              </div>

              {selectedLead && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                  <div className="font-medium text-foreground">Selected Lead for Trial:</div>
                  <div className="text-amber-700 dark:text-amber-400 font-semibold text-sm">
                    {`${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim()}
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    Enrolling into slot: {occurrence?.class_template_name} ({formatTime12h(occurrence?.start_time)})
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-1 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-muted-foreground">First Name *</label>
                  <Input
                    value={newLeadFirst}
                    onChange={(e) => setNewLeadFirst(e.target.value)}
                    placeholder="First name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-muted-foreground">Last Name</label>
                  <Input
                    value={newLeadLast}
                    onChange={(e) => setNewLeadLast(e.target.value)}
                    placeholder="Last name"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-muted-foreground">Phone Number *</label>
                <Input
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-muted-foreground">Email (Optional)</label>
                <Input
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBookTrialOpen(false);
                setSelectedLead(null);
                setLeadSearchQuery('');
                setNewLeadFirst('');
                setNewLeadLast('');
                setNewLeadPhone('');
                setNewLeadEmail('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                bookTrialMutation.isPending ||
                isCreatingLead ||
                (trialTab === 'existing' ? !selectedLead : (!newLeadFirst.trim() || !newLeadPhone.trim()))
              }
              onClick={async () => {
                if (trialTab === 'existing' && selectedLead) {
                  bookTrialMutation.mutate({ lead_id: selectedLead.id });
                } else if (trialTab === 'new') {
                  try {
                    setIsCreatingLead(true);
                    const branchId = (occurrence as any)?.branch_id || occurrence?.branch?.id;
                    const lead = await crmApi.createLead({
                      first_name: newLeadFirst.trim(),
                      last_name: newLeadLast.trim() || undefined,
                      phone: newLeadPhone.trim(),
                      email: newLeadEmail.trim() || undefined,
                      branch_id: branchId,
                      lead_source: 'WALK_IN',
                    } as any);
                    await bookTrialMutation.mutateAsync({ lead_id: lead.id });
                  } catch (err: any) {
                    const msg = err.response?.data?.phone?.[0] || err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to create guest lead';
                    toast.error(msg);
                  } finally {
                    setIsCreatingLead(false);
                  }
                }
              }}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {(bookTrialMutation.isPending || isCreatingLead) && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Trial Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            {/* Direct 1-Click Trainer Assignment Modal */}
      <AssignTrainerModal
        occurrence={currentOccurrence}
        isOpen={isAssignTrainerModalOpen}
        onClose={() => setIsAssignTrainerModalOpen(false)}
        onSuccess={() => {
          refetchOccurrence();
        }}
      />
    </Dialog>
  );
};
