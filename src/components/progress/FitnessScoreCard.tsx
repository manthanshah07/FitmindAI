import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ProgressBar } from '../ui/ProgressBar';
import { getFitnessScoreApi } from '../../lib/api/fitnessScore';
import { getErrorMessage } from '../../utils/apiError';
import type { FitnessScoreResponse } from '../../types/fitnessScore';

interface FitnessScoreCardProps {
  compact?: boolean;
  onNavigateProgress?: () => void;
}

export const FitnessScoreCard: React.FC<FitnessScoreCardProps> = ({ compact = false, onNavigateProgress }) => {
  const [data, setData] = useState<FitnessScoreResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  if (isLoading) {
    return (
      <Card className="p-6 min-h-[160px] flex items-center justify-center">
        <span className="text-xs text-text-muted uppercase tracking-wider animate-pulse font-medium">
          Evaluating Fitness Performance...
        </span>
      </Card>
    );
  }

  if (error || !data || !data.current_score) {
    return (
      <Card className="p-6 border-danger/30 text-danger flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider">Fitness Score Error</span>
        <p className="text-xs text-text-secondary">{error || 'Could not load fitness score.'}</p>
        <Button variant="secondary" onClick={loadScore} className="self-start mt-2">
          Retry
        </Button>
      </Card>
    );
  }

  const { current_score, score_label } = data;

  const getChipVariant = (): 'accent' | 'warning' | 'neutral' => {
    if (score_label === 'Excellent' || score_label === 'Good') return 'accent';
    if (score_label === 'Fair') return 'warning';
    return 'neutral';
  };

  if (compact) {
    return (
      <Card className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              Weekly Fitness Score
            </span>
            <Chip variant={getChipVariant()}>{score_label}</Chip>
          </div>
          <div className="flex items-baseline gap-2 my-2">
            <h3 className="text-4xl font-bold text-text-primary tracking-tight font-variant-numeric:tabular-nums">
              {current_score.score}
            </h3>
            <span className="text-xs text-text-muted">/ 100</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Workouts {current_score.workout_adherence_pct ?? 0}% • Calories {current_score.nutrition_score ?? 0}% • Protein {current_score.protein_score ?? 0}% • Logging {current_score.consistency_score ?? 0}%
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {current_score.period_start} to {current_score.period_end}
          </span>
          {onNavigateProgress && (
            <Button variant="ghost" size="sm" onClick={onNavigateProgress}>
              View Details
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Determine "What to improve" dynamically from lowest component
  const components = [
    { name: 'Workouts', score: current_score.workout_adherence_pct ?? 0, weight: 35, tip: 'Complete all planned workout sets for full session credits.' },
    { name: 'Calories', score: current_score.nutrition_score ?? 0, weight: 25, tip: 'Stay close to your daily calorie target for maximum adherence.' },
    { name: 'Protein', score: current_score.protein_score ?? 0, weight: 20, tip: 'Hit your daily protein intake goal consistently.' },
    { name: 'Logging', score: current_score.consistency_score ?? 0, weight: 20, tip: 'Log your meals and workouts daily to build consistency.' },
  ];

  const sortedComponents = [...components].sort((a, b) => a.score - b.score);
  const lowestComponent = sortedComponents[0];

  return (
    <Card className="p-6 md:p-8 flex flex-col gap-6 w-full max-w-full min-w-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 min-w-0">
        <div className="min-w-0">
          <span className="text-xs text-accent font-semibold uppercase tracking-wider block mb-1">
            Your Fitness Score
          </span>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Weekly Fitness Score
          </h2>
          <span className="text-xs text-text-muted block mt-1">
            Period: {current_score.period_start} → {current_score.period_end}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-4xl font-bold text-text-primary tracking-tight tabular-nums block">
              {current_score.score}
              <span className="text-sm font-normal text-text-muted">/100</span>
            </span>
            <Chip variant={getChipVariant()}>{score_label}</Chip>
          </div>
        </div>
      </div>

      {/* Dynamic What to Improve Banner */}
      <div className="p-4 bg-surface-subtle border border-border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">
            What to improve
          </span>
          <p className="text-xs text-text-secondary mt-0.5 break-words">
            Focus on <strong className="text-text-primary">{lowestComponent.name}</strong> ({lowestComponent.score}%). {lowestComponent.tip}
          </p>
        </div>
      </div>

      {/* 4-Bar Component Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 max-w-full">
        {components.map((c) => {
          const earnedPoints = ((c.score / 100) * c.weight).toFixed(1);
          return (
            <div key={c.name} className="p-4 bg-surface-subtle border border-border rounded-lg flex flex-col gap-2 min-w-0">
              <div className="flex justify-between gap-2 text-xs min-w-0">
                <span className="font-medium text-text-primary truncate">
                  {c.name} ({c.weight}%)
                </span>
                <span className="font-semibold text-text-primary tabular-nums shrink-0">
                  {earnedPoints} / {c.weight} pts ({c.score}%)
                </span>
              </div>
              <ProgressBar value={c.score} max={100} />
            </div>
          );
        })}
      </div>

      {/* Expandable "How this is calculated" section */}
      <details className="pt-2 border-t border-border group">
        <summary className="text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary transition-colors flex items-center justify-between">
          <span>How this is calculated (Formula V2)</span>
          <span className="text-text-muted group-open:rotate-180 transition-transform text-[10px]">▼</span>
        </summary>
        <div className="text-xs text-text-secondary mt-3 space-y-2 leading-relaxed">
          <p>
            The Fitness Score (0–100) evaluates your rolling 7-day adherence across 4 data-backed categories:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Workouts (35%):</strong> Evaluates actual work completed. Sessions with &lt;3 completed sets earn 0 credit. Sessions earn credit proportional to completed vs planned sets.
            </li>
            <li>
              <strong>Calories (25%):</strong> Evaluates average daily calorie target adherence across logged days.
            </li>
            <li>
              <strong>Protein (20%):</strong> Evaluates average daily protein intake relative to your daily target.
            </li>
            <li>
              <strong>Logging Consistency (20%):</strong> Evaluates active days with logged meals, workouts, or weigh-ins.
            </li>
          </ul>
          <p className="text-[11px] text-text-muted">
            Zero invented data: All inputs derive strictly from your recorded workouts, nutrition logs, and body measurements.
          </p>
        </div>
      </details>
    </Card>
  );
};
