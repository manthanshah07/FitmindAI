import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Dialog } from '../../components/ui/Dialog';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Select } from '../../components/ui/Select';
import { TextField } from '../../components/ui/TextField';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkoutDraftStore } from '../../store/useWorkoutDraftStore';
import { loadDraft } from '../../lib/workoutDraft';
import {
  getActiveWorkoutPlanApi,
  generateWorkoutPlanApi,
  getWorkoutLogsApi,
  getExercisesApi,
  getLastPerformanceApi,
  seedExercisesApi,
} from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import { formatDuration } from '../../lib/format';
import type {
  Exercise,
  SessionTemplate,
  WorkoutPlanExercise,
} from '../../types/workout';
import { Play, RotateCcw, ChevronDown, ChevronUp, Award, Calendar, Dumbbell, History, Search } from 'lucide-react';

const DAYS_OPTIONS = [
  { value: '2', label: '2 Days / Week (Full Body Split)' },
  { value: '3', label: '3 Days / Week (Full Body Split)' },
  { value: '4', label: '4 Days / Week (Upper / Lower Split)' },
  { value: '5', label: '5 Days / Week (Push / Pull / Legs / Upper / Lower)' },
  { value: '6', label: '6 Days / Week (Push / Pull / Legs Split)' },
];

const MUSCLE_OPTIONS = [
  { value: '', label: 'All Muscle Groups' },
  { value: 'Chest', label: 'Chest' },
  { value: 'Quadriceps', label: 'Quadriceps' },
  { value: 'Hamstrings', label: 'Hamstrings' },
  { value: 'Lats', label: 'Lats' },
  { value: 'Upper Back', label: 'Upper Back' },
  { value: 'Shoulders', label: 'Shoulders' },
  { value: 'Triceps', label: 'Triceps' },
  { value: 'Biceps', label: 'Biceps' },
  { value: 'Glutes', label: 'Glutes' },
  { value: 'Calves', label: 'Calves' },
  { value: 'Abs', label: 'Abs' },
];

const EQUIPMENT_OPTIONS = [
  { value: '', label: 'All Equipment' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'cables', label: 'Cables' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'pull_up_bar', label: 'Pull-up Bar' },
  { value: 'bench', label: 'Bench' },
];

