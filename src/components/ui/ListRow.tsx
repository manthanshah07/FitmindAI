import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  label?: React.ReactNode;
  subtitle?: React.ReactNode;
  sublabel?: React.ReactNode;
  value?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  label,
  subtitle,
  sublabel,
  value,
  leading,
  trailing,
  action,
  onClick,
  className = '',
  ...props
}) => {
  const isInteractive = Boolean(onClick);
  const displayTitle = title ?? label;
  const displaySubtitle = subtitle ?? sublabel;
  const displayTrailing = trailing ?? value ?? action;

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={twMerge(
        clsx(
          'flex items-center justify-between gap-4 py-3.5 px-4 border-b border-border transition-colors',
          isInteractive &&
            'cursor-pointer hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          className,
        ),
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {leading && <div className="shrink-0 text-text-2">{leading}</div>}
        <div className="flex flex-col min-w-0">
          <div className="text-sm font-medium text-text truncate">{displayTitle}</div>
          {displaySubtitle && <div className="text-xs text-text-2 truncate">{displaySubtitle}</div>}
        </div>
      </div>
      {displayTrailing && <div className="shrink-0 text-sm text-text-2 font-medium">{displayTrailing}</div>}
    </div>
  );
};
