import { api } from './client';
import type { FitnessScoreItem, FitnessScoreResponse } from '../../types/fitnessScore';

export async function getFitnessScoreApi(targetDate?: string): Promise<FitnessScoreResponse> {
  const response = await api.get<FitnessScoreResponse>('/progress/fitness-score', {
    params: targetDate ? { target_date: targetDate } : undefined,
  });
  return response.data;
}

export async function recalculateFitnessScoreApi(targetDate?: string): Promise<FitnessScoreItem> {
  const response = await api.post<FitnessScoreItem>(
    '/progress/fitness-score/recalculate',
    {},
    {
      params: targetDate ? { target_date: targetDate } : undefined,
    },
  );
  return response.data;
}
