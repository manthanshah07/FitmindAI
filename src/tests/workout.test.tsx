import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { WorkoutOverviewPage } from '../pages/workout/WorkoutOverviewPage';
import { WorkoutSessionPage } from '../pages/workout/WorkoutSessionPage';
import { WorkoutHistoryPage } from '../pages/workout/WorkoutHistoryPage';
import { ExerciseDetailPage } from '../pages/workout/ExerciseDetailPage';
import { AppShell } from '../components/layout/AppShell';
import * as workoutApi from '../lib/api/workout';

vi.mock('../lib/api/workout', () => ({
  getActiveWorkoutPlanApi: vi.fn(),
  generateWorkoutPlanApi: vi.fn(),
  getWorkoutLogsApi: vi.fn(),
  getWorkoutLogByIdApi: vi.fn(),
  getExerciseByIdApi: vi.fn(),
  getExercisesApi: vi.fn(),
  seedExercisesApi: vi.fn(),
  logWorkoutSessionApi: vi.fn(),
}));

const mockExercise = {
  id: 'ex-1',
  name: 'Barbell Bench Press',
  primary_muscle: 'Chest',
  secondary_muscles: ['Triceps', 'Shoulders'],
  equipment_required: ['barbell'],
  difficulty: 'intermediate',
  category: 'strength',
  description: 'Compound push exercise targeting upper body.',
  instructions: 'Lie on bench, lower bar to chest, press upward.',
  created_at: new Date().toISOString(),
};

const mockPlan = {
  id: 'plan-1',
  user_id: 'u-123',
  name: 'Hypertrophy Routine',
  days_per_week: 4,
  is_active: true,
  ai_generated: true,
  created_at: new Date().toISOString(),
  plan_exercises: [
    {
      id: 'pe-1',
      plan_id: 'plan-1',
      exercise_id: 'ex-1',
      sets: 3,
      reps: '10',
      rest_seconds: 90,
      exercise: mockExercise,
    },
  ],
};

const mockLog = {
  id: 'log-1',
  user_id: 'u-123',
  plan_id: 'plan-1',
  started_at: new Date().toISOString(),
  ended_at: new Date().toISOString(),
  notes: 'Felt strong today!',
  created_at: new Date().toISOString(),
  logged_exercises: [
    {
      id: 'le-1',
      log_id: 'log-1',
      exercise_id: 'ex-1',
      set_number: 1,
      reps_completed: 10,
      weight_kg: 80,
      rpe: 8,
      exercise: mockExercise,
    },
  ],
};

describe('Phase 3B — Workout Frontend Module', () => {
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

  it('renders Workout Overview Page with active plan and exercise specs', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([mockLog]);

    render(
      <MemoryRouter initialEntries={['/workout']}>
        <AppShell>
          <WorkoutOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Hypertrophy Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Bench Press/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Workout Session →/i })).toBeInTheDocument();
  });

  it('handles empty plan state and allows generating a personalized plan', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(null);
    vi.mocked(workoutApi.seedExercisesApi).mockResolvedValueOnce([mockExercise]);
    vi.mocked(workoutApi.generateWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/workout']}>
        <AppShell>
          <WorkoutOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Hypertrophy Routine/i)).toBeInTheDocument();
    expect(workoutApi.generateWorkoutPlanApi).toHaveBeenCalled();
  });

  it('allows starting and completing a live workout session', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValue(mockPlan);
    vi.mocked(workoutApi.logWorkoutSessionApi).mockResolvedValueOnce(mockLog);

    render(
      <MemoryRouter initialEntries={['/workout/session']}>
        <Routes>
          <Route path="/workout/session" element={<WorkoutSessionPage />} />
          <Route path="/workout" element={<div>Workout Target Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Active Workout Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbell Bench Press/i)).toBeInTheDocument();

    // Click Finish Workout
    fireEvent.click(screen.getByRole('button', { name: /Finish Workout ✓/i }));

    await waitFor(() => {
      expect(workoutApi.logWorkoutSessionApi).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.any(String),
          logged_exercises: expect.arrayContaining([
            expect.objectContaining({
              exercise_id: 'ex-1',
              set_number: 1,
            }),
          ]),
        }),
      );
      expect(screen.getByText(/Workout Target Page/i)).toBeInTheDocument();
    });
  });

  it('displays workout log history and allows inspecting session details', async () => {
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([mockLog]);
    vi.mocked(workoutApi.getWorkoutLogByIdApi).mockResolvedValueOnce(mockLog);

    render(
      <MemoryRouter initialEntries={['/workout/history']}>
        <AppShell>
          <WorkoutHistoryPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Completed Workout Sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Felt strong today!/i)).toBeInTheDocument();

    // Select session log
    fireEvent.click(screen.getByText(/Felt strong today!/i));

    await waitFor(() => {
      expect(workoutApi.getWorkoutLogByIdApi).toHaveBeenCalledWith('log-1');
      expect(screen.getByText(/Logged Sets & Load Performance/i)).toBeInTheDocument();
    });
  });

  it('displays empty history state when no workout sessions exist', async () => {
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/workout/history']}>
        <AppShell>
          <WorkoutHistoryPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No Workout Logs Recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start First Workout →/i })).toBeInTheDocument();
  });

  it('displays Exercise Specification detail page for a valid exercise ID', async () => {
    vi.mocked(workoutApi.getExerciseByIdApi).mockResolvedValueOnce(mockExercise);

    render(
      <MemoryRouter initialEntries={['/workout/exercise/ex-1']}>
        <Routes>
          <Route path="/workout/exercise/:id" element={<ExerciseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Barbell Bench Press/i)).toBeInTheDocument();
    expect(screen.getByText(/Compound push exercise targeting upper body/i)).toBeInTheDocument();
    expect(screen.getByText(/Lie on bench, lower bar to chest, press upward/i)).toBeInTheDocument();
  });
});
