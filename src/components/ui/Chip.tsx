import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'neutral' | 'accent' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-normal select-none';

  const variantStyles = {
    default: 'bg-surface-2 text-text border border-border',
    neutral: 'bg-surface-2 text-text border border-border',
    accent: 'bg-accent-soft text-accent-soft-text border border-accent/20',
    success: 'bg-accent-soft text-accent-soft-text border border-accent/20',
    warning: 'bg-warning-soft text-warning border border-warning/20',
    danger: 'bg-danger-soft text-danger border border-danger/20',
  }[variant];

  return (
    <span className={twMerge(clsx(baseStyles, variantStyles, className))} {...props}>
      {children}
    </span>
  );
};
