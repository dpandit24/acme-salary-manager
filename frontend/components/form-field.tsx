import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function field_aria(id: string, error?: string, hint?: string) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': described || undefined,
  };
}

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 fill-current">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v4.75h-1.5V4.5ZM8 11.75a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
          </svg>
          <span>
            <span className="sr-only">Error:</span> {error}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive bg-red-50 p-3 text-sm text-destructive">
      {message}
    </p>
  );
}
