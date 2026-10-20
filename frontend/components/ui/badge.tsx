import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badge_variants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'text-foreground',
      success: 'border-green-700 bg-green-50 text-green-900',
      warning: 'border-amber-700 bg-amber-50 text-amber-900',
      muted: 'border-slate-500 bg-slate-100 text-slate-800',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge_variants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge_variants({ variant }), className)} {...props} />;
}

export { Badge, badge_variants };
