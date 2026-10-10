import { api } from './client';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutPlanCreate,
  WorkoutLog,
  WorkoutLogCreate,
  LastPerformanceResponse,
} from '../../types/workout';

export async function getExercisesApi(params?: {
  muscle?: string;
  category?: string;
  difficulty?: string;
  search?: string;
  equipment?: string;
}): Promise<Exercise[]> {
  const response = await api.get<Exercise[]>('/exercises', { params });
  return response.data;
}

export async function getLastPerformanceApi(
  exerciseIds: string[],
): Promise<LastPerformanceResponse> {
  if (!exerciseIds.length) {
    return { performances: {} };
  }
  const params = new URLSearchParams();
  for (const id of exerciseIds) {
    params.append('exercise_ids', id);
  }
  const response = await api.get<LastPerformanceResponse>(
    `/workout/last-performance?${params.toString()}`,
  );
  return response.data;
}

export async function getExerciseByIdApi(id: string): Promise<Exercise> {
  const response = await api.get<Exercise>(`/exercises/${id}`);
  return response.data;
}

export async function seedExercisesApi(): Promise<Exercise[]> {
  const response = await api.post<Exercise[]>('/exercises/seed');
  return response.data;
}

export async function getActiveWorkoutPlanApi(): Promise<WorkoutPlan | null> {
  const response = await api.get<WorkoutPlan | null>('/workout/plan');
  return response.data;
}

export async function generateWorkoutPlanApi(
  payload?: WorkoutPlanCreate,
): Promise<WorkoutPlan> {
  const response = await api.post<WorkoutPlan>('/workout/plan', payload || {});
  return response.data;
}

export async function getWorkoutLogsApi(
  limit: number = 20,
  skip: number = 0,
): Promise<WorkoutLog[]> {
  const response = await api.get<WorkoutLog[]>('/workout/logs', {
    params: { limit, skip },
  });
  return response.data;
}

export async function getWorkoutLogByIdApi(id: string): Promise<WorkoutLog> {
  const response = await api.get<WorkoutLog>(`/workout/logs/${id}`);
  return response.data;
}

export interface LogWorkoutSessionOptions {
  idempotencyKey?: string;
}

export async function logWorkoutSessionWithMetaApi(
  payload: WorkoutLogCreate,
  options?: LogWorkoutSessionOptions,
): Promise<{ log: WorkoutLog; isReplay: boolean }> {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  const response = await api.post<WorkoutLog>('/workout/logs', payload, { headers });
  const isReplay = response.headers?.['x-idempotency-replay'] === 'true';
  return { log: response.data, isReplay };
}

export async function logWorkoutSessionApi(
  payload: WorkoutLogCreate,
  options?: LogWorkoutSessionOptions,
): Promise<WorkoutLog> {
  const { log } = await logWorkoutSessionWithMetaApi(payload, options);
  return log;
}

