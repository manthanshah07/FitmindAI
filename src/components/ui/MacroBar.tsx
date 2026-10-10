import React from 'react';
import { formatGrams } from '../../lib/format';

export interface MacroBarProps {
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  showLabels?: boolean;
  className?: string;
}

export const MacroBar: React.FC<MacroBarProps> = ({
  protein,
  carbs,
  fat,
  showLabels = true,
  className = '',
}) => {
  const total = Math.max(protein + carbs + fat, 0.0001);
  const pPct = (protein / total) * 100;
  const cPct = (carbs / total) * 100;
  const fPct = (fat / total) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Visual Bar */}
      <div
        role="meter"
        aria-label={`Macros breakdown: Protein ${formatGrams(protein)}, Carbs ${formatGrams(carbs)}, Fat ${formatGrams(fat)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        {protein > 0 && (
          <div
            style={{ width: `${pPct}%` }}
            className="h-full bg-macro-protein transition-all duration-300"
            title={`Protein: ${formatGrams(protein)} (${Math.round(pPct)}%)`}
          />
        )}
        {carbs > 0 && (
          <div
            style={{ width: `${cPct}%` }}
            className="h-full bg-macro-carbs transition-all duration-300"
            title={`Carbs: ${formatGrams(carbs)} (${Math.round(cPct)}%)`}
          />
        )}
        {fat > 0 && (
          <div
            style={{ width: `${fPct}%` }}
            className="h-full bg-macro-fat transition-all duration-300"
            title={`Fat: ${formatGrams(fat)} (${Math.round(fPct)}%)`}
          />
        )}
      </div>

      {/* Legend & Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-macro-protein" aria-hidden="true" />
            <span>Protein</span>
            <span className="font-semibold tabular-nums text-text-primary">{formatGrams(protein)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-macro-carbs" aria-hidden="true" />
            <span>Carbs</span>
            <span className="font-semibold tabular-nums text-text-primary">{formatGrams(carbs)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-macro-fat" aria-hidden="true" />
            <span>Fat</span>
            <span className="font-semibold tabular-nums text-text-primary">{formatGrams(fat)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
