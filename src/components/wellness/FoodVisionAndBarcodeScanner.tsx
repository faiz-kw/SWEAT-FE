import * as React from 'react';
import {
  Camera,
  Barcode,
  Sparkles,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Utensils,
  Flame,
  Scale,
  Zap,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  wellnessApi,
  DetectedFoodItem,
  BarcodeProductResult,
  FoodImageAnalysisResult,
} from '@/api/endpoints/wellnessApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FoodVisionAndBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged?: () => void;
  defaultDate?: string;
}

export function FoodVisionAndBarcodeScanner({
  isOpen,
  onClose,
  onMealLogged,
  defaultDate,
}: FoodVisionAndBarcodeScannerProps) {
  const [activeMode, setActiveMode] = React.useState<'vision' | 'barcode'>('vision');
  const [mealType, setMealType] = React.useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');

  // Vision State
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = React.useState<FoodImageAnalysisResult | null>(null);
  const [editableItems, setEditableItems] = React.useState<DetectedFoodItem[]>([]);
  const [isLoggingMeal, setIsLoggingMeal] = React.useState<boolean>(false);

  // Barcode State
  const [barcodeInput, setBarcodeInput] = React.useState<string>('');
  const [isLookingUpBarcode, setIsLookingUpBarcode] = React.useState<boolean>(false);
  const [barcodeResult, setBarcodeResult] = React.useState<BarcodeProductResult | null>(null);
  const [barcodeServingGrams, setBarcodeServingGrams] = React.useState<number>(100);

  // Video Stream for Web Live Camera
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Stop video stream on close
  const stopCamera = React.useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setImagePreview(null);
      setAnalysisResult(null);
      setEditableItems([]);
      setBarcodeResult(null);
    }
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  // Start live webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera stream not allowed or unavailable:', err);
      toast.error('Could not access live camera. Please upload an image file instead.');
    }
  };

  // Capture frame from live video
  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImagePreview(dataUrl);
    stopCamera();
    void analyzeImage(dataUrl);
  };

  // Handle file select or phone camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      void analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini AI Image Analysis
  const analyzeImage = async (base64Url: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      // Extract clean base64 data without data URL header
      const base64Data = base64Url.includes(',') ? base64Url.split(',')[1] : base64Url;

      const res = await wellnessApi.analyzeFoodImage({
        image_base64: base64Data,
      });

      setAnalysisResult(res.data);
      setEditableItems(res.data.detected_items || []);
      toast.success(
        `Identified ${res.data.item_count} food item${res.data.item_count === 1 ? '' : 's'} with SWEAT Vision AI!`
      );
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'Food analysis failed.';
      toast.error(errMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update grams for an item and recalculate calories & macros
  const handleItemGramsChange = (index: number, newGrams: number) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const oldGrams = item.estimated_grams || 100;
      const ratio = newGrams > 0 ? newGrams / oldGrams : 1;

      updated[index] = {
        ...item,
        estimated_grams: newGrams,
        calories: Math.round(item.calories * ratio),
        protein_g: Number((item.protein_g * ratio).toFixed(1)),
        carbs_g: Number((item.carbs_g * ratio).toFixed(1)),
        fat_g: Number((item.fat_g * ratio).toFixed(1)),
        fiber_g: Number((item.fiber_g * ratio).toFixed(1)),
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Log detected items to member meal diary
  const handleSaveVisionMeal = async () => {
    if (editableItems.length === 0) {
      toast.error('No food items to log.');
      return;
    }

    setIsLoggingMeal(true);
    try {
      const todayStr = defaultDate || new Date().toISOString().split('T')[0];
      const itemsPayload = editableItems.map((item) => {
        const grams = item.estimated_grams || 100;
        const ratio = grams > 0 ? grams / 100 : 1;
        const calPer100g = Number(((item.calories || 0) / ratio).toFixed(2));
        const pPer100g = Number(((item.protein_g || 0) / ratio).toFixed(2));
        const cPer100g = Number(((item.carbs_g || 0) / ratio).toFixed(2));
        const fPer100g = Number(((item.fat_g || 0) / ratio).toFixed(2));
        const fibPer100g = Number(((item.fiber_g || 0) / ratio).toFixed(2));

        return {
          food_item_id: item.matched_catalog_item?.id,
          custom_food_name: item.food_name,
          portion_grams: grams,
          calories_per_100g: calPer100g,
          protein_per_100g: pPer100g,
          carbs_per_100g: cPer100g,
          fat_per_100g: fPer100g,
          fiber_per_100g: fibPer100g,
          calories: calPer100g,
          protein_g: pPer100g,
          carbs_g: cPer100g,
          fat_g: fPer100g,
          fiber_g: fibPer100g,
        };
      });

      await wellnessApi.createMealLog({
        meal_type: mealType,
        date: todayStr,
        items: itemsPayload,
        notes: `Logged via SWEAT AI Vision (${analysisResult?.model_used || 'Gemini 1.5 Flash'})`,
      });

      toast.success(`Successfully saved ${mealType} to your daily nutrition log!`);
      if (onMealLogged) onMealLogged();
      onClose();
    } catch (err: any) {
      console.error('Failed to save meal:', err);
      toast.error(err?.response?.data?.error || 'Failed to save meal log.');
    } finally {
      setIsLoggingMeal(false);
    }
  };

  // Barcode Lookup Handler
  const handleBarcodeLookup = async (codeToLookup?: string) => {
    const cleanCode = (codeToLookup || barcodeInput).trim();
    if (!cleanCode) {
      toast.error('Please enter a barcode number.');
      return;
    }

    setIsLookingUpBarcode(true);
    setBarcodeResult(null);
    try {
      const res = await wellnessApi.lookupBarcode(cleanCode);
      setBarcodeResult(res.data);
      if (res.data.found && res.data.product) {
        setBarcodeServingGrams(res.data.product.serving_quantity_g || 100);
        toast.success(`Found product: ${res.data.product.product_name}`);
      } else {
        toast.info('Barcode not found in OpenFoodFacts database. You can add it as a custom food.');
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      if (err?.response?.status === 404 || err?.status === 404) {
        setBarcodeResult({
          found: false,
          barcode: cleanCode,
          detail: 'Product not found in Open Food Facts database.',
        });
        toast.info(`Barcode ${cleanCode} not found in database.`);
      } else {
        toast.error(err?.response?.data?.detail || 'Barcode lookup failed.');
      }
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // Log Barcode item to meal log
  const handleSaveBarcodeMeal = async () => {
    if (!barcodeResult?.product) return;
    const prod = barcodeResult.product;
    const ratio = barcodeServingGrams / 100;

    setIsLoggingMeal(true);
    try {
      const todayStr = defaultDate || new Date().toISOString().split('T')[0];
      await wellnessApi.createMealLog({
        meal_type: mealType,
        date: todayStr,
        items: [
          {
            food_item_id: (prod as any).food_item_id || (prod as any).id,
            custom_food_name: `${prod.product_name} (${prod.brand || 'Packaged'})`,
            portion_grams: barcodeServingGrams,
            calories: Math.round((prod.calories_100g || 0) * ratio),
            protein_g: Number(((prod.protein_100g || 0) * ratio).toFixed(1)),
            carbs_g: Number(((prod.carbs_100g || 0) * ratio).toFixed(1)),
            fat_g: Number(((prod.fat_100g || 0) * ratio).toFixed(1)),
            fiber_g: Number(((prod.fiber_100g || 0) * ratio).toFixed(1)),
          },
        ],
        notes: `Barcode ${prod.barcode} via Open Food Facts`,
      });

      toast.success(`Logged ${prod.product_name} to your ${mealType}!`);
      if (onMealLogged) onMealLogged();
      onClose();
    } catch (err: any) {
      console.error('Failed to save barcode meal:', err);
      toast.error(err?.response?.data?.error || 'Failed to save food log.');
    } finally {
      setIsLoggingMeal(false);
    }
  };

  // Quick total calculations for vision items
  const visionTotals = editableItems.reduce(
    (acc, it) => ({
      calories: acc.calories + (it.calories || 0),
      protein: acc.protein + (it.protein_g || 0),
      carbs: acc.carbs + (it.carbs_g || 0),
      fat: acc.fat + (it.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border/70 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-accent/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">SWEAT Food Recognition & Scanner</h2>
              <p className="text-xs text-muted-foreground">
                AI Vision plate analysis & OpenFoodFacts instant barcode lookup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Meal Type & Date Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Logging to:</span>
              <Select value={mealType} onValueChange={(v: any) => setMealType(v)}>
                <SelectTrigger className="w-32 h-8 text-xs bg-background">
                  <SelectValue placeholder="Meal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                  <SelectItem value="LUNCH">Lunch</SelectItem>
                  <SelectItem value="DINNER">Dinner</SelectItem>
                  <SelectItem value="SNACK">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Free Nutrition APIs Enabled
            </Badge>
          </div>

          {/* Mode Switcher Tabs */}
          <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)} className="space-y-5">
            <TabsList className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="vision" className="gap-2 text-xs font-medium py-2">
                <Camera className="h-4 w-4" />
                AI Food Photo Recognition
              </TabsTrigger>
              <TabsTrigger value="barcode" className="gap-2 text-xs font-medium py-2">
                <Barcode className="h-4 w-4" />
                Barcode Scanner (OpenFoodFacts)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: AI FOOD PHOTO RECOGNITION */}
            <TabsContent value="vision" className="space-y-5 mt-0">
              {/* Camera / Upload Viewport */}
              {!imagePreview && (
                <div className="relative rounded-2xl border-2 border-dashed border-border/80 p-8 text-center hover:border-primary/50 transition-colors bg-accent/10">
                  {isCameraActive ? (
                    <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden bg-black">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                      <div className="absolute inset-0 border-2 border-primary/40 rounded-xl pointer-events-none" />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                        <Button
                          onClick={captureFrame}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-lg"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button onClick={stopCamera} variant="outline" size="sm" className="bg-background/80 text-xs">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-sm mx-auto">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Camera className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Snap or Upload Your Meal Photo</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Take a photo of your plate (Roti, Dal, Paneer, Rice, Salads). SWEAT AI will auto-detect portions
                          and nutritional breakdown.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                        >
                          <Upload className="h-4 w-4" />
                          Choose Image File
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startCamera}
                          className="gap-2 text-xs border-border/80"
                        >
                          <Camera className="h-4 w-4 text-primary" />
                          Open Live Camera
                        </Button>
                      </div>

                      {/* Hidden native input with environment camera trigger for mobile */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Image Preview & Active Analysis */}
              {imagePreview && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black/40 max-h-56 flex items-center justify-center">
                    <img src={imagePreview} alt="Meal preview" className="max-h-56 w-auto object-contain mx-auto" />

                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs font-semibold tracking-wide">
                          Analyzing plate with Google Gemini 1.5 Flash...
                        </span>
                      </div>
                    )}

                    {!isAnalyzing && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setImagePreview(null);
                          setAnalysisResult(null);
                          setEditableItems([]);
                        }}
                        className="absolute top-3 right-3 text-xs bg-background/80 hover:bg-background"
                      >
                        Retake / New Photo
                      </Button>
                    )}
                  </div>

                  {/* Detected Items Card List */}
                  {editableItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Detected Food Items ({editableItems.length})
                        </h4>
                        <span className="text-xs font-mono text-muted-foreground">
                          Estimated Total: <strong className="text-foreground">{visionTotals.calories} kcal</strong> (P:{' '}
                          {visionTotals.protein.toFixed(1)}g | C: {visionTotals.carbs.toFixed(1)}g | F:{' '}
                          {visionTotals.fat.toFixed(1)}g)
                        </span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {editableItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-colors space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-foreground">{item.food_name}</span>
                                  {item.matched_catalog_item && (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px]"
                                    >
                                      Gym Catalog Match
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                    {Math.round(item.confidence * 100)}% match
                                  </Badge>
                                </div>
                                {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                              </div>

                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Portion Adjuster & Macros */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30 text-xs">
                              <div className="flex items-center gap-2">
                                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Portion:</span>
                                <Input
                                  type="number"
                                  min={10}
                                  max={1500}
                                  step={5}
                                  value={item.estimated_grams}
                                  onChange={(e) => handleItemGramsChange(idx, Number(e.target.value))}
                                  className="w-20 h-7 text-xs font-mono font-bold text-center bg-background"
                                />
                                <span className="text-muted-foreground font-mono">grams</span>
                              </div>

                              <div className="flex items-center gap-3 font-mono font-medium">
                                <span className="text-foreground">
                                  <strong>{item.calories}</strong> kcal
                                </span>
                                <span className="text-emerald-500">P: {item.protein_g}g</span>
                                <span className="text-sky-500">C: {item.carbs_g}g</span>
                                <span className="text-amber-500">F: {item.fat_g}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Log Action Button */}
                      <Button
                        onClick={handleSaveVisionMeal}
                        disabled={isLoggingMeal}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 shadow-md"
                      >
                        {isLoggingMeal ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving to {mealType}...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save {visionTotals.calories} kcal to {mealType} Log
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: BARCODE SCANNER (OPENFOODFACTS) */}
            <TabsContent value="barcode" className="space-y-5 mt-0">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-accent/20 border border-border/40 space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-primary" />
                    Enter or Scan Packaged Food Barcode
                  </h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. 8901030383786 (Amul Milk / Protein Bar)"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleBarcodeLookup()}
                      className="bg-background font-mono text-xs"
                    />
                    <Button
                      onClick={() => void handleBarcodeLookup()}
                      disabled={isLookingUpBarcode}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0"
                    >
                      {isLookingUpBarcode ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-1.5" />
                          Lookup
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Connects directly to the global Open Food Facts catalog (ODbL open-source database).
                  </p>
                </div>

                {/* Barcode Search Result Card */}
                {barcodeResult && (
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
                    {barcodeResult.found && barcodeResult.product ? (
                      <>
                        <div className="flex items-start gap-4">
                          {barcodeResult.product.image_url ? (
                            <img
                              src={barcodeResult.product.image_url}
                              alt={barcodeResult.product.product_name}
                              className="w-16 h-16 object-contain rounded-lg border border-border/40 bg-white p-1"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-accent/40 flex items-center justify-center text-muted-foreground">
                              <Barcode className="h-8 w-8" />
                            </div>
                          )}

                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                              {barcodeResult.product.brand || 'Packaged Product'}
                            </span>
                            <h3 className="text-base font-bold text-foreground">
                              {barcodeResult.product.product_name}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Barcode: {barcodeResult.product.barcode}
                            </p>
                          </div>
                        </div>

                        {/* Portion Adjuster for Barcode Item */}
                        <div className="p-3 rounded-xl bg-accent/30 border border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">Serving Size:</span>
                            <Input
                              type="number"
                              min={10}
                              max={1000}
                              step={5}
                              value={barcodeServingGrams}
                              onChange={(e) => setBarcodeServingGrams(Number(e.target.value))}
                              className="w-20 h-7 text-xs font-mono font-bold text-center bg-background"
                            />
                            <span className="text-muted-foreground font-mono">g</span>
                          </div>

                          {/* Calculated Macros for this Serving */}
                          <div className="flex items-center gap-3 font-mono font-semibold text-xs">
                            <span className="text-foreground">
                              <strong>
                                {Math.round(
                                  (barcodeResult.product.calories_100g || 0) * (barcodeServingGrams / 100)
                                )}
                              </strong>{' '}
                              kcal
                            </span>
                            <span className="text-emerald-500">
                              P: {((barcodeResult.product.protein_100g || 0) * (barcodeServingGrams / 100)).toFixed(1)}g
                            </span>
                            <span className="text-sky-500">
                              C: {((barcodeResult.product.carbs_100g || 0) * (barcodeServingGrams / 100)).toFixed(1)}g
                            </span>
                            <span className="text-amber-500">
                              F: {((barcodeResult.product.fat_100g || 0) * (barcodeServingGrams / 100)).toFixed(1)}g
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={handleSaveBarcodeMeal}
                          disabled={isLoggingMeal}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
                        >
                          {isLoggingMeal ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Log {barcodeResult.product.product_name} to {mealType}
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground space-y-2">
                        <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                        <h4 className="text-sm font-semibold text-foreground">Product Not Found</h4>
                        <p className="text-xs max-w-sm mx-auto">
                          No product matched barcode <code className="font-mono">{barcodeResult.barcode}</code> in Open
                          Food Facts.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