export const WorkoutOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { initDraft } = useWorkoutDraftStore();

  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'exercises'>('plan');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState<boolean>(false);
  const [regenerateDays, setRegenerateDays] = useState<string>('4');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Exercises Catalog Search & Filter State
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogMuscle, setCatalogMuscle] = useState<string>('');
  const [catalogEquipment, setCatalogEquipment] = useState<string>('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<Exercise | null>(null);

  // History Expanded Log State
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const hasDraft = Boolean(user?.id && loadDraft(user.id).draft);

  // Queries
  const {
    data: plan,
    isLoading: isPlanLoading,
    error: planError,
  } = useQuery({
    queryKey: ['activeWorkoutPlan'],
    queryFn: async () => {
      let activePlan = await getActiveWorkoutPlanApi();
      if (!activePlan) {
        await seedExercisesApi();
        activePlan = await generateWorkoutPlanApi({ days_per_week: 4 });
      }
      return activePlan;
    },
  });

  const {
    data: logs = [],
    isLoading: isLogsLoading,
  } = useQuery({
    queryKey: ['workoutLogsHistory'],
    queryFn: () => getWorkoutLogsApi(30, 0),
    enabled: activeTab === 'history',
  });

  const {
    data: exercises = [],
    isLoading: isExercisesLoading,
  } = useQuery({
    queryKey: ['exerciseCatalog', catalogSearch, catalogMuscle, catalogEquipment],
    queryFn: () =>
      getExercisesApi({
        search: catalogSearch || undefined,
        muscle: catalogMuscle || undefined,
        equipment: catalogEquipment || undefined,
      }),
    enabled: activeTab === 'exercises',
  });

  // Group plan exercises by day_of_week
  const dayGroups: Record<number, { label: string; exercises: WorkoutPlanExercise[] }> = {};
  if (plan && plan.plan_exercises) {
    for (const pe of plan.plan_exercises) {
      const dayNum = pe.day_of_week || 1;
      if (!dayGroups[dayNum]) {
        dayGroups[dayNum] = {
          label: pe.day_label || `Day ${dayNum}`,
          exercises: [],
        };
      }
      dayGroups[dayNum].exercises.push(pe);
    }
  }
  const availableDays = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);
  const currentDayGroup = dayGroups[selectedDayIndex] || (availableDays.length > 0 ? dayGroups[availableDays[0]] : null);

  const handleStartWorkoutForDay = async (dayNum: number) => {
    if (!user?.id || !plan) return;
    const group = dayGroups[dayNum];
    if (!group) return;

    // Fetch last performance to populate previousResult
    const exerciseIds = group.exercises.map((e) => e.exercise_id);
    let perfMap: Record<string, string> = {};
    try {
      const perfRes = await getLastPerformanceApi(exerciseIds);
      for (const [exId, item] of Object.entries(perfRes.performances)) {
        if (item.best_weight_kg) {
          perfMap[exId] = `${item.best_weight_kg}kg × ${item.best_reps || 8}`;
        } else if (item.sets.length > 0) {
          perfMap[exId] = `${item.sets[0].weight_kg ?? 0}kg × ${item.sets[0].reps_completed ?? 0}`;
        }
      }
    } catch {
      // Non-blocking
    }

    const template: SessionTemplate = {
      planId: plan.id,
      dayIndex: dayNum,
      name: `${plan.name} — ${group.label}`,
      exercises: group.exercises.map((pe) => ({
        exerciseId: pe.exercise_id,
        name: pe.exercise?.name || 'Exercise',
        targetSets: pe.sets || 3,
        targetReps: pe.reps || '8-12',
        restSeconds: pe.rest_seconds || 90,
        previousResult: perfMap[pe.exercise_id] || null,
      })),
    };

    initDraft(user.id, template);
    navigate('/workouts/session', { state: { template } });
  };

  const handleStartEmptyWorkout = () => {
    if (user?.id) {
      initDraft(user.id);
      navigate('/workouts/session');
    }
  };

  const handleConfirmRegenerate = async () => {
    try {
      setIsRegenerating(true);
      await generateWorkoutPlanApi({
        days_per_week: parseInt(regenerateDays, 10),
      });
      await queryClient.invalidateQueries({ queryKey: ['activeWorkoutPlan'] });
      setShowRegenerateDialog(false);
      setFeedback('Personalized routine updated successfully.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback(getErrorMessage(err));
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Workouts"
        description="Follow your structured training routine, review past performance, or search the exercise library."
        action={
          <div className="flex items-center gap-3">
            <NavLink to="/workouts/session">
              <Button variant="primary">
                <Play className="w-4 h-4 mr-1.5" />
                {hasDraft ? 'Resume workout' : 'Start workout'}
              </Button>
            </NavLink>
            <Button variant="secondary" onClick={handleStartEmptyWorkout}>
              Empty workout
            </Button>
          </div>
        }
      />

      {feedback && (
        <div className="p-3 rounded-md bg-accent-soft text-accent-soft-text border border-accent/20 text-sm font-medium">
          {feedback}
        </div>
      )}

      {planError && (
        <div className="p-4 rounded-md bg-danger-soft text-danger border border-danger/20 text-sm">
          {getErrorMessage(planError)}
        </div>
      )}

      {/* 3-Segment Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: string) => setActiveTab(val as 'plan' | 'history' | 'exercises')}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="plan" className="gap-2">
            <Calendar className="w-4 h-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Exercises
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────────────
            SEGMENT 1: PLAN (Week Strip, Day Cards, Start Workout, Regenerate)
            ───────────────────────────────────────────────────────────── */}
        <TabsContent value="plan" className="flex flex-col gap-6 pt-0">
          {isPlanLoading ? (
            <Card className="p-8 text-center text-text-2">Loading training plan...</Card>
          ) : !plan ? (
            <EmptyState
              title="No Active Training Plan"
              description="Generate a personalized plan based on your fitness goals and available equipment."
              actionLabel="Generate Plan"
              onAction={() => setShowRegenerateDialog(true)}
            />
          ) : (
            <>
              {/* Routine Meta & Regenerate Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md bg-surface border border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-text">{plan.name}</h2>
                    <Chip variant="accent">{plan.days_per_week || 4} Days / Week</Chip>
                  </div>
                  <p className="text-xs text-text-2">
                    Structured compound movements and progressive overload targets.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRegenerateDays(String(plan.days_per_week || 4));
                    setShowRegenerateDialog(true);
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate plan
                </Button>
              </div>

              {/* Week Strip (Day Selector) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {availableDays.map((dayNum) => {
                  const grp = dayGroups[dayNum];
                  const isSelected = selectedDayIndex === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDayIndex(dayNum)}
                      className={`flex flex-col items-start p-3 min-w-[140px] rounded-md border text-left transition-all ${
                        isSelected
                          ? 'border-accent bg-accent-soft text-text ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-text-3/50 text-text-2'
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-2">
                        Day {dayNum}
                      </span>
                      <span className="text-sm font-semibold text-text truncate max-w-[120px]">
                        {grp.label}
                      </span>
                      <span className="text-xs text-text-3 mt-1">
                        {grp.exercises.length} exercises
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Day Card */}
              {currentDayGroup && (
                <Card className="p-6 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-accent">
                          Day {selectedDayIndex}
                        </span>
                        <h3 className="text-xl font-semibold text-text">
                          {currentDayGroup.label}
                        </h3>
                      </div>
                      <p className="text-xs text-text-2 mt-1">
                        {currentDayGroup.exercises.length} exercises scheduled • Target duration ~45 min
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => handleStartWorkoutForDay(selectedDayIndex)}
                      className="gap-2 shrink-0"
                    >
                      <Play className="w-4 h-4" />
                      Start Day {selectedDayIndex}
                    </Button>
                  </div>

                  {/* Exercise List for Selected Day */}
                  <div className="flex flex-col divide-y divide-border">
                    {currentDayGroup.exercises.map((pe, idx) => (
                      <div
                        key={pe.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs font-semibold text-text-3 mt-1 w-5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-text">
                                {pe.exercise?.name || 'Exercise'}
                              </h4>
                              {pe.exercise?.primary_muscle && (
                                <Chip variant="neutral">{pe.exercise.primary_muscle}</Chip>
                              )}
                            </div>
                            <div className="text-xs text-text-2 mt-1 flex items-center gap-3">
                              <span>
                                Target: <strong className="font-medium text-text">{pe.sets || 3} sets × {pe.reps || '8-12'}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Rest: <strong className="font-medium text-text">{pe.rest_seconds || 90}s</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {pe.exercise && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCatalogExercise(pe.exercise!)}
                            className="text-xs self-start sm:self-auto"
                          >
                            View instructions
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            SEGMENT 2: HISTORY (Date, Duration, Sets, Volume, Expandable Sets with PRs)
            ───────────────────────────────────────────────────────────── */}
        <TabsContent value="history" className="flex flex-col gap-4 pt-0">
          {isLogsLoading ? (
            <Card className="p-8 text-center text-text-2">Loading workout history...</Card>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No Workouts Logged Yet"
              description="Complete your first training session to track strength progress, volume, and personal records."
              actionLabel="Start a Workout"
              onAction={() => navigate('/workouts/session')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const formattedDate = new Date(log.started_at).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const durationLabel = log.duration_seconds
                  ? formatDuration(log.duration_seconds)
                  : '—';

                // Count personal records in this session
                const prCount = log.logged_exercises.filter((le) => le.is_personal_record).length;

                return (
                  <Card key={log.id} className="p-5 flex flex-col gap-3">
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-text">
                            {log.name || 'Workout Session'}
                          </h3>
                          {prCount > 0 && (
                            <Chip variant="warning" className="gap-1">
                              <Award className="w-3 h-3" />
                              {prCount} {prCount === 1 ? 'PR' : 'PRs'}
                            </Chip>
                          )}
                        </div>
                        <div className="text-xs text-text-2 flex items-center gap-2">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>Duration: {durationLabel}</span>
                          <span>•</span>
                          <span>Volume: {log.total_volume_kg ? `${log.total_volume_kg} kg` : '0 kg'}</span>
                          <span>•</span>
                          <span>Sets: {log.total_sets_completed ?? log.logged_exercises.length}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-2">
                        <span>{isExpanded ? 'Hide sets' : 'View sets'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expandable Set Log Detail */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                        {log.notes && (
                          <p className="text-xs text-text-2 italic mb-2">"{log.notes}"</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {log.logged_exercises.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-sm bg-surface-2 border border-border flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-semibold text-text truncate">
                                  {item.exercise?.name || 'Exercise'}
                                </span>
                                <span className="text-text-3 font-mono">Set {item.set_number}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-text">
                                  {item.weight_kg ?? 0}kg × {item.reps_completed ?? 0}
                                </span>
                                {item.is_personal_record && (
                                  <span
                                    title="Personal Record"
                                    className="text-amber-600 dark:text-amber-400 font-bold"
                                  >
                                    ★ PR
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            SEGMENT 3: EXERCISES (Search, Muscle & Equipment Filters, Detail Sheet)
            ───────────────────────────────────────────────────────────── */}
        <TabsContent value="exercises" className="flex flex-col gap-5 pt-0">
          {/* Search & Filter Bar */}
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              placeholder="Search by exercise name..."
              value={catalogSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCatalogSearch(e.target.value)}
              startAdornment={<Search className="w-4 h-4 text-text-3" />}
            />

            <Select
              options={MUSCLE_OPTIONS}
              value={catalogMuscle}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCatalogMuscle(e.target.value)}
            />

            <Select
              options={EQUIPMENT_OPTIONS}
              value={catalogEquipment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCatalogEquipment(e.target.value)}
            />
          </div>

          {/* Exercise Cards Grid */}
          {isExercisesLoading ? (
            <Card className="p-8 text-center text-text-2">Loading exercise library...</Card>
          ) : exercises.length === 0 ? (
            <EmptyState
              title="No Exercises Found"
              description="No exercises match your search and filter criteria. Try clearing filters."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exercises.map((ex) => (
                <Card
                  key={ex.id}
                  className="p-4 flex flex-col justify-between gap-3 hover:border-text-3/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCatalogExercise(ex)}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-text">{ex.name}</h4>
                      <Chip variant="neutral">{ex.primary_muscle}</Chip>
                    </div>
                    <p className="text-xs text-text-2 line-clamp-2 leading-relaxed">
                      {ex.description || 'Standard training exercise.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-3">
                    <span className="capitalize">{ex.difficulty || 'All levels'}</span>
                    <span className="text-accent font-medium">View form cues →</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────────
          Exercise Detail BottomSheet
          ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        open={Boolean(selectedCatalogExercise)}
        onOpenChange={(open: boolean) => !open && setSelectedCatalogExercise(null)}
        title={selectedCatalogExercise?.name || 'Exercise Details'}
        description={selectedCatalogExercise?.primary_muscle ? `Primary Muscle: ${selectedCatalogExercise.primary_muscle}` : undefined}
      >
        {selectedCatalogExercise && (
          <div className="flex flex-col gap-4 text-sm mt-2">
            {selectedCatalogExercise.description && (
              <div>
                <h5 className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-1">
                  Overview
                </h5>
                <p className="text-text leading-relaxed">{selectedCatalogExercise.description}</p>
              </div>
            )}

            {selectedCatalogExercise.instructions && (
              <div>
                <h5 className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-1">
                  Step-by-Step Execution
                </h5>
                <p className="text-text leading-relaxed whitespace-pre-line bg-surface-2 p-3.5 rounded-md border border-border">
                  {selectedCatalogExercise.instructions}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
              <div>
                <span className="text-text-3 block mb-0.5">Difficulty</span>
                <span className="font-semibold text-text capitalize">
                  {selectedCatalogExercise.difficulty || 'Beginner'}
                </span>
              </div>
              <div>
                <span className="text-text-3 block mb-0.5">Equipment</span>
                <span className="font-semibold text-text capitalize">
                  {selectedCatalogExercise.equipment_required?.join(', ') || 'None (Bodyweight)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          Regenerate Plan Modal Dialog
          ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        title="Regenerate Training Routine"
        description="This will calibrate a new schedule matching your target weekly frequency and compound progression order. Your previous workout logs will remain intact."
        primaryAction={{
          label: isRegenerating ? 'Generating...' : 'Confirm & Regenerate',
          onClick: handleConfirmRegenerate,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setShowRegenerateDialog(false),
        }}
      >
        <div className="py-3">
          <Select
            label="Weekly Training Frequency"
            options={DAYS_OPTIONS}
            value={regenerateDays}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRegenerateDays(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
};
