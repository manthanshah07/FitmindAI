import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  let baseStyles =
    'px-8 py-4 font-mono font-bold tracking-widest uppercase text-xs transition-colors duration-150 rounded-none focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';

  if (fullWidth) {
    baseStyles += ' w-full';
  }

  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = 'bg-graphite text-bone border border-graphite hover:bg-charcoal active:bg-black';
      break;
    case 'secondary':
      variantStyles = 'bg-transparent border border-borderLine text-graphite hover:border-graphite hover:bg-black/5';
      break;
    case 'ghost':
      variantStyles = 'bg-transparent border border-bone text-bone hover:bg-bone hover:text-graphite';
      break;
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles} ${className}`}
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
