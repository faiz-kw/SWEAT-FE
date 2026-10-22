import * as React from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import {
  Lock,
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
  History,
  FileText,
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
  PenTool,
  RotateCcw,
  CopyCheck,
  FileEdit,
  TrendingUp,
  CalendarPlus,
  Snowflake,
  Package,
  Building2,
  ChevronDown,
  Utensils,
  Ticket,
} from "lucide-react";
// import { MemberNutritionTab } from "@/components/member-portal/MemberNutritionTab";
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
  MobileMembershipActionOptions,
} from "@/api/endpoints/mobileApi";
import { openRazorpayCheckout, cleanupRazorpayDOM, loadRazorpayScript } from "@/utils/razorpayCheckout";
import { QRCodeSvg } from "@/components/common/QRCodeSvg";
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
  override componentDidCatch(error: any, errorInfo: any) {
    console.error("[SWEAT Member Portal] Error caught by boundary:", error, errorInfo);
  }
  override render() {
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

// Feature flag: Personal Training (PT) visibility in Member Portal
// Phase 2 requirement: Defer/hide PT navigation, shortcuts, and appointments
// from member-facing view while keeping backend and admin PT modules fully intact.
const SHOW_MEMBER_PT = false;


// Razorpay Checkout is managed authoritatively via @/utils/razorpayCheckout



function cleanPackageDisplayName(nameSnapshot?: string, packageName?: string): string {
  if (packageName && packageName.trim()) {
    return packageName.trim().replace(/[\s\-_]+v\d+(\.\d+)?$/i, '');
  }
  const raw = (nameSnapshot || '').trim();
  return raw.replace(/[\s\-_]+v\d+(\.\d+)?$/i, '').trim() || raw;
}

function getProgramIcon(name: string) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('bootcamp') || lower.includes('boot') || lower.includes('camp')) {
    return <Flame size={13} className="text-orange-500 fill-orange-500/20 shrink-0" />;
  }
  if (lower.includes('online') || lower.includes('transform')) {
    return <Sparkles size={13} className="text-sky-500 shrink-0" />;
  }
  if (lower.includes('pilates') || lower.includes('studio') || lower.includes('reformer')) {
    return <HeartPulse size={13} className="text-rose-500 shrink-0" />;
  }
  return <Package size={13} className="text-primary shrink-0" />;
}

