import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'bordered';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ variant = 'default', children, className = '', ...props }) => {
  let baseStyles = 'p-8 md:p-12 rounded-none transition-colors duration-150';

  switch (variant) {
    case 'default':
      baseStyles += ' bg-bone border border-borderLine text-graphite';
      break;
    case 'dark':
      baseStyles += ' bg-graphite border border-graphite text-bone';
      break;
    case 'bordered':
      baseStyles += ' bg-transparent border-2 border-graphite text-graphite';
      break;
  }

  return (
    <div className={`${baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};
