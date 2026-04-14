import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        yellow:
          'bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500/20 dark:bg-yellow-500/60 dark:focus-visible:ring-yellow-500/40',
        violet:
          'bg-violet-500 text-white hover:bg-violet-600 focus-visible:ring-violet-500/20 dark:bg-violet-500/60 dark:focus-visible:ring-violet-500/40',
        orange:
          'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500/20 dark:bg-orange-500/60 dark:focus-visible:ring-orange-500/40',
        green:
          'bg-green-500 text-white hover:bg-green-600 focus-visible:ring-green-500/20 dark:bg-green-500/60 dark:focus-visible:ring-green-500/40',
        blue: 'bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500/20 dark:bg-blue-500/60 dark:focus-visible:ring-blue-500/40',
        cyan: 'bg-cyan-500 text-white hover:bg-cyan-600 focus-visible:ring-cyan-500/20 dark:bg-cyan-500/60 dark:focus-visible:ring-cyan-500/40',
        pink: 'bg-pink-500 text-white hover:bg-pink-600 focus-visible:ring-pink-500/20 dark:bg-pink-500/60 dark:focus-visible:ring-pink-500/40',
        purple:
          'bg-purple-500 text-white hover:bg-purple-600 focus-visible:ring-purple-500/20 dark:bg-purple-500/60 dark:focus-visible:ring-purple-500/40',
        avocado:
          'bg-avocado-500 text-white hover:bg-avocado-600 focus-visible:ring-avocado-500/20 dark:bg-avocado-500/60 dark:focus-visible:ring-avocado-500/40',
        lime: 'bg-lime-500 text-white hover:bg-lime-600 focus-visible:ring-lime-500/20 dark:bg-lime-500/60 dark:focus-visible:ring-lime-500/40',
        outline:
          'border border-primary text-primary bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
