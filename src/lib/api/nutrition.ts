import { api } from './client';
import type {
  Food,
  MealLog,
  MealLogCreate,
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

export async function getTodayNutritionSummaryApi(): Promise<DailyNutritionSummary> {
  const response = await api.get<DailyNutritionSummary>('/nutrition/today');
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
