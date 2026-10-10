import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  open?: boolean;
  isOpen?: boolean;
  type?: 'success' | 'warning' | 'error' | 'info';
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  open,
  isOpen,
  type,
  variant,
  title,
  message,
  description,
  onClose,
  className = '',
}) => {
  const isVisible = open !== undefined ? open : isOpen !== undefined ? isOpen : true;
  if (!isVisible) return null;

  const activeType = variant || type || 'info';
  const bodyText = description || message;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    info: <Info className="w-5 h-5 text-text-2 shrink-0" />,
  }[activeType];

  return (
    <div
      role={activeType === 'error' ? 'alert' : 'status'}
      aria-live={activeType === 'error' ? 'assertive' : 'polite'}
      className={twMerge(
        clsx(
          'flex items-start gap-3 p-4 bg-surface border border-border rounded-md shadow-float max-w-sm w-full',
          className,
        ),
      )}
    >
      {icons}
      <div className="flex-1 min-w-0">
        {title && <div className="text-sm font-semibold text-text">{title}</div>}
        {bodyText && <div className="text-xs text-text-2 leading-relaxed">{bodyText}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="p-1 rounded-sm text-text-3 hover:text-text hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
