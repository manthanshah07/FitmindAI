import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ProgressOverviewPage } from '../pages/progress/ProgressOverviewPage';
import { AppShell } from '../components/layout/AppShell';
import * as progressApi from '../lib/api/progress';

vi.mock('../lib/api/progress', () => ({
  getProgressSummaryApi: vi.fn(),
  getMeasurementsApi: vi.fn(),
  createMeasurementApi: vi.fn(),
  getMeasurementByIdApi: vi.fn(),
}));

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

describe('Phase 5 — Progress & Measurement Tracking Frontend Module', () => {
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

  it('renders Progress Overview Page with summary statistics and historical trend', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce(mockSummary);

    render(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Progress & Fitness Score/i)).toBeInTheDocument();
    expect(screen.getAllByText(/78.5 kg/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Body Weight History Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest: 40.2 in/i)).toBeInTheDocument();
  });

  it('allows opening measurement modal and submitting a new weight entry', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValue(mockSummary);
    vi.mocked(progressApi.createMeasurementApi).mockResolvedValueOnce(mockMeasurement);

    render(
      <MemoryRouter initialEntries={['/progress']}>
        <AppShell>
          <ProgressOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Progress & Fitness Score/i)).toBeInTheDocument();

    // Click Record Measurement button
    const recordBtn = screen.getAllByRole('button', { name: /\+ Record Measurement/i })[0];
    fireEvent.click(recordBtn);

    expect(screen.getByText(/Record Measurements/i)).toBeInTheDocument();

    const weightInput = screen.getByLabelText(/Body Weight \(kg\)/i);
    fireEvent.change(weightInput, { target: { value: '77.0' } });

    const submitBtn = screen.getByRole('button', { name: /Save Entry ✓/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(progressApi.createMeasurementApi).toHaveBeenCalledWith(
        expect.objectContaining({
          weight_kg: 77.0,
        }),
      );
    });
  });

  it('displays empty state when no measurements exist', async () => {
    vi.mocked(progressApi.getProgressSummaryApi).mockResolvedValueOnce({
      latest_weight_kg: null,
      weight_change_kg: null,
      trend_direction: 'no_data',
      total_entries: 0,
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

    expect(await screen.findByText(/No Progress Data Recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record First Measurement →/i })).toBeInTheDocument();
  });
});
