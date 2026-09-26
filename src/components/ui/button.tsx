import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-none text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-terracotta text-soft-ivory hover:bg-terracotta-hover border border-terracotta shadow-xs',
        secondary:
          'bg-antique-brass text-deep-slate hover:bg-[#b08d59] border border-antique-brass',
        outline:
          'border border-espresso/30 text-espresso hover:border-terracotta hover:text-terracotta bg-transparent',
        ghost:
          'text-espresso hover:bg-parchment/60 hover:text-terracotta border border-transparent',
        accent:
          'bg-burnt-clay text-soft-ivory hover:bg-[#a24d35] border border-burnt-clay',
      },
      size: {
        sm: 'h-8 px-3 text-[11px]',
        md: 'h-10 px-5 text-xs',
        lg: 'h-12 px-7 text-xs tracking-widest',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
