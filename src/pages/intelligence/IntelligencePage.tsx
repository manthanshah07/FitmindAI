import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataConfidenceBadge } from '../../components/intelligence/DataConfidenceBadge';
import { TrajectoryChart } from '../../components/intelligence/TrajectoryChart';
import { ScenarioComparisonChart } from '../../components/intelligence/ScenarioComparisonChart';
import {
  getTrajectoryApi,
  getGoalFeasibilityApi,
  getAdaptationApi,
  simulateScenariosApi,
  optimizePlanApi,
} from '../../lib/api/intelligence';
import type {
  ScenarioResult,
  PlanOptimizationResponse,
  GoalFeasibilityStatus,
  AdaptationStatus,
} from '../../types/intelligence';
import { getErrorMessage } from '../../utils/apiError';

export const IntelligencePage: React.FC = () => {
  // Query: Trajectory Projection (Primary Anchor)
  const {
    data: trajectory,
    isLoading: isTrajectoryLoading,
    error: trajectoryError,
  } = useQuery({
    queryKey: ['intelligence-trajectory'],
    queryFn: () => getTrajectoryApi(),
  });

  // Query: Goal Feasibility
  const {
    data: feasibility,
    isLoading: isFeasibilityLoading,
    error: feasibilityError,
  } = useQuery({
    queryKey: ['intelligence-feasibility'],
    queryFn: () => getGoalFeasibilityApi(),
  });

  // Query: Trajectory Adaptation
  const {
    data: adaptation,
    isLoading: isAdaptationLoading,
    error: adaptationError,
  } = useQuery({
    queryKey: ['intelligence-adaptation'],
    queryFn: () => getAdaptationApi(),
  });

  // Simulator Local Form State
  const [simCalories, setSimCalories] = useState<number>(2100);
  const [simProtein, setSimProtein] = useState<number>(160);
  const [simActivity, setSimActivity] = useState<number>(1.55);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);

  // Simulator Mutation
  const simulateMutation = useMutation({
    mutationFn: (scenariosList: { scenario_name: string; daily_calories: number; daily_protein_g: number; activity_multiplier: number }[]) =>
      simulateScenariosApi({ scenarios: scenariosList }),
    onSuccess: (data) => {
      setScenarioResults(data.scenario_results);
    },
  });

  // Optimizer Local Form & Query State
  const [optMaxAdjustment, setOptMaxAdjustment] = useState<number>(300);
  const [optPreferProtein, setOptPreferProtein] = useState<boolean>(true);
  const [optimizerData, setOptimizerData] = useState<PlanOptimizationResponse | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<boolean>(false);

  // Optimizer Mutation
  const optimizeMutation = useMutation({
    mutationFn: () =>
      optimizePlanApi({
        max_calorie_adjustment: optMaxAdjustment,
        prefer_higher_protein: optPreferProtein,
      }),
    onSuccess: (data) => {
      setOptimizerData(data);
    },
  });

  // Handlers for Simulator
  const handleRunSimulation = () => {
    simulateMutation.mutate([
      {
        scenario_name: 'Custom Simulated Plan',
        daily_calories: simCalories,
        daily_protein_g: simProtein,
        activity_multiplier: simActivity,
      },
    ]);
  };

  const handleApplyPreset = (presetName: string, cals: number, prot: number, act: number) => {
    setSimCalories(cals);
    setSimProtein(prot);
    setSimActivity(act);
    simulateMutation.mutate([
      {
        scenario_name: presetName,
        daily_calories: cals,
        daily_protein_g: prot,
        activity_multiplier: act,
      },
    ]);
  };

  // Status mapping helpers
  const getFeasibilityBadge = (status: GoalFeasibilityStatus) => {
    switch (status) {
      case 'ON_TRACK':
        return <Badge variant="olive">On Track</Badge>;
      case 'POSSIBLE_ADJUSTMENT':
        return <Badge variant="faded">Pacing Adjustment Possible</Badge>;
      case 'UNLIKELY':
        return <Badge variant="error">Pacing Gap</Badge>;
      case 'INSUFFICIENT_DATA':
        return <Badge variant="faded">Needs More Data</Badge>;
      case 'EXPIRED_OR_INVALID':
      default:
        return <Badge variant="faded">Goal Inactive</Badge>;
    }
  };

  const getAdaptationBadge = (status: AdaptationStatus) => {
    switch (status) {
      case 'NO_CHANGE':
        return <Badge variant="olive">Tracking Closely</Badge>;
      case 'MONITOR':
        return <Badge variant="faded">Monitor (1–2 Weeks)</Badge>;
      case 'ADJUSTMENT_RECOMMENDED':
        return <Badge variant="error">Plan Review Suggested</Badge>;
      case 'INSUFFICIENT_DATA':
      default:
        return <Badge variant="faded">Collecting History</Badge>;
    }
  };

  // General Loading Skeleton
  if (isTrajectoryLoading) {
    return (
      <div data-testid="intelligence-loading-skeleton" className="flex flex-col gap-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-20 bg-borderLine/30 rounded" />
        <div className="h-96 bg-borderLine/20 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-borderLine/20 rounded" />
          <div className="h-64 bg-borderLine/20 rounded" />
        </div>
      </div>
    );
  }

  // Error State Banner
  const generalError = trajectoryError || feasibilityError || adaptationError;
  if (generalError && !trajectory) {
    return (
      <Card className="p-8 border border-error bg-error/5 max-w-2xl mx-auto my-12 text-center flex flex-col items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-error font-bold">
          Digital Twin Engine Offline
        </span>
        <h2 className="text-xl font-bold text-graphite">Unable to load intelligence trajectory</h2>
        <p className="text-sm text-charcoal">{getErrorMessage(generalError)}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-graphite text-bone text-xs font-mono uppercase tracking-wider font-bold"
        >
          Retry Loading
        </button>
        <NavLink to="/dashboard" className="mt-2 text-xs font-mono uppercase underline text-olive font-bold">
          Return to Dashboard →
        </NavLink>
      </Card>
    );
  }

  const baselineWeight = trajectory?.baseline_weight_kg || 70.0;
  const projectedChange = trajectory?.predicted_change_28d_kg || 0.0;
  const projectedWeight = trajectory?.projected_weight_28d_kg || baselineWeight;
  const targetWeight = feasibility?.target_weight_kg;

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto pb-12">
      {/* 1. Header / Context Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Personal Fitness Digital Twin
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-graphite">
            Your Fitness Trajectory
          </h1>
          <p className="text-sm text-charcoal mt-1 max-w-2xl">
            A model-based estimate of where your body weight is heading over the next 28 days based on your recent energy expenditure, intake, and workout history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {trajectory?.data_confidence && (
            <DataConfidenceBadge confidence={trajectory.data_confidence} />
          )}
          <NavLink
            to="/coach"
            className="px-4 py-2 border border-borderLine bg-white text-graphite hover:border-graphite text-xs font-mono font-bold uppercase transition-colors inline-flex items-center gap-2"
          >
            <span>🤖</span>
            <span>Ask Coach to Explain</span>
          </NavLink>
        </div>
      </div>

      {/* 2. Primary Visual Anchor: Hero Trajectory Section */}
      <section aria-labelledby="trajectory-heading" className="flex flex-col gap-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-faded block">Current Weight</span>
            <div className="mt-2">
              <span className="text-3xl font-bold font-mono text-graphite">{baselineWeight.toFixed(1)}</span>
              <span className="text-xs text-faded font-mono ml-1">kg</span>
            </div>
            <span className="text-[11px] text-faded font-mono mt-1">Starting baseline</span>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-faded block">Expected 28d Change</span>
            <div className="mt-2">
              <span className={`text-3xl font-bold font-mono ${projectedChange < 0 ? 'text-olive' : 'text-graphite'}`}>
                {projectedChange > 0 ? `+${projectedChange.toFixed(2)}` : projectedChange.toFixed(2)}
              </span>
              <span className="text-xs text-faded font-mono ml-1">kg</span>
            </div>
            <span className="text-[11px] text-faded font-mono mt-1">Expected change</span>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-faded block">Expected Weight</span>
            <div className="mt-2">
              <span className="text-3xl font-bold font-mono text-graphite">{projectedWeight.toFixed(1)}</span>
              <span className="text-xs text-faded font-mono ml-1">kg</span>
            </div>
            <span className="text-[11px] text-faded font-mono mt-1">Expected in 28 days</span>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-faded block">Goal Target</span>
            <div className="mt-2">
              <span className="text-3xl font-bold font-mono text-graphite">
                {targetWeight ? targetWeight.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-faded font-mono ml-1">{targetWeight ? 'kg' : ''}</span>
            </div>
            <span className="text-[11px] text-faded font-mono mt-1">
              {feasibility?.target_date ? `Deadline: ${feasibility.target_date}` : 'Ongoing target'}
            </span>
          </Card>
        </div>

        {/* Primary Trajectory Chart Card */}
        {trajectory && (
          <Card className="p-6 md:p-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderLine pb-4">
              <div>
                <h2 id="trajectory-heading" className="text-base font-bold text-graphite">
                  Expected 28-Day Trajectory
                </h2>
                <p className="text-xs text-faded font-mono mt-0.5">
                  Visual projection showing your expected path and range based on current adherence.
                </p>
              </div>
            </div>

            <TrajectoryChart
              baselineWeight={baselineWeight}
              projectedWeight={projectedWeight}
              lowerBound={trajectory.confidence_interval.lower_bound_kg}
              upperBound={trajectory.confidence_interval.upper_bound_kg}
              targetWeight={targetWeight}
              referenceDate={trajectory.reference_date}
            />

            {/* Expandable Methodology & Disclaimer */}
            <details className="pt-2 border-t border-borderLine/60 group">
              <summary className="font-mono text-xs uppercase tracking-wider text-graphite font-bold cursor-pointer hover:text-olive transition-colors flex items-center justify-between">
                <span>How this estimate works</span>
                <span className="text-faded group-open:rotate-180 transition-transform text-[10px]">▼</span>
              </summary>
              <div className="mt-2 text-xs text-charcoal font-sans space-y-1.5 leading-relaxed bg-bone p-3 border border-borderLine">
                <p>
                  This estimate is calculated from your recent energy expenditure, food logging adherence, and workout frequency, referenced against a controlled physiological energy-balance benchmark.
                </p>
                <p className="text-[11px] text-faded italic pt-1 border-t border-borderLine/50">
                  {trajectory.projection_disclaimer}
                </p>
              </div>
            </details>
          </Card>
        )}
      </section>

      {/* 3. Section: Goal Feasibility */}
      <section aria-labelledby="feasibility-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="feasibility-heading" className="text-xl font-bold text-graphite">
              Can You Reach Your Goal?
            </h2>
            <p className="text-xs text-faded font-mono mt-0.5">
              Comparison between your active target pacing and current expected rate of progress.
            </p>
          </div>
          {feasibility && getFeasibilityBadge(feasibility.status)}
        </div>

        {isFeasibilityLoading ? (
          <div className="h-32 bg-borderLine/20 animate-pulse rounded" />
        ) : feasibility ? (
          <Card className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-borderLine pb-5">
              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Required Weekly Rate</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {feasibility.required_rate_kg_per_week != null
                    ? `${feasibility.required_rate_kg_per_week > 0 ? '+' : ''}${feasibility.required_rate_kg_per_week} kg/wk`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">To meet target date</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Expected Weekly Rate</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {feasibility.projected_rate_kg_per_week != null
                    ? `${feasibility.projected_rate_kg_per_week > 0 ? '+' : ''}${feasibility.projected_rate_kg_per_week} kg/wk`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">Current expected trajectory</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Days Remaining</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {feasibility.days_remaining != null ? `${feasibility.days_remaining} days` : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">
                  {feasibility.target_date ? `Deadline: ${feasibility.target_date}` : 'Open timeframe'}
                </span>
              </div>
            </div>

            {/* Explanation & Guardrail Note */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-charcoal font-sans leading-relaxed">
                {feasibility.explanation}
              </p>
              <details className="text-[11px] text-faded font-mono">
                <summary className="cursor-pointer hover:text-olive">Pacing details & safety guidelines</summary>
                <p className="mt-1 pl-3 border-l-2 border-olive/50 font-sans">
                  {feasibility.safety_assessment}
                </p>
              </details>
            </div>
          </Card>
        ) : null}
      </section>

      {/* 4. Section: Try a Different Plan (What-If) */}
      <section aria-labelledby="simulator-heading" className="flex flex-col gap-4">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            What If?
          </span>
          <h2 id="simulator-heading" className="text-xl font-bold text-graphite">
            Try a Different Plan
          </h2>
          <p className="text-xs text-charcoal mt-0.5">
            See how small adjustments to your calories, protein, or activity would change your expected 28-day progress.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel (5 cols) */}
          <Card className="lg:col-span-5 p-6 flex flex-col gap-5">
            <div className="border-b border-borderLine pb-3">
              <h3 className="text-sm font-bold text-graphite uppercase tracking-wider font-mono">
                Plan Adjustments
              </h3>
              <p className="text-[11px] text-faded font-sans mt-0.5">
                Adjust hypothetical targets. These adjustments are for planning only and will not overwrite your active plan.
              </p>
            </div>

            {/* Preset Template Buttons */}
            <div>
              <span className="text-[10px] font-mono uppercase text-faded font-bold block mb-2">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Deficit Focus (-400 kcal)', 2100, 160, 1.55)}
                  className="px-2.5 py-1 text-xs border border-borderLine hover:border-graphite bg-white transition-colors"
                >
                  -400 kcal Deficit
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('High Protein & Active', 2400, 190, 1.725)}
                  className="px-2.5 py-1 text-xs border border-borderLine hover:border-graphite bg-white transition-colors"
                >
                  High Protein + Active
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Surplus (+300 kcal)', 2800, 150, 1.55)}
                  className="px-2.5 py-1 text-xs border border-borderLine hover:border-graphite bg-white transition-colors"
                >
                  +300 kcal Surplus
                </button>
              </div>
            </div>

            {/* Sliders / Inputs */}
            <div className="flex flex-col gap-4 pt-2 border-t border-borderLine">
              {/* Daily Calories */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label htmlFor="sim-cals" className="font-bold text-graphite">Daily Calories</label>
                  <span className="font-mono text-olive font-bold">{simCalories} kcal</span>
                </div>
                <input
                  id="sim-cals"
                  type="range"
                  min={1200}
                  max={3800}
                  step={50}
                  value={simCalories}
                  onChange={(e) => setSimCalories(Number(e.target.value))}
                  className="w-full accent-olive cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-faded font-mono">
                  <span>1,200 kcal</span>
                  <span>3,800 kcal</span>
                </div>
              </div>

              {/* Daily Protein */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label htmlFor="sim-prot" className="font-bold text-graphite">Daily Protein</label>
                  <span className="font-mono text-olive font-bold">{simProtein} g</span>
                </div>
                <input
                  id="sim-prot"
                  type="range"
                  min={40}
                  max={250}
                  step={5}
                  value={simProtein}
                  onChange={(e) => setSimProtein(Number(e.target.value))}
                  className="w-full accent-olive cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-faded font-mono">
                  <span>40 g</span>
                  <span>250 g</span>
                </div>
              </div>

              {/* Activity Multiplier */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label htmlFor="sim-act" className="font-bold text-graphite">Activity Level</label>
                  <span className="font-mono text-olive font-bold">×{simActivity}</span>
                </div>
                <select
                  id="sim-act"
                  value={simActivity}
                  onChange={(e) => setSimActivity(Number(e.target.value))}
                  className="w-full p-2 border border-borderLine bg-white text-xs text-graphite font-mono"
                >
                  <option value={1.2}>Sedentary (×1.20)</option>
                  <option value={1.375}>Light Exercise (×1.375)</option>
                  <option value={1.55}>Moderate Exercise (×1.55)</option>
                  <option value={1.725}>Heavy Training (×1.725)</option>
                  <option value={1.9}>Athletic / Twice Daily (×1.90)</option>
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleRunSimulation}
              isLoading={simulateMutation.isPending}
              className="w-full text-xs font-mono font-bold uppercase tracking-wider py-3 mt-2"
            >
              See Expected Progress →
            </Button>
          </Card>

          {/* Results Comparison View (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {scenarioResults.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-olive font-bold">
                  Planner Ready
                </span>
                <p className="text-xs text-charcoal max-w-sm">
                  Adjust calories, protein, or activity on the left or select a quick preset to see expected progress.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => handleApplyPreset('Moderate Deficit (-400 kcal)', 2100, 160, 1.55)}
                  className="text-xs mt-2"
                >
                  Try Sample Deficit Scenario
                </Button>
              </Card>
            ) : trajectory ? (
              <ScenarioComparisonChart
                baselineProjection={trajectory}
                scenarios={scenarioResults}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* 5. Section: Recommended Plan */}
      <section aria-labelledby="optimizer-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="optimizer-heading" className="text-xl font-bold text-graphite">
            Recommended Plan
          </h2>
          <p className="text-xs text-charcoal mt-0.5">
            A balanced plan tailored to your goal and current rate of progress.
          </p>
        </div>

        {!optimizerData ? (
          <Card className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="font-mono text-[10px] uppercase tracking-widest text-olive font-bold block mb-1">
                Plan Recommendation
              </span>
              <h3 className="text-base font-bold text-graphite">
                Find a plan aligned with your active goal
              </h3>
              <p className="text-xs text-charcoal mt-1">
                Evaluates calorie, protein, and activity adjustments to identify the plan that best supports your target sustainably.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="max-adj" className="text-xs text-charcoal font-mono">Max adj:</label>
                <select
                  id="max-adj"
                  value={optMaxAdjustment}
                  onChange={(e) => setOptMaxAdjustment(Number(e.target.value))}
                  className="border border-borderLine bg-white p-1 text-xs font-mono"
                >
                  <option value={200}>±200 kcal</option>
                  <option value={300}>±300 kcal</option>
                  <option value={400}>±400 kcal</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer font-mono">
                <input
                  type="checkbox"
                  checked={optPreferProtein}
                  onChange={(e) => setOptPreferProtein(e.target.checked)}
                  className="accent-olive"
                />
                <span>Higher protein priority</span>
              </label>

              <Button
                variant="primary"
                onClick={() => optimizeMutation.mutate()}
                isLoading={optimizeMutation.isPending}
                className="text-xs font-mono uppercase tracking-wider py-2.5 px-4"
              >
                Evaluate Plans →
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Recommended Plan Card */}
            <Card className="p-6 md:p-8 border-2 border-graphite bg-white flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderLine pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase bg-graphite text-bone px-2 py-0.5 font-bold">
                      Recommended Plan
                    </span>
                    <Badge variant="olive">{optimizerData.best_candidate.feasibility_rating}</Badge>
                  </div>
                  <p className="text-xs text-faded font-mono mt-1">
                    Based on your current progress and goal
                  </p>
                </div>
              </div>

              {/* Plan Targets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-bone border border-borderLine">
                  <span className="text-[10px] font-mono uppercase text-faded block">Daily Calories</span>
                  <span className="text-xl font-bold font-mono text-graphite">
                    {optimizerData.best_candidate.daily_calories}
                  </span>
                  <span className="text-[10px] text-faded font-mono block">
                    {optimizerData.best_candidate.calorie_offset_from_current >= 0
                      ? `+${optimizerData.best_candidate.calorie_offset_from_current}`
                      : optimizerData.best_candidate.calorie_offset_from_current}{' '}
                    kcal vs current
                  </span>
                </div>

                <div className="p-3 bg-bone border border-borderLine">
                  <span className="text-[10px] font-mono uppercase text-faded block">Daily Protein</span>
                  <span className="text-xl font-bold font-mono text-graphite">
                    {optimizerData.best_candidate.daily_protein_g}
                  </span>
                  <span className="text-[10px] text-faded font-mono block">g / day</span>
                </div>

                <div className="p-3 bg-bone border border-borderLine">
                  <span className="text-[10px] font-mono uppercase text-faded block">Activity Level</span>
                  <span className="text-xl font-bold font-mono text-graphite">
                    ×{optimizerData.best_candidate.activity_multiplier}
                  </span>
                  <span className="text-[10px] text-faded font-mono block">Multiplier</span>
                </div>

                <div className="p-3 bg-bone border border-borderLine">
                  <span className="text-[10px] font-mono uppercase text-faded block">Expected 28d Change</span>
                  <span className="text-xl font-bold font-mono text-olive">
                    {optimizerData.best_candidate.projected_change_28d_kg > 0
                      ? `+${optimizerData.best_candidate.projected_change_28d_kg.toFixed(2)}`
                      : optimizerData.best_candidate.projected_change_28d_kg.toFixed(2)}{' '}
                    kg
                  </span>
                  <span className="text-[10px] text-faded font-mono block">
                    Expected weight: {optimizerData.best_candidate.projected_weight_28d_kg.toFixed(1)} kg
                  </span>
                </div>
              </div>

              {/* Simple explanation */}
              <p className="text-sm text-charcoal font-sans leading-relaxed">
                This is the plan that best matches your current goal and recent progress.
              </p>

              {/* Expandable Methodology */}
              <details className="pt-2 border-t border-borderLine group">
                <summary className="font-mono text-xs uppercase tracking-wider text-graphite font-bold cursor-pointer hover:text-olive transition-colors flex items-center justify-between">
                  <span>How this was chosen</span>
                  <span className="text-faded group-open:rotate-180 transition-transform text-[10px]">▼</span>
                </summary>
                <div className="mt-3 text-xs text-charcoal space-y-3 bg-bone p-4 border border-borderLine">
                  <p className="leading-relaxed">
                    {optimizerData.objective_description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAlternatives((prev) => !prev)}
                    className="text-xs font-mono underline text-graphite hover:text-olive block font-bold"
                  >
                    {showAlternatives ? 'Hide Alternatives' : `View ${optimizerData.alternative_candidates.length} Alternatives →`}
                  </button>
                </div>
              </details>
            </Card>

            {/* Alternative Candidates */}
            {showAlternatives && optimizerData.alternative_candidates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
                {optimizerData.alternative_candidates.map((alt) => (
                  <Card key={alt.candidate_id} className="p-4 bg-bone border border-borderLine flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center border-b border-borderLine pb-2">
                      <span className="font-mono font-bold text-graphite">{alt.candidate_id}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Calories:</span>
                      <strong>{alt.daily_calories} kcal</strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Protein:</span>
                      <strong>{alt.daily_protein_g} g</strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Expected 28d:</span>
                      <strong className="text-olive">{alt.projected_change_28d_kg.toFixed(2)} kg</strong>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. Section: How You're Responding */}
      <section aria-labelledby="adaptation-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="adaptation-heading" className="text-xl font-bold text-graphite">
              How You're Responding
            </h2>
            <p className="text-xs text-faded font-mono mt-0.5">
              Comparing your actual weight progress against what was expected.
            </p>
          </div>
          {adaptation && getAdaptationBadge(adaptation.status)}
        </div>

        {isAdaptationLoading ? (
          <div className="h-32 bg-borderLine/20 animate-pulse rounded" />
        ) : adaptation ? (
          <Card className="p-6 flex flex-col gap-5">
            {/* Consumer Status Sentence */}
            <div className="p-3 bg-olive/10 border border-olive/20 text-xs font-sans text-graphite font-medium">
              {adaptation.status === 'INSUFFICIENT_DATA'
                ? "We'll keep watching your progress as you record more check-ins."
                : adaptation.residual_kg != null && adaptation.residual_kg < -0.2
                ? "You're losing weight a little faster than expected."
                : adaptation.residual_kg != null && adaptation.residual_kg > 0.2
                ? "You're progressing a little slower than expected."
                : adaptation.status === 'NO_CHANGE'
                ? "You're progressing right as expected."
                : "We'll keep watching your progress before suggesting a change."}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-borderLine pb-5">
              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Actual</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {adaptation.actual_weight_change_kg != null
                    ? `${adaptation.actual_weight_change_kg > 0 ? '+' : ''}${adaptation.actual_weight_change_kg} kg`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">Past 28 days</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Expected</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {adaptation.projected_weight_change_kg != null
                    ? `${adaptation.projected_weight_change_kg > 0 ? '+' : ''}${adaptation.projected_weight_change_kg} kg`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">Expected pace</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Difference</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {adaptation.residual_kg != null
                    ? `${adaptation.residual_kg > 0 ? '+' : ''}${adaptation.residual_kg} kg`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">Actual vs expected</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-faded block">Consistency</span>
                <span className="text-xl font-bold font-mono text-graphite">
                  {adaptation.logging_completeness_pct}%
                </span>
                <span className="text-[11px] text-faded font-mono block mt-0.5">
                  {adaptation.measurement_count} check-ins recorded
                </span>
              </div>
            </div>

            {/* Recommendation & Explanations */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-charcoal font-sans leading-relaxed">
                {adaptation.recommendation_summary}
              </p>
              <details className="text-[11px] text-faded font-mono">
                <summary className="cursor-pointer hover:text-olive">Tracking details & baseline calibration</summary>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans bg-bone p-2.5 border border-borderLine">
                  <span>Primary driver: <strong className="text-graphite font-mono">{adaptation.primary_driver}</strong></span>
                  <span>•</span>
                  <span>Calibration offset: <strong className="text-graphite font-mono">{adaptation.personal_calibration_offset_kg.toFixed(3)} kg</strong></span>
                </div>
              </details>
            </div>
          </Card>
        ) : null}
      </section>
    </div>
  );
};
