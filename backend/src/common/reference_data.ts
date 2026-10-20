// Reference lists live in code (see backend.md, Data model). They are exposed via GET /api/v1/meta.

export const COUNTRIES = [
  { code: 'US', name: 'United States', default_currency: 'USD' },
  { code: 'DE', name: 'Germany', default_currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', default_currency: 'GBP' },
  { code: 'IN', name: 'India', default_currency: 'INR' },
  { code: 'SG', name: 'Singapore', default_currency: 'SGD' },
  { code: 'AE', name: 'United Arab Emirates', default_currency: 'AED' },
  { code: 'CA', name: 'Canada', default_currency: 'CAD' },
  { code: 'AU', name: 'Australia', default_currency: 'AUD' },
] as const;

export const COUNTRY_CODES: string[] = COUNTRIES.map((country) => country.code);

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'SGD', 'AED', 'CAD', 'AUD'];

export const DEPARTMENTS = [
  'Customer Success',
  'Design',
  'Engineering',
  'Finance',
  'Legal',
  'Marketing',
  'Operations',
  'People',
  'Product',
  'Sales',
];

export const LEVELS = ['IC1', 'IC2', 'IC3', 'IC4', 'IC5', 'IC6', 'M1', 'M2', 'M3'];

export const EMPLOYMENT_STATUSES = ['active', 'on_leave', 'terminated'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export const PAYROLL_STATUSES: EmploymentStatus[] = ['active', 'on_leave'];

export const COMPENSATION_REASONS = ['hire', 'merit', 'promotion', 'market_adjustment', 'correction'] as const;
export type CompensationReason = (typeof COMPENSATION_REASONS)[number];
/** Reasons accepted by POST /employees/:id/compensations. `hire` comes with the employee, `correction` with PATCH. */
export const CHANGE_REASONS: CompensationReason[] = ['merit', 'promotion', 'market_adjustment'];

export function default_currency_for(country_code: string): string | undefined {
  return COUNTRIES.find((country) => country.code === country_code)?.default_currency;
}
