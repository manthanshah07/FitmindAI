import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'olive' | 'faded' | 'error' | 'graphite';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'olive',
  children,
  className = '',
  ...props
}) => {
  let variantStyles = '';

  switch (variant) {
    case 'olive':
      variantStyles = 'border border-accent/30 text-accent-soft-text bg-accent-soft';
      break;
    case 'faded':
      variantStyles = 'border border-border text-text-2 bg-surface-2';
      break;
    case 'error':
      variantStyles = 'border border-danger/30 text-danger bg-danger-soft';
      break;
    case 'graphite':
      variantStyles = 'border border-border bg-surface text-text';
      break;
  }

  return (
    <span
      className={`font-sans text-xs px-2.5 py-0.5 inline-flex items-center rounded-full font-medium ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
