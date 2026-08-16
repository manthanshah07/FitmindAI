import { api } from './client';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutPlanCreate,
  WorkoutLog,
  WorkoutLogCreate,
} from '../../types/workout';

export async function getExercisesApi(params?: {
  muscle?: string;
  category?: string;
  difficulty?: string;
  search?: string;
}): Promise<Exercise[]> {
  const response = await api.get<Exercise[]>('/exercises', { params });
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

export async function logWorkoutSessionApi(
  payload: WorkoutLogCreate,
): Promise<WorkoutLog> {
  const response = await api.post<WorkoutLog>('/workout/logs', payload);
  return response.data;
}
