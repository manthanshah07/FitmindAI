import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { WorkoutOverviewPage } from '../pages/workout/WorkoutOverviewPage';
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
  logWorkoutSessionWithMetaApi: vi.fn(),
  getLastPerformanceApi: vi.fn().mockResolvedValue({ performances: {} }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

const mockExercise1 = {
  id: 'ex-bench',
  name: 'Barbell Bench Press',
  primary_muscle: 'Chest',
  secondary_muscles: ['Triceps', 'Shoulders'],
  equipment_required: ['barbell', 'bench'],
  difficulty: 'intermediate',
  category: 'strength',
  description: 'Classic horizontal push movement.',
  instructions: 'Lie back, lower the bar smoothly, and press upward.',
  created_at: new Date().toISOString(),
};

const mockExercise2 = {
  id: 'ex-squat',
  name: 'Barbell Squat',
  primary_muscle: 'Quadriceps',
  secondary_muscles: ['Glutes'],
  equipment_required: ['barbell'],
  difficulty: 'intermediate',
  category: 'strength',
  description: 'King of leg compound movements.',
  instructions: 'Squat below parallel and drive through mid-foot.',
  created_at: new Date().toISOString(),
};

const mockPlan = {
  id: 'plan-4day',
  user_id: 'user-hub',
  name: '4-Day Calibrated Split',
  days_per_week: 4,
  is_active: true,
  ai_generated: false,
  created_at: new Date().toISOString(),
  plan_exercises: [
    {
      id: 'pe-1',
      plan_id: 'plan-4day',
      exercise_id: 'ex-bench',
      day_of_week: 1,
      day_label: 'Upper Body A',
      sets: 4,
      reps: '6-8',
      rest_seconds: 120,
      order_index: 1,
      exercise: mockExercise1,
    },
    {
      id: 'pe-2',
      plan_id: 'plan-4day',
      exercise_id: 'ex-squat',
      day_of_week: 2,
      day_label: 'Lower Body A',
      sets: 4,
      reps: '6-8',
      rest_seconds: 120,
      order_index: 1,
      exercise: mockExercise2,
    },
  ],
};

const mockLogs = [
  {
    id: 'log-101',
    user_id: 'user-hub',
    plan_id: 'plan-4day',
    name: 'Upper Body A Session',
    started_at: '2026-10-10T10:00:00Z',
    ended_at: '2026-10-10T10:45:00Z',
    duration_seconds: 2700,
    total_volume_kg: 2400.0,
    total_sets_completed: 6,
    notes: 'Hit high intensity on all compound sets',
    created_at: '2026-10-10T10:45:00Z',
    logged_exercises: [
      {
        id: 'le-101',
        log_id: 'log-101',
        exercise_id: 'ex-bench',
        set_number: 1,
        reps_completed: 8,
        weight_kg: 100.0,
        rpe: 9,
        is_personal_record: true,
        exercise: mockExercise1,
      },
    ],
  },
];

describe('Milestone M4 — Workouts Hub Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    useAuthStore.setState({
      user: {
        id: 'user-hub',
        email: 'hubuser@example.com',
        full_name: 'Hub Athlete',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      accessToken: 'token-hub',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders 3 tabs: Plan, History, and Exercises', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: /Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /History/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Exercises/i })).toBeInTheDocument();
  });

  it('renders week strip with day cards and Day 1 exercises in Plan tab', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('4-Day Calibrated Split')).toBeInTheDocument();
    expect(screen.getAllByText('Upper Body A').length).toBeGreaterThan(0);
    expect(screen.getByText('Lower Body A')).toBeInTheDocument();

    // Day 1 has Barbell Bench Press
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Day 1/i })).toBeInTheDocument();
  });

  it('navigates to Workout Mode with day template when Start Day button is clicked', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getLastPerformanceApi).mockResolvedValueOnce({
      performances: {
        'ex-bench': {
          exercise_id: 'ex-bench',
          last_performed_at: '2026-10-10T10:00:00Z',
          sets: [{ set_number: 1, weight_kg: 95.0, reps_completed: 8 }],
          best_weight_kg: 95.0,
          best_reps: 8,
        },
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    const startBtn = await screen.findByRole('button', { name: /Start Day 1/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/workouts/session',
        expect.objectContaining({
          state: expect.objectContaining({
            template: expect.objectContaining({
              name: '4-Day Calibrated Split — Upper Body A',
              exercises: expect.arrayContaining([
                expect.objectContaining({
                  exerciseId: 'ex-bench',
                  previousResult: '95kg × 8',
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  it('opens Regenerate Plan modal and submits new frequency', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.generateWorkoutPlanApi).mockResolvedValueOnce({
      ...mockPlan,
      days_per_week: 5,
    });

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    const regenBtn = await screen.findByRole('button', { name: /Regenerate plan/i });
    fireEvent.click(regenBtn);

    // Modal dialog appears
    expect(await screen.findByRole('heading', { level: 2, name: /Regenerate Training Routine/i })).toBeInTheDocument();

    // Select 5 Days
    const select = screen.getByLabelText(/Weekly Training Frequency/i);
    fireEvent.change(select, { target: { value: '5' } });

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Regenerate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workoutApi.generateWorkoutPlanApi).toHaveBeenCalledWith({
        days_per_week: 5,
      });
    });
  });

  it('renders History tab with volume metrics, PR chips, and expandable sets', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce(mockLogs);

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    // Switch to History
    const historyTab = await screen.findByRole('tab', { name: /History/i });
    fireEvent.mouseDown(historyTab, { button: 0 });

    expect(await screen.findByText('Upper Body A Session')).toBeInTheDocument();
    expect(screen.getByText(/Volume: 2400 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/1 PR/i)).toBeInTheDocument();

    // Expand sets
    fireEvent.click(screen.getByText('Upper Body A Session'));
    expect(await screen.findByText('★ PR')).toBeInTheDocument();
  });

  it('renders Exercises tab and opens detail bottom sheet when clicked', async () => {
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValueOnce(mockPlan);
    vi.mocked(workoutApi.getExercisesApi).mockResolvedValueOnce([mockExercise1]);

    renderWithQuery(
      <MemoryRouter>
        <WorkoutOverviewPage />
      </MemoryRouter>,
    );

    // Switch to Exercises
    const exercisesTab = await screen.findByRole('tab', { name: /Exercises/i });
    fireEvent.mouseDown(exercisesTab, { button: 0 });

    const exCardTitle = await screen.findByText('Barbell Bench Press');
    expect(exCardTitle).toBeInTheDocument();

    // Click card to open BottomSheet
    fireEvent.click(exCardTitle);

    expect(await screen.findByRole('heading', { level: 2, name: 'Barbell Bench Press' })).toBeInTheDocument();
    expect(screen.getByText('Step-by-Step Execution')).toBeInTheDocument();
    expect(screen.getByText('Lie back, lower the bar smoothly, and press upward.')).toBeInTheDocument();
  });
});
