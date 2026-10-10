import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { FitnessScoreCard } from '../components/progress/FitnessScoreCard';
import { ProgressOverviewPage } from '../pages/progress/ProgressOverviewPage';
import { AppShell } from '../components/layout/AppShell';
import * as scoreApi from '../lib/api/fitnessScore';
import * as progressApi from '../lib/api/progress';
import * as goalsApi from '../lib/api/goals';

vi.mock('../lib/api/fitnessScore', () => ({
  getFitnessScoreApi: vi.fn(),
  recalculateFitnessScoreApi: vi.fn(),
}));

vi.mock('../lib/api/progress', () => ({
  getProgressSummaryApi: vi.fn(),
  getMeasurementsApi: vi.fn(),
  createMeasurementApi: vi.fn(),
  getMeasurementByIdApi: vi.fn(),
}));

vi.mock('../lib/api/goals', () => ({
  getActiveGoalApi: vi.fn(),
  createGoalApi: vi.fn(),
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
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockScoreItem = {
  id: 'fs-1',
  user_id: 'u-123',
  score: 84,
  workout_adherence_pct: 100.0,
  nutrition_score: 82.5,
  protein_score: 90.0,
  sleep_score: null,
  recovery_score: null,
  consistency_score: 85.7,
  formula_version: 2,
  sets_completed: 16,
  sets_planned: 16,
  calculated_at: new Date().toISOString(),
  period_start: '2026-08-11',
  period_end: '2026-08-17',
};

const mockScoreResponse = {
  current_score: mockScoreItem,
  score_label: 'Good' as const,
  history: [mockScoreItem],
};

describe('Milestone M6 — Fitness Score Engine & Card Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-123',
        email: 'athlete@example.com',
        full_name: 'Athlete User',
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString(),
      },
      accessToken: 'mock_token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValue({
      id: 'g-1',
      user_id: 'u-123',
      goal_type: 'fat_loss',
      target_weight_kg: 70.0,
      target_date: null,
      is_active: true,
      has_goal_conflict: false,
      conflict_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('renders Fitness Score card with 4-bar breakdown (Workouts 35%, Calories 25%, Protein 20%, Logging 20%)', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValueOnce(mockScoreResponse);
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce({
      latest_weight_kg: 75.0,
      weight_change_kg: 0.0,
      trend_direction: 'maintaining',
      total_entries: 1,
      latest_measurement: null,
      history: [],
    });

    const { container } = renderWithQuery(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Weekly Fitness Score/i)).toBeInTheDocument();
    await waitFor(() => expect(container.textContent).toContain('84'));
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);

    // 4-Bar Component Breakdown
    expect(screen.getAllByText(/Workouts \(35%\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Calories \(25%\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Protein \(20%\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Logging \(20%\)/i).length).toBeGreaterThan(0);

    // Verify recovery constant is REMOVED
    expect(screen.queryByText(/Recovery & Sleep Baseline \(10%\)/i)).not.toBeInTheDocument();

    // Verify Recalculate button is REMOVED
    expect(screen.queryByRole('button', { name: /Recalculate ↻/i })).not.toBeInTheDocument();

    // Verify What to improve and How this is calculated
    expect(screen.getByText(/What to improve/i)).toBeInTheDocument();
    expect(screen.getByText(/How this is calculated \(Formula V2\)/i)).toBeInTheDocument();
  });

  it('renders error state when score loading fails', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockRejectedValueOnce(new Error('Network error'));

    renderWithQuery(
      <MemoryRouter>
        <FitnessScoreCard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Fitness Score Error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('renders compact Fitness Score card without recalculate button', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValueOnce(mockScoreResponse);

    renderWithQuery(
      <MemoryRouter>
        <FitnessScoreCard compact={true} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Weekly Fitness Score/i)).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recalculate ↻/i })).not.toBeInTheDocument();
  });
});
