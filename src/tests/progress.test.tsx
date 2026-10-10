import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { ProgressOverviewPage } from '../pages/progress/ProgressOverviewPage';
import { AppShell } from '../components/layout/AppShell';
import * as progressApi from '../lib/api/progress';
import * as goalsApi from '../lib/api/goals';
import * as scoreApi from '../lib/api/fitnessScore';

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

vi.mock('../lib/api/fitnessScore', () => ({
  getFitnessScoreApi: vi.fn(),
  recalculateFitnessScoreApi: vi.fn(),
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
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

const mockMeasurement = {
  id: 'm-1',
  user_id: 'u-123',
  measured_at: '2026-08-17',
  weight_kg: 78.5,
  chest_cm: 102.0,
  waist_cm: 84.0,
  hips_cm: 98.0,
  bicep_cm: 38.0,
  thigh_cm: 58.0,
  body_fat_pct: 16.5,
  created_at: new Date().toISOString(),
};

const mockSummary = {
  latest_weight_kg: 78.5,
  weight_change_kg: -1.5,
  trend_direction: 'losing' as const,
  total_entries: 1,
  latest_measurement: mockMeasurement,
  history: [mockMeasurement],
};

const mockGoal = {
  id: 'g-1',
  user_id: 'u-123',
  goal_type: 'fat_loss' as const,
  target_weight_kg: 75.0,
  target_date: '2026-12-31',
  is_active: true,
  has_goal_conflict: false,
  conflict_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockScoreResponse = {
  current_score: {
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
  },
  score_label: 'Good' as const,
  history: [],
};

describe('Milestone M6 — Progress, Fitness Score and Goal Integrity', () => {
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
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValue(mockScoreResponse);
    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValue(mockGoal);
  });

  it('renders Progress Overview Page with Tabs, StatTiles, and trimmed LineChart', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce(mockSummary);

    renderWithQuery(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Progress & Metrics/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Body Measurements/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Weekly Review/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Forecast/i })).toBeInTheDocument();

    // StatTiles (wait for async query resolution)
    expect(await screen.findByText('78.5')).toBeInTheDocument();
    expect(screen.getByText(/Current Weight/i)).toBeInTheDocument();
    expect(screen.getByText(/Weight Change/i)).toBeInTheDocument();
    expect(screen.getByText(/Distance to Goal/i)).toBeInTheDocument();

    // Chart
    expect(screen.getByText(/Weight History & Trend/i)).toBeInTheDocument();
  });

  it('renders goal conflict alert banner when activeGoal.has_goal_conflict is true', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce(mockSummary);
    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValueOnce({
      ...mockGoal,
      has_goal_conflict: true,
      conflict_reason: 'Fat loss goal requires target weight less than current weight (78.5 kg).',
    });

    renderWithQuery(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Goal Configuration Conflict/i)).toBeInTheDocument();
    expect(screen.getByText(/Fat loss goal requires target weight less than current weight/i)).toBeInTheDocument();
  });

  it('switches to Body Measurements tab and renders natural unnested list', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce(mockSummary);

    renderWithQuery(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    const bodyTab = await screen.findByRole('tab', { name: /Body Measurements/i });
    fireEvent.click(bodyTab);

    expect(await screen.findByText(/Body Circumferences & Fat %/i)).toBeInTheDocument();
    expect(screen.getByText(/Measurement Log \(1 entry\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-17/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest:/i)).toBeInTheDocument();
    expect(screen.getByText('40.2 in')).toBeInTheDocument();
  });

  it('allows opening measurement modal and submitting a new weight entry', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValue(mockSummary);
    vi.mocked(progressApi.createMeasurementApi).mockResolvedValueOnce(mockMeasurement);

    renderWithQuery(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Progress & Metrics/i)).toBeInTheDocument();

    // Click Add Measurement button
    const addBtn = screen.getAllByRole('button', { name: /Add Measurement/i })[0];
    fireEvent.click(addBtn);

    expect(screen.getByText(/Add Body Measurement/i)).toBeInTheDocument();

    const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
    fireEvent.change(weightInput, { target: { value: '77.0' } });

    const submitBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(progressApi.createMeasurementApi).toHaveBeenCalledWith(
        expect.objectContaining({
          weight_kg: 77.0,
        }),
      );
    });
  });
});
