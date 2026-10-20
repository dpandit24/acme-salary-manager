import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { is_api_error } from './api/client';

export interface ApplyErrorOptions<T extends FieldValues> {
  known_fields: readonly Path<T>[];
  aliases?: Record<string, Path<T>>;
  /** How each API field is named in a sentence. Falls back to the field key, e.g. employee_number -> "Employee number". */
  labels?: Record<string, string>;
  conflict_field?: Path<T>;
  conflict_message?: string;
}

/**
 * The API sends field messages as fragments meant to follow the field name ("is already used by another employee").
 * Turns them into sentences a person would write. Messages that are already sentences pass through unchanged.
 */
export function field_error_sentence(api_field: string, message: string, labels?: Record<string, string>): string {
  if (!/^[a-z]/.test(message)) return message;
  const label = labels?.[api_field] ?? api_field.replace(/_/g, ' ');
  if (message === 'is already used by another employee') {
    return `Another employee already has this ${label.toLowerCase()}. Enter a different one.`;
  }
  const sentence = `${label.charAt(0).toUpperCase()}${label.slice(1)} ${message}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/** Maps an ApiError onto form fields. Returns a message for anything that could not be placed on a field. */
export function apply_api_error<T extends FieldValues>(
  error: unknown,
  set_error: UseFormSetError<T>,
  options: ApplyErrorOptions<T>,
): string | null {
  if (!is_api_error(error)) return 'Something went wrong. Please try again.';
  if (error.status === 409 && options.conflict_field) {
    set_error(
      options.conflict_field,
      { type: 'server', message: options.conflict_message ?? error.message },
      { shouldFocus: true },
    );
    return null;
  }
  const unplaced: string[] = [];
  let placed_any = false;
  for (const [api_field, raw_message] of Object.entries(error.fields)) {
    const field = options.aliases?.[api_field] ?? (api_field as Path<T>);
    const message = field_error_sentence(api_field, raw_message, options.labels);
    if (options.known_fields.includes(field)) {
      set_error(field, { type: 'server', message });
      placed_any = true;
    } else {
      unplaced.push(message);
    }
  }
  if (unplaced.length > 0) return unplaced.join(' ');
  return placed_any ? null : error.message;
}
