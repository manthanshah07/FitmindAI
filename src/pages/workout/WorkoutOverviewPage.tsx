import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import {
  getActiveWorkoutPlanApi,
  generateWorkoutPlanApi,
  getWorkoutLogsApi,
  seedExercisesApi,
} from '../../lib/api/workout';
import { getErrorMessage } from '../../utils/apiError';
import type { WorkoutPlan, WorkoutLog } from '../../types/workout';

const DAYS_OPTIONS = [
  { value: '3', label: '3 Days / Week (Full Body Split)' },
  { value: '4', label: '4 Days / Week (Upper/Lower Split)' },
  { value: '5', label: '5 Days / Week (Push/Pull/Legs Split)' },
];

export const WorkoutOverviewPage: React.FC = () => {
  const location = useLocation();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [recentLog, setRecentLog] = useState<WorkoutLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<string>('4');
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as { message?: string })?.message || null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadWorkoutOverview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch active plan and logs in parallel
      const [planData, logsData] = await Promise.allSettled([
        getActiveWorkoutPlanApi(),
        getWorkoutLogsApi(1, 0),
      ]);

      let activePlan: WorkoutPlan | null = null;
      if (planData.status === 'fulfilled') {
        activePlan = planData.value;
      }

      // If no plan, automatically seed default exercises and generate an initial plan
      if (!activePlan) {
        await seedExercisesApi();
        activePlan = await generateWorkoutPlanApi({ days_per_week: 4 });
      }

      setPlan(activePlan);

      if (logsData.status === 'fulfilled' && logsData.value.length > 0) {
        setRecentLog(logsData.value[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkoutOverview();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await seedExercisesApi();
      const newPlan = await generateWorkoutPlanApi({
        days_per_week: parseInt(selectedDays, 10),
      });
      setPlan(newPlan);
      setFeedback('Personalized workout plan generated successfully!');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          FitMind Workout Engine
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Loading Active Workout Plan...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Workout System Overview
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Today's Workout Routine
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            View your active routine, scheduled exercise specs, and live session tracker.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink to="/workout/history">
            <Button variant="secondary">View Log History</Button>
          </NavLink>
          <NavLink to="/workout/session">
            <Button variant="primary">Start Workout Session →</Button>
          </NavLink>
        </div>
      </div>

      {/* Feedback & Error Banners */}
      {feedback && (
        <div className="p-4 border border-olive bg-olive/5 text-olive font-mono text-xs uppercase tracking-wider">
          {feedback}
        </div>
      )}
      {error && (
        <div className="p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase tracking-wider" role="alert">
          {error}
        </div>
      )}

      {/* Active Workout Plan Overview Card */}
      {plan ? (
        <Card className="p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-4">
            <div>
              <span className="font-mono text-[10px] text-faded uppercase tracking-widest block mb-1">
                Active Training Routine
              </span>
              <h2 className="text-2xl font-bold uppercase text-graphite font-mono">
                {plan.name}
              </h2>
              <p className="text-xs text-charcoal font-sans mt-1">
                Frequency: <span className="font-mono font-bold">{plan.days_per_week || 4} Days / Week</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="olive">{plan.ai_generated ? 'AI Calibrated' : 'Custom Routine'}</Badge>
              <Badge variant="faded">{plan.plan_exercises.length} Exercises Scheduled</Badge>
            </div>
          </div>

          {/* Exercises Schedule List */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase text-graphite tracking-widest mb-4">
              Scheduled Exercises & Target Parameters
            </h3>
            <div className="flex flex-col gap-3">
              {plan.plan_exercises.map((item, idx) => {
                const exercise = item.exercise;
                return (
                  <div
                    key={item.id}
                    className="p-4 border border-borderLine bg-bone flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-graphite"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-olive">#{idx + 1}</span>
                        <h4 className="font-mono text-base font-bold uppercase text-graphite">
                          {exercise?.name || 'Exercise'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-charcoal">
                        <span>Target: <strong className="font-mono">{item.sets || 3} sets × {item.reps || '10'} reps</strong></span>
                        <span>•</span>
                        <span>Rest: <strong className="font-mono">{item.rest_seconds || 90}s</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {exercise?.primary_muscle && (
                        <Badge variant="olive">{exercise.primary_muscle}</Badge>
                      )}
                      {exercise?.id && (
                        <NavLink to={`/workout/exercise/${exercise.id}`}>
                          <Button variant="secondary">View Spec →</Button>
                        </NavLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        /* No Plan State: Plan Generator */
        <Card className="p-8 text-center flex flex-col items-center justify-center gap-6">
          <div>
            <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-1">
              No Active Plan Found
            </span>
            <h3 className="text-2xl font-bold uppercase text-graphite font-mono">
              Generate Your Personalized Routine
            </h3>
            <p className="text-xs text-charcoal max-w-md mt-2 font-sans">
              Calibrate a workout routine matching your physical metrics, primary goal, and available equipment.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-md">
            <Select
              label="Weekly Training Frequency"
              options={DAYS_OPTIONS}
              value={selectedDays}
              onChange={(e) => setSelectedDays(e.target.value)}
              disabled={isGenerating}
            />
            <div className="pt-6">
              <Button variant="primary" onClick={handleGeneratePlan} isLoading={isGenerating}>
                Generate Plan →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Session Preview Card */}
      {recentLog && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs uppercase font-bold text-graphite tracking-widest flex items-center gap-2">
              <span>⏱️</span> Last Completed Workout Session
            </span>
            <NavLink to="/workout/history" className="font-mono text-xs uppercase text-olive hover:underline font-bold">
              Full History →
            </NavLink>
          </div>
          <p className="text-xs text-charcoal font-sans">
            Logged on <strong className="font-mono">{new Date(recentLog.started_at).toLocaleDateString()}</strong> — {recentLog.logged_exercises.length} total sets performed.
          </p>
        </Card>
      )}
    </div>
  );
};
