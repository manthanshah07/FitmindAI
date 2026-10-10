import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale } from 'lucide-react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatTile } from '../../components/ui/StatTile';
import { Banner } from '../../components/ui/Banner';
import { LineChart } from '../../components/ui/LineChart';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/TextField';
import { ListRow } from '../../components/ui/ListRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { FitnessScoreCard } from '../../components/progress/FitnessScoreCard';
import { WeeklyReviewTab } from '../../components/progress/WeeklyReviewTab';
import { ForecastTab } from '../../components/progress/ForecastTab';
import { getProgressSummaryApi, createMeasurementApi } from '../../lib/api/progress';
import { getActiveGoalApi } from '../../lib/api/goals';
import { getErrorMessage } from '../../utils/apiError';
import { inchesToCm, formatInches } from '../../utils/unitConversion';

type RangeOption = '4w' | '12w' | '6m' | 'all';


export const ProgressOverviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [rangeFilter, setRangeFilter] = useState<RangeOption>('12w');
  const [selectedMetric, setSelectedMetric] = useState<string>('waist_cm');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Measurement Form State
  const [measuredAt, setMeasuredAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState<string>('');
  const [chestIn, setChestIn] = useState<string>('');
  const [waistIn, setWaistIn] = useState<string>('');
  const [hipsIn, setHipsIn] = useState<string>('');
  const [bicepIn, setBicepIn] = useState<string>('');
  const [thighIn, setThighIn] = useState<string>('');
  const [bodyFatPct, setBodyFatPct] = useState<string>('');

  const { data: summary } = useQuery({
    queryKey: ['progressSummary'],
    queryFn: () => getProgressSummaryApi(),
  });

  const { data: activeGoal } = useQuery({
    queryKey: ['activeGoal'],
    queryFn: () => getActiveGoalApi(),
  });

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const weightVal = weightKg ? parseFloat(weightKg) : undefined;
    const chestVal = chestIn ? parseFloat(chestIn) : undefined;
    const waistVal = waistIn ? parseFloat(waistIn) : undefined;
    const hipsVal = hipsIn ? parseFloat(hipsIn) : undefined;
    const bicepVal = bicepIn ? parseFloat(bicepIn) : undefined;
    const thighVal = thighIn ? parseFloat(thighIn) : undefined;
    const fatVal = bodyFatPct ? parseFloat(bodyFatPct) : undefined;

    if (
      weightVal === undefined &&
      chestVal === undefined &&
      waistVal === undefined &&
      hipsVal === undefined &&
      bicepVal === undefined &&
      thighVal === undefined &&
      fatVal === undefined
    ) {
      setFormError('Please enter at least one measurement value (e.g. weight, waist, or chest).');
      return;
    }

    try {
      setIsSubmitting(true);
      await createMeasurementApi({
        measured_at: measuredAt,
        weight_kg: weightVal,
        chest_cm: inchesToCm(chestVal),
        waist_cm: inchesToCm(waistVal),
        hips_cm: inchesToCm(hipsVal),
        bicep_cm: inchesToCm(bicepVal),
        thigh_cm: inchesToCm(thighVal),
        body_fat_pct: fatVal,
      });

      setShowAddModal(false);
      setWeightKg('');
      setChestIn('');
      setWaistIn('');
      setHipsIn('');
      setBicepIn('');
      setThighIn('');
      setBodyFatPct('');

      await queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      await queryClient.invalidateQueries({ queryKey: ['fitnessScore'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const history = summary?.history || [];

  // Filter history based on rangeFilter
  const now = new Date();
  const filteredHistory = history.filter((item) => {
    if (rangeFilter === 'all') return true;
    const itemDate = new Date(item.measured_at);
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
    if (rangeFilter === '4w') return diffDays <= 28;
    if (rangeFilter === '12w') return diffDays <= 84;
    if (rangeFilter === '6m') return diffDays <= 182;
    return true;
  });

  // Prepare weight chart data
  const weightDataPoints = filteredHistory
    .filter((m) => m.weight_kg !== null && m.weight_kg !== undefined)
    .map((m) => ({
      date: m.measured_at.slice(5), // "MM-DD"
      fullDate: m.measured_at,
      weight: Number(m.weight_kg),
      goal: activeGoal?.target_weight_kg ? Number(activeGoal.target_weight_kg) : undefined,
    }));

  // Calculate trimmed Y domain (never start at 0 kg for weight)
  let yDomain: [number, number] | undefined = undefined;
  if (weightDataPoints.length > 0) {
    const weights = weightDataPoints.map((d) => d.weight);
    if (activeGoal?.target_weight_kg) {
      weights.push(Number(activeGoal.target_weight_kg));
    }
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const pad = Math.max(1, Math.round((maxW - minW) * 0.15) || 2);
    yDomain = [Math.floor(minW - pad), Math.ceil(maxW + pad)];
  }

  // Current stats
  const latestWeight = summary?.latest_weight_kg ?? null;
  const targetWeight = activeGoal?.target_weight_kg ?? null;
  const distanceToGoal =
    latestWeight !== null && targetWeight !== null
      ? (latestWeight - targetWeight).toFixed(1)
      : null;

  // Measurement chart data for Body tab
  const metricOptions = [
    { value: 'waist_cm', label: 'Waist' },
    { value: 'chest_cm', label: 'Chest' },
    { value: 'hips_cm', label: 'Hips' },
    { value: 'bicep_cm', label: 'Biceps' },
    { value: 'thigh_cm', label: 'Thighs' },
    { value: 'body_fat_pct', label: 'Body Fat %' },
  ];

  const bodyMetricDataPoints = history
    .filter((m) => (m as any)[selectedMetric] !== null && (m as any)[selectedMetric] !== undefined)
    .map((m) => ({
      date: m.measured_at.slice(5),
      value: Number((m as any)[selectedMetric]),
    }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <PageHeader
        title="Progress & Metrics"
        subtitle="Track your fitness score, body composition, and adherence progress."
        action={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Measurement
          </Button>
        }
      />

      {/* Goal Conflict Alert Banner */}
      {activeGoal?.has_goal_conflict && (
        <Banner
          variant="warning"
          title="Goal Configuration Conflict"
          className="my-2"
        >
          {activeGoal.conflict_reason ||
            'Your target weight contradicts your active goal type. Update your goal in Settings to maintain accurate coaching projections.'}
        </Banner>
      )}

      {/* Tabs: Overview, Body, Weekly Review (M7), Forecast (M7) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')}>Overview</TabsTrigger>
          <TabsTrigger value="body" onClick={() => setActiveTab('body')}>Body Measurements</TabsTrigger>
          <TabsTrigger value="review" onClick={() => setActiveTab('review')}>Weekly Review</TabsTrigger>
          <TabsTrigger value="forecast" onClick={() => setActiveTab('forecast')}>Forecast</TabsTrigger>
        </TabsList>

        {/* ================= OVERVIEW TAB ================= */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Fitness Score Card with 4-bar breakdown */}
          <FitnessScoreCard />

          {/* Stat Tiles: Current Weight, Change over Range, Distance to Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile
              label="Current Weight"
              value={latestWeight !== null ? `${latestWeight}` : '—'}
              unit="kg"
              subtext={summary?.trend_direction ? `Trend: ${summary.trend_direction}` : undefined}
            />
            <StatTile
              label="Weight Change"
              value={summary?.weight_change_kg !== null && summary?.weight_change_kg !== undefined ? `${summary.weight_change_kg > 0 ? '+' : ''}${summary.weight_change_kg}` : '0.0'}
              unit="kg"
              subtext="Over recorded history"
            />
            <StatTile
              label="Distance to Goal"
              value={distanceToGoal !== null ? `${Math.abs(Number(distanceToGoal))}` : '—'}
              unit="kg"
              subtext={
                targetWeight !== null
                  ? `Target: ${targetWeight} kg (${Number(distanceToGoal) > 0 ? 'to lose' : 'to gain'})`
                  : 'No active target set'
              }
            />
          </div>

          {/* Weight Line Chart Card with Trimmed Y-Axis */}
          <Card className="p-6 md:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-text">Weight History & Trend</h3>
                <p className="text-xs text-text-2 mt-0.5">
                  Body weight progression compared against your target goal.
                </p>
              </div>
              <SegmentedControl<RangeOption>
                value={rangeFilter}
                onChange={setRangeFilter}
                options={[
                  { value: '4w', label: '4W' },
                  { value: '12w', label: '12W' },
                  { value: '6m', label: '6M' },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>

            {weightDataPoints.length > 0 ? (
              <div className="pt-2">
                <LineChart
                  data={weightDataPoints}
                  xAxisKey="date"
                  yDomain={yDomain}
                  yAxisUnit="kg"
                  height={260}
                  series={[
                    { dataKey: 'weight', name: 'Weight (kg)', color: 'var(--accent, #0F766E)', strokeWidth: 2.5 },
                    ...(activeGoal?.target_weight_kg
                      ? [{ dataKey: 'goal', name: 'Goal (kg)', color: '#94a3b8', strokeWidth: 1.5 }]
                      : []),
                  ]}
                  ariaLabel="Weight progression chart"
                />
              </div>
            ) : (
              <EmptyState
                icon={<Scale className="w-6 h-6" />}
                title="No weight data for this range"
                description="Add your first weigh-in to begin tracking weight progression over time."
                actionLabel="Add Weigh-in"
                onAction={() => setShowAddModal(true)}
              />
            )}
          </Card>
        </TabsContent>

        {/* ================= BODY TAB ================= */}
        <TabsContent value="body" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Body Circumferences & Fat %</h2>
              <p className="text-xs text-text-2">
                Track body tape measurements and body fat trends across time.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Entry
            </Button>
          </div>

          {/* Metric Selector & Chart */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <span className="text-sm font-medium text-text">Measurement Progression</span>
              <SegmentedControl
                value={selectedMetric}
                onChange={setSelectedMetric}
                options={metricOptions}
              />
            </div>

            {bodyMetricDataPoints.length > 0 ? (
              <LineChart
                data={bodyMetricDataPoints}
                xAxisKey="date"
                height={220}
                yAxisUnit={selectedMetric === 'body_fat_pct' ? '%' : 'cm'}
                series={[
                  {
                    dataKey: 'value',
                    name: metricOptions.find((m) => m.value === selectedMetric)?.label || 'Value',
                    color: 'var(--accent, #0F766E)',
                  },
                ]}
                ariaLabel="Circumference metric trend chart"
              />
            ) : (
              <div className="py-8 text-center text-xs text-text-muted">
                No entries recorded for this metric yet.
              </div>
            )}
          </Card>

          {/* Natural Unnested Scrolling List of Measurement History (Fixes U10) */}
          <Card className="p-0 overflow-hidden divide-y divide-border">
            <div className="p-4 bg-surface-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Measurement Log ({history.length} {history.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>

            {history.length > 0 ? (
              history.map((m) => (
                <ListRow
                  key={m.id}
                  title={m.measured_at}
                  subtitle={
                    <span className="space-x-3 text-xs text-text-2">
                      {m.weight_kg !== null && <span>Weight: <strong>{m.weight_kg} kg</strong></span>}
                      {m.waist_cm !== null && <span>Waist: <strong>{formatInches(m.waist_cm)}</strong></span>}
                      {m.chest_cm !== null && <span>Chest: <strong>{formatInches(m.chest_cm)}</strong></span>}
                      {m.body_fat_pct !== null && <span>Body Fat: <strong>{m.body_fat_pct}%</strong></span>}
                    </span>
                  }
                />
              ))
            ) : (
              <div className="p-8">
                <EmptyState
                  title="No measurements logged"
                  description="Log your weight and body circumferences to track progress over time."
                  actionLabel="Add Measurement"
                  onAction={() => setShowAddModal(true)}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ================= WEEKLY REVIEW TAB (M7) ================= */}
        <TabsContent value="review" className="mt-6">
          <WeeklyReviewTab />
        </TabsContent>

        {/* ================= FORECAST TAB (M7) ================= */}
        <TabsContent value="forecast" className="mt-6">
          <ForecastTab />
        </TabsContent>
      </Tabs>

      {/* Add Measurement Dialog Sheet */}
      <Dialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Add Body Measurement"
        description="Record your weigh-in and tape measurements. Circumferences are entered in inches."
      >
        <form onSubmit={handleAddMeasurement} className="space-y-4 mt-2">
          {formError && (
            <Banner variant="danger" className="text-xs">
              {formError}
            </Banner>
          )}

          <TextField
            label="Date"
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 78.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
            <TextField
              label="Body Fat (%)"
              type="number"
              step="0.1"
              placeholder="e.g. 15.0"
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TextField
              label="Waist (in)"
              type="number"
              step="0.1"
              placeholder="e.g. 32.0"
              value={waistIn}
              onChange={(e) => setWaistIn(e.target.value)}
            />
            <TextField
              label="Chest (in)"
              type="number"
              step="0.1"
              placeholder="e.g. 40.0"
              value={chestIn}
              onChange={(e) => setChestIn(e.target.value)}
            />
            <TextField
              label="Hips (in)"
              type="number"
              step="0.1"
              placeholder="e.g. 38.0"
              value={hipsIn}
              onChange={(e) => setHipsIn(e.target.value)}
            />
            <TextField
              label="Biceps (in)"
              type="number"
              step="0.1"
              placeholder="e.g. 14.5"
              value={bicepIn}
              onChange={(e) => setBicepIn(e.target.value)}
            />
            <TextField
              label="Thigh (in)"
              type="number"
              step="0.1"
              placeholder="e.g. 23.0"
              value={thighIn}
              onChange={(e) => setThighIn(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Measurement
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
