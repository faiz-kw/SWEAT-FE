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
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence } from '../../types/classes';
import { SecureWorkoutPlayer } from './SecureWorkoutPlayer';
import { formatOccurrenceDate, formatTime12h } from '@/utils/dateTimeUtils';
import { Button } from '@/components/ui/button';
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
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ClassAttendanceModal: React.FC<ClassAttendanceModalProps> = ({
  occurrence,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();

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
  const [rosterTab, setRosterTab] = React.useState<'ALL' | 'MEMBER' | 'TRIAL' | 'WAITLIST'>('ALL');

  const { data: classVideoData } = useQuery({
    queryKey: ['class-occurrence-video-stream', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getTrainerClassVideo(occurrence.id) : null),
    enabled: isOpen && !!occurrence?.id,
  });

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
    const raw = classVideoData?.targeted_muscles;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.flatMap((m: any) => (typeof m === 'string' ? m.split(',').map((s) => s.trim()) : [String(m)])).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [classVideoData?.targeted_muscles]);

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
                  Session Details & Roster
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
                <Badge variant="outline" className="text-3xs font-mono bg-muted/60 text-muted-foreground border-border">
                  Geofence: {occurrence?.branch_geofence_radius_meters || 200}m ({occurrence?.branch_geofence_enforcement || 'STRICT'})
                </Badge>
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
                    const trainersList = occurrence?.trainers || occurrence?.assigned_trainers || [];
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
                            {t.trainer_code && (
                              <Badge variant="outline" className="text-[10px] font-mono bg-background text-foreground/80 border-border">
                                {t.trainer_code}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30">
                              {t.trainer_role || 'LEAD'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Trainer Live Check-in Status Badge */}
              <div className="flex items-center gap-2">
                {occurrence?.trainer_checked_in || occurrence?.trainer_check_in_details?.checked_in ? (
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
              {classVideoData?.instructions && (
                <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground">Trainer Instructions: </span>
                  {classVideoData.instructions}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Class Workout Video Stream Banner */}
          {classVideoData?.embed_player_url && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Film className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>Class Workout Video</span>
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
                        In-App Stream Ready
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Watch the complete exercise session video with instructions
                    </p>
                  </div>
                </div>
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
              </div>

              {showVideoPlayer && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <SecureWorkoutPlayer embedUrl={classVideoData.embed_player_url} title={occurrence?.template_name || "Class Workout Stream"} />
                  <p className="text-[10px] text-muted-foreground text-center">
                    🔒 Streamed directly inside website in privacy mode. External YouTube redirection and downloads are disabled.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Member Bookings & Session Roster */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>Enrolled Member Roster ({bookings.length} Booked)</span>
              </h4>
              <div className="text-2xs text-muted-foreground flex items-center gap-2">
                <span>Total Bookings: <strong className="text-foreground">{bookings.length}</strong></span>
                <span>•</span>
                <span>Capacity: <strong className="text-foreground">{occurrence?.capacity || occurrence?.capacity_override || 0}</strong></span>
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
                            <span className="text-2xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                              {booking.package_name}
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
                            <span className="font-mono font-medium text-foreground/80 bg-muted/60 px-1 rounded">
                              {displayMemberNumber}
                            </span>
                          )}
                          {displayEmail && <span>{displayEmail}</span>}
                          {displayPhone && (
                            <>
                              <span>•</span>
                              <span>{displayPhone}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Ref: {booking.booking_number || booking.id.slice(0, 8)}</span>
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

        <DialogFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
          <div className="text-2xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-primary" />
            <span>Attendance directly updates member check-in history and completed credits.</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
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
    </Dialog>
  );
};
