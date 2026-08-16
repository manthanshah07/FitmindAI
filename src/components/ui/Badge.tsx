import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'olive' | 'faded' | 'error' | 'graphite';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'olive', children, className = '', ...props }) => {
  let variantStyles = '';

  switch (variant) {
    case 'olive':
      variantStyles = 'border border-olive text-olive bg-olive/5';
      break;
    case 'faded':
      variantStyles = 'border border-borderLine text-faded bg-black/5';
      break;
    case 'error':
      variantStyles = 'border border-error text-error bg-error/5';
      break;
    case 'graphite':
      variantStyles = 'border border-graphite bg-graphite text-bone';
      break;
  }

  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 inline-block rounded-none font-bold ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
