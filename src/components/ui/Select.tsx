import React, { forwardRef } from 'react';

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
  ({ label, options, error, helperText, id, required, className = '', disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = selectId ? `${selectId}-error` : undefined;
    const helperId = selectId ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="font-mono text-xs uppercase tracking-widest text-graphite font-bold">
            {label}
            {required && <span className="text-olive ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-bone border rounded-none px-3 py-2.5 sm:p-3.5 font-sans text-sm text-graphite transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-error text-error focus:ring-error' : 'border-borderLine focus:border-graphite'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={errorId} className="font-mono text-xs text-error font-medium" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="font-mono text-xs text-faded">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
