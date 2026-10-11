import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  label?: string;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={twMerge(clsx('flex flex-col gap-1.5 min-w-0 max-w-full', className))}>
      {label && <span className="text-xs font-medium text-text-2">{label}</span>}
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex max-w-full min-w-0 overflow-x-auto flex-nowrap scrollbar-none p-1 bg-surface-2 border border-border rounded-sm gap-1 select-none"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs font-medium rounded-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[36px] flex items-center justify-center',
                isSelected
                  ? 'bg-surface text-text shadow-sm font-semibold'
                  : 'text-text-2 hover:text-text hover:bg-surface/50',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
