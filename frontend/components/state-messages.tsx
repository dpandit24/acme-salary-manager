import * as React from 'react';
import { Button } from '@/components/ui/button';
import { is_api_error } from '@/lib/api/client';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function ErrorState({
  title,
  error,
  on_retry,
}: {
  title: string;
  error: unknown;
  on_retry?: () => void;
}) {
  const detail = is_api_error(error)
    ? `${error.message}${error.status ? ` (HTTP ${error.status})` : ''}`
    : 'Unexpected error.';
  return (
    <div role="alert" className="rounded-md border border-destructive bg-red-50 p-4 text-sm">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-red-900">{detail}</p>
      {on_retry ? (
        <Button variant="outline" size="sm" className="mt-3" onClick={on_retry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
