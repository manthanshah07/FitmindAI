export interface Food {
  id: string;
  name: string;
  brand?: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number | null;
  is_verified: boolean;
  created_at: string;
}

export interface MealLogItemCreate {
  food_id: string;
  quantity_grams: number;
}

export interface MealLogItem {
  id: string;
  meal_log_id: string;
  food_id: string;
  quantity_grams: number;
  calculated_calories: number;
  calculated_protein: number;
  calculated_carbs: number;
  calculated_fat: number;
  food?: Food | null;
}

export interface MealLogCreate {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  notes?: string;
  items: MealLogItemCreate[];
}

export interface MealLog {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  notes?: string | null;
  created_at: string;
  items: MealLogItem[];
}

export interface MacroNutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailyNutritionSummary {
  date: string;
  targets: MacroNutrients;
  consumed: MacroNutrients;
  remaining: MacroNutrients;
  meals_by_type: {
    breakfast: MealLog[];
    lunch: MealLog[];
    dinner: MealLog[];
    snack: MealLog[];
  };
}
