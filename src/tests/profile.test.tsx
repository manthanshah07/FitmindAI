import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { AppShell } from '../components/layout/AppShell';
import * as profileApi from '../lib/api/profile';

vi.mock('../lib/api/profile', () => ({
  getProfileApi: vi.fn(),
  updateProfileApi: vi.fn(),
  completeOnboardingApi: vi.fn(),
}));

const mockProfile = {
  id: 'p-123',
  user_id: 'u-123',
  full_name: 'Alex Rivera',
  date_of_birth: '1995-06-15',
  gender: 'male' as const,
  height_cm: 182,
  weight_kg: 82.5,
  activity_level: 'moderate' as const,
  diet_preference: 'omnivore' as const,
  equipment: ['dumbbells', 'barbell'],
  medical_notes: 'Mild right knee discomfort during heavy squats',
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Phase 2B — User Profile & Settings Screen', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-123',
        email: 'alex@example.com',
        full_name: 'Alex Rivera',
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

  it('loads and displays user profile data from GET /api/v1/profile', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1995-06-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('82.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('182')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Mild right knee discomfort/i)).toBeInTheDocument();
  });

  it('allows user to enter edit mode, modify fields, and save changes via PUT /api/v1/profile', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);
    vi.mocked(profileApi.updateProfileApi).mockResolvedValueOnce({
      ...mockProfile,
      weight_kg: 85.0,
      full_name: 'Alex Rivera Updated',
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Alex Rivera');

    // Enter Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    // Modify Weight and Name
    const nameInput = screen.getByLabelText(/Full Name/i);
    const weightInput = screen.getByLabelText(/Current Weight/i);

    fireEvent.change(nameInput, { target: { value: 'Alex Rivera Updated' } });
    fireEvent.change(weightInput, { target: { value: '85.0' } });

    // Save Changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(profileApi.updateProfileApi).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Alex Rivera Updated',
          weight_kg: 85.0,
        }),
      );
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('discards unsaved edits when Cancel is clicked', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Alex Rivera');

    // Enter Edit Mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    // Modify Name
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Temporary Name' },
    });

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.getByDisplayValue('Alex Rivera')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Temporary Name')).not.toBeInTheDocument();
  });

  it('prevents saving invalid height or weight values with validation errors', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Alex Rivera');

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    // Set invalid weight < 30
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Weight must be at least 30 kg/i)).toBeInTheDocument();
    });

    expect(profileApi.updateProfileApi).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully during update', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);
    vi.mocked(profileApi.updateProfileApi).mockRejectedValueOnce(
      new Error('Database error occurred'),
    );

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Alex Rivera');

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Database error occurred/i);
    });
  });

  it('toggles training equipment options correctly in edit mode', async () => {
    vi.mocked(profileApi.getProfileApi).mockResolvedValueOnce(mockProfile);
    vi.mocked(profileApi.updateProfileApi).mockResolvedValueOnce(mockProfile);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Alex Rivera');

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    // Toggle Kettlebells
    const kettlebellBtn = screen.getByText(/Kettlebells/i);
    fireEvent.click(kettlebellBtn);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(profileApi.updateProfileApi).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: expect.arrayContaining(['kettlebell']),
        }),
      );
    });
  });
});
