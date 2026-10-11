import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WeeklyReviewTab } from '../components/progress/WeeklyReviewTab';
import { ForecastTab } from '../components/progress/ForecastTab';
import * as reportsApi from '../lib/api/reports';
import * as intelligenceApi from '../lib/api/intelligence';
import type { FitnessReportResponse } from '../types/reports';
import type { TrajectoryProjectionResponse, GoalFeasibilityResponse, PlanOptimizationResponse } from '../types/intelligence';

vi.mock('../lib/api/reports');
vi.mock('../lib/api/intelligence');
vi.mock('../lib/api/profile');

const mockReportData: FitnessReportResponse = {
  report_type: 'weekly',
  start_date: '2026-08-13',
  end_date: '2026-08-19',
  generated_at: new Date().toISOString(),
  headline: 'Weekly Review (Aug 13 - Aug 19, 2026)',
  adherence_score: 88.0,
  adherence_label: 'High',
  summary_facts: [
    'Completed 4 of 4 planned workouts (100% target completion).',
    'Logged nutrition on 6 of 7 days.',
  ],
  what_went_well: [
    'Executed full resistance volume with 42 completed sets.',
    'Consistent meal logging maintained on 6 of 7 days.',
  ],
  what_needs_attention: [
    'Average protein intake trailed target by 12g.',
  ],
  next_period_focus: [
    'Increase dietary protein toward daily target of 150g.',
  ],
  deltas: {
    sets_delta: 6,
    workouts_delta: 1,
    logged_days_delta: 2,
    average_calories_delta: -50,
    average_protein_delta: 10,
    fitness_score_delta: 4,
  },
  workouts: {
    workouts_completed: 4,
    target_workouts: 4,
    completion_rate_pct: 100,
    sets_completed: 42,
    sets_planned: 40,
    most_frequent_muscles: ['Chest', 'Back'],
    has_data: true,
  },
  nutrition: {
    logged_days_count: 6,
    total_days_in_period: 7,
    logging_completion_pct: 85.7,
    average_calories_per_logged_day: 2100,
    target_calories: 2150,
    average_protein_per_logged_day: 138,
    target_protein_g: 150,
    has_data: true,
  },
  progress: {
    starting_weight_kg: 76.0,
    ending_weight_kg: 75.6,
    weight_change_kg: -0.4,
    measurement_count: 2,
    has_data: true,
  },
  fitness_score: {
    starting_score: 72,
    ending_score: 76,
    score_change: 4,
    trend: 'improving',
    has_data: true,
  },
  narrative: null,
  ai_generated: false,
};

const mockTrajectoryData: TrajectoryProjectionResponse = {
  baseline_weight_kg: 78.5,
  predicted_change_28d_kg: -1.2,
  projected_weight_28d_kg: 77.3,
  confidence_interval: {
    lower_bound_kg: 76.7,
    upper_bound_kg: 77.9,
    half_width_kg: 0.6,
    confidence_level_pct: 90.0,
    uncertainty_type: 'benchmark_residual',
    disclaimer: 'Benchmark residual',
  },
  data_confidence: {
    level: 'HIGH',
    nutrition_days_logged: 22,
    measurement_count: 4,
    reasons: ['Frequent tracking'],
  },
  features_used: {},
  reference_date: '2026-08-19',
  model_name: 'Ridge Regression',
  model_version: '2.4.0',
  feature_schema_version: '1.0',
  projection_disclaimer: 'Physiological projection',
};

const mockFeasibilityData: GoalFeasibilityResponse = {
  status: 'ON_TRACK',
  current_weight_kg: 78.5,
  target_weight_kg: 75.0,
  target_date: '2026-11-15',
  days_remaining: 88,
  required_total_change_kg: -3.5,
  required_rate_kg_per_week: -0.28,
  projected_rate_kg_per_week: -0.30,
  projected_change_28d_kg: -1.2,
  safety_assessment: 'Safe',
  explanation: 'On track with current deficit.',
};

