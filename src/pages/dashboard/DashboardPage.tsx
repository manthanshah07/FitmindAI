import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Dumbbell,
  Utensils,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Ring } from '../../components/ui/Ring';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ErrorState } from '../../components/ui/ErrorState';
import { AddFoodSheet } from '../../components/nutrition/AddFoodSheet';
import { getDashboardSummaryApi } from '../../lib/api/dashboard';
import { getActiveWorkoutPlanApi, getWorkoutLogsApi } from '../../lib/api/workout';
import { loadDraft } from '../../lib/workoutDraft';
import { formatDate, formatNumber, formatDuration } from '../../lib/format';
import type { SessionTemplate, WorkoutPlanExercise } from '../../types/workout';

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good evening';
  }
  return `${timeGreeting}, ${name.split(' ')[0]}`;
}

function toISODateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const todayIso = toISODateString(new Date());

  const [isAddFoodOpen, setIsAddFoodOpen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // 1. Dashboard summary query
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => getDashboardSummaryApi(),
  });

  // 2. Active plan query
  const { data: activePlan } = useQuery({
    queryKey: ['activeWorkoutPlan'],
    queryFn: () => getActiveWorkoutPlanApi(),
  });

  // 3. Recent workout logs to detect today's completion
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recentWorkoutLogs'],
    queryFn: () => getWorkoutLogsApi(10, 0),
  });

  // Check active draft
  const activeDraft = user?.id ? loadDraft(user.id).draft : null;

  // Live elapsed time tick if active draft exists
  useEffect(() => {
    if (!activeDraft?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calcElapsed = () => {
      const startMs = new Date(activeDraft.startedAt).getTime();
      return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    };

    setElapsedSeconds(calcElapsed());
    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDraft?.startedAt]);

  // Today's completed workout check
  const completedTodayLog = recentLogs.find((l) => {
    const logDate = l.started_at
      ? l.started_at.split('T')[0]
      : l.created_at
      ? l.created_at.split('T')[0]
      : '';
    const endDate = l.ended_at ? l.ended_at.split('T')[0] : '';
    return logDate === todayIso || endDate === todayIso;
  });

  // Find today's scheduled day from plan
  const planExercises: WorkoutPlanExercise[] = activePlan?.plan_exercises || [];
  const distinctDays: number[] = Array.from(
    new Set(planExercises.map((e: WorkoutPlanExercise) => Number(e.day_of_week) || 1)),
  ).sort((a: number, b: number) => a - b);

  // Map day of week (Monday=1, Sunday=7) or fallback to Day 1
  const currentDayOfWeek = new Date().getDay() || 7;
  const scheduledDayIndex = distinctDays.includes(currentDayOfWeek)
    ? currentDayOfWeek
    : distinctDays[0] || 1;

  const todayExercises = planExercises.filter(
    (e: WorkoutPlanExercise) => (Number(e.day_of_week) || 1) === scheduledDayIndex,
  );
  const dayLabel =
    todayExercises[0]?.day_label || `Day ${scheduledDayIndex}: Workout`;

  const isRestDay = !distinctDays.includes(currentDayOfWeek) && !completedTodayLog && !activeDraft;

  // Template to start today's workout
  const scheduledTemplate: SessionTemplate = {
    planId: activePlan?.id || '',
    dayIndex: scheduledDayIndex,
    name: dayLabel,
    exercises: todayExercises.map((pe: WorkoutPlanExercise) => ({
      exerciseId: pe.exercise_id,
      name: pe.exercise?.name || 'Exercise',
      targetSets: pe.sets || 3,
      targetReps: pe.reps || '8-12',
      restSeconds: 90,
      previousResult: null,
    })),
  };

  const handleStartWorkout = () => {
    navigate('/workouts/session', { state: { template: scheduledTemplate } });
  };

  const handleResumeWorkout = () => {
    navigate('/workouts/session');
  };

  const firstName = summary?.full_name || user?.full_name || 'Athlete';
  const greeting = getGreeting(firstName);
  const todayDateFormatted = formatDate(new Date().toISOString());

  // Deterministic single insight line (No LLM calls)
  const todayNutrition = summary?.today_nutrition;
  const remainingCals = todayNutrition ? Math.round(todayNutrition.remaining_calories) : 0;
  const consumedCals = todayNutrition ? Math.round(todayNutrition.consumed_calories) : 0;
  const targetCals = todayNutrition ? Math.round(todayNutrition.target_calories) : 0;
  const consumedProt = todayNutrition ? todayNutrition.consumed_protein_g : 0;
  const targetProt = todayNutrition ? todayNutrition.target_protein_g : 0;

  let deterministicInsight = 'No meals logged yet today.';
  if (consumedCals > 0) {
    if (consumedProt >= targetProt && targetProt > 0) {
      deterministicInsight = 'On track with your daily protein goal.';
    } else if (remainingCals > 400) {
      deterministicInsight = `You are ${formatNumber(remainingCals)} kcal under today's target.`;
    } else if (remainingCals <= 100 && remainingCals >= 0) {
      deterministicInsight = 'Calorie target reached for today.';
    } else if (remainingCals < 0) {
      deterministicInsight = `Consumed ${formatNumber(consumedCals)} kcal against your ${formatNumber(targetCals)} kcal target.`;
    } else {
      deterministicInsight = `${formatNumber(remainingCals)} kcal remaining for today's meals.`;
    }
  }

  // Weekly data
  const weekly = summary?.weekly_summary;
  const workoutsDone = weekly?.workouts_completed ?? 0;
  const workoutsTarget = weekly?.target_workouts ?? (summary?.workout_plan?.days_per_week || 4);
  const foodLoggedDays = weekly?.nutrition_logged_days ?? 0;
  const weightChange = weekly?.weight_change_kg ?? null;
  const fitnessScore = weekly?.current_fitness_score ?? null;
  const fitnessScoreDelta = weekly?.fitness_score_change ?? null;

  const ringPercentage = Math.min(
    100,
    Math.round((consumedCals / Math.max(targetCals, 1)) * 100),
  );

  if (isSummaryError) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState
          title="Unable to load dashboard"
          message={
            summaryError instanceof Error
              ? summaryError.message
              : 'Failed to load your fitness data. Please try again.'
          }
          onRetry={() => refetchSummary()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto pb-16">
      {/* 1. Top Greeting Header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            {greeting}
          </h1>
          <p className="text-sm font-medium text-text-2 mt-0.5">
            {todayDateFormatted}
          </p>
        </div>

        {/* User avatar initial pill */}
        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm select-none">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* 6. Onboarding Reminder Banner (Only if incomplete) */}
      {!isSummaryLoading && summary?.onboarding_complete === false && (
        <Banner
          variant="warning"
          title="Onboarding Pending"
          action={
            <NavLink to="/onboarding">
              <Button size="sm" variant="primary">
                Complete onboarding
              </Button>
            </NavLink>
          }
        >
          Complete your initial setup to calibrate personalized BMR, TDEE, and workout plans.
        </Banner>
      )}

      {isSummaryLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : (
        <>
          {/* 2. Workout Card */}
          <Card className="p-5 flex flex-col gap-4 bg-surface border-border shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-accent" />
                Today's workout
              </span>

              {activeDraft ? (
                <Chip variant="warning">In progress</Chip>
              ) : completedTodayLog ? (
                <Chip variant="accent">Completed</Chip>
              ) : isRestDay ? (
                <Chip variant="neutral">Rest day</Chip>
              ) : (
                <Chip variant="accent">Scheduled</Chip>
              )}
            </div>

            {/* Workout Details */}
            {activeDraft ? (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-bold text-text">
                    Workout in progress
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>
                      Live elapsed:{' '}
                      <strong className="text-text tabular-nums">
                        {formatDuration(elapsedSeconds)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>{activeDraft.exercises.length} exercises</span>
                  </div>
                </div>

                <Button variant="primary" onClick={handleResumeWorkout} className="w-full mt-1">
                  Resume workout
                </Button>
              </div>
            ) : completedTodayLog ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-bold text-text">
                    {completedTodayLog.name || 'Workout session completed'}
                  </h3>
                </div>
                <p className="text-xs text-text-2">
                  Completed today • {completedTodayLog.total_sets_completed || '—'} sets •{' '}
                  {completedTodayLog.duration_seconds
                    ? `${Math.round(completedTodayLog.duration_seconds / 60)} min`
                    : 'Recorded'}
                </p>
                <div className="pt-2">
                  <NavLink to="/workouts/history">
                    <Button variant="secondary" size="sm" className="w-full text-xs">
                      View workout history
                    </Button>
                  </NavLink>
                </div>
              </div>
            ) : isRestDay ? (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-base font-bold text-text">Rest & Recovery</h3>
                  <p className="text-xs text-text-2 mt-1">
                    No scheduled training session today. Focus on active recovery, stretching, or hydration.
                  </p>
                </div>
                <Button variant="secondary" onClick={handleStartWorkout} className="w-full text-xs">
                  Start ad-hoc workout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-bold text-text">{dayLabel}</h3>
                  <p className="text-xs text-text-2 mt-0.5">
                    {todayExercises.length || 4} exercises, about 45 min
                  </p>
                </div>

                <Button variant="primary" onClick={handleStartWorkout} className="w-full">
                  Start workout
                </Button>
              </div>
            )}
          </Card>

          {/* 3. Nutrition Card */}
          <Card className="p-5 flex flex-col gap-5 bg-surface border-border shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-accent" />
                Nutrition
              </span>

              <NavLink
                to="/nutrition"
                className="text-xs font-medium text-accent hover:underline"
              >
                View details →
              </NavLink>
            </div>

            {/* Headline Remaining Calories with Ring */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-accent tabular-nums">
                    {formatNumber(remainingCals)}
                  </span>
                  <span className="text-sm font-medium text-text-2">kcal left</span>
                </div>
                <span className="text-xs text-text-3 tabular-nums mt-0.5 block">
                  {formatNumber(consumedCals)} / {formatNumber(targetCals)} kcal consumed
                </span>
              </div>

              {/* Ring meter */}
              <Ring
                value={ringPercentage}
                size={64}
                strokeWidth={7}
              />
            </div>

            {/* Macro Progress Bars */}
            <div className="flex flex-col gap-3 pt-1">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-text-2">Protein</span>
                  <span className="font-semibold text-text tabular-nums">
                    {Math.round(consumedProt)} / {Math.round(targetProt)}g
                  </span>
                </div>
                <ProgressBar
                  value={consumedProt}
                  max={Math.max(targetProt, 1)}
                  variant="accent"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-text-2">Carbs</span>
                  <span className="font-semibold text-text tabular-nums">
                    {Math.round(todayNutrition?.consumed_carbs_g || 0)} /{' '}
                    {Math.round(todayNutrition?.target_carbs_g || 250)}g
                  </span>
                </div>
                <ProgressBar
                  value={todayNutrition?.consumed_carbs_g || 0}
                  max={Math.max(todayNutrition?.target_carbs_g || 250, 1)}
                  variant="carbs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-text-2">Fat</span>
                  <span className="font-semibold text-text tabular-nums">
                    {Math.round(todayNutrition?.consumed_fat_g || 0)} /{' '}
                    {Math.round(todayNutrition?.target_fat_g || 70)}g
                  </span>
                </div>
                <ProgressBar
                  value={todayNutrition?.consumed_fat_g || 0}
                  max={Math.max(todayNutrition?.target_fat_g || 70, 1)}
                  variant="fat"
                />
              </div>
            </div>

            {/* Add Food Button */}
            <Button
              variant="secondary"
              onClick={() => setIsAddFoodOpen(true)}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add food
            </Button>
          </Card>

          {/* 4. This Week Summary */}
          <Card className="p-5 flex flex-col gap-4 bg-surface border-border shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                This week
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Workouts with dots */}
              <div className="flex flex-col gap-1.5 p-3 rounded-md bg-surface-2 border border-border">
                <span className="text-text-2">Workouts</span>
                <div className="flex items-center gap-2">
                  {/* Dot indicators */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(workoutsTarget, 6) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          i < workoutsDone ? 'bg-accent' : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-text tabular-nums ml-auto">
                    {workoutsDone} of {workoutsTarget}
                  </span>
                </div>
              </div>

              {/* Food logged */}
              <div className="flex flex-col gap-1.5 p-3 rounded-md bg-surface-2 border border-border">
                <span className="text-text-2">Food logged</span>
                <span className="font-bold text-text tabular-nums text-base">
                  {foodLoggedDays} of 7 days
                </span>
              </div>

              {/* Weight change */}
              <div className="flex flex-col gap-1.5 p-3 rounded-md bg-surface-2 border border-border">
                <span className="text-text-2">Weight</span>
                <span className="font-bold text-text tabular-nums text-base">
                  {weightChange !== null && weightChange !== undefined
                    ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`
                    : '—'}
                </span>
              </div>

              {/* Fitness score with link */}
              <NavLink
                to="/progress"
                className="flex flex-col gap-1.5 p-3 rounded-md bg-surface-2 border border-border hover:border-accent transition-colors group"
              >
                <span className="text-text-2 group-hover:text-accent">Fitness score</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text text-base tabular-nums">
                    {fitnessScore !== null ? fitnessScore : '—'}
                  </span>
                  {fitnessScoreDelta !== null && fitnessScoreDelta !== undefined && (
                    <Chip variant="accent">
                      {fitnessScoreDelta >= 0 ? `+${fitnessScoreDelta}` : `${fitnessScoreDelta}`}
                    </Chip>
                  )}
                </div>
              </NavLink>
            </div>
          </Card>

          {/* 5. One Deterministic Insight Line */}
          <div className="p-3.5 rounded-md border border-border bg-surface-2 text-xs text-text-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="font-medium text-text">{deterministicInsight}</span>
          </div>
        </>
      )}

      {/* Add Food Sheet */}
      <AddFoodSheet
        isOpen={isAddFoodOpen}
        initialMealType="lunch"
        onClose={() => setIsAddFoodOpen(false)}
        onSuccess={() => {
          refetchSummary();
        }}
      />
    </div>
  );
};
