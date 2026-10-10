import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      error,
      helperText,
      startAdornment,
      endAdornment,
      id,
      required,
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text select-none">
            {label}
            {required && <span className="text-accent ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {startAdornment && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-2">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                'w-full bg-surface border rounded-sm px-3.5 py-2.5 font-sans text-sm text-text placeholder:text-text-3',
                'h-11 transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:border-accent',
                'disabled:opacity-50 disabled:bg-surface-2 disabled:cursor-not-allowed',
                startAdornment && 'pl-10',
                endAdornment && 'pr-11',
                error
                  ? 'border-danger text-text focus:ring-danger focus:border-danger'
                  : 'border-border hover:border-text-3/50',
                className,
              ),
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-2 flex items-center">{endAdornment}</div>
          )}
        </div>
        {error && (
          <span id={errorId} className="text-xs text-danger font-medium" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="text-xs text-text-3">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

TextField.displayName = 'TextField';

// Export Input as alias for backwards compatibility
export const Input = TextField;
