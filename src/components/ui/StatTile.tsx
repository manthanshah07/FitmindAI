import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sublabel?: string;
  subtext?: string;
  delta?: string;
  trend?:
    | {
        value: string;
        positive?: boolean;
        neutral?: boolean;
      }
    | 'positive'
    | 'negative'
    | 'neutral';
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  sublabel,
  subtext,
  delta,
  trend,
  className = '',
}) => {
  const secondaryText = subtext || sublabel;

  const trendObj =
    typeof trend === 'string'
      ? {
          value: delta || '',
          positive: trend === 'positive',
          neutral: trend === 'neutral',
        }
      : trend;

  return (
    <div
      className={twMerge(
        clsx(
          'p-5 rounded-md bg-surface border border-border flex flex-col justify-between gap-2 shadow-none',
          className,
        ),
      )}
    >
      <div className="text-xs font-medium text-text-2 tracking-normal">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl md:text-3xl font-semibold text-text tracking-tight tabular-nums">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-text-2">{unit}</span>}
        </div>
        {trendObj && trendObj.value && (
          <span
            className={clsx(
              'text-xs font-medium tabular-nums',
              trendObj.positive && 'text-accent',
              !trendObj.positive && !trendObj.neutral && 'text-danger',
              trendObj.neutral && 'text-text-2',
            )}
          >
            {trendObj.value}
          </span>
        )}
      </div>
      {secondaryText && <div className="text-xs text-text-3 font-normal">{secondaryText}</div>}
    </div>
  );
};
