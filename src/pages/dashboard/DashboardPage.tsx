import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getProfileApi } from '../../lib/api/profile';
import { getActiveGoalApi } from '../../lib/api/goals';
import { getActiveWorkoutPlanApi } from '../../lib/api/workout';
import { getTodayNutritionSummaryApi } from '../../lib/api/nutrition';
import { calculateTDEE } from '../../utils/tdeeCalculator';
import type { Profile } from '../../types/profile';
import type { Goal } from '../../types/goal';
import type { WorkoutPlan } from '../../types/workout';
import type { DailyNutritionSummary } from '../../types/nutrition';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<DailyNutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [profileData, goalData, workoutData, nutritionData] = await Promise.allSettled([
          getProfileApi(),
          getActiveGoalApi(),
          getActiveWorkoutPlanApi(),
          getTodayNutritionSummaryApi(),
        ]);

        if (profileData.status === 'fulfilled') {
          setProfile(profileData.value);
        }
        if (goalData.status === 'fulfilled') {
          setGoal(goalData.value);
        }
        if (workoutData.status === 'fulfilled') {
          setWorkoutPlan(workoutData.value);
        }
        if (nutritionData.status === 'fulfilled') {
          setNutritionSummary(nutritionData.value);
        }
      } catch {
        // Fallback to local store user
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const tdeeResult = calculateTDEE({
    weight_kg: profile?.weight_kg || undefined,
    height_cm: profile?.height_cm || undefined,
    date_of_birth: profile?.date_of_birth || undefined,
    gender: profile?.gender || undefined,
    activity_level: profile?.activity_level || undefined,
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Top Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            FitMind AI Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Welcome, {profile?.full_name || user?.full_name || 'Athlete'}
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Your personal baseline metrics and module placeholders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={profile?.onboarding_complete ? 'olive' : 'faded'}>
            {profile?.onboarding_complete ? 'Onboarding Complete' : 'Onboarding Pending'}
          </Badge>
        </div>
      </div>

      {/* Non-blocking Onboarding Reminder (Only when onboarding_complete === false) */}
      {!isLoading && profile?.onboarding_complete === false && (
        <Card className="p-6 border border-olive bg-olive/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-olive font-bold block mb-1">
              Setup Incomplete
            </span>
            <h3 className="text-lg font-bold uppercase tracking-tighter text-graphite">
              Your profile is not fully set up yet.
            </h3>
            <p className="text-xs text-charcoal mt-1 font-sans">
              Complete onboarding to calibrate your fitness plan and personalized recommendations.
            </p>
          </div>
          <NavLink
            to="/onboarding"
            className="px-5 py-2.5 bg-olive text-bone font-mono font-bold text-xs uppercase tracking-widest hover:bg-graphite transition-colors inline-block text-center whitespace-nowrap"
          >
            Complete Onboarding →
          </NavLink>
        </Card>
      )}

      {/* Grid Row 1: Real Calibrated Baseline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Baseline Caloric Expenditure (TDEE) */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
              Estimated TDEE (Mifflin-St Jeor)
            </span>
            <span className="font-mono text-3xl font-bold text-graphite">
              {isLoading ? '...' : `${tdeeResult.tdee} kcal`}
            </span>
            <p className="text-xs text-charcoal mt-2">
              Basal Metabolic Rate: <span className="font-mono font-bold">{tdeeResult.bmr} kcal/day</span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Calibrated from Height ({tdeeResult.heightUsed} cm), Weight ({tdeeResult.weightUsed} kg), and Activity Level.
          </div>
        </Card>

        {/* Card 2: Primary Goal */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
              Primary Active Goal
            </span>
            <span className="font-mono text-xl font-bold uppercase text-graphite block truncate">
              {isLoading ? '...' : goal?.goal_type ? goal.goal_type.replace('_', ' ') : 'General Fitness'}
            </span>
            <p className="text-xs text-charcoal mt-2">
              Target Weight:{' '}
              <span className="font-mono font-bold">
                {goal?.target_weight_kg ? `${goal.target_weight_kg} kg` : 'Not specified'}
              </span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Target Date: {goal?.target_date ? goal.target_date : 'Ongoing routine'}
          </div>
        </Card>

        {/* Card 3: Fitness Score Status */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-olive font-bold block mb-1">
              Fitness Score Status
            </span>
            <span className="font-mono text-lg font-bold text-graphite block">
              Baseline Calibrated
            </span>
            <p className="text-xs text-charcoal mt-2">
              Fitness score tracking will activate after your first logged workout session.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Phase 6 Fitness Score Engine Pending
          </div>
        </Card>
      </div>

      {/* Grid Row 2: Structural Module Placeholders (Honest Display) */}
      <h2 className="text-xl font-bold tracking-tighter uppercase text-graphite font-mono pt-4 border-t border-borderLine">
        Core Application Modules
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Workout Module (Live Integration) */}
        <Card className="p-6 flex flex-col justify-between border-solid">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🏋️</span> Workout System
              </span>
              <Badge variant="olive">Phase 3 Active</Badge>
            </div>
            <h3 className="font-mono text-sm font-bold uppercase text-graphite mb-1">
              {workoutPlan ? workoutPlan.name : 'Routine Ready'}
            </h3>
            <p className="text-xs text-charcoal font-sans">
              {workoutPlan
                ? `${workoutPlan.plan_exercises.length} exercises scheduled • ${workoutPlan.days_per_week || 4} days/week`
                : 'View active workout plan, track completed sets, and start live training sessions.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Endpoint: /api/v1/workout</span>
            <NavLink
              to="/workout"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              Open Workout Module →
            </NavLink>
          </div>
        </Card>

        {/* Module 2: Nutrition Module (Live Integration) */}
        <Card className="p-6 flex flex-col justify-between border-solid">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🥗</span> Nutrition System
              </span>
              <Badge variant="olive">Phase 4 Active</Badge>
            </div>
            <h3 className="font-mono text-sm font-bold uppercase text-graphite mb-1">
              {nutritionSummary
                ? `${nutritionSummary.consumed.calories} / ${nutritionSummary.targets.calories} kcal Consumed`
                : 'Nutrition Progress'}
            </h3>
            <p className="text-xs text-charcoal font-sans">
              {nutritionSummary
                ? `Protein: ${nutritionSummary.consumed.protein_g}g / ${nutritionSummary.targets.protein_g}g • ${nutritionSummary.remaining.calories} kcal remaining`
                : 'Log meal sessions, track portion sizes, and monitor protein/carbs/fat targets.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Endpoint: /api/v1/nutrition</span>
            <NavLink
              to="/nutrition"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              Open Nutrition Module →
            </NavLink>
          </div>
        </Card>

        {/* Module 3: Progress Module Placeholder */}
        <Card className="p-6 flex flex-col justify-between border-dashed">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>📈</span> Progress Tracking
              </span>
              <Badge variant="faded">Phase 5</Badge>
            </div>
            <p className="text-xs text-charcoal">
              Weight history charts, body measurement logs, and progress photos will be built in Phase 5.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Endpoint: /api/v1/progress</span>
            <NavLink
              to="/progress"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              View Module →
            </NavLink>
          </div>
        </Card>

        {/* Module 4: AI Coach Placeholder */}
        <Card className="p-6 flex flex-col justify-between border-dashed">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🤖</span> AI Coach
              </span>
              <Badge variant="faded">Phase 7</Badge>
            </div>
            <p className="text-xs text-charcoal">
              Persistent user memory, proactive coaching tips, and chat interface will launch in Phase 7.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Endpoint: /api/v1/coach</span>
            <NavLink
              to="/coach"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              View Module →
            </NavLink>
          </div>
        </Card>
      </div>
    </div>
  );
};
