import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={twMerge(
      clsx(
        'inline-flex items-center gap-2 border-b border-border w-full pb-px',
        className,
      ),
    )}
    {...props}
  />
));
TabsList.displayName = RadixTabs.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={twMerge(
      clsx(
        'inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
        'border-b-2 border-transparent text-text-2 hover:text-text',
        'data-[state=active]:border-accent data-[state=active]:text-text data-[state=active]:font-semibold',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50 min-h-[44px]',
        className,
      ),
    )}
    {...props}
  />
));
TabsTrigger.displayName = RadixTabs.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={twMerge(
      clsx(
        'pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      ),
    )}
    {...props}
  />
));
TabsContent.displayName = RadixTabs.Content.displayName;
