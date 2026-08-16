import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { getActiveWorkoutPlanApi, seedExercisesApi, logWorkoutSessionApi } from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import type { WorkoutPlan, WorkoutLogExerciseCreate } from '../../types/workout';

export const WorkoutSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState<string>(() => new Date().toISOString());
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Local state tracking set-by-set input values:
  // Key: `${exercise_id}_${set_number}`
  const [setValues, setSetValues] = useState<
    Record<string, { reps: number; weight: number; rpe: number }>
  >({});

  useEffect(() => {
    async function loadWorkoutSession() {
      try {
        setIsLoading(true);
        setError(null);
        let activePlan = await getActiveWorkoutPlanApi();

        if (!activePlan || activePlan.plan_exercises.length === 0) {
          await seedExercisesApi();
          activePlan = await getActiveWorkoutPlanApi();
        }

        setPlan(activePlan);

        // Pre-initialize setValues for all plan exercises
        if (activePlan) {
          const initialMap: Record<string, { reps: number; weight: number; rpe: number }> = {};
          activePlan.plan_exercises.forEach((item) => {
            const targetSets = item.sets || 3;
            const defaultReps = item.reps ? parseInt(item.reps.split('-')[0], 10) || 10 : 10;
            for (let setNum = 1; setNum <= targetSets; setNum++) {
              const key = `${item.exercise_id}_${setNum}`;
              initialMap[key] = { reps: defaultReps, weight: 0, rpe: 8 };
            }
          });
          setSetValues(initialMap);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkoutSession();
  }, []);

  const handleSetChange = (
    exerciseId: string,
    setNumber: number,
    field: 'reps' | 'weight' | 'rpe',
    val: number,
  ) => {
    const key = `${exerciseId}_${setNumber}`;
    setSetValues((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: isNaN(val) ? 0 : val,
      },
    }));
  };

  const handleFinishWorkout = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const loggedExercises: WorkoutLogExerciseCreate[] = [];

      if (plan) {
        plan.plan_exercises.forEach((item) => {
          const targetSets = item.sets || 3;
          for (let setNum = 1; setNum <= targetSets; setNum++) {
            const key = `${item.exercise_id}_${setNum}`;
            const entry = setValues[key] || { reps: 10, weight: 0, rpe: 8 };
            loggedExercises.push({
              exercise_id: item.exercise_id,
              set_number: setNum,
              reps_completed: entry.reps,
              weight_kg: entry.weight,
              rpe: entry.rpe,
            });
          }
        });
      }

      await logWorkoutSessionApi({
        plan_id: plan?.id,
        started_at: startTime,
        ended_at: new Date().toISOString(),
        notes: sessionNotes || 'Active session completed',
        logged_exercises: loggedExercises,
      });

      navigate('/workout', {
        state: { message: 'Workout session logged successfully!' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          Live Session Tracker
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Preparing Workout Routine...
        </h3>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col gap-4 p-8 border border-error bg-error/5 text-error">
        <h3 className="font-mono text-lg font-bold uppercase">Session Error</h3>
        <p className="text-xs font-sans">{error || 'Could not initiate live workout session.'}</p>
        <NavLink to="/workout">
          <Button variant="secondary">← Back to Workouts</Button>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Top Session Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Active Workout Session
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            {plan.name}
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Log your completed reps, weight in kg, and rate of perceived exertion (RPE 1-10).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NavLink to="/workout">
            <Button variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </NavLink>
          <Button variant="primary" onClick={handleFinishWorkout} isLoading={isSubmitting}>
            Finish Workout ✓
          </Button>
        </div>
      </div>

      {/* Session Exercises List */}
      <div className="flex flex-col gap-6">
        {plan.plan_exercises.map((item, idx) => {
          const exercise = item.exercise;
          const targetSets = item.sets || 3;

          return (
            <Card key={item.id} className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-borderLine">
                <div>
                  <span className="font-mono text-[10px] text-faded uppercase tracking-widest">
                    Exercise #{idx + 1}
                  </span>
                  <h2 className="text-xl font-bold uppercase text-graphite font-mono">
                    {exercise?.name || 'Exercise'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {exercise?.primary_muscle && (
                    <Badge variant="olive">{exercise.primary_muscle}</Badge>
                  )}
                  <Badge variant="faded">Target: {targetSets} Sets × {item.reps || '10'} Reps</Badge>
                </div>
              </div>

              {/* Sets Header Table */}
              <div className="grid grid-cols-4 gap-3 text-center font-mono text-[10px] uppercase text-faded mb-2 font-bold">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight (kg)</span>
                <span>RPE (1-10)</span>
              </div>

              {/* Set Inputs */}
              <div className="flex flex-col gap-3">
                {Array.from({ length: targetSets }).map((_, sIdx) => {
                  const setNum = sIdx + 1;
                  const key = `${item.exercise_id}_${setNum}`;
                  const currentEntry = setValues[key] || { reps: 10, weight: 0, rpe: 8 };

                  return (
                    <div key={setNum} className="grid grid-cols-4 gap-3 items-center">
                      <div className="font-mono text-center text-xs font-bold text-graphite bg-bone/80 p-2.5 border border-borderLine">
                        Set {setNum}
                      </div>

                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={currentEntry.reps}
                        onChange={(e) =>
                          handleSetChange(item.exercise_id, setNum, 'reps', parseInt(e.target.value, 10))
                        }
                        disabled={isSubmitting}
                      />

                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        max={500}
                        value={currentEntry.weight}
                        onChange={(e) =>
                          handleSetChange(item.exercise_id, setNum, 'weight', parseFloat(e.target.value))
                        }
                        disabled={isSubmitting}
                      />

                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={currentEntry.rpe}
                        onChange={(e) =>
                          handleSetChange(item.exercise_id, setNum, 'rpe', parseInt(e.target.value, 10))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Session Notes */}
      <Card className="p-6">
        <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold block mb-2">
          Session Notes / Reflection
        </label>
        <textarea
          rows={3}
          placeholder="e.g. Great energy today, increased bench press by 2.5kg..."
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          disabled={isSubmitting}
          className="w-full bg-bone border border-borderLine p-3.5 font-sans text-sm text-graphite placeholder:text-faded focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-60"
        />
      </Card>
    </div>
  );
};