function formatBranchOptionText(b: any): string {
  if (!b) return '';
  const addr = (b.address || b.address_line_1 || b.location_name || b.city || '').trim();
  const name = (b.name || b.code || 'Studio').trim();
  if (addr && !name.toLowerCase().includes(addr.toLowerCase())) {
    return `${name} — ${addr}`;
  }
  return name;
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

  // Redirect guard: if PT is deferred/hidden and somehow active, redirect to overview
  React.useEffect(() => {
    if (!SHOW_MEMBER_PT && activeTab === "pt") {
      setActiveTab("overview");
    }
  }, [activeTab]);
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
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = React.useState<boolean>(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const scheduleReqIdRef = React.useRef<number>(0);

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
  const [isQRPassLoading, setIsQRPassLoading] = React.useState<boolean>(false);

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
  const parqCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [parqHasSignature, setParqHasSignature] = React.useState<boolean>(false);
  const [parqIsDrawing, setParqIsDrawing] = React.useState<boolean>(false);
  const [parqConsentAccepted, setParqConsentAccepted] = React.useState<boolean>(true);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = React.useState<number>(0);
  const [renewParqDecision, setRenewParqDecision] = React.useState<'REUSE' | 'EDIT' | 'NEW'>('REUSE');
  const [upgradeParqDecision, setUpgradeParqDecision] = React.useState<'REUSE' | 'EDIT' | 'NEW'>('REUSE');

  // Membership Self-Service Action Modals State
  const [membershipActions, setMembershipActions] = React.useState<MobileMembershipActionOptions | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = React.useState<boolean>(false);
  const [selectedRenewPackageId, setSelectedRenewPackageId] = React.useState<string>("");
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState<boolean>(false);
  const [selectedUpgradePackageId, setSelectedUpgradePackageId] = React.useState<string>("");
  const [upgradeReason, setUpgradeReason] = React.useState<string>("");
  const [isExtendModalOpen, setIsExtendModalOpen] = React.useState<boolean>(false);
  const [extendDays, setExtendDays] = React.useState<number>(14);
  const [extendReason, setExtendReason] = React.useState<string>("");
  const [isFreezeModalOpen, setIsFreezeModalOpen] = React.useState<boolean>(false);
  const [selectedRenewBranchId, setSelectedRenewBranchId] = React.useState<string>("");
  const [selectedUpgradeBranchId, setSelectedUpgradeBranchId] = React.useState<string>("");
  const [selectedUpgradeProgramId, setSelectedUpgradeProgramId] = React.useState<string>("");
  const [isUnfreezing, setIsUnfreezing] = React.useState<boolean>(false);
  const [freezeStartDate, setFreezeStartDate] = React.useState<string>("");
  const [freezeEndDate, setFreezeEndDate] = React.useState<string>("");
  const [freezeReason, setFreezeReason] = React.useState<string>("");
  const [isSubmittingAction, setIsSubmittingAction] = React.useState<boolean>(false);

  // Only include active valid operational studio branches
  const availableBranches = React.useMemo(() => {
    if (!membershipActions?.branches) return [];
    const valid = membershipActions.branches.filter(
      (b) => b.code && !b.name.toLowerCase().includes('main')
    );
    return valid.length > 0 ? valid : membershipActions.branches;
  }, [membershipActions?.branches]);

  const effectiveUpgradeBranchId = selectedUpgradeBranchId || membershipActions?.active_membership?.branch_id || availableBranches[0]?.id || "";
  const effectiveUpgradeProgramId = selectedUpgradeProgramId || membershipActions?.active_membership?.program_id || membershipActions?.programs?.[0]?.id || "";

  // Strictly filter upgrade packages by selected program
  const filteredUpgradeOptions = React.useMemo(() => {
    return (membershipActions?.upgrade_options || []).filter(
      (opt) => opt.program_id === effectiveUpgradeProgramId
    );
  }, [membershipActions?.upgrade_options, effectiveUpgradeProgramId]);

  // Keep selected upgrade package aligned when program changes
  React.useEffect(() => {
    if (isUpgradeModalOpen && filteredUpgradeOptions.length > 0) {
      if (!filteredUpgradeOptions.some((opt) => opt.package_id === selectedUpgradePackageId)) {
        setSelectedUpgradePackageId(filteredUpgradeOptions[0].package_id);
      }
    }
  }, [isUpgradeModalOpen, filteredUpgradeOptions, selectedUpgradePackageId]);

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

      const [profRes, credRes, bookRes, trainRes, ptRes, branchRes, catRes, parqRes, actionsRes] = await Promise.allSettled([
        mobileApi.getProfile(),
        mobileApi.getMyCredits(),
        mobileApi.getMyBookings(),
        mobileApi.getTrainers(),
        mobileApi.getPTAppointments(),
        mobileApi.getBranches(),
        mobileApi.getCategories(),
        mobileApi.getPARQSurvey(),
        mobileApi.getMembershipActions(),
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
          const waitlisted = (raw.waitlisted || []).map((b: any) => ({
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
          list = [...upcoming, ...waitlisted, ...past];
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
            location_name: b.location_name || "",
            address: b.address || "",
            city: b.city || "",
            phone: b.phone || "",
          }))
        );
      }

      if (catRes.status === "fulfilled" && catRes.value?.data) {
        const rawCats = Array.isArray(catRes.value.data) ? catRes.value.data : [];
        if (rawCats.length > 0) {
          setCategories(rawCats);
        }
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

      if (actionsRes.status === "fulfilled" && actionsRes.value?.data) {
        setMembershipActions(actionsRes.value.data as MobileMembershipActionOptions);
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

  // Action Handlers for Membership Self-Service
  const handleRenewSubmit = async () => {
    if (!selectedRenewPackageId) {
      toast.error("Please select a package to renew.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const payload: any = {
        branch_id: selectedRenewBranchId || membershipActions?.active_membership?.branch_id,
        package_id: selectedRenewPackageId,
        parq_decision: renewParqDecision,
      };
      if (parqSurvey?.submission?.id) {
        payload.existing_submission_id = parqSurvey.submission.id;
      }
      if (renewParqDecision === 'EDIT' || renewParqDecision === 'NEW') {
        if (parqCanvasRef.current && parqHasSignature) {
          payload.signature_data = parqCanvasRef.current.toDataURL('image/png');
        }
        payload.answers = parqFormResponses;
      }

      const res = await mobileApi.renewMembership(payload);
      const data = res.data;

      if (data.requires_payment && data.order_id && data.razorpay_order_id) {
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || data.total_amount || 0,
          amountInPaise: data.amount_paise,
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Membership Renewal',
          description: `Renewal: ${data.package_name}`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            toast.success(verifyRes.data.detail || "Membership renewed and activated successfully!");
            setIsRenewModalOpen(false);
            setIsSubmittingAction(false);
            await fetchAllData();
          },
          onCancel: () => {
            setIsSubmittingAction(false);
          },
          onFailure: () => {
            setIsSubmittingAction(false);
          },
        });
      } else {
        toast.success(data.detail || "Renewal processed successfully!");
        setIsRenewModalOpen(false);
        setIsSubmittingAction(false);
        await fetchAllData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to initiate renewal.");
      setIsSubmittingAction(false);
    }
  };

  const handleUpgradeSubmit = async () => {
    if (!selectedUpgradePackageId) {
      toast.error("Please select an upgrade package.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const payload: any = {
        target_branch_id: selectedUpgradeBranchId || membershipActions?.active_membership?.branch_id,
        target_program_id: selectedUpgradeProgramId || membershipActions?.active_membership?.program_id,
        target_package_id: selectedUpgradePackageId,
        reason: upgradeReason || "Self-service package upgrade",
        parq_decision: upgradeParqDecision,
      };
      if (parqSurvey?.submission?.id) {
        payload.existing_submission_id = parqSurvey.submission.id;
      }
      if (upgradeParqDecision === 'EDIT' || upgradeParqDecision === 'NEW') {
        if (parqCanvasRef.current && parqHasSignature) {
          payload.signature_data = parqCanvasRef.current.toDataURL('image/png');
        }
        payload.answers = parqFormResponses;
      }

      const res = await mobileApi.upgradeMembership(payload);
      const data = res.data;

      if (data.requires_payment && data.order_id && data.razorpay_order_id) {
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || data.price_difference || 0,
          amountInPaise: data.amount_paise,
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Package Upgrade',
          description: `Upgrade to: ${data.target_package_name}`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            toast.success(verifyRes.data.detail || "Membership upgraded successfully!");
            setIsUpgradeModalOpen(false);
            setUpgradeReason("");
            setIsSubmittingAction(false);
            await fetchAllData();
          },
          onCancel: () => {
            setIsSubmittingAction(false);
          },
          onFailure: () => {
            setIsSubmittingAction(false);
          },
        });
      } else {
        toast.success(data.detail || "Membership upgraded successfully!");
        setIsUpgradeModalOpen(false);
        setUpgradeReason("");
        setIsSubmittingAction(false);
        await fetchAllData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to process upgrade.");
      setIsSubmittingAction(false);
    }
  };

  const handleExtendSubmit = async () => {
    try {
      setIsSubmittingAction(true);
      const res = await mobileApi.extendMembership({
        days: extendDays,
        reason: extendReason || `Self-service extension of ${extendDays} days`,
      });
      const data = res.data;

      if (data.requires_payment && data.order_id && data.razorpay_order_id) {
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || 0,
          amountInPaise: data.amount_paise,
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Validity Extension',
          description: `Extension: ${extendDays} Days`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            toast.success(verifyRes.data.detail || `Validity extended by ${extendDays} days!`);
            setIsExtendModalOpen(false);
            setExtendReason("");
            setIsSubmittingAction(false);
            await fetchAllData();
          },
          onCancel: () => {
            setIsSubmittingAction(false);
          },
          onFailure: () => {
            setIsSubmittingAction(false);
          },
        });
      } else {
        toast.success(data.detail || `Validity extended by ${extendDays} days!`);
        setIsExtendModalOpen(false);
        setExtendReason("");
        setIsSubmittingAction(false);
        await fetchAllData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to request extension.");
      setIsSubmittingAction(false);
    }
  };

  const handleFreezeSubmit = async () => {
    if (!freezeStartDate || !freezeEndDate) {
      toast.error("Freeze start and end dates are required.");
      return;
    }
    try {
      setIsSubmittingAction(true);
      const res = await mobileApi.freezeMembership({
        freeze_from: freezeStartDate,
        freeze_until: freezeEndDate,
        reason: freezeReason || "Self-service membership freeze",
      });
      const data = res.data;

      if (data.requires_payment && data.order_id && data.razorpay_order_id) {
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || 0,
          amountInPaise: data.amount_paise,
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Membership Freeze',
          description: `Freeze membership: ${data.days} Days`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            toast.success(verifyRes.data.detail || "Membership frozen successfully.");
            setIsFreezeModalOpen(false);
            setFreezeReason("");
            setFreezeStartDate("");
            setFreezeEndDate("");
            setIsSubmittingAction(false);
            await fetchAllData();
          },
          onCancel: () => {
            setIsSubmittingAction(false);
          },
          onFailure: () => {
            setIsSubmittingAction(false);
          },
        });
      } else {
        toast.success(data.detail || "Membership frozen successfully. Validity extended.");
        setIsFreezeModalOpen(false);
        setFreezeReason("");
        setFreezeStartDate("");
        setFreezeEndDate("");
        setIsSubmittingAction(false);
        await fetchAllData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to freeze membership.");
      setIsSubmittingAction(false);
    }
  };

  const handleUnfreezeSubmit = async () => {
    try {
      setIsUnfreezing(true);
      const res = await mobileApi.unfreezeMembership({ reason: "Self-service unfreeze requested by member" });
      toast.success(res.data.detail || "Membership unfreezed and restored to Active status!");
      setIsFreezeModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to unfreeze membership.");
    } finally {
      setIsUnfreezing(false);
    }
  };


  const handleSubmitPARQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsParqSubmitting(true);
    try {
      let signatureData = "";
      if (parqCanvasRef.current && parqHasSignature) {
        signatureData = parqCanvasRef.current.toDataURL("image/png");
      }

      const res = await mobileApi.submitPARQSurvey({
        answers: parqFormResponses,
        par_q: parqFormResponses,
        agreement_accepted: parqConsentAccepted,
        signature_data: signatureData || undefined,
      });

      toast.success(res.data?.detail || "PAR-Q health assessment saved and cleared!");
      await fetchAllData();
    } catch (err: any) {
      console.error("Failed to submit PAR-Q:", err);
      toast.error(err.response?.data?.detail || err.message || "Failed to update PAR-Q. Please verify required fields.");
    } finally {
      setIsParqSubmitting(false);
    }
  };

  const clearParqSignature = () => {
    const canvas = parqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setParqHasSignature(false);
  };

  const startParqDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = parqCanvasRef.current;
    if (!canvas) return;
    if (canvas.width === 0 || canvas.height === 0) {
      setupParqCanvas();
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getParqCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setParqIsDrawing(true);
  };

  const drawParq = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!parqIsDrawing) return;
    const canvas = parqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getParqCanvasCoords(e, canvas);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    ctx.lineWidth = 2.5 * scaleX;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
    setParqHasSignature(true);
  };

  const stopParqDraw = () => {
    setParqIsDrawing(false);
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

  const handleOpenQRPass = async () => {
    setShowQRPassModal(true);
    setIsQRPassLoading(true);
    try {
      const res = await mobileApi.getQRPass();
      setQrPassData({
        pass_id: res.data.pass_id,
        booking_id: (res.data as any).booking_id,
        booking_number: (res.data as any).booking_number,
        qr_token: (res.data as any).compact_token || res.data.qr_payload,
        class_name: (res.data as any).class_name,
        branch_name: (res.data as any).branch_name,
        start_at: (res.data as any).start_at,
        valid_from: (res.data as any).valid_from,
        valid_until: res.data.valid_until,
        member_name: res.data.member_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Studio Member"),
        membership_number: res.data.membership_number || profile?.membership_number || "MEM-1CCA18",
        status: (res.data as any).status || "CONFIRMED",
        pass_type: 'CLASS_BOOKING',
        has_booking: true,
      });
    } catch (err: any) {
      console.warn("[SWEAT Member Portal] getQRPass:", err);
      const detailMsg = err?.response?.data?.detail || "No confirmed class booking found for today. Please reserve a class session to generate your turnstile access key.";
      setQrPassData({
        has_booking: false,
        detail: detailMsg,
        member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Studio Member",
        membership_number: profile?.membership_number || "MEM-1CCA18",
      });
    } finally {
      setIsQRPassLoading(false);
    }
  };

  const handleOpenBookingQRPass = async (booking: MobileBooking) => {
    setShowQRPassModal(true);
    setIsQRPassLoading(true);
    try {
      const res = await mobileApi.getBookingQRPass(booking.id);
      setQrPassData({
        pass_id: res.data.pass_id,
        booking_id: res.data.booking_id,
        booking_number: res.data.booking_number,
        qr_token: res.data.qr_token || res.data.compact_token || res.data.qr_payload,
        class_name: res.data.class_name || booking.class_name,
        branch_name: res.data.branch_name || booking.branch?.name,
        valid_from: (res.data as any).valid_from,
        valid_until: res.data.valid_until,
        status: res.data.status || "CONFIRMED",
        member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Studio Member",
        membership_number: profile?.membership_number || "MEM-1CCA18",
        pass_type: 'CLASS_BOOKING',
        has_booking: true,
      });
    } catch (err: any) {
      console.warn("[SWEAT Member Portal] getBookingQRPass error:", err);
      toast.error(err?.response?.data?.detail || "Failed to load booking access pass.");
      setShowQRPassModal(false);
    } finally {
      setIsQRPassLoading(false);
    }
  };

  const handleConfirmBookClass = async () => {
    if (!bookingSlotToConfirm) return;
    setIsBookingSubmitting(true);
    try {
      await mobileApi.bookClass(bookingSlotToConfirm.id);
      toast.success("Workout slot successfully booked!");
      setBookingSlotToConfirm(null);
      void fetchAllData(false);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to book class.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleBookingTarget || !rescheduleNewOccurrenceId) return;
    setIsReschedulingSubmitting(true);
    try {
      await mobileApi.rescheduleBooking(rescheduleBookingTarget.id, rescheduleNewOccurrenceId);
      toast.success("Workout slot successfully rescheduled!");
      setRescheduleBookingTarget(null);
      setRescheduleNewOccurrenceId("");
      void fetchAllData(false);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to reschedule booking.");
    } finally {
      setIsReschedulingSubmitting(false);
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    setIsCancellingSubmitting(true);
    try {
      const res = await mobileApi.cancelBooking(cancelBookingTarget.id);
      if (res.data?.refunded) {
        toast.success("Booking cancelled. 1 session credit refunded to your passbook.");
      } else {
        toast.warning(res.data?.detail || "Booking cancelled. Session credit forfeited per gym policy.");
      }
      setCancelBookingTarget(null);
      void fetchAllData(false);
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to cancel booking.");
    } finally {
      setIsCancellingSubmitting(false);
    }
  };

  const handleConfirmBookPT = async () => {
    if (!ptTrainerToBook) return;
    setIsPtSubmitting(true);
    try {
      await mobileApi.bookPTAppointment({
        trainer_id: ptTrainerToBook.id,
        appointment_date: ptBookingForm.date,
        start_time: ptBookingForm.time,
        focus_area: ptBookingForm.focus,
        notes: ptBookingForm.notes,
      });
      toast.success("Personal training session requested successfully!");
      setPtTrainerToBook(null);
      void fetchAllData(false);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to book personal training.");
    } finally {
      setIsPtSubmitting(false);
    }
  };

  const isParqCleared = parqSurvey?.is_cleared ?? true;

  const handleCancelPTAppointment = async (apptId: string) => {
    try {
      await mobileApi.cancelPTAppointment(apptId);
      toast.success("Personal training appointment cancelled.");
      void fetchAllData(false);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to cancel appointment.");
    }
  };

  // Date Pills for 7-day schedule selector
  const next7Days = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      list.push(addDays(today, i));
    }
    return list;
  }, []);

  // Authoritative Class Categories for filter bar
  const displayCategories = React.useMemo(() => {
    if (categories.length > 0) return categories;
    const unique = new Map<string, { id: string; name: string }>();
    schedule.forEach((s) => {
      if (s.category && !unique.has(s.category)) {
        unique.set(s.category, { id: (s as any).category_id || s.category, name: s.category });
      }
    });
    return Array.from(unique.values());
  }, [categories, schedule]);

  // Load Schedule with rapid-click debounce protection and category resolution
  const fetchSchedule = React.useCallback(async () => {
    const currentReqId = ++scheduleReqIdRef.current;
    setIsScheduleLoading(true);
    setScheduleError(null);
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
      if (currentReqId !== scheduleReqIdRef.current) {
        return; // Discard stale response
      }

      if (res.data) {
        const raw = res.data as any;
        if (raw.categories && Array.isArray(raw.categories) && raw.categories.length > 0) {
          setCategories(raw.categories);
        }
        const rawSlots = Array.isArray(raw) ? raw : (raw.slots || []);
        const normalized: MobileScheduleOccurrence[] = rawSlots.map((s: any) => ({
          id: s.id,
          class_definition_id: s.class_id || s.class_definition_id || "",
          class_name: s.class_name,
          category: s.category || "Bootcamp",
          category_id: s.category_id || "",
          category_code: s.category_code || "",
          description: s.description || "",
          start_time: s.start_at || s.start_time,
          end_time: s.end_at || s.end_time,
          capacity: s.capacity?.total_capacity ?? (typeof s.capacity === "number" ? s.capacity : 10),
          booked_count: s.capacity?.booked_count ?? s.booked_count ?? 0,
          available_spots: s.capacity?.available_seats ?? s.available_spots ?? 10,
          is_full: s.capacity?.is_full ?? s.is_full ?? false,
          is_waitlist_open: s.capacity?.is_waitlist_open ?? s.can_waitlist ?? false,
          booking_state: s.booking_state || (s.capacity?.is_full ? "FULL" : "AVAILABLE"),
          has_started: s.has_started ?? false,
          has_ended: s.has_ended ?? false,
          is_in_progress: s.is_in_progress ?? false,
          is_bookable: s.is_bookable ?? true,
          can_book: s.can_book ?? true,
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
    } catch (err: any) {
      if (currentReqId === scheduleReqIdRef.current) {
        console.error("Failed to load schedule:", err);
        setScheduleError(err?.data?.detail || err?.message || "Failed to load studio schedule.");
      }
    } finally {
      if (currentReqId === scheduleReqIdRef.current) {
        setIsScheduleLoading(false);
      }
    }
  }, [selectedDate, selectedBranchId, selectedCategory]);

  React.useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  // Defensive client-side filtering guarantees zero format or branch leakage
  const filteredSchedule = React.useMemo(() => {
    return schedule.filter((occ) => {
      // Defensive check: Ensure slot matches the selected studio-local calendar date
      if (occ.start_time) {
        const slotDate = new Date(occ.start_time);
        if (!isNaN(slotDate.getTime()) && !isSameDay(slotDate, selectedDate)) {
          return false;
        }
      }
      if (selectedBranchId !== "all") {
        if (!occ.branch?.id || occ.branch.id !== selectedBranchId) {
          return false;
        }
      }
      if (selectedCategory !== "all") {
        const occCatId = (occ as any).category_id ? String((occ as any).category_id).toLowerCase() : "";
        const occCatCode = (occ as any).category_code ? String((occ as any).category_code).trim().toLowerCase() : "";
        const occCatName = occ.category ? occ.category.trim().toLowerCase() : "";
        const sel = selectedCategory.trim().toLowerCase();
        const matchId = occCatId && occCatId === sel;
        const matchCode = occCatCode && (occCatCode === sel || occCatCode.includes(sel));
        const matchName = occCatName === sel || occCatName.includes(sel) || sel.includes(occCatName);
        if (!matchId && !matchCode && !matchName) {
          return false;
        }
      }
      return true;
    });
  }, [schedule, selectedDate, selectedBranchId, selectedCategory]);

  const totalCredits = membershipActions?.active_membership?.total_sessions ?? profile?.total_sessions ?? 20;
  const remainingCredits = membershipActions?.active_membership?.remaining_sessions ?? profile?.remaining_sessions ?? 12;
  const usedCredits = Math.max(0, totalCredits - remainingCredits);
  const passUsagePercent = totalCredits > 0 ? Math.round((usedCredits / totalCredits) * 100) : 0;
  const validityUntil = membershipActions?.active_membership?.end_date
    ? new Date(membershipActions.active_membership.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : profile?.end_date
    ? new Date(profile.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Nov 30, 2026";

  const endIso = membershipActions?.active_membership?.end_date ?? profile?.end_date;
  const daysRemaining = endIso ? Math.max(0, Math.ceil((new Date(endIso).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 45;

  const upcomingBookings = React.useMemo(() => {
    const now = new Date();
    return (bookings || []).filter((b) => {
      const isConfirmed = b.status === "CONFIRMED" || b.status === "BOOKED" || b.status === "SCHEDULED";
      if (!isConfirmed) return false;
      const endTime = b.end_time || b.start_time;
      if (endTime) {
        return new Date(endTime) > now;
      }
      return true;
    });
  }, [bookings]);

  const attendanceHistory = React.useMemo(() => {
    const now = new Date();
    return (bookings || []).filter((b) => {
      const isHistoricalStatus = b.status === "ATTENDED" || b.status === "COMPLETED" || b.status === "NO_SHOW" || b.status === "CANCELLED" || b.status === "LATE" || b.status === "LATE_ENTRY" || b.status === "LATE_SHOW";
      if (isHistoricalStatus) return true;
      const endTime = b.end_time || b.start_time;
      if (endTime && new Date(endTime) <= now) return true;
      return false;
    });
  }, [bookings]);

  const nextWorkout = React.useMemo(() => {
    return upcomingBookings.length > 0 ? upcomingBookings[0] : null;
  }, [upcomingBookings]);

  const todayConfirmedBooking = React.useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    return (bookings || []).find((b) => {
      if (b.status !== "CONFIRMED" && b.status !== "BOOKED" && b.status !== "SCHEDULED") return false;
      const bDate = b.start_time ? b.start_time.split("T")[0] : "";
      if (bDate !== todayStr) return false;
      const endTime = b.end_time || b.start_time;
      if (endTime && new Date(endTime) <= now) return false;
      return true;
    });
  }, [bookings]);

  const primaryPass = React.useMemo(() => {
    return {
      package_name: membershipActions?.active_membership?.package_name || profile?.membership_plan || "Strength & Conditioning",
      valid_from: profile?.start_date || new Date().toISOString(),
      valid_until: membershipActions?.active_membership?.end_date || profile?.end_date || new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  }, [membershipActions, profile]);

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
                  {profile?.home_branch ? (
                    branches.find((b) => b.id === profile.home_branch?.id)?.location_name
                      ? `${profile.home_branch.name} (${branches.find((b) => b.id === profile.home_branch?.id)?.location_name})`
                      : profile.home_branch.name
                  ) : "Bandra West Flagship"}
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
              {SHOW_MEMBER_PT && (
                <TabsTrigger value="pt" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                  <Dumbbell className="h-4 w-4" />
                  Personal Training (PT)
                </TabsTrigger>
              )}
              <TabsTrigger value="passbook" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Membership & Passbook
              </TabsTrigger>
              <TabsTrigger value="parq" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                <HeartPulse className="h-4 w-4" />
                PAR-Q Health Clearance
              </TabsTrigger>
              {/* Parallel Nutrition & Wellness tab isolated */}
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
                      {b.name}{b.location_name ? ` (${b.location_name})` : ""}
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
            {displayCategories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    selectedCategory === "all"
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Formats
                </button>
                {displayCategories.map((cat: any) => {
                  const catName = typeof cat === 'string' ? cat : cat.name;
                  const catId = typeof cat === 'string' ? cat : (cat.id || cat.name);
                  const isSelected = selectedCategory === catName || selectedCategory === catId;
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategory(isSelected ? "all" : catName)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Schedule Slot Cards List & States */}
            {isScheduleLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="border border-border/60 bg-card p-5 space-y-4 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-24 bg-muted rounded-full" />
                      <div className="h-4 w-16 bg-muted rounded-full" />
                    </div>
                    <div className="h-6 w-3/4 bg-muted rounded-md" />
                    <div className="h-4 w-1/2 bg-muted rounded-md" />
                    <div className="h-16 bg-muted/40 rounded-xl" />
                    <div className="h-9 w-full bg-muted rounded-xl" />
                  </Card>
                ))}
              </div>
            ) : scheduleError ? (
              <div className="text-center py-12 px-4 border border-rose-500/20 rounded-2xl bg-rose-500/[0.03]">
                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">Failed to Load Studio Schedule</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                  {scheduleError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchSchedule()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Loading
                </Button>
              </div>
            ) : filteredSchedule.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-2xl bg-card/40">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">No Classes Scheduled for This Day</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  {selectedBranchId !== "all" || selectedCategory !== "all"
                    ? "No sessions match your selected branch or format filters. Try resetting filters or choosing another date."
                    : `There are no group sessions scheduled on ${format(selectedDate, "EEEE, MMMM d")}. Please choose another date above or switch to a different studio branch.`}
                </p>
                {(selectedBranchId !== "all" || selectedCategory !== "all") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBranchId("all");
                      setSelectedCategory("all");
                    }}
                    className="text-xs gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {filteredSchedule.map((occ) => {
                  const startTime = safeFormatDate(occ.start_time, "hh:mm a");
                  const endTime = safeFormatDate(occ.end_time, "hh:mm a");
                  const hasBooked = occ.user_has_booking;
                  const isFull = occ.is_full;
                  const spots = occ.available_spots;
                  const canJoinWaitlist = occ.is_waitlist_open ?? false;

                  const nowMs = Date.now();
                  const startMs = occ.start_time ? new Date(occ.start_time).getTime() : NaN;
                  const endMs = occ.end_time ? new Date(occ.end_time).getTime() : NaN;
                  const hasEnded = occ.has_ended === true || occ.booking_state === "ENDED" || (!isNaN(endMs) && endMs <= nowMs);
                  const hasStarted = occ.has_started === true || occ.booking_state === "IN_PROGRESS" || (!isNaN(startMs) && startMs <= nowMs);
                  const isInProgress = occ.is_in_progress === true || (hasStarted && !hasEnded);

                  return (
                    <Card
                      key={occ.id}
                      className={`border transition-all flex flex-col justify-between ${
                        hasBooked
                          ? (hasEnded
                              ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                              : "border-emerald-500/60 bg-emerald-500/[0.04] shadow-xs")
                          : hasEnded
                          ? "border-border/40 bg-muted/20 opacity-80"
                          : isInProgress
                          ? "border-amber-500/30 bg-amber-500/[0.02]"
                          : isFull
                          ? "border-border/50 bg-card/50 opacity-90"
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
                          ) : hasEnded ? (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-[10px] font-semibold gap-1">
                              <Clock className="h-3 w-3" /> Class Ended
                            </Badge>
                          ) : isInProgress ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold gap-1">
                              <Clock className="h-3 w-3" /> In Progress
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="secondary" className={`text-[10px] font-semibold ${canJoinWaitlist ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-muted-foreground'}`}>
                              {canJoinWaitlist ? "Waitlist Available" : "Full"}
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
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0 overflow-hidden">
                            {occ.trainer?.avatar_url ? (
                              <img src={occ.trainer.avatar_url} alt={occ.trainer.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{occ.trainer?.name ? occ.trainer.name.slice(0, 1) : "C"}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-foreground truncate">
                              Coach {occ.trainer?.name || "SWEAT Coach"}
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
                            {hasEnded ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full text-xs font-semibold bg-muted/40 text-muted-foreground cursor-not-allowed border-border"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                Session Completed
                              </Button>
                            ) : isInProgress ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-not-allowed border-amber-500/20"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Session In Progress
                              </Button>
                            ) : (
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
                            )}
                          </div>
                        ) : hasEnded ? (
                          <Button
                            size="sm"
                            disabled
                            className="w-full font-semibold text-xs gap-1.5 bg-muted text-muted-foreground cursor-not-allowed border-border"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Class Ended
                          </Button>
                        ) : isInProgress ? (
                          <Button
                            size="sm"
                            disabled
                            className="w-full font-semibold text-xs gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-not-allowed border-amber-500/20"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Class in Progress
                          </Button>
                        ) : occ.is_included_in_plan === false ? (
                          <div className="space-y-1.5 w-full">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-tight">
                              <Lock className="h-3 w-3 shrink-0" />
                              <span className="truncate">{occ.ineligible_reason || "Not included in active pass"}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast.info(occ.ineligible_reason || `Class '${occ.class_name}' is not included in your active plan.`);
                                setActiveTab("memberships");
                              }}
                              className="w-full font-semibold text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Upgrade Pass to Book
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={(isFull && !canJoinWaitlist) || remainingCredits <= 0}
                            onClick={() => setBookingSlotToConfirm(occ)}
                            className={`w-full font-semibold text-xs gap-1.5 ${
                              isFull && canJoinWaitlist
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            }`}
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {remainingCredits <= 0
                              ? "No Credits Left"
                              : isFull
                              ? (canJoinWaitlist ? "Join Waitlist" : "Class Full")
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
                            variant="default"
                            size="sm"
                            onClick={() => void handleOpenBookingQRPass(b)}
                            className="text-xs font-semibold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            Turnstile QR
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleBookingTarget(b);
                              setRescheduleNewOccurrenceId("");
                            }}
                            className="flex-1 text-xs font-semibold hover:border-primary"
                          >
                            Reschedule
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
                          const isAttended = item.status === "ATTENDED" || item.status === "COMPLETED";
                          const isLate = item.status === "LATE" || item.status === "LATE_ENTRY";
                          const isLateShow = item.status === "LATE_SHOW";
                          const isNoShow = item.status === "NO_SHOW";
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
                                ) : isLate ? (
                                  <Badge className="bg-amber-500 text-white text-[10px]">
                                    Late Entry
                                  </Badge>
                                ) : isLateShow ? (
                                  <Badge className="bg-orange-500 text-white text-[10px]">
                                    Late Show
                                  </Badge>
                                ) : isNoShow ? (
                                  <Badge className="bg-rose-500 text-white text-[10px]">
                                    No Show
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {item.status}
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
          {/* TAB 4: PERSONAL TRAINING (PT) (DEFERRED / HIDDEN)                         */}
          {/* ========================================================================= */}
          {SHOW_MEMBER_PT && (
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
                    setPtTrainerToBook(trainers[0] || null);
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
          )}

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

              {/* Digital Turnstile Pass Card */}
              <Card className="border-border/70 bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    Turnstile QR Access
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {todayConfirmedBooking
                      ? `Session: ${todayConfirmedBooking.class_name || "Workout"} today`
                      : "Booking required for turnstile entry"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  {todayConfirmedBooking ? (
                    <>
                      <div className="p-3 rounded-2xl bg-white border border-border shadow-md">
                        <QRCodeSvg
                          value={todayConfirmedBooking.booking_number ? `BKG_${todayConfirmedBooking.booking_number}` : "SWT_PASS"}
                          size={140}
                          className="rounded-md"
                          title="Today's Session Pass"
                        />
                      </div>
                      <div className="mt-3">
                        <span className="text-sm font-bold text-foreground">
                          {todayConfirmedBooking.class_name || "Reserved Workout"}
                        </span>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {todayConfirmedBooking.booking_number || profile?.membership_number || "MEM-1CCA18"}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 mt-2">
                        CONFIRMED FOR TODAY
                      </Badge>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenBookingQRPass(todayConfirmedBooking)}
                        className="w-full text-xs font-semibold mt-4 gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        Open Turnstile Pass
                      </Button>
                    </>
                  ) : (
                    <div className="w-full py-2 flex flex-col items-center text-center space-y-3">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <Ticket className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">
                          No Workout Booked Today
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                          Turnstile access keys are strictly generated for confirmed class bookings. Book your slot to unlock your pass.
                        </p>
                      </div>
                      {remainingCredits > 0 && (
                        <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[11px] font-semibold px-2.5 py-1">
                          <Zap className="h-3 w-3 fill-primary mr-1" />
                          {remainingCredits} Sessions in Active Package
                        </Badge>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setActiveTab("schedule")}
                        className="w-full text-xs font-semibold mt-2 gap-1.5"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Book Today's Workout
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Membership Self-Service & Lifecycle Management */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40 pt-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Membership Management & Self-Service
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renew your contract, upgrade workout packages, request validity extensions, or freeze membership.
                  </p>
                </div>
                {membershipActions?.active_membership && (
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                    {membershipActions.active_membership.package_name} ({membershipActions.active_membership.status})
                  </Badge>
                )}
              </div>

              {/* Pending Requests Banner */}
              {membershipActions?.pending_requests && membershipActions.pending_requests.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
                    <Clock className="h-4 w-4" />
                    <span>Pending Studio Requests ({membershipActions.pending_requests.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {membershipActions.pending_requests.map((req, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-foreground bg-card/60 p-2.5 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {req.request_type.replace('_', ' ')}:
                          </span>
                          <span className="text-muted-foreground">
                            {req.payload?.['target_package_name']
                              ? `Upgrade to ${req.payload['target_package_name']}`
                              : req.payload?.['days']
                              ? `Extend by ${req.payload['days']} Days`
                              : req.payload?.['freeze_from']
                              ? `Freeze ${req.payload['freeze_from']} to ${req.payload['freeze_until']}`
                              : req.payload?.['reason'] || 'Request recorded'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40 font-mono">
                            {req.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Freeze Banner */}
              {membershipActions?.active_membership?.is_frozen && (
                <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-400">
                      <Snowflake className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Membership is Currently Frozen</span>
                        <Badge className="bg-sky-500 text-white text-[10px]">PAUSED</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {membershipActions?.active_freeze ? (
                          <>Frozen from {safeFormatDate(membershipActions.active_freeze.freeze_from, "dd MMM yyyy")} until {safeFormatDate(membershipActions.active_freeze.freeze_until, "dd MMM yyyy")} ({membershipActions.active_freeze.days} days)</>
                        ) : (
                          <>Class booking and attendance privileges are temporarily on hold. Validity shifts automatically.</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUnfreezeSubmit}
                    disabled={isUnfreezing}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs whitespace-nowrap shadow-sm gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isUnfreezing ? "Resuming..." : "Resume / Unfreeze Now"}
                  </Button>
                </div>
              )}

              {/* 4 Action Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Renew */}
                <Card className="border-border/60 bg-card/80 hover:border-emerald-500/40 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <RotateCcw className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        Renewal
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">Renew Membership</CardTitle>
                    <CardDescription className="text-xs">
                      Renew your current plan or select an eligible renewal package to preserve continuous studio access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        const initBranchId = membershipActions?.active_membership?.branch_id || availableBranches[0]?.id || "";
                        setSelectedRenewBranchId(initBranchId);
                        setSelectedRenewPackageId(membershipActions?.renew_options?.[0]?.package_id || "");
                        setIsRenewModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <span>Renew Package</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 2. Upgrade */}
                <Card className="border-border/60 bg-card/80 hover:border-blue-500/40 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                        Tier Upgrade
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">Upgrade Package</CardTitle>
                    <CardDescription className="text-xs">
                      Upgrade to more session credits or an unlimited workout pass with clear credit and price differences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        const initProgramId = membershipActions?.active_membership?.program_id || membershipActions?.programs?.[0]?.id || "";
                        const initBranchId = membershipActions?.active_membership?.branch_id || availableBranches[0]?.id || "";
                        setSelectedUpgradeProgramId(initProgramId);
                        setSelectedUpgradeBranchId(initBranchId);
                        const firstOpt = (membershipActions?.upgrade_options || []).find((o) => o.program_id === initProgramId);
                        setSelectedUpgradePackageId(firstOpt?.package_id || membershipActions?.upgrade_options?.[0]?.package_id || "");
                        setUpgradeReason("");
                        setIsUpgradeModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <span>Upgrade Tier</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 3. Extend */}
                <Card className="border-border/60 bg-card/80 hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <CalendarPlus className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                        Instant Self-Service
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">Extend Validity</CardTitle>
                    <CardDescription className="text-xs">
                      Request 7, 14, 21, or 30 days extension on your active package for travel or injury recovery.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setExtendDays(7);
                        setExtendReason("");
                        setIsExtendModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                    >
                      <span>Extend Expiry</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                {/* 4. Freeze */}
                <Card className="border-border/60 bg-card/80 hover:border-sky-500/40 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                        <Snowflake className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-500 border-sky-500/20">
                        {membershipActions?.active_membership?.is_frozen ? "Frozen" : "7 - 60 Days"}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">Freeze Membership</CardTitle>
                    <CardDescription className="text-xs">
                      Temporarily pause your workout pass. Total membership validity is automatically extended upon approval.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFreezeStartDate("");
                        setFreezeEndDate("");
                        setFreezeReason("");
                        setIsFreezeModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
                    >
                      <span>{membershipActions?.active_membership?.is_frozen ? "Manage / Unfreeze" : "Freeze Pass"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
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
                  {parqSurvey?.form_name || "Physical Activity Readiness Questionnaire (PAR-Q)"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authoritative health and exercise readiness assessment • Version {parqSurvey?.version_number || 1}
                </p>
              </div>

              <Badge
                className={`font-semibold text-xs py-1 px-3 gap-1.5 ${
                  Boolean(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission)
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {parqSurvey?.status_badge || (Boolean(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission) ? "PAR-Q Cleared" : "PAR-Q Pending")}
              </Badge>
            </div>

            {/* Check if Member has a completed PAR-Q on file */}
            {Boolean(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission) ? (
              /* ========================================================================= */
              /* COMPLETED PAR-Q VIEW: STRICTLY VIEW-ONLY, IMMUTABLE HISTORICAL RECORD     */
              /* ========================================================================= */
              (() => {
                const subHistory = (parqSurvey?.submission_history && parqSurvey.submission_history.length > 0)
                  ? parqSurvey.submission_history
                  : (parqSurvey?.submission ? [parqSurvey.submission] : []);
                const activeSub = subHistory[selectedHistoryIdx] || parqSurvey?.submission;
                const isViewingLatest = selectedHistoryIdx === 0;

                return (
                  <div className="space-y-5">
                    {/* Active Clearance Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                            <h3 className="font-bold text-sm sm:text-base text-foreground">
                              PAR-Q Health Clearance on File
                            </h3>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                              Active Clearance
                            </Badge>
                            {subHistory.length > 1 && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-mono gap-1">
                                <History className="h-3 w-3" />
                                <span>{subHistory.length} Total Versions</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Your completed medical readiness responses and verified digital signature are on file. All studio class bookings are unlocked.
                          </p>
                        </div>

                        {activeSub?.submitted_at && (
                          <div className="text-right text-xs text-muted-foreground font-mono shrink-0">
                            Completed: <strong>{new Date(activeSub.submitted_at).toLocaleDateString()}</strong>
                          </div>
                        )}
                      </div>

                      {/* Summary Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Signer Identity</span>
                          <span className="font-semibold text-foreground truncate block">
                            {activeSub?.signer_identity || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Member')}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Form Version</span>
                          <span className="font-semibold text-foreground font-mono">
                            v{activeSub?.version_number || parqSurvey?.version_number || 1} • {parqSurvey?.questions?.length || 15} Questions
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Booking Eligibility</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cleared for All Workouts
                          </span>
                        </div>
                      </div>

                      {/* Digital Signature Preview */}
                      {activeSub?.signature_data && (
                        <div className="pt-2 border-t border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground">Verified Digital Signature:</span>
                            <div className="p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-2xs">
                              <img src={activeSub.signature_data} alt="Member Signature" className="h-9 max-w-[150px] object-contain" />
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Signed on {activeSub.submitted_at ? new Date(activeSub.submitted_at).toLocaleDateString() : 'on file'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Version History Selector Pills (if multiple revisions exist) */}
                    {subHistory.length > 1 && (
                      <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-primary" />
                            <span>PAR-Q Submission Version History</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Select version to inspect historical responses
                          </span>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                          {subHistory.map((sub: any, sIdx: number) => {
                            const isSelected = sIdx === selectedHistoryIdx;
                            const isLatest = sIdx === 0;
                            const revNum = sub.revision_number || (subHistory.length - sIdx);

                            return (
                              <button
                                key={sub.id || sIdx}
                                type="button"
                                onClick={() => setSelectedHistoryIdx(sIdx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
                                  isSelected
                                    ? isLatest
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                <span>{isLatest ? `Latest (Rev #${revNum})` : `Revision #${revNum}`}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'} font-mono`}>
                                  • {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed Questionnaire Responses Card (Strictly Read-Only) */}
                    <Card className="border-border/70 bg-card shadow-xs">
                      <CardHeader className="border-b border-border/40 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-bold text-foreground">
                              Readiness Self-Assessment Responses
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {isViewingLatest
                                ? "Current verified medical readiness responses on file with studio records."
                                : `Historical responses recorded on ${activeSub?.submitted_at ? new Date(activeSub.submitted_at).toLocaleDateString() : 'earlier date'}.`}
                            </CardDescription>
                          </div>
                          {!isViewingLatest && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              Archived Version
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-5 space-y-3">
                        {parqSurvey?.questions && parqSurvey.questions.length > 0 ? (
                          parqSurvey.questions.map((q: any) => {
                            const qId = q.id;
                            const subAnswers = activeSub?.answers || {};
                            const val = subAnswers[qId] ?? subAnswers[`q_${q.order}`] ?? subAnswers[String(q.order)] ?? parqFormResponses[qId] ?? parqFormResponses[`q_${q.order}`];
                            const isYes = val === true || val === 'yes' || val === 'YES' || val === 'true';
                            const isNo = val === false || val === 'no' || val === 'NO' || val === 'false';

                            return (
                              <div
                                key={qId}
                                className="p-3.5 rounded-xl border border-border/70 bg-accent/5 space-y-2"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                                    <span className="font-mono text-muted-foreground mr-1.5">Q{q.order}.</span>
                                    {q.text}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {q.is_sensitive && (
                                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                                        Protected Health Info
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-1">
                                  {q.type === 'BOOLEAN' || isYes || isNo ? (
                                    <Badge
                                      variant="outline"
                                      className={`text-xs px-2.5 py-0.5 font-bold ${
                                        isYes
                                          ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                                          : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                      }`}
                                    >
                                      {isYes ? 'YES' : 'NO'}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs font-semibold text-foreground px-2.5 py-1 bg-background rounded-lg border border-border/60 inline-block">
                                      {val !== undefined && val !== null && val !== '' ? String(val) : 'No response recorded'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            All PAR-Q health answers are securely saved and cleared on file.
                          </p>
                        )}

                        {/* Informational notice: Completed PAR-Q is View-Only */}
                        <div className="mt-6 p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">
                              Need to update your health answers or medical status?
                            </span>
                            <p className="text-[11px]">
                              To protect health record integrity, questionnaire answers cannot be overwritten from this viewing screen. Options to reuse, revise, or complete a new form will be presented during your next package purchase, renewal, or tier upgrade.
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] bg-background text-muted-foreground">
                            View-Only Mode
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()
            ) : (
              /* ========================================================================= */
              /* FIRST-TIME SUBMISSION FORM (ONLY DISPLAYED IF MEMBER HAS NO PAR-Q ON FILE) */
              /* ========================================================================= */
              <Card className="border-border/70 bg-card shadow-xs">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-base font-bold text-foreground">
                    Readiness Self-Assessment & Studio Onboarding
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Please answer each question honestly to ensure safe and personalized exercise programming.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmitPARQ} className="space-y-8">
                    {/* Dynamic Questions rendering from backend */}
                    {parqSurvey?.questions && parqSurvey.questions.length > 0 ? (
                      <div className="space-y-6">
                        {parqSurvey.questions.map((q: any) => {
                          const qId = q.id;
                          const val = parqFormResponses[qId] ?? parqFormResponses[`q_${q.order}`] ?? parqFormResponses[String(q.order)];
                          const hasAnswer = val !== undefined && val !== null && val !== '';

                          return (
                            <div
                              key={qId}
                              className={`p-4 rounded-xl border transition-colors space-y-3 ${
                                hasAnswer ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/70 bg-accent/5'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                                  <span className="font-mono text-muted-foreground mr-1.5">Q{q.order}.</span>
                                  {q.text}
                                  {q.is_required ? (
                                    <span className="text-rose-500 ml-1 font-bold">*</span>
                                  ) : (
                                    <span className="text-muted-foreground font-normal text-xs ml-1.5">(Optional)</span>
                                  )}
                                </label>
                                <div className="flex items-center gap-2">
                                  {hasAnswer && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      <span>Answer on file</span>
                                    </span>
                                  )}
                                  {q.is_sensitive && (
                                    <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/20 shrink-0">
                                      Protected Health Info
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Control based on question type */}
                              {q.type === 'BOOLEAN' ? (
                                <div className="flex items-center gap-2 pt-1 max-w-xs">
                                  <button
                                    type="button"
                                    onClick={() => setParqFormResponses((prev) => ({ ...prev, [qId]: true, [`q_${q.order}`]: true }))}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                      val === true || val === 'yes' || val === 'YES' || val === 'true'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setParqFormResponses((prev) => ({ ...prev, [qId]: false, [`q_${q.order}`]: false }))}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                      val === false || val === 'no' || val === 'NO' || val === 'false'
                                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-700 shadow-xs'
                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : q.type === 'SINGLE_SELECT' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                  {(q.options || []).map((opt: any) => {
                                    const isSelected = val === opt.value || val === opt.label;
                                    return (
                                      <button
                                        key={opt.value || opt.label}
                                        type="button"
                                        onClick={() => setParqFormResponses((prev) => ({ ...prev, [qId]: opt.value || opt.label, [`q_${q.order}`]: opt.value || opt.label }))}
                                        className={`p-2.5 rounded-lg text-xs text-left font-medium border transition-all ${
                                          isSelected
                                            ? 'bg-primary/10 text-primary border-primary font-semibold shadow-xs'
                                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                        }`}
                                      >
                                        {opt.label || opt.value}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <Input
                                  value={val ?? ''}
                                  onChange={(e) => setParqFormResponses((prev) => ({ ...prev, [qId]: e.target.value, [`q_${q.order}`]: e.target.value }))}
                                  placeholder="Type your response..."
                                  className="text-xs"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-xl">
                        <HeartPulse className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Standard studio fitness readiness questions will load shortly.</p>
                      </div>
                    )}

                    {/* Legal Consent & Terms Acceptance */}
                    <div className="border-t border-border/40 pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>Physical Activity Readiness Consent Agreement</span>
                        </h4>
                        <span className="text-[11px] font-mono text-muted-foreground">Studio Legal v{parqSurvey?.version_number || 1}</span>
                      </div>

                      <div className="p-4 rounded-xl border border-border/70 bg-muted/20 text-xs text-muted-foreground max-h-36 overflow-y-auto leading-relaxed">
                        {parqSurvey?.agreement_text ? (
                          <p className="whitespace-pre-line">{parqSurvey.agreement_text}</p>
                        ) : (
                          <span>
                            I confirm that I have answered the Physical Activity Readiness Questionnaire truthfully to the best of my knowledge. I understand that physical activity involves inherent risk of injury, and I voluntarily choose to participate in fitness sessions provided by SWEAT. I consent to emergency medical treatment if necessary and release the facility and instructors from liability for injuries arising out of normal workout programming.
                          </span>
                        )}
                      </div>

                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={parqConsentAccepted}
                          onChange={(e) => setParqConsentAccepted(e.target.checked)}
                          className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-foreground">
                            I explicitly confirm that I have reviewed, understood, and agree to the Physical Activity Readiness terms above.
                          </span>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            I acknowledge that completing this assessment is mandatory before booking classes.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Digital Signature Canvas Area */}
                    <div className="border-t border-border/40 pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                          <PenTool className="h-4 w-4 text-primary" />
                          <span>Member Digital Signature</span>
                          <span className="text-muted-foreground font-normal text-xs">(Touch or mouse)</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearParqSignature}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Clear & Redraw</span>
                        </Button>
                      </div>

                      <div className="relative rounded-2xl border-2 border-dashed border-border bg-white dark:bg-zinc-950 overflow-hidden shadow-inner">
                        <canvas
                          ref={parqCanvasRef}
                          onMouseDown={startParqDraw}
                          onMouseMove={drawParq}
                          onMouseUp={stopParqDraw}
                          onMouseLeave={stopParqDraw}
                          onTouchStart={startParqDraw}
                          onTouchMove={drawParq}
                          onTouchEnd={stopParqDraw}
                          className="w-full h-32 block cursor-crosshair touch-none"
                        />
                        {!parqHasSignature && (
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-muted-foreground/60 select-none">
                            <PenTool className="w-5 h-5 mb-1 opacity-40" />
                            <p className="text-xs font-medium">Draw your digital signature here using mouse, touch, or stylus</p>
                            <p className="text-[10px] opacity-75">Touch-screen devices fully supported</p>
                          </div>
                        )}
                        <div className="pointer-events-none absolute bottom-2 left-4 right-4 border-b border-muted-foreground/20 flex justify-between text-[10px] text-muted-foreground/50 pb-0.5">
                          <span>Sign above this line</span>
                          <span>{parqHasSignature ? "✓ Signature Captured" : "Signature Required"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                      <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                        Submitting clears your health assessment requirement and unlocks studio class bookings.
                      </p>
                      <Button
                        type="submit"
                        disabled={isParqSubmitting || !parqConsentAccepted || !parqHasSignature}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-5 gap-2 rounded-xl shadow-xs shrink-0 w-full sm:w-auto"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {isParqSubmitting
                          ? "Saving..."
                          : "Save & Confirm PAR-Q Clearance"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
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

          {/* Parallel Nutrition & Wellness tab isolated */}
        </Tabs>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: 1-CLICK CLASS BOOKING CONFIRMATION                               */}
      {/* ========================================================================= */}
      <Dialog open={!!bookingSlotToConfirm} onOpenChange={(open) => !open && setBookingSlotToConfirm(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Confirm Workout Reservation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              1 session credit will be deducted from your active passbook.
            </DialogDescription>
          </DialogHeader>

          {bookingSlotToConfirm && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
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

              {bookingSlotToConfirm.is_included_in_plan === false ? (
                <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-destructive font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Package Ineligibility</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {bookingSlotToConfirm.ineligible_reason || "This class is not included in your active pass. Please upgrade your package to book."}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-card border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Current Available Balance:</span>
                    <span className="font-semibold text-foreground">{remainingCredits} {remainingCredits === 1 ? 'Session' : 'Sessions'}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Reservation Cost:</span>
                    <span className="font-semibold text-rose-500">-1 Session</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="font-medium text-foreground">Passbook Balance After Booking:</span>
                    <span className="font-bold text-emerald-500">{Math.max(0, remainingCredits - 1)} {remainingCredits - 1 === 1 ? 'Session' : 'Sessions'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookingSlotToConfirm(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            {bookingSlotToConfirm?.is_included_in_plan === false ? (
              <Button
                size="sm"
                onClick={() => {
                  setBookingSlotToConfirm(null);
                  setActiveTab("memberships");
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
              >
                View Eligible Packages
              </Button>
            ) : (() => {
              const nowMs = Date.now();
              const isPast = Boolean(
                bookingSlotToConfirm?.has_ended ||
                bookingSlotToConfirm?.booking_state === "ENDED" ||
                (bookingSlotToConfirm?.end_time && new Date(bookingSlotToConfirm.end_time).getTime() <= nowMs) ||
                bookingSlotToConfirm?.has_started ||
                bookingSlotToConfirm?.booking_state === "IN_PROGRESS" ||
                (bookingSlotToConfirm?.start_time && new Date(bookingSlotToConfirm.start_time).getTime() <= nowMs)
              );
              return (
                <Button
                  size="sm"
                  disabled={isBookingSubmitting || remainingCredits <= 0 || isPast}
                  onClick={handleConfirmBookClass}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                >
                  {isBookingSubmitting
                    ? "Reserving..."
                    : isPast
                    ? "Class Has Ended"
                    : "Confirm & Reserve Spot"}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE BOOKING MODAL                                         */}
      {/* ========================================================================= */}
      <Dialog open={!!rescheduleBookingTarget} onOpenChange={(open) => !open && setRescheduleBookingTarget(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-lg h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Reschedule Workout Slot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select another available class slot to transfer your session reservation without losing credits.
            </DialogDescription>
          </DialogHeader>

          {rescheduleBookingTarget && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
              <div className="p-3 rounded-xl border border-border/70 bg-accent/20">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Currently Booked:</span>
                <h5 className="text-sm font-bold text-foreground">{rescheduleBookingTarget.class_name}</h5>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDate(rescheduleBookingTarget.start_time, "EEE, MMM dd · hh:mm a")}
                </p>
              </div>

              {rescheduleBookingTarget.can_reschedule === false ? (
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Rescheduling Window Closed</span>
                  </div>
                  <p className="text-muted-foreground">
                    Per gym policy, bookings cannot be rescheduled within {rescheduleBookingTarget.rescheduling_cutoff_hours || 2} hours of start time.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Rescheduling is permitted up to {rescheduleBookingTarget.rescheduling_cutoff_hours || 2} hours before start time.</span>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Select New Slot on Today&apos;s / Upcoming Schedule:
                </Label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {schedule
                    .filter((s) => {
                      if (s.id === rescheduleBookingTarget.occurrence_id) return false;
                      if (s.is_full) return false;
                      if (s.has_ended || s.booking_state === "ENDED") return false;
                      if (s.has_started || s.booking_state === "IN_PROGRESS") return false;
                      if (s.start_time && new Date(s.start_time).getTime() <= Date.now()) return false;
                      if (s.can_book === false) return false;
                      return true;
                    })
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

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
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
              disabled={isReschedulingSubmitting || !rescheduleNewOccurrenceId || rescheduleBookingTarget?.can_reschedule === false}
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
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Booking Reservation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {cancelBookingTarget?.is_late_cancellation
                ? "This booking is within the late cancellation window. Review policy details below."
                : "Are you sure you want to cancel this booking? 1 session credit will be refunded to your passbook."}
            </DialogDescription>
          </DialogHeader>

          {cancelBookingTarget && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
                <h4 className="text-sm font-bold text-foreground">{cancelBookingTarget.class_name}</h4>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDate(cancelBookingTarget.start_time, "EEEE, MMM dd · hh:mm a")}
                </p>
              </div>

              {cancelBookingTarget.is_late_cancellation ? (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Late Cancellation Policy Active</span>
                  </div>
                  <p className="text-muted-foreground">
                    Cancellations made less than {cancelBookingTarget.cancellation_cutoff_hours || 2} hours before start time are treated as late cancellations.
                  </p>
                  <p className="font-semibold text-foreground">
                    {cancelBookingTarget.late_cancellation_session_action === 'CONSUME'
                      ? "⚠️ 1 session credit will be forfeited per gym policy."
                      : "✓ Your session credit will be restored to your passbook."}
                  </p>
                  {Number(cancelBookingTarget.cancellation_fee || 0) > 0 && (
                    <p className="text-destructive font-medium">
                      A late penalty fee of ₹{cancelBookingTarget.cancellation_fee} will apply.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Eligible for full session refund. 1 credit will return to your passbook immediately.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
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
              {isCancellingSubmitting
                ? "Cancelling..."
                : cancelBookingTarget?.is_late_cancellation && cancelBookingTarget?.late_cancellation_session_action === 'CONSUME'
                ? "Yes, Cancel (Credit Forfeited)"
                : "Yes, Cancel & Refund Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: BOOK 1-ON-1 PT SESSION                                           */}
      {/* ========================================================================= */}
      <Dialog open={!!ptTrainerToBook} onOpenChange={(open) => !open && setPtTrainerToBook(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Schedule 1-on-1 Personal Training
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Private coaching with Coach {ptTrainerToBook?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
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

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
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
      {/* MODAL 6: RENEW MEMBERSHIP (SELF-SERVICE RAZORPAY)                        */}
      {/* ========================================================================= */}
      <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl h-[88vh] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-500" />
              Renew Membership Pass
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Renew training access under your current program with transparent pricing and instant Razorpay checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
            {/* Current Program Display (Fixed) */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Current Program (Fixed for Renewal)
                </span>
                <span className="font-bold text-sm text-foreground">
                  {membershipActions?.active_membership?.program_name || "SWEAT Training"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                Continuous Access
              </Badge>
            </div>

            {/* Studio Branch Selector Container */}
            <div className="rounded-2xl border border-border bg-card/60 p-3.5 sm:p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-bold text-foreground">Select Studio Branch</Label>
                      <span className="text-rose-500 font-bold">*</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{availableBranches.length} locations available</p>
                  </div>
                </div>
                <div className="relative sm:w-80">
                  <select
                    value={selectedRenewBranchId || membershipActions?.active_membership?.branch_id || ""}
                    onChange={(e) => setSelectedRenewBranchId(e.target.value)}
                    className="w-full h-10 px-3.5 pr-9 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer shadow-xs transition-colors"
                  >
                    {availableBranches.length > 0 ? (
                      availableBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {formatBranchOptionText(b)}
                        </option>
                      ))
                    ) : (
                      <option value={membershipActions?.active_membership?.branch_id || ""}>
                        {membershipActions?.active_membership?.branch_name || "Home Branch"}
                      </option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filtered Packages Grid (Matching Conversion Wizard 2-Column Card Design) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Package size={14} className="text-emerald-500" />
                  <span>Select Renewal Package</span>
                </label>
                {membershipActions?.renew_options && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {membershipActions.renew_options.length} available
                  </span>
                )}
              </div>

              {!membershipActions?.renew_options || membershipActions.renew_options.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                  <Package size={24} className="mx-auto mb-1.5 opacity-40 text-emerald-500" />
                  <p className="text-xs sm:text-sm font-medium">No active packages for this program at this branch</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-h-72 overflow-y-auto pr-0.5">
                  {membershipActions.renew_options.map((opt) => {
                    const selected = selectedRenewPackageId === opt.package_id;
                    const sessionCount = opt.session_credits || opt.session_count || 0;
                    const days = opt.duration_days;
                    const rawPrice = opt.base_price;
                    const perSessionCost = (sessionCount > 0 && rawPrice > 0)
                      ? Math.round(rawPrice / sessionCount)
                      : null;

                    return (
                      <button
                        key={opt.package_id}
                        type="button"
                        onClick={() => setSelectedRenewPackageId(opt.package_id)}
                        className={[
                          'w-full text-left rounded-xl p-3.5 transition-all duration-200 border relative group flex flex-col justify-between gap-2.5 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
                          selected
                            ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.15] border-emerald-500 shadow-sm ring-2 ring-emerald-500/40'
                            : 'bg-card border-border hover:border-emerald-500/40 hover:bg-muted/30',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                                {cleanPackageDisplayName(opt.name, opt.package_name)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                              {sessionCount > 0 && (
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                                  <Zap size={9} className="text-blue-500 fill-blue-500/30" />
                                  {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                                </span>
                              )}
                              {days > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                  <CalendarIcon size={10} className="text-emerald-600 dark:text-emerald-400" />
                                  {days} Days
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                selected
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20 scale-100'
                                  : 'border-2 border-border/80 group-hover:border-emerald-500/50'
                              }`}
                            >
                              {selected ? <Check size={11} strokeWidth={3} className="animate-in zoom-in-50 duration-150" /> : null}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                          <div>
                            {perSessionCost ? (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                ₹{perSessionCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / sess
                              </span>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                              ₹{rawPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {(() => {
              const selectedOpt = membershipActions?.renew_options?.find(
                (o) => o.package_id === selectedRenewPackageId
              );
              if (!selectedOpt) return null;
              return (
                <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entitlement Sessions:</span>
                    <span className="font-bold text-foreground">{selectedOpt.session_credits || selectedOpt.session_count} Sessions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validity Duration:</span>
                    <span className="font-semibold text-foreground">{selectedOpt.duration_days} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span className="font-mono text-foreground">₹{selectedOpt.base_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Tax ({selectedOpt.tax_percent}%):</span>
                    <span className="font-mono text-foreground">
                      ₹{selectedOpt.tax_amount || Math.round(selectedOpt.total_price - selectedOpt.base_price)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-emerald-500">
                    <span>Total Amount Payable:</span>
                    <span>₹{selectedOpt.total_price}</span>
                  </div>
                </div>
              );
            })()}

            {/* PAR-Q Decision Card */}
            {Boolean(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission || membershipActions?.parq_info?.has_completed_parq) && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PAR-Q Health Readiness Decision</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Verified on File
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select how to link your health readiness questionnaire for this renewal:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewParqDecision('REUSE')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      renewParqDecision === 'REUSE'
                        ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <CopyCheck className="w-3 h-3 text-emerald-500" />
                      <span>Option A: Reuse</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Retain current verified PAR-Q record.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewParqDecision('EDIT')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      renewParqDecision === 'EDIT'
                        ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <FileEdit className="w-3 h-3 text-blue-500" />
                      <span>Option B: Edit</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Update answers & re-sign questionnaire.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewParqDecision('NEW')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      renewParqDecision === 'NEW'
                        ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>Option C: New Form</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Complete fresh blank health survey.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">Secure Razorpay Payment & Activation:</p>
              <p>Your renewal is activated immediately upon verified payment completion. The contract end date seamlessly continues from your prior membership expiry date.</p>
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenewModalOpen(false)}
              disabled={isSubmittingAction}
              className="text-xs"
            >
              Cancel
            </Button>
            {(() => {
              const selectedOpt = membershipActions?.renew_options?.find(
                (o) => o.package_id === selectedRenewPackageId
              );
              const amount = selectedOpt?.total_price || 0;
              return (
                <Button
                  size="sm"
                  onClick={handleRenewSubmit}
                  disabled={isSubmittingAction || !selectedRenewPackageId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {isSubmittingAction ? "Initiating Checkout..." : `Pay ₹${amount} with Razorpay`}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 7: UPGRADE PACKAGE TIER (SELF-SERVICE RAZORPAY)                     */}
      {/* ========================================================================= */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl h-[88vh] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Upgrade Package Tier (Self-Service)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upgrade branch, program, or package with authoritative price difference and instant Razorpay checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
            {/* 1 & 2. Studio Branch & Program Selection Container (Matching Target Reference UI) */}
            <div className="rounded-2xl border border-border bg-card/60 p-3.5 sm:p-4 space-y-3.5 shadow-xs">
              {/* Branch Selector Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-bold text-foreground">Select Studio Branch</Label>
                      <span className="text-rose-500 font-bold">*</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{availableBranches.length} locations available</p>
                  </div>
                </div>
                <div className="relative sm:w-80">
                  <select
                    value={effectiveUpgradeBranchId}
                    onChange={(e) => setSelectedUpgradeBranchId(e.target.value)}
                    className="w-full h-10 px-3.5 pr-9 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer shadow-xs transition-colors"
                  >
                    <option value="" disabled>Choose a studio branch</option>
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {formatBranchOptionText(b)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>

              {/* Program Segmented Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-500 fill-amber-500/20" />
                    <span>Select Program</span>
                  </Label>
                  {membershipActions?.programs && membershipActions.programs.length > 0 && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {membershipActions.programs.length} programs
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {membershipActions?.programs?.map((p) => {
                    const isActive = effectiveUpgradeProgramId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedUpgradeProgramId(p.id);
                          const firstPkg = (membershipActions?.upgrade_options || []).find((opt) => opt.program_id === p.id);
                          if (firstPkg) {
                            setSelectedUpgradePackageId(firstPkg.package_id);
                          }
                        }}
                        className={[
                          'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer text-center active:scale-[0.98] shadow-xs hover:-translate-y-0.5',
                          isActive
                            ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-950 dark:border-zinc-100 shadow-sm ring-2 ring-zinc-500/15'
                            : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/80',
                        ].join(' ')}
                      >
                        <span className="shrink-0">{getProgramIcon(p.name)}</span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filtered Upgrade Packages Grid (Strictly Program-Based) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Package size={14} className="text-blue-500" />
                  <span>Select Upgrade Target Package</span>
                </label>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {filteredUpgradeOptions.length} available
                </span>
              </div>

              {filteredUpgradeOptions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                  <Package size={24} className="mx-auto mb-1.5 opacity-40 text-blue-500" />
                  <p className="text-xs sm:text-sm font-medium">No upgrade packages available for this program</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-h-72 overflow-y-auto pr-0.5">
                  {filteredUpgradeOptions.map((opt) => {
                    const selected = selectedUpgradePackageId === opt.package_id;
                    const sessionCount = opt.session_credits || opt.session_count || 0;
                    const days = opt.duration_days;
                    const rawPrice = opt.base_price || opt.total_price;
                    const perSessionCost = (sessionCount > 0 && rawPrice > 0)
                      ? Math.round(rawPrice / sessionCount)
                      : null;

                    return (
                      <button
                        key={opt.package_id}
                        type="button"
                        onClick={() => setSelectedUpgradePackageId(opt.package_id)}
                        className={[
                          'w-full text-left rounded-xl p-3.5 transition-all duration-200 border relative group flex flex-col justify-between gap-2.5 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
                          selected
                            ? 'bg-blue-500/[0.08] dark:bg-blue-500/[0.15] border-blue-500 shadow-sm ring-2 ring-blue-500/40'
                            : 'bg-card border-border hover:border-blue-500/40 hover:bg-muted/30',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                                {cleanPackageDisplayName(opt.name, opt.package_name)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                              {sessionCount > 0 && (
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                                  <Zap size={9} className="text-blue-500 fill-blue-500/30" />
                                  {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                                </span>
                              )}
                              {days > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                  <CalendarIcon size={10} className="text-emerald-600 dark:text-emerald-400" />
                                  {days} Days
                                </span>
                              )}
                              {opt.program_name && (
                                <span className="inline-flex items-center font-medium text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                  {opt.program_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                selected
                                  ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20 scale-100'
                                  : 'border-2 border-border/80 group-hover:border-blue-500/50'
                              }`}
                            >
                              {selected ? <Check size={11} strokeWidth={3} className="animate-in zoom-in-50 duration-150" /> : null}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                          <div>
                            {perSessionCost ? (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                ₹{perSessionCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / sess
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                Total: ₹{opt.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                              ₹{rawPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dynamic Comparison Card */}
            {(() => {
              const selectedOpt = membershipActions?.upgrade_options?.find(
                (o) => o.package_id === selectedUpgradePackageId
              );
              if (!selectedOpt) return null;
              return (
                <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Plan Value:</span>
                    <span className="font-mono text-foreground">₹{selectedOpt.current_price || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Package Total:</span>
                    <span className="font-mono text-foreground">₹{selectedOpt.total_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Session Entitlement:</span>
                    <span className="font-bold text-emerald-500">
                      +{selectedOpt.additional_sessions || selectedOpt.credits_gain || 0} Sessions
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Validity Duration:</span>
                    <span className="font-semibold text-foreground">
                      +{selectedOpt.additional_days || 0} Days
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-blue-500">
                    <span>Authoritative Net Payable:</span>
                    <span>₹{selectedOpt.price_difference}</span>
                  </div>
                </div>
              );
            })()}

            {/* Reason input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reason / Notes (Optional)</label>
              <Input
                value={upgradeReason}
                onChange={(e) => setUpgradeReason(e.target.value)}
                placeholder="e.g. Upgrading for more weekly workout sessions"
                className="text-xs"
              />
            </div>

            {/* PAR-Q Decision Card */}
            {Boolean(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission || membershipActions?.parq_info?.has_completed_parq) && (
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>PAR-Q Health Assessment Decision</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                    Existing Record
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpgradeParqDecision('REUSE')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      upgradeParqDecision === 'REUSE'
                        ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <CopyCheck className="w-3 h-3 text-blue-500" />
                      <span>Option A: Reuse</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Keep existing verified PAR-Q on file.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUpgradeParqDecision('EDIT')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      upgradeParqDecision === 'EDIT'
                        ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <FileEdit className="w-3 h-3 text-blue-500" />
                      <span>Option B: Edit</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Update answers & create revised version.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUpgradeParqDecision('NEW')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      upgradeParqDecision === 'NEW'
                        ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500'
                        : 'border-border/80 bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>Option C: New Form</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Complete fresh blank questionnaire.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-blue-400">Direct Self-Service Activation:</p>
              <p>No waiting for studio staff approval. Upon verified payment of the net price difference, your upgrade takes effect immediately.</p>
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUpgradeModalOpen(false)}
              disabled={isSubmittingAction}
              className="text-xs"
            >
              Cancel
            </Button>
            {(() => {
              const selectedOpt = membershipActions?.upgrade_options?.find(
                (o) => o.package_id === selectedUpgradePackageId
              );
              const diff = selectedOpt?.price_difference || 0;
              return (
                <Button
                  size="sm"
                  onClick={handleUpgradeSubmit}
                  disabled={isSubmittingAction || !selectedUpgradePackageId}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {isSubmittingAction ? "Processing..." : diff > 0 ? `Pay ₹${diff} & Upgrade` : "Confirm Upgrade"}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 8: EXTEND VALIDITY (SELF-SERVICE RAZORPAY)                          */}
      {/* ========================================================================= */}
      <Dialog open={isExtendModalOpen} onOpenChange={setIsExtendModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-indigo-500" />
              Extend Membership Validity
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Extend your membership expiry date with dynamic duration tiers and instant online checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
            {/* Dynamic Duration Options */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Select Extension Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {(membershipActions?.extend_options?.available_options || [
                  { days: 7, base_fee: 500, tax_pct: 18, tax_amount: 90, total_fee: 590, name: "7 Days" },
                  { days: 14, base_fee: 900, tax_pct: 18, tax_amount: 162, total_fee: 1062, name: "14 Days" },
                  { days: 30, base_fee: 1500, tax_pct: 18, tax_amount: 270, total_fee: 1770, name: "30 Days" },
                  { days: 60, base_fee: 2800, tax_pct: 18, tax_amount: 504, total_fee: 3304, name: "60 Days" },
                ]).map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setExtendDays(opt.days)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      extendDays === opt.days
                        ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500 shadow-sm"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-foreground">+{opt.days} Days</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">₹{opt.total_fee}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Base: ₹{opt.base_fee} + 18% GST
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Expiry Card */}
            {(() => {
              const curEndStr = membershipActions?.active_membership?.end_date;
              const curDate = curEndStr ? new Date(curEndStr) : new Date();
              const newDate = new Date(curDate.getTime() + extendDays * 24 * 3600 * 1000);
              const matchedOpt = membershipActions?.extend_options?.available_options?.find(
                (o) => o.days === extendDays
              );
              const fee = matchedOpt?.total_fee || (extendDays === 7 ? 590 : extendDays === 14 ? 1062 : extendDays === 30 ? 1770 : 3304);

              return (
                <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Expiry:</span>
                    <span className="font-semibold text-foreground">
                      {curEndStr ? safeFormatDate(curEndStr, "dd MMM yyyy") : "Active"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Resulting Expiry:</span>
                    <span className="font-bold text-indigo-400">
                      {safeFormatDate(newDate.toISOString(), "dd MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">Extension Total:</span>
                    <span className="font-bold text-sm text-foreground">₹{fee}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reason / Note (Optional)
              </label>
              <Textarea
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="e.g. Travel, exam preparation, or injury recovery"
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-indigo-400">Instant Validity Extension:</p>
              <p>Self-service extensions are verified and updated immediately upon checkout. Unused workout session credits carry forward to the new expiry date.</p>
            </div>
          </div>

          <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExtendModalOpen(false)}
              disabled={isSubmittingAction}
              className="text-xs"
            >
              Cancel
            </Button>
            {(() => {
              const matchedOpt = membershipActions?.extend_options?.available_options?.find(
                (o) => o.days === extendDays
              );
              const fee = matchedOpt?.total_fee || (extendDays === 7 ? 590 : extendDays === 14 ? 1062 : extendDays === 30 ? 1770 : 3304);
              return (
                <Button
                  size="sm"
                  onClick={handleExtendSubmit}
                  disabled={isSubmittingAction}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {isSubmittingAction ? "Processing..." : `Pay ₹${fee} & Extend`}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 9: FREEZE & UNFREEZE MEMBERSHIP (SELF-SERVICE RAZORPAY)              */}
      {/* ========================================================================= */}
      <Dialog open={isFreezeModalOpen} onOpenChange={setIsFreezeModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md h-auto max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 shrink-0 bg-background text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-sky-500" />
              {membershipActions?.active_membership?.is_frozen ? "Active Membership Freeze" : "Pause / Freeze Membership"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {membershipActions?.active_membership?.is_frozen
                ? "Your membership is paused. Resume anytime to reactivate your training passes."
                : "Temporarily pause your workouts. The paused duration is automatically added to your contract end date."}
            </DialogDescription>
          </DialogHeader>

          {membershipActions?.active_membership?.is_frozen ? (
            /* ACTIVE FREEZE STATE */
            <>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Snowflake className="w-4 h-4 animate-spin" />
                      <span>Contract Currently Frozen</span>
                    </span>
                    <Badge className="bg-sky-500 text-white text-[10px]">PAUSED</Badge>
                  </div>
                  {membershipActions?.active_freeze && (
                    <div className="text-xs space-y-1 text-muted-foreground pt-1">
                      <p>Start Date: <span className="font-semibold text-foreground">{safeFormatDate(membershipActions.active_freeze.freeze_from, "dd MMM yyyy")}</span></p>
                      <p>End Date: <span className="font-semibold text-foreground">{safeFormatDate(membershipActions.active_freeze.freeze_until, "dd MMM yyyy")}</span></p>
                      <p>Total Frozen Days: <span className="font-semibold text-foreground">{membershipActions.active_freeze.days} Days</span></p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground">
                  Click below to unfreeze your membership immediately. Your workout privileges will be restored instantly.
                </div>
              </div>

              <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs">
                <Button
                  size="sm"
                  onClick={handleUnfreezeSubmit}
                  disabled={isUnfreezing}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isUnfreezing ? "Unfreezing..." : "Resume Membership / Unfreeze Now"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* SCHEDULE NEW FREEZE */
            <>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Freeze Start Date</label>
                    <Input
                      type="date"
                      value={freezeStartDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFreezeStartDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Freeze End Date</label>
                    <Input
                      type="date"
                      value={freezeEndDate}
                      min={freezeStartDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFreezeEndDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {freezeStartDate && freezeEndDate && (
                  <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1.5 text-xs">
                    {(() => {
                      const s = new Date(freezeStartDate);
                      const e = new Date(freezeEndDate);
                      const days = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
                      const minDays = membershipActions?.freeze_options?.min_days || 7;
                      const maxDays = membershipActions?.freeze_options?.max_days || 60;
                      const isValid = days >= minDays && days <= maxDays;

                      const curEndStr = membershipActions?.active_membership?.end_date;
                      const curEnd = curEndStr ? new Date(curEndStr) : new Date();
                      const projectedEnd = new Date(curEnd.getTime() + days * 24 * 3600 * 1000);

                      const fixedFee = membershipActions?.freeze_options?.fee_fixed || 0;
                      const perDayFee = membershipActions?.freeze_options?.fee_per_day || 0;
                      const baseFee = fixedFee + perDayFee * days;
                      const tax = Math.round(baseFee * 0.18);
                      const totalFreezeFee = baseFee + tax;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Freeze Duration:</span>
                            <span className={`font-bold ${isValid ? "text-sky-400" : "text-destructive"}`}>
                              {days > 0 ? `${days} Days` : "Invalid dates"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Validity Shift:</span>
                            <span className="font-semibold text-foreground">
                              {isValid ? `+${days} Days added to contract` : `Min ${minDays}, Max ${maxDays} days`}
                            </span>
                          </div>
                          {isValid && curEndStr && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Projected New Expiry:</span>
                              <span className="font-semibold text-sky-400">
                                {safeFormatDate(projectedEnd.toISOString(), "dd MMM yyyy")}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-border/60">
                            <span className="text-muted-foreground">Freeze Fee:</span>
                            <span className="font-bold text-foreground">
                              {totalFreezeFee > 0 ? `₹${totalFreezeFee}` : "Complimentary (₹0)"}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Reason for Freeze <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Reason for pausing your membership (e.g. annual leave, travel, medical recovery)"
                    className="text-xs min-h-[60px]"
                  />
                </div>

                <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-sky-400">Self-Service Freeze Policy:</p>
                  <p>During the freeze window, your booking reservations will be paused. The exact number of frozen days is automatically shifted to your membership expiry date.</p>
                </div>
              </div>

              <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-border/60 shrink-0 bg-card/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFreezeModalOpen(false)}
                  disabled={isSubmittingAction}
                  className="text-xs"
                >
                  Cancel
                </Button>
                {(() => {
                  const s = freezeStartDate ? new Date(freezeStartDate) : null;
                  const e = freezeEndDate ? new Date(freezeEndDate) : null;
                  const days = (s && e) ? Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) : 0;
                  const isValid = days >= (membershipActions?.freeze_options?.min_days || 7) && days <= (membershipActions?.freeze_options?.max_days || 60);

                  const fixedFee = membershipActions?.freeze_options?.fee_fixed || 0;
                  const perDayFee = membershipActions?.freeze_options?.fee_per_day || 0;
                  const baseFee = fixedFee + perDayFee * days;
                  const totalFreezeFee = baseFee + Math.round(baseFee * 0.18);

                  return (
                    <Button
                      size="sm"
                      onClick={handleFreezeSubmit}
                      disabled={isSubmittingAction || !isValid || !freezeReason.trim()}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {isSubmittingAction ? "Processing..." : totalFreezeFee > 0 ? `Pay ₹${totalFreezeFee} & Freeze` : "Confirm Membership Freeze"}
                    </Button>
                  );
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: DIGITAL MEMBER QR PASS                                           */}
      {/* ========================================================================= */}
      <Dialog open={showQRPassModal} onOpenChange={setShowQRPassModal}>
        <DialogContent className="w-[92vw] sm:max-w-sm max-h-[90dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl text-center flex flex-col items-center border border-border/80 shadow-2xl bg-card">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-foreground">
              <Flame className="h-5 w-5 text-primary" />
              {qrPassData?.has_booking === false ? "Turnstile Access Key" : "Session Access Pass"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {qrPassData?.has_booking === false
                ? "Booking Required for Studio Entry"
                : (qrPassData?.class_name || "Reserved Workout")}
            </DialogDescription>
          </DialogHeader>

          {isQRPassLoading ? (
            <div className="w-56 h-56 my-3 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Verifying workout schedule...</span>
            </div>
          ) : qrPassData?.has_booking === false ? (
            <div className="w-full my-3 p-5 rounded-2xl bg-muted/30 border border-border/80 flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Ticket className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  No Workout Scheduled Today
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Turnstile QR passes are generated exclusively for confirmed workouts. Book your class slot from your package to unlock instant gate access.
                </p>
              </div>

              {remainingCredits > 0 && (
                <div className="w-full py-2 px-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs font-semibold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-primary" />
                    Package Balance:
                  </span>
                  <span>{remainingCredits} Sessions Available</span>
                </div>
              )}

              <Button
                onClick={() => {
                  setShowQRPassModal(false);
                  setActiveTab("schedule");
                }}
                className="w-full gap-2 text-xs font-semibold mt-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Browse Schedule & Book Class
              </Button>
            </div>
          ) : (
            <>
              <div className="p-3 my-2 rounded-2xl bg-white border border-border/80 shadow-md flex flex-col items-center justify-center">
                <QRCodeSvg
                  value={qrPassData?.qr_token || "SWT-PASS"}
                  size={184}
                  className="rounded-md"
                  title="Turnstile QR Pass"
                />
              </div>

              <div className="w-full space-y-2 mt-1">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-foreground">
                    {qrPassData?.member_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Studio Member")}
                  </h4>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[11px] font-semibold px-2 py-0.5 border-primary/40 bg-primary/5 text-primary">
                      {qrPassData?.membership_number || profile?.membership_number || "MEM-1CCA18"}
                    </Badge>
                    {qrPassData?.booking_number && (
                      <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                        {qrPassData.booking_number}
                      </Badge>
                    )}
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5">
                      {qrPassData?.status || "CONFIRMED"}
                    </Badge>
                  </div>
                </div>

                {qrPassData?.qr_token && (
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-left space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Turnstile Token (Base62):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrPassData.qr_token);
                          toast.success("Turnstile token copied to clipboard!");
                        }}
                        className="text-primary hover:underline font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-foreground font-semibold break-all leading-tight select-all">
                      {qrPassData.qr_token}
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                  <p className="font-medium text-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Hold phone ~10cm in front of scanner
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {qrPassData?.valid_until ? (
                      <>Valid until {format(new Date(qrPassData.valid_until), "hh:mm a, dd MMM yyyy")}</>
                    ) : (
                      "Active for booked workout window"
                    )}
                  </p>
                </div>
              </div>
            </>
          )}

          <Button
            size="sm"
            onClick={() => setShowQRPassModal(false)}
            className="w-full mt-3 text-xs font-semibold"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
