import * as React from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  AlertCircle,
  Dumbbell,
  Sparkles,
  QrCode,
  CheckCircle2,
  RefreshCw,
  XCircle,
  ArrowRight,
  LogOut,
  ChevronRight,
  Activity,
  Award,
  CreditCard,
  HeartPulse,
  Info,
  CalendarCheck,
  Filter,
  Check,
  Flame,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  mobileApi,
  MobileMemberProfile,
  MobilePassbookCredit,
  MobileScheduleOccurrence,
  MobileBooking,
  MobilePTAppointment,
  MobileTrainer,
  MobileBranch,
  PARQSurveyResponse,
} from "@/api/endpoints/mobileApi";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function safeFormatDate(dateVal: any, formatPattern: string, fallback = "N/A"): string {
  if (!dateVal) return fallback;
  try {
    const d = typeof dateVal === "string" ? parseISO(dateVal) : new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}

class MemberPortalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("[SWEAT Member Portal] Error caught by boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center p-6 rounded-2xl border border-border/80 bg-card shadow-sm">
            <Flame className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground">SWEAT Member Portal</h2>
            <p className="text-xs text-muted-foreground mt-2 mb-3">
              We encountered an issue preparing your member session. Please refresh or sign in again.
            </p>
            {this.state.error && (
              <div className="text-[11px] text-destructive bg-destructive/10 p-2.5 rounded-lg mb-4 text-left overflow-auto max-h-32 font-mono">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex justify-center gap-2">
              <Button size="sm" onClick={() => window.location.reload()}>
                Reload Portal
              </Button>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = "/login")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WebMemberPortalWorkspace() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-medium">Loading SWEAT Member Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <MemberPortalErrorBoundary>
      <WebMemberPortalWorkspaceInner />
    </MemberPortalErrorBoundary>
  );
}

function WebMemberPortalWorkspaceInner() {
  const { user, logout } = useAuth();

  React.useEffect(() => {
    const brand = user?.branding?.app_name || "SWEAT Elite";
    document.title = `Member Portal · ${brand}`;
  }, [user]);

  // Core State
  const [activeTab, setActiveTab] = React.useState<string>("overview");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Data
  const [profile, setProfile] = React.useState<MobileMemberProfile | null>(null);
  const [credits, setCredits] = React.useState<MobilePassbookCredit[]>([]);
  const [schedule, setSchedule] = React.useState<MobileScheduleOccurrence[]>([]);
  const [bookings, setBookings] = React.useState<MobileBooking[]>([]);
  const [trainers, setTrainers] = React.useState<MobileTrainer[]>([]);
  const [ptAppointments, setPtAppointments] = React.useState<MobilePTAppointment[]>([]);
  const [branches, setBranches] = React.useState<MobileBranch[]>([]);
  const [parqSurvey, setParqSurvey] = React.useState<PARQSurveyResponse | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  // Modals & Action States
  const [bookingSlotToConfirm, setBookingSlotToConfirm] = React.useState<MobileScheduleOccurrence | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = React.useState<boolean>(false);

  const [rescheduleBookingTarget, setRescheduleBookingTarget] = React.useState<MobileBooking | null>(null);
  const [rescheduleNewOccurrenceId, setRescheduleNewOccurrenceId] = React.useState<string>("");
  const [isReschedulingSubmitting, setIsReschedulingSubmitting] = React.useState<boolean>(false);

  const [cancelBookingTarget, setCancelBookingTarget] = React.useState<MobileBooking | null>(null);
  const [isCancellingSubmitting, setIsCancellingSubmitting] = React.useState<boolean>(false);

  const [showQRPassModal, setShowQRPassModal] = React.useState<boolean>(false);
  const [qrPassData, setQrPassData] = React.useState<any>(null);

  const [ptTrainerToBook, setPtTrainerToBook] = React.useState<MobileTrainer | null>(null);
  const [ptBookingForm, setPtBookingForm] = React.useState({
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    time: "10:00",
    focus: "Pilates Core & Functional Conditioning",
    notes: "",
  });
  const [isPtSubmitting, setIsPtSubmitting] = React.useState<boolean>(false);

  // PAR-Q Interactive Form State
  const [parqFormResponses, setParqFormResponses] = React.useState<Record<string, any>>({
    heart_condition: "no",
    chest_pain_activity: "no",
    chest_pain_past_month: "no",
    dizziness_balance: "no",
    bone_joint_problem: "no",
    blood_pressure_meds: "no",
    other_reason: "no",
    emergency_contact_name: "Anita Sen",
    emergency_contact_phone: "+91 98200 44556",
    primary_fitness_goal: "Core strength, athletic endurance and injury prevention",
  });
  const [isParqSubmitting, setIsParqSubmitting] = React.useState<boolean>(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = React.useState({
    first_name: "",
    last_name: "",
    phone: "",
    emergency_contact: "",
  });
  const [isProfileSubmitting, setIsProfileSubmitting] = React.useState<boolean>(false);

  // Initial Load
  const fetchAllData = React.useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setIsLoading(true);

      const [profRes, credRes, bookRes, trainRes, ptRes, branchRes, parqRes] = await Promise.allSettled([
        mobileApi.getProfile(),
        mobileApi.getMyCredits(),
        mobileApi.getMyBookings(),
        mobileApi.getTrainers(),
        mobileApi.getPTAppointments(),
        mobileApi.getBranches(),
        mobileApi.getPARQSurvey(),
      ]);

      if (profRes.status === "fulfilled" && profRes.value?.data) {
        const raw = profRes.value.data as any;
        const normalizedProfile: MobileMemberProfile = {
          id: raw.user?.id || raw.id || "",
          email: raw.user?.email || raw.email || "",
          first_name: raw.user?.first_name || raw.first_name || "",
          last_name: raw.user?.last_name || raw.last_name || "",
          phone: raw.user?.phone || raw.phone || "",
          avatar_url: raw.user?.avatar_url || raw.avatar_url || "",
          membership_number: raw.profile?.member_number || raw.membership_number || "MEM-1CCA18",
          home_branch: raw.user?.home_branch || raw.home_branch || {
            id: "default",
            name: "SWEAT Bootcamp & Pilates",
            code: "SW-01",
          },
          onboarding_completed: true,
          parq_status: "PAR-Q Cleared",
        };
        setProfile(normalizedProfile);
        setProfileForm({
          first_name: normalizedProfile.first_name,
          last_name: normalizedProfile.last_name,
          phone: normalizedProfile.phone,
          emergency_contact: "Anita Sen (+91 98200 44556)",
        });
      }

      if (credRes.status === "fulfilled" && credRes.value?.data) {
        const raw = credRes.value.data as any;
        let list: MobilePassbookCredit[] = [];
        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw?.packs && Array.isArray(raw.packs)) {
          list = raw.packs.map((p: any, idx: number) => ({
            id: p.membership_id || `pack-${idx}`,
            package_name: p.package_name || "Sweat Bootcamp",
            package_type: "Monthly Passbook",
            total_credits: Number(p.allocated_sessions) || 16,
            used_credits: Number(p.consumed_sessions) || 0,
            remaining_credits: Number(p.remaining_sessions) || 16,
            valid_from: p.start_date || "2026-10-05",
            valid_until: p.end_date || "2026-11-04",
            days_remaining: p.days_remaining ?? 32,
            status: "ACTIVE",
          }));
        }
        setCredits(list);
      }

      if (bookRes.status === "fulfilled" && bookRes.value?.data) {
        const raw = bookRes.value.data as any;
        let list: MobileBooking[] = [];
        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw && typeof raw === "object") {
          const upcoming = (raw.upcoming || []).map((b: any) => ({
            ...b,
            start_time: b.start_at || b.start_time,
            end_time: b.end_at || b.end_time,
            branch: { id: b.branch_id || "", name: b.branch_name || b.branch?.name || "SWEAT Studio" },
            trainer: {
              name: b.trainer?.name || b.trainer_name || "SWEAT Coach",
              avatar_url: b.trainer?.avatar_url || "",
              designation: b.trainer?.title || "Coach",
            },
          }));
          const past = (raw.past || []).map((b: any) => ({
            ...b,
            start_time: b.start_at || b.start_time,
            end_time: b.end_at || b.end_time,
            branch: { id: b.branch_id || "", name: b.branch_name || b.branch?.name || "SWEAT Studio" },
            trainer: {
              name: b.trainer?.name || b.trainer_name || "SWEAT Coach",
              avatar_url: b.trainer?.avatar_url || "",
              designation: b.trainer?.title || "Coach",
            },
          }));
          list = [...upcoming, ...past];
        }
        setBookings(list);
      }

      if (trainRes.status === "fulfilled" && trainRes.value?.data) {
        const rawTrainers = Array.isArray(trainRes.value.data) ? trainRes.value.data : [];
        const normalizedTrainers: MobileTrainer[] = rawTrainers.map((t: any) => ({
          id: t.id || "",
          name: t.name || t.full_name || "SWEAT Coach",
          designation: t.designation || t.title || "Elite Performance Coach",
          avatar_url: t.avatar_url || "",
          bio: t.bio || "",
          specialties: Array.isArray(t.specialties) ? t.specialties : [],
          experience_years: t.experience_years || t.years_of_experience || 5,
        }));
        setTrainers(normalizedTrainers);
      }

      if (ptRes.status === "fulfilled" && ptRes.value?.data) {
        const rawPt = Array.isArray(ptRes.value.data) ? ptRes.value.data : [];
        setPtAppointments(
          rawPt.map((a: any) => ({
            id: a.id || "",
            appointment_number: a.appointment_number || "PT-101",
            type_name: a.type_name || "1-on-1 Personal Training",
            status: a.status || "CONFIRMED",
            start_at: a.start_at || a.start_time || "",
            end_at: a.end_at || a.end_time || "",
            trainer_name: a.trainer_name || "SWEAT Coach",
            trainer_avatar: a.trainer_avatar || "",
            trainer_designation: a.trainer_designation || "Personal Trainer",
            branch_name: a.branch_name || "SWEAT Studio",
            notes: a.notes || "",
          }))
        );
      }

      if (branchRes.status === "fulfilled" && branchRes.value?.data) {
        const rawBranches = Array.isArray(branchRes.value.data) ? branchRes.value.data : [];
        setBranches(
          rawBranches.map((b: any) => ({
            id: b.id || "",
            name: b.name || "SWEAT Studio",
            code: b.code || "SW",
            address: b.address || "",
            city: b.city || "",
            phone: b.phone || "",
          }))
        );
      }

      if (parqRes.status === "fulfilled" && parqRes.value?.data) {
        setParqSurvey(parqRes.value.data);
        if (parqRes.value.data.saved_responses) {
          setParqFormResponses((prev) => ({
            ...prev,
            ...parqRes.value.data.saved_responses,
          }));
        }
      }

      if (showToast) {
        toast.success("Studio data synced with cloud.");
      }
    } catch (err: any) {
      console.error("Error loading member data:", err);
      toast.error("Failed to load member data. Please check connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // Load Schedule whenever selectedDate or selectedBranchId changes
  const fetchSchedule = React.useCallback(async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const params: { date: string; branch_id?: string; category?: string } = { date: dateStr };
      if (selectedBranchId !== "all") {
        params.branch_id = selectedBranchId;
      }
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      const res = await mobileApi.getSchedule(params);
      if (res.data) {
        const raw = res.data as any;
        const rawSlots = Array.isArray(raw) ? raw : (raw.slots || []);
        const normalized: MobileScheduleOccurrence[] = rawSlots.map((s: any) => ({
          id: s.id,
          class_definition_id: s.class_id || s.class_definition_id || "",
          class_name: s.class_name,
          category: s.category || "Bootcamp",
          description: s.description || "",
          start_time: s.start_at || s.start_time,
          end_time: s.end_at || s.end_time,
          capacity: s.capacity?.total_capacity ?? (typeof s.capacity === "number" ? s.capacity : 10),
          booked_count: s.capacity?.booked_count ?? s.booked_count ?? 0,
          available_spots: s.capacity?.available_seats ?? s.available_spots ?? 10,
          is_full: s.capacity?.is_full ?? s.is_full ?? false,
          status: s.status || "OPEN",
          branch: s.branch || { id: "", name: "SWEAT Studio" },
          trainer: {
            id: s.trainer?.id || "",
            name: s.trainer?.name || "SWEAT Coach",
            designation: s.trainer?.title || s.trainer?.designation || "Trainer",
            avatar_url: s.trainer?.avatar_url || "",
            bio: s.trainer?.bio || "",
            specialties: s.trainer?.specialties || [],
            experience_years: s.trainer?.experience_years,
          },
          is_included_in_plan: s.is_included_in_plan ?? true,
          user_has_booking: !!s.user_booking || !!s.user_has_booking,
          user_booking_id: s.user_booking?.id || s.user_booking_id,
        }));
        setSchedule(normalized);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    }
  }, [selectedDate, selectedBranchId, selectedCategory]);

  React.useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  // Passbook Aggregations
  const primaryPass = Array.isArray(credits) && credits.length > 0 ? credits[0] : null;
  const remainingCredits = primaryPass ? (Number(primaryPass.remaining_credits) || 0) : 0;
  const usedCredits = primaryPass ? (Number(primaryPass.used_credits) || 0) : 0;
  const totalCredits = primaryPass ? (Number(primaryPass.total_credits) || 0) : 0;
  const daysRemaining = primaryPass ? (Number(primaryPass.days_remaining) || 0) : 0;
  const validityUntil = primaryPass?.valid_until ? safeFormatDate(primaryPass.valid_until, "MMM dd, yyyy") : "N/A";
  const passUsagePercent = totalCredits > 0 ? Math.min(100, Math.round((usedCredits / totalCredits) * 100)) : 0;

  // Next Upcoming Booking
  const upcomingBookings = Array.isArray(bookings)
    ? bookings.filter(
        (b) => b && b.status === "CONFIRMED" && b.start_time && !isNaN(new Date(b.start_time).getTime()) && new Date(b.start_time) >= new Date()
      )
    : [];
  const nextWorkout = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  // Attendance History
  const attendanceHistory = Array.isArray(bookings)
    ? bookings.filter(
        (b) => b && (b.status === "ATTENDED" || (b.start_time && !isNaN(new Date(b.start_time).getTime()) && new Date(b.start_time) < new Date()) || b.status === "CANCELLED")
      )
    : [];

  // Date Pills for 7-day schedule selector
  const next7Days = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      list.push(addDays(today, i));
    }
    return list;
  }, []);

  // Class Categories present in schedule
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    schedule.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [schedule]);

  // Handler: Book Class
  const handleConfirmBookClass = async () => {
    if (!bookingSlotToConfirm) return;
    setIsBookingSubmitting(true);
    try {
      const res = await mobileApi.bookClass(bookingSlotToConfirm.id);
      toast.success(res.data.detail || "Class booked successfully!");
      setBookingSlotToConfirm(null);
      // Refresh credits, bookings and schedule to stay in sync
      void fetchAllData();
      void fetchSchedule();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to book class. Please check your credit balance.";
      toast.error(detail);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Handler: Reschedule Booking
  const handleConfirmReschedule = async () => {
    if (!rescheduleBookingTarget || !rescheduleNewOccurrenceId) return;
    setIsReschedulingSubmitting(true);
    try {
      const res = await mobileApi.rescheduleBooking(rescheduleBookingTarget.id, rescheduleNewOccurrenceId);
      toast.success(res.data.detail || "Class rescheduled successfully! Your session credit has been transferred.");
      setRescheduleBookingTarget(null);
      setRescheduleNewOccurrenceId("");
      void fetchAllData();
      void fetchSchedule();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to reschedule class.";
      toast.error(detail);
    } finally {
      setIsReschedulingSubmitting(false);
    }
  };

  // Handler: Cancel Booking
  const handleConfirmCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    setIsCancellingSubmitting(true);
    try {
      const res = await mobileApi.cancelBooking(cancelBookingTarget.id);
      toast.success(res.data.detail || "Booking cancelled. 1 session credit has been refunded to your passbook.");
      setCancelBookingTarget(null);
      void fetchAllData();
      void fetchSchedule();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to cancel booking.";
      toast.error(detail);
    } finally {
      setIsCancellingSubmitting(false);
    }
  };

  // Handler: Digital QR Pass
  const handleOpenQRPass = async () => {
    try {
      const res = await mobileApi.getQRPass();
      setQrPassData(res.data);
      setShowQRPassModal(true);
    } catch {
      setQrPassData({
        member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : user?.fullName || "Member",
        membership_number: profile?.membership_number || "MEM-1CCA18",
        valid_until: primaryPass?.valid_until || new Date().toISOString(),
      });
      setShowQRPassModal(true);
    }
  };

  // Handler: Book 1-on-1 PT Session
  const handleConfirmBookPT = async () => {
    if (!ptTrainerToBook) return;
    setIsPtSubmitting(true);
    try {
      const startAt = `${ptBookingForm.date}T${ptBookingForm.time}:00`;
      const res = await mobileApi.bookPTAppointment({
        trainer_id: ptTrainerToBook.id,
        start_at: startAt,
        duration_minutes: 60,
        focus: ptBookingForm.focus,
        notes: ptBookingForm.notes,
      });
      toast.success(res.data.detail || "1-on-1 Personal Training appointment scheduled!");
      setPtTrainerToBook(null);
      void fetchAllData();
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || "Failed to book PT session.";
      toast.error(detail);
    } finally {
      setIsPtSubmitting(false);
    }
  };

  // Handler: Cancel PT Appointment
  const handleCancelPTAppointment = async (apptId: string) => {
    try {
      const res = await mobileApi.cancelPTAppointment(apptId);
      toast.success(res.data.detail || "PT appointment cancelled.");
      void fetchAllData();
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to cancel PT session.");
    }
  };

  // Handler: Submit PAR-Q Form
  const handleSubmitPARQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsParqSubmitting(true);
    try {
      const res = await mobileApi.submitPARQSurvey(parqFormResponses);
      toast.success(res.data.message || "PAR-Q Health Questionnaire submitted successfully!");
      if (parqSurvey) {
        setParqSurvey({
          ...parqSurvey,
          is_completed: true,
          is_cleared: res.data.is_cleared,
          status_badge: res.data.is_cleared ? "PAR-Q Cleared" : "Under Review",
          saved_responses: parqFormResponses,
        });
      }
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to submit PAR-Q form.");
    } finally {
      setIsParqSubmitting(false);
    }
  };

  // Handler: Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSubmitting(true);
    try {
      const res = await mobileApi.updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
      });
      setProfile(res.data);
      toast.success("Profile details updated successfully.");
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to update profile.");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const isParqCleared = parqSurvey?.is_cleared ?? true;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BRANDING & QUICK MEMBER SUMMARY                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand & Studio */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-orange-500 text-primary-foreground shadow-md shadow-primary/25">
                <Flame className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-lg text-foreground">
                    SWEAT
                  </span>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2 py-0.5">
                    Member Portal
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3 text-primary" />
                  {profile?.home_branch?.name || "Bandra West Flagship"}
                </p>
              </div>
            </div>

            {/* Center / Right: Quick Credits & Digital ID & Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Live Credit Pill */}
              <div
                onClick={() => setActiveTab("passbook")}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-card hover:border-primary/50 transition-colors cursor-pointer shadow-xs"
              >
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  {remainingCredits} Sessions Left
                </span>
                <span className="text-[11px] text-muted-foreground">({validityUntil})</span>
              </div>

              {/* Digital Member QR Pass Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenQRPass}
                className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-xs font-medium"
              >
                <QrCode className="h-4 w-4 text-primary" />
                <span className="hidden md:inline">Access Pass</span>
              </Button>

              {/* Sync / Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void fetchAllData(true)}
                disabled={isRefreshing}
                title="Sync with cloud"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              </Button>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                <div className="flex flex-col text-right hidden lg:block">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : user?.fullName || "Member"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {profile?.membership_number || "MEM-1CCA18"}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shadow-xs">
                  {profile?.first_name ? profile.first_name.slice(0, 1).toUpperCase() : (user?.fullName ? user.fullName.slice(0, 1).toUpperCase() : "M")}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  title="Sign out of Member Portal"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN NAVIGATION TABS                                                   */}
      {/* ========================================================================= */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto scrollbar-none pb-1">
            <TabsList className="bg-card border border-border/60 p-1 rounded-xl shadow-xs inline-flex min-w-max">
              <TabsTrigger value="overview" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <Activity className="h-4 w-4" />
                Studio Hub
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <CalendarIcon className="h-4 w-4" />
                Class Schedule & Booking
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <CalendarCheck className="h-4 w-4" />
                My Bookings & Attendance
              </TabsTrigger>
              <TabsTrigger value="pt" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <Dumbbell className="h-4 w-4" />
                Personal Training (PT)
              </TabsTrigger>
              <TabsTrigger value="passbook" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Membership & Passbook
              </TabsTrigger>
              <TabsTrigger value="parq" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <HeartPulse className="h-4 w-4" />
                PAR-Q Health Clearance
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <User className="h-4 w-4" />
                My Profile
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STUDIO HUB (OVERVIEW)                                              */}
          {/* ========================================================================= */}
          <TabsContent value="overview" className="space-y-6">
            {/* Hero Welcome Card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                      Member Command Hub
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                      Active Membership
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Welcome back, {profile?.first_name || "Maya"}!
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    You have <span className="font-semibold text-foreground">{remainingCredits} workout sessions</span> available in your current package. Check today&apos;s schedule or view your upcoming booked workouts below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setActiveTab("schedule")}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Book Today&apos;s Class
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenQRPass}
                    className="gap-2 border-border/80 hover:bg-accent font-medium"
                  >
                    <QrCode className="h-4 w-4 text-primary" />
                    Turnstile Pass
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Remaining Sessions
                    <Zap className="h-4 w-4 text-amber-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {remainingCredits}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={passUsagePercent} className="h-1.5 mt-2" />
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {usedCredits} of {totalCredits} used ({100 - passUsagePercent}% left)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Package Validity
                    <Clock className="h-4 w-4 text-primary" />
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {daysRemaining} Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mt-2">
                    Expires on <span className="font-semibold text-foreground">{validityUntil}</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Upcoming Bookings
                    <CalendarCheck className="h-4 w-4 text-sky-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {upcomingBookings.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mt-2">
                    {nextWorkout ? `${safeFormatDate(nextWorkout.start_time, "EEE, hh:mm a")}` : "No upcoming session"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    PAR-Q Clearance
                    <HeartPulse className="h-4 w-4 text-emerald-500" />
                  </CardDescription>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-5 w-5" />
                    {parqSurvey?.status_badge || "PAR-Q Cleared"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => setActiveTab("parq")}
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 mt-2"
                  >
                    View medical details <ArrowRight className="h-3 w-3" />
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Next Workout & Package Hero Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Next Workout Focus Card */}
              <Card className="lg:col-span-2 border-border/60 bg-card shadow-xs">
                <CardHeader className="pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Next Scheduled Workout
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Your confirmed class reservation at SWEAT Studio
                      </CardDescription>
                    </div>
                    {nextWorkout && (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold text-xs">
                        Confirmed Spot
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {nextWorkout ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-4 rounded-xl border border-border/60 bg-accent/20">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Flame className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                            {nextWorkout.category || "Bootcamp"}
                          </span>
                          <h3 className="text-lg font-bold text-foreground">
                            {nextWorkout.class_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {safeFormatDate(nextWorkout.start_time, "EEE, MMM dd · hh:mm a")} - {safeFormatDate(nextWorkout.end_time, "hh:mm a")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {nextWorkout.branch?.name || "Bandra West"}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-primary" />
                              Coach {nextWorkout.trainer?.name || "SWEAT Coach"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleBookingTarget(nextWorkout);
                            setRescheduleNewOccurrenceId("");
                          }}
                          className="w-full sm:w-28 text-xs font-semibold hover:border-primary"
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelBookingTarget(nextWorkout)}
                          className="w-full sm:w-28 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4 border border-dashed border-border/80 rounded-xl">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-foreground">No Upcoming Workouts Booked</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                        You have available session credits waiting. Book a class from today&apos;s live schedule to reserve your spot.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("schedule")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                      >
                        Explore Class Schedule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Package Contract Summary Card */}
              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Package Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current active membership entitlement
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Membership Plan
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {primaryPass?.package_name || "Sweat Bootcamp - 16 Sessions (Monthly)"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      ID: {profile?.membership_number || "MEM-1CCA18"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-accent/30 border border-border/50 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Allocated</div>
                      <div className="text-base font-bold text-foreground">{totalCredits}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Used</div>
                      <div className="text-base font-bold text-amber-500">{usedCredits}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Remaining</div>
                      <div className="text-base font-bold text-emerald-500">{remainingCredits}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Valid From:</span>
                      <span className="font-semibold text-foreground">
                        {safeFormatDate(primaryPass?.valid_from, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Until:</span>
                      <span className="font-semibold text-foreground">{validityUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Studio Access:</span>
                      <span className="font-semibold text-foreground">Multi-Branch All-Access</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("passbook")}
                    className="w-full text-xs font-semibold mt-2"
                  >
                    View Complete Passbook & Ledger
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: CLASS SCHEDULE & BOOKING                                           */}
          {/* ========================================================================= */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Live Class Schedule & 1-Click Booking
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time studio availability. Tap any class to view coach qualifications and reserve your spot.
                </p>
              </div>

              {/* Branch Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Studio Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 7-Day Date Selector Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {next7Days.map((d) => {
                const isSelected = isSameDay(d, selectedDate);
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                        : "border-border/70 bg-card hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-semibold opacity-80">
                      {isToday ? "Today" : format(d, "EEE")}
                    </span>
                    <span className="text-lg font-bold leading-tight mt-0.5">
                      {format(d, "dd")}
                    </span>
                    <span className="text-[10px] font-medium opacity-80">
                      {format(d, "MMM")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    selectedCategory === "all"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Formats
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Schedule Slot Cards List */}
            {schedule.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-2xl bg-card/40">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">No Classes Scheduled for This Day</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Try choosing another date above or switch to a different studio branch.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.map((occ) => {
                  const startTime = safeFormatDate(occ.start_time, "hh:mm a");
                  const endTime = safeFormatDate(occ.end_time, "hh:mm a");
                  const hasBooked = occ.user_has_booking;
                  const isFull = occ.is_full;
                  const spots = occ.available_spots;

                  return (
                    <Card
                      key={occ.id}
                      className={`border transition-all flex flex-col justify-between ${
                        hasBooked
                          ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-xs"
                          : isFull
                          ? "border-border/50 bg-card/50 opacity-80"
                          : "border-border/70 bg-card hover:border-primary/40 shadow-xs hover:shadow-sm"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase">
                            {occ.category || "Studio Workout"}
                          </Badge>

                          {hasBooked ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Booked
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="secondary" className="text-muted-foreground text-[10px] font-semibold">
                              Full
                            </Badge>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {spots} spots left
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-base font-extrabold text-foreground leading-snug">
                          {occ.class_name}
                        </CardTitle>

                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground mt-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{startTime} - {endTime}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-4">
                        {/* Trainer Detail Section */}
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-accent/30 border border-border/50">
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                            {occ.trainer?.name ? occ.trainer.name.slice(0, 1) : "C"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-foreground truncate">
                              Coach {occ.trainer?.name || "Master Coach"}
                            </h5>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {occ.trainer?.designation || "Senior Strength Trainer"}
                            </p>
                            {occ.trainer?.specialties && Array.isArray(occ.trainer.specialties) && occ.trainer.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {occ.trainer.specialties.slice(0, 2).map((sp, idx) => (
                                  <span key={idx} className="text-[9px] bg-background/80 px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location / Room */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {occ.branch?.name || "Main Studio"}
                          </span>
                          <span className="text-[11px] font-medium text-foreground">
                            {occ.is_included_in_plan ? "1 Pass Credit" : "Specialty Upgrade"}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {hasBooked ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const found = bookings.find((b) => b.occurrence_id === occ.id && b.status === "CONFIRMED");
                                if (found) {
                                  setRescheduleBookingTarget(found);
                                  setRescheduleNewOccurrenceId("");
                                } else {
                                  setActiveTab("bookings");
                                }
                              }}
                              className="w-full text-xs font-semibold"
                            >
                              Reschedule Slot
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isFull || remainingCredits <= 0}
                            onClick={() => setBookingSlotToConfirm(occ)}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {remainingCredits <= 0
                              ? "No Credits Left"
                              : isFull
                              ? "Class Full"
                              : "Book with 1 Credit"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: MY BOOKINGS & ATTENDANCE HISTORY                                   */}
          {/* ========================================================================= */}
          <TabsContent value="bookings" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  My Bookings & Attendance History
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review upcoming workouts, manage your reservations, reschedule class slots, and track workout check-ins.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setActiveTab("schedule")}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0"
              >
                <CalendarIcon className="h-4 w-4" />
                Book Another Class
              </Button>
            </div>

            {/* Upcoming Reservations Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming Reserved Sessions ({upcomingBookings.length})
              </h3>

              {upcomingBookings.length === 0 ? (
                <Card className="border-border/60 bg-card p-6 text-center">
                  <p className="text-xs text-muted-foreground">You have no upcoming workout sessions reserved.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingBookings.map((b) => (
                    <Card key={b.id} className="border-border/70 bg-card shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold uppercase">
                            {b.category || "Class"}
                          </Badge>
                          <Badge className="bg-emerald-500 text-white font-semibold text-[10px]">
                            CONFIRMED
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground mt-1">
                          {b.class_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {safeFormatDate(b.start_time, "EEEE, MMM dd · hh:mm a")}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {b.branch?.name || "Bandra West"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            Coach {b.trainer?.name || "SWEAT Coach"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleBookingTarget(b);
                              setRescheduleNewOccurrenceId("");
                            }}
                            className="flex-1 text-xs font-semibold hover:border-primary"
                          >
                            Reschedule Slot
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelBookingTarget(b)}
                            className="text-xs text-destructive hover:bg-destructive/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance History Section */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Attendance History & Past Sessions ({attendanceHistory.length})
              </h3>

              {attendanceHistory.length === 0 ? (
                <Card className="border-border/60 bg-card p-6 text-center">
                  <p className="text-xs text-muted-foreground">No past workout attendance logs yet.</p>
                </Card>
              ) : (
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Workout / Class</th>
                          <th className="py-3 px-4">Studio Location</th>
                          <th className="py-3 px-4">Coach</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {attendanceHistory.map((item) => {
                          const isCancelled = item.status === "CANCELLED";
                          const isAttended = item.status === "ATTENDED";
                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                                {safeFormatDate(item.start_time, "MMM dd, yyyy · hh:mm a")}
                              </td>
                              <td className="py-3 px-4 font-bold text-foreground">
                                {item.class_name}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {item.branch?.name || "Bandra West"}
                              </td>
                              <td className="py-3 px-4 text-foreground font-medium">
                                {item.trainer?.name || "Master Coach"}
                              </td>
                              <td className="py-3 px-4">
                                {isCancelled ? (
                                  <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                                    Cancelled (Refunded)
                                  </Badge>
                                ) : isAttended ? (
                                  <Badge className="bg-emerald-500 text-white text-[10px]">
                                    Attended
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Completed
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: PERSONAL TRAINING (PT)                                             */}
          {/* ========================================================================= */}
          <TabsContent value="pt" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Personal Training (PT) Management
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Book 1-on-1 private coaching sessions with certified SWEAT coaches tailored to your personal goals.
                </p>
              </div>

              {trainers.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPtTrainerToBook(trainers[0]);
                    setPtBookingForm({
                      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
                      time: "10:00",
                      focus: "Pilates Core & Functional Conditioning",
                      notes: "",
                    });
                  }}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0"
                >
                  <Dumbbell className="h-4 w-4" />
                  Schedule 1-on-1 PT
                </Button>
              )}
            </div>

            {/* Scheduled PT Appointments */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Scheduled 1-on-1 Appointments ({ptAppointments.length})
              </h3>

              {ptAppointments.length === 0 ? (
                <Card className="border-border/60 bg-card p-6 text-center">
                  <p className="text-xs text-muted-foreground">You currently have no 1-on-1 Personal Training sessions booked.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ptAppointments.map((appt) => (
                    <Card key={appt.id} className="border-border/70 bg-card shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                            1-ON-1 PERSONAL TRAINING
                          </Badge>
                          <Badge className="bg-emerald-500 text-white font-semibold text-[10px]">
                            {appt.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground mt-1">
                          Coach {appt.trainer_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {safeFormatDate(appt.start_at, "EEEE, MMM dd · hh:mm a", "TBD")}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Focus:</span> {appt.notes || "General Conditioning & Movement"}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {appt.branch_name || "Bandra Studio"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelPTAppointment(appt.id)}
                            className="text-xs text-destructive hover:bg-destructive/10"
                          >
                            Cancel Session
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Coach Directory Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                SWEAT Certified Coach Directory
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers.map((t) => (
                  <Card key={t.id} className="border-border/70 bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                          {t.name ? t.name.slice(0, 1) : "C"}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            {t.name}
                          </CardTitle>
                          <CardDescription className="text-xs font-medium text-primary">
                            {t.designation || "Elite Performance Coach"}
                          </CardDescription>
                          {t.experience_years && (
                            <span className="text-[10px] text-muted-foreground">
                              {t.experience_years}+ Years Professional Experience
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {t.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {t.bio}
                        </p>
                      )}

                      {t.specialties && Array.isArray(t.specialties) && t.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.specialties.map((sp, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] font-medium">
                              {sp}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          setPtTrainerToBook(t);
                          setPtBookingForm({
                            date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
                            time: "10:00",
                            focus: "Pilates Core & Functional Conditioning",
                            notes: "",
                          });
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Book with Coach {t.name ? t.name.split(" ")[0] : "Coach"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 5: MEMBERSHIP & PASSBOOK                                              */}
          {/* ========================================================================= */}
          <TabsContent value="passbook" className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Complete Membership & Session Passbook
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full transparency into your package allocation, session ledger, and membership validity.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Ledger Card */}
              <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        {primaryPass?.package_name || "Sweat Bootcamp - 16 Sessions (Monthly)"}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono mt-0.5">
                        Membership #{profile?.membership_number || "MEM-1CCA18"}
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-semibold text-xs">
                      ACTIVE CONTRACT
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Session Visual Bars */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Session Consumption</span>
                      <span className="text-primary">{usedCredits} of {totalCredits} Sessions Used</span>
                    </div>
                    <Progress value={passUsagePercent} className="h-3 rounded-full" />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>0 Sessions</span>
                      <span className="font-semibold text-foreground">{remainingCredits} Remaining</span>
                      <span>{totalCredits} Total</span>
                    </div>
                  </div>

                  {/* 3 Metric Pillars */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-accent/20 border border-border/50 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground">Total Entitlement</span>
                      <div className="text-2xl font-extrabold text-foreground mt-0.5">{totalCredits}</div>
                      <span className="text-[10px] text-muted-foreground">Sessions</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Consumed</span>
                      <div className="text-2xl font-extrabold text-amber-500 mt-0.5">{usedCredits}</div>
                      <span className="text-[10px] text-muted-foreground">Completed</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Available Now</span>
                      <div className="text-2xl font-extrabold text-emerald-500 mt-0.5">{remainingCredits}</div>
                      <span className="text-[10px] text-muted-foreground">Bookable</span>
                    </div>
                  </div>

                  {/* Terms and Access */}
                  <div className="space-y-2 border-t border-border/40 pt-4 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Contract Start:</span>
                      <span className="font-semibold text-foreground">
                        {safeFormatDate(primaryPass?.valid_from, "MMMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Contract Expiry:</span>
                      <span className="font-semibold text-foreground">
                        {safeFormatDate(primaryPass?.valid_until, "MMMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Days Remaining:</span>
                      <span className="font-semibold text-foreground">{daysRemaining} Days</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Cancellation Window:</span>
                      <span className="font-semibold text-foreground">Free refund up to 2 hours prior to class</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Digital Pass Card */}
              <Card className="border-border/70 bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    Turnstile QR Card
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Scan for automated studio check-in
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <div className="p-4 rounded-2xl bg-white border border-border shadow-md">
                    {/* SVG Vector QR Code Graphic */}
                    <div className="w-36 h-36 bg-black flex flex-col items-center justify-center text-white rounded-lg p-2 font-mono text-[9px] select-none">
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-xs ${
                              [0, 1, 4, 5, 6, 7, 10, 11, 14, 17, 20, 24, 25, 29, 30, 31, 34, 35].includes(i)
                                ? "bg-black"
                                : "bg-white"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-bold text-foreground">
                      {profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Maya Sen"}
                    </span>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {profile?.membership_number || "MEM-1CCA18"}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 max-w-xs">
                    Present this code at any SWEAT studio gate scanner for contactless access.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenQRPass}
                    className="w-full text-xs font-semibold mt-4"
                  >
                    Enlarge Access Code
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 6: PAR-Q HEALTH CLEARANCE FORM                                        */}
          {/* ========================================================================= */}
          <TabsContent value="parq" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-emerald-500" />
                  Physical Activity Readiness Questionnaire (PAR-Q)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Standard safety diagnostic required for high-intensity training, bootcamp and private coaching.
                </p>
              </div>

              <Badge
                className={`font-semibold text-xs py-1 px-3 gap-1.5 ${
                  isParqCleared
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {parqSurvey?.status_badge || "PAR-Q Cleared"}
              </Badge>
            </div>

            <Card className="border-border/70 bg-card shadow-xs">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold text-foreground">
                  Medical Readiness Self-Assessment
                </CardTitle>
                <CardDescription className="text-xs">
                  Please answer each question honestly to ensure safe and effective exercise programming.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitPARQ} className="space-y-6">
                  {/* 7 PAR-Q Diagnostic Questions */}
                  <div className="space-y-4">
                    {[
                      {
                        id: "heart_condition",
                        text: "1. Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
                      },
                      {
                        id: "chest_pain_activity",
                        text: "2. Do you feel pain in your chest when you do physical activity?",
                      },
                      {
                        id: "chest_pain_past_month",
                        text: "3. In the past month, have you had chest pain when you were not doing physical activity?",
                      },
                      {
                        id: "dizziness_balance",
                        text: "4. Do you lose your balance because of dizziness or do you ever lose consciousness?",
                      },
                      {
                        id: "bone_joint_problem",
                        text: "5. Do you have a bone or joint problem (e.g. back, knee, shoulder) that could be made worse by a change in your physical activity?",
                      },
                      {
                        id: "blood_pressure_meds",
                        text: "6. Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
                      },
                      {
                        id: "other_reason",
                        text: "7. Do you know of any other reason why you should not do physical activity?",
                      },
                    ].map((q) => {
                      const val = parqFormResponses[q.id] || "no";
                      return (
                        <div
                          key={q.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-accent/10"
                        >
                          <span className="text-xs font-medium text-foreground max-w-2xl">
                            {q.text}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                value="no"
                                checked={val === "no"}
                                onChange={() => setParqFormResponses((prev) => ({ ...prev, [q.id]: "no" }))}
                                className="accent-primary"
                              />
                              No
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-amber-500">
                              <input
                                type="radio"
                                name={q.id}
                                value="yes"
                                checked={val === "yes"}
                                onChange={() => setParqFormResponses((prev) => ({ ...prev, [q.id]: "yes" }))}
                                className="accent-amber-500"
                              />
                              Yes
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Biometrics & Emergency Contact */}
                  <div className="border-t border-border/40 pt-6">
                    <h4 className="text-sm font-bold text-foreground mb-4">
                      Emergency Contact & Primary Fitness Goal
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="em_name" className="text-xs">Emergency Contact Name</Label>
                        <Input
                          id="em_name"
                          value={parqFormResponses.emergency_contact_name || ""}
                          onChange={(e) => setParqFormResponses((prev) => ({ ...prev, emergency_contact_name: e.target.value }))}
                          placeholder="e.g. Anita Sen"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="em_phone" className="text-xs">Emergency Contact Phone</Label>
                        <Input
                          id="em_phone"
                          value={parqFormResponses.emergency_contact_phone || ""}
                          onChange={(e) => setParqFormResponses((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))}
                          placeholder="+91 98200 44556"
                          className="text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label htmlFor="fit_goal" className="text-xs">Primary Fitness & Lifestyle Focus</Label>
                        <Input
                          id="fit_goal"
                          value={parqFormResponses.primary_fitness_goal || ""}
                          onChange={(e) => setParqFormResponses((prev) => ({ ...prev, primary_fitness_goal: e.target.value }))}
                          placeholder="e.g. Athletic Conditioning, Core Stability, Mobility"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isParqSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {isParqSubmitting ? "Submitting..." : "Save & Update PAR-Q Clearance"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 7: MY PROFILE                                                         */}
          {/* ========================================================================= */}
          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Member Profile & Personal Information
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your contact details, emergency information, and studio preferences.
              </p>
            </div>

            <Card className="border-border/70 bg-card shadow-xs">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold text-foreground">
                  Personal Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Connected to SWEAT Central Member Database
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fn" className="text-xs">First Name</Label>
                      <Input
                        id="fn"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ln" className="text-xs">Last Name</Label>
                      <Input
                        id="ln"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Email Address (Registered)</Label>
                    <Input
                      id="email"
                      value={profile?.email || user?.email || ""}
                      disabled
                      className="text-xs bg-muted/50 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Contact studio reception to update your registered email.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs">Mobile Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="home_branch" className="text-xs">Home Studio Branch</Label>
                    <Input
                      id="home_branch"
                      value={profile?.home_branch?.name || "Bandra West Flagship"}
                      disabled
                      className="text-xs bg-muted/50 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isProfileSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                    >
                      {isProfileSubmitting ? "Saving..." : "Update Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: 1-CLICK CLASS BOOKING CONFIRMATION                               */}
      {/* ========================================================================= */}
      <Dialog open={!!bookingSlotToConfirm} onOpenChange={(open) => !open && setBookingSlotToConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Confirm Workout Reservation
            </DialogTitle>
            <DialogDescription className="text-xs">
              1 session credit will be deducted from your active passbook.
            </DialogDescription>
          </DialogHeader>

          {bookingSlotToConfirm && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border border-border/70 bg-accent/20 space-y-2">
                <span className="text-[10px] font-bold text-primary uppercase">
                  {bookingSlotToConfirm.category || "Class"}
                </span>
                <h4 className="text-base font-bold text-foreground">
                  {bookingSlotToConfirm.class_name}
                </h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {safeFormatDate(bookingSlotToConfirm.start_time, "EEEE, MMM dd · hh:mm a")} - {safeFormatDate(bookingSlotToConfirm.end_time, "hh:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{bookingSlotToConfirm.branch?.name || "Bandra West"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Coach {bookingSlotToConfirm.trainer?.name || "Master Coach"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground">Passbook Balance After Booking:</span>
                <span className="font-bold text-emerald-500">{remainingCredits - 1} Sessions</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookingSlotToConfirm(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isBookingSubmitting}
              onClick={handleConfirmBookClass}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
            >
              {isBookingSubmitting ? "Reserving..." : "Confirm & Reserve Spot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE BOOKING MODAL                                         */}
      {/* ========================================================================= */}
      <Dialog open={!!rescheduleBookingTarget} onOpenChange={(open) => !open && setRescheduleBookingTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Reschedule Workout Slot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select another available class slot to transfer your session reservation without losing credits.
            </DialogDescription>
          </DialogHeader>

          {rescheduleBookingTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl border border-border/70 bg-accent/20">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Currently Booked:</span>
                <h5 className="text-sm font-bold text-foreground">{rescheduleBookingTarget.class_name}</h5>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDate(rescheduleBookingTarget.start_time, "EEE, MMM dd · hh:mm a")}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Select New Slot on Today&apos;s / Upcoming Schedule:
                </Label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {schedule
                    .filter((s) => s.id !== rescheduleBookingTarget.occurrence_id && !s.is_full)
                    .map((occ) => {
                      const isSelected = rescheduleNewOccurrenceId === occ.id;
                      return (
                        <div
                          key={occ.id}
                          onClick={() => setRescheduleNewOccurrenceId(occ.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/60 bg-card hover:border-primary/40"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-semibold text-primary uppercase">
                              {occ.category}
                            </span>
                            <h6 className="text-xs font-bold text-foreground">{occ.class_name}</h6>
                            <p className="text-[11px] text-muted-foreground">
                              {safeFormatDate(occ.start_time, "EEE, MMM dd · hh:mm a")} · Coach {occ.trainer?.name || "SWEAT Coach"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-500 font-semibold">
                              {occ.available_spots} spots
                            </span>
                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduleBookingTarget(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isReschedulingSubmitting || !rescheduleNewOccurrenceId}
              onClick={handleConfirmReschedule}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
            >
              {isReschedulingSubmitting ? "Rescheduling..." : "Confirm Slot Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: CANCEL BOOKING MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog open={!!cancelBookingTarget} onOpenChange={(open) => !open && setCancelBookingTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Booking Reservation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel this booking? 1 session credit will be refunded to your passbook.
            </DialogDescription>
          </DialogHeader>

          {cancelBookingTarget && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
              <h4 className="text-sm font-bold text-foreground">{cancelBookingTarget.class_name}</h4>
              <p className="text-xs text-muted-foreground">
                {safeFormatDate(cancelBookingTarget.start_time, "EEEE, MMM dd · hh:mm a")}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelBookingTarget(null)}
              className="text-xs"
            >
              Keep Booking
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isCancellingSubmitting}
              onClick={handleConfirmCancelBooking}
              className="text-xs font-semibold"
            >
              {isCancellingSubmitting ? "Cancelling..." : "Yes, Cancel & Refund Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: BOOK 1-ON-1 PT SESSION                                           */}
      {/* ========================================================================= */}
      <Dialog open={!!ptTrainerToBook} onOpenChange={(open) => !open && setPtTrainerToBook(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Schedule 1-on-1 Personal Training
            </DialogTitle>
            <DialogDescription className="text-xs">
              Private coaching with Coach {ptTrainerToBook?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pt_date" className="text-xs">Session Date</Label>
                <Input
                  id="pt_date"
                  type="date"
                  value={ptBookingForm.date}
                  onChange={(e) => setPtBookingForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pt_time" className="text-xs">Preferred Time</Label>
                <select
                  id="pt_time"
                  value={ptBookingForm.time}
                  onChange={(e) => setPtBookingForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="h-9 w-full px-3 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="07:00">07:00 AM</option>
                  <option value="08:30">08:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:30">05:30 PM</option>
                  <option value="19:00">07:00 PM</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pt_focus" className="text-xs">Primary Focus</Label>
              <Input
                id="pt_focus"
                value={ptBookingForm.focus}
                onChange={(e) => setPtBookingForm((prev) => ({ ...prev, focus: e.target.value }))}
                placeholder="e.g. Pilates Core, Hypertrophy, Mobility"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pt_notes" className="text-xs">Notes for Trainer (Optional)</Label>
              <Textarea
                id="pt_notes"
                value={ptBookingForm.notes}
                onChange={(e) => setPtBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any past injury notes or specific workout targets"
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPtTrainerToBook(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPtSubmitting}
              onClick={handleConfirmBookPT}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
            >
              {isPtSubmitting ? "Booking..." : "Confirm PT Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: DIGITAL MEMBER QR PASS                                           */}
      {/* ========================================================================= */}
      <Dialog open={showQRPassModal} onOpenChange={setShowQRPassModal}>
        <DialogContent className="sm:max-w-xs text-center flex flex-col items-center">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Flame className="h-5 w-5 text-primary" />
              SWEAT Access Pass
            </DialogTitle>
            <DialogDescription className="text-xs">
              Studio Turnstile Access
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 my-2 rounded-2xl bg-white border border-border shadow-lg">
            <div className="w-48 h-48 bg-black flex flex-col items-center justify-center text-white rounded-lg p-2 font-mono text-[9px] select-none">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-1.5 bg-white">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-xs ${
                      [0, 1, 4, 5, 6, 7, 10, 11, 14, 17, 20, 24, 25, 29, 30, 31, 34, 35].includes(i)
                        ? "bg-black"
                        : "bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-foreground">
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Maya Sen"}
            </h4>
            <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
              {profile?.membership_number || "MEM-1CCA18"}
            </Badge>
          </div>

          <p className="text-[11px] text-muted-foreground mt-2">
            Valid at all SWEAT locations across India.
          </p>

          <Button
            size="sm"
            onClick={() => setShowQRPassModal(false)}
            className="w-full mt-4 text-xs font-semibold"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
