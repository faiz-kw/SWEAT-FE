import { api } from '../client';

export interface FoodItemCatalog {
  id: string;
  name: string;
  category: string;
  serving_size_g: number;
  serving_unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  provenance: 'LOCAL_DEFAULT' | 'OFF_IMPORT' | 'CUSTOM_TENANT';
  is_verified: boolean;
  notes?: string;
}

export interface BarcodeProductResult {
  found: boolean;
  barcode: string;
  product?: {
    barcode: string;
    product_name: string;
    brand: string;
    serving_size: string;
    serving_quantity_g: number;
    calories_100g: number;
    protein_100g: number;
    carbs_100g: number;
    fat_100g: number;
    fiber_100g: number;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
    fiber_per_serving: number;
    nutrition_grade: string;
    image_url: string;
    provenance: string;
    data_source: string;
  };
  detail?: string;
}

export interface DetectedFoodItem {
  food_name: string;
  category: string;
  estimated_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
  notes: string;
  matched_catalog_item?: FoodItemCatalog | null;
}

export interface FoodImageAnalysisResult {
  detected_items: DetectedFoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  model_used: string;
  item_count: number;
  analyzed_at: string;
  notes: string;
}

export interface NutritionTargetData {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_water_ml: number;
  daily_sleep_hours: number;
  notes?: string;
}

export interface MealLogItemData {
  id?: string;
  food_item_id?: string;
  custom_food_name?: string;
  portion_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MealLogEntry {
  id: string;
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  date: string;
  logged_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  items: MealLogItemData[];
  notes?: string;
}

export interface DailySummaryResult {
  date: string;
  targets: NutritionTargetData;
  nutrition: {
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    total_fiber_g: number;
    calories_remaining: number;
    calorie_progress_pct: number;
  };
  water: {
    total_ml: number;
    target_ml: number;
    progress_pct: number;
  };
  sleep: {
    total_hours: number;
    target_hours: number;
    progress_pct: number;
  };
  meals: {
    BREAKFAST: MealLogEntry[];
    LUNCH: MealLogEntry[];
    DINNER: MealLogEntry[];
    SNACK: MealLogEntry[];
  };
}

export const wellnessApi = {
  // Food Catalog Search
  searchFoods: (query: string = '') =>
    api.get<FoodItemCatalog[]>('/mobile/wellness/foods/', {
      params: query ? { q: query } : {},
    }),

  // Barcode Scanning via OpenFoodFacts
  lookupBarcode: (barcode: string) =>
    api.get<BarcodeProductResult>(`/mobile/wellness/foods/barcode/${encodeURIComponent(barcode)}/`),

  // AI Food Photo Recognition via Google Gemini 1.5 Flash Vision
  analyzeFoodImage: (data: { image_base64?: string; image?: File; mock?: boolean }) => {
    if (data.image instanceof File) {
      const formData = new FormData();
      formData.append('image', data.image);
      if (data.mock) formData.append('mock', 'true');
      return api.post<FoodImageAnalysisResult>('/mobile/wellness/foods/analyze-image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.post<FoodImageAnalysisResult>('/mobile/wellness/foods/analyze-image/', {
      image_base64: data.image_base64,
      mock: data.mock,
    });
  },

  // Daily Summary Dashboard
  getDailySummary: (dateStr?: string) =>
    api.get<DailySummaryResult>('/mobile/wellness/daily-summary/', {
      params: dateStr ? { date: dateStr } : {},
    }),

  // Meal Logs CRUD
  getMealLogs: (dateStr?: string) =>
    api.get<MealLogEntry[]>('/mobile/wellness/meal-logs/', {
      params: dateStr ? { date: dateStr } : {},
    }),

  createMealLog: (data: {
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    date: string;
    items: Array<{
      food_item_id?: string;
      custom_food_name?: string;
      portion_grams: number;
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      fiber_g?: number;
    }>;
    notes?: string;
  }) => api.post<MealLogEntry>('/mobile/wellness/meal-logs/', data),

  deleteMealLog: (mealLogId: string) =>
    api.delete(`/mobile/wellness/meal-logs/${mealLogId}/`),

  // Water Logs
  logWater: (data: { amount_ml: number; date?: string; logged_date?: string }) =>
    api.post('/mobile/wellness/water-logs/', {
      amount_ml: data.amount_ml,
      logged_date: data.logged_date || data.date || new Date().toISOString().split('T')[0],
    }),

  // Sleep Logs
  logSleep: (data: {
    logged_date?: string;
    date?: string;
    start_time: string;
    end_time: string;
    duration_minutes?: number;
    quality_rating?: number;
    notes?: string;
  }) =>
    api.post('/mobile/wellness/sleep-logs/', {
      logged_date: data.logged_date || data.date || new Date().toISOString().split('T')[0],
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: data.duration_minutes,
      quality_rating: data.quality_rating ?? 3,
      notes: data.notes || '',
    }),

  // Targets
  getTargets: () => api.get<NutritionTargetData>('/mobile/wellness/targets/'),
  updateTargets: (targets: Partial<NutritionTargetData>) =>
    api.put<NutritionTargetData>('/mobile/wellness/targets/', targets),
};
