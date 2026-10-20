import { ValidationOptions, registerDecorator } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function is_date_only(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function today_utc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Validates a calendar date in YYYY-MM-DD form. */
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (target, property_name) =>
    registerDecorator({
      name: 'is_date_only',
      target: target.constructor,
      propertyName: property_name as string,
      options: { message: 'must be a date in YYYY-MM-DD format', ...options },
      validator: { validate: is_date_only },
    });
}
