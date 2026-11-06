import React from 'react';
import { cn, Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const renderedAction = action || (actionLabel && onAction ? (
    <Button size="sm" onClick={onAction}>
      {actionLabel}
    </Button>
  ) : null);

  return (
    <div
      className={cn(
        'text-center py-12 px-6 bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center space-y-3.5',
        className
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-1 shadow-subtle">
          {icon}
        </div>
      )}
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {(renderedAction || secondaryAction) && (
        <div className="pt-2 flex items-center space-x-3">
          {renderedAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
