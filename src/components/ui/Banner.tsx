import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { IconButton } from './IconButton';

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  BannerVariant,
  { containerClass: string; iconClass: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }
> = {
  info: {
    containerClass: 'bg-info/10 border-info/30 text-text-primary',
    iconClass: 'text-info',
    Icon: Info,
  },
  success: {
    containerClass: 'bg-success/10 border-success/30 text-text-primary',
    iconClass: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    containerClass: 'bg-warning/10 border-warning/30 text-text-primary',
    iconClass: 'text-warning',
    Icon: AlertTriangle,
  },
  danger: {
    containerClass: 'bg-danger/10 border-danger/30 text-text-primary',
    iconClass: 'text-danger',
    Icon: AlertCircle,
  },
};

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  children,
  action,
  onDismiss,
  className = '',
}) => {
  const config = variantConfig[variant];
  const Icon = config.Icon;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${config.containerClass} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconClass}`} aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-semibold text-text-primary mb-0.5">{title}</p>}
        <div className="text-text-secondary">{children}</div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
      {onDismiss && (
        <IconButton
          icon={<X className="h-4 w-4" />}
          aria-label="Dismiss banner"
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="-mr-1 -mt-1 text-text-tertiary hover:text-text-primary"
        />
      )}
    </div>
  );
};
