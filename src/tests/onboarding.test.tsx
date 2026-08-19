import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
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

describe('OnboardingPage Wizard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'uuid-123',
        email: 'onboarder@example.com',
        full_name: 'Prefilled Name',
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

  it('renders Step 1 with prefilled full_name and validates required height_cm and weight_kg', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Personal Information/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prefilled Name')).toBeInTheDocument();

    // Click Continue without entering height or weight
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Height in cm is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Current weight in kg is required/i)).toBeInTheDocument();
    });

    // Enter out-of-range height and weight
    fireEvent.change(screen.getByLabelText(/Height \(CM\)/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Current Weight \(KG\)/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Height must be between 50 and 300 cm/i)).toBeInTheDocument();
      expect(screen.getByText(/Current weight must be between 30 and 300 kg/i)).toBeInTheDocument();
    });
  });

  it('navigates through Steps 1 to 4 with validation and preserves wizard state when navigating back', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Step 1: Valid Height and Weight
    fireEvent.change(screen.getByLabelText(/Height \(CM\)/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Current Weight \(KG\)/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 2: Fitness Goals
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fitness Goals/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Primary Goal/i), {
      target: { value: 'muscle_gain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 3: Activity Level
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Activity & Fitness Level/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Baseline Activity Level/i), {
      target: { value: 'very_active' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 4: Preferences
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Preferences & Constraints/i })).toBeInTheDocument();
    });

    // Test Back Navigation to Step 3 and verify state persistence
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Activity & Fitness Level/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Very Active/i)).toBeInTheDocument();
    });
  });

  it('handles final submission, renders honest assessment, and navigates to /dashboard on completion', async () => {
    vi.mocked(goalsApi.createGoalApi).mockResolvedValueOnce({
      id: 'goal-1',
      user_id: 'uuid-123',
      goal_type: 'muscle_gain',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.mocked(profileApi.completeOnboardingApi).mockResolvedValueOnce({
      id: 'profile-1',
      user_id: 'uuid-123',
      full_name: 'Prefilled Name',
      height_cm: 180,
      weight_kg: 75,
      timezone: 'UTC',
      onboarding_complete: true,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<div>Dashboard Destination Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/Height \(CM\)/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Current Weight \(KG\)/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 2
    await waitFor(() => expect(screen.getByRole('heading', { name: /Fitness Goals/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Primary Goal/i), { target: { value: 'muscle_gain' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 3
    await waitFor(() => expect(screen.getByRole('heading', { name: /Activity & Fitness Level/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Baseline Activity Level/i), { target: { value: 'very_active' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 4
    await waitFor(() => expect(screen.getByRole('heading', { name: /Preferences & Constraints/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 5: Assessment
    await waitFor(() => expect(screen.getByRole('heading', { name: /Initial Baseline Assessment/i })).toBeInTheDocument());
    expect(screen.getByText('Baseline Evaluation')).toBeInTheDocument();
    expect(screen.queryByText('65 / 100')).toBeNull(); // Fabricated score removed

    // Click Final CTA
    fireEvent.click(screen.getByRole('button', { name: /View My Plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Destination Page/i)).toBeInTheDocument();
    });

    expect(goalsApi.createGoalApi).toHaveBeenCalledWith({
      goal_type: 'muscle_gain',
      target_weight_kg: undefined,
      target_date: undefined,
    });
    expect(profileApi.completeOnboardingApi).toHaveBeenCalledWith({
      full_name: 'Prefilled Name',
      date_of_birth: undefined,
      gender: undefined,
      height_cm: 180,
      weight_kg: 75,
      activity_level: 'very_active',
      diet_preference: 'omnivore',
      equipment: ['bodyweight'],
      medical_notes: undefined,
    });
  });
});
