import { api } from './client';
import type { Goal, GoalCreate } from '../../types/goal';

export async function getActiveGoalApi(): Promise<Goal | null> {
  const response = await api.get<Goal | null>('/goals');
  return response.data;
}

export async function createGoalApi(data: GoalCreate): Promise<Goal> {
  const response = await api.post<Goal>('/goals', data);
  return response.data;
}
