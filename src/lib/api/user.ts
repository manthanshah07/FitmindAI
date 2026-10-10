import { api } from './client';
import type { MessageResponse } from '../../types/auth';

export interface UserExportData {
  exported_at: string;
  user: Record<string, unknown>;
  profile?: Record<string, unknown> | null;
  goals: unknown[];
  measurements: unknown[];
  workout_logs: unknown[];
  nutrition_logs: unknown[];
  fitness_scores: unknown[];
  coach_conversations: unknown[];
}

export async function exportUserDataApi(): Promise<UserExportData> {
  const response = await api.get<UserExportData>('/user/export');
  return response.data;
}

export async function deleteUserAccountApi(password: string): Promise<MessageResponse> {
  const response = await api.delete<MessageResponse>('/user/account', {
    data: { password },
  });
  return response.data;
}
