/**
 * TypeScript types for FitMind AI Personal Fitness Digital Twin & Intelligence Engine.
 * Mapped 1:1 to Phase 2E backend Pydantic contracts.
 */

export interface ConfidenceInterval {
  lower_bound_kg: number;
  upper_bound_kg: number;
  half_width_kg: number;
  confidence_level_pct: number;
  uncertainty_type: string;
  disclaimer: string;
}

export type DataConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DataConfidence {
  level: DataConfidenceLevel;
  nutrition_days_logged: number;
  measurement_count: number;
  reasons: string[];
}

export interface TrajectoryProjectionResponse {
  baseline_weight_kg: number;
  predicted_change_28d_kg: number;
  projected_weight_28d_kg: number;
  confidence_interval: ConfidenceInterval;
  data_confidence: DataConfidence;
  features_used: Record<string, number>;
  reference_date: string;
  model_name: string;
  model_version: string;
  feature_schema_version: string;
  projection_disclaimer: string;
}

export type GoalFeasibilityStatus =
  | 'ON_TRACK'
  | 'POSSIBLE_ADJUSTMENT'
  | 'UNLIKELY'
  | 'INSUFFICIENT_DATA'
  | 'EXPIRED_OR_INVALID';

export interface GoalFeasibilityResponse {
  status: GoalFeasibilityStatus;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  target_date: string | null;
  days_remaining: number | null;
  required_total_change_kg: number | null;
  required_rate_kg_per_week: number | null;
  projected_rate_kg_per_week: number | null;
  projected_change_28d_kg: number | null;
  safety_assessment: string;
  explanation: string;
}

export interface ScenarioModification {
  scenario_name: string;
  daily_calories?: number;
  daily_protein_g?: number;
  activity_multiplier?: number;
}

export interface ScenarioSimulationRequest {
  scenarios: ScenarioModification[];
}

export interface ScenarioResult {
  scenario_name: string;
  input_modifications: {
    daily_calories?: number;
    daily_protein_g?: number;
    activity_multiplier?: number;
    [key: string]: unknown;
  };
  projected_change_28d_kg: number;
  projected_weight_28d_kg: number;
  scenario_delta_kg: number;
  non_causal_statement: string;
}

export interface ScenarioSimulationResponse {
  baseline_projection: TrajectoryProjectionResponse;
  scenario_results: ScenarioResult[];
}

export interface PlanCandidate {
  candidate_id: string;
  daily_calories: number;
  daily_protein_g: number;
  activity_multiplier: number;
  projected_change_28d_kg: number;
  projected_weight_28d_kg: number;
  objective_score: number;
  calorie_offset_from_current: number;
  feasibility_rating: string;
}

export interface PlanOptimizationRequest {
  max_calorie_adjustment?: number;
  prefer_higher_protein?: boolean;
}

export interface PlanOptimizationResponse {
  target_weight_kg: number;
  target_date: string;
  required_weekly_rate_kg: number;
  current_intake_kcal: number;
  best_candidate: PlanCandidate;
  alternative_candidates: PlanCandidate[];
  objective_description: string;
}

export type AdaptationStatus =
  | 'NO_CHANGE'
  | 'MONITOR'
  | 'ADJUSTMENT_RECOMMENDED'
  | 'INSUFFICIENT_DATA';

export interface AdaptationStatusResponse {
  status: AdaptationStatus;
  actual_weight_change_kg: number | null;
  projected_weight_change_kg: number | null;
  residual_kg: number | null;
  primary_driver: string;
  logging_completeness_pct: number;
  measurement_count: number;
  personal_calibration_offset_kg: number;
  recommendation_summary: string;
}
