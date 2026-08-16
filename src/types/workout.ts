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
  exercise?: Exercise | null;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  notes?: string | null;
  created_at: string;
  logged_exercises: WorkoutLogExercise[];
}
