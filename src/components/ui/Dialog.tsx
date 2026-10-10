import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import { Button } from './Button';

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogPortal = RadixDialog.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={twMerge(
      clsx(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-150',
        className,
      ),
    )}
    {...props}
  />
));
DialogOverlay.displayName = RadixDialog.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={twMerge(
        clsx(
          'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
          'w-full max-w-lg p-6 bg-surface border border-border rounded-md shadow-float',
          'focus:outline-none duration-200',
          className,
        ),
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close
        aria-label="Close dialog"
        className="absolute right-4 top-4 rounded-sm p-1.5 text-text-2 hover:text-text hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" />
      </RadixDialog.Close>
    </RadixDialog.Content>
  </DialogPortal>
));
DialogContent.displayName = RadixDialog.Content.displayName;

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={twMerge(clsx('flex flex-col gap-1.5 mb-4', className))} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={twMerge(clsx('text-lg font-semibold tracking-tight text-text', className))}
    {...props}
  />
));
DialogTitle.displayName = RadixDialog.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={twMerge(clsx('text-sm text-text-2 leading-relaxed', className))}
    {...props}
  />
));
DialogDescription.displayName = RadixDialog.Description.displayName;

export interface DialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  primaryAction?: {
    label: string;
    variant?: 'primary' | 'destructive' | 'secondary';
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
}) => {
  const isControlledOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    if (!nextOpen && onClose) onClose();
  };

  // If simple declarative dialog with title/description/actions
  if (title || description || primaryAction) {
    return (
      <RadixDialog.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          {title && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-2">
              {secondaryAction && (
                <Button variant="secondary" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || 'primary'}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </RadixDialog.Root>
    );
  }

  return (
    <RadixDialog.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
      {children}
    </RadixDialog.Root>
  );
};
