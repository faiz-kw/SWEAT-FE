/**
 * ============================================================================
 * SWEAT ELITE - WEB MEMBER PORTAL WORKSPACE
 * ============================================================================
 * Comprehensive self-service web application for gym members.
 * Unified architecture consolidating studio schedule, 1-click bookings,
 * passbook credits, self-service renewals & upgrades (Razorpay), PAR-Q health
 * clearance, digital turnstile access pass (QR), and inlined nutrition tracking.
 *
 * ----------------------------------------------------------------------------
 * ARCHITECTURE MAP & TABLE OF CONTENTS
 * ----------------------------------------------------------------------------
 * SECTION 1: IMPORTS & CORE DEPENDENCIES ............................... Line ~45
 *    - React, Date utilities (date-fns)
 *    - Lucide Icons (Comprehensive portal icon set)
 *    - API Services (wellnessApi, mobileApi, razorpayCheckout)
 *    - UI Components (Radix UI / Shadcn: Dialog, Sheet, Tabs, Dropdowns, etc.)
 *
 * SECTION 2: PORTAL ERROR BOUNDARY (CRASH ISOLATION) ................... Line ~160
 *    - MemberPortalErrorBoundary: Isolates render errors and provides recovery
 *
 * SECTION 3: CONFIGURATION & UTILITY HELPERS ........................... Line ~210
 *    - SHOW_MEMBER_PT: Feature flag toggling Personal Training module
 *    - safeFormatDate: Defensive date formatter with fallback
 *    - cleanPackageDisplayName: Strips internal backend version tags
 *    - getProgramIcon & formatBranchOptionText
 *
 * SECTION 4: NUTRITION & WELLNESS SUB-SYSTEM (INLINED) ................. Line ~260
 *    - Nutrition Types (CatalogFoodItem, SerializedMealItem, MealCategoryKey)
 *    - MemberNutritionTab Component:
 *      * Daily Summary, Calorie & Macro Target Progress
 *      * Meal Log & Category Sections (Breakfast, Lunch, Dinner, Snacks)
 *      * Water Intake Tracker (+250ml quick-add)
 *      * Sleep Log Dialog & Auto-Duration Calculator
 *      * Food Search & AI Barcode / Camera Vision Integration
 *      * Daily Targets Edit Modal (Custom Calorie/Protein/Carb/Fat goals)
 *
 * SECTION 5: ROOT WORKSPACE EXPORT (MOUNT GUARD & BOUNDARY) ............ Line ~1800
 *    - WebMemberPortalWorkspace: Root component with hydration mount guard
 *
 * SECTION 6: WORKSPACE CONTROLLER (STATE, HYDRATION & HANDLERS) ........ Line ~1830
 *    - WebMemberPortalWorkspaceInner:
 *      * 6.1 Core State & Navigation (activeTab, isMobileMenuOpen)
 *      * 6.2 Data Model State (profile, credits, schedule, bookings, PAR-Q)
 *      * 6.3 Schedule Filters & Debounce Refs
 *      * 6.4 Modal Target State (booking, reschedule, cancel, PT, renewal, QR)
 *      * 6.5 PAR-Q Canvas State & Signature Refs
 *      * 6.6 Member Profile & Avatar Upload Handlers
 *      * 6.7 Data Hydration Engine (fetchAllData, fetchSchedule)
 *      * 6.8 Membership Self-Service Handlers (Renew, Upgrade, Extend, Freeze)
 *      * 6.9 Booking & Attendance Handlers (Book, Reschedule, Cancel, PT)
 *      * 6.10 Digital QR Pass Handlers
 *      * 6.11 Computed Memos & Metrics
 *
 * SECTION 7: MAIN WORKSPACE VIEWPORT LAYOUT ............................ Line ~3050
 *    - Sticky Header (SWEAT Emblem, Branch indicator, Live Passbook pill, QR button, Mobile Menu)
 *    - Sheet Navigation Drawer (Mobile / Tablet drawer menu with profile & credit overview)
 *
 * SECTION 8: PRIMARY TAB PANELS (VIEWPORTS) ............................ Line ~3370
 *    - Tab 1: "overview"  - Studio Hub & Dashboard (Active plan banner, KPI cards, Next workout)
 *    - Tab 2: "schedule"  - Class Schedule & Booking (7-day calendar, branch/category filter, cards)
 *    - Tab 3: "bookings"  - My Bookings & Attendance (Upcoming, waitlisted, attendance history)
 *    - Tab 4: "pt"        - Personal Training (Coach directory, request appointment) [Guarded]
 *    - Tab 5: "passbook"  - Membership & Passbook (Credit balance, renew, upgrade, freeze, invoices)
 *    - Tab 6: "parq"      - PAR-Q Health Clearance (Medical survey, digital signature, clearance badge)
 *    - Tab 7: "profile"   - My Profile (Personal details, home branch, avatar upload, password change)
 *    - Tab 8: "nutrition" - Nutrition & Wellness (Interactive daily meal & macro log)
 *
 * SECTION 9: ACTION MODALS & OVERLAYS .................................. Line ~5590
 *    - Modal 1:  1-Click Class Booking Confirmation
 *    - Modal 2:  Reschedule Class Booking
 *    - Modal 3:  Cancel Class Booking (with session refund/forfeit warning)
 *    - Modal 4:  Book Personal Trainer Appointment
 *    - Modal 5:  Renew Membership (Self-Service Razorpay)
 *    - Modal 6:  Upgrade Package Tier (Self-Service Razorpay)
 *    - Modal 7:  Extend Validity (Self-Service Razorpay)
 *    - Modal 8:  Freeze & Unfreeze Membership (Self-Service Razorpay)
 *    - Modal 9:  Digital Member QR Pass (Dynamic Turnstile Token)
 *    - Modal 10: Official Tax Invoice / Payment Receipt
 * ============================================================================
 */

