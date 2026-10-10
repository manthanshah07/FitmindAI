import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkoutDraftStore } from '../../store/useWorkoutDraftStore';
import {
  getActiveWorkoutPlanApi,
  getExercisesApi,
  getLastPerformanceApi,
  logWorkoutSessionWithMetaApi,
} from '../../lib/api/workout';
import { copyDraftToClipboard, downloadDraftJson } from '../../lib/workoutDraft';
import { formatDuration } from '../../lib/format';
import { getErrorMessage } from '../../utils/apiError';
import type { Exercise, SessionTemplate } from '../../types/workout';

import {
  X,
  Check,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  List,
  Music,
  RotateCcw,
  Copy,
  Download,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';

function playRestBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext blocked or unsupported
  }
}

function triggerVibration() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Vibration ignored
  }
}

export const WorkoutSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    draft,
    currentExerciseIndex,
    isQuotaExceeded,
    corruptRecovery,
    isStaleDraft,
    loadUserDraft,
    initDraft,
    setCurrentExerciseIndex,
    updateSet,
    addSet,
    removeSet,
    addExercise,
    removeExercise,
    completeSet,
    adjustRestTimer,
    skipRestTimer,
    updateNotes,
    freezeForSubmission,
    clearDraft,
    discardCorruptedDraft,
    acknowledgeStaleDraft,
  } = useWorkoutDraftStore();

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [restAnnounced, setRestAnnounced] = useState<boolean>(false);
  const [ariaRestAnnouncement, setAriaRestAnnouncement] = useState<string>('');

  // Modals & Sheets
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [showSummarySheet, setShowSummarySheet] = useState<boolean>(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = useState<boolean>(false);
  const [showAddExerciseSheet, setShowAddExerciseSheet] = useState<boolean>(false);
  const [catalogExercises, setCatalogExercises] = useState<Exercise[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Submission & Retry State
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'saving' | 'saved' | 'network_error' | 'conflict' | 'validation_error'
  >('idle');
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake lock ref
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request Wake Lock
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Initialize or load draft
  useEffect(() => {
    const activeUserId = user?.id || 'dev-preview-user';
    const currentStoreDraft = useWorkoutDraftStore.getState().draft;
    if (currentStoreDraft && currentStoreDraft.userId === activeUserId) {
      return;
    }

    const existing = loadUserDraft(activeUserId);
    if (!existing) {
      const cr = useWorkoutDraftStore.getState().corruptRecovery;
      if (!cr) {
        const passedTemplate = (location.state as { template?: SessionTemplate })?.template;
        if (passedTemplate) {
          initDraft(activeUserId, passedTemplate);
          return;
        }

        getActiveWorkoutPlanApi()
          .then(async (plan) => {
            if (plan && plan.plan_exercises.length > 0) {
              const exerciseIds = plan.plan_exercises.map((pe) => pe.exercise_id);
              let lastPerfMap: Record<string, string> = {};
              try {
                const perfRes = await getLastPerformanceApi(exerciseIds);
                for (const [exId, item] of Object.entries(perfRes.performances)) {
                  if (item.best_weight_kg) {
                    lastPerfMap[exId] = `${item.best_weight_kg}kg × ${item.best_reps || 8}`;
                  } else if (item.sets.length > 0) {
                    const first = item.sets[0];
                    lastPerfMap[exId] = `${first.weight_kg ?? 0}kg × ${first.reps_completed ?? 0}`;
                  }
                }
              } catch {
                // Ignore failure to fetch last performance
              }

              const template: SessionTemplate = {
                planId: plan.id,
                name: plan.name,
                exercises: plan.plan_exercises.map((pe) => ({
                  exerciseId: pe.exercise_id,
                  name: pe.exercise?.name || 'Exercise',
                  targetSets: pe.sets || 3,
                  targetReps: pe.reps || '8-12',
                  restSeconds: pe.rest_seconds || 90,
                  previousResult: lastPerfMap[pe.exercise_id] || null,
                })),
              };
              initDraft(activeUserId, template);
            } else if (activeUserId === 'dev-preview-user') {
              initDraft(activeUserId, {
                planId: 'demo-plan-1',
                name: 'Upper Body Hypertrophy',
                exercises: [
                  {
                    exerciseId: 'demo-ex-1',
                    name: 'Barbell Bench Press',
                    targetSets: 3,
                    targetReps: '8-10',
                    restSeconds: 90,
                  },
                  {
                    exerciseId: 'demo-ex-2',
                    name: 'Barbell Bent Over Row',
                    targetSets: 3,
                    targetReps: '10-12',
                    restSeconds: 75,
                  },
                ],
              });
            } else {
              initDraft(activeUserId);
            }
          })
          .catch(() => {
            if (activeUserId === 'dev-preview-user') {
              initDraft(activeUserId, {
                planId: 'demo-plan-1',
                name: 'Upper Body Hypertrophy',
                exercises: [
                  {
                    exerciseId: 'demo-ex-1',
                    name: 'Barbell Bench Press',
                    targetSets: 3,
                    targetReps: '8-10',
                    restSeconds: 90,
                  },
                  {
                    exerciseId: 'demo-ex-2',
                    name: 'Barbell Bent Over Row',
                    targetSets: 3,
                    targetReps: '10-12',
                    restSeconds: 75,
                  },
                ],
              });
            } else {
              initDraft(activeUserId);
            }
          });
      }
    }
  }, [user?.id, loadUserDraft, initDraft, location.state]);

  // Live Elapsed Timer computed from startedAt
  useEffect(() => {
    if (!draft?.startedAt) return;
    const updateElapsed = () => {
      const startMs = new Date(draft.startedAt).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [draft?.startedAt]);

  // Timestamp-based Rest Timer computed from restEndsAt
  useEffect(() => {
    if (!draft?.restEndsAt) {
      setRestSecondsRemaining(null);
      setRestAnnounced(false);
      return;
    }

    const checkRest = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((draft.restEndsAt! - now) / 1000));
      setRestSecondsRemaining(remaining);

      if (remaining === 0 && !restAnnounced) {
        setRestAnnounced(true);
        playRestBeep();
        triggerVibration();
        setAriaRestAnnouncement('Rest timer complete. Ready for next set.');
      }
    };

    checkRest();
    const interval = setInterval(checkRest, 500);
    return () => clearInterval(interval);
  }, [draft?.restEndsAt, restAnnounced]);

  // Exit Guard: beforeunload prompt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (draft && draft.exercises.some((ex) => ex.sets.some((s) => s.done))) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draft]);

  // Fetch exercises catalog when add exercise sheet opens
  useEffect(() => {
    if (showAddExerciseSheet && catalogExercises.length === 0) {
      getExercisesApi()
        .then((exs) => setCatalogExercises(exs))
        .catch(() => {});
    }
  }, [showAddExerciseSheet, catalogExercises.length]);

  // Execute Submission with Idempotency Key
  const executeSubmission = useCallback(async () => {
    const submissionData = freezeForSubmission();
    if (!submissionData) {
      setSubmitErrorMessage('You must complete at least 1 set before finishing.');
      return;
    }

    setSubmitStatus('saving');
    setSubmitErrorMessage(null);

    try {
      const result = await logWorkoutSessionWithMetaApi(submissionData.payload, {
        idempotencyKey: submissionData.idempotencyKey,
      });

      setSubmitStatus('saved');
      releaseWakeLock();
      clearDraft();

      setTimeout(() => {
        navigate('/workouts', {
          state: {
            message: result.isReplay
              ? 'Workout session replayed successfully.'
              : 'Workout session saved successfully!',
          },
        });
      }, 600);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { detail?: unknown } } };
      const status = axiosError?.response?.status;

      if (status === 409) {
        setSubmitStatus('conflict');
        setSubmitErrorMessage('Workout with this key was already submitted with different details.');
      } else if (status === 422) {
        setSubmitStatus('validation_error');
        setSubmitErrorMessage(getErrorMessage(err));
      } else {
        // Network error or 5xx: retain draft, schedule retry
        setShowSummarySheet(false);
        setSubmitStatus('network_error');
        setSubmitErrorMessage('Network error: workout saved on this device. Retrying automatically...');

        const backoffs = [2000, 5000, 15000, 30000];
        const nextDelay = backoffs[Math.min(retryAttempt, backoffs.length - 1)];

        if (retryAttempt < backoffs.length) {
          retryTimeoutRef.current = setTimeout(() => {
            setRetryAttempt((prev) => prev + 1);
            executeSubmission();
          }, nextDelay);
        }
      }
    }
  }, [freezeForSubmission, navigate, releaseWakeLock, clearDraft, retryAttempt]);

  // Retry immediately when returning online
  useEffect(() => {
    const handleOnline = () => {
      if (submitStatus === 'network_error') {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        executeSubmission();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [submitStatus, executeSubmission]);

  // Current Exercise Details
  const exercises = draft?.exercises || [];
  const currentExercise = exercises[currentExerciseIndex] || null;
  const totalExercises = exercises.length;

  // Calculate session summary stats
  const completedSetsCount = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.done).length,
    0,
  );
  const plannedSetsCount = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolumeKg = exercises.reduce((sum, ex) => {
    return (
      sum +
      ex.sets.reduce((exSum, s) => {
        if (!s.done) return exSum;
        const w = parseFloat(s.weightKg) || 0;
        const r = typeof s.reps === 'string' ? parseInt(s.reps, 10) || 0 : s.reps;
        return exSum + w * r;
      }, 0)
    );
  }, 0);

  const formatTimerClock = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      data-theme="dark"
      className="min-h-screen min-h-[100dvh] bg-bg text-text flex flex-col justify-between selection:bg-accent selection:text-black font-sans antialiased"
    >
      {/* Polite Screen Reader Announcement */}
      <div aria-live="polite" className="sr-only">
        {ariaRestAnnouncement}
      </div>

      {/* TOP HEADER */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            aria-label="Exit Workout"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-2 transition-colors text-text-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className="font-mono text-base font-bold tabular-nums text-text">
                {formatTimerClock(elapsedSeconds)}
              </span>
            </div>
            <p className="text-[11px] text-text-3 font-medium">
              {totalExercises > 0
                ? `Exercise ${currentExerciseIndex + 1} of ${totalExercises}`
                : 'No exercises'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Exercise list picker */}
          <button
            type="button"
            onClick={() => setShowExerciseListSheet(true)}
            aria-label="View Exercise List"
            className="p-2 rounded-lg bg-surface-2 hover:bg-border/60 transition-colors text-text-2 hover:text-text text-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>

          {/* Finish Button */}
          <button
            type="button"
            onClick={() => setShowSummarySheet(true)}
            disabled={completedSetsCount === 0}
            className="px-4 py-2 bg-accent text-accent-contrast rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-contrast"
          >
            Finish
          </button>
        </div>
      </header>

      {/* QUOTA EXCEEDED BANNER */}
      {isQuotaExceeded && draft && (
        <div className="bg-warning-soft border-b border-warning text-warning p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Device storage full. Draft changes may not persist if browser is closed.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyDraftToClipboard(draft)}
              className="px-2.5 py-1 bg-warning text-white rounded font-medium hover:opacity-90 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy Draft
            </button>
            <button
              type="button"
              onClick={() => downloadDraftJson(draft)}
              className="px-2.5 py-1 bg-surface text-text rounded border border-warning font-medium hover:bg-surface-2 flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download JSON
            </button>
          </div>
        </div>
      )}

      {/* SUBMISSION STATE BANNER */}
      {submitStatus === 'network_error' && (
        <div className="bg-amber-950/80 border-b border-amber-600 text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 animate-spin text-amber-400" />
            <span>{submitErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={executeSubmission}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold text-[11px]"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        {currentExercise ? (
          <div className="flex flex-col gap-5">
            {/* Exercise Title Card */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
                  {currentExercise.name}
                </h1>
                <p className="text-sm text-text-2 mt-1">
                  Target {currentExercise.targetSets || 3} ×{' '}
                  {currentExercise.targetReps || '8-12'}
                  {currentExercise.restSeconds ? `, rest ${currentExercise.restSeconds} s` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeExercise(currentExerciseIndex)}
                title="Remove Exercise"
                className="p-2 rounded-lg text-text-3 hover:text-danger hover:bg-danger-soft/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* SETS TABLE */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="grid grid-cols-[48px_1fr_1fr_1fr_64px] gap-2 px-3 py-2.5 bg-surface-2/60 text-[11px] font-semibold text-text-3 uppercase tracking-wider border-b border-border text-center">
                <span>Set</span>
                <span className="text-left">Previous</span>
                <span>kg</span>
                <span>Reps</span>
                <span>Done</span>
              </div>

              <div className="divide-y divide-border/60">
                {currentExercise.sets.map((set, setIdx) => {
                  return (
                    <div
                      key={set.setNumber}
                      className={`grid grid-cols-[48px_1fr_1fr_1fr_64px] gap-2 items-center px-3 py-3 text-sm transition-colors ${
                        set.done ? 'bg-accent-soft/30' : 'hover:bg-surface-2/30'
                      }`}
                    >
                      {/* Set Number */}
                      <span className="text-center font-mono font-bold text-text-2">
                        {set.setNumber}
                      </span>

                      {/* Previous Result */}
                      <span className="text-left text-xs font-mono text-text-3 truncate">
                        {set.previousResult || '—'}
                      </span>

                      {/* Weight Input */}
                      <div className="px-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={set.weightKg}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            // Max 2 decimals
                            if (val.includes('.')) {
                              const [, dec] = val.split('.');
                              if (dec && dec.length > 2) return;
                            }
                            updateSet(currentExerciseIndex, setIdx, { weightKg: val });
                          }}
                          placeholder="0.00"
                          className="w-full text-center py-2 px-1 font-mono font-medium rounded-lg bg-surface-2 border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      {/* Reps Input */}
                      <div className="px-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateSet(currentExerciseIndex, setIdx, {
                              reps: val === '' ? '' : parseInt(val, 10) || 0,
                            });
                          }}
                          placeholder="0"
                          className="w-full text-center py-2 px-1 font-mono font-medium rounded-lg bg-surface-2 border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      {/* Complete Check Button (Min 48px touch target) */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => completeSet(currentExerciseIndex, setIdx)}
                          aria-label={`Mark set ${set.setNumber} as ${set.done ? 'incomplete' : 'complete'}`}
                          className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                            set.done
                              ? 'bg-accent text-accent-contrast shadow-sm'
                              : 'bg-surface-2 text-text-3 hover:text-text hover:bg-border/60 border border-border'
                          }`}
                        >
                          <Check className={`w-5 h-5 ${set.done ? 'stroke-[2.5]' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Set Button */}
              <div className="p-2 bg-surface-2/20 border-t border-border flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => addSet(currentExerciseIndex)}
                  className="px-3 py-2 text-xs font-semibold text-accent hover:text-accent-hover hover:bg-accent-soft/20 rounded-lg transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <Plus className="w-4 h-4" /> Add Set
                </button>

                {currentExercise.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(currentExerciseIndex, currentExercise.sets.length - 1)}
                    className="px-2.5 py-1.5 text-xs text-text-3 hover:text-danger rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Set
                  </button>
                )}
              </div>
            </div>

            {/* Session Notes */}
            <div className="bg-surface rounded-xl border border-border p-3.5">
              <label
                htmlFor="session-notes"
                className="text-xs font-semibold text-text-2 uppercase tracking-wider block mb-2"
              >
                Workout Notes
              </label>
              <textarea
                id="session-notes"
                value={draft?.notes ?? ''}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="RPE, energy level, equipment notes, or tweaks..."
                rows={2}
                className="w-full p-2.5 text-sm bg-surface-2 border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder:text-text-3"
              />
            </div>
          </div>
        ) : (
          /* Empty Session State */
          <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-accent mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-text">No Exercises Added</h2>
            <p className="text-sm text-text-2 max-w-sm mt-1 mb-6">
              This session currently has no exercises. Add exercises from your library to begin.
            </p>
            <Button onClick={() => setShowAddExerciseSheet(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Exercise
            </Button>
          </div>
        )}
      </main>

      {/* FOOTER CONTROLS & REST TIMER */}
      <footer className="sticky bottom-0 z-20 bg-surface/95 backdrop-blur-md border-t border-border p-3 flex flex-col gap-2">
        {/* REST TIMER BAR */}
        {restSecondsRemaining !== null && (
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              restSecondsRemaining === 0
                ? 'bg-accent text-accent-contrast'
                : 'bg-surface-2 text-text border border-border'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {restSecondsRemaining === 0 ? 'Rest Complete!' : 'Rest Timer'}
              </span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {formatTimerClock(restSecondsRemaining)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustRestTimer(-15)}
                disabled={restSecondsRemaining <= 15}
                className="px-2 py-1 bg-surface border border-border rounded text-[11px] font-semibold text-text hover:bg-border/40 disabled:opacity-30"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => adjustRestTimer(15)}
                className="px-2 py-1 bg-surface border border-border rounded text-[11px] font-semibold text-text hover:bg-border/40"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={skipRestTimer}
                className="px-2.5 py-1 bg-border text-[11px] font-semibold text-text rounded hover:bg-border/70"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION ACTIONS */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentExerciseIndex <= 0}
              onClick={() => setCurrentExerciseIndex(currentExerciseIndex - 1)}
              className="px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-semibold text-text hover:bg-border/40 disabled:opacity-30 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              type="button"
              disabled={currentExerciseIndex >= totalExercises - 1}
              onClick={() => setCurrentExerciseIndex(currentExerciseIndex + 1)}
              className="px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-semibold text-text hover:bg-border/40 disabled:opacity-30 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddExerciseSheet(true)}
              className="px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-semibold text-text hover:bg-border/40 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Plus className="w-4 h-4 text-accent" /> Add Exercise
            </button>

            {/* Shortcut: Open Music App */}
            <a
              href="spotify://"
              onClick={() => {
                // If native scheme fails, open web fallback
                setTimeout(() => {
                  window.open('https://open.spotify.com', '_blank');
                }, 500);
              }}
              title="Open Music Player"
              className="p-2.5 rounded-xl bg-surface-2 border border-border text-text-2 hover:text-text hover:bg-border/40 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Music className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>

      {/* QUICK JUMP EXERCISE BOTTOM SHEET */}
      <BottomSheet
        open={showExerciseListSheet}
        onOpenChange={setShowExerciseListSheet}
        title="Session Exercises"
        description="Select an exercise to jump directly to its sets"
      >
        <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {exercises.map((ex, idx) => {
            const completedCount = ex.sets.filter((s) => s.done).length;
            const isCurrent = idx === currentExerciseIndex;
            return (
              <button
                key={ex.exerciseId}
                type="button"
                onClick={() => {
                  setCurrentExerciseIndex(idx);
                  setShowExerciseListSheet(false);
                }}
                className={`p-3 rounded-xl text-left border flex items-center justify-between transition-colors ${
                  isCurrent
                    ? 'bg-accent-soft/30 border-accent text-accent-soft-text'
                    : 'bg-surface border-border text-text hover:bg-surface-2'
                }`}
              >
                <div>
                  <span className="font-semibold text-sm block">{ex.name}</span>
                  <span className="text-xs text-text-3">
                    {completedCount} of {ex.sets.length} sets completed
                  </span>
                </div>
                {completedCount === ex.sets.length && (
                  <Check className="w-5 h-5 text-accent" />
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ADD EXERCISE BOTTOM SHEET */}
      <BottomSheet
        open={showAddExerciseSheet}
        onOpenChange={setShowAddExerciseSheet}
        title="Add Exercise"
        description="Search exercise catalog to append to this workout"
      >
        <div className="p-4 flex flex-col gap-3">
          <input
            type="text"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Search exercises by name..."
            className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-2 mt-1">
            {catalogExercises
              .filter((ex) =>
                ex.name.toLowerCase().includes(catalogSearch.toLowerCase().trim()),
              )
              .map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    addExercise({ id: ex.id, name: ex.name });
                    setShowAddExerciseSheet(false);
                  }}
                  className="p-3 bg-surface hover:bg-surface-2 border border-border rounded-xl text-left flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-semibold text-sm block">{ex.name}</span>
                    <span className="text-xs text-text-3 capitalize">
                      {ex.primary_muscle} • {ex.category || 'strength'}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-accent" />
                </button>
              ))}
          </div>
        </div>
      </BottomSheet>

      {/* FINISH SUMMARY CONFIRMATION SHEET */}
      <BottomSheet
        open={showSummarySheet}
        onOpenChange={setShowSummarySheet}
        title="Session Summary"
        description="Review session metrics before saving"
      >
        <div className="p-4 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-2 p-3 rounded-xl border border-border text-center">
              <span className="text-[11px] text-text-3 font-medium uppercase tracking-wider block mb-1">
                Duration
              </span>
              <span className="font-mono text-base font-bold text-text">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>

            <div className="bg-surface-2 p-3 rounded-xl border border-border text-center">
              <span className="text-[11px] text-text-3 font-medium uppercase tracking-wider block mb-1">
                Sets Done
              </span>
              <span className="font-mono text-base font-bold text-text">
                {completedSetsCount} / {plannedSetsCount}
              </span>
            </div>

            <div className="bg-surface-2 p-3 rounded-xl border border-border text-center">
              <span className="text-[11px] text-text-3 font-medium uppercase tracking-wider block mb-1">
                Volume
              </span>
              <span className="font-mono text-base font-bold text-text">
                {totalVolumeKg.toLocaleString()} kg
              </span>
            </div>
          </div>

          {plannedSetsCount > completedSetsCount && (
            <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {plannedSetsCount - completedSetsCount} uncompleted sets will be dropped upon save.
              </span>
            </div>
          )}

          {submitErrorMessage && (
            <div className="bg-danger-soft/20 border border-danger text-danger p-3 rounded-xl text-xs">
              {submitErrorMessage}
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={executeSubmission}
              disabled={submitStatus === 'saving' || completedSetsCount === 0}
              className="w-full py-3 text-sm font-bold"
            >
              {submitStatus === 'saving' ? 'Saving Workout...' : 'Save Workout'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowSummarySheet(false)}
              className="w-full text-xs"
            >
              Resume Workout
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ACCIDENTAL EXIT CONFIRMATION MODAL */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-md bg-surface text-text border-border">
          <DialogHeader>
            <DialogTitle>Exit Workout?</DialogTitle>
            <DialogDescription className="text-text-2">
              Your progress is saved as a draft on this device. You can resume this session anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => setShowExitConfirm(false)} className="w-full">
              Keep Working Out
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowExitConfirm(false);
                navigate('/dashboard');
              }}
              className="w-full"
            >
              Exit to Dashboard
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowExitConfirm(false);
                setShowDiscardConfirm(true);
              }}
              className="text-xs text-danger hover:underline pt-2 text-center"
            >
              Discard this workout entirely
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DISCARD ENTIRE WORKOUT CONFIRMATION */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="max-w-md bg-surface text-text border-border">
          <DialogHeader>
            <DialogTitle className="text-danger">Discard Workout?</DialogTitle>
            <DialogDescription className="text-text-2">
              All logged sets and timers for this workout will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                setShowDiscardConfirm(false);
                clearDraft();
                navigate('/workouts');
              }}
              className="w-full"
            >
              Yes, Discard Workout
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDiscardConfirm(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STALE DRAFT MODAL (>24H) */}
      <Dialog open={isStaleDraft} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-surface text-text border-border">
          <DialogHeader>
            <DialogTitle>Stale Workout Draft</DialogTitle>
            <DialogDescription className="text-text-2">
              This session was started over 24 hours ago. Would you like to finish and save it now or discard it?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => {
                acknowledgeStaleDraft('save');
                setShowSummarySheet(true);
              }}
              className="w-full"
            >
              Save as Completed
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                acknowledgeStaleDraft('discard');
                navigate('/workouts');
              }}
              className="w-full"
            >
              Discard Stale Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CORRUPT DRAFT QUARANTINED MODAL */}
      <Dialog open={Boolean(corruptRecovery?.isCorrupt)} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-surface text-text border-border">
          <DialogHeader>
            <DialogTitle className="text-warning">Corrupt Draft Recovered</DialogTitle>
            <DialogDescription className="text-text-2">
              An unparseable draft was found and quarantined for safety. You can download the raw data or discard it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-4">
            {corruptRecovery?.corruptRaw && (
              <Button
                variant="secondary"
                onClick={() => downloadDraftJson(corruptRecovery.corruptRaw!, 'corrupt-workout-draft.json')}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" /> Download Raw Quarantined JSON
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                discardCorruptedDraft();
                clearDraft();
              }}
              className="w-full"
            >
              Discard Corrupt Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
