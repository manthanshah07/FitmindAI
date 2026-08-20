import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FitnessScoreCard } from '../../components/progress/FitnessScoreCard';
import { getDashboardSummaryApi } from '../../lib/api/dashboard';
import { getErrorMessage } from '../../utils/apiError';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const {
    data: summary,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => getDashboardSummaryApi(),
  });

  const error = queryError ? getErrorMessage(queryError) : null;
  const weekly = summary?.weekly_summary;

  return (
    <div className="flex flex-col gap-8">
      {/* Top Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            FitMind AI Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Welcome, {summary?.full_name || user?.full_name || 'Athlete'}
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Your personal fitness metrics, weekly adherence, and active coaching modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={summary?.onboarding_complete ? 'olive' : 'faded'}>
            {summary?.onboarding_complete ? 'Onboarding Complete' : 'Onboarding Pending'}
          </Badge>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <Card className="p-4 border border-rose-500 bg-rose-50 text-rose-800 text-xs font-mono">
          <span className="font-bold uppercase tracking-wider block mb-1">Error Loading Dashboard</span>
          {error}
        </Card>
      )}

      {/* Non-blocking Onboarding Reminder (Only when onboarding_complete === false) */}
      {!isLoading && summary?.onboarding_complete === false && (
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

      {/* FEATURED: Weekly Progress Overview Card */}
      <Card className="p-6 border-2 border-graphite bg-bone shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-4 mb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-olive font-bold block mb-1">
              Deterministic Analytics
            </span>
            <h2 className="text-xl font-bold tracking-tighter uppercase text-graphite">
              Weekly Progress Overview
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={weekly?.adherence_label === 'High' ? 'olive' : weekly?.adherence_label === 'Moderate' ? 'graphite' : 'faded'}>
              {weekly?.adherence_score !== null && weekly?.adherence_score !== undefined

                ? `${weekly.adherence_label.toUpperCase()} ADHERENCE (${weekly.adherence_score}%)`
                : 'INSUFFICIENT DATA'}
            </Badge>
            <NavLink
              to="/reports"
              className="px-4 py-2 bg-olive text-bone font-mono font-bold text-xs uppercase tracking-widest hover:bg-graphite transition-colors inline-block text-center whitespace-nowrap"
            >
              View Full Weekly Report →
            </NavLink>
          </div>
        </div>

        {/* Overview Metric Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Metric 1: Workouts Completed */}
          <div className="p-3 border border-borderLine bg-white">
            <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal block mb-1">
              Workouts
            </span>
            <span className="font-mono text-lg font-bold text-graphite block">
              {isLoading ? '...' : `${weekly?.workouts_completed || 0} / ${weekly?.target_workouts || 4}`}
            </span>
            <span className="text-[10px] font-mono text-faded block mt-1">
              {weekly?.workout_completion_pct !== null && weekly?.workout_completion_pct !== undefined
                ? `${weekly.workout_completion_pct}% completion`
                : 'No workouts logged'}
            </span>
          </div>

          {/* Metric 2: Nutrition Logging Days */}
          <div className="p-3 border border-borderLine bg-white">
            <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal block mb-1">
              Nutrition Days
            </span>
            <span className="font-mono text-lg font-bold text-graphite block">
              {isLoading ? '...' : `${weekly?.nutrition_logged_days || 0} / 7 Days`}
            </span>
            <span className="text-[10px] font-mono text-faded block mt-1">
              {weekly?.nutrition_logged_days
                ? `${Math.round(((weekly?.nutrition_logged_days || 0) / 7) * 100)}% logged`
                : 'No meals logged'}
            </span>
          </div>

          {/* Metric 3: Fitness Score Trend */}
          <div className="p-3 border border-borderLine bg-white">
            <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal block mb-1">
              Fitness Score
            </span>
            <span className="font-mono text-lg font-bold text-graphite block">
              {isLoading ? '...' : weekly?.current_fitness_score !== null && weekly?.current_fitness_score !== undefined ? `${weekly.current_fitness_score} pts` : '--'}
            </span>
            <span className="text-[10px] font-mono text-olive font-bold block mt-1">
              {weekly?.fitness_score_change !== null && weekly?.fitness_score_change !== undefined
                ? `${weekly.fitness_score_change >= 0 ? '+' : ''}${weekly.fitness_score_change} pts (${weekly.fitness_score_trend})`
                : 'Score calibrated'}
            </span>
          </div>

          {/* Metric 4: Weight Change */}
          <div className="p-3 border border-borderLine bg-white">
            <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal block mb-1">
              Net Weight Delta
            </span>
            <span className="font-mono text-lg font-bold text-graphite block">
              {isLoading ? '...' : weekly?.weight_change_kg !== null && weekly?.weight_change_kg !== undefined ? `${weekly.weight_change_kg > 0 ? '+' : ''}${weekly.weight_change_kg} kg` : '--'}
            </span>
            <span className="text-[10px] font-mono text-faded block mt-1">
              {weekly?.weight_change_kg !== null && weekly?.weight_change_kg !== undefined ? 'Recorded change' : 'No weight logs'}
            </span>
          </div>
        </div>
      </Card>

      {/* Grid Row 1: Real Calibrated Baseline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Baseline Caloric Expenditure (TDEE) */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
              Estimated TDEE (Server Calibrated)
            </span>
            <span className="font-mono text-3xl font-bold text-graphite">
              {isLoading ? '...' : `${summary?.tdee_calories || 2000} kcal`}
            </span>
            <p className="text-xs text-charcoal mt-2 font-sans">
              Basal Metabolic Rate: <span className="font-mono font-bold">{summary?.bmr_calories || 1600} kcal/day</span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Target Daily Intake: {summary?.target_calories || 2000} kcal ({summary?.target_protein_g || 150}g protein)
          </div>
        </Card>

        {/* Card 2: Primary Goal */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faded block mb-1">
              Primary Active Goal
            </span>
            <span className="font-mono text-xl font-bold uppercase text-graphite block truncate">
              {isLoading ? '...' : summary?.goal?.goal_type ? summary.goal.goal_type.replace('_', ' ') : 'General Fitness'}
            </span>
            <p className="text-xs text-charcoal mt-2 font-sans">
              Target Weight:{' '}
              <span className="font-mono font-bold">
                {summary?.goal?.target_weight_kg ? `${summary.goal.target_weight_kg} kg` : 'Not specified'}
              </span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Target Date: {summary?.goal?.target_date ? summary.goal.target_date : 'Ongoing routine'}
          </div>
        </Card>

        {/* Card 3: Today's Consumed Nutrition */}
        <Card className="flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-olive font-bold block mb-1">
              Today's Nutrition Tracker
            </span>
            <span className="font-mono text-xl font-bold text-graphite block">
              {isLoading ? '...' : `${summary?.today_nutrition.consumed_calories || 0} / ${summary?.today_nutrition.target_calories || 2000} kcal`}
            </span>
            <p className="text-xs text-charcoal mt-2 font-sans">
              Protein: <span className="font-mono font-bold">{summary?.today_nutrition.consumed_protein_g || 0}g / {summary?.today_nutrition.target_protein_g || 150}g</span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-borderLine text-[10px] font-mono text-faded">
            Remaining: {summary?.today_nutrition.remaining_calories || 0} kcal
          </div>
        </Card>
      </div>

      {/* Grid Row 2: Core Application Modules */}
      <h2 className="text-xl font-bold tracking-tighter uppercase text-graphite font-mono pt-4 border-t border-borderLine">
        Core Application Modules
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Workout Module */}
        <Card className="p-6 flex flex-col justify-between border-solid">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🏋️</span> Workout System
              </span>
              <Badge variant="olive">Active</Badge>
            </div>
            <h3 className="font-mono text-sm font-bold uppercase text-graphite mb-1">
              {summary?.workout_plan ? summary.workout_plan.name : 'Routine Ready'}
            </h3>
            <p className="text-xs text-charcoal font-sans">
              {summary?.workout_plan
                ? `${summary.workout_plan.exercise_count} exercises scheduled • ${summary.workout_plan.days_per_week} days/week`
                : 'View active workout plan, track completed sets, and start live training sessions.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Daily Workout Routine</span>
            <NavLink
              to="/workout"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              Open Workout Module →
            </NavLink>
          </div>
        </Card>

        {/* Module 2: Nutrition Module */}
        <Card className="p-6 flex flex-col justify-between border-solid">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🥗</span> Nutrition System
              </span>
              <Badge variant="olive">Active</Badge>
            </div>
            <h3 className="font-mono text-sm font-bold uppercase text-graphite mb-1">
              {summary?.today_nutrition
                ? `${summary.today_nutrition.consumed_calories} / ${summary.today_nutrition.target_calories} kcal Consumed`
                : 'Nutrition Progress'}
            </h3>
            <p className="text-xs text-charcoal font-sans">
              {summary?.today_nutrition
                ? `Protein: ${summary.today_nutrition.consumed_protein_g}g / ${summary.today_nutrition.target_protein_g}g • ${summary.today_nutrition.remaining_calories} kcal remaining`
                : 'Log meal sessions, track portion sizes, and monitor protein/carbs/fat targets.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">Daily Nutrition Tracker</span>
            <NavLink
              to="/nutrition"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline"
            >
              Open Nutrition Module →
            </NavLink>
          </div>
        </Card>

        {/* Module 3: Fitness Score & Progress Module */}
        <FitnessScoreCard compact={true} />

        {/* Module 4: Active AI Coach */}
        <Card className="p-6 flex flex-col justify-between border-solid">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <span>🤖</span> AI Coach Module
              </span>
              <Badge variant="olive">Active AI Coach</Badge>
            </div>
            <p className="text-xs text-charcoal font-sans">
              Conversational AI coaching assistant with persistent memory, real-time analytics context, and tailored recommendations.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-borderLine flex items-center justify-between">
            <span className="font-mono text-[10px] text-faded uppercase">AI Fitness Assistant</span>
            <NavLink
              to="/coach"
              className="font-mono text-xs uppercase font-bold text-olive hover:underline font-mono font-bold"
            >
              Chat with Coach →
            </NavLink>
          </div>
        </Card>
      </div>
    </div>
  );
};
