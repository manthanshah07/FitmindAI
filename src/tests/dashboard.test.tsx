import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AppShell } from '../components/layout/AppShell';
import * as dashboardApi from '../lib/api/dashboard';
import type { DashboardSummaryResponse } from '../types/dashboard';

vi.mock('../lib/api/dashboard', () => ({
  getDashboardSummaryApi: vi.fn(),
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

const mockDashboardSummary: DashboardSummaryResponse = {
  full_name: 'Athlete User',
  email: 'athlete@example.com',
  onboarding_complete: true,
  tdee_calories: 2400,
  bmr_calories: 1600,
  target_calories: 2200,
  target_protein_g: 150,
  goal: {
    goal_type: 'weight_loss',
    target_weight_kg: 72.0,
    target_date: '2026-12-31',
    is_active: true,
  },
  workout_plan: {
    id: 'p-1',
    name: '4-Day Split',
    days_per_week: 4,
    exercise_count: 6,
  },
  today_nutrition: {
    consumed_calories: 1450,
    target_calories: 2200,
    remaining_calories: 750,
    consumed_protein_g: 110,
    target_protein_g: 150,
    remaining_protein_g: 40,
  },
  weekly_summary: {
    adherence_score: 88.5,
    adherence_label: 'High',
    workouts_completed: 4,
    target_workouts: 4,
    workout_completion_pct: 100,
    nutrition_logged_days: 6,
    total_days: 7,
    current_fitness_score: 76,
    starting_fitness_score: 72,
    fitness_score_change: 4,
    fitness_score_trend: 'improving',
    weight_change_kg: -0.4,
    has_weekly_data: true,
  },
};

describe('Cycle 7 — Dashboard Integration & Metric Consistency UI', () => {
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
  });

  it('renders weekly progress overview card using single 1-shot API summary', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockDashboardSummary);

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppShell>
            <DashboardPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Weekly Progress Overview/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/HIGH ADHERENCE \(88.5%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 4/i)).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 7 Days/i)).toBeInTheDocument();
    expect(screen.getByText(/76 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/-0.4 kg/i)).toBeInTheDocument();

    const reportBtn = screen.getByRole('link', { name: /View Full Weekly Report →/i });
    expect(reportBtn).toBeInTheDocument();
    expect(reportBtn.getAttribute('href')).toBe('/reports');
  });

  it('handles error banner gracefully if dashboard summary API fails', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockRejectedValueOnce(
      new Error('Failed to load dashboard overview.')
    );

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppShell>
            <DashboardPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard overview/i)).toBeInTheDocument();
    });
  });
});
