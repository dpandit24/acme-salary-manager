import { z } from 'zod';
import { major_to_minor } from './money';

export const date_schema = z
  .string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker (YYYY-MM-DD)');

export const amount_schema = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((value) => major_to_minor(value) !== null, 'Enter a number with at most two decimal places')
  .refine((value) => (major_to_minor(value) ?? 0) > 0, 'Amount must be greater than zero');

export const note_schema = z.string().max(500, 'Note must be 500 characters or fewer');

export function required_text(label: string, max: number) {
  return z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);
}

export function amount_to_minor(value: string): number {
  const minor = major_to_minor(value);
  if (minor === null) throw new Error('Amount was not validated');
  return minor;
}
