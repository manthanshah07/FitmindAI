import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  className = '',
  ...props
}) => {
  const variantStyles = {
    rect: 'rounded-sm',
    circle: 'rounded-full aspect-square',
    text: 'rounded-sm h-4 w-full',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={twMerge(
        clsx(
          'animate-pulse bg-surface-2 border border-border/40',
          variantStyles,
          className,
        ),
      )}
      {...props}
    />
  );
};
