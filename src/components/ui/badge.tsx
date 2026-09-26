import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-parchment text-espresso border-espresso/20',
        active: 'bg-terracotta/10 text-terracotta border-terracotta/30',
        disrupted: 'bg-burnt-clay/15 text-burnt-clay border-burnt-clay/40 font-semibold',
        confirmed: 'bg-[#2D5A37]/10 text-[#2D5A37] border-[#2D5A37]/30',
        brass: 'bg-antique-brass/20 text-deep-slate border-antique-brass/40',
        dark: 'bg-deep-slate text-soft-ivory border-deep-slate',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
