import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function today_iso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function format_count(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export const STATUS_LABELS = {
  active: 'Active',
  on_leave: 'On leave',
  terminated: 'Terminated',
} as const;

export const REASON_LABELS: Record<string, string> = {
  hire: 'Hire',
  merit: 'Merit',
  promotion: 'Promotion',
  market_adjustment: 'Market adjustment',
  correction: 'Correction',
};

export function safe_next_path(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return '/';
  return next;
}
