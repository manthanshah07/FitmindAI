import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface-2' | 'dark' | 'bordered';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-md transition-colors duration-150 p-6 md:p-8';

  const variantStyles = {
    default: 'bg-surface text-text border border-border shadow-none',
    'surface-2': 'bg-surface-2 text-text border border-border shadow-none',
    dark: 'bg-surface text-text border border-border',
    bordered: 'bg-transparent text-text border border-border',
  }[variant];

  return (
    <div className={twMerge(clsx(baseStyles, variantStyles, className))} {...props}>
      {children}
    </div>
  );
};
