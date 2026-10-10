import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      icon,
      children,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-sans font-medium rounded-sm transition-colors duration-150 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs min-h-[36px]',
      md: 'h-11 px-4 text-sm min-h-[44px]',
      lg: 'h-12 px-6 text-base min-h-[48px]',
    }[size];

    const variantStyles = {
      primary: 'bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-hover/90 shadow-sm',
      secondary: 'bg-surface text-text border border-border hover:bg-surface-2 active:bg-surface-2/90',
      ghost: 'bg-transparent text-text hover:bg-surface-2 active:bg-surface-2/80',
      destructive: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
    }[variant];

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={twMerge(clsx(baseStyles, sizeStyles, variantStyles, widthStyles, className))}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {icon && <span aria-hidden="true">{icon}</span>}
            {children}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
