import { create } from 'zustand';
import type {
  WorkoutDraft,
  WorkoutSetDraft,
  WorkoutExerciseDraft,
  SessionTemplate,
  WorkoutLogCreate,
  WorkoutLogExerciseCreate,
} from '../types/workout';
import {
  loadDraft,
  saveDraft,
  discardDraft as removeDraftFromStorage,
  isDraftStale,
} from '../lib/workoutDraft';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface WorkoutDraftState {
  draft: WorkoutDraft | null;
  currentExerciseIndex: number;
  isLoading: boolean;
  isQuotaExceeded: boolean;
  corruptRecovery: {
    isCorrupt: boolean;
    corruptRaw?: string;
    quarantineKey?: string;
  } | null;
  isStaleDraft: boolean;

  // Actions
  loadUserDraft: (userId: string) => WorkoutDraft | null;
  initDraft: (userId: string, template?: SessionTemplate) => WorkoutDraft;
  resumeDraft: (draft: WorkoutDraft) => void;
  setCurrentExerciseIndex: (index: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, fields: Partial<WorkoutSetDraft>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  addExercise: (exercise: {
    id: string;
    name: string;
    targetSets?: number;
    targetReps?: string;
    restSeconds?: number;
    previousResult?: string;
  }) => void;
  removeExercise: (exerciseIndex: number) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  skipRestTimer: () => void;
  updateNotes: (notes: string) => void;
  freezeForSubmission: () => { payload: WorkoutLogCreate; idempotencyKey: string } | null;
  clearDraft: () => void;
  discardActiveDraft: () => void;
  discardCorruptedDraft: () => void;
  acknowledgeStaleDraft: (action: 'save' | 'discard') => void;
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(draft: WorkoutDraft, setQuota: (quota: boolean) => void) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    const res = saveDraft(draft);
    setQuota(res.isQuotaExceeded);
  }, 300);
}

function flushImmediateSave(draft: WorkoutDraft): boolean {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  const res = saveDraft(draft);
  return res.success;
}

