import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface RingProps {
  value: number; // 0 to 100
  size?: number; // size in px, default 80
  strokeWidth?: number; // default 8
  label?: string;
  variant?: 'accent' | 'carbs' | 'fat';
  className?: string;
  children?: React.ReactNode;
}

export const Ring: React.FC<RingProps> = ({
  value,
  size = 80,
  strokeWidth = 8,
  label,
  variant = 'accent',
  className = '',
  children,
}) => {
  const percentage = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const strokeColor = {
    accent: 'var(--accent)',
    carbs: 'var(--chart-carbs)',
    fat: 'var(--chart-fat)',
  }[variant];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Circular Progress'}
      className={twMerge(clsx('relative inline-flex items-center justify-center', className))}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-sans font-semibold text-text tabular-nums">
        {children || <span className="text-xs">{Math.round(percentage)}%</span>}
      </div>
    </div>
  );
};
