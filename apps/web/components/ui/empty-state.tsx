import React from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
      {icon && <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-blue-600 mb-4">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

