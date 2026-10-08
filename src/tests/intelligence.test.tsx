import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { IntelligencePage } from '../pages/intelligence/IntelligencePage';
import * as intelligenceApi from '../lib/api/intelligence';
import type {
  TrajectoryProjectionResponse,
  GoalFeasibilityResponse,
  AdaptationStatusResponse,
  ScenarioSimulationResponse,
  PlanOptimizationResponse,
} from '../types/intelligence';

vi.mock('../lib/api/intelligence', () => ({
  getTrajectoryApi: vi.fn(),
  getGoalFeasibilityApi: vi.fn(),
  getAdaptationApi: vi.fn(),
  simulateScenariosApi: vi.fn(),
  optimizePlanApi: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQuery = (ui: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/intelligence']}>{ui}</MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  };
};

const mockTrajectory: TrajectoryProjectionResponse = {
  baseline_weight_kg: 82.5,
  predicted_change_28d_kg: -1.45,
  projected_weight_28d_kg: 81.05,
  confidence_interval: {
    lower_bound_kg: -2.3,
    upper_bound_kg: -0.6,
    half_width_kg: 0.85,
    confidence_level_pct: 90.0,
    uncertainty_type: 'BENCHMARK_DERIVED_UNCERTAINTY',
    disclaimer: 'Statistical estimate derived from the Kevin Hall energy balance benchmark.',
  },
  data_confidence: {
    level: 'HIGH',
    nutrition_days_logged: 24,
    measurement_count: 8,
    reasons: ['Consistent logging across past 28 days', 'Multiple body measurements verified'],
  },
  features_used: {
    f01_baseline_weight: 82.5,
    f02_calorie_intake: 2200,
  },
  reference_date: '2026-10-08',
  model_name: 'fitmind_ridge_population',
  model_version: 'v2.1',
  feature_schema_version: 'f16_v1',
  projection_disclaimer: 'Model projection based on population Ridge model and benchmark-derived uncertainty.',
};

const mockFeasibility: GoalFeasibilityResponse = {
  status: 'ON_TRACK',
  current_weight_kg: 82.5,
  target_weight_kg: 78.0,
  target_date: '2026-12-15',
  days_remaining: 68,
  required_total_change_kg: -4.5,
  required_rate_kg_per_week: -0.46,
  projected_rate_kg_per_week: -0.36,
  projected_change_28d_kg: -1.45,
  safety_assessment: 'WITHIN_NORMAL_PACING',
  explanation: 'Your current projected trajectory of -0.36 kg/week is on track with your goal timeline.',
};

const mockAdaptation: AdaptationStatusResponse = {
  status: 'NO_CHANGE',
  actual_weight_change_kg: -1.4,
  projected_weight_change_kg: -1.45,
  residual_kg: 0.05,
  primary_driver: 'f12_caloric_adherence',
  logging_completeness_pct: 88.5,
  measurement_count: 8,
  personal_calibration_offset_kg: 0.02,
  recommendation_summary: 'Your recent response is tracking closely with the projected trajectory. No plan adjustments are currently recommended.',
};

const mockSimulationResponse: ScenarioSimulationResponse = {
  baseline_projection: mockTrajectory,
  scenario_results: [
    {
      scenario_name: 'Custom Simulated Plan',
      input_modifications: {
        daily_calories: 1950,
        daily_protein_g: 170,
        activity_multiplier: 1.35,
      },
      projected_change_28d_kg: -2.1,
      projected_weight_28d_kg: 80.4,
      scenario_delta_kg: -0.65,
      non_causal_statement: 'Model projection under hypothetical modification. Does not guarantee individual biological response.',
    },
  ],
};

const mockOptimizerResponse: PlanOptimizationResponse = {
  target_weight_kg: 78.0,
  target_date: '2026-12-15',
  required_weekly_rate_kg: -0.46,
  current_intake_kcal: 2200,
  best_candidate: {
    candidate_id: 'candidate_opt_1',
    daily_calories: 2050,
    daily_protein_g: 175,
    activity_multiplier: 1.35,
    projected_change_28d_kg: -1.85,
    projected_weight_28d_kg: 80.65,
    objective_score: 0.1245,
    calorie_offset_from_current: -150,
    feasibility_rating: 'Optimal Pacing',
  },
  alternative_candidates: [
    {
      candidate_id: 'candidate_opt_2',
      daily_calories: 2150,
      daily_protein_g: 180,
      activity_multiplier: 1.35,
      projected_change_28d_kg: -1.6,
      projected_weight_28d_kg: 80.9,
      objective_score: 0.1852,
      calorie_offset_from_current: -50,
      feasibility_rating: 'Moderate Pacing',
    },
  ],
  objective_description: 'Evaluates candidate plans using deterministic ranking heuristic minimizing deviation from target rate.',
};

describe('Phase 3 — Personal Fitness Digital Twin Frontend Module', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'user-twin-1',
        email: 'twin@example.com',
        full_name: 'Digital Twin Athlete',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      accessToken: 'token-twin-123',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();

    vi.mocked(intelligenceApi.getTrajectoryApi).mockResolvedValue(mockTrajectory);
    vi.mocked(intelligenceApi.getGoalFeasibilityApi).mockResolvedValue(mockFeasibility);
    vi.mocked(intelligenceApi.getAdaptationApi).mockResolvedValue(mockAdaptation);
    vi.mocked(intelligenceApi.simulateScenariosApi).mockResolvedValue(mockSimulationResponse);
    vi.mocked(intelligenceApi.optimizePlanApi).mockResolvedValue(mockOptimizerResponse);
  });

  it('1. Renders the Intelligence Page and Hero Header', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Your Fitness Trajectory')).toBeInTheDocument();
      expect(screen.getByText('Personal Fitness Digital Twin')).toBeInTheDocument();
      expect(screen.getByText('82.5')).toBeInTheDocument();
    });
  });

  it('2. Trajectory data renders correctly with prediction metrics', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('82.5')).toBeInTheDocument();
      expect(screen.getByText('-1.45')).toBeInTheDocument();
      expect(screen.getByText('HIGH Confidence')).toBeInTheDocument();
    });

    // Check SVG trajectory rendered
    expect(screen.getByTestId('trajectory-chart-svg')).toBeInTheDocument();
  });

  it('3. Feasibility status and targets render properly', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Can You Reach Your Goal?')).toBeInTheDocument();
      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText(/is on track with your goal timeline/i)).toBeInTheDocument();
      expect(screen.getByText('-0.46 kg/wk')).toBeInTheDocument();
    });
  });

  it('4. What-If simulator allows creating and running scenarios', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('What If?')).toBeInTheDocument();
    });

    // Find simulation button
    const runBtn = screen.getByRole('button', { name: /See Expected Progress/i });
    expect(runBtn).toBeInTheDocument();

    // Trigger simulation
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(intelligenceApi.simulateScenariosApi).toHaveBeenCalledWith({
        scenarios: [
          expect.objectContaining({
            scenario_name: 'Custom Simulated Plan',
          }),
        ],
      });
    });
  });

  it('5. Simulation response renders projected metrics and non-causal statement', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /See Expected Progress/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /See Expected Progress/i }));

    await waitFor(() => {
      expect(screen.getByText('Custom Simulated Plan')).toBeInTheDocument();
      expect(screen.getByText('-2.10 kg')).toBeInTheDocument();
      expect(screen.getByText('80.4 kg')).toBeInTheDocument();
      expect(screen.getByText(/Model projection under hypothetical modification/i)).toBeInTheDocument();
    });
  });

  it('6. Plan Optimizer renders recommended candidate and toggles alternatives', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Recommended Plan')).toBeInTheDocument();
    });

    const evalBtn = screen.getByRole('button', { name: /Evaluate Plans →/i });
    fireEvent.click(evalBtn);

    await waitFor(() => {
      expect(intelligenceApi.optimizePlanApi).toHaveBeenCalled();
      expect(screen.getByText(/This is the plan that best matches your current goal/i)).toBeInTheDocument();
      expect(screen.getByText('2050')).toBeInTheDocument();
    });

    // Toggle alternatives
    const altToggle = screen.getByRole('button', { name: /View 1 Alternatives →/i });
    fireEvent.click(altToggle);

    await waitFor(() => {
      expect(screen.getByText('candidate_opt_2')).toBeInTheDocument();
      expect(screen.getByText('2150 kcal')).toBeInTheDocument();
    });
  });

  it('7. Adaptation status renders response comparison and drivers', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText("How You're Responding")).toBeInTheDocument();
      expect(screen.getByText('Tracking Closely')).toBeInTheDocument();
      expect(screen.getByText(/88.5%/)).toBeInTheDocument();
      expect(screen.getByText(/No plan adjustments are currently recommended/i)).toBeInTheDocument();
    });
  });

  it('8. Renders loading state while queries are in flight', () => {
    vi.mocked(intelligenceApi.getTrajectoryApi).mockReturnValue(new Promise(() => {}));
    vi.mocked(intelligenceApi.getGoalFeasibilityApi).mockReturnValue(new Promise(() => {}));
    vi.mocked(intelligenceApi.getAdaptationApi).mockReturnValue(new Promise(() => {}));

    renderWithQuery(<IntelligencePage />);

    expect(screen.getByTestId('intelligence-loading-skeleton')).toBeInTheDocument();
  });

  it('9. Renders error state with retry action when API fails', async () => {
    vi.mocked(intelligenceApi.getTrajectoryApi).mockRejectedValue(new Error('Network failure'));
    vi.mocked(intelligenceApi.getGoalFeasibilityApi).mockRejectedValue(new Error('Network failure'));
    vi.mocked(intelligenceApi.getAdaptationApi).mockRejectedValue(new Error('Network failure'));

    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('Digital Twin Engine Offline')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Loading/i })).toBeInTheDocument();
    });
  });

  it('10. Insufficient data state renders helpful guidance without crashing', async () => {
    const insufficientFeasibility: GoalFeasibilityResponse = {
      status: 'INSUFFICIENT_DATA',
      current_weight_kg: null,
      target_weight_kg: 75.0,
      target_date: null,
      days_remaining: null,
      required_total_change_kg: null,
      required_rate_kg_per_week: null,
      projected_rate_kg_per_week: null,
      projected_change_28d_kg: null,
      safety_assessment: 'INSUFFICIENT_DATA',
      explanation: 'Insufficient weight and nutrition history to determine goal trajectory.',
    };

    const lowConfidenceTrajectory: TrajectoryProjectionResponse = {
      ...mockTrajectory,
      data_confidence: {
        level: 'LOW',
        nutrition_days_logged: 2,
        measurement_count: 1,
        reasons: ['Less than 7 logged days available', 'Single baseline measurement'],
      },
    };

    vi.mocked(intelligenceApi.getTrajectoryApi).mockResolvedValue(lowConfidenceTrajectory);
    vi.mocked(intelligenceApi.getGoalFeasibilityApi).mockResolvedValue(insufficientFeasibility);

    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('LOW Confidence')).toBeInTheDocument();
      expect(screen.getByText('Needs More Data')).toBeInTheDocument();
      expect(screen.getByText(/Insufficient weight and nutrition history/i)).toBeInTheDocument();
    });
  });

  it('11. Initial queries are not duplicated unnecessarily', async () => {
    renderWithQuery(<IntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText('82.5')).toBeInTheDocument();
    });

    expect(intelligenceApi.getTrajectoryApi).toHaveBeenCalledTimes(1);
    expect(intelligenceApi.getGoalFeasibilityApi).toHaveBeenCalledTimes(1);
    expect(intelligenceApi.getAdaptationApi).toHaveBeenCalledTimes(1);
  });
});
