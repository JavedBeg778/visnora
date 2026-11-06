import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './button';

const badgeVariants = cva(
  'inline-flex items-center font-medium rounded-full transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-50 text-blue-700 border border-blue-200/80',
        brand: 'bg-blue-50 text-blue-700 border border-blue-200/80',
        blue: 'bg-blue-50 text-blue-700 border border-blue-200/80',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
        error: 'bg-red-50 text-red-700 border border-red-200/80',
        neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
        purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
        outline: 'border border-slate-300 text-slate-700 bg-white',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-0.5 gap-1.5',
        lg: 'text-xs px-3 py-1 gap-1.5 font-semibold',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

export function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            dotColor ||
              (variant === 'success'
                ? 'bg-emerald-500'
                : variant === 'warning'
                ? 'bg-amber-500'
                : variant === 'error'
                ? 'bg-red-500'
                : variant === 'purple'
                ? 'bg-purple-500'
                : 'bg-blue-500')
          )}
        />
      )}
      {children}
    </span>
  );
}
