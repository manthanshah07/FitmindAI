import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { AppShell } from '../components/layout/AppShell';
import * as reportsApi from '../lib/api/reports';
import type { FitnessReportResponse } from '../types/reports';

vi.mock('../lib/api/reports', () => ({
  getWeeklyReportApi: vi.fn(),
  getMonthlyReportApi: vi.fn(),
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

const mockWeeklyReport: FitnessReportResponse = {
  report_type: 'weekly',
  start_date: '2026-08-13',
  end_date: '2026-08-19',
  generated_at: new Date().toISOString(),
  headline: 'Weekly Report (Aug 13 - Aug 19, 2026)',
  adherence_score: 88.5,
  adherence_label: 'High',
  adherence_breakdown: {
    workout_completion_pct: 100,
    nutrition_logging_pct: 85.7,
    measurement_tracking_score: 100,
  },
  summary_facts: [
    'Completed 4 of 4 planned workouts (100% target completion).',
    'Logged nutrition on 6 of 7 days (avg 2150 kcal, 145g protein).',
    'Weight change: -0.4 kg across 2 measurement logs.',
    'Fitness Score: 72 → 76 (+4 pts, Improving).',
  ],
  workouts: {
    workouts_completed: 4,
    target_workouts: 4,
    completion_rate_pct: 100,
    total_duration_minutes: 180,
    total_sets_completed: 24,
    total_exercises_completed: 8,
    most_frequent_muscles: ['Chest', 'Triceps', 'Back'],
    has_data: true,
  },
  nutrition: {
    logged_days_count: 6,
    total_days_in_period: 7,
    logging_completion_pct: 85.7,
    target_calories: 2200,
    average_calories_per_logged_day: 2150,
    target_protein_g: 150,
    average_protein_per_logged_day: 145,
    calorie_adherence_pct: 97.7,
    protein_adherence_pct: 96.7,
    has_data: true,
  },
  progress: {
    starting_weight_kg: 75.0,
    ending_weight_kg: 74.6,
    weight_change_kg: -0.4,
    starting_body_fat_pct: 18.0,
    ending_body_fat_pct: 17.8,
    body_fat_change_pct: -0.2,
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
  narrative: 'Outstanding work this week! Your training consistency reached 100% and nutrition adherence remained strong.',
  ai_generated: true,
};

const mockSparseWeeklyReport: FitnessReportResponse = {
  ...mockWeeklyReport,
  adherence_score: null,
  adherence_label: 'Insufficient Data',
  workouts: {
    workouts_completed: 0,
    target_workouts: 4,
    completion_rate_pct: null,
    total_duration_minutes: null,
    total_sets_completed: null,
    total_exercises_completed: null,
    most_frequent_muscles: [],
    has_data: false,
  },
  nutrition: {
    logged_days_count: 0,
    total_days_in_period: 7,
    logging_completion_pct: 0,
    target_calories: 2200,
    average_calories_per_logged_day: null,
    target_protein_g: 150,
    average_protein_per_logged_day: null,
    calorie_adherence_pct: null,
    protein_adherence_pct: null,
    has_data: false,
  },
  progress: {
    starting_weight_kg: null,
    ending_weight_kg: null,
    weight_change_kg: null,
    starting_body_fat_pct: null,
    ending_body_fat_pct: null,
    body_fat_change_pct: null,
    measurement_count: 0,
    has_data: false,
  },
  narrative: null,
  ai_generated: false,
};

describe('Phase 8 — Automated Reports Module UI', () => {
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

  it('renders weekly report on initial page load', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockResolvedValueOnce(mockWeeklyReport);

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <AppShell>
            <ReportsPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Weekly Report \(Aug 13 - Aug 19, 2026\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/HIGH ADHERENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/88.5%/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed 4 of 4 planned workouts/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Coach Executive Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding work this week!/i)).toBeInTheDocument();
  });

  it('toggles between weekly and monthly reports when clicking tab buttons', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockResolvedValueOnce(mockWeeklyReport);
    vi.mocked(reportsApi.getMonthlyReportApi).mockResolvedValueOnce({
      ...mockWeeklyReport,
      report_type: 'monthly',
      headline: 'Monthly Report (August 2026)',
    });

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <AppShell>
            <ReportsPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Weekly Report \(Aug 13 - Aug 19, 2026\)/i)).toBeInTheDocument();
    });

    const monthlyBtn = screen.getByRole('button', { name: /MONTHLY \(CALENDAR\)/i });

    await act(async () => {
      fireEvent.click(monthlyBtn);
    });

    await waitFor(() => {
      expect(reportsApi.getMonthlyReportApi).toHaveBeenCalled();
    });

    expect(screen.getByText(/Monthly Report \(August 2026\)/i)).toBeInTheDocument();
  });

  it('handles sparse/missing data sections cleanly without rendering false zeros', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockResolvedValueOnce(mockSparseWeeklyReport);

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <AppShell>
            <ReportsPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Not enough workout data for this period/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No nutrition logs recorded for this period/i)).toBeInTheDocument();
    expect(screen.getByText(/No measurements recorded for this period/i)).toBeInTheDocument();
    expect(screen.getByText(/INSUFFICIENT DATA/i)).toBeInTheDocument();
  });

  it('displays error banner gracefully if API call fails', async () => {
    vi.mocked(reportsApi.getWeeklyReportApi).mockRejectedValueOnce(
      new Error('Failed to fetch fitness report.')
    );

    await act(async () => {
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <AppShell>
            <ReportsPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch fitness report/i)).toBeInTheDocument();
    });
  });
});
