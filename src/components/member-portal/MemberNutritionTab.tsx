import * as React from 'react';
import {
  Utensils,
  Camera,
  Barcode,
  Sparkles,
  Droplets,
  Moon,
  Flame,
  Plus,
  Trash2,
  RefreshCw,
  Scale,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  Target,
  Search,
  Check,
  CheckCircle2,
  Clock,
  Star,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  wellnessApi,
  DailySummaryResult,
  MealLogEntry,
} from '@/api/endpoints/wellnessApi';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FoodVisionAndBarcodeScanner } from '@/components/wellness/FoodVisionAndBarcodeScanner';

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