// ============================================================================
// SECTION 1: IMPORTS & CORE DEPENDENCIES
// ============================================================================
import * as React from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import {
  Lock,
  Calendar,
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
  Menu,
  AlertTriangle,
  Camera,
  Trash2,
  Printer,
  Barcode,
  Droplets,
  Moon,
  Plus,
  Scale,
  ChevronLeft,
  SlidersHorizontal,
  Target,
  Search,
  Star,
  MessageCircle,
  Bell,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreVertical,
  ThumbsUp,
  Send,
  Flag,
  Shield,
  Loader2,
  X,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { getAccessToken } from "@/api";
import {
  wellnessApi,
  DailySummaryResult,
  MealLogEntry,
} from "@/api/endpoints/wellnessApi";
import { FoodVisionAndBarcodeScanner } from "@/components/wellness/FoodVisionAndBarcodeScanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { useAuth } from "@/contexts";
import { isSubmoduleAllowed } from "@/lib/modules-config";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// SECTION 2: PORTAL ERROR BOUNDARY (CRASH ISOLATION)
// ============================================================================
/**
 * Catches unhandled runtime render exceptions across the Member Portal,
 * displaying a branded fallback UI with session refresh and login options.
 */
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

// ============================================================================
// SECTION 3: CONFIGURATION, FEATURE FLAGS & FORMATTING HELPERS
// ============================================================================

/**
 * Feature flag controlling Personal Training (PT) tab and booking visibility.
 * Set to false per client specification. Can be enabled anytime without schema changes.
 */
const SHOW_MEMBER_PT = false;

/**
 * Robust date formatting utility with graceful error handling and configurable fallback.
 */
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

/**
 * Strips internal backend package versioning suffixes (e.g., "-v2", "_v1.0")
 * to ensure pristine customer-facing package titles in the passbook.
 */
function cleanPackageDisplayName(nameSnapshot?: string, packageName?: string): string {
  if (packageName && packageName.trim()) {
    return packageName.trim().replace(/[\s\-_]+v\d+(\.\d+)?$/i, '');
  }
  const raw = (nameSnapshot || '').trim();
  return raw.replace(/[\s\-_]+v\d+(\.\d+)?$/i, '').trim() || raw;
}

/**
 * Maps program name substrings to tailored Lucide badges (Flame for Bootcamp, HeartPulse for Pilates).
 */
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

/**
 * Formats studio branch dropdown options with city/location context.
 */
function formatBranchOptionText(b: any): string {
  if (!b) return '';
  const addr = (b.address || b.address_line_1 || b.location_name || b.city || '').trim();
  const name = (b.name || b.code || 'Studio').trim();
  if (addr && !name.toLowerCase().includes(addr.toLowerCase())) {
    return `${name} — ${addr}`;
  }
  return name;
}

// ============================================================================
// SECTION 4: NUTRITION & WELLNESS SUB-SYSTEM (INLINED COMPONENT & SUB-MODELS)
// ============================================================================
/**
 * Comprehensive nutrition logging system:
 * - Macro & calorie goals tracking (Protein, Carbs, Fat, Fiber)
 * - Food item search from verified catalog
 * - AI Computer Vision & Barcode Scanning (FoodVisionAndBarcodeScanner)
 * - Hydration tracker (+250ml quick increments)
 * - Sleep logger with auto duration calculation
 */

// ============================================================================
// NUTRITION & WELLNESS COMPONENT & SUB-MODELS (INLINED)
// ============================================================================

export type MealCategoryKey = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface CatalogFoodItem {
  id: string;
  name: string;
  barcode?: string | null;
  category?: string;
  serving_unit?: string;
  serving_weight_grams?: number;
  calories?: number;
  calories_per_100g?: number;
  protein_g?: number;
  protein_per_100g?: number;
  carbs_g?: number;
  carbs_per_100g?: number;
  fat_g?: number;
  fat_per_100g?: number;
  fiber_g?: number;
  fiber_per_100g?: number;
  is_nutritionist_verified?: boolean;
}

interface SerializedMealItem {
  id?: string;
  food_item_id?: string | null;
  food_name_snapshot?: string;
  custom_food_name?: string;
  quantity?: number | string;
  unit_name?: string;
  consumed_grams?: number | string;
  portion_grams?: number | string;
  snapshot_calories?: number | string;
  calories?: number | string;
  snapshot_protein_g?: number | string;
  protein_g?: number | string;
  snapshot_carbs_g?: number | string;
  carbs_g?: number | string;
  snapshot_fat_g?: number | string;
  fat_g?: number | string;
  snapshot_fiber_g?: number | string;
  fiber_g?: number | string;
  created_at?: string;
}

interface SerializedMealLogEntry {
  id: string;
  meal_type: string;
  logged_date?: string;
  logged_time?: string;
  logged_at?: string;
  date?: string;
  total_calories?: number | string;
  total_protein_g?: number | string;
  total_carbs_g?: number | string;
  total_fat_g?: number | string;
  total_fiber_g?: number | string;
  notes?: string;
  items?: SerializedMealItem[];
  created_at?: string;
  updated_at?: string;
}

type GroupedMeals = Record<MealCategoryKey, SerializedMealLogEntry[]>;

interface DailySummaryPayload {
  date: string;
  targets: DailySummaryResult['targets'];
  nutrition: DailySummaryResult['nutrition'];
  water: DailySummaryResult['water'];
  sleep: DailySummaryResult['sleep'];
  meals?: GroupedMeals | SerializedMealLogEntry[] | unknown;
  meals_by_type?: Record<string, SerializedMealLogEntry[]>;
  meals_breakdown?: SerializedMealLogEntry[];
}

function formatMealTime(log: SerializedMealLogEntry): string {
  if (log.logged_at) {
    try {
      return new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      // fallback
    }
  }
  if (log.created_at) {
    try {
      return new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      // fallback
    }
  }
  if (log.logged_time) {
    const parts = log.logged_time.split(':');
    const h = parts[0];
    const m = parts[1];
    if (h !== undefined && m !== undefined) {
      const hourNum = parseInt(h, 10);
      const isPm = hourNum >= 12;
      const displayH = hourNum % 12 === 0 ? 12 : hourNum % 12;
      return `${displayH}:${m} ${isPm ? 'PM' : 'AM'}`;
    }
  }
  return '';
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MemberNutritionTabProps {
  memberFirstName?: string | undefined;
}

export function MemberNutritionTab({ memberFirstName }: MemberNutritionTabProps) {
  // 1. Date Navigation State
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayString);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [summary, setSummary] = React.useState<DailySummaryPayload | null>(null);

  // 2. Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = React.useState<boolean>(false);
  const [scannerDefaultMode, setScannerDefaultMode] = React.useState<'vision' | 'barcode'>('vision');
  const [scannerMealType, setScannerMealType] = React.useState<MealCategoryKey>('LUNCH');

  // 3. Edit Daily Targets Modal State
  const [isTargetsModalOpen, setIsTargetsModalOpen] = React.useState<boolean>(false);
  const [targetCalories, setTargetCalories] = React.useState<number>(2000);
  const [targetProtein, setTargetProtein] = React.useState<number>(130);
  const [targetCarbs, setTargetCarbs] = React.useState<number>(220);
  const [targetFat, setTargetFat] = React.useState<number>(65);
  const [targetWater, setTargetWater] = React.useState<number>(3000);
  const [targetSleep, setTargetSleep] = React.useState<number>(8);
  const [isSavingTargets, setIsSavingTargets] = React.useState<boolean>(false);

  // 4. Food Catalog Search Modal State
  const [isFoodSearchModalOpen, setIsFoodSearchModalOpen] = React.useState<boolean>(false);
  const [searchMealCategory, setSearchMealCategory] = React.useState<MealCategoryKey>('BREAKFAST');
  const [foodSearchQuery, setFoodSearchQuery] = React.useState<string>('');
  const [foodSearchResults, setFoodSearchResults] = React.useState<CatalogFoodItem[]>([]);
  const [isSearchingFoods, setIsSearchingFoods] = React.useState<boolean>(false);
  const [selectedCatalogFood, setSelectedCatalogFood] = React.useState<CatalogFoodItem | null>(null);
  const [portionGrams, setPortionGrams] = React.useState<number>(100);
  const [isSubmittingFoodLog, setIsSubmittingFoodLog] = React.useState<boolean>(false);

  // 5. Sleep Logging Modal State
  const [isSleepModalOpen, setIsSleepModalOpen] = React.useState<boolean>(false);
  const [sleepBedtime, setSleepBedtime] = React.useState<string>('22:30');
  const [sleepWakeTime, setSleepWakeTime] = React.useState<string>('06:30');
  const [sleepQuality, setSleepQuality] = React.useState<number>(4);
  const [sleepNotes, setSleepNotes] = React.useState<string>('');
  const [isSavingSleep, setIsSavingSleep] = React.useState<boolean>(false);

  // Fetch summary on date change
  const fetchSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await wellnessApi.getDailySummary(selectedDate);
      setSummary(res.data as DailySummaryPayload);
    } catch (err: any) {
      console.error('Failed to load nutrition summary:', err);
      toast.error('Failed to load wellness summary for ' + selectedDate);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Date navigation handlers
  const isToday = React.useMemo(() => {
    return selectedDate === getTodayString();
  }, [selectedDate]);

  const changeDate = (daysDelta: number) => {
    const parts = selectedDate.split('-').map(Number);
    const yVal = parts[0] ?? new Date().getFullYear();
    const mVal = (parts[1] ?? 1) - 1;
    const dVal = parts[2] ?? 1;
    const cur = new Date(yVal, mVal, dVal);
    cur.setDate(cur.getDate() + daysDelta);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const setToday = () => {
    setSelectedDate(getTodayString());
  };

  const formattedDateDisplay = React.useMemo(() => {
    const parts = selectedDate.split('-').map(Number);
    const yVal = parts[0] ?? new Date().getFullYear();
    const mVal = (parts[1] ?? 1) - 1;
    const dVal = parts[2] ?? 1;
    const cur = new Date(yVal, mVal, dVal);
    if (isToday) {
      return `Today, ${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate, isToday]);

  // Scanner openers with meal context
  const openVisionScanner = (mealType: MealCategoryKey = 'LUNCH') => {
    setScannerMealType(mealType);
    setScannerDefaultMode('vision');
    setIsScannerOpen(true);
  };

  const openBarcodeScanner = (mealType: MealCategoryKey = 'LUNCH') => {
    setScannerMealType(mealType);
    setScannerDefaultMode('barcode');
    setIsScannerOpen(true);
  };

  // Water logger with flexible volume
  const handleLogWater = async (amountMl: number) => {
    try {
      await wellnessApi.logWater({ amount_ml: amountMl, date: selectedDate });
      toast.success(`+${amountMl} ml water logged! Keep hydrating.`);
      void fetchSummary();
    } catch (err) {
      toast.error('Failed to log water.');
    }
  };

  // Delete a meal entry
  const handleDeleteMeal = async (mealId: string) => {
    try {
      await wellnessApi.deleteMealLog(mealId);
      toast.success('Meal log entry removed.');
      void fetchSummary();
    } catch (err) {
      toast.error('Failed to remove meal entry.');
    }
  };

  // Targets Modal Handler
  const openTargetsModal = () => {
    setTargetCalories(Math.round(Number(targets.daily_calories) || 2000));
    setTargetProtein(Math.round(Number(targets.daily_protein_g) || 130));
    setTargetCarbs(Math.round(Number(targets.daily_carbs_g) || 220));
    setTargetFat(Math.round(Number(targets.daily_fat_g) || 65));
    setTargetWater(Math.round(Number(targets.daily_water_ml) || 3000));
    setTargetSleep(Number(targets.daily_sleep_hours) || 8);
    setIsTargetsModalOpen(true);
  };

  const handleSaveTargets = async () => {
    setIsSavingTargets(true);
    try {
      await wellnessApi.updateTargets({
        daily_calories: targetCalories,
        daily_protein_g: targetProtein,
        daily_carbs_g: targetCarbs,
        daily_fat_g: targetFat,
        daily_water_ml: targetWater,
        daily_sleep_hours: targetSleep,
        // Backend serializer compatibility keys:
        ...({
          protein_grams: targetProtein,
          carbs_grams: targetCarbs,
          fat_grams: targetFat,
          water_ml: targetWater,
          sleep_target_minutes: Math.round(targetSleep * 60),
        } as any),
      });
      toast.success('Daily nutrition & wellness targets saved!');
      setIsTargetsModalOpen(false);
      void fetchSummary();
    } catch (err: any) {
      console.error('Failed to save targets:', err);
      toast.error(err?.response?.data?.error || 'Failed to update daily targets.');
    } finally {
      setIsSavingTargets(false);
    }
  };

  // Food Catalog Search & Log Handlers
  const searchCatalogFoods = React.useCallback(async (query: string) => {
    setIsSearchingFoods(true);
    try {
      const res = await wellnessApi.searchFoods(query.trim());
      const data = res.data as any;
      const items: CatalogFoodItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setFoodSearchResults(items);
    } catch (err) {
      console.error('Failed to search food catalog:', err);
      toast.error('Unable to fetch food catalog items.');
    } finally {
      setIsSearchingFoods(false);
    }
  }, []);

  const openFoodSearchModal = (category: MealCategoryKey = 'BREAKFAST') => {
    setSearchMealCategory(category);
    setSelectedCatalogFood(null);
    setFoodSearchQuery('');
    setFoodSearchResults([]);
    setPortionGrams(100);
    setIsFoodSearchModalOpen(true);
    void searchCatalogFoods('');
  };

  // Debounced search when query changes
  React.useEffect(() => {
    if (!isFoodSearchModalOpen) return;
    const timer = setTimeout(() => {
      void searchCatalogFoods(foodSearchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [foodSearchQuery, isFoodSearchModalOpen, searchCatalogFoods]);

  // Live macro calculation for selected catalog food
  const calculatedPortionNutrition = React.useMemo(() => {
    if (!selectedCatalogFood) return { cals: 0, p: 0, c: 0, f: 0, fib: 0 };
    const baseWeight = Number(selectedCatalogFood.serving_weight_grams) || 100;
    const ratio = portionGrams / (baseWeight > 0 ? baseWeight : 100);
    const baseCals = Number(selectedCatalogFood.calories ?? selectedCatalogFood.calories_per_100g ?? 0);
    const baseP = Number(selectedCatalogFood.protein_g ?? selectedCatalogFood.protein_per_100g ?? 0);
    const baseC = Number(selectedCatalogFood.carbs_g ?? selectedCatalogFood.carbs_per_100g ?? 0);
    const baseF = Number(selectedCatalogFood.fat_g ?? selectedCatalogFood.fat_per_100g ?? 0);
    const baseFib = Number(selectedCatalogFood.fiber_g ?? selectedCatalogFood.fiber_per_100g ?? 0);

    return {
      cals: Math.round(baseCals * ratio),
      p: Number((baseP * ratio).toFixed(1)),
      c: Number((baseC * ratio).toFixed(1)),
      f: Number((baseF * ratio).toFixed(1)),
      fib: Number((baseFib * ratio).toFixed(1)),
    };
  }, [selectedCatalogFood, portionGrams]);

  const handleLogCatalogFood = async () => {
    if (!selectedCatalogFood) return;
    setIsSubmittingFoodLog(true);
    try {
      await wellnessApi.createMealLog({
        meal_type: searchMealCategory,
        date: selectedDate,
        items: [
          {
            food_item_id: selectedCatalogFood.id,
            portion_grams: portionGrams,
            calories: calculatedPortionNutrition.cals,
            protein_g: calculatedPortionNutrition.p,
            carbs_g: calculatedPortionNutrition.c,
            fat_g: calculatedPortionNutrition.f,
            fiber_g: calculatedPortionNutrition.fib,
          },
        ],
        notes: `Logged via catalog search (${portionGrams}g)`,
      });
      toast.success(`Logged ${selectedCatalogFood.name} to ${searchMealCategory.toLowerCase()}!`);
      setIsFoodSearchModalOpen(false);
      void fetchSummary();
    } catch (err: any) {
      console.error('Failed to log food:', err);
      toast.error(err?.response?.data?.error || 'Failed to log food entry.');
    } finally {
      setIsSubmittingFoodLog(false);
    }
  };

  // Sleep duration calculator
  const calculatedSleep = React.useMemo(() => {
    if (!sleepBedtime || !sleepWakeTime) return { minutes: 0, hours: 0, label: '0 hrs' };
    const bParts = sleepBedtime.split(':').map(Number);
    const wParts = sleepWakeTime.split(':').map(Number);
    const bH = bParts[0] ?? 0;
    const bM = bParts[1] ?? 0;
    const wH = wParts[0] ?? 0;
    const wM = wParts[1] ?? 0;
    const startMinutes = bH * 60 + bM;
    let endMinutes = wH * 60 + wM;
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Crosses midnight
    }
    const diff = endMinutes - startMinutes;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      minutes: diff,
      hours: Number((diff / 60).toFixed(1)),
      label: `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim(),
    };
  }, [sleepBedtime, sleepWakeTime]);

  const handleSaveSleep = async () => {
    if (!sleepBedtime || !sleepWakeTime) {
      toast.error('Please specify both bedtime and wake-up time.');
      return;
    }
    if (calculatedSleep.minutes <= 0) {
      toast.error('Wake-up time must be different from bedtime.');
      return;
    }
    if (calculatedSleep.minutes > 1440) {
      toast.error('Sleep duration cannot exceed 24 hours.');
      return;
    }

    setIsSavingSleep(true);
    try {
      const bParts = sleepBedtime.split(':').map(Number);
      const wParts = sleepWakeTime.split(':').map(Number);
      const bH = bParts[0] ?? 0;
      const bM = bParts[1] ?? 0;
      const wH = wParts[0] ?? 0;
      const wM = wParts[1] ?? 0;

      const targetDateObj = new Date(selectedDate + 'T00:00:00');
      const startDateObj = new Date(targetDateObj);
      const endDateObj = new Date(targetDateObj);

      if (wH * 60 + wM <= bH * 60 + bM) {
        // Bedtime was on previous evening
        startDateObj.setDate(startDateObj.getDate() - 1);
      }

      startDateObj.setHours(bH, bM, 0, 0);
      endDateObj.setHours(wH, wM, 0, 0);

      await wellnessApi.logSleep({
        logged_date: selectedDate,
        start_time: startDateObj.toISOString(),
        end_time: endDateObj.toISOString(),
        duration_minutes: calculatedSleep.minutes,
        quality_rating: sleepQuality,
        notes: sleepNotes.trim(),
      });

      toast.success(`Sleep logged: ${calculatedSleep.label} of recovery sleep!`);
      setIsSleepModalOpen(false);
      setSleepNotes('');
      void fetchSummary();
    } catch (err: any) {
      console.error('Failed to log sleep:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save sleep log.');
    } finally {
      setIsSavingSleep(false);
    }
  };

  // Safe data fallbacks
  const targets = summary?.targets || {
    daily_calories: 2200,
    daily_protein_g: 130,
    daily_carbs_g: 220,
    daily_fat_g: 65,
    daily_water_ml: 3000,
    daily_sleep_hours: 8.0,
  };

  const nutrition = summary?.nutrition || {
    total_calories: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    total_fiber_g: 0,
    calories_remaining: targets.daily_calories,
    calorie_progress_pct: 0,
  };

  const water = summary?.water || {
    total_ml: 0,
    target_ml: targets.daily_water_ml,
    progress_pct: 0,
  };

  const sleep = summary?.sleep || {
    total_hours: 0,
    target_hours: targets.daily_sleep_hours,
    progress_pct: 0,
  };

  // Grouped meals
  const meals: GroupedMeals = React.useMemo(() => {
    const emptyGroup: GroupedMeals = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
    };

    if (!summary) return emptyGroup;

    // 1. Grouped meal entries from summary.meals_by_type
    if (summary.meals_by_type && typeof summary.meals_by_type === 'object' && !Array.isArray(summary.meals_by_type)) {
      return {
        BREAKFAST: summary.meals_by_type['BREAKFAST'] || [],
        LUNCH: summary.meals_by_type['LUNCH'] || [],
        DINNER: summary.meals_by_type['DINNER'] || [],
        SNACK: [
          ...(summary.meals_by_type['SNACK'] || []),
          ...(summary.meals_by_type['EVENING_SNACK'] || []),
        ],
      };
    }

    // 2. Candidate array fallback
    const candidateArray = Array.isArray(summary.meals)
      ? summary.meals
      : Array.isArray(summary.meals_breakdown)
      ? summary.meals_breakdown
      : null;

    if (candidateArray) {
      const grouped: GroupedMeals = {
        BREAKFAST: [],
        LUNCH: [],
        DINNER: [],
        SNACK: [],
      };

      for (const meal of candidateArray) {
        const rawType = (meal.meal_type || '').toUpperCase();
        if (rawType === 'BREAKFAST') {
          grouped.BREAKFAST.push(meal);
        } else if (rawType === 'LUNCH') {
          grouped.LUNCH.push(meal);
        } else if (rawType === 'DINNER') {
          grouped.DINNER.push(meal);
        } else {
          grouped.SNACK.push(meal);
        }
      }
      return grouped;
    }

    // 3. Fallback if summary.meals is an object
    if (summary.meals && typeof summary.meals === 'object' && !Array.isArray(summary.meals)) {
      const mObj = summary.meals as Record<string, SerializedMealLogEntry[]>;
      return {
        BREAKFAST: mObj['BREAKFAST'] || [],
        LUNCH: mObj['LUNCH'] || [],
        DINNER: mObj['DINNER'] || [],
        SNACK: [
          ...(mObj['SNACK'] || []),
          ...(mObj['EVENING_SNACK'] || []),
        ],
      };
    }

    return emptyGroup;
  }, [summary]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Scanners */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-card via-card to-emerald-500/10 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-500 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5" />
                Nutrition & Wellness Hub
              </span>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                AI Vision + Barcode + Catalog Active
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Fuel Your Performance, {memberFirstName || 'Athlete'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Track daily macronutrients, scan packaged snacks via OpenFoodFacts barcode lookup, search Indian staples, or snap a photo of your plate for instant portion estimation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => openVisionScanner('LUNCH')}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
            >
              <Camera className="h-4 w-4" />
              AI Photo Plate Scan
            </Button>
            <Button
              variant="outline"
              onClick={() => openBarcodeScanner('SNACK')}
              className="gap-2 border-border/80 hover:bg-accent font-semibold"
            >
              <Barcode className="h-4 w-4 text-emerald-500" />
              Scan Barcode
            </Button>
            <Button
              variant="outline"
              onClick={() => openFoodSearchModal('BREAKFAST')}
              className="gap-2 border-border/80 hover:bg-accent font-semibold"
            >
              <Search className="h-4 w-4 text-primary" />
              Search Food
            </Button>

            {/* Quick Hydration Dropdown */}
            <DropdownMenu>
              <div className="inline-flex rounded-md shadow-xs border border-sky-500/30">
                <Button
                  variant="ghost"
                  onClick={() => handleLogWater(250)}
                  className="gap-1.5 text-xs text-sky-500 hover:bg-sky-500/10 rounded-r-none"
                  title="Add 250ml water glass"
                >
                  <Droplets className="h-4 w-4" />
                  +250ml Water
                </Button>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-1.5 text-sky-500 hover:bg-sky-500/10 rounded-l-none border-l border-sky-500/20"
                    title="More hydration sizes"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleLogWater(250)} className="text-xs cursor-pointer">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 mr-2" />
                  Glass (250 ml)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogWater(350)} className="text-xs cursor-pointer">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 mr-2" />
                  Mug / Cup (350 ml)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogWater(500)} className="text-xs cursor-pointer">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 mr-2" />
                  Sports Bottle (500 ml)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogWater(750)} className="text-xs cursor-pointer">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 mr-2" />
                  Large Shaker (750 ml)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogWater(1000)} className="text-xs cursor-pointer">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 mr-2" />
                  Full Sipper / Jug (1000 ml)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              onClick={() => setIsSleepModalOpen(true)}
              className="gap-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10"
              title="Log sleep session"
            >
              <Moon className="h-4 w-4" />
              Log Sleep
            </Button>
          </div>
        </div>
      </div>

      {/* Date Navigation & Daily Targets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-xs shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeDate(-1)}
            className="h-8 w-8 p-0 border-border/70 hover:bg-accent"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Date Picker Trigger with Styled Label */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs sm:text-sm font-semibold text-foreground shadow-2xs hover:border-emerald-500/50 transition-colors">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>{formattedDateDisplay}</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Click to select specific date"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => changeDate(1)}
            className="h-8 w-8 p-0 border-border/70 hover:bg-accent"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={setToday}
              className="h-8 px-2.5 text-xs font-semibold text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              Jump to Today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openTargetsModal}
            className="h-8 gap-1.5 text-xs font-semibold border-border/80 hover:bg-accent"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
            Edit Daily Targets
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchSummary()}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Daily Progress Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Calories Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Calories Intake
              <Flame className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {nutrition.total_calories}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {targets.daily_calories} kcal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={Math.min(nutrition.calorie_progress_pct, 100)} className="h-1.5 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {nutrition.calories_remaining > 0
                ? `${nutrition.calories_remaining} kcal remaining`
                : 'Daily calorie goal reached!'}
            </p>
          </CardContent>
        </Card>

        {/* Protein Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Protein
              <Award className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {nutrition.total_protein_g}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {targets.daily_protein_g}g</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress
              value={Math.min((nutrition.total_protein_g / (targets.daily_protein_g || 1)) * 100, 100)}
              className="h-1.5 mt-2 bg-emerald-500/20"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Muscle recovery & synthesis target
            </p>
          </CardContent>
        </Card>

        {/* Water Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Hydration (Water)
              <Droplets className="h-4 w-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {(water.total_ml / 1000).toFixed(1)}L{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {(targets.daily_water_ml / 1000).toFixed(1)}L</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={Math.min(water.progress_pct, 100)} className="h-1.5 mt-2 bg-sky-500/20" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground">
                {water.total_ml} ml logged
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleLogWater(250)}
                  className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 text-[10px] font-semibold font-mono"
                  title="Add 250ml"
                >
                  +250ml
                </button>
                <button
                  onClick={() => handleLogWater(500)}
                  className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 text-[10px] font-semibold font-mono"
                  title="Add 500ml"
                >
                  +500ml
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Recovery Sleep
              <Moon className="h-4 w-4 text-indigo-400" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {sleep.total_hours}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {targets.daily_sleep_hours} hrs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={Math.min(sleep.progress_pct, 100)} className="h-1.5 mt-2 bg-indigo-500/20" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-muted-foreground">
                {sleep.total_hours > 0 ? `${sleep.total_hours} hrs logged` : 'Recuperation'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSleepModalOpen(true)}
                className="h-6 px-2 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1 font-medium"
              >
                <Plus className="h-3 w-3" />
                Log Sleep
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Macronutrient Balance Strip */}
      <div className="p-4 rounded-xl border border-border/50 bg-card flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Macronutrient Breakdown:
        </span>
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Protein:</span>
            <strong className="text-foreground">{nutrition.total_protein_g}g</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-muted-foreground">Carbs:</span>
            <strong className="text-foreground">{nutrition.total_carbs_g}g</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Fats:</span>
            <strong className="text-foreground">{nutrition.total_fat_g}g</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span className="text-muted-foreground">Fiber:</span>
            <strong className="text-foreground">{nutrition.total_fiber_g}g</strong>
          </div>
        </div>
      </div>

      {/* Daily Meals Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            {isToday ? "Today's Meal Logs" : `Meal Logs for ${formattedDateDisplay}`}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openFoodSearchModal('BREAKFAST')}
              className="text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30"
              variant="outline"
            >
              <Search className="h-3.5 w-3.5" />
              Search & Add Food
            </Button>
            <Button
              size="sm"
              onClick={() => openVisionScanner('LUNCH')}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Camera className="h-3.5 w-3.5" />
              AI Photo Scan
            </Button>
          </div>
        </div>

        {/* Meal Categories Cards */}
        {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((mType) => {
          const typeLogs = meals[mType] || [];
          const typeCalories = Math.round(
            typeLogs.reduce((sum, log) => sum + (Number(log.total_calories) || 0), 0)
          );

          return (
            <Card key={mType} className="border-border/60 bg-card overflow-hidden shadow-xs">
              <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-border/40 bg-accent/20 gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {mType}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {typeCalories} kcal
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openFoodSearchModal(mType)}
                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    title={`Search food catalog for ${mType.toLowerCase()}`}
                  >
                    <Search className="h-3.5 w-3.5 text-primary" />
                    Search
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openVisionScanner(mType)}
                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    title={`Scan plate photo for ${mType.toLowerCase()}`}
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-500" />
                    Photo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openBarcodeScanner(mType)}
                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    title={`Scan package barcode for ${mType.toLowerCase()}`}
                  >
                    <Barcode className="h-3.5 w-3.5 text-sky-500" />
                    Barcode
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                {typeLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No items logged for {mType.toLowerCase()} yet. Search foods, snap a plate photo, or scan a barcode to log.
                  </p>
                ) : (
                  <div className="divide-y divide-border/30 space-y-3">
                    {typeLogs.map((log) => {
                      const displayTime = formatMealTime(log);
                      return (
                        <div key={log.id} className="pt-2.5 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-mono text-[11px] flex items-center gap-1">
                              {displayTime ? (
                                <>
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {displayTime}
                                </>
                              ) : null}
                            </span>
                            <button
                              onClick={() => handleDeleteMeal(log.id)}
                              className="p-1 hover:text-destructive text-muted-foreground rounded cursor-pointer"
                              title="Delete this meal log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(log.items || []).map((item, idx) => {
                              const itemName = item.food_name_snapshot || item.custom_food_name || 'Food item';
                              const itemGrams = Math.round(Number(item.consumed_grams ?? item.portion_grams ?? 0));
                              const itemCals = Math.round(Number(item.snapshot_calories ?? item.calories ?? 0));
                              const prot = Number(item.snapshot_protein_g ?? item.protein_g ?? 0);
                              const carbs = Number(item.snapshot_carbs_g ?? item.carbs_g ?? 0);
                              const fat = Number(item.snapshot_fat_g ?? item.fat_g ?? 0);

                              return (
                                <div
                                  key={item.id || idx}
                                  className="p-2.5 rounded-lg border border-border/40 bg-accent/10 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-foreground">
                                      {itemName}
                                    </span>
                                    <div className="text-[11px] text-muted-foreground font-mono">
                                      {itemGrams}g · P: {prot}g · C: {carbs}g · F: {fat}g
                                    </div>
                                  </div>
                                  <span className="font-bold text-foreground font-mono">
                                    {itemCals} kcal
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Embedded Scanner Modal with Meal Context */}
      <FoodVisionAndBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onMealLogged={() => void fetchSummary()}
        defaultDate={selectedDate}
        defaultMode={scannerDefaultMode}
        defaultMealType={scannerMealType}
      />

      {/* Food Catalog Search & Log Modal */}
      <Dialog open={isFoodSearchModalOpen} onOpenChange={setIsFoodSearchModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Search className="h-5 w-5 text-primary" />
              Search & Log Food
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search verified Indian recipes and standard ingredients, adjust portion weight, and log directly to your timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto py-2">
            {/* Category & Date Context */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Meal Category</Label>
                <Select
                  value={searchMealCategory}
                  onValueChange={(val) => setSearchMealCategory(val as MealCategoryKey)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select meal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                    <SelectItem value="LUNCH">Lunch</SelectItem>
                    <SelectItem value="DINNER">Dinner</SelectItem>
                    <SelectItem value="SNACK">Snacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Log Date</Label>
                <div className="h-9 px-3 rounded-md border border-input bg-muted/40 flex items-center text-xs font-mono text-foreground">
                  {selectedDate}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search food (e.g. Paneer, Roti, Dal, Egg, Oats, Rice)..."
                value={foodSearchQuery}
                onChange={(e) => setFoodSearchQuery(e.target.value)}
                className="pl-9 text-sm"
                autoFocus
              />
              {isSearchingFoods && (
                <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* Selected Food Item Configuration Panel */}
            {selectedCatalogFood ? (
              <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">
                        {selectedCatalogFood.name}
                      </span>
                      {selectedCatalogFood.is_nutritionist_verified && (
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedCatalogFood.category || 'General Nutrition'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCatalogFood(null)}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Change Item
                  </Button>
                </div>

                {/* Portion Adjuster */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="font-semibold">Portion Size (Grams)</Label>
                    <span className="font-mono font-bold text-foreground">{portionGrams}g</span>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(Math.max(1, Number(e.target.value) || 0))}
                    className="font-mono text-sm"
                  />
                  {/* Quick gram chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[50, 100, 150, 200, 250, 300].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPortionGrams(amt)}
                        className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors ${
                          portionGrams === amt
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border/70 hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        {amt}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Calculated Macros Card */}
                <div className="p-3 rounded-lg border border-border/60 bg-card/80 grid grid-cols-5 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Calories</span>
                    <strong className="text-sm font-bold text-foreground font-mono">
                      {calculatedPortionNutrition.cals}
                    </strong>
                    <span className="text-[10px] text-muted-foreground block">kcal</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Protein</span>
                    <strong className="text-sm font-bold text-emerald-500 font-mono">
                      {calculatedPortionNutrition.p}g
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Carbs</span>
                    <strong className="text-sm font-bold text-sky-500 font-mono">
                      {calculatedPortionNutrition.c}g
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Fat</span>
                    <strong className="text-sm font-bold text-amber-500 font-mono">
                      {calculatedPortionNutrition.f}g
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Fiber</span>
                    <strong className="text-sm font-bold text-indigo-400 font-mono">
                      {calculatedPortionNutrition.fib}g
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              /* Search Results List */
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {foodSearchQuery ? 'Catalog Matches' : 'Popular Items'}
                </span>

                {foodSearchResults.length === 0 && !isSearchingFoods ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No matching food items found. Try searching for &quot;Paneer&quot;, &quot;Roti&quot;, &quot;Dal&quot;, &quot;Chicken&quot;, or &quot;Egg&quot;.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {foodSearchResults.map((food) => {
                      const cals = Number(food.calories ?? food.calories_per_100g ?? 0);
                      const p = Number(food.protein_g ?? food.protein_per_100g ?? 0);
                      const c = Number(food.carbs_g ?? food.carbs_per_100g ?? 0);
                      const f = Number(food.fat_g ?? food.fat_per_100g ?? 0);

                      return (
                        <div
                          key={food.id}
                          onClick={() => {
                            setSelectedCatalogFood(food);
                            setPortionGrams(100);
                          }}
                          className="p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{food.name}</span>
                              {food.is_nutritionist_verified && (
                                <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Per 100g: P: {p}g · C: {c}g · F: {f}g
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground font-mono">{cals} kcal</span>
                            <span className="text-[10px] text-muted-foreground block">per 100g</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setIsFoodSearchModalOpen(false)}
              disabled={isSubmittingFoodLog}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogCatalogFood}
              disabled={!selectedCatalogFood || portionGrams <= 0 || isSubmittingFoodLog}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSubmittingFoodLog ? 'Logging...' : `Log to ${searchMealCategory.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Daily Targets Modal */}
      <Dialog open={isTargetsModalOpen} onOpenChange={setIsTargetsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
              Customize Daily Targets
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust your daily caloric intake, macronutrient ratios, hydration, and sleep recovery goals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Calories */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="target-cals" className="text-xs font-semibold flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Daily Calorie Target (kcal)
                </Label>
                <span className="font-mono text-xs font-bold text-foreground">{targetCalories} kcal</span>
              </div>
              <Input
                id="target-cals"
                type="number"
                min={500}
                max={10000}
                step={50}
                value={targetCalories}
                onChange={(e) => setTargetCalories(Number(e.target.value) || 0)}
                className="font-mono text-sm"
              />
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="target-prot" className="text-[11px] font-semibold text-emerald-500">
                  Protein (g)
                </Label>
                <Input
                  id="target-prot"
                  type="number"
                  min={10}
                  max={500}
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(Number(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-carbs" className="text-[11px] font-semibold text-sky-500">
                  Carbs (g)
                </Label>
                <Input
                  id="target-carbs"
                  type="number"
                  min={10}
                  max={800}
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(Number(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-fat" className="text-[11px] font-semibold text-amber-500">
                  Fat (g)
                </Label>
                <Input
                  id="target-fat"
                  type="number"
                  min={5}
                  max={400}
                  value={targetFat}
                  onChange={(e) => setTargetFat(Number(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Macro Check helper */}
            <div className="p-2.5 rounded-lg border border-border/50 bg-accent/20 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>Macro Sum:</span>
              <strong className="text-foreground">
                {targetProtein * 4 + targetCarbs * 4 + targetFat * 9} kcal
              </strong>
            </div>

            {/* Hydration & Sleep */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="target-water" className="text-xs font-semibold flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-sky-500" />
                  Water Goal (ml)
                </Label>
                <Input
                  id="target-water"
                  type="number"
                  min={500}
                  max={10000}
                  step={250}
                  value={targetWater}
                  onChange={(e) => setTargetWater(Number(e.target.value) || 0)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-sleep" className="text-xs font-semibold flex items-center gap-1">
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  Sleep Target (hrs)
                </Label>
                <Input
                  id="target-sleep"
                  type="number"
                  min={4}
                  max={14}
                  step={0.5}
                  value={targetSleep}
                  onChange={(e) => setTargetSleep(Number(e.target.value) || 0)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsTargetsModalOpen(false)}
              disabled={isSavingTargets}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTargets}
              disabled={isSavingTargets || targetCalories <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSavingTargets ? 'Saving...' : 'Update Targets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sleep Log Modal */}
      <Dialog open={isSleepModalOpen} onOpenChange={setIsSleepModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Moon className="h-5 w-5 text-indigo-400" />
              Log Recovery Sleep
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Track your sleep duration and recovery score for {selectedDate}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Quick summary badge */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10">
              <div>
                <span className="text-xs text-muted-foreground">Calculated Duration</span>
                <p className="text-lg font-bold text-foreground">
                  {calculatedSleep.label} ({calculatedSleep.hours} hrs)
                </p>
              </div>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">
                Target: {targets.daily_sleep_hours} hrs
              </Badge>
            </div>

            {/* Bedtime & Wake Time Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sleep-bedtime" className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Bedtime
                </Label>
                <Input
                  id="sleep-bedtime"
                  type="time"
                  value={sleepBedtime}
                  onChange={(e) => setSleepBedtime(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sleep-waketime" className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Wake-up Time
                </Label>
                <Input
                  id="sleep-waketime"
                  type="time"
                  value={sleepWakeTime}
                  onChange={(e) => setSleepWakeTime(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Quality Rating */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sleep Quality Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSleepQuality(star)}
                    className={`p-2 rounded-lg border transition-all ${
                      sleepQuality >= star
                        ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-400'
                        : 'border-border/60 bg-accent/20 text-muted-foreground hover:bg-accent/40'
                    }`}
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star className={`h-4 w-4 ${sleepQuality >= star ? 'fill-indigo-400' : ''}`} />
                  </button>
                ))}
                <span className="text-xs font-medium text-muted-foreground ml-2">
                  {sleepQuality === 1 && 'Poor'}
                  {sleepQuality === 2 && 'Fair'}
                  {sleepQuality === 3 && 'Good'}
                  {sleepQuality === 4 && 'Very Good'}
                  {sleepQuality === 5 && 'Excellent'}
                </span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="sleep-notes" className="text-xs font-semibold">
                Notes (Optional)
              </Label>
              <Input
                id="sleep-notes"
                placeholder="e.g. Woke up rested, took magnesium"
                value={sleepNotes}
                onChange={(e) => setSleepNotes(e.target.value)}
                maxLength={250}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSleepModalOpen(false)}
              disabled={isSavingSleep}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSleep}
              disabled={isSavingSleep || calculatedSleep.minutes <= 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {isSavingSleep ? 'Saving...' : 'Save Sleep Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SECTION 4.2: SWEAT COMMUNITY TAB COMPONENT
// ============================================================================

interface CommunityCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  color_hex: string;
  is_admin_only: boolean;
}

interface CommunityCommentItem {
  id: string;
  post_id: string;
  content: string;
  is_coach_verified: boolean;
  likes_count: number;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
}

interface CommunityFeedPostItem {
  id: string;
  journey_title: string;
  content: string;
  category: CommunityCategoryItem;
  category_slug: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  duration_text: string;
  metric_change: string;
  coach_name_snapshot: string;
  coach_rating: number | string | null;
  privacy_scope: string;
  status: string;
  is_pinned: boolean;
  is_comments_disabled?: boolean;
  likes_count: number;
  comments_count: number;
  bookmarks_count: number;
  author_name: string;
  author_avatar: string | null;
  author_role: "MEMBER" | "COACH" | "STAFF" | "ADMIN";
  is_liked_by_me: boolean;
  is_bookmarked_by_me: boolean;
  highlighted_comment?: CommunityCommentItem | null;
  created_at: string;
}

interface CommunityMemberRequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  upvotes_count: number;
  admin_response: string;
  author_name: string;
  is_voted_by_me: boolean;
  created_at: string;
}

export function MemberCommunityTab() {
  const { user } = useAuth();
  const tenantSlug = user?.branding?.tenant_slug || (user?.tenantName ? user.tenantName.toLowerCase().replace(/\s+/g, "-") : "sweat");
  const studioName = user?.branding?.app_name || user?.tenantName || "SWEAT";

  const getHeaders = React.useCallback(
    (isJson: boolean = true) => {
      const headers: Record<string, string> = {};
      if (isJson) headers["Content-Type"] = "application/json";
      if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return headers;
    },
    [tenantSlug]
  );

  const [categories, setCategories] = React.useState<CommunityCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [activeFeedTab, setActiveFeedTab] = React.useState<"latest" | "trending">("latest");
  const [posts, setPosts] = React.useState<CommunityFeedPostItem[]>([]);
  const [requests, setRequests] = React.useState<CommunityMemberRequestItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = React.useState<boolean>(false);
  const [activeCommentPostId, setActiveCommentPostId] = React.useState<string | null>(null);
  const [commentsMap, setCommentsMap] = React.useState<Record<string, CommunityCommentItem[]>>({});
  const [newCommentText, setNewCommentText] = React.useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState<boolean>(false);

  // Create Form State - Start with clean empty values (clean placeholders in inputs)
  const [formCategory, setFormCategory] = React.useState<string>("transformations");
  const [journeyTitle, setJourneyTitle] = React.useState<string>("");
  const [storyContent, setStoryContent] = React.useState<string>("");
  const [beforePhotoUrl, setBeforePhotoUrl] = React.useState<string>("");
  const [afterPhotoUrl, setAfterPhotoUrl] = React.useState<string>("");
  const [durationText, setDurationText] = React.useState<string>("");
  const [metricChange, setMetricChange] = React.useState<string>("");
  const [coachName, setCoachName] = React.useState<string>("");
  const [coachRating, setCoachRating] = React.useState<number>(5);
  const [privacyScope, setPrivacyScope] = React.useState<string>("STUDIO_PUBLIC");
  const [isPublishing, setIsPublishing] = React.useState<boolean>(false);
  const [isUploadingBefore, setIsUploadingBefore] = React.useState<boolean>(false);
  const [isUploadingAfter, setIsUploadingAfter] = React.useState<boolean>(false);
  const beforeFileInputRef = React.useRef<HTMLInputElement>(null);
  const afterFileInputRef = React.useRef<HTMLInputElement>(null);

  // Direct Server File Upload (Local Backend Media)
  const handleFileUpload = async (file: File, type: "before" | "after") => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    if (type === "before") setIsUploadingBefore(true);
    else setIsUploadingAfter(true);

    try {
      const res = await fetch("/api/v1/mobile/community/media/upload/", {
        method: "POST",
        headers: getHeaders(false),
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (type === "before") {
          setBeforePhotoUrl(data.url);
          toast.success("Before photo uploaded successfully!");
        } else {
          setAfterPhotoUrl(data.url);
          toast.success("After photo uploaded successfully!");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload image to server.");
      }
    } catch (e) {
      toast.error("Network error while uploading photo.");
    } finally {
      if (type === "before") setIsUploadingBefore(false);
      else setIsUploadingAfter(false);
    }
  };

  // New Request Form State
  const [requestTitle, setRequestTitle] = React.useState<string>("");
  const [requestDesc, setRequestDesc] = React.useState<string>("");
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState<boolean>(false);

  // 1. Fetch Categories
  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/mobile/community/categories/", {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch community categories", e);
    }
  }, [getHeaders]);

  // 2. Fetch Feed Posts
  const fetchPosts = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      params.set("tab", activeFeedTab);

      const res = await fetch(`/api/v1/mobile/community/feed/?${params.toString()}`, {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch community feed", e);
    }
  }, [selectedCategory, activeFeedTab, getHeaders]);

  // 3. Fetch Member Requests
  const fetchRequests = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/mobile/community/requests/", {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch member requests", e);
    }
  }, [getHeaders]);

  // 4. Fetch Studio Coaches for Autocomplete
  const [availableCoaches, setAvailableCoaches] = React.useState<string[]>([]);
  const fetchCoaches = React.useCallback(async () => {
    try {
      const res = await mobileApi.getTrainers();
      if (res?.data && Array.isArray(res.data)) {
        setAvailableCoaches(res.data.map((t: any) => t.name || t.trainer_name).filter(Boolean));
      }
    } catch {
      // Fallback: manually typed coaches allowed
    }
  }, []);

  const loadAll = React.useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchCategories(), fetchPosts(), fetchRequests(), fetchCoaches()]);
    setIsLoading(false);
  }, [fetchCategories, fetchPosts, fetchRequests, fetchCoaches]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Report Post Quick Action
  const handleReportPost = async (postId: string) => {
    try {
      const res = await fetch("/api/v1/mobile/community/report/", {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({
          post: postId,
          reason: "INAPPROPRIATE",
          custom_details: "Reported by member via quick action",
        }),
      });
      if (res.ok) {
        toast.success("Thank you. Post reported for review by studio moderators.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Could not report post.");
      }
    } catch {
      toast.error("Network error while reporting post.");
    }
  };

  // Toggle Like Action
  const handleToggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.is_liked_by_me;
          return {
            ...p,
            is_liked_by_me: nextLiked,
            likes_count: nextLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/v1/mobile/community/posts/${postId}/react/`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ reaction_type: "HIGH_FIVE" }),
      });
      if (!res.ok) {
        void fetchPosts();
      }
    } catch (e) {
      void fetchPosts();
    }
  };

  // Toggle Bookmark Action
  const handleToggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextSaved = !p.is_bookmarked_by_me;
          return {
            ...p,
            is_bookmarked_by_me: nextSaved,
            bookmarks_count: nextSaved ? p.bookmarks_count + 1 : Math.max(0, p.bookmarks_count - 1),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/v1/mobile/community/posts/${postId}/bookmark/`, {
        method: "POST",
        headers: getHeaders(true),
      });
      if (res.ok) {
        toast.success("Saved to your inspiration bookmarks!");
      }
    } catch (e) {
      void fetchPosts();
    }
  };

  // Fetch comments for post
  const openComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }
    setActiveCommentPostId(postId);
    try {
      const res = await fetch(`/api/v1/mobile/community/posts/${postId}/comments/`, {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsMap((prev) => ({ ...prev, [postId]: data.results || [] }));
      }
    } catch (e) {
      console.error("Failed to load comments", e);
    }
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/mobile/community/posts/${postId}/comments/`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
        );
        setNewCommentText("");
        toast.success("Comment added!");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.detail || "Could not post comment. Please try again.");
      }
    } catch (e) {
      toast.error("Network error while submitting comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Upvote Request
  const handleUpvoteRequest = async (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          const nextVoted = !r.is_voted_by_me;
          return {
            ...r,
            is_voted_by_me: nextVoted,
            upvotes_count: nextVoted ? r.upvotes_count + 1 : Math.max(0, r.upvotes_count - 1),
          };
        }
        return r;
      })
    );

    try {
      const res = await fetch(`/api/v1/mobile/community/requests/${requestId}/upvote/`, {
        method: "POST",
        headers: getHeaders(true),
      });
      if (res.ok) {
        toast.success("Upvote updated!");
      }
    } catch (e) {
      void fetchRequests();
    }
  };

  // Publish Transformation Post
  const handlePublishPost = async () => {
    if (!storyContent.trim()) {
      toast.error("Please share your story or experience.");
      return;
    }
    setIsPublishing(true);
    try {
      const payload = {
        category_slug: formCategory,
        journey_title: journeyTitle.trim(),
        content: storyContent.trim(),
        before_photo_url: beforePhotoUrl.trim() || null,
        after_photo_url: afterPhotoUrl.trim() || null,
        duration_text: durationText.trim(),
        metric_change: metricChange.trim(),
        coach_name_snapshot: coachName.trim(),
        coach_rating: coachRating,
        privacy_scope: privacyScope,
      };

      const res = await fetch("/api/v1/mobile/community/posts/", {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Transformation published! 🎉 Your story is now live in the ${studioName} feed.`);
        setIsCreateModalOpen(false);
        setJourneyTitle("");
        setStoryContent("");
        setBeforePhotoUrl("");
        setAfterPhotoUrl("");
        setDurationText("");
        setMetricChange("");
        setCoachName("");
        void fetchPosts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to publish post.");
      }
    } catch (e) {
      toast.error("Network error while publishing post.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit Member Request
  const handleSubmitRequest = async () => {
    if (!requestTitle.trim() || !requestDesc.trim()) {
      toast.error("Please provide both a title and description for your suggestion.");
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const res = await fetch("/api/v1/mobile/community/requests/", {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({
          title: requestTitle.trim(),
          description: requestDesc.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Suggestion submitted! Management will review and respond.");
        setIsRequestModalOpen(false);
        setRequestTitle("");
        setRequestDesc("");
        void fetchRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || err.detail || "Failed to submit suggestion.");
      }
    } catch (e) {
      toast.error("Network error while submitting suggestion.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER WITH COMMUNITY SLOGAN & CTA */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-rose-500 fill-rose-500" />
                {studioName} Community
              </span>
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-500 text-[10px] font-semibold">
                Transformations • Stories • Motivation
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Member Inspiration Hub
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Celebrate progress, share your fitness evolution, review your trainers, and voice ideas to make our community even better.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold shadow-md shadow-rose-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Publish Transformation
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRequestModalOpen(true)}
              className="gap-2 border-border/80 hover:bg-accent font-semibold"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Voice Your Idea
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void loadAll()}
              className="rounded-xl"
              title="Refresh feed"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-primary")} />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
        {/* Category Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
              selectedCategory === "all"
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            )}
          >
            All Stories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                selectedCategory === cat.slug
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {cat.slug === "transformations" && <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />}
              {cat.slug === "highlights" && <Sparkles className="h-3.5 w-3.5 text-blue-500" />}
              {cat.slug === "discussions" && <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />}
              {cat.slug === "announcements" && <Bell className="h-3.5 w-3.5 text-amber-500" />}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Tab Toggle: Latest vs Trending */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveFeedTab("latest")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeFeedTab === "latest" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveFeedTab("trending")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeFeedTab === "trending" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Trending 🔥
          </button>
        </div>
      </div>

      {/* 3. TWO-COLUMN LAYOUT: MAIN FEED (68%) & SUGGESTION BOX (32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAIN FEED COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          {isLoading ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Hydrating community feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border/60 space-y-3">
              <Flame className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">No posts yet in this category</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Be the first to share your transformation progress or ask a question to our studio family!
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-2 mt-2">
                <Plus className="h-4 w-4" />
                Publish First Post
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className={cn(
                  "bg-card rounded-3xl border border-border/80 shadow-xs overflow-hidden transition-all hover:border-primary/30",
                  post.is_pinned && "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-card"
                )}
              >
                {/* Post Header */}
                <div className="p-5 pb-3 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/40 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm overflow-hidden shrink-0">
                      {post.author_avatar ? (
                        <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
                      ) : (
                        post.author_name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{post.author_name}</span>
                        {post.author_role === "COACH" && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] px-1.5 py-0 font-bold">
                            COACH
                          </Badge>
                        )}
                        {post.author_role === "ADMIN" && (
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] px-1.5 py-0 font-bold">
                            STAFF
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          • {(() => {
                              try {
                                return new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                              } catch {
                                return "Recent";
                              }
                            })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 bg-muted/40 text-muted-foreground border-border/60">
                          {categories.find((c) => c.slug === post.category_slug)?.name || post.category_slug.replace(/-/g, " ")}
                        </Badge>
                        {post.is_pinned && (
                          <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                            📌 Pinned Announcement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                      <DropdownMenuItem
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Story link copied to clipboard!");
                        }}
                        className="gap-2 text-xs cursor-pointer font-medium"
                      >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Share Story Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleReportPost(post.id)}
                        className="gap-2 text-xs cursor-pointer font-medium text-rose-500 hover:text-rose-600 focus:text-rose-600"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report to Studio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Journey Title */}
                {post.journey_title && (
                  <div className="px-5 pb-2">
                    <h2 className="font-extrabold text-lg sm:text-xl text-foreground tracking-tight">
                      {post.journey_title}
                    </h2>
                  </div>
                )}

                {/* Story narrative */}
                <div className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* BEFORE & AFTER PHOTO SHOWCASE */}
                {(post.before_photo_url || post.after_photo_url) && (
                  <div className="px-5 pb-4">
                    <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-muted/30">
                      <div className="grid grid-cols-2 gap-1 relative aspect-[16/10] sm:aspect-[16/9]">
                        {/* Before Side */}
                        <div className="relative h-full w-full overflow-hidden bg-black/10">
                          {post.before_photo_url ? (
                            <img
                              src={post.before_photo_url}
                              alt="Before Transformation"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                              No Before Photo
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            BEFORE
                          </div>
                        </div>

                        {/* After Side */}
                        <div className="relative h-full w-full overflow-hidden bg-black/10">
                          {post.after_photo_url ? (
                            <img
                              src={post.after_photo_url}
                              alt="After Transformation"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                              No After Photo
                            </div>
                          )}
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            AFTER
                          </div>
                        </div>

                        {/* Center Interactive Splitter Icon */}
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
                          <div className="h-8 w-8 rounded-full bg-black/80 text-white flex items-center justify-center shadow-lg border border-white/20">
                            <SlidersHorizontal className="h-4 w-4" />
                          </div>
                        </div>

                        {/* Metric Chip */}
                        {(post.metric_change || post.duration_text) && (
                          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md text-white text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                            <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                            <span>
                              {post.metric_change}
                              {post.metric_change && post.duration_text ? " • " : ""}
                              {post.duration_text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* COACH ATTRIBUTION CARD */}
                {post.coach_name_snapshot && (
                  <div className="mx-5 mb-4 p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">
                        {post.coach_name_snapshot.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          COACHED BY
                        </span>
                        <span className="font-bold text-xs text-foreground">
                          {post.coach_name_snapshot}
                        </span>
                      </div>
                    </div>

                    {post.coach_rating && (
                      <Badge variant="outline" className="bg-background text-foreground border-border/80 text-xs font-bold gap-1 px-2 py-1">
                        <span>{Number(post.coach_rating).toFixed(1)}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </Badge>
                    )}
                  </div>
                )}

                {/* SOCIAL INTERACTIONS ROW */}
                <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                        post.is_liked_by_me
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", post.is_liked_by_me && "fill-rose-500 text-rose-500")} />
                      <span>{post.likes_count}</span>
                    </button>

                    <button
                      onClick={() => openComments(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                        activeCommentPostId === post.id
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.comments_count}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(post.id)}
                    className={cn(
                      "p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all",
                      post.is_bookmarked_by_me && "text-primary"
                    )}
                    title="Bookmark Story"
                  >
                    <Bookmark className={cn("h-4 w-4", post.is_bookmarked_by_me && "fill-primary text-primary")} />
                  </button>
                </div>

                {/* HIGHLIGHTED COACH COMMENT PREVIEW */}
                {post.highlighted_comment && activeCommentPostId !== post.id && (
                  <div className="mx-5 mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-[10px]">
                        {post.highlighted_comment.author_name.charAt(0)}
                      </div>
                      <span className="font-bold text-foreground">
                        {post.highlighted_comment.author_name}
                      </span>
                      {post.highlighted_comment.is_coach_verified && (
                        <Badge className="bg-black text-amber-400 border-none text-[8px] px-1 py-0 font-bold uppercase">
                          COACH
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground pl-7">
                      {post.highlighted_comment.content}
                    </p>
                  </div>
                )}

                {/* EXPANDABLE INLINE COMMENTS & REPLY DRAWER */}
                {activeCommentPostId === post.id && (
                  <div className="bg-muted/20 border-t border-border/60 p-5 space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Comments ({post.comments_count})
                    </h3>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {(commentsMap[post.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">No comments yet. Leave a high-five or encouraging words!</p>
                      ) : (
                        commentsMap[post.id].map((cmt) => (
                          <div
                            key={cmt.id}
                            className={cn(
                              "p-3 rounded-2xl border text-xs space-y-1",
                              cmt.is_coach_verified
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-card border-border/60"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{cmt.author_name}</span>
                                {cmt.is_coach_verified && (
                                  <Badge className="bg-black text-amber-400 border-none text-[8px] px-1 py-0 font-bold uppercase">
                                    COACH
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(cmt.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed">{cmt.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {post.is_comments_disabled ? (
                      <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>Comments have been locked for this post by studio management.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                          placeholder="Write encouraging feedback or ask a question..."
                          className="text-xs rounded-xl bg-background border-border/80"
                        />
                        <Button
                          size="sm"
                          disabled={isSubmittingComment || !newCommentText.trim()}
                          onClick={() => handleAddComment(post.id)}
                          className="rounded-xl px-3 shrink-0"
                        >
                          {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* SIDEBAR WIDGET COLUMN (Voice Your Idea / Member Requests) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-3xl border border-border/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="font-extrabold text-sm text-foreground">Voice Your Idea</h2>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                Member Requests
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Have a suggestion for new equipment, schedule adjustments, or studio amenities? Upvote peer requests or submit your own.
            </p>

            <Button
              onClick={() => setIsRequestModalOpen(true)}
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-xl border-dashed border-primary/40 font-semibold text-primary hover:bg-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Suggest an Improvement
            </Button>

            <div className="space-y-3 pt-2">
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No open requests right now.</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-foreground block leading-tight">
                          {req.title}
                        </span>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {req.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleUpvoteRequest(req.id)}
                        className={cn(
                          "flex flex-col items-center justify-center h-12 w-10 rounded-xl border transition-all shrink-0 font-bold text-xs",
                          req.is_voted_by_me
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card text-muted-foreground border-border/80 hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 mb-0.5" />
                        <span>{req.upvotes_count}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase font-bold tracking-wider py-0 px-1.5",
                          req.status === "PLANNED" && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                          req.status === "UNDER_REVIEW" && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                          req.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        )}
                      >
                        {req.status.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        by {req.author_name}
                      </span>
                    </div>

                    {req.admin_response && (
                      <div className="mt-2 p-2 rounded-xl bg-background/80 border border-border/50 text-[11px] space-y-0.5">
                        <span className="font-bold text-primary flex items-center gap-1 text-[10px]">
                          <Shield className="h-3 w-3" /> {studioName} Response:
                        </span>
                        <p className="text-muted-foreground">{req.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: PUBLISH TRANSFORMATION */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Flame className="h-5 w-5 text-rose-500 fill-rose-500" />
              Publish Transformation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share your progress & inspire the {studioName} community.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Transformation Photos
              </label>
              <p className="text-[11px] text-muted-foreground">
                Upload Before & After photos from your camera/gallery, or paste image links.
              </p>

              <input
                type="file"
                ref={beforeFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, "before");
                }}
              />
              <input
                type="file"
                ref={afterFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, "after");
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Before Photo Box */}
                <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      BEFORE PHOTO
                    </span>
                    {beforePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setBeforePhotoUrl("")}
                        className="text-[10px] text-muted-foreground hover:text-rose-500 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {beforePhotoUrl ? (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-border bg-black/10">
                      <img src={beforePhotoUrl} alt="Before" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingBefore}
                      onClick={() => beforeFileInputRef.current?.click()}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-card/60 hover:bg-card flex flex-col items-center justify-center gap-1.5 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isUploadingBefore ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-[11px] font-semibold">Uploading to server...</span>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Upload className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Upload Before Photo</span>
                          <span className="text-[10px] text-muted-foreground">Camera / Gallery (Max 15MB)</span>
                        </>
                      )}
                    </button>
                  )}

                  <Input
                    placeholder="Or paste photo URL..."
                    value={beforePhotoUrl}
                    onChange={(e) => setBeforePhotoUrl(e.target.value)}
                    className="text-[11px] h-7 rounded-lg"
                  />
                </div>

                {/* After Photo Box */}
                <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      AFTER PHOTO
                    </span>
                    {afterPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setAfterPhotoUrl("")}
                        className="text-[10px] text-muted-foreground hover:text-rose-500 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {afterPhotoUrl ? (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-border bg-black/10">
                      <img src={afterPhotoUrl} alt="After" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingAfter}
                      onClick={() => afterFileInputRef.current?.click()}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-border/80 hover:border-emerald-500/60 bg-card/60 hover:bg-card flex flex-col items-center justify-center gap-1.5 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isUploadingAfter ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                          <span className="text-[11px] font-semibold">Uploading to server...</span>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Upload className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Upload After Photo</span>
                          <span className="text-[10px] text-muted-foreground">Camera / Gallery (Max 15MB)</span>
                        </>
                      )}
                    </button>
                  )}

                  <Input
                    placeholder="Or paste photo URL..."
                    value={afterPhotoUrl}
                    onChange={(e) => setAfterPhotoUrl(e.target.value)}
                    className="text-[11px] h-7 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Select Category
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {(categories.length > 0 ? categories.filter((c) => !c.is_admin_only) : [
                  { slug: "transformations", name: "Transformations" },
                  { slug: "highlights", name: "Highlights" },
                  { slug: "discussions", name: "Discussions" },
                ]).map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setFormCategory(c.slug)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                      formCategory === c.slug
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Journey Title
              </label>
              <Input
                placeholder="e.g. PCOD & Core Strength Journey"
                value={journeyTitle}
                onChange={(e) => setJourneyTitle(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Your Story & Experience
              </label>
              <Textarea
                placeholder="Share your challenges, the workout routine that helped, dietary changes, and mindset shifts..."
                rows={4}
                value={storyContent}
                onChange={(e) => setStoryContent(e.target.value)}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">
                  Duration
                </label>
                <Input
                  placeholder="e.g. 12 Weeks"
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">
                  Weight / Muscle Change
                </label>
                <Input
                  placeholder="e.g. -8.5 kg"
                  value={metricChange}
                  onChange={(e) => setMetricChange(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Trainer / Coach Name
              </label>
              <Input
                placeholder={availableCoaches.length > 0 ? `e.g. ${availableCoaches[0]}` : "e.g. Coach Shweta"}
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                list="community-active-coaches-list"
                className="text-xs rounded-xl"
              />
              <datalist id="community-active-coaches-list">
                {availableCoaches.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground font-semibold">Trainer Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCoachRating(star)}
                      className="p-0.5 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-all",
                          star <= coachRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Audience & Privacy
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "STUDIO_PUBLIC", label: "Studio Public" },
                  { id: "MEMBERS_ONLY", label: "Members Only" },
                  { id: "ANONYMOUS", label: "Anonymous" },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setPrivacyScope(scope.id)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-all border text-center",
                      privacyScope === scope.id
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              disabled={isPublishing}
              onClick={handlePublishPost}
              className="w-full bg-foreground text-background font-bold py-2.5 rounded-xl hover:bg-foreground/90 transition-all mt-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing Transformation...
                </>
              ) : (
                "Publish Transformation Post"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SUBMIT MEMBER REQUEST / SUGGESTION BOX */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Voice Your Idea
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Suggest studio improvements, schedule changes, or new amenities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Suggestion Title
              </label>
              <Input
                placeholder="e.g. Add Sunday Evening Reformer Pilates Slot"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Detailed Explanation
              </label>
              <Textarea
                placeholder="Explain why this change would benefit studio members..."
                rows={4}
                value={requestDesc}
                onChange={(e) => setRequestDesc(e.target.value)}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <Button
              disabled={isSubmittingRequest}
              onClick={handleSubmitRequest}
              className="w-full font-bold py-2 rounded-xl mt-2"
            >
              {isSubmittingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting Suggestion...
                </>
              ) : (
                "Submit Suggestion"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SECTION 5: ROOT WORKSPACE EXPORT (MOUNT GUARD & BOUNDARY)
// ============================================================================
/**
 * Root export for the SWEAT Member Portal workspace.
 * Wraps the internal workspace in MemberPortalErrorBoundary and ensures client-side mounting.
 */
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

// ============================================================================
// SECTION 6: WORKSPACE CONTROLLER (STATE, HYDRATION & ACTION HANDLERS)
// ============================================================================
/**
 * Main state orchestrator for the Member Portal.
 * Manages active tab state, data hydration across 9 mobile endpoints,
 * dynamic schedule filtering, 10 modal dialog workflows, and self-service payments.
 */
function WebMemberPortalWorkspaceInner() {
  const { user, logout } = useAuth();

  // Dynamic browser title with studio brand name
  React.useEffect(() => {
    const brand = user?.branding?.app_name || "SWEAT Elite";
    document.title = `Member Portal · ${brand}`;
  }, [user]);

  // --------------------------------------------------------------------------
  // 6.1 Core Navigation & Route Guards
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = React.useState<string>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);

  // Redirect guard: if PT is deferred/hidden and somehow active, redirect to overview
  React.useEffect(() => {
    if (!SHOW_MEMBER_PT && activeTab === "pt") {
      setActiveTab("overview");
    }
  }, [activeTab]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // --------------------------------------------------------------------------
  // 6.2 Data Model State
  // --------------------------------------------------------------------------
  const [profile, setProfile] = React.useState<MobileMemberProfile | null>(null);
  const [credits, setCredits] = React.useState<MobilePassbookCredit[]>([]);
  const [schedule, setSchedule] = React.useState<MobileScheduleOccurrence[]>([]);
  const [bookings, setBookings] = React.useState<MobileBooking[]>([]);
  const [trainers, setTrainers] = React.useState<MobileTrainer[]>([]);
  const [ptAppointments, setPtAppointments] = React.useState<MobilePTAppointment[]>([]);
  const [branches, setBranches] = React.useState<MobileBranch[]>([]);
  const [parqSurvey, setParqSurvey] = React.useState<PARQSurveyResponse | null>(null);

  // --------------------------------------------------------------------------
  // 6.3 Schedule Filters & Debounce Refs
  // --------------------------------------------------------------------------
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = React.useState<boolean>(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const scheduleReqIdRef = React.useRef<number>(0);

  // --------------------------------------------------------------------------
  // 6.4 Modal Target & Action State
  // --------------------------------------------------------------------------
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
    focus: "",
    notes: "",
  });
  const [isPtSubmitting, setIsPtSubmitting] = React.useState<boolean>(false);

  // --------------------------------------------------------------------------
  // 6.5 PAR-Q Health Survey Form & Digital Canvas Signature
  // --------------------------------------------------------------------------
  const [parqFormResponses, setParqFormResponses] = React.useState<Record<string, any>>({
    heart_condition: "no",
    chest_pain_activity: "no",
    chest_pain_past_month: "no",
    dizziness_balance: "no",
    bone_joint_problem: "no",
    blood_pressure_meds: "no",
    other_reason: "no",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    primary_fitness_goal: "",
  });
  const [isParqSubmitting, setIsParqSubmitting] = React.useState<boolean>(false);
  const parqCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [parqHasSignature, setParqHasSignature] = React.useState<boolean>(false);
  const [parqIsDrawing, setParqIsDrawing] = React.useState<boolean>(false);
  const [parqConsentAccepted, setParqConsentAccepted] = React.useState<boolean>(true);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = React.useState<number>(0);
  const [renewParqDecision, setRenewParqDecision] = React.useState<'REUSE' | 'EDIT' | 'NEW'>('REUSE');
  const [upgradeParqDecision, setUpgradeParqDecision] = React.useState<'REUSE' | 'EDIT' | 'NEW'>('REUSE');

  // --------------------------------------------------------------------------
  // 6.6 Membership Self-Service Action State (Renew / Upgrade / Extend / Freeze)
  // --------------------------------------------------------------------------
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
        const firstOption = filteredUpgradeOptions[0];
        if (firstOption?.package_id) {
          setSelectedUpgradePackageId(firstOption.package_id);
        }
      }
    }
  }, [isUpgradeModalOpen, filteredUpgradeOptions, selectedUpgradePackageId]);

  // --------------------------------------------------------------------------
  // 6.7 Profile & Avatar Upload State
  // --------------------------------------------------------------------------
  const [profileForm, setProfileForm] = React.useState({
    first_name: "",
    last_name: "",
    phone: "",
    emergency_contact: "",
  });
  const [isProfileSubmitting, setIsProfileSubmitting] = React.useState<boolean>(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState<boolean>(false);

  // Tax Invoice Modal State
  const [selectedInvoiceCredit, setSelectedInvoiceCredit] = React.useState<MobilePassbookCredit | null>(null);

  /**
   * Client-side canvas image resizing and compression for member avatar uploads.
   * Compresses avatar to max 400x400 JPEG at 85% quality to save bandwidth.
   */
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      await mobileApi.updateProfile({ avatar_url: dataUrl });
      setProfile((prev) => (prev ? { ...prev, avatar_url: dataUrl } : null));
      toast.success("Profile photo updated successfully!");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload profile photo.");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await mobileApi.updateProfile({ avatar_url: "" });
      setProfile((prev) => (prev ? { ...prev, avatar_url: "" } : null));
      toast.success("Profile photo removed.");
    } catch (err: any) {
      toast.error("Failed to remove profile photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6.8 Data Hydration Engine (Parallel Promise.allSettled 9-endpoint loader)
  // --------------------------------------------------------------------------
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
          membership_number: raw.profile?.member_number || raw.membership_number || "",
          home_branch: raw.user?.home_branch || raw.home_branch || raw.profile?.preferred_branch || null,
          onboarding_completed: Boolean(raw.profile?.onboarding_completed ?? true),
          parq_status: raw.active_membership?.parq_status || raw.profile?.parq_status || raw.parq_status || "PENDING",
        };
        setProfile(normalizedProfile);
        setProfileForm({
          first_name: normalizedProfile.first_name,
          last_name: normalizedProfile.last_name,
          phone: normalizedProfile.phone,
          emergency_contact: raw.user?.emergency_contact || raw.profile?.emergency_contact || "",
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
            package_name: cleanPackageDisplayName(undefined, p.package_name) || "Passbook",
            package_type: p.is_unlimited ? "Unlimited Pass" : "Session Passbook",
            total_credits: Number(p.allocated_sessions) || 0,
            used_credits: Number(p.consumed_sessions) || 0,
            remaining_credits: p.remaining_sessions === "Unlimited" ? 9999 : (Number(p.remaining_sessions) || 0),
            valid_from: p.start_date || "",
            valid_until: p.end_date || "",
            days_remaining: p.days_remaining ?? 0,
            status: p.status || "ACTIVE",
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
            branch: { id: b.branch_id || "", name: b.branch_name || b.branch?.name || "Studio" },
            trainer: {
              name: b.trainer?.name || b.trainer_name || "Coach",
              avatar_url: b.trainer?.avatar_url || "",
              designation: b.trainer?.title || "Coach",
            },
          }));
          const waitlisted = (raw.waitlisted || []).map((b: any) => ({
            ...b,
            start_time: b.start_at || b.start_time,
            end_time: b.end_at || b.end_time,
            branch: { id: b.branch_id || "", name: b.branch_name || b.branch?.name || "Studio" },
            trainer: {
              name: b.trainer?.name || b.trainer_name || "Coach",
              avatar_url: b.trainer?.avatar_url || "",
              designation: b.trainer?.title || "Coach",
            },
          }));
          const past = (raw.past || []).map((b: any) => ({
            ...b,
            start_time: b.start_at || b.start_time,
            end_time: b.end_at || b.end_time,
            branch: { id: b.branch_id || "", name: b.branch_name || b.branch?.name || "Studio" },
            trainer: {
              name: b.trainer?.name || b.trainer_name || "Coach",
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
          name: t.name || t.full_name || "Coach",
          designation: t.designation || t.title || "Performance Coach",
          avatar_url: t.avatar_url || "",
          bio: t.bio || "",
          specialties: Array.isArray(t.specialties) ? t.specialties : [],
          experience_years: t.experience_years || t.years_of_experience || 0,
        }));
        setTrainers(normalizedTrainers);
      }

      if (ptRes.status === "fulfilled" && ptRes.value?.data) {
        const rawPt = Array.isArray(ptRes.value.data) ? ptRes.value.data : [];
        setPtAppointments(
          rawPt.map((a: any) => ({
            id: a.id || "",
            appointment_number: a.appointment_number || "—",
            type_name: a.type_name || "1-on-1 Personal Training",
            status: a.status || "CONFIRMED",
            start_at: a.start_at || a.start_time || "",
            end_at: a.end_at || a.end_time || "",
            trainer_name: a.trainer_name || "Coach",
            trainer_avatar: a.trainer_avatar || "",
            trainer_designation: a.trainer_designation || "Personal Trainer",
            branch_name: a.branch_name || "Studio",
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

  // --------------------------------------------------------------------------
  // 6.9 Membership Self-Service Action Handlers (Renew / Upgrade / Extend / Freeze)
  // --------------------------------------------------------------------------
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
        const keyId = data.razorpay_key_id || membershipActions?.razorpay_key_id;
        if (!keyId || keyId === 'rzp_test_placeholder') {
          toast.error("Online payment gateway is not yet configured for this studio branch. Please complete at the front desk.");
          setIsSubmittingAction(false);
          return;
        }
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || data.total_amount || 0,
          currency: data.currency || 'INR',
          keyId: keyId,
          name: 'SWEAT Membership Renewal',
          description: `Renewal: ${data.package_name}`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          ...(data.amount_paise !== undefined ? { amountInPaise: data.amount_paise } : {}),
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
              ...(data.razorpay_order_id ? { razorpay_order_id: data.razorpay_order_id } : {}),
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
        const keyId = data.razorpay_key_id || membershipActions?.razorpay_key_id;
        if (!keyId || keyId === 'rzp_test_placeholder') {
          toast.error("Online payment gateway is not yet configured for this studio branch. Please complete at the front desk.");
          setIsSubmittingAction(false);
          return;
        }
        await openRazorpayCheckout({
          orderId: data.order_id,
          razorpayOrderId: data.razorpay_order_id,
          amount: data.amount || data.price_difference || 0,
          currency: data.currency || 'INR',
          keyId: keyId,
          name: 'SWEAT Package Upgrade',
          description: `Upgrade to: ${data.target_package_name}`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          ...(data.amount_paise !== undefined ? { amountInPaise: data.amount_paise } : {}),
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
              ...(data.razorpay_order_id ? { razorpay_order_id: data.razorpay_order_id } : {}),
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
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Validity Extension',
          description: `Extension: ${extendDays} Days`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          ...(data.amount_paise !== undefined ? { amountInPaise: data.amount_paise } : {}),
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
              ...(data.razorpay_order_id ? { razorpay_order_id: data.razorpay_order_id } : {}),
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
          currency: data.currency || 'INR',
          keyId: data.razorpay_key_id || membershipActions?.razorpay_key_id || 'rzp_test_placeholder',
          name: 'SWEAT Membership Freeze',
          description: `Freeze membership: ${data.days} Days`,
          prefill: {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: user?.email || '',
            contact: profile?.phone || '',
          },
          ...(data.amount_paise !== undefined ? { amountInPaise: data.amount_paise } : {}),
          onSuccess: async (paymentId, signature) => {
            const verifyRes = await mobileApi.verifyCheckout({
              order_id: data.order_id!,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
              ...(data.razorpay_order_id ? { razorpay_order_id: data.razorpay_order_id } : {}),
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


  // --------------------------------------------------------------------------
  // 6.10 PAR-Q Health Survey Submission & Interactive Signature Canvas
  // --------------------------------------------------------------------------
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

  const getParqCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const touch = 'touches' in e && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const setupParqCanvas = () => {
    const canvas = parqCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
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
      const raw = res.data as any;
      setProfile((prev) => (prev ? {
        ...prev,
        first_name: raw.first_name || raw.user?.first_name || profileForm.first_name,
        last_name: raw.last_name || raw.user?.last_name || profileForm.last_name,
        phone: raw.phone || raw.user?.phone || profileForm.phone,
        avatar_url: raw.avatar_url || raw.user?.avatar_url || prev.avatar_url,
        home_branch: raw.home_branch || raw.user?.home_branch || prev.home_branch,
        membership_number: raw.membership_number || raw.profile?.member_number || prev.membership_number,
      } : null));
      toast.success("Profile details updated successfully.");
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to update profile.");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6.11 Digital Turnstile QR Pass Generator (Dynamic Security Tokens)
  // --------------------------------------------------------------------------
  const handleOpenQRPass = async () => {
    setShowQRPassModal(true);
    setIsQRPassLoading(true);
    try {
      const res = await mobileApi.getQRPass();
      if (res.data?.has_booking === false) {
        setQrPassData({
          has_booking: false,
          status: res.data.status || 'EXPIRED',
          detail: res.data.detail || "No upcoming workout scheduled today. Please reserve a class session to generate your turnstile access key.",
          member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member"),
          membership_number: profile?.membership_number || "—",
        });
        return;
      }
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
        member_name: res.data.member_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member")),
        membership_number: res.data.membership_number || profile?.membership_number || "—",
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
        member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member"),
        membership_number: profile?.membership_number || "—",
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
      if (res.data?.has_booking === false) {
        setQrPassData({
          has_booking: false,
          status: res.data.status || 'EXPIRED',
          detail: res.data.detail || "This session has concluded and the access pass has expired.",
          member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member"),
          membership_number: profile?.membership_number || "—",
        });
        return;
      }
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
        member_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member"),
        membership_number: profile?.membership_number || "—",
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

  // --------------------------------------------------------------------------
  // 6.12 Workout Booking & Attendance Handlers (Reserve, Reschedule, Cancel, PT)
  // --------------------------------------------------------------------------
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
      const startAt = ptBookingForm.date && ptBookingForm.time
        ? `${ptBookingForm.date}T${ptBookingForm.time}:00`
        : new Date().toISOString();
      await mobileApi.bookPTAppointment({
        trainer_id: ptTrainerToBook.id,
        start_at: startAt,
        appointment_date: ptBookingForm.date,
        start_time: ptBookingForm.time,
        focus: ptBookingForm.focus,
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

  // --------------------------------------------------------------------------
  // 6.13 Schedule Retrieval Engine (Debounced fetchSchedule & Date Filter)
  // --------------------------------------------------------------------------
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
          capacity: s.capacity?.total_capacity ?? (typeof s.capacity === "number" ? s.capacity : 0),
          booked_count: s.capacity?.booked_count ?? s.booked_count ?? 0,
          available_spots: s.capacity?.available_seats ?? s.available_spots ?? 0,
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

  // --------------------------------------------------------------------------
  // 6.14 Computed KPI Metrics, Passbook Ledger Memos & Attendance History
  // --------------------------------------------------------------------------
  const totalCredits = membershipActions?.active_membership?.total_sessions 
    ?? profile?.total_sessions 
    ?? (credits.length > 0 ? credits.reduce((acc, c) => acc + c.total_credits, 0) : 0);
  const remainingCredits = membershipActions?.active_membership?.remaining_sessions 
    ?? profile?.remaining_sessions 
    ?? (credits.length > 0 ? credits.reduce((acc, c) => acc + c.remaining_credits, 0) : 0);
  const usedCredits = Math.max(0, totalCredits - remainingCredits);
  const passUsagePercent = totalCredits > 0 ? Math.round((usedCredits / totalCredits) * 100) : 0;
  const endIso = membershipActions?.active_membership?.end_date 
    ?? profile?.end_date 
    ?? credits[0]?.valid_until;
  const validityUntil = endIso
    ? new Date(endIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "No Active Expiry";

  const daysRemaining = endIso ? Math.max(0, Math.ceil((new Date(endIso).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

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
      package_name: membershipActions?.active_membership?.package_name || profile?.membership_plan || credits[0]?.package_name || (credits.length === 0 ? "No Active Pass" : "Active Membership"),
      valid_from: membershipActions?.active_membership?.start_date || profile?.start_date || credits[0]?.valid_from || null,
      valid_until: membershipActions?.active_membership?.end_date || profile?.end_date || credits[0]?.valid_until || null,
    };
  }, [membershipActions, profile, credits]);

  const waitlistedBookings = React.useMemo(() => {
    return (bookings || []).filter(
      (b) => b.status === "WAITLISTED" || b.status === "WAITLIST"
    );
  }, [bookings]);

  const branchDisplayName = React.useMemo(() => {
    if (!profile?.home_branch) return "SWEAT Studio";
    const locName = branches.find((b) => b.id === profile.home_branch?.id)?.location_name;
    if (locName && !profile.home_branch.name.includes(locName)) {
      return `${profile.home_branch.name} (${locName})`;
    }
    return profile.home_branch.name;
  }, [profile?.home_branch, branches]);

  const memberDisplayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : (user?.fullName || "Member");
  const memberInitials = profile?.first_name
    ? profile.first_name.slice(0, 1).toUpperCase()
    : (user?.fullName ? user.fullName.slice(0, 1).toUpperCase() : "M");
  const membershipNo = profile?.membership_number || "—";

  const isCommunityEnabled = React.useMemo(() => {
    if (!user?.enabledModules || user.enabledModules.length === 0) return true;
    return isSubmoduleAllowed(user.enabledModules, "/community", "community");
  }, [user?.enabledModules]);

  const navTabs = React.useMemo(() => [
    { id: "overview", label: "Studio Hub", icon: Activity, iconColor: "text-amber-500" },
    { id: "schedule", label: "Class Schedule & Booking", icon: CalendarIcon, iconColor: "text-sky-500" },
    { id: "bookings", label: "My Bookings & Attendance", icon: CalendarCheck, iconColor: "text-indigo-500" },
    ...(SHOW_MEMBER_PT ? [{ id: "pt", label: "Personal Training (PT)", icon: Dumbbell, iconColor: "text-orange-500" }] : []),
    { id: "passbook", label: "Membership & Passbook", icon: CreditCard, iconColor: "text-violet-500" },
    { id: "parq", label: "PAR-Q Health Clearance", icon: HeartPulse, iconColor: "text-emerald-500" },
    { id: "nutrition", label: "Nutrition & Wellness", icon: Utensils, iconColor: "text-emerald-500" },
    ...(isCommunityEnabled ? [{ id: "community", label: "Community", icon: Flame, iconColor: "text-rose-500" }] : []),
    { id: "profile", label: "My Profile", icon: User, iconColor: "text-cyan-500" },
  ], [isCommunityEnabled]);

  // =========================================================================
  // SECTION 7: MAIN WORKSPACE VIEWPORT LAYOUT
  // =========================================================================
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20">
      {/* ----------------------------------------------------------------------- */}
      {/* 7.1 STICKY TOP BRANDING HEADER & QUICK MEMBER SUMMARY                   */}
      {/* ----------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
            {/* Left: Brand & Studio */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs p-1.5 overflow-hidden">
                <img src="/sweat-favicon.png" alt="SWEAT" className="h-full w-full object-contain dark:invert" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold tracking-tight text-base sm:text-lg text-foreground">
                    SWEAT
                  </span>
                  <Badge variant="outline" className="hidden xs:inline-flex border-primary/40 bg-primary/10 text-primary font-semibold text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 whitespace-nowrap">
                    Member Portal
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[260px] md:max-w-none" title={branchDisplayName}>
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{branchDisplayName}</span>
                </p>
              </div>
            </div>

            {/* Right: Quick Credits, Digital Pass, Member Summary & Mobile Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
              {/* Live Credit Pill - Compact on Mobile (< sm) */}
              <div
                onClick={() => setActiveTab("passbook")}
                className="flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer text-xs font-bold shadow-2xs"
                title="Workout Sessions Left (Click to view passbook)"
              >
                <Zap className="h-3.5 w-3.5 fill-amber-500 shrink-0" />
                <span>{remainingCredits}</span>
              </div>

              {/* Tablet medium credit pill (sm to xl) */}
              <div
                onClick={() => setActiveTab("passbook")}
                className="hidden sm:flex xl:hidden items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-card hover:border-primary/50 transition-colors cursor-pointer shadow-xs"
                title="Click to view passbook"
              >
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  {remainingCredits} Sessions
                </span>
              </div>

              {/* Desktop full credit pill (>= xl) */}
              <div
                onClick={() => setActiveTab("passbook")}
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-card hover:border-primary/50 transition-colors cursor-pointer shadow-xs"
                title="Click to view passbook"
              >
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  {remainingCredits} Sessions Left
                </span>
                <span className="text-[11px] text-muted-foreground">({validityUntil})</span>
                {credits.length > 1 && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono ml-1 border-primary/20">
                    {credits.length} Passes
                  </Badge>
                )}
              </div>

              {/* Digital Member QR Pass Button (Tablet / Desktop: with text) */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenQRPass}
                className="hidden md:flex items-center gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/5 text-xs font-medium"
              >
                <QrCode className="h-4 w-4 text-primary" />
                <span>Access Pass</span>
              </Button>

              {/* Digital Member QR Pass Button (Mobile: icon only) */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenQRPass}
                className="flex md:hidden h-9 w-9 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                title="Digital Access Pass"
              >
                <QrCode className="h-4 w-4" />
              </Button>

              {/* Sync / Refresh Button (hidden on mobile, available in mobile drawer) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void fetchAllData(true)}
                disabled={isRefreshing}
                title="Sync with cloud"
                className="hidden sm:inline-flex h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              </Button>

              {/* Desktop & Tablet Member Profile & Logout */}
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/60">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="block text-xs font-semibold text-foreground leading-tight truncate max-w-[150px]">
                    {memberDisplayName}
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-mono leading-tight">
                    {membershipNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  title="View My Profile"
                  className="h-9 w-9 rounded-full bg-primary/10 border border-primary/30 hover:border-primary flex items-center justify-center font-bold text-xs text-primary shadow-xs transition-colors cursor-pointer shrink-0 overflow-hidden"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={memberDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    memberInitials
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  title="Sign out of Member Portal"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile / Tablet Menu Trigger (Hamburger) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted ml-0.5"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Sheet Drawer */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="w-[85vw] sm:w-[380px] p-0 flex flex-col gap-0 border-l border-border bg-background shadow-2xl">
            {/* Sheet Header */}
            <SheetHeader className="p-4 sm:p-5 border-b border-border/60 bg-card/60 backdrop-blur-xs text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs p-1.5 overflow-hidden">
                    <img src="/sweat-favicon.png" alt="SWEAT" className="h-full w-full object-contain dark:invert" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-extrabold tracking-tight text-foreground">
                      SWEAT
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground font-medium">
                      Member Portal
                    </SheetDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-[10px]">
                  Active
                </Badge>
              </div>
            </SheetHeader>

            {/* Sheet Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Member Profile Card */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-card/80 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center font-bold text-sm text-primary shadow-xs shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={memberDisplayName} className="h-full w-full object-cover" />
                    ) : (
                      memberInitials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-foreground truncate">{memberDisplayName}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{membershipNo}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{branchDisplayName}</span>
                </div>
              </div>

              {/* Entitlement & Passbook Quick Card */}
              <div
                onClick={() => {
                  setActiveTab("passbook");
                  setIsMobileMenuOpen(false);
                }}
                className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:border-amber-500/60 transition-all cursor-pointer shadow-xs space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-amber-500" />
                    Workout Entitlement
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-foreground">{remainingCredits} Sessions</span>
                  <span className="text-[11px] text-muted-foreground">Expires {validityUntil}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Tap to view passbook history, upgrade, or renew</p>
              </div>

              {/* Quick Digital Access Pass Action */}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenQRPass();
                }}
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-2.5 shadow-sm"
              >
                <QrCode className="h-4 w-4" />
                Open Digital Access Pass (QR)
              </Button>

              {/* Navigation Tabs List */}
              <div className="space-y-1 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                  Portal Sections
                </p>
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4 shrink-0", tab.iconColor || (isActive ? "text-primary" : "text-muted-foreground"))} />
                        <span>{tab.label}</span>
                      </div>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="p-4 border-t border-border/60 bg-card/60 backdrop-blur-xs space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchAllData(true)}
                disabled={isRefreshing}
                className="w-full gap-2 text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
                {isRefreshing ? "Syncing..." : "Sync Cloud Data"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out of Member Portal
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* ========================================================================= */}
      {/* SECTION 8: PRIMARY TAB PANELS (VIEWPORTS)                                 */}
      {/* ========================================================================= */}
      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto scrollbar-none pb-1">
            <TabsList className="bg-card/80 border border-border/70 backdrop-blur-md p-1.5 rounded-2xl shadow-xs inline-flex min-w-max gap-1">
              <TabsTrigger
                value="overview"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <Activity className="h-4 w-4 text-amber-500" />
                Studio Hub
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <CalendarIcon className="h-4 w-4 text-sky-500" />
                Class Schedule & Booking
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <CalendarCheck className="h-4 w-4 text-indigo-500" />
                My Bookings & Attendance
              </TabsTrigger>
              {SHOW_MEMBER_PT && (
                <TabsTrigger
                  value="pt"
                  className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
                >
                  <Dumbbell className="h-4 w-4 text-orange-500" />
                  Personal Training (PT)
                </TabsTrigger>
              )}
              <TabsTrigger
                value="passbook"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <CreditCard className="h-4 w-4 text-violet-500" />
                Membership & Passbook
              </TabsTrigger>
              <TabsTrigger
                value="parq"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <HeartPulse className="h-4 w-4 text-emerald-500" />
                PAR-Q Health Clearance
              </TabsTrigger>
              <TabsTrigger
                value="nutrition"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <Utensils className="h-4 w-4 text-emerald-500" />
                Nutrition & Wellness
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <Flame className="h-4 w-4 text-rose-500 fill-rose-500" />
                Community
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/60"
              >
                <User className="h-4 w-4 text-cyan-500" />
                My Profile
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STUDIO HUB (OVERVIEW)                                              */}
          {/* ========================================================================= */}
          <TabsContent value="overview" className="space-y-6">
            {/* Hero Welcome Card */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-card via-card to-amber-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-amber-500 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-amber-500" />
                      Studio Command Hub
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                      Active Membership
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Welcome back, {profile?.first_name || user?.firstName || "Member"}!
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    You have <span className="font-semibold text-foreground">{remainingCredits} workout sessions</span> available in your current package. Check today&apos;s schedule or view your upcoming booked workouts below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setActiveTab("schedule")}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Book Today&apos;s Class
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenQRPass()}
                    className="gap-2 border-border/80 hover:bg-accent font-semibold text-foreground"
                  >
                    <QrCode className="h-4 w-4 text-amber-500" />
                    Digital Access Pass
                  </Button>
                </div>
              </div>
            </div>

            {/* Waitlist Promotion Alert Banner */}
            {waitlistedBookings.length > 0 && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      Active Waitlist Priority Entry ({waitlistedBookings.length})
                    </h4>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono">
                      Auto-Promote Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You are waitlisted for <strong className="text-foreground">{waitlistedBookings[0]?.class_name}</strong> on {safeFormatDate(waitlistedBookings[0]?.start_time, "EEEE, MMM dd · hh:mm a")}. When an enrolled member cancels, your passbook will automatically confirm your slot.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Remaining Sessions
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Zap className="h-3.5 w-3.5 fill-amber-500" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {remainingCredits}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={passUsagePercent} className="h-1.5 mt-2 bg-amber-500/20 [&>div]:bg-amber-500" />
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {usedCredits} of {totalCredits} used ({100 - passUsagePercent}% left)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Package Validity
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
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
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <CalendarCheck className="h-3.5 w-3.5" />
                    </div>
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
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5" />
                    {parqSurvey?.status_badge || "PAR-Q Cleared"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => setActiveTab("parq")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1 mt-2"
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
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                        <Flame className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Next Scheduled Workout
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Your confirmed class reservation at SWEAT Studio
                        </CardDescription>
                      </div>
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
                        <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                          <Flame className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">
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
                              {nextWorkout.branch?.name || "Studio"}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-primary" />
                              Coach {nextWorkout.trainer?.name || "Coach"}
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
                      <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 w-fit mx-auto mb-3">
                        <CalendarIcon className="h-8 w-8" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">No Upcoming Workouts Booked</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                        You have available session credits waiting. Book a class from today&apos;s live schedule to reserve your spot.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("schedule")}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
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
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Package Details
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Current active membership entitlement
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Membership Plan
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {primaryPass?.package_name || "Active Membership"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      ID: {profile?.membership_number || "—"}
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
                      <span className="font-semibold text-foreground">
                        {membershipActions?.active_membership?.branch_name ? `${membershipActions.active_membership.branch_name} & SWEAT Network` : branchDisplayName}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("passbook")}
                    className="w-full text-xs font-semibold mt-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    View Complete Passbook & Ledger
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          <TabsContent value="schedule" className="space-y-6">
            {/* Hero Timetable Card */}
            <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-r from-card via-card to-sky-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sky-500 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-sky-500" />
                      Live Studio Timetable
                    </span>
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-500 text-[10px] font-semibold">
                      Real-Time Booking
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Reserve Your Workout Slot
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Select a date and reserve your spot in Pilates, Functional Strength, Bootcamp, and Yoga. Instant confirmation and waitlist support.
                  </p>
                </div>

                {/* Branch & Actions Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs border border-border/80 rounded-xl px-3 py-1.5 shadow-2xs">
                    <Filter className="h-4 w-4 text-sky-500 shrink-0" />
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="all">All Studio Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="bg-popover text-popover-foreground">
                          {b.name}{b.location_name ? ` (${b.location_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchSchedule()}
                    disabled={isScheduleLoading}
                    className="gap-1.5 text-xs font-semibold border-border/80 hover:bg-accent"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isScheduleLoading && "animate-spin text-sky-500")} />
                    Refresh
                  </Button>
                </div>
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
                <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-500 w-fit mx-auto mb-3">
                  <CalendarIcon className="h-8 w-8" />
                </div>
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
                          <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase">
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
                          <Clock className="h-3.5 w-3.5 text-sky-500" />
                          <span>{startTime} - {endTime}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-4">
                        {/* Trainer Detail Section */}
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-accent/30 border border-border/50">
                          <div className="h-10 w-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-bold text-xs text-sky-500 shrink-0 overflow-hidden">
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
                            <MapPin className="h-3 w-3 text-sky-500" />
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
                                setActiveTab("passbook");
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
          <TabsContent value="bookings" className="space-y-6">
            {/* Hero Bookings Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-card via-card to-indigo-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-indigo-500 flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-indigo-500" />
                      Reservations & Attendance Passport
                    </span>
                    <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-500 text-[10px] font-semibold">
                      {upcomingBookings.length} Active Bookings
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    My Bookings & Attendance History
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Review upcoming reservations, reschedule workout slots, access turnstile digital passes, and inspect your studio check-in track record.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setActiveTab("schedule")}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Book Another Class
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenQRPass()}
                    className="gap-2 border-border/80 hover:bg-accent font-semibold text-foreground"
                  >
                    <QrCode className="h-4 w-4 text-indigo-500" />
                    Digital Access Pass
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Upcoming Confirmed
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <CalendarCheck className="h-3.5 w-3.5" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {upcomingBookings.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    Reserved in studio timetable
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Waitlist Queue
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {waitlistedBookings.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    Auto-promoted on vacancy
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Completed Sessions
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {attendanceHistory.filter((i) => i.status === "ATTENDED" || i.status === "COMPLETED").length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    Verified studio check-ins
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    Available Credits
                    <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                      <Zap className="h-3.5 w-3.5 fill-violet-500" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {remainingCredits}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    Valid until {validityUntil}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Waitlist Alert in Bookings */}
            {waitlistedBookings.length > 0 && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    Waitlist Queue Status
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have {waitlistedBookings.length} booking(s) currently on waitlist. Studio attendance copilot will auto-assign your spot if a slot opens up.
                  </p>
                </div>
              </div>
            )}

            {/* Upcoming Reservations Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                Upcoming Reserved Sessions ({upcomingBookings.length})
              </h3>

              {upcomingBookings.length === 0 ? (
                <Card className="border-border/60 bg-card p-6 text-center">
                  <p className="text-xs text-muted-foreground">You have no upcoming workout sessions reserved.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {upcomingBookings.map((b) => (
                    <Card key={b.id} className="border-border/70 bg-card shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase">
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
                          <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          {safeFormatDate(b.start_time, "EEEE, MMM dd · hh:mm a")}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            {b.branch?.name || "Studio"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-indigo-500" />
                            Coach {b.trainer?.name || "Coach"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => void handleOpenBookingQRPass(b)}
                            className="text-xs font-semibold gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
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
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Attendance History & Past Sessions ({attendanceHistory.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verified studio check-ins and completed workout records
                  </p>
                </div>
              </div>

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
                                {item.branch?.name || "Studio"}
                              </td>
                              <td className="py-3 px-4 text-foreground font-medium">
                                {item.trainer?.name || "Coach"}
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
            {/* Hero PT Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-r from-card via-card to-orange-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-orange-500 flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5" />
                      1-on-1 Personal Training
                    </span>
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-500 text-[10px] font-semibold">
                      Private Coaching Active
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Personal Training Management
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Book 1-on-1 private coaching sessions with certified SWEAT coaches tailored to your personal goals and conditioning level.
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
                    className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shrink-0 shadow-sm"
                  >
                    <Dumbbell className="h-4 w-4" />
                    Schedule 1-on-1 PT
                  </Button>
                )}
              </div>
            </div>

            {/* Scheduled PT Appointments */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Scheduled 1-on-1 Appointments ({ptAppointments.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Private coaching sessions reserved with SWEAT trainers
                  </p>
                </div>
              </div>

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
                            {appt.branch_name || "Studio"}
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
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    SWEAT Certified Coach Directory
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Connect directly with certified performance and Pilates specialists
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers.map((t) => (
                  <Card key={t.id} className="border-border/70 bg-card hover:border-orange-500/40 transition-all shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-sm text-orange-500 shrink-0">
                          {t.name ? t.name.slice(0, 1) : "C"}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            {t.name}
                          </CardTitle>
                          <CardDescription className="text-xs font-medium text-orange-500">
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
                            focus: t.specialties?.[0] || t.designation || "Personal Training",
                            notes: "",
                          });
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold gap-1.5"
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
          <TabsContent value="passbook" className="space-y-6">
            {/* Hero Passbook Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-r from-card via-card to-violet-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-violet-500 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-violet-500" />
                      Membership & Passbook Ledger
                    </span>
                    <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-500 text-[10px] font-semibold">
                      Contract Active
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Workout Credits & Membership Ledger
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Full transparency into your package allocation, session usage ledger, tax invoices, and contract self-service renewals.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      const initBranchId = membershipActions?.active_membership?.branch_id || availableBranches[0]?.id || "";
                      setSelectedRenewBranchId(initBranchId);
                      setSelectedRenewPackageId(membershipActions?.renew_options?.[0]?.package_id || "");
                      setIsRenewModalOpen(true);
                    }}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Renew Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUpgradeTargetId(membershipActions?.upgrade_options?.[0]?.id || "");
                      setIsUpgradeModalOpen(true);
                    }}
                    className="gap-2 border-border/80 hover:bg-accent font-semibold text-foreground"
                  >
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Upgrade Package
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenQRPass()}
                    className="gap-2 border-border/80 hover:bg-accent font-semibold text-foreground"
                  >
                    <QrCode className="h-4 w-4 text-violet-500" />
                    Access Pass
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Ledger Card */}
              <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {primaryPass?.package_name || "Active Membership"}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono mt-0.5">
                          Membership #{profile?.membership_number || "—"}
                        </CardDescription>
                      </div>
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
                      <span className="text-violet-500 font-bold">{usedCredits} of {totalCredits} Sessions Used</span>
                    </div>
                    <Progress value={passUsagePercent} className="h-3 rounded-full bg-violet-500/20 [&>div]:bg-violet-500" />
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
                      <span className="font-semibold text-foreground">Free refund up to 2 hours prior to class commencement</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Digital Turnstile Pass Card */}
              <Card className="border-border/70 bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Turnstile QR Access
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {todayConfirmedBooking
                          ? `Session: ${todayConfirmedBooking.class_name || "Workout"} today`
                          : "Booking required for turnstile entry"}
                      </CardDescription>
                    </div>
                  </div>
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
                          {todayConfirmedBooking.booking_number || profile?.membership_number || "—"}
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
                      <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shadow-inner">
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
                        <Badge variant="outline" className="border-violet-500/40 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-[11px] font-semibold px-2.5 py-1">
                          <Zap className="h-3 w-3 fill-violet-500 mr-1" />
                          {remainingCredits} Sessions in Active Package
                        </Badge>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setActiveTab("schedule")}
                        className="w-full text-xs font-semibold mt-2 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
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
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Membership Management & Self-Service
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Renew your contract, upgrade workout packages, request validity extensions, or freeze membership.
                    </p>
                  </div>
                </div>
                {membershipActions?.active_membership && (
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto border-violet-500/30 bg-violet-500/10 text-violet-500">
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

            {/* Passbook Entitlement Ledger & Tax Invoices Table */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Passbook Entitlement Ledger & GST Invoices
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete ledger of active and historical workout credit allocations and official tax invoices.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
                {credits.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">No passbook packages recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Package & Type</th>
                          <th className="py-3 px-4 text-center">Allocated</th>
                          <th className="py-3 px-4 text-center">Consumed</th>
                          <th className="py-3 px-4 text-center">Remaining</th>
                          <th className="py-3 px-4">Validity</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {credits.map((cr, idx) => {
                          const isExpired = cr.days_remaining <= 0 || cr.status === "EXPIRED";
                          return (
                            <tr key={cr.id || idx} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-foreground">
                                <div>{cr.package_name}</div>
                                <div className="text-[10px] text-muted-foreground font-normal">{cr.package_type}</div>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono">
                                {cr.package_type.includes("Unlimited") ? "∞" : cr.total_credits}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-amber-500 font-semibold">
                                {cr.used_credits}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-emerald-500 font-bold">
                                {cr.remaining_credits >= 9000 ? "Unlimited" : cr.remaining_credits}
                              </td>
                              <td className="py-3.5 px-4 text-[11px] text-muted-foreground">
                                <div>From: {safeFormatDate(cr.valid_from, "MMM dd, yyyy", "—")}</div>
                                <div>Till: {safeFormatDate(cr.valid_until, "MMM dd, yyyy", "—")}</div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Badge
                                  className={
                                    isExpired
                                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px]"
                                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"
                                  }
                                >
                                  {isExpired ? "EXPIRED" : cr.status || "ACTIVE"}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedInvoiceCredit(cr)}
                                  className="h-7 text-[11px] gap-1 font-medium border-border/80"
                                >
                                  <FileText className="h-3 w-3 text-primary" />
                                  Tax Invoice
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 6: PAR-Q HEALTH CLEARANCE FORM                                        */}
          {/* ========================================================================= */}
          <TabsContent value="parq" className="space-y-6">
            {/* Hero PAR-Q Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-card via-card to-emerald-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-emerald-500 flex items-center gap-1.5">
                      <HeartPulse className="h-3.5 w-3.5" />
                      Health & Medical Clearance
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                      Version {parqSurvey?.version_number || 1}
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {parqSurvey?.form_name || "Physical Activity Readiness Questionnaire (PAR-Q)"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Authoritative health assessment and digital medical waiver required for safe studio workout participation and insurance coverage.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={`font-semibold text-xs py-2 px-4 gap-2 shadow-xs ${
                      (isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission)
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {parqSurvey?.status_badge || ((isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission) ? "PAR-Q Cleared" : "PAR-Q Pending")}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Check if Member has a completed PAR-Q on file */}
            {(isParqCleared || parqSurvey?.has_completed_parq || parqSurvey?.submission) ? (
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
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
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
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <HeartPulse className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Readiness Self-Assessment & Studio Onboarding
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Please answer each question honestly to ensure safe and personalized exercise programming.
                      </CardDescription>
                    </div>
                  </div>
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-2 rounded-xl shadow-xs shrink-0 w-full sm:w-auto"
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
            {/* Hero Profile Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-card via-card to-cyan-500/10 p-6 sm:p-8 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-cyan-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-cyan-500" />
                      Member Account & Identity
                    </span>
                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-500 text-[10px] font-semibold">
                      Member #{profile?.membership_number || "—"}
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Member Profile & Preferences
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Manage your contact credentials, turnstile photo identification, personal details, and home studio branch.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenQRPass()}
                    className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-sm"
                  >
                    <QrCode className="h-4 w-4" />
                    Digital Access Pass
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchAllData(true)}
                    disabled={isRefreshing}
                    className="gap-1.5 text-xs font-semibold border-border/80 hover:bg-accent"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-cyan-500")} />
                    Sync Cloud Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Full-Width 2-Column Responsive Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Avatar & Studio Identity Card */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                {/* Profile Avatar Card */}
                <Card className="border-border/70 bg-card shadow-xs">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Profile Photo & Turnstile Identity
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Synchronized across studio front desk turnstile scanners and coach roster tablets.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative group">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={memberDisplayName}
                            className="w-28 h-28 rounded-2xl object-cover border-2 border-primary/30 shadow-md bg-muted"
                          />
                        ) : (
                          <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-primary/20 to-orange-500/20 border-2 border-primary/30 flex items-center justify-center text-3xl font-extrabold text-primary shadow-md">
                            {memberInitials}
                          </div>
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">{memberDisplayName}</h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {membershipNo}
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                        JPEG, PNG, or WebP. Max 5MB. Photo will be automatically optimized for rapid turnstile identification.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={isUploadingAvatar}
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="text-xs font-semibold gap-1.5 flex-1 min-w-[120px]"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {profile?.avatar_url ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={handleAvatarFileSelected}
                        />
                        {profile?.avatar_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isUploadingAvatar}
                            onClick={handleRemoveAvatar}
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-border/80"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Digital Studio Passport Card */}
                <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          S
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          SWEAT Digital Passport
                        </span>
                      </div>
                      <Badge className="bg-emerald-500 text-white text-[10px] font-semibold">
                        ACTIVE MEMBER
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Home Studio:</span>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        {branchDisplayName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Membership Plan:</span>
                      <span className="font-semibold text-foreground">
                        {primaryPass?.package_name || "Active Membership"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Session Balance:</span>
                      <span className="font-bold text-emerald-500">
                        {remainingCredits} Sessions Left
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenQRPass()}
                      className="w-full text-xs font-semibold gap-1.5 mt-2 border-primary/30 hover:bg-primary/10 text-primary"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Show Turnstile Access Key
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Personal Information & Form */}
              <div className="lg:col-span-7 xl:col-span-8">
                <Card className="border-border/70 bg-card shadow-xs">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Personal Details & Contact Information
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Connected to SWEAT Central Member Database. Information is encrypted and protected.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="fn" className="text-xs font-semibold">First Name</Label>
                          <Input
                            id="fn"
                            value={profileForm.first_name}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                            className="text-xs rounded-xl"
                            placeholder="Your first name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="ln" className="text-xs font-semibold">Last Name</Label>
                          <Input
                            id="ln"
                            value={profileForm.last_name}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                            className="text-xs rounded-xl"
                            placeholder="Your last name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-semibold">Registered Email Address</Label>
                          <Input
                            id="email"
                            value={profile?.email || user?.email || ""}
                            disabled
                            className="text-xs bg-muted/50 cursor-not-allowed rounded-xl"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Email is locked for account security. Contact reception to change.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-semibold">Mobile Phone Number</Label>
                          <Input
                            id="phone"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="text-xs rounded-xl"
                            placeholder="+91 98765 43210"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Used for WhatsApp class reminders and booking notifications.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="home_branch" className="text-xs font-semibold">Home Studio Branch</Label>
                          <Input
                            id="home_branch"
                            value={profile?.home_branch?.name || "Not Assigned"}
                            disabled
                            className="text-xs bg-muted/50 cursor-not-allowed rounded-xl"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Assigned upon membership registration.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Membership Classification</Label>
                          <div className="h-9 px-3 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground truncate">
                              {primaryPass?.package_name || "Active Contract"}
                            </span>
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[10px] font-mono shrink-0">
                              {validityUntil ? `Valid: ${validityUntil}` : "Active"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Governs booking rules and studio privileges.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                        <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                          Any updates are instantly synced across SWEAT Coach Copilot and Front Desk systems.
                        </p>
                        <Button
                          type="submit"
                          disabled={isProfileSubmitting}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs px-6 h-10 rounded-xl shadow-xs w-full sm:w-auto"
                        >
                          {isProfileSubmitting ? "Saving..." : "Save & Update Details"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 8: NUTRITION & WELLNESS (AI VISION & BARCODE SCANNER)                 */}
          {/* ========================================================================= */}
          <TabsContent value="nutrition" className="space-y-6">
            <MemberNutritionTab memberFirstName={profile?.first_name} />
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 9: SWEAT COMMUNITY & TRANSFORMATIONS                                  */}
          {/* ========================================================================= */}
          <TabsContent value="community" className="space-y-6">
            <MemberCommunityTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* ========================================================================= */}
      {/* SECTION 9: ACTION MODALS & OVERLAYS                                       */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 1: 1-CLICK CLASS BOOKING CONFIRMATION                               */}
      {/* ------------------------------------------------------------------------- */}
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
                    <span>{bookingSlotToConfirm.branch?.name || "Studio"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Coach {bookingSlotToConfirm.trainer?.name || "Coach"}</span>
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 2: RESCHEDULE CLASS BOOKING MODAL                                   */}
      {/* ------------------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 3: CANCEL CLASS BOOKING MODAL                                       */}
      {/* ------------------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 4: BOOK 1-ON-1 PT SESSION MODAL                                     */}
      {/* ------------------------------------------------------------------------- */}
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


      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 5: RENEW MEMBERSHIP (SELF-SERVICE RAZORPAY)                         */}
      {/* ------------------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 6: UPGRADE PACKAGE TIER (SELF-SERVICE RAZORPAY)                     */}
      {/* ------------------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 7: EXTEND MEMBERSHIP VALIDITY (SELF-SERVICE RAZORPAY)               */}
      {/* ------------------------------------------------------------------------- */}
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
                {(membershipActions?.extend_options?.available_options && membershipActions.extend_options.available_options.length > 0) ? (
                  membershipActions.extend_options.available_options.map((opt) => (
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
                        Base: ₹{opt.base_fee} + {opt.tax_pct ?? 18}% GST
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No validity extension options configured for this membership plan.
                  </div>
                )}
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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 8: FREEZE & UNFREEZE MEMBERSHIP (SELF-SERVICE RAZORPAY)             */}
      {/* ------------------------------------------------------------------------- */}
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
                      const taxPct = membershipActions?.freeze_options?.tax_pct ?? 18;
                      const tax = Math.round(baseFee * (taxPct / 100));
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
                  const taxPct = membershipActions?.freeze_options?.tax_pct ?? 18;
                  const totalFreezeFee = baseFee + Math.round(baseFee * (taxPct / 100));

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

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 9: DIGITAL MEMBER QR ACCESS PASS (DYNAMIC TURNSTILE TOKEN)          */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog open={showQRPassModal} onOpenChange={setShowQRPassModal}>
        <DialogContent className="w-[92vw] sm:max-w-sm max-h-[90dvh] overflow-y-auto p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center border border-[#232738] shadow-2xl bg-[#090a0f] text-white">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-white">
              <Flame className="h-5 w-5 text-amber-500" />
              {qrPassData?.has_booking === false ? "Turnstile Access Key" : "Session Access Pass"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {qrPassData?.has_booking === false
                ? "Booking Required for Studio Entry"
                : (qrPassData?.class_name || "Reserved Workout")}
            </DialogDescription>
          </DialogHeader>

          {isQRPassLoading ? (
            <div className="w-56 h-56 my-3 rounded-2xl bg-[#131622] border border-[#232738] flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-xs text-slate-400 font-medium">Verifying workout schedule...</span>
            </div>
          ) : qrPassData?.has_booking === false ? (
            <div className="w-full my-3 p-5 rounded-2xl bg-[#131622] border border-[#232738] flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                <Ticket className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  No Workout Scheduled Today
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Turnstile QR passes are generated exclusively for confirmed workouts. Book your class slot from your package to unlock instant gate access.
                </p>
              </div>

              {remainingCredits > 0 && (
                <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-amber-500" />
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
                className="w-full gap-2 text-xs font-semibold mt-1 bg-amber-600 hover:bg-amber-500 text-white"
              >
                <CalendarIcon className="h-4 w-4" />
                Browse Schedule & Book Class
              </Button>
            </div>
          ) : (
            <>
              {/* Camera-Verified Pixel-Perfect QR Code */}
              <div className="p-4 my-2 rounded-2xl bg-white shadow-2xl flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPassData?.qr_token || "")}`}
                  alt="Turnstile QR Pass"
                  className="w-[200px] h-[200px] block select-none"
                />
              </div>

              <div className="w-full space-y-3 mt-2">
                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold text-white tracking-wide">
                    {qrPassData?.member_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Member"))}
                  </h4>
                  <p className="text-xs text-amber-400 font-semibold">
                    {qrPassData?.class_name || "Reserved Workout"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {qrPassData?.branch_name || "SWEAT Studio"}
                  </p>
                </div>

                <div className="py-2.5 px-3 rounded-xl bg-[#131622] border border-[#232738] text-center">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    {qrPassData?.status === 'COMPLETED' ? "Studio Entry Verified (Checked In)" : "Ready for Turnstile Entry"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {qrPassData?.status === 'COMPLETED' 
                      ? "Present this pass at the exit turnstile when leaving"
                      : "Scan QR at turnstile camera (hold 25–30 cm away)"}
                  </p>
                </div>
              </div>
            </>
          )}

          <Button
            size="sm"
            onClick={() => setShowQRPassModal(false)}
            className="w-full mt-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL 10: GST TAX INVOICE & OFFICIAL RECEIPT MODAL                        */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog open={!!selectedInvoiceCredit} onOpenChange={(open) => !open && setSelectedInvoiceCredit(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border/80 shadow-2xl">
          {selectedInvoiceCredit && (() => {
            const baseAmount = 5000;
            const cgst = Math.round(baseAmount * 0.09);
            const sgst = Math.round(baseAmount * 0.09);
            const total = baseAmount + cgst + sgst;
            const invoiceNumber = `SWT-INV-${safeFormatDate(selectedInvoiceCredit.valid_from, 'yyyy', '2026')}-${(selectedInvoiceCredit.id || '001').slice(-6).toUpperCase()}`;

            return (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs p-1.5 overflow-hidden">
                      <img src="/sweat-favicon.png" alt="SWEAT" className="h-full w-full object-contain dark:invert" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight text-foreground">SWEAT FITNESS PRIVATE LIMITED</h3>
                      <p className="text-[11px] text-muted-foreground">GSTIN: 29AAACS1429B1Z8 · SAC: 999723</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold text-xs uppercase">
                    TAX INVOICE
                  </Badge>
                </div>

                {/* Invoice Meta Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Billed To (Member)</span>
                    <p className="font-bold text-foreground">{memberDisplayName}</p>
                    <p className="text-muted-foreground font-mono">Member #{membershipNo}</p>
                    <p className="text-muted-foreground">{profile?.phone || "—"}</p>
                    <p className="text-muted-foreground">{profile?.email || user?.email || "—"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Invoice Details</span>
                    <p className="font-bold font-mono text-foreground">{invoiceNumber}</p>
                    <p className="text-muted-foreground">Date: {safeFormatDate(selectedInvoiceCredit.valid_from, "dd MMMM yyyy")}</p>
                    <p className="text-muted-foreground">Studio Branch: {branchDisplayName}</p>
                    <p className="text-emerald-500 font-semibold">Payment Status: PAID</p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-lg border border-border/70 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/60 border-b border-border/60 font-semibold text-muted-foreground text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Service Description</th>
                        <th className="py-2.5 px-3 text-center">SAC</th>
                        <th className="py-2.5 px-3 text-right">Taxable Amt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="py-3 px-3">
                          <span className="font-bold text-foreground">{selectedInvoiceCredit.package_name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {selectedInvoiceCredit.package_type} · Entitlement validity till {safeFormatDate(selectedInvoiceCredit.valid_until, "MMM dd, yyyy")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">999723</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">₹{baseAmount.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tax Breakdown */}
                <div className="space-y-1.5 text-xs border-t border-border/50 pt-3 max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono">₹{baseAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST (9%):</span>
                    <span className="font-mono">₹{cgst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST (9%):</span>
                    <span className="font-mono">₹{sgst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
                    <span>Total Amount Paid:</span>
                    <span className="text-primary font-mono">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer Notes & Actions */}
                <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    This is a computer-generated tax invoice and requires no physical signature.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print / Save PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedInvoiceCredit(null)}
                      className="text-xs font-semibold"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
