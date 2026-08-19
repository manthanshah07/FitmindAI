export interface DashboardGoalSection {
  goal_type: string;
  target_weight_kg: number | null;
  target_date: string | null;
  is_active: boolean;
}

export interface DashboardWorkoutPlanSection {
  id: string;
  name: string;
  days_per_week: number;
  exercise_count: number;
}

export interface DashboardTodayNutritionSection {
  consumed_calories: number;
  target_calories: number;
  remaining_calories: number;
  consumed_protein_g: number;
  target_protein_g: number;
  remaining_protein_g: number;
}

export interface DashboardWeeklySummarySection {
  adherence_score: number | null;
  adherence_label: string;
  workouts_completed: number;
  target_workouts: number;
  workout_completion_pct: number | null;
  nutrition_logged_days: number;
  total_days: number;
  current_fitness_score: number | null;
  starting_fitness_score: number | null;
  fitness_score_change: number | null;
  fitness_score_trend: string;
  weight_change_kg: number | null;
  has_weekly_data: boolean;
}

export interface DashboardSummaryResponse {
  full_name: string;
  email: string;
  onboarding_complete: boolean;
  tdee_calories: number;
  bmr_calories: number;
  target_calories: number;
  target_protein_g: number;
  goal: DashboardGoalSection | null;
  workout_plan: DashboardWorkoutPlanSection | null;
  today_nutrition: DashboardTodayNutritionSection;
  weekly_summary: DashboardWeeklySummarySection;
}
