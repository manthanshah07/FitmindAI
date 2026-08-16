import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import * as profileApi from '../lib/api/profile';
import * as goalsApi from '../lib/api/goals';

vi.mock('../lib/api/profile', () => ({
  getProfileApi: vi.fn(),
  updateProfileApi: vi.fn(),
  completeOnboardingApi: vi.fn(),
}));

vi.mock('../lib/api/goals', () => ({
  getActiveGoalApi: vi.fn(),
  createGoalApi: vi.fn(),
}));

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

    vi.mocked(profileApi.getProfileApi).mockResolvedValue({
      id: 'p-1',
      user_id: 'uuid-123',
      full_name: 'AppShell User',
      height_cm: 180,
      weight_kg: 80,
      activity_level: 'moderate',
      onboarding_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValue({
      id: 'g-1',
      user_id: 'uuid-123',
      goal_type: 'muscle_gain',
      target_weight_kg: 85,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('renders AppShell layout with Sidebar, TopBar, and navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <div>Dashboard Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByText(/FitMind User|AppShell User/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Workouts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nutrition/i).length).toBeGreaterThan(0);
  });

  it('renders Dashboard with calibrated baseline metrics and honest structural module placeholders', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValue({
      id: 'p-1',
      user_id: 'uuid-123',
      full_name: 'AppShell User',
      height_cm: 180,
      weight_kg: 80,
      activity_level: 'moderate',
      onboarding_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValue({
      id: 'g-1',
      user_id: 'uuid-123',
      goal_type: 'muscle_gain',
      target_weight_kg: 85,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/FitMind AI Dashboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/2669 kcal/i)).toBeInTheDocument(); // TDEE (BMR 1722 * 1.55)
    expect(await screen.findByText(/MUSCLE GAIN/i)).toBeInTheDocument();

    // Honest Placeholders for Future Modules
    expect(screen.getAllByText(/Phase 3/i).length).toBeGreaterThan(0); // Workout
    expect(screen.getAllByText(/Phase 4/i).length).toBeGreaterThan(0); // Nutrition
    expect(screen.getAllByText(/Phase 5/i).length).toBeGreaterThan(0); // Progress
    expect(screen.getAllByText(/Phase 7/i).length).toBeGreaterThan(0); // AI Coach
  });

  it('triggers logout from AppShell and clears auth session', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AppShell>
                <div>Dashboard Content</div>
              </AppShell>
            }
          />
          <Route path="/login" element={<div>Login Page Destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const logoutButtons = screen.getAllByRole('button', { name: /Log Out/i });
    fireEvent.click(logoutButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Login Page Destination/i)).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