export const useWorkoutDraftStore = create<WorkoutDraftState>((set, get) => ({
  draft: null,
  currentExerciseIndex: 0,
  isLoading: false,
  isQuotaExceeded: false,
  corruptRecovery: null,
  isStaleDraft: false,

  loadUserDraft: (userId: string) => {
    if (!userId) {
      set({ draft: null, corruptRecovery: null, isStaleDraft: false });
      return null;
    }
    const result = loadDraft(userId);
    if (result.isCorrupt) {
      set({
        draft: null,
        corruptRecovery: {
          isCorrupt: true,
          corruptRaw: result.corruptRaw,
          quarantineKey: result.quarantineKey,
        },
        isStaleDraft: false,
      });
      return null;
    }

    if (result.draft) {
      const isStale = isDraftStale(result.draft);
      set({
        draft: result.draft,
        corruptRecovery: null,
        isStaleDraft: isStale,
        currentExerciseIndex: 0,
      });
      return result.draft;
    }

    set({ draft: null, corruptRecovery: null, isStaleDraft: false });
    return null;
  },

  initDraft: (userId: string, template?: SessionTemplate) => {
    const sessionId = generateUuid();
    const idempotencyKey = generateUuid();
    const startedAt = new Date().toISOString();

    const exercises: WorkoutExerciseDraft[] = (template?.exercises || []).map((ex) => {
      const setsCount = ex.targetSets || 3;
      const sets: WorkoutSetDraft[] = [];
      const defaultWeight = '0.00';
      const defaultReps = ex.targetReps ? parseInt(ex.targetReps.split('-')[0], 10) || 10 : 10;

      for (let s = 1; s <= setsCount; s++) {
        sets.push({
          setNumber: s,
          weightKg: defaultWeight,
          reps: defaultReps,
          rpe: null,
          done: false,
          completedAt: null,
          previousResult: ex.previousResult || null,
        });
      }

      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSeconds: ex.restSeconds || 90,
        previousResult: ex.previousResult || null,
        sets,
      };
    });

    const newDraft: WorkoutDraft = {
      schemaVersion: 1,
      userId,
      sessionId,
      idempotencyKey,
      startedAt,
      endedAt: null,
      status: 'in_progress',
      templateRef: template ? { planId: template.planId, dayIndex: template.dayIndex } : null,
      notes: null,
      restEndsAt: null,
      exercises,
      updatedAt: startedAt,
    };

    flushImmediateSave(newDraft);

    set({
      draft: newDraft,
      currentExerciseIndex: 0,
      isQuotaExceeded: false,
      corruptRecovery: null,
      isStaleDraft: false,
    });

    return newDraft;
  },

  resumeDraft: (draft: WorkoutDraft) => {
    set({
      draft,
      currentExerciseIndex: 0,
      isStaleDraft: isDraftStale(draft),
    });
  },

  setCurrentExerciseIndex: (index: number) => {
    const { draft } = get();
    if (!draft) return;
    const maxIndex = Math.max(0, draft.exercises.length - 1);
    const clamped = Math.min(Math.max(0, index), maxIndex);
    set({ currentExerciseIndex: clamped });
  },

  updateSet: (exerciseIndex: number, setIndex: number, fields: Partial<WorkoutSetDraft>) => {
    const { draft } = get();
    if (!draft || !draft.exercises[exerciseIndex]?.sets[setIndex]) return;

    const exercises = [...draft.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], ...fields };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;

    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  addSet: (exerciseIndex: number) => {
    const { draft } = get();
    if (!draft || !draft.exercises[exerciseIndex]) return;

    const exercises = [...draft.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    const lastSet = sets[sets.length - 1];

    const nextSetNumber = sets.length + 1;
    sets.push({
      setNumber: nextSetNumber,
      weightKg: lastSet?.weightKg || '0.00',
      reps: lastSet?.reps || 10,
      rpe: null,
      done: false,
      completedAt: null,
      previousResult: exercise.previousResult || null,
    });

    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;

    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  removeSet: (exerciseIndex: number, setIndex: number) => {
    const { draft } = get();
    if (!draft || !draft.exercises[exerciseIndex]) return;

    const exercises = [...draft.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = exercise.sets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({
      ...s,
      setNumber: idx + 1,
    }));

    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;

    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  addExercise: (exercise) => {
    const { draft } = get();
    if (!draft) return;

    const setsCount = exercise.targetSets || 3;
    const sets: WorkoutSetDraft[] = [];
    for (let s = 1; s <= setsCount; s++) {
      sets.push({
        setNumber: s,
        weightKg: '0.00',
        reps: 10,
        rpe: null,
        done: false,
        completedAt: null,
        previousResult: exercise.previousResult || null,
      });
    }

    const newExercise: WorkoutExerciseDraft = {
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: exercise.targetSets || 3,
      targetReps: exercise.targetReps || '8-12',
      restSeconds: exercise.restSeconds || 90,
      previousResult: exercise.previousResult || null,
      sets,
    };

    const exercises = [...draft.exercises, newExercise];
    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft, currentExerciseIndex: exercises.length - 1 });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  removeExercise: (exerciseIndex: number) => {
    const { draft, currentExerciseIndex } = get();
    if (!draft) return;

    const exercises = draft.exercises.filter((_, idx) => idx !== exerciseIndex);
    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    const nextIndex = Math.min(currentExerciseIndex, Math.max(0, exercises.length - 1));

    set({ draft: updatedDraft, currentExerciseIndex: nextIndex });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  completeSet: (exerciseIndex: number, setIndex: number) => {
    const { draft } = get();
    if (!draft || !draft.exercises[exerciseIndex]?.sets[setIndex]) return;

    const exercise = draft.exercises[exerciseIndex];
    const setItem = exercise.sets[setIndex];
    const newDone = !setItem.done;

    const exercises = [...draft.exercises];
    const exCopy = { ...exercise };
    const sets = [...exCopy.sets];

    sets[setIndex] = {
      ...setItem,
      done: newDone,
      completedAt: newDone ? new Date().toISOString() : null,
    };
    exCopy.sets = sets;
    exercises[exerciseIndex] = exCopy;

    // Start rest timer if set marked done
    let restEndsAt = draft.restEndsAt;
    if (newDone) {
      const restSec = exercise.restSeconds || 90;
      restEndsAt = Date.now() + restSec * 1000;
    }

    const updatedDraft: WorkoutDraft = {
      ...draft,
      exercises,
      restEndsAt,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  adjustRestTimer: (deltaSeconds: number) => {
    const { draft } = get();
    if (!draft || !draft.restEndsAt) return;

    const newEndsAt = Math.max(Date.now(), draft.restEndsAt + deltaSeconds * 1000);
    const updatedDraft: WorkoutDraft = {
      ...draft,
      restEndsAt: newEndsAt,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  skipRestTimer: () => {
    const { draft } = get();
    if (!draft) return;

    const updatedDraft: WorkoutDraft = {
      ...draft,
      restEndsAt: null,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  updateNotes: (notes: string) => {
    const { draft } = get();
    if (!draft) return;

    // Preserve verbatim (no trim, no casing change)
    const updatedDraft: WorkoutDraft = {
      ...draft,
      notes,
      updatedAt: new Date().toISOString(),
    };

    set({ draft: updatedDraft });
    scheduleSave(updatedDraft, (quota) => set({ isQuotaExceeded: quota }));
  },

  freezeForSubmission: () => {
    const { draft } = get();
    if (!draft) return null;

    // Require at least one completed set
    const completedExercises: WorkoutLogExerciseCreate[] = [];
    draft.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          completedExercises.push({
            exercise_id: ex.exerciseId,
            set_number: s.setNumber,
            reps_completed: typeof s.reps === 'string' ? parseInt(s.reps, 10) || 0 : s.reps,
            weight_kg: parseFloat(s.weightKg) || 0,
            rpe: s.rpe ?? undefined,
          });
        }
      });
    });

    if (completedExercises.length === 0) {
      return null;
    }

    // Freeze endedAt once
    const frozenEndedAt = draft.endedAt || new Date().toISOString();
    const updatedDraft: WorkoutDraft = {
      ...draft,
      endedAt: frozenEndedAt,
      status: 'ready_to_submit',
      updatedAt: new Date().toISOString(),
    };

    flushImmediateSave(updatedDraft);
    set({ draft: updatedDraft });

    const payload: WorkoutLogCreate = {
      plan_id: typeof draft.templateRef?.planId === 'string' ? draft.templateRef.planId : undefined,
      started_at: draft.startedAt,
      ended_at: frozenEndedAt,
      notes: draft.notes ?? undefined,
      logged_exercises: completedExercises,
    };

    return {
      payload,
      idempotencyKey: draft.idempotencyKey,
    };
  },

  clearDraft: () => {
    const { draft } = get();
    if (draft?.userId) {
      removeDraftFromStorage(draft.userId);
    }
    set({ draft: null, currentExerciseIndex: 0, isQuotaExceeded: false, isStaleDraft: false });
  },

  discardActiveDraft: () => {
    get().clearDraft();
  },

  discardCorruptedDraft: () => {
    const { corruptRecovery } = get();
    if (corruptRecovery) {
      // Find current user id or clear
      set({ corruptRecovery: null, draft: null });
    }
  },

  acknowledgeStaleDraft: (action: 'save' | 'discard') => {
    if (action === 'discard') {
      get().clearDraft();
    } else {
      set({ isStaleDraft: false });
    }
  },
}));
