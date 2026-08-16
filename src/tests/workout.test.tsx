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
      sets: 2,
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
  started_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
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
      weight_kg: 80, // Volume: 10 * 80 = 800 kg
      rpe: 8,
      exercise: mockExercise,
    },
    {
      id: 'le-2',
      log_id: 'log-1',
      exercise_id: 'ex-1',
      set_number: 2,
      reps_completed: 8,
      weight_kg: 85, // Volume: 8 * 85 = 680 kg -> Total Volume = 1480 kg
      rpe: 9,
      exercise: mockExercise,
    },
  ],
};

describe('Phase 3 — Workout Frontend Module & Security Tests', () => {
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

  it('renders Workout Overview Page with active plan and exercise catalog', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([mockLog]);
    vi.mocked(workoutApi.getExercisesApi).mockResolvedValue([mockExercise]);

    render(
      <MemoryRouter initialEntries={['/workout']}>
        <AppShell>
          <WorkoutOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Hypertrophy Routine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Barbell Bench Press/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Database Catalog Explorer/i)).toBeInTheDocument();
  });

  it('allows starting a live session, logging sets, and renders Session Completion Summary', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValue(mockPlan);
    vi.mocked(workoutApi.logWorkoutSessionApi).mockResolvedValueOnce(mockLog);

    render(
      <MemoryRouter initialEntries={['/workout/session']}>
        <Routes>
          <Route path="/workout/session" element={<WorkoutSessionPage />} />
          <Route path="/workout" element={<div>Workout Overview Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Active Workout Session/i)).toBeInTheDocument();

    // Click Finish Workout
    fireEvent.click(screen.getByRole('button', { name: /Finish Workout ✓/i }));

    // Assert Session Completion Summary Screen appears with exact calculated values
    expect(await screen.findByText(/Session Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/1,480/i)).toBeInTheDocument(); // Total Volume: 1480 kg
    expect(screen.getByText(/Return to Workouts →/i)).toBeInTheDocument();

    // Click Return to Workouts
    fireEvent.click(screen.getByText(/Return to Workouts →/i));
    expect(await screen.findByText(/Workout Overview Target/i)).toBeInTheDocument();
  });

  it('filters Exercise Catalog Explorer by name search and muscle group', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([]);
    vi.mocked(workoutApi.getExercisesApi).mockResolvedValue([mockExercise]);

    render(
      <MemoryRouter initialEntries={['/workout']}>
        <AppShell>
          <WorkoutOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Database Catalog Explorer/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search exercises by name.../i);
    fireEvent.change(searchInput, { target: { value: 'Bench Press' } });

    await waitFor(() => {
      expect(workoutApi.getExercisesApi).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Bench Press',
        }),
      );
    });
  });

  it('filters Exercise Catalog Explorer by difficulty and category dropdowns', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([]);
    vi.mocked(workoutApi.getExercisesApi).mockResolvedValue([mockExercise]);

    render(
      <MemoryRouter initialEntries={['/workout']}>
        <AppShell>
          <WorkoutOverviewPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Database Catalog Explorer/i)).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    // Select 0 is Muscle, Select 1 is Difficulty, Select 2 is Category
    const difficultySelect = selects[1];
    const categorySelect = selects[2];

    fireEvent.change(difficultySelect, { target: { value: 'intermediate' } });
    fireEvent.change(categorySelect, { target: { value: 'strength' } });

    await waitFor(() => {
      expect(workoutApi.getExercisesApi).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'intermediate',
          category: 'strength',
        }),
      );
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
  });
});
