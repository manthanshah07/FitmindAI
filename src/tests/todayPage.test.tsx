import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import * as dashboardApi from '../lib/api/dashboard';
import * as workoutApi from '../lib/api/workout';
import * as workoutDraft from '../lib/workoutDraft';
import type { DashboardSummaryResponse } from '../types/dashboard';

vi.mock('../lib/api/dashboard', () => ({
  getDashboardSummaryApi: vi.fn(),
}));

vi.mock('../lib/api/workout', () => ({
  getActiveWorkoutPlanApi: vi.fn(),
  getWorkoutLogsApi: vi.fn(),
}));

vi.mock('../lib/workoutDraft', async () => {
  const actual = await vi.importActual<typeof import('../lib/workoutDraft')>('../lib/workoutDraft');
  return {
    ...actual,
    loadDraft: vi.fn(),
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
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockSummaryBase: DashboardSummaryResponse = {
  full_name: 'Priya Sharma',
  email: 'priya@example.com',
  onboarding_complete: true,
  tdee_calories: 2100,
  bmr_calories: 1450,
  target_calories: 1900,
  target_protein_g: 120,
  goal: {
    goal_type: 'fat_loss',
    target_weight_kg: 60.0,
    target_date: '2026-12-31',
    is_active: true,
  },
  workout_plan: {
    id: 'plan-101',
    name: 'Upper / Lower Split',
    days_per_week: 4,
    exercise_count: 5,
  },
  today_nutrition: {
    consumed_calories: 1250,
    target_calories: 1900,
    remaining_calories: 650,
    consumed_protein_g: 95,
    target_protein_g: 120,
    remaining_protein_g: 25,
    consumed_carbs_g: 140,
    target_carbs_g: 200,
    remaining_carbs_g: 60,
    consumed_fat_g: 35,
    target_fat_g: 55,
    remaining_fat_g: 20,
  },
  weekly_summary: {
    adherence_score: 92.0,
    adherence_label: 'High',
    workouts_completed: 3,
    target_workouts: 4,
    workout_completion_pct: 75,
    nutrition_logged_days: 5,
    total_days: 7,
    current_fitness_score: 82,
    starting_fitness_score: 78,
    fitness_score_change: 4,
    fitness_score_trend: 'improving',
    weight_change_kg: -0.6,
    has_weekly_data: true,
  },
};

describe('Milestone M5 — Today Screen (DashboardPage / Appendix E)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-priya-1',
        email: 'priya@example.com',
        full_name: 'Priya Sharma',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      accessToken: 'test_token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
    vi.mocked(workoutDraft.loadDraft).mockReturnValue({
      draft: null,
      isCorrupt: false,
    });
    vi.mocked(workoutApi.getActiveWorkoutPlanApi).mockResolvedValue(null);
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValue([]);
  });

  it('renders top greeting with user first name and date', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Priya/i)).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument(); // Avatar pill
  });

  it('renders active workout draft with running elapsed timer and Resume Workout CTA', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    const startedIso = new Date(Date.now() - 125000).toISOString(); // ~2m 5s ago
    vi.mocked(workoutDraft.loadDraft).mockReturnValue({
      draft: {
        schemaVersion: 1,
        userId: 'u-priya-1',
        sessionId: 'session-draft-1',
        idempotencyKey: 'idemp-1',
        startedAt: startedIso,
        endedAt: null,
        status: 'in_progress',
        notes: '',
        restEndsAt: null,
        updatedAt: startedIso,
        exercises: [],
      },
      isCorrupt: false,
    });

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Resume workout/i })).toBeInTheDocument();
    expect(screen.getByText(/Workout in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Live elapsed:/i)).toBeInTheDocument();
    expect(screen.getByText(/^In progress$/i)).toBeInTheDocument();
  });

  it('renders completed today workout summary card if already finished', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayIso = `${year}-${month}-${day}T12:00:00.000Z`;
    vi.mocked(workoutApi.getWorkoutLogsApi).mockResolvedValueOnce([
      {
        id: 'log-done-1',
        user_id: 'u-priya-1',
        name: 'Push Hypertrophy',
        started_at: todayIso,
        ended_at: todayIso,
        duration_seconds: 2820,
        total_volume_kg: 8450,
        total_sets_completed: 16,
        created_at: todayIso,
        logged_exercises: [],
      },
    ]);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Push Hypertrophy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/16/i)).toBeInTheDocument();
    expect(screen.getByText(/47 min/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View workout history/i })).toBeInTheDocument();
  });

  it('renders headline remaining calories, ring meter, and macro bars', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/kcal left/i)).toBeInTheDocument();
    expect(screen.getAllByText(/650/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1,250 \/ 1,900 kcal consumed/i)).toBeInTheDocument();
    expect(screen.getByText(/95 \/ 120g/i)).toBeInTheDocument();
    expect(screen.getByText(/140 \/ 200g/i)).toBeInTheDocument();
    expect(screen.getByText(/35 \/ 55g/i)).toBeInTheDocument();
  });

  it('renders deterministic single insight line without LLM call', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/You are 650 kcal under today's target/i)).toBeInTheDocument();
  });

  it('renders This Week summary with workout dots, logged days, weight, and fitness score', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/This week/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/5 of 7 days/i)).toBeInTheDocument();
    expect(screen.getByText(/-0.6 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/82/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4/i)).toBeInTheDocument();
  });

  it('toggles AddFoodSheet when Add food button is clicked', async () => {
    vi.mocked(dashboardApi.getDashboardSummaryApi).mockResolvedValueOnce(mockSummaryBase);

    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const addFoodBtn = await screen.findByRole('button', { name: /Add food/i });
    fireEvent.click(addFoodBtn);

    expect(screen.getByText(/Add food to/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent/i)).toBeInTheDocument();
    expect(screen.getByText(/All Foods/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Add/i)).toBeInTheDocument();
  });
});
