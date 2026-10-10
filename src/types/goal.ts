export type GoalType =
  | 'weight_loss'
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintain'
  | 'maintenance'
  | 'endurance'
  | 'general_fitness';

export interface Goal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_weight_kg?: number | null;
  target_date?: string | null;
  is_active: boolean;
  has_goal_conflict?: boolean;
  conflict_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  goal_type: GoalType;
  target_weight_kg?: number;
  target_date?: string;
}
