import { api } from './client';
import type { DashboardSummaryResponse } from '../../types/dashboard';

export async function getDashboardSummaryApi(dateRef?: string): Promise<DashboardSummaryResponse> {
  const params: Record<string, string> = {};
  if (dateRef) {
    params.date = dateRef;
  }
  const response = await api.get<DashboardSummaryResponse>('/dashboard/summary', { params });
  return response.data;
}
