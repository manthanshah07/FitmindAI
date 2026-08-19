import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import * as dashboardApi from '../lib/api/dashboard';

import type { DashboardSummaryResponse } from '../types/dashboard';


vi.mock('../lib/api/profile', () => ({
  getProfileApi: vi.fn(),
  updateProfileApi: vi.fn(),
  completeOnboardingApi: vi.fn(),
}));

vi.mock('../lib/api/goals', () => ({
  getActiveGoalApi: vi.fn(),
  createGoalApi: vi.fn(),
}));

vi.mock('../lib/api/dashboard', () => ({
  getDashboardSummaryApi: vi.fn(),
}));

const mockSummaryComplete: DashboardSummaryResponse = {
  full_name: 'AppShell User',
  email: 'appshelluser@example.com',
  onboarding_complete: true,
  tdee_calories: 2669,
  bmr_calories: 1722,
  target_calories: 2500,
  target_protein_g: 160,
  goal: {
    goal_type: 'muscle_gain',
    target_weight_kg: 85,
    target_date: '2026-12-31',
    is_active: true,
  },
  workout_plan: {
    id: 'plan-1',
    name: '4-Day Split',
    days_per_week: 4,
    exercise_count: 5,
  },
  today_nutrition: {
    consumed_calories: 1800,
    target_calories: 2500,
    remaining_calories: 700,
    consumed_protein_g: 120,
    target_protein_g: 160,
    remaining_protein_g: 40,
  },
  weekly_summary: {
    adherence_score: 90.0,
    adherence_label: 'High',
    workouts_completed: 4,
    target_workouts: 4,
    workout_completion_pct: 100,
    nutrition_logged_days: 6,
    total_days: 7,
    current_fitness_score: 80,
    starting_fitness_score: 75,
    fitness_score_change: 5,
    fitness_score_trend: 'improving',
    weight_change_kg: -0.5,
    has_weekly_data: true,
  },
};

describe('AppShell & Dashboard Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'uuid-123',
        email: 'appshelluser@example.com',
        full_name: 'AppShell User',
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

  it('renders AppShell structure with navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/FitMind/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Workouts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nutrition/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Progress/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AppShell User/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('toggles mobile drawer when clicking menu button', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <div>Main Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole('button', { name: /toggle mobile navigation/i });

    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    const mobileNavs = screen.getAllByRole('navigation');
    expect(mobileNavs.length).toBeGreaterThan(1);
  });

  it('renders Dashboard Page metrics correctly inside AppShell', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValue(mockSummaryComplete);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/FitMind AI Dashboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/2669 kcal/i)).toBeInTheDocument();
    expect(await screen.findByText(/MUSCLE GAIN/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AI Coach/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Active AI Coach/i)).toBeInTheDocument();
  });

  it('shows non-blocking onboarding card when onboarding_complete is false', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValue({
      ...mockSummaryComplete,
      onboarding_complete: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Your profile is not fully set up yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Complete Onboarding →/i })).toBeInTheDocument();
  });

  it('hides onboarding card when onboarding_complete is true', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValue(mockSummaryComplete);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/FitMind AI Dashboard/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Your profile is not fully set up yet/i)).not.toBeInTheDocument();
  });

  it('navigates to login on logout button click', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AppShell>
                <div>Dashboard View</div>
              </AppShell>
            }
          />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const logoutButtons = screen.getAllByRole('button', { name: /log out/i });

    expect(logoutButtons.length).toBeGreaterThan(0);

    fireEvent.click(logoutButtons[0]);

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
