export interface FitnessScoreItem {
  id: string;
  user_id: string;
  score: number;
  workout_adherence_pct?: number | null;
  nutrition_score?: number | null;
  protein_score?: number | null;
  sleep_score: number;
  recovery_score: number;
  consistency_score?: number | null;
  calculated_at: string;
  period_start: string;
  period_end: string;
}

export interface FitnessScoreResponse {
  current_score?: FitnessScoreItem | null;
  score_label: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
  history: FitnessScoreItem[];
}
