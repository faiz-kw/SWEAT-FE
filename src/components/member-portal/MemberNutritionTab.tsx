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
  ShieldCheck,
  TrendingUp,
  Star,
  Clock,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FoodVisionAndBarcodeScanner } from '@/components/wellness/FoodVisionAndBarcodeScanner';

interface MemberNutritionTabProps {
  memberFirstName?: string;
}

export function MemberNutritionTab({ memberFirstName }: MemberNutritionTabProps) {
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [summary, setSummary] = React.useState<DailySummaryResult | null>(null);

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = React.useState<boolean>(false);
  const [scannerDefaultMode, setScannerDefaultMode] = React.useState<'vision' | 'barcode'>('vision');

  const fetchSummary = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await wellnessApi.getDailySummary(selectedDate);
      setSummary(res.data);
    } catch (err: any) {
      console.error('Failed to load nutrition summary:', err);
      toast.error('Failed to load today\'s wellness summary.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Quick Water logger (+250 ml glass)
  const handleQuickWater = async () => {
    try {
      await wellnessApi.logWater({ amount_ml: 250, date: selectedDate });
      toast.success('+250 ml water logged! Keep staying hydrated.');
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

  const openVisionScanner = () => {
    setScannerDefaultMode('vision');
    setIsScannerOpen(true);
  };

  const openBarcodeScanner = () => {
    setScannerDefaultMode('barcode');
    setIsScannerOpen(true);
  };

  // Sleep Logging Modal State
  const [isSleepModalOpen, setIsSleepModalOpen] = React.useState<boolean>(false);
  const [sleepBedtime, setSleepBedtime] = React.useState<string>('22:30');
  const [sleepWakeTime, setSleepWakeTime] = React.useState<string>('06:30');
  const [sleepQuality, setSleepQuality] = React.useState<number>(4);
  const [sleepNotes, setSleepNotes] = React.useState<string>('');
  const [isSavingSleep, setIsSavingSleep] = React.useState<boolean>(false);

  // Live calculation of sleep duration in minutes and hours
  const calculatedSleep = React.useMemo(() => {
    if (!sleepBedtime || !sleepWakeTime) return { minutes: 0, hours: 0, label: '0 hrs' };
    const [bH, bM] = sleepBedtime.split(':').map(Number);
    const [wH, wM] = sleepWakeTime.split(':').map(Number);
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
      const [bH, bM] = sleepBedtime.split(':').map(Number);
      const [wH, wM] = sleepWakeTime.split(':').map(Number);

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

  const meals = summary?.meals || {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
    SNACK: [],
  };

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
                AI Vision + Barcode Active
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Fuel Your Performance, {memberFirstName || 'Athlete'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Track daily macronutrients, scan packaged snacks via OpenFoodFacts barcode lookup, or snap a photo of Indian meal plates for instant portion estimation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={openVisionScanner}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
            >
              <Camera className="h-4 w-4" />
              AI Photo Plate Scan
            </Button>
            <Button
              variant="outline"
              onClick={openBarcodeScanner}
              className="gap-2 border-border/80 hover:bg-accent font-semibold"
            >
              <Barcode className="h-4 w-4 text-emerald-500" />
              Scan Barcode
            </Button>
            <Button
              variant="ghost"
              onClick={handleQuickWater}
              className="gap-1.5 text-xs text-sky-500 hover:bg-sky-500/10"
              title="Add 250ml water glass"
            >
              <Droplets className="h-4 w-4" />
              +250ml Water
            </Button>
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
            <p className="text-[11px] text-muted-foreground mt-2">
              {water.total_ml} ml logged today
            </p>
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
                {sleep.total_hours > 0 ? `${sleep.total_hours} hrs logged` : 'Resting & athletic recuperation'}
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
            Today&apos;s Meal Logs
          </h2>
          <Button
            size="sm"
            onClick={openVisionScanner}
            className="text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Meal Entry
          </Button>
        </div>

        {/* Meal Categories Accordion / Cards */}
        {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((mType) => {
          const typeLogs = meals[mType] || [];
          const typeCalories = typeLogs.reduce((sum, log) => sum + (log.total_calories || 0), 0);

          return (
            <Card key={mType} className="border-border/60 bg-card overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-accent/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {mType}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {typeCalories} kcal
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={openVisionScanner}
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    Scan Food
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                {typeLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No items logged for {mType.toLowerCase()} yet. Snap a plate or scan a barcode to log.
                  </p>
                ) : (
                  <div className="divide-y divide-border/30 space-y-3">
                    {typeLogs.map((log) => (
                      <div key={log.id} className="pt-2.5 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono text-[11px]">
                            {log.logged_at ? new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <button
                            onClick={() => handleDeleteMeal(log.id)}
                            className="p-1 hover:text-destructive text-muted-foreground rounded"
                            title="Delete this meal log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(log.items || []).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg border border-border/40 bg-accent/10 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-foreground">
                                  {item.custom_food_name || 'Food item'}
                                </span>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {item.portion_grams}g · P: {item.protein_g}g · C: {item.carbs_g}g · F: {item.fat_g}g
                                </div>
                              </div>
                              <span className="font-bold text-foreground font-mono">
                                {item.calories} kcal
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Embedded Scanner Modal */}
      <FoodVisionAndBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onMealLogged={() => void fetchSummary()}
        defaultDate={selectedDate}
      />

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
