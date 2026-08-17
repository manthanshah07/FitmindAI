import { api } from './client';
import type {
  Measurement,
  MeasurementCreate,
  ProgressSummary,
} from '../../types/progress';

export async function getProgressSummaryApi(): Promise<ProgressSummary> {
  const response = await api.get<ProgressSummary>('/progress/summary');
  return response.data;
}

export async function getMeasurementsApi(
  limit: number = 50,
  skip: number = 0,
): Promise<Measurement[]> {
  const response = await api.get<Measurement[]>('/progress/measurements', {
    params: { limit, skip },
  });
  return response.data;
}

export async function createMeasurementApi(
  payload: MeasurementCreate,
): Promise<Measurement> {
  const response = await api.post<Measurement>('/progress/measurements', payload);
  return response.data;
}

export async function getMeasurementByIdApi(id: string): Promise<Measurement> {
  const response = await api.get<Measurement>(`/progress/measurements/${id}`);
  return response.data;
}
