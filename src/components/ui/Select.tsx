import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, error, helperText, id, required, className = '', disabled, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text select-none">
            {label}
            {required && <span className="text-accent ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={twMerge(
            clsx(
              'w-full bg-surface border rounded-sm px-3.5 py-2.5 font-sans text-sm text-text',
              'h-11 transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:border-accent',
              'disabled:opacity-50 disabled:bg-surface-2 disabled:cursor-not-allowed',
              error
                ? 'border-danger text-text focus:ring-danger focus:border-danger'
                : 'border-border hover:border-text-3/50',
              className,
            ),
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-text">
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
