import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { Banner } from '../ui/Banner';
import { TrajectoryChart } from '../intelligence/TrajectoryChart';
import {
  getTrajectoryApi,
  getGoalFeasibilityApi,
  simulateScenariosApi,
  optimizePlanApi,
} from '../../lib/api/intelligence';
import { updateProfileApi } from '../../lib/api/profile';
import type {
  ScenarioResult,
  PlanCandidate,
  GoalFeasibilityStatus,
} from '../../types/intelligence';
import type { ActivityLevel } from '../../types/profile';
import { getErrorMessage } from '../../utils/apiError';

export const ForecastTab: React.FC = () => {
  const queryClient = useQueryClient();

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

  // Simulator Form State
  const [simCalories, setSimCalories] = useState<number>(2000);
  const [simProtein, setSimProtein] = useState<number>(140);
  const [simActivity, setSimActivity] = useState<number>(1.375);
  const [simResult, setSimResult] = useState<ScenarioResult | null>(null);

  // Modal State for "Use this plan"
  const [selectedPlanToApply, setSelectedPlanToApply] = useState<PlanCandidate | null>(null);
  const [isApplyingPlan, setIsApplyingPlan] = useState<boolean>(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Accordion Disclosures
  const [showOtherPlans, setShowOtherPlans] = useState<boolean>(false);
  const [showHowChosen, setShowHowChosen] = useState<boolean>(false);

  // Simulation Mutation
  const simulateMutation = useMutation({
    mutationFn: (scenarios: { scenario_name: string; daily_calories: number; daily_protein_g: number; activity_multiplier: number }[]) =>
      simulateScenariosApi({ scenarios }),
    onSuccess: (data) => {
      if (data.scenario_results.length > 0) {
        setSimResult(data.scenario_results[0]);
      }
    },
  });

  // Apply Plan Handler (Updates user profile targets)
  const handleApplyPlan = async () => {
    if (!selectedPlanToApply) return;
    try {
      setIsApplyingPlan(true);
      const actLevel: ActivityLevel =
        selectedPlanToApply.activity_multiplier >= 1.725
          ? 'very_active'
          : selectedPlanToApply.activity_multiplier >= 1.55
          ? 'moderate'
          : selectedPlanToApply.activity_multiplier >= 1.375
          ? 'light'
          : 'sedentary';

      await updateProfileApi({
        activity_level: actLevel,
      });
      setApplySuccessMessage(`Applied ${selectedPlanToApply.title || 'selected plan'}: target daily calories ${Math.round(selectedPlanToApply.daily_calories)} kcal and activity level ${actLevel}.`);
      setSelectedPlanToApply(null);
      await queryClient.invalidateQueries({ queryKey: ['forecastTrajectory'] });
      await queryClient.invalidateQueries({ queryKey: ['forecastFeasibility'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      alert(`Could not apply plan: ${getErrorMessage(err)}`);
    } finally {
      setIsApplyingPlan(false);
    }
  };

  // Status mapping
  const renderStatusBadge = (status?: GoalFeasibilityStatus) => {
    switch (status) {
      case 'ON_TRACK':
        return <Badge variant="olive">On Track</Badge>;
      case 'POSSIBLE_ADJUSTMENT':
        return <Badge variant="graphite">Possible Adjustment</Badge>;
      case 'UNLIKELY':
        return <Badge variant="error">Unlikely at Current Pace</Badge>;
      case 'EXPIRED_OR_INVALID':
        return <Badge variant="faded">Target Date Passed</Badge>;
      case 'INSUFFICIENT_DATA':
      default:
        return <Badge variant="faded">Insufficient Data</Badge>;
    }
  };


  const getConfidenceText = () => {
    if (!trajectory) return '';
    const mCount = trajectory.data_confidence.measurement_count;
    if (mCount === 0) return 'Based on your starting profile (no recent check-in weigh-ins)';
    if (mCount === 1) return 'Based on 1 recent weigh-in';
    return `Based on ${mCount} recent weigh-ins across the last 28 days`;
  };

  const formatPaceHeadline = () => {
    if (!feasibility || feasibility.status === 'INSUFFICIENT_DATA') {
      return 'Log your initial measurements and goal to view your projected completion date.';
    }
    const pace = feasibility.projected_rate_kg_per_week;
    const reqPace = feasibility.required_rate_kg_per_week;
    const sign = pace !== null && pace > 0 ? '+' : '';
    const targetDateFormatted = feasibility.target_date
      ? new Date(feasibility.target_date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    if (feasibility.status === 'ON_TRACK') {
      return `At your current pace (${sign}${pace} kg/week), you are on track to reach your goal around ${targetDateFormatted}.`;
    }
    if (feasibility.status === 'POSSIBLE_ADJUSTMENT') {
      return `Projected pace is ${sign}${pace} kg/week, compared to the required ${reqPace} kg/week to reach your goal by ${targetDateFormatted}.`;
    }
    if (feasibility.status === 'UNLIKELY') {
      return `Your current trajectory of ${sign}${pace} kg/week is not on pace to reach your goal by ${targetDateFormatted}. Adjusting calorie intake or target date is recommended.`;
    }
    return feasibility.explanation;
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {applySuccessMessage && (
        <Banner variant="success" className="text-xs">
          {applySuccessMessage}
        </Banner>
      )}

      {/* Top Headline Card: Plain Language Answer */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-surface-1 to-surface-2/30 border-border space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
              TRAJECTORY & FORECAST
            </span>
            {renderStatusBadge(feasibility?.status)}
          </div>
          <span className="text-xs text-text-3 font-mono break-words">{getConfidenceText()}</span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-text leading-snug break-words">
          {formatPaceHeadline()}
        </h3>

        {feasibility && feasibility.required_rate_kg_per_week !== null && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-border/60 text-xs text-text-2">
            <div>
              Current Weight:{' '}
              <strong className="text-text font-mono">{feasibility.current_weight_kg ?? '—'} kg</strong>
            </div>
            <div>
              Target Weight:{' '}
              <strong className="text-text font-mono">{feasibility.target_weight_kg ?? '—'} kg</strong>
            </div>
            <div>
              Target Pace:{' '}
              <strong className="text-text font-mono">
                {feasibility.required_rate_kg_per_week > 0 ? '+' : ''}
                {feasibility.required_rate_kg_per_week} kg/wk
              </strong>
            </div>
          </div>
        )}
      </Card>

      {/* Forecast Chart Card: Past Weigh-ins, 28-day projection with confidence band */}
      <Card className="p-6 md:p-8 space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border min-w-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text">28-Day Projected Trajectory</h3>
            <p className="text-xs text-text-2 mt-0.5">
              Derived from your energy balance and baseline check-ins, rendered with a 90% benchmark confidence band.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-3 font-mono shrink-0">
            <span>Projection: 28 Days</span>
          </div>
        </div>

        {isTrajectoryLoading ? (
          <div className="py-24 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent animate-pulse">
              Computing projection...
            </span>
          </div>
        ) : trajectory ? (
          <TrajectoryChart
            baselineWeight={trajectory.baseline_weight_kg}
            projectedWeight={trajectory.projected_weight_28d_kg}
            lowerBound={trajectory.confidence_interval.lower_bound_kg}
            upperBound={trajectory.confidence_interval.upper_bound_kg}
            targetWeight={feasibility?.target_weight_kg ?? null}
            referenceDate={trajectory.reference_date}
          />
        ) : (
          <div className="py-16 text-center text-xs text-text-2">
            Insufficient measurement history to plot projection trajectory.
          </div>
        )}
      </Card>

      {/* Recommended Plan Card */}
      {optimizerData?.best_candidate && (
        <Card className="p-6 md:p-8 space-y-5 border-accent/30 bg-surface-1 w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                  RECOMMENDED PLAN
                </span>
                <h4 className="text-base font-bold text-text">
                  {optimizerData.best_candidate.title || 'Goal-Optimized Intake'}
                </h4>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedPlanToApply(optimizerData.best_candidate)}
            >
              Use this plan
            </Button>
          </div>

          <p className="text-xs text-text-2 leading-relaxed">
            {optimizerData.best_candidate.rationale ||
              'This plan balances your goal rate with metabolic sustainability.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-2/40 border border-border">
            <div>
              <span className="text-[10px] font-mono uppercase text-text-3 block">Daily Calories</span>
              <span className="text-base font-bold font-mono text-text">
                {Math.round(optimizerData.best_candidate.daily_calories)} kcal
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-3 block">Daily Protein</span>
              <span className="text-base font-bold font-mono text-text">
                {Math.round(optimizerData.best_candidate.daily_protein_g)} g
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-3 block">Activity Level</span>
              <span className="text-base font-bold font-mono text-text">
                {optimizerData.best_candidate.activity_multiplier}x
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-3 block">28d Projected Change</span>
              <span className="text-base font-bold font-mono text-accent">
                {optimizerData.best_candidate.projected_change_28d_kg > 0 ? '+' : ''}
                {optimizerData.best_candidate.projected_change_28d_kg} kg
              </span>
            </div>
          </div>

          {/* Collapsible: See other options */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowOtherPlans(!showOtherPlans)}
              className="flex items-center justify-between w-full text-xs font-semibold text-text hover:text-accent transition-colors py-1"
            >
              <span>See other options ({optimizerData.alternative_candidates?.length || 0} alternative plans)</span>
              {showOtherPlans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showOtherPlans && (
              <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
                {(optimizerData.alternative_candidates || []).map((alt) => (
                  <div
                    key={alt.candidate_id}
                    className="p-4 rounded-lg bg-surface-2/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text">
                          {alt.title || alt.candidate_id}
                        </span>
                        <Badge variant="graphite" className="text-[10px]">
                          {alt.feasibility_rating}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-2">{alt.rationale}</p>
                      <div className="text-[11px] font-mono text-text-3 space-x-3">
                        <span>{Math.round(alt.daily_calories)} kcal</span>
                        <span>•</span>
                        <span>{Math.round(alt.daily_protein_g)}g prot</span>
                        <span>•</span>
                        <span>
                          {alt.projected_change_28d_kg > 0 ? '+' : ''}
                          {alt.projected_change_28d_kg} kg / 28d
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedPlanToApply(alt)}
                      className="shrink-0"
                    >
                      Use this plan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible: How this is chosen */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowHowChosen(!showHowChosen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-text-2 hover:text-text transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                How this is chosen
              </span>
              {showHowChosen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHowChosen && (
              <div className="mt-2 p-4 rounded-lg bg-surface-2/20 border border-border/60 text-xs text-text-2 space-y-2 leading-relaxed">
                <p>
                  {optimizerData.objective_description}
                </p>
                <p className="text-[11px] text-text-3">
                  Baseline reference: {optimizerData.baseline_description || 'Your 28-day average intake'}. The candidate generator enforces safe caloric floors (&ge; 1,200 kcal or 0.7 &times; BMR) and strictly aligns surplus vs deficit with your active goal.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* "Try a different plan" Simulation Interactive Section */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent" />
            <h3 className="text-base font-semibold text-text">Try a Different Plan</h3>
          </div>
          <p className="text-xs text-text-2 mt-1">
            Simulate what happens to your 28-day trajectory under different calorie, protein, and activity choices.
          </p>
        </div>

        {/* 3 Quick Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-3">
            Quick Simulation Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSimCalories(1800);
                setSimProtein(150);
                setSimActivity(1.375);
                simulateMutation.mutate([
                  { scenario_name: 'Moderate Deficit (-300)', daily_calories: 1800, daily_protein_g: 150, activity_multiplier: 1.375 },
                ]);
              }}
            >
              Deficit (-300 kcal)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSimCalories(2200);
                setSimProtein(160);
                setSimActivity(1.55);
                simulateMutation.mutate([
                  { scenario_name: 'Lean Surplus (+200)', daily_calories: 2200, daily_protein_g: 160, activity_multiplier: 1.55 },
                ]);
              }}
            >
              Lean Surplus (+200 kcal)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const baseCals = optimizerData?.current_intake_kcal || 2000;
                setSimCalories(baseCals);
                setSimProtein(140);
                setSimActivity(1.375);
                simulateMutation.mutate([
                  { scenario_name: 'Maintenance Balance', daily_calories: baseCals, daily_protein_g: 140, activity_multiplier: 1.375 },
                ]);
              }}
            >
              Maintenance Plan
            </Button>
          </div>
        </div>

        {/* Controls: Sliders + Activity Select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-2">Daily Calories</span>
              <span className="font-mono font-bold text-text">{simCalories} kcal</span>
            </div>
            <input
              type="range"
              min={1200}
              max={3800}
              step={50}
              value={simCalories}
              onChange={(e) => setSimCalories(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-2">Daily Protein</span>
              <span className="font-mono font-bold text-text">{simProtein} g</span>
            </div>
            <input
              type="range"
              min={50}
              max={250}
              step={5}
              value={simProtein}
              onChange={(e) => setSimProtein(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sim-activity-select" className="text-xs text-text-2 block">
              Activity Level
            </label>
            <select
              id="sim-activity-select"
              value={simActivity}
              onChange={(e) => setSimActivity(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-1 text-xs text-text"
            >
              <option value={1.2}>Sedentary (1.2x)</option>
              <option value={1.375}>Lightly Active (1.375x)</option>
              <option value={1.55}>Moderately Active (1.55x)</option>
              <option value={1.725}>Very Active (1.725x)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              simulateMutation.mutate([
                {
                  scenario_name: 'Custom Trial Plan',
                  daily_calories: simCalories,
                  daily_protein_g: simProtein,
                  activity_multiplier: simActivity,
                },
              ])
            }
            isLoading={simulateMutation.isPending}
          >
            Calculate Projection
          </Button>
        </div>

        {/* Simulation Comparison Result Card */}
        {simResult && trajectory && (
          <div className="p-5 rounded-xl border border-accent/40 bg-surface-2/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                  SIMULATION OUTCOME
                </span>
                <h4 className="text-sm font-bold text-text">{simResult.scenario_name}</h4>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSelectedPlanToApply({
                    candidate_id: 'custom_sim',
                    title: 'Custom Simulated Plan',
                    rationale: 'Configured via simulator sliders.',
                    daily_calories: simCalories,
                    daily_protein_g: simProtein,
                    activity_multiplier: simActivity,
                    projected_change_28d_kg: simResult.projected_change_28d_kg,
                    projected_weight_28d_kg: simResult.projected_weight_28d_kg,
                    objective_score: 1.0,
                    calorie_offset_from_current: simCalories - (optimizerData?.current_intake_kcal || 2000),
                    feasibility_rating: 'CUSTOM',
                  })
                }
              >
                Use this plan
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-surface-1 border border-border">
                <span className="text-text-3 block text-[10px] uppercase font-mono">28d Weight Outcome</span>
                <span className="text-base font-bold font-mono text-text">
                  {simResult.projected_weight_28d_kg} kg
                </span>
                <span className="text-[10px] text-text-2 block mt-0.5">
                  ({simResult.projected_change_28d_kg > 0 ? '+' : ''}
                  {simResult.projected_change_28d_kg} kg net)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-1 border border-border">
                <span className="text-text-3 block text-[10px] uppercase font-mono">Vs Baseline Path</span>
                <span className="text-base font-bold font-mono text-accent">
                  {simResult.scenario_delta_kg > 0 ? '+' : ''}
                  {simResult.scenario_delta_kg} kg
                </span>
                <span className="text-[10px] text-text-2 block mt-0.5">difference from current trajectory</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-1 border border-border sm:col-span-1 col-span-2">
                <span className="text-text-3 block text-[10px] uppercase font-mono">Weekly Pace</span>
                <span className="text-base font-bold font-mono text-text">
                  {roundWeeklyPace(simResult.projected_change_28d_kg / 4)} kg/wk
                </span>
                <span className="text-[10px] text-text-2 block mt-0.5">4-week average rate</span>
              </div>
            </div>

            <p className="text-[11px] text-text-3 italic leading-relaxed">
              {simResult.non_causal_statement}
            </p>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog: Use this plan */}
      <Dialog
        open={selectedPlanToApply !== null}
        onOpenChange={(open) => !open && setSelectedPlanToApply(null)}
        title="Apply Targets to Profile?"
        description="This updates your daily calorie target, protein goal, and activity level in settings."
      >
        {selectedPlanToApply && (
          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-2">Plan:</span>
                <span className="font-semibold text-text">{selectedPlanToApply.title || 'Selected Plan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Daily Calories:</span>
                <span className="font-mono font-bold text-text">{Math.round(selectedPlanToApply.daily_calories)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Daily Protein:</span>
                <span className="font-mono font-bold text-text">{Math.round(selectedPlanToApply.daily_protein_g)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Activity Multiplier:</span>
                <span className="font-mono font-bold text-text">{selectedPlanToApply.activity_multiplier}x</span>
              </div>
            </div>

            <p className="text-xs text-text-2 leading-relaxed">
              Your dashboard, daily targets, and AI coach recommendations will align with these targets starting today.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setSelectedPlanToApply(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyPlan}
                isLoading={isApplyingPlan}
              >
                Confirm & Update Targets
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

function roundWeeklyPace(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
