import { api } from './client';
import type {
  TrajectoryProjectionResponse,
  GoalFeasibilityResponse,
  ScenarioSimulationRequest,
  ScenarioSimulationResponse,
  PlanOptimizationRequest,
  PlanOptimizationResponse,
  AdaptationStatusResponse,
} from '../../types/intelligence';

/**
 * Fetches the user's point-in-time 28-day body-weight trajectory projection.
 */
export async function getTrajectoryApi(reference_date?: string): Promise<TrajectoryProjectionResponse> {
  const response = await api.get<TrajectoryProjectionResponse>('/intelligence/trajectory', {
    params: reference_date ? { reference_date } : undefined,
  });
  return response.data;
}

/**
 * Evaluates active goal feasibility against the projected trajectory and product pacing guardrails.
 */
export async function getGoalFeasibilityApi(reference_date?: string): Promise<GoalFeasibilityResponse> {
  const response = await api.get<GoalFeasibilityResponse>('/intelligence/goal-feasibility', {
    params: reference_date ? { reference_date } : undefined,
  });
  return response.data;
}

/**
 * Runs counterfactual What-If scenarios through the champion Ridge model (ephemeral, zero database writes).
 */
export async function simulateScenariosApi(
  payload: ScenarioSimulationRequest,
  reference_date?: string,
): Promise<ScenarioSimulationResponse> {
  const response = await api.post<ScenarioSimulationResponse>('/intelligence/simulate', payload, {
    params: reference_date ? { reference_date } : undefined,
  });
  return response.data;
}

/**
 * Runs deterministic candidate-plan ranking heuristic over bounded nutrition and activity inputs.
 */
export async function optimizePlanApi(
  payload: PlanOptimizationRequest,
  reference_date?: string,
): Promise<PlanOptimizationResponse> {
  const response = await api.post<PlanOptimizationResponse>('/intelligence/optimize-plan', payload, {
    params: reference_date ? { reference_date } : undefined,
  });
  return response.data;
}

/**
 * Evaluates observed longitudinal progress against prior projections to determine trajectory adaptation status.
 */
export async function getAdaptationApi(reference_date?: string): Promise<AdaptationStatusResponse> {
  const response = await api.get<AdaptationStatusResponse>('/intelligence/adaptation', {
    params: reference_date ? { reference_date } : undefined,
  });
  return response.data;
}
