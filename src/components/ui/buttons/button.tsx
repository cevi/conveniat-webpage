import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/utils/tailwindcss-override';

// in the app, focus is the shared ring from globals.scss; `site:` keeps the website's own
const buttonVariants = cva(
  'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors site:focus-visible:outline-hidden site:focus-visible:ring-1 site:focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 site:dark:focus-visible:ring-neutral-300',
  {
    variants: {
      variant: {
        default:
          'bg-neutral-900 text-neutral-50 shadow-sm hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90',
        destructive:
          'bg-red-500 text-neutral-50 shadow-xs hover:bg-red-500/90 dark:bg-red-900 dark:text-neutral-50 dark:hover:bg-red-900/90',
        outline:
          'border border-gray-200 bg-white shadow-xs hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
        secondary:
          'rounded-sm border-2 border-solid border-green-600 bg-green-100 px-4 py-2 font-bold text-conveniat-green outline-hidden hover:bg-neutral-100/80',
        // the website's; in the app its neutral grey hover would be a colour of no role, see `plain`
        ghost:
          'site:hover:bg-neutral-100 site:hover:text-neutral-900 site:dark:hover:bg-neutral-800 site:dark:hover:text-neutral-50',
        link: 'text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50',
        // the app's design language: one primary action in brand green, the others quiet
        primary: 'bg-conveniat-green font-semibold text-white hover:bg-green-700',
        quiet: 'bg-quiet font-semibold text-green-900 hover:bg-chip',
        outlined: 'border border-rail bg-white font-semibold text-green-900 hover:bg-quiet',
        /** a button without a surface, like an icon in a row: it shows its surface on hover */
        plain: 'text-green-700 hover:bg-quiet hover:text-green-900',
        /** a destructive action: `outlined` in red; it asks first or can be undone right after */
        danger:
          'border border-danger-line bg-white font-semibold text-danger-text hover:bg-danger-soft',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        /** at least 44px high, the smallest a thumb hits reliably */
        touch: 'h-11 rounded-xl px-4 text-[15px]',
        touchIcon: 'h-11 w-11 rounded-full [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProperties
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProperties>(
  ({ className, variant, size, asChild = false, ...properties }, reference) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={reference}
        {...properties}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
