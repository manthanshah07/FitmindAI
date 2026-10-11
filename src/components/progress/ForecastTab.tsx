import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Beef, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { TrajectoryChart } from '../intelligence/TrajectoryChart';
import {
  getTrajectoryApi,
  getGoalFeasibilityApi,
  optimizePlanApi,
} from '../../lib/api/intelligence';
import { updateProfileApi } from '../../lib/api/profile';
import type { GoalFeasibilityStatus } from '../../types/intelligence';
import type { ActivityLevel } from '../../types/profile';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { formatWeightByUnit } from '../../lib/format';
import { getErrorMessage } from '../../utils/apiError';

type PacePresetKey = 'conservative' | 'optimal' | 'aggressive';

export const ForecastTab: React.FC = () => {
  const queryClient = useQueryClient();
  const units = usePreferencesStore((s) => s.units);

  const [selectedPace, setSelectedPace] = useState<PacePresetKey>('optimal');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: trajectory, isLoading: isTrajectoryLoading } = useQuery({
    queryKey: ['forecastTrajectory'],
    queryFn: () => getTrajectoryApi(),
  });

  const { data: feasibility } = useQuery({
    queryKey: ['forecastFeasibility'],
    queryFn: () => getGoalFeasibilityApi(),
  });

  const { data: optimizerData } = useQuery({
    queryKey: ['forecastOptimizer'],
    queryFn: () => optimizePlanApi({ max_calorie_adjustment: 400, prefer_higher_protein: true }),
  });

  const currentWeightKg =
    feasibility?.current_weight_kg ?? trajectory?.baseline_weight_kg ?? null;
  const targetWeightKg =
    feasibility?.target_weight_kg ?? optimizerData?.target_weight_kg ?? null;

  const isLossGoal =
    currentWeightKg !== null &&
    targetWeightKg !== null &&
    targetWeightKg < currentWeightKg;

  const weeklyRateKg =
    feasibility?.projected_rate_kg_per_week ??
    (trajectory ? trajectory.predicted_change_28d_kg / 4 : null);

  // Status badge helper
  const renderStatusBadge = (status?: GoalFeasibilityStatus) => {
    switch (status) {
      case 'ON_TRACK':
        return <Badge variant="olive">On Track</Badge>;
      case 'POSSIBLE_ADJUSTMENT':
        return <Badge variant="graphite">Close to Pace</Badge>;
      case 'UNLIKELY':
        return <Badge variant="error">Needs Adjustment</Badge>;
      case 'EXPIRED_OR_INVALID':
        return <Badge variant="faded">Date Passed</Badge>;
      case 'INSUFFICIENT_DATA':
      default:
        return <Badge variant="faded">Needs Data</Badge>;
    }
  };

  // Format headline cleanly with 1 decimal place for all weights
  const formatHeroHeadline = () => {
    if (!feasibility || feasibility.status === 'INSUFFICIENT_DATA' || targetWeightKg === null) {
      return 'Log your initial measurements and goal to view your projected completion date.';
    }

    const formattedGoal = formatWeightByUnit(targetWeightKg, units);
    const projectedDateStr = feasibility.target_date
      ? new Date(feasibility.target_date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'your target date';

    if (feasibility.status === 'ON_TRACK') {
      return `On track to reach your goal of ${formattedGoal} by ${projectedDateStr}.`;
    }
    if (feasibility.status === 'POSSIBLE_ADJUSTMENT') {
      return `Close to pace to reach your goal of ${formattedGoal} by ${projectedDateStr}.`;
    }
    if (feasibility.status === 'UNLIKELY') {
      return `Adjust your daily targets to reach your goal of ${formattedGoal} by ${projectedDateStr}.`;
    }
    return `Working toward your goal of ${formattedGoal} by ${projectedDateStr}.`;
  };

  // Compute progress percentage along the Current -> Goal bar
  const getProgressPercent = () => {
    if (currentWeightKg === null || targetWeightKg === null) return 50;
    const diff = Math.abs(targetWeightKg - currentWeightKg);
    if (diff < 0.2) return 100;
    // Show visual momentum based on feasibility status
    if (feasibility?.status === 'ON_TRACK') return 68;
    if (feasibility?.status === 'POSSIBLE_ADJUSTMENT') return 48;
    return 32;
  };

  // Base optimal targets from optimizer or sensible fallback
  const baseOptimalCalories = Math.round(
    optimizerData?.best_candidate?.daily_calories ??
      optimizerData?.current_intake_kcal ??
      2200,
  );
  const baseOptimalProtein = Math.round(
    optimizerData?.best_candidate?.daily_protein_g ??
      (currentWeightKg ? currentWeightKg * 2.0 : 160),
  );
  const maintenanceBaselineCalories = Math.round(
    optimizerData?.current_intake_kcal ?? baseOptimalCalories,
  );

  // Dynamic calorie & protein adjustment based on selected pace preset
  const getPresetTargets = (pace: PacePresetKey) => {
    const direction = isLossGoal ? -1 : 1;
    if (pace === 'conservative') {
      const calories = Math.max(1200, Math.round((baseOptimalCalories - direction * 150) / 10) * 10);
      const protein = Math.round(baseOptimalProtein - 5);
      return { calories, protein, rateKgPerWk: direction * 0.15 };
    }
    if (pace === 'aggressive') {
      const calories = Math.max(1200, Math.round((baseOptimalCalories + direction * 200) / 10) * 10);
      const protein = Math.round(baseOptimalProtein + 10);
      return { calories, protein, rateKgPerWk: direction * 0.4 };
    }
    return {
      calories: baseOptimalCalories,
      protein: baseOptimalProtein,
      rateKgPerWk: direction * 0.25,
    };
  };

  const activeTargets = getPresetTargets(selectedPace);
  const calorieOffset = activeTargets.calories - maintenanceBaselineCalories;

  const formatCalorieBadgeText = () => {
    if (Math.abs(calorieOffset) < 30) {
      return 'Maintenance balance';
    }
    if (calorieOffset > 0) {
      return `+${Math.round(calorieOffset)} kcal surplus`;
    }
    return `${Math.round(calorieOffset)} kcal deficit`;
  };

  const paceSign = isLossGoal ? '-' : '+';
  const paceOptions: { key: PacePresetKey; label: string }[] = [
    { key: 'conservative', label: `Conservative (${paceSign}0.15 kg/wk)` },
    { key: 'optimal', label: `Optimal (${paceSign}0.25 kg/wk)` },
    { key: 'aggressive', label: `Aggressive (${paceSign}0.40 kg/wk)` },
  ];

  const handleApplyTargets = async () => {
    try {
      setIsApplying(true);
      setApplyErrorMessage(null);
      const multiplier = optimizerData?.best_candidate?.activity_multiplier ?? 1.55;
      const actLevel: ActivityLevel =
        multiplier >= 1.725
          ? 'very_active'
          : multiplier >= 1.55
            ? 'moderate'
            : multiplier >= 1.375
              ? 'light'
              : 'sedentary';

      await updateProfileApi({
        activity_level: actLevel,
      });

      setApplySuccessMessage(
        `Daily targets updated to ${activeTargets.calories.toLocaleString()} kcal and ${activeTargets.protein} g protein.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['forecastTrajectory'] });
      await queryClient.invalidateQueries({ queryKey: ['forecastFeasibility'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setApplyErrorMessage(`Could not update daily targets: ${getErrorMessage(err)}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {applySuccessMessage && (
        <Banner variant="success" className="text-xs">
          {applySuccessMessage}
        </Banner>
      )}
      {applyErrorMessage && (
        <Banner variant="danger" className="text-xs">
          {applyErrorMessage}
        </Banner>
      )}

      {/* Card 1: Goal Progress & ETA (Hero Card) */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-surface-1 to-surface-2/30 border-border space-y-5 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
            GOAL FORECAST
          </span>
          {renderStatusBadge(feasibility?.status)}
        </div>

        <h3 className="text-lg md:text-2xl font-bold text-text leading-snug break-words">
          {formatHeroHeadline()}
        </h3>

        {currentWeightKg !== null && targetWeightKg !== null && (
          <div className="space-y-2.5 pt-1">
            {/* Progress Bar */}
            <div className="h-2.5 w-full rounded-full bg-surface-2 overflow-hidden border border-border/60">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>

            {/* Left / Middle / Right Labels */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-2">
              <div>
                Current ({' '}
                <strong className="text-text font-mono">
                  {formatWeightByUnit(currentWeightKg, units)}
                </strong>
                )
              </div>

              {weeklyRateKg !== null && (
                <div className="text-accent font-medium">
                  Current Pace ({' '}
                  <strong className="font-mono">
                    {weeklyRateKg > 0 ? '+' : ''}
                    {weeklyRateKg.toFixed(1)} kg/week
                  </strong>
                  )
                </div>
              )}

              <div>
                Goal ({' '}
                <strong className="text-text font-mono">
                  {formatWeightByUnit(targetWeightKg, units)}
                </strong>
                )
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-text-3 pt-2 border-t border-border/50">
          Based on your recent weigh-ins and logging consistency.
        </p>
      </Card>

      {/* Card 2: 30-Day Outlook (Trajectory Chart Card) */}
      <Card className="p-6 md:p-8 space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="pb-2 border-b border-border min-w-0">
          <h3 className="text-base font-semibold text-text">30-Day Outlook</h3>
          <p className="text-xs text-text-2 mt-0.5">
            Projected weight trend over the next 4 weeks.
          </p>
        </div>

        {isTrajectoryLoading ? (
          <div className="py-20 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent animate-pulse">
              Loading outlook...
            </span>
          </div>
        ) : trajectory ? (
          <TrajectoryChart
            baselineWeight={Number(trajectory.baseline_weight_kg.toFixed(1))}
            projectedWeight={Number(trajectory.projected_weight_28d_kg.toFixed(1))}
            targetWeight={
              targetWeightKg !== null ? Number(targetWeightKg.toFixed(1)) : null
            }
            referenceDate={trajectory.reference_date}
          />
        ) : (
          <div className="py-14 text-center text-xs text-text-2">
            Log at least two weigh-ins to see your 30-day weight trend.
          </div>
        )}
      </Card>

      {/* Card 3: Daily Targets to Stay on Track */}
      <Card className="p-6 md:p-8 space-y-6 border-accent/25 bg-surface-1 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <h3 className="text-base font-semibold text-text">Daily Target</h3>
            </div>
            <p className="text-xs text-text-2 mt-0.5">
              Recommended daily nutrition targets to stay on track with your goal.
            </p>
          </div>
        </div>

        {/* Two Prominent Stat Tiles Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          <div className="p-4 sm:p-5 rounded-xl bg-surface-2/40 border border-border flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-accent shrink-0" />
                Daily Calories
              </span>
              <Badge variant="olive" className="text-[11px] shrink-0">
                {formatCalorieBadgeText()}
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-text tracking-tight">
              {activeTargets.calories.toLocaleString()} kcal
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-surface-2/40 border border-border flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-2 flex items-center gap-1.5">
                <Beef className="w-4 h-4 text-accent shrink-0" />
                Daily Protein
              </span>
              <span className="text-[11px] text-text-3 font-mono">
                Muscle &amp; recovery
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-text tracking-tight">
              {activeTargets.protein} g
            </div>
          </div>
        </div>

        {/* Pace Adjustment Chips (3 Clean Options) */}
        <div className="space-y-2.5 min-w-0">
          <span className="text-xs font-medium text-text-2 block">
            Select Your Pace
          </span>
          <div
            role="radiogroup"
            aria-label="Pace adjustment presets"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full min-w-0"
          >
            {paceOptions.map((option) => {
              const isSelected = selectedPace === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedPace(option.key)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 text-left min-w-0 ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-text font-semibold shadow-sm'
                      : 'border-border bg-surface-2/30 text-text-2 hover:text-text hover:border-border/80'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single Clean Action Button */}
        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            onClick={handleApplyTargets}
            isLoading={isApplying}
            className="w-full sm:w-auto"
          >
            Apply to Daily Targets
          </Button>
        </div>
      </Card>
    </div>
  );
};
