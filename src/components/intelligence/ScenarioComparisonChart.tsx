import React from 'react';
import type { ScenarioResult, TrajectoryProjectionResponse } from '../../types/intelligence';

interface ScenarioComparisonChartProps {
  baselineProjection: TrajectoryProjectionResponse;
  scenarios: ScenarioResult[];
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({
  baselineProjection,
  scenarios,
}) => {
  if (scenarios.length === 0) return null;

  const baseChange = baselineProjection.predicted_change_28d_kg;
  const allChanges = [baseChange, ...scenarios.map((s) => s.projected_change_28d_kg)];
  const maxAbs = Math.max(...allChanges.map((v) => Math.abs(v)), 1.0);
  const scaleSpan = maxAbs * 1.3;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Baseline Anchor Row */}
      <div className="p-4 border border-borderLine bg-bone/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-graphite text-sm">Current Plan Baseline</span>
            <span className="font-mono text-[10px] uppercase bg-black/5 px-2 py-0.5 text-faded font-bold">
              Baseline
            </span>
          </div>
          <span className="text-xs text-faded font-mono mt-0.5">
            {baselineProjection.features_used.F08 || 2000} kcal/day • {baselineProjection.features_used.F10 || 120}g protein
          </span>
        </div>

        <div className="flex items-baseline gap-4 sm:text-right">
          <div>
            <span className="text-[10px] font-mono uppercase text-faded block">Projected 28d Change</span>
            <span className="font-mono text-base font-bold text-graphite">
              {baseChange > 0 ? `+${baseChange.toFixed(2)}` : baseChange.toFixed(2)} kg
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-faded block">Projected Weight</span>
            <span className="font-mono text-base font-bold text-graphite">
              {baselineProjection.projected_weight_28d_kg.toFixed(1)} kg
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Rows */}
      <div className="flex flex-col gap-3">
        {scenarios.map((sc, idx) => {
          const deltaFromBase = sc.scenario_delta_kg;
          const isMoreLoss = deltaFromBase < 0;

          // Compute bar position relative to center (0 kg)
          const barWidthPct = Math.min((Math.abs(sc.projected_change_28d_kg) / scaleSpan) * 50, 50);
          const isNegative = sc.projected_change_28d_kg < 0;

          return (
            <div
              key={idx}
              className="p-4 border border-borderLine bg-white flex flex-col gap-3 transition-colors hover:border-graphite"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-graphite text-sm">{sc.scenario_name}</h4>
                    <span className="font-mono text-[10px] uppercase border border-borderLine px-2 py-0.5 text-olive font-bold">
                      Scenario
                    </span>
                  </div>
                  <span className="text-xs text-charcoal font-mono mt-0.5 block">
                    {sc.input_modifications.daily_calories ? `${sc.input_modifications.daily_calories} kcal` : 'Unchanged kcal'}
                    {' • '}
                    {sc.input_modifications.daily_protein_g ? `${sc.input_modifications.daily_protein_g}g protein` : 'Unchanged protein'}
                    {sc.input_modifications.activity_multiplier && ` • Activity ×${sc.input_modifications.activity_multiplier}`}
                  </span>
                </div>

                <div className="flex items-baseline gap-4 sm:text-right">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-faded block">Projected 28d</span>
                    <span className="font-mono text-base font-bold text-graphite">
                      {sc.projected_change_28d_kg > 0 ? `+${sc.projected_change_28d_kg.toFixed(2)}` : sc.projected_change_28d_kg.toFixed(2)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-faded block">Projected Weight</span>
                    <span className="font-mono text-base font-bold text-graphite">
                      {sc.projected_weight_28d_kg.toFixed(1)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-faded block">vs Current Plan</span>
                    <span className={`font-mono text-base font-bold ${isMoreLoss ? 'text-olive' : 'text-graphite'}`}>
                      {deltaFromBase > 0 ? `+${deltaFromBase.toFixed(2)}` : deltaFromBase.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Relative Deviation Bar */}
              <div className="w-full bg-bone h-2 relative border border-borderLine overflow-hidden">
                {/* Center marker line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-borderLine z-10" />

                {/* Magnitude Bar */}
                <div
                  className={`absolute top-0 bottom-0 ${isNegative ? 'bg-olive' : 'bg-charcoal'}`}
                  style={{
                    left: isNegative ? `${50 - barWidthPct}%` : '50%',
                    width: `${barWidthPct}%`,
                  }}
                />
              </div>

              {/* Non-causal statement */}
              <p className="text-[11px] text-faded font-sans leading-relaxed pt-1 border-t border-borderLine/50">
                {sc.non_causal_statement}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
