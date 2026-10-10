export interface Exercise {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles?: string[] | null;
  equipment_required?: string[] | null;
  difficulty?: string | null;
  category?: string | null;
  description?: string | null;
  instructions?: string | null;
  created_at: string;
}

export interface WorkoutPlanExercise {
  id: string;
  plan_id: string;
  exercise_id: string;
  day_of_week?: number | null;
  day_label?: string | null;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
  order_index?: number | null;
  exercise?: Exercise | null;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  days_per_week?: number | null;
  is_active: boolean;
  ai_generated: boolean;
  created_at: string;
  plan_exercises: WorkoutPlanExercise[];
}

export interface WorkoutPlanCreate {
  name?: string;
  days_per_week?: number;
  equipment?: string[];
}

export interface WorkoutLogExerciseCreate {
  exercise_id: string;
  set_number: number;
  reps_completed?: number;
  weight_kg?: number;
  rpe?: number;
  notes?: string;
}

export interface WorkoutLogCreate {
  plan_id?: string;
  started_at: string;
  ended_at?: string;
  notes?: string;
  logged_exercises: WorkoutLogExerciseCreate[];
}

export interface WorkoutLogExercise {
  id: string;
  log_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed?: number | null;
  weight_kg?: number | null;
  rpe?: number | null;
  notes?: string | null;
  is_personal_record?: boolean | null;
  exercise?: Exercise | null;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id?: string | null;
  name?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  total_volume_kg?: number | null;
  total_sets_completed?: number | null;
  notes?: string | null;
  created_at: string;
  logged_exercises: WorkoutLogExercise[];
}

export interface LastPerformanceSet {
  set_number: number;
  weight_kg?: number | null;
  reps_completed?: number | null;
  rpe?: number | null;
}

export interface LastPerformanceItem {
  exercise_id: string;
  last_performed_at: string;
  sets: LastPerformanceSet[];
  best_weight_kg?: number | null;
  best_reps?: number | null;
}

export interface LastPerformanceResponse {
  performances: Record<string, LastPerformanceItem>;
}

// ----------------------------------------------------
// Milestone M3 / Appendix C — Live Workout Draft Types
// ----------------------------------------------------

export interface WorkoutSetDraft {
  setNumber: number;
  weightKg: string;
  reps: number | string;
  rpe?: number | null;
  done: boolean;
  completedAt?: string | null;
  previousResult?: string | null;
}

export interface WorkoutExerciseDraft {
  exerciseId: string;
  name: string;
  targetSets?: number;
  targetReps?: string;
  restSeconds?: number;
  previousResult?: string | null;
  sets: WorkoutSetDraft[];
}

export interface WorkoutDraft {
  schemaVersion: 1;
  userId: string;
  sessionId: string;
  idempotencyKey: string;
  startedAt: string;
  endedAt: string | null;
  status: 'in_progress' | 'ready_to_submit' | 'conflict';
  templateRef?: { planId?: string | number; dayIndex?: number } | null;
  notes: string | null;
  restEndsAt: number | null;
  exercises: WorkoutExerciseDraft[];
  updatedAt: string;
}

export interface SessionTemplateExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  previousResult?: string | null;
}

export interface SessionTemplate {
  planId?: string;
  dayIndex?: number;
  name?: string;
  exercises: SessionTemplateExercise[];
}

