import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export const BottomSheetRoot = RadixDialog.Root;
export const BottomSheetTrigger = RadixDialog.Trigger;
export const BottomSheetClose = RadixDialog.Close;

export const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(({ className, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-150" />
    <RadixDialog.Content
      ref={ref}
      className={twMerge(
        clsx(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col',
          'max-h-[90dvh] w-full bg-surface border-t border-border rounded-t-md shadow-float',
          'p-6 overflow-y-auto focus:outline-none transition-transform duration-200 ease-out',
          className,
        ),
      )}
      {...props}
    >
      {/* Mobile handle indicator */}
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border shrink-0" aria-hidden="true" />
      {children}
      <RadixDialog.Close
        aria-label="Close sheet"
        className="absolute right-4 top-4 rounded-sm p-1.5 text-text-2 hover:text-text hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" />
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
BottomSheetContent.displayName = 'BottomSheetContent';

export const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={twMerge(clsx('flex flex-col gap-1 mb-4', className))} {...props} />
);
BottomSheetHeader.displayName = 'BottomSheetHeader';

export const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={twMerge(clsx('text-lg font-semibold tracking-tight text-text', className))}
    {...props}
  />
));
BottomSheetTitle.displayName = 'BottomSheetTitle';

export const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={twMerge(clsx('text-xs text-text-3', className))}
    {...props}
  />
));
BottomSheetDescription.displayName = 'BottomSheetDescription';

export interface BottomSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
}) => {
  const isControlledOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    if (!nextOpen && onClose) onClose();
  };

  if (title) {
    return (
      <RadixDialog.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{title}</BottomSheetTitle>
            {description && <BottomSheetDescription>{description}</BottomSheetDescription>}
          </BottomSheetHeader>
          {children}
        </BottomSheetContent>
      </RadixDialog.Root>
    );
  }

  return (
    <RadixDialog.Root open={isControlledOpen} onOpenChange={handleOpenChange}>
      {children}
    </RadixDialog.Root>
  );
};
