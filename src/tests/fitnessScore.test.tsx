import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { FitnessScoreCard } from '../components/progress/FitnessScoreCard';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProgressOverviewPage } from '../pages/progress/ProgressOverviewPage';
import { AppShell } from '../components/layout/AppShell';
import * as scoreApi from '../lib/api/fitnessScore';
import * as progressApi from '../lib/api/progress';

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

const mockScoreItem = {
  id: 'fs-1',
  user_id: 'u-123',
  score: 84,
  workout_adherence_pct: 100.0,
  nutrition_score: 82.5,
  protein_score: 90.0,
  sleep_score: 75.0,
  recovery_score: 75.0,
  consistency_score: 85.7,
  calculated_at: new Date().toISOString(),
  period_start: '2026-08-11',
  period_end: '2026-08-17',
};

const mockScoreResponse = {
  current_score: mockScoreItem,
  score_label: 'Good' as const,
  history: [mockScoreItem],
};

describe('Phase 6 — Fitness Score Engine Frontend Module', () => {
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

  it('renders Fitness Score card with breakdown and label on Progress page', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValueOnce(mockScoreResponse);
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce({
      latest_weight_kg: 75.0,
      weight_change_kg: 0.0,
      trend_direction: 'maintaining',
      total_entries: 1,
      latest_measurement: null,
      history: [],
    });

    render(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Weekly Fitness Score/i)).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText(/Workout Adherence \(30%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Protein Target Adherence \(20%\)/i)).toBeInTheDocument();
  });

  it('recalculate button triggers the recalculate API call', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValue(mockScoreResponse);
    vi.mocked(scoreApi.recalculateFitnessScoreApi).mockResolvedValueOnce(mockScoreItem);

    render(
      <MemoryRouter>
        <FitnessScoreCard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('84')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /Recalculate ↻/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(scoreApi.recalculateFitnessScoreApi).toHaveBeenCalled();
    });
  });

  it('renders error state when score loading fails', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <FitnessScoreCard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Fitness Score Engine Error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('renders compact Fitness Score card on Dashboard', async () => {
    vi.mocked(scoreApi.getFitnessScoreApi).mockResolvedValueOnce(mockScoreResponse);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Weekly Fitness Score/i)).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });
});
