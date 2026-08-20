import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getTodayNutritionSummaryApi, seedFoodsApi } from '../../lib/api/nutrition';
import { getErrorMessage } from '../../utils/apiError';

export const NutritionOverviewPage: React.FC = () => {
  const location = useLocation();
  const [feedback] = useState<string | null>(
    (location.state as { message?: string })?.message || null,
  );

  const {
    data: summary,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['todayNutritionSummary'],
    queryFn: async () => {
      await seedFoodsApi().catch(() => {});
      return getTodayNutritionSummaryApi();
    },
  });

  const error = queryError ? getErrorMessage(queryError) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          FitMind Nutrition Engine
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Calculating Daily Macro Summary...
        </h3>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col gap-4 p-8 border border-error bg-error/5 text-error">
        <h3 className="font-mono text-lg font-bold uppercase">Nutrition Error</h3>
        <p className="text-xs font-sans">{error || 'Could not load daily nutrition summary.'}</p>
        <NavLink to="/dashboard">
          <Button variant="secondary">← Back to Dashboard</Button>
        </NavLink>
      </div>
    );
  }

  const { targets, consumed, remaining, meals_by_type } = summary;
  const calPct = Math.min(100, Math.round((consumed.calories / (targets.calories || 1)) * 100));
  const protPct = Math.min(100, Math.round((consumed.protein_g / (targets.protein_g || 1)) * 100));
  const carbPct = Math.min(100, Math.round((consumed.carbs_g / (targets.carbs_g || 1)) * 100));
  const fatPct = Math.min(100, Math.round((consumed.fat_g / (targets.fat_g || 1)) * 100));

  const mealCategories: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = [
    'breakfast',
    'lunch',
    'dinner',
    'snack',
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Nutrition & Macro System
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            Today's Nutrition Summary
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Track daily calorie consumption and macronutrient targets calibrated from your active fitness goal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink to="/nutrition/history">
            <Button variant="secondary">Log History</Button>
          </NavLink>
          <NavLink to="/nutrition/log">
            <Button variant="primary">Log Meal +</Button>
          </NavLink>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 border border-olive bg-olive/5 text-olive font-mono text-xs uppercase tracking-wider">
          {feedback}
        </div>
      )}

      {/* Daily Progress Bars Grid */}
      <Card className="p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-borderLine">
          <div>
            <span className="font-mono text-[10px] text-faded uppercase tracking-widest block mb-1">
              Calorie Target Progress
            </span>
            <h2 className="text-3xl font-bold uppercase text-graphite font-mono">
              {consumed.calories} / {targets.calories} <span className="text-sm font-sans font-normal text-charcoal">kcal</span>
            </h2>
          </div>
          <Badge variant="olive">{remaining.calories} kcal Remaining</Badge>
        </div>

        {/* Calorie Bar */}
        <div>
          <div className="flex justify-between font-mono text-xs text-graphite mb-1 font-bold">
            <span>Calories Consumed ({calPct}%)</span>
            <span>{consumed.calories} / {targets.calories} kcal</span>
          </div>
          <div className="w-full bg-bone border border-borderLine h-3">
            <div className="bg-olive h-full transition-all" style={{ width: `${calPct}%` }} />
          </div>
        </div>

        {/* Macros 3-Col Bar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Protein */}
          <div>
            <div className="flex justify-between font-mono text-xs text-graphite mb-1 font-bold">
              <span>Protein</span>
              <span>{consumed.protein_g} / {targets.protein_g}g</span>
            </div>
            <div className="w-full bg-bone border border-borderLine h-2.5">
              <div className="bg-graphite h-full transition-all" style={{ width: `${protPct}%` }} />
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex justify-between font-mono text-xs text-graphite mb-1 font-bold">
              <span>Carbohydrates</span>
              <span>{consumed.carbs_g} / {targets.carbs_g}g</span>
            </div>
            <div className="w-full bg-bone border border-borderLine h-2.5">
              <div className="bg-charcoal h-full transition-all" style={{ width: `${carbPct}%` }} />
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="flex justify-between font-mono text-xs text-graphite mb-1 font-bold">
              <span>Fats</span>
              <span>{consumed.fat_g} / {targets.fat_g}g</span>
            </div>
            <div className="w-full bg-bone border border-borderLine h-2.5">
              <div className="bg-accent h-full transition-all" style={{ width: `${fatPct}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Meals Logged Today Breakdown */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold uppercase tracking-tighter text-graphite font-mono border-b border-borderLine pb-3">
          Today's Logged Meals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mealCategories.map((cat) => {
            const logs = meals_by_type[cat] || [];
            const categoryCals = logs.reduce(
              (sum, log) =>
                sum + log.items.reduce((iSum, item) => iSum + item.calculated_calories, 0),
              0,
            );

            return (
              <Card key={cat} className="p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-borderLine pb-2">
                    <h3 className="font-mono text-base font-bold uppercase text-graphite">
                      {cat}
                    </h3>
                    <Badge variant={categoryCals > 0 ? 'olive' : 'faded'}>
                      {categoryCals.toFixed(1)} kcal
                    </Badge>
                  </div>

                  {logs.length === 0 ? (
                    <p className="text-xs text-faded font-mono py-2">
                      No items logged for {cat} yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {logs.map((log) =>
                        log.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs font-mono p-2 bg-bone border border-borderLine"
                          >
                            <span className="font-bold text-graphite truncate max-w-[180px]">
                              {item.food?.name || 'Food item'}
                            </span>
                            <span className="text-charcoal">
                              {item.quantity_grams}g • <strong className="text-olive">{item.calculated_calories} kcal</strong>
                            </span>
                          </div>
                        )),
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <NavLink to="/nutrition/log" state={{ mealType: cat }}>
                    <Button variant="secondary" className="w-full text-xs">
                      + Add to {cat}
                    </Button>
                  </NavLink>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
