import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { SettingsPage } from '../pages/settings/SettingsPage';
import * as profileApi from '../lib/api/profile';
import * as goalsApi from '../lib/api/goals';
import * as authApi from '../lib/api/auth';
import * as userApi from '../lib/api/user';

vi.mock('../lib/api/profile', () => ({
  getProfileApi: vi.fn(),
  updateProfileApi: vi.fn(),
}));

vi.mock('../lib/api/goals', () => ({
  getActiveGoalApi: vi.fn(),
  createGoalApi: vi.fn(),
}));

vi.mock('../lib/api/auth', () => ({
  changePasswordApi: vi.fn(),
}));

vi.mock('../lib/api/user', () => ({
  exportUserDataApi: vi.fn(),
  deleteUserAccountApi: vi.fn(),
}));

const mockProfile = {
  id: 'p-1',
  user_id: 'u-1',
  full_name: 'Jordan Smith',
  date_of_birth: '1990-04-12',
  gender: 'female' as const,
  height_cm: 168,
  weight_kg: 68.0,
  activity_level: 'moderate' as const,
  diet_preference: 'omnivore' as const,
  equipment: ['dumbbells', 'bodyweight'],
  medical_notes: 'Prior shoulder dislocation, avoid overhead hyperextension.',
  timezone: 'America/New_York',
  preferred_workout_duration_minutes: 45,
  target_workout_days_per_week: 4,
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockGoal = {
  id: 'g-1',
  user_id: 'u-1',
  goal_type: 'fat_loss' as const,
  target_weight_kg: 63.0,
  target_date: '2026-12-31',
  is_active: true,
  has_goal_conflict: false,
  conflict_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const renderSettings = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Milestone M9 — Rebuilt Settings Screen (/settings)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-1',
        email: 'jordan@example.com',
        full_name: 'Jordan Smith',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      accessToken: 'token-xyz',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    usePreferencesStore.setState({
      units: 'metric',
      screenWakeLock: false,
      restTimerSound: true,
    });
    vi.clearAllMocks();

    vi.mocked(profileApi.getProfileApi).mockResolvedValue(mockProfile);
    vi.mocked(goalsApi.getActiveGoalApi).mockResolvedValue(mockGoal);
  });

  it('renders all 6 navigation sections and displays profile view', async () => {
    renderSettings();

    expect(await screen.findByText('12 Apr 1990')).toBeInTheDocument();
    expect(screen.getByText('Personal Profile')).toBeInTheDocument();
    expect(screen.getByText('68.0 kg')).toBeInTheDocument();
    expect(screen.getByText('168 cm')).toBeInTheDocument();

    // Verify presence of all 6 section navigation buttons
    expect(screen.getByRole('button', { name: /^Profile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Goal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Training/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Preferences/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Health Notes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Account/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
  });

  it('navigates to Goal section, validates goal direction and pace, and saves goal update', async () => {
    vi.mocked(goalsApi.createGoalApi).mockResolvedValue({
      ...mockGoal,
      target_weight_kg: 62.0,
    });

    renderSettings();
    await screen.findByText('12 Apr 1990');

    // Switch to Goal tab
    fireEvent.click(screen.getByRole('button', { name: /Goal/i }));

    expect(await screen.findByText('Fitness Goal')).toBeInTheDocument();
    expect(screen.getByText('63.0 kg')).toBeInTheDocument();

    // Edit Goal
    fireEvent.click(screen.getByRole('button', { name: /Edit Goal/i }));

    // Try invalid target weight for fat loss (> current weight 68 kg)
    const targetInput = screen.getByLabelText(/Target Weight/i);
    fireEvent.change(targetInput, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(
      await screen.findByText(/must be lower than your current weight/i),
    ).toBeInTheDocument();
    expect(goalsApi.createGoalApi).not.toHaveBeenCalled();

    // Fix target weight to valid (62 kg)
    fireEvent.change(targetInput, { target: { value: '62' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(goalsApi.createGoalApi).toHaveBeenCalledWith(
        expect.objectContaining({
          target_weight_kg: 62,
          goal_type: 'fat_loss',
        }),
      );
      expect(screen.getByText(/Fitness goal saved successfully!/i)).toBeInTheDocument();
    });
  });

  it('navigates to Preferences section, toggles units to imperial and updates formatters', async () => {
    vi.mocked(profileApi.updateProfileApi).mockResolvedValue(mockProfile);

    renderSettings();
    await screen.findByText('12 Apr 1990');

    // Switch to Preferences tab
    fireEvent.click(screen.getByRole('button', { name: /Preferences/i }));

    expect(await screen.findByText('App Preferences')).toBeInTheDocument();
    expect(screen.getByText('Metric (kg, cm)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Edit Preferences/i }));

    // Toggle to Imperial
    fireEvent.click(screen.getByRole('button', { name: /Imperial \(lbs, in\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(usePreferencesStore.getState().units).toBe('imperial');
    });
  });

  it('navigates to Health Notes section and displays AI Coach disclosure', async () => {
    vi.mocked(profileApi.updateProfileApi).mockResolvedValue({
      ...mockProfile,
      medical_notes: 'Updated shoulder recovery note',
    });

    renderSettings();
    await screen.findByText('12 Apr 1990');

    // Switch to Health tab
    fireEvent.click(screen.getByRole('button', { name: /Health Notes/i }));

    expect(await screen.findByText('Health & Injury Notes')).toBeInTheDocument();
    expect(screen.getByText(/AI Coach Safety Integration/i)).toBeInTheDocument();
    expect(
      screen.getByText(/These notes are directly factored into your AI Coach recommendations/i),
    ).toBeInTheDocument();

    // Edit and save notes
    fireEvent.click(screen.getByRole('button', { name: /Edit Notes/i }));
    const textarea = screen.getByPlaceholderText(/Lower back stiffness/i);
    fireEvent.change(textarea, { target: { value: 'Updated shoulder recovery note' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(profileApi.updateProfileApi).toHaveBeenCalledWith({
        medical_notes: 'Updated shoulder recovery note',
      });
      expect(screen.getByText(/Health notes updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('navigates to Account section and handles Password change dialog', async () => {
    vi.mocked(authApi.changePasswordApi).mockResolvedValue({
      message: 'Password successfully updated',
    });

    renderSettings();
    await screen.findByText('12 Apr 1990');

    // Switch to Account tab
    fireEvent.click(screen.getByRole('button', { name: /Account/i }));

    expect(await screen.findByText('Account & Security')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();

    // Open change password dialog
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));

    expect(screen.getByText('Enter your current password and your new password.')).toBeInTheDocument();

    // Fill password form
    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'NewPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(authApi.changePasswordApi).toHaveBeenCalledWith({
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      });
      expect(screen.getByText(/Password successfully updated!/i)).toBeInTheDocument();
    });
  });

  it('handles user data export via GET /api/v1/user/export', async () => {
    vi.mocked(userApi.exportUserDataApi).mockResolvedValue({
      exported_at: '2026-10-11T00:00:00Z',
      user: { id: 'u-1', email: 'jordan@example.com' },
      profile: mockProfile,
      goals: [mockGoal],
      measurements: [],
      workout_logs: [],
      nutrition_logs: [],
      fitness_scores: [],
      coach_conversations: [],
    });

    // Mock createObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    renderSettings();
    await screen.findByText('12 Apr 1990');

    fireEvent.click(screen.getByRole('button', { name: /Account/i }));

    fireEvent.click(screen.getByRole('button', { name: /Export JSON/i }));

    await waitFor(() => {
      expect(userApi.exportUserDataApi).toHaveBeenCalled();
      expect(screen.getByText(/Data export downloaded successfully!/i)).toBeInTheDocument();
    });
  });

  it('handles account deletion confirmation with password verification', async () => {
    vi.mocked(userApi.deleteUserAccountApi).mockResolvedValue({
      message: 'Account successfully deleted',
    });

    renderSettings();
    await screen.findByText('12 Apr 1990');

    fireEvent.click(screen.getByRole('button', { name: /Account/i }));

    // Open Delete Account dialog
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));

    expect(screen.getByText('Delete FitMind Account')).toBeInTheDocument();

    const confirmInput = screen.getByPlaceholderText(/Enter your current password/i);
    fireEvent.change(confirmInput, { target: { value: 'MyCurrentPassword123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Permanently Delete Account/i }));

    await waitFor(() => {
      expect(userApi.deleteUserAccountApi).toHaveBeenCalledWith('MyCurrentPassword123!');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
