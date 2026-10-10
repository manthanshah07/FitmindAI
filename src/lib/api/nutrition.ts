import { api } from './client';
import type {
  Food,
  MealLog,
  MealLogItem,
  MealLogCreate,
  QuickAddMealPayload,
  DailyNutritionSummary,
} from '../../types/nutrition';

export async function getFoodsApi(params?: {
  search?: string;
  limit?: number;
  skip?: number;
}): Promise<Food[]> {
  const response = await api.get<Food[]>('/foods', { params });
  return response.data;
}

export async function getFoodByIdApi(id: string): Promise<Food> {
  const response = await api.get<Food>(`/foods/${id}`);
  return response.data;
}

export async function seedFoodsApi(): Promise<Food[]> {
  const response = await api.post<Food[]>('/foods/seed');
  return response.data;
}

export async function getRecentFoodsApi(limit: number = 20): Promise<Food[]> {
  const response = await api.get<Food[]>('/nutrition/recent', {
    params: { limit },
  });
  return response.data;
}

export async function getTodayNutritionSummaryApi(
  targetDate?: string,
): Promise<DailyNutritionSummary> {
  const response = await api.get<DailyNutritionSummary>('/nutrition/today', {
    params: targetDate ? { target_date: targetDate } : undefined,
  });
  return response.data;
}

export async function getMealLogsApi(
  limit: number = 20,
  skip: number = 0,
): Promise<MealLog[]> {
  const response = await api.get<MealLog[]>('/nutrition/logs', {
    params: { limit, skip },
  });
  return response.data;
}

export async function getMealLogByIdApi(id: string): Promise<MealLog> {
  const response = await api.get<MealLog>(`/nutrition/logs/${id}`);
  return response.data;
}

export async function logMealApi(payload: MealLogCreate): Promise<MealLog> {
  const response = await api.post<MealLog>('/nutrition/log', payload);
  return response.data;
}

export async function quickAddMealApi(payload: QuickAddMealPayload): Promise<MealLog> {
  const response = await api.post<MealLog>('/nutrition/quick-add', payload);
  return response.data;
}

export async function deleteMealItemApi(itemId: string): Promise<void> {
  await api.delete(`/nutrition/items/${itemId}`);
}

export async function deleteMealLogApi(logId: string): Promise<void> {
  await api.delete(`/nutrition/logs/${logId}`);
}

export async function updateMealItemApi(
  itemId: string,
  quantityGrams: number,
): Promise<MealLogItem> {
  const response = await api.patch<MealLogItem>(`/nutrition/items/${itemId}`, {
    quantity_grams: quantityGrams,
  });
  return response.data;
}
