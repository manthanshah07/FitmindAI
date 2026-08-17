import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, required, className = '', disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-mono text-xs uppercase tracking-widest text-graphite font-bold">
            {label}
            {required && <span className="text-olive ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-bone border rounded-none px-3 py-2.5 sm:p-3.5 font-sans text-sm text-graphite placeholder:text-faded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-error text-error focus:ring-error' : 'border-borderLine focus:border-graphite'
          } ${className}`}
          {...props}
        />
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

Input.displayName = 'Input';
