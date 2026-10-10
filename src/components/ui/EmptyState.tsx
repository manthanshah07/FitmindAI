import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  message?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  message,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  const textDescription = description || message;

  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 md:p-12',
          'rounded-md border border-dashed border-border bg-surface/50 min-h-[220px]',
          className,
        ),
      )}
    >
      {icon && <div className="mb-3 text-text-3 p-3 bg-surface-2 rounded-full">{icon}</div>}
      <h3 className="text-base font-semibold text-text tracking-tight mb-1">{title}</h3>
      {textDescription && (
        <p className="text-sm text-text-2 max-w-sm mb-5 leading-relaxed">{textDescription}</p>
      )}
      {action ? (
        <div className="mt-1">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-1">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
