import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  variant?: 'accent' | 'carbs' | 'fat' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  variant = 'accent',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const barColor = {
    accent: 'bg-accent',
    carbs: 'bg-chart-carbs',
    fat: 'bg-chart-fat',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[variant];

  return (
    <div className={twMerge(clsx('flex flex-col gap-1 w-full', className))}>
      {(label || showLabel) && (
        <div className="flex justify-between items-center text-xs text-text-2 font-medium">
          {label && <span>{label}</span>}
          {showLabel && <span className="tabular-nums font-semibold">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
        className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-border/50"
      >
        <div
          className={clsx('h-full transition-all duration-300 ease-out rounded-full', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
