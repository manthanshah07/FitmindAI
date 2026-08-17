import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { getProgressSummaryApi, createMeasurementApi } from '../../lib/api/progress';
import { getErrorMessage } from '../../utils/apiError';
import type { ProgressSummary } from '../../types/progress';

export const ProgressOverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [measuredAt, setMeasuredAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipsCm, setHipsCm] = useState<string>('');
  const [bicepCm, setBicepCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [bodyFatPct, setBodyFatPct] = useState<string>('');

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProgressSummaryApi();
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const weightVal = weightKg ? parseFloat(weightKg) : undefined;
    const chestVal = chestCm ? parseFloat(chestCm) : undefined;
    const waistVal = waistCm ? parseFloat(waistCm) : undefined;
    const hipsVal = hipsCm ? parseFloat(hipsCm) : undefined;
    const bicepVal = bicepCm ? parseFloat(bicepCm) : undefined;
    const thighVal = thighCm ? parseFloat(thighCm) : undefined;
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
        chest_cm: chestVal,
        waist_cm: waistVal,
        hips_cm: hipsVal,
        bicep_cm: bicepVal,
        thigh_cm: thighVal,
        body_fat_pct: fatVal,
      });

      setShowModal(false);
      // Reset form
      setWeightKg('');
      setChestCm('');
      setWaistCm('');
      setHipsCm('');
      setBicepCm('');
      setThighCm('');
      setBodyFatPct('');

      // Reload summary
      await loadSummary();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          FitMind Analytics Engine
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Calculating Weight & Body Progress...
        </h3>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col gap-4 p-8 border border-error bg-error/5 text-error">
        <h3 className="font-mono text-lg font-bold uppercase">Progress Error</h3>
        <p className="text-xs font-sans">{error || 'Could not load progress data.'}</p>
        <Button variant="secondary" onClick={loadSummary}>
          Retry Loading
        </Button>
      </div>
    );
  }

  const { latest_weight_kg, weight_change_kg, trend_direction, total_entries, history } = summary;

  const getTrendBadge = () => {
    if (trend_direction === 'losing') return <Badge variant="olive">↓ {Math.abs(weight_change_kg || 0)} kg (Losing)</Badge>;
    if (trend_direction === 'gaining') return <Badge variant="olive">↑ {weight_change_kg} kg (Gaining)</Badge>;
    if (trend_direction === 'maintaining') return <Badge variant="faded">~ 0.0 kg (Maintaining)</Badge>;
    return <Badge variant="faded">No Data</Badge>;
  };

  // Extract entries that have weight logged for visual bar calculation
  const weightHistory = history.filter((m) => m.weight_kg !== null && m.weight_kg !== undefined);
  const maxWeight = Math.max(...weightHistory.map((m) => m.weight_kg || 0), 100);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Body Composition & History
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Progress & Measurements
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Track historical body weight, circumference measurements, and long-term trend progression.
          </p>
        </div>

        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Record Measurement
        </Button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase text-faded block mb-1">Latest Weight</span>
          <h3 className="text-3xl font-bold text-graphite font-mono">
            {latest_weight_kg ? `${latest_weight_kg} kg` : 'N/A'}
          </h3>
        </Card>

        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase text-faded block mb-1">Weight Net Change</span>
          <div className="mt-1">{getTrendBadge()}</div>
        </Card>

        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase text-faded block mb-1">Recorded Sessions</span>
          <h3 className="text-3xl font-bold text-graphite font-mono">{total_entries}</h3>
        </Card>

        <Card className="p-6">
          <span className="font-mono text-[10px] uppercase text-faded block mb-1">Latest Entry Date</span>
          <h3 className="text-xl font-bold text-graphite font-mono truncate">
            {history.length > 0 ? history[0].measured_at : 'No records'}
          </h3>
        </Card>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <span className="font-mono text-xs text-olive uppercase tracking-widest">
            No Progress Data Recorded
          </span>
          <h3 className="text-2xl font-bold uppercase text-graphite font-mono">
            Start Tracking Body Weight & Circumference
          </h3>
          <p className="text-xs text-charcoal max-w-md">
            Log your first weight or circumference measurement to visualize your fitness transformation over time.
          </p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Record First Measurement →
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weight Trend Chart */}
          <Card className="lg:col-span-2 p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-borderLine pb-4">
              <h2 className="font-mono text-base font-bold uppercase text-graphite">
                Body Weight History Trend
              </h2>
              <span className="font-mono text-xs text-faded">
                {weightHistory.length} weight entries
              </span>
            </div>

            {weightHistory.length === 0 ? (
              <p className="text-xs text-faded font-mono py-8 text-center">
                No weight measurements recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {weightHistory.slice(0, 10).map((record) => {
                  const pct = Math.round(((record.weight_kg || 0) / maxWeight) * 100);
                  return (
                    <div key={record.id} className="flex items-center gap-4">
                      <span className="font-mono text-xs text-graphite w-24">
                        {record.measured_at}
                      </span>
                      <div className="flex-1 bg-bone border border-borderLine h-4">
                        <div
                          className="bg-olive h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-graphite w-16 text-right">
                        {record.weight_kg} kg
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Historical Log Entries */}
          <Card className="p-6 md:p-8 flex flex-col gap-6">
            <div className="border-b border-borderLine pb-4">
              <h2 className="font-mono text-base font-bold uppercase text-graphite">
                Historical Logs ({history.length})
              </h2>
            </div>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-bone border border-borderLine flex flex-col gap-1 text-xs font-mono"
                >
                  <div className="flex justify-between font-bold text-graphite border-b border-borderLine pb-1">
                    <span>{record.measured_at}</span>
                    <span className="text-olive">{record.weight_kg ? `${record.weight_kg} kg` : 'Metrics logged'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-charcoal pt-1">
                    {record.chest_cm && <span>Chest: {record.chest_cm}cm</span>}
                    {record.waist_cm && <span>Waist: {record.waist_cm}cm</span>}
                    {record.hips_cm && <span>Hips: {record.hips_cm}cm</span>}
                    {record.bicep_cm && <span>Arms: {record.bicep_cm}cm</span>}
                    {record.thigh_cm && <span>Thigh: {record.thigh_cm}cm</span>}
                    {record.body_fat_pct && <span>Body Fat: {record.body_fat_pct}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Record Measurement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 md:p-8 flex flex-col gap-6 bg-bone max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-borderLine pb-4">
              <div>
                <span className="font-mono text-[10px] text-olive uppercase tracking-widest block font-bold">
                  Progress Station
                </span>
                <h2 className="text-xl font-bold uppercase text-graphite font-mono">
                  Record Measurements
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="font-mono text-sm text-faded hover:text-graphite font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 border border-error bg-error/5 text-error font-mono text-xs uppercase">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMeasurement} className="flex flex-col gap-4">
              <Input
                label="Date Measured"
                type="date"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Body Weight (kg)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 75.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Body Fat (%)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 15.0"
                  value={bodyFatPct}
                  onChange={(e) => setBodyFatPct(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <span className="font-mono text-xs uppercase font-bold text-graphite tracking-widest pt-2 border-t border-borderLine">
                Body Circumferences (Optional)
              </span>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Chest (cm)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 100.0"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Waist (cm)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.0"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Hips (cm)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 96.0"
                  value={hipsCm}
                  onChange={(e) => setHipsCm(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Arms/Bicep (cm)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.0"
                  value={bicepCm}
                  onChange={(e) => setBicepCm(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Thigh (cm)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 56.0"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-borderLine">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Save Entry ✓
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
