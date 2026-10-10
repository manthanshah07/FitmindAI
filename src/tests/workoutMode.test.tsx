import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkoutDraftStore } from '../store/useWorkoutDraftStore';
import { WorkoutSessionPage } from '../pages/workout/WorkoutSessionPage';
import * as workoutApi from '../lib/api/workout';
import { saveDraft } from '../lib/workoutDraft';
import type { WorkoutDraft } from '../types/workout';

vi.mock('../lib/api/workout', () => ({
  getActiveWorkoutPlanApi: vi.fn(),
  getExercisesApi: vi.fn(),
  logWorkoutSessionWithMetaApi: vi.fn(),
  logWorkoutSessionApi: vi.fn(),
}));

const mockUser = {
  id: 'user-mode-1',
  email: 'athlete@fitmind.ai',
  full_name: 'Marcus Vance',
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
};

const createActiveDraft = (): WorkoutDraft => ({
  schemaVersion: 1,
  userId: 'user-mode-1',
  sessionId: 'session-uuid-1',
  idempotencyKey: 'idemp-uuid-mode-1',
  startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
  endedAt: null,
  status: 'in_progress',
  templateRef: { planId: 'plan-1', dayIndex: 1 },
  notes: 'Feeling strong today',
  restEndsAt: null,
  exercises: [
    {
      exerciseId: 'ex-bench',
      name: 'Barbell Bench Press',
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
      previousResult: '80kg x 8',
      sets: [
        {
          setNumber: 1,
          weightKg: '80.00',
          reps: 10,
          done: false,
          completedAt: null,
          previousResult: '80kg x 8',
        },
        {
          setNumber: 2,
          weightKg: '80.00',
          reps: 8,
          done: false,
          completedAt: null,
          previousResult: '80kg x 8',
        },
      ],
    },
    {
      exerciseId: 'ex-squat',
      name: 'Barbell Squat',
      targetSets: 3,
      targetReps: '6-8',
      restSeconds: 120,
      previousResult: '100kg x 6',
      sets: [
        {
          setNumber: 1,
          weightKg: '100.00',
          reps: 6,
          done: false,
          completedAt: null,
          previousResult: '100kg x 6',
        },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
});

describe('Milestone M3 — Workout Mode Full-Screen UI & Live Session', () => {
  let wakeLockMock: { request: ReturnType<typeof vi.fn> };
  let sentinelMock: { release: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'mock_token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    sentinelMock = { release: vi.fn().mockResolvedValue(undefined) };
    wakeLockMock = { request: vi.fn().mockResolvedValue(sentinelMock) };
    Object.assign(navigator, { wakeLock: wakeLockMock });

    vi.clearAllMocks();
  });

  afterEach(() => {
    useWorkoutDraftStore.getState().clearDraft();
  });

  it('renders dark theme container and elapsed timer computed from startedAt', async () => {
    const draft = createActiveDraft();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    const { container } = render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert data-theme="dark" is applied to root container
    expect(container.querySelector('[data-theme="dark"]')).toBeInTheDocument();

    // Elapsed timer (~15m elapsed)
    expect(await screen.findByText(/15:/i)).toBeInTheDocument();
    expect(screen.getByText(/Exercise 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
  });

  it('provides min 48px touch targets for set completion buttons and numeric input modes', async () => {
    const draft = createActiveDraft();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Complete button touch target
    const completeBtns = screen.getAllByRole('button', { name: /Mark set 1 as complete/i });
    expect(completeBtns[0]).toHaveClass('min-w-[48px]');
    expect(completeBtns[0]).toHaveClass('min-h-[48px]');

    // Weight and reps inputs
    const weightInputs = screen.getAllByPlaceholderText('0.00');
    expect(weightInputs[0]).toHaveAttribute('inputmode', 'decimal');

    const repsInputs = screen.getAllByPlaceholderText('0');
    expect(repsInputs[0]).toHaveAttribute('inputmode', 'numeric');
  });

  it('completing a set marks it done, starts timestamp rest timer, and allows rest adjustments', async () => {
    const draft = createActiveDraft();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const completeBtn = screen.getByRole('button', { name: /Mark set 1 as complete/i });
    fireEvent.click(completeBtn);

    // Rest timer bar appears with Skip, -15s, +15s controls
    expect(await screen.findByText(/Rest Timer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+15s/i })).toBeInTheDocument();

    // Skip clears rest timer
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Rest Timer/i)).not.toBeInTheDocument();
    });
  });

  it('requests screen wake lock on mount and releases on session exit', async () => {
    const draft = createActiveDraft();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(wakeLockMock.request).toHaveBeenCalledWith('screen');
    await screen.findByText(/Barbell Bench Press/i);

    unmount();
    expect(sentinelMock.release).toHaveBeenCalled();
  });

  it('prompts exit confirmation modal on close button click', async () => {
    const draft = createActiveDraft();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const exitBtn = screen.getByRole('button', { name: /Exit Workout/i });
    fireEvent.click(exitBtn);

    expect(await screen.findByText(/Exit Workout\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Your progress is saved as a draft on this device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep Working Out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exit to Dashboard/i })).toBeInTheDocument();
  });

  it('submits completed sets with Idempotency-Key header, clears draft on 201/200, and navigates', async () => {
    const draft = createActiveDraft();
    // Complete 1 set
    draft.exercises[0].sets[0].done = true;
    draft.exercises[0].sets[0].completedAt = new Date().toISOString();
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    vi.mocked(workoutApi.logWorkoutSessionWithMetaApi).mockResolvedValueOnce({
      log: {
        id: 'log-saved-1',
        user_id: 'user-mode-1',
        started_at: draft.startedAt,
        ended_at: new Date().toISOString(),
        notes: draft.notes,
        created_at: new Date().toISOString(),
        logged_exercises: [],
      },
      isReplay: false,
    });

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
          <Route path="/workouts" element={<div>Workout History Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Finish button
    const finishBtn = screen.getByRole('button', { name: /Finish/i });
    fireEvent.click(finishBtn);

    // Summary sheet appears
    expect(await screen.findByText(/Session Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Volume/i)).toBeInTheDocument();

    // Confirm Save Workout
    const saveBtn = screen.getByRole('button', { name: /Save Workout/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(workoutApi.logWorkoutSessionWithMetaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          started_at: draft.startedAt,
          notes: draft.notes,
        }),
        expect.objectContaining({
          idempotencyKey: draft.idempotencyKey,
        }),
      );
    });

    // Successfully navigates and clears draft
    expect(await screen.findByText(/Workout History Page/i)).toBeInTheDocument();
    expect(localStorage.getItem(`fitmind:workout-draft:user-mode-1`)).toBeNull();
  });

  it('network failure retains draft and displays offline retry banner', async () => {
    const draft = createActiveDraft();
    draft.exercises[0].sets[0].done = true;
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    // Simulate network error
    vi.mocked(workoutApi.logWorkoutSessionWithMetaApi).mockRejectedValueOnce(
      new Error('Network Error'),
    );

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Save Workout/i }));

    expect(
      await screen.findByText(/workout saved on this device. Retrying automatically/i),
    ).toBeInTheDocument();

    // Draft remains safe in localStorage
    expect(localStorage.getItem(`fitmind:workout-draft:user-mode-1`)).not.toBeNull();
  });

  it('displays conflict message on 409 conflict and keeps draft intact', async () => {
    const draft = createActiveDraft();
    draft.exercises[0].sets[0].done = true;
    saveDraft(draft);
    useWorkoutDraftStore.getState().loadUserDraft('user-mode-1');

    vi.mocked(workoutApi.logWorkoutSessionWithMetaApi).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: { code: 'idempotency_key_reused' } },
      },
    });

    render(
      <MemoryRouter initialEntries={['/workouts/session']}>
        <Routes>
          <Route path="/workouts/session" element={<WorkoutSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Save Workout/i }));

    expect(
      await screen.findByText(/Workout with this key was already submitted with different details/i),
    ).toBeInTheDocument();
    expect(localStorage.getItem(`fitmind:workout-draft:user-mode-1`)).not.toBeNull();
  });
});
