import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { getFitnessScoreApi, recalculateFitnessScoreApi } from '../../lib/api/fitnessScore';
import { getErrorMessage } from '../../utils/apiError';
import type { FitnessScoreResponse } from '../../types/fitnessScore';

interface FitnessScoreCardProps {
  compact?: boolean;
  onNavigateProgress?: () => void;
}

export const FitnessScoreCard: React.FC<FitnessScoreCardProps> = ({ compact = false }) => {
  const [data, setData] = useState<FitnessScoreResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadScore = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getFitnessScoreApi();
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScore();
  }, []);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      setError(null);
      await recalculateFitnessScoreApi();
      await loadScore();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 border border-borderLine bg-bone min-h-[160px] flex items-center justify-center">
        <span className="font-mono text-xs text-olive uppercase tracking-widest animate-pulse font-bold">
          Evaluating Fitness Performance Engine...
        </span>
      </Card>
    );
  }

  if (error || !data || !data.current_score) {
    return (
      <Card className="p-6 border border-error bg-error/5 text-error flex flex-col gap-2">
        <span className="font-mono text-xs font-bold uppercase">Fitness Score Engine Error</span>
        <p className="text-xs font-sans">{error || 'Could not load fitness score.'}</p>
        <Button variant="secondary" onClick={loadScore} className="self-start mt-2">
          Retry
        </Button>
      </Card>
    );
  }

  const { current_score, score_label } = data;

  const getBadgeVariant = () => {
    if (score_label === 'Excellent') return 'olive';
    if (score_label === 'Good') return 'olive';
    if (score_label === 'Fair') return 'faded';
    return 'faded';
  };

  if (compact) {
    return (
      <Card className="p-6 flex flex-col justify-between border-solid">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
              <span>⚡</span> Weekly Fitness Score
            </span>
            <Badge variant={getBadgeVariant()}>{score_label}</Badge>
          </div>
          <div className="flex items-baseline gap-3 my-2">
            <h3 className="text-4xl font-bold font-mono text-graphite tracking-tighter">
              {current_score.score}
            </h3>
            <span className="font-mono text-xs text-faded uppercase">/ 100 PTS</span>
          </div>
          <p className="text-xs text-charcoal font-sans">
            Adherence: Workouts {current_score.workout_adherence_pct}% • Nutrition {current_score.nutrition_score}% • Consistency {current_score.consistency_score}%
          </p>
        </div>
        <div className="mt-6 pt-4 border-t border-borderLine flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-faded uppercase">
            Period: {current_score.period_start} to {current_score.period_end}
          </span>
          <Button variant="secondary" onClick={handleRecalculate} isLoading={isRecalculating} className="self-start sm:self-auto">
            Recalculate ↻
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-4">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Deterministic Evaluation Engine
          </span>
          <h2 className="font-mono text-2xl font-bold uppercase text-graphite">
            Weekly Fitness Score
          </h2>
          <span className="font-mono text-xs text-faded block mt-1">
            Evaluation Period: {current_score.period_start} → {current_score.period_end}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-4xl font-bold font-mono text-graphite tracking-tighter block">
              {current_score.score}
              <span className="text-sm font-normal text-faded">/100</span>
            </span>
            <Badge variant={getBadgeVariant()}>{score_label}</Badge>
          </div>

          <Button variant="secondary" onClick={handleRecalculate} isLoading={isRecalculating}>
            Recalculate ↻
          </Button>
        </div>
      </div>

      {/* Sub-Score Breakdown Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workout Adherence */}
        <div className="p-4 bg-bone border border-borderLine flex flex-col gap-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold text-graphite uppercase">Workout Adherence (30%)</span>
            <span className="text-olive font-bold">{current_score.workout_adherence_pct}%</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div
              className="bg-olive h-full transition-all"
              style={{ width: `${current_score.workout_adherence_pct || 0}%` }}
            />
          </div>
        </div>

        {/* Nutrition Score */}
        <div className="p-4 bg-bone border border-borderLine flex flex-col gap-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold text-graphite uppercase">Calorie Target Adherence (25%)</span>
            <span className="text-olive font-bold">{current_score.nutrition_score}%</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div
              className="bg-olive h-full transition-all"
              style={{ width: `${current_score.nutrition_score || 0}%` }}
            />
          </div>
        </div>

        {/* Protein Score */}
        <div className="p-4 bg-bone border border-borderLine flex flex-col gap-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold text-graphite uppercase">Protein Target Adherence (20%)</span>
            <span className="text-olive font-bold">{current_score.protein_score}%</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div
              className="bg-olive h-full transition-all"
              style={{ width: `${current_score.protein_score || 0}%` }}
            />
          </div>
        </div>

        {/* Consistency Score */}
        <div className="p-4 bg-bone border border-borderLine flex flex-col gap-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold text-graphite uppercase">Logging Consistency (15%)</span>
            <span className="text-olive font-bold">{current_score.consistency_score}%</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div
              className="bg-olive h-full transition-all"
              style={{ width: `${current_score.consistency_score || 0}%` }}
            />
          </div>
        </div>

        {/* Recovery Score */}
        <div className="p-4 bg-bone border border-borderLine flex flex-col gap-2 md:col-span-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-bold text-graphite uppercase">Recovery & Sleep Baseline (10%)</span>
            <span className="text-olive font-bold">{current_score.recovery_score}%</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div
              className="bg-olive h-full transition-all"
              style={{ width: `${current_score.recovery_score}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-faded">
            *Fixed 75.0% baseline score until wearable integration phase.
          </span>
        </div>
      </div>
    </Card>
  );
};
