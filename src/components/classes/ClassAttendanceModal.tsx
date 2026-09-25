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
} from 'lucide-react';
import { toast } from 'sonner';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence } from '../../types/classes';
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
  const presentCount = bookings.filter((b: any) => b.status === 'COMPLETED' || b.attendance_record?.status === 'PRESENT').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{occurrence?.template_name || occurrence?.class_name || 'Class Session'}</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {occurrence?.status || 'SCHEDULED'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {occurrence?.occurrence_date}
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatTime(occurrence?.start_at || occurrence?.start_time)} - {formatTime(occurrence?.end_at || occurrence?.end_time)}
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

        {/* Member Bookings List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
              Loading enrolled member roster...
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
              <Users className="size-10 text-muted-foreground/50 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No Members Booked</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                There are no active member reservations for this class session yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookings.map((booking: any) => {
                const isCompleted = booking.status === 'COMPLETED';
                const isCancelled = booking.status === 'CANCELLED';
                const attStatus = booking.attendance_record?.status;

                return (
                  <div
                    key={booking.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : isCancelled
                        ? 'bg-rose-500/5 border-rose-500/20 opacity-70'
                        : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : isCancelled
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {(booking.member_name || booking.user_profile?.full_name || 'M').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                          <span>{booking.member_name || booking.user_profile?.full_name || 'Member'}</span>
                          <span className="text-2xs font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
                            {booking.booking_type || 'MEMBER'}
                          </span>
                        </div>
                        <div className="text-2xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{booking.member_email || booking.user_profile?.email}</span>
                          <span>•</span>
                          <span>Ref: {booking.booking_number || booking.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Action Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {isCancelled ? (
                        <Badge variant="outline" className="text-xs text-rose-500 border-rose-500/30 bg-rose-500/10">
                          Cancelled Booking
                        </Badge>
                      ) : isCompleted ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 py-1 px-2.5 ${
                              attStatus === 'LATE'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            }`}
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>{attStatus || 'Attended'}</span>
                          </Badge>
                          {booking.attendance_record?.trainer_selfie_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewSelfie({
                                  name: booking.member_name || 'Member',
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
                                name: booking.member_name || booking.user_profile?.full_name || 'Member',
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
