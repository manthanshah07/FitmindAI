export interface WorkoutReportSection {
  workouts_completed: number;
  target_workouts?: number | null;
  completion_rate_pct?: number | null;
  total_duration_minutes?: number | null;
  total_sets_completed?: number | null;
  total_exercises_completed?: number | null;
  most_frequent_muscles: string[];
  has_data: boolean;
}

export interface NutritionReportSection {
  logged_days_count: number;
  total_days_in_period: number;
  logging_completion_pct: number;
  target_calories?: number | null;
  average_calories_per_logged_day?: number | null;
  target_protein_g?: number | null;
  average_protein_per_logged_day?: number | null;
  calorie_adherence_pct?: number | null;
  protein_adherence_pct?: number | null;
  has_data: boolean;
}

export interface ProgressReportSection {
  starting_weight_kg?: number | null;
  ending_weight_kg?: number | null;
  weight_change_kg?: number | null;
  starting_body_fat_pct?: number | null;
  ending_body_fat_pct?: number | null;
  body_fat_change_pct?: number | null;
  measurement_count: number;
  has_data: boolean;
}

export interface FitnessScoreReportSection {
  starting_score?: number | null;
  ending_score?: number | null;
  score_change?: number | null;
  trend?: 'improving' | 'declining' | 'stable' | null;
  has_data: boolean;
}

export interface FitnessReportResponse {
  report_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  generated_at: string;
  headline: string;
  adherence_score?: number | null;
  adherence_label?: string | null;
  adherence_breakdown?: Record<string, number> | null;
  summary_facts: string[];
  workouts: WorkoutReportSection;
  nutrition: NutritionReportSection;
  progress: ProgressReportSection;
  fitness_score: FitnessScoreReportSection;
  narrative?: string | null;
  ai_generated: boolean;
}
