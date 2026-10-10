import { api } from './client';
import type {
  FitnessReportResponse,
  ReportAiSummaryRequest,
  ReportAiSummaryResponse,
} from '../../types/reports';

export async function getWeeklyReportApi(dateStr?: string, ai = false): Promise<FitnessReportResponse> {
  const params: Record<string, string | boolean> = { ai };
  if (dateStr) {
    params.date = dateStr;
  }
  const response = await api.get<FitnessReportResponse>('/reports/weekly', { params });
  return response.data;
}

export async function getMonthlyReportApi(dateStr?: string, ai = false): Promise<FitnessReportResponse> {
  const params: Record<string, string | boolean> = { ai };
  if (dateStr) {
    params.date = dateStr;
  }
  const response = await api.get<FitnessReportResponse>('/reports/monthly', { params });
  return response.data;
}

export async function generateReportAiSummaryApi(payload: ReportAiSummaryRequest): Promise<ReportAiSummaryResponse> {
  const response = await api.post<ReportAiSummaryResponse>('/reports/ai-summary', payload);
  return response.data;
}

