import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  action,
  className = '',
}) => {
  const textDesc = description || subtitle;

  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border',
          className,
        ),
      )}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text font-sans">
          {title}
        </h1>
        {textDesc && (
          <p className="text-sm text-text-2 font-normal leading-relaxed max-w-2xl">
            {textDesc}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};