const mockOptimizerData: PlanOptimizationResponse = {
  target_weight_kg: 75.0,
  target_date: '2026-11-15',
  required_weekly_rate_kg: -0.28,
  current_intake_kcal: 2200,
  baseline_description: 'Your 28-day average intake',
  objective_description: 'FitMind Candidate-Plan Ranking Heuristic',
  best_candidate: {
    candidate_id: 'plan_c01',
    title: 'Moderate Deficit (-300 kcal)',
    rationale: 'Creates a ~300 kcal daily deficit below maintenance for steady fat loss.',
    daily_calories: 1900,
    daily_protein_g: 155,
    activity_multiplier: 1.375,
    projected_change_28d_kg: -1.3,
    projected_weight_28d_kg: 77.2,
    objective_score: 0.12,
    calorie_offset_from_current: -300,
    feasibility_rating: 'HIGH',
  },
  alternative_candidates: [
    {
      candidate_id: 'plan_c02',
      title: 'Mild Deficit (-100 kcal)',
      rationale: 'Maintains a sustainable deficit protecting training performance.',
      daily_calories: 2100,
      daily_protein_g: 150,
      activity_multiplier: 1.375,
      projected_change_28d_kg: -0.5,
      projected_weight_28d_kg: 78.0,
      objective_score: 0.28,
      calorie_offset_from_current: -100,
      feasibility_rating: 'MODERATE',
    },
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Milestone M7 — Weekly Review & Forecast Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders WeeklyReviewTab with headline, delta stats, and deterministic assessment lists', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockResolvedValue(mockReportData);

    renderWithClient(<WeeklyReviewTab />);

    await waitFor(() => {
      expect(screen.getByText('Retrospective Review')).toBeInTheDocument();
      expect(screen.getByText('Weekly Review (Aug 13 - Aug 19, 2026)')).toBeInTheDocument();
    });

    // Check stats and completed sets
    expect(screen.getByText('Completed Sets')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('+6 sets vs prior week')).toBeInTheDocument();

    // Check 3 deterministic lists
    expect(screen.getByText('What Went Well')).toBeInTheDocument();
    expect(screen.getByText('Executed full resistance volume with 42 completed sets.')).toBeInTheDocument();
    expect(screen.getByText('What Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Average protein intake trailed target by 12g.')).toBeInTheDocument();
    expect(screen.getByText('Next Period Focus')).toBeInTheDocument();
    expect(screen.getByText('Increase dietary protein toward daily target of 150g.')).toBeInTheDocument();
  });

  it('handles on-demand AI summary generation and caching', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockResolvedValue(mockReportData);
    vi.mocked(reportsApi.generateReportAiSummaryApi).mockResolvedValue({
      narrative: 'AI generated weekly coaching summary.',
      ai_generated: true,
      cached: false,
      headline: 'Weekly Review',
    });

    renderWithClient(<WeeklyReviewTab />);

    await waitFor(() => {
      expect(screen.getByText('Write Summary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Write Summary'));

    await waitFor(() => {
      expect(reportsApi.generateReportAiSummaryApi).toHaveBeenCalled();
      expect(screen.getByText('AI generated weekly coaching summary.')).toBeInTheDocument();
    });
  });

  it('renders ForecastTab with hero ETA card, 30-Day Outlook, and interactive Daily Target pace chips', async () => {
    vi.mocked(intelligenceApi.getTrajectoryApi).mockResolvedValue(mockTrajectoryData);
    vi.mocked(intelligenceApi.getGoalFeasibilityApi).mockResolvedValue(mockFeasibilityData);
    vi.mocked(intelligenceApi.optimizePlanApi).mockResolvedValue(mockOptimizerData);

    renderWithClient(<ForecastTab />);

    await waitFor(() => {
      expect(screen.getByText(/On track to reach your goal of 75\.0 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/Based on your recent weigh-ins and logging consistency\./i)).toBeInTheDocument();
      expect(screen.getByText('30-Day Outlook')).toBeInTheDocument();
      expect(screen.getByText('Daily Target')).toBeInTheDocument();
      expect(screen.getByText('1,900 kcal')).toBeInTheDocument();
      expect(screen.getByText('155 g')).toBeInTheDocument();
    });

    // Check pace adjustment chips and dynamic target updates
    const conservativeChip = screen.getByRole('radio', { name: /Conservative/i });
    const optimalChip = screen.getByRole('radio', { name: /Optimal/i });
    const aggressiveChip = screen.getByRole('radio', { name: /Aggressive/i });

    expect(optimalChip).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(aggressiveChip);
    expect(aggressiveChip).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('1,700 kcal')).toBeInTheDocument();
    expect(screen.getByText('165 g')).toBeInTheDocument();

    fireEvent.click(conservativeChip);
    expect(conservativeChip).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('2,050 kcal')).toBeInTheDocument();
    expect(screen.getByText('150 g')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Apply to Daily Targets/i })).toBeInTheDocument();
  });
});
