import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  unit,
  disabled = false,
  className = '',
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    const next = Math.max(min, Math.round((value - step) * 100) / 100);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    const next = Math.min(max, Math.round((value + step) * 100) / 100);
    onChange(next);
  };

  return (
    <div className={twMerge(clsx('flex flex-col gap-1.5', className))}>
      {label && <span className="text-sm font-medium text-text">{label}</span>}
      <div className="inline-flex items-center rounded-sm border border-border bg-surface h-11 p-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label="Decrease value"
          className="w-9 h-9 flex items-center justify-center rounded-sm text-text hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-[3rem] px-2 text-center font-sans font-semibold text-text tabular-nums text-base">
          {value}
          {unit && <span className="ml-1 text-xs font-normal text-text-2">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label="Increase value"
          className="w-9 h-9 flex items-center justify-center rounded-sm text-text hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
