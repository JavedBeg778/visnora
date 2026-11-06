import React from 'react';
import { cn } from './button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
            error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

