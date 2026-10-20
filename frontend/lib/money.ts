const formatters = new Map<string, Intl.NumberFormat>();

function formatter_for(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter;
}

function minor_to_decimal_string(amount_minor: number): string {
  const negative = amount_minor < 0;
  const digits = Math.abs(Math.trunc(amount_minor)).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/** Formats integer minor units (all v1 currencies have exponent 2). Always includes the ISO code. */
export function format_money(amount_minor: number, currency: string): string {
  const code = currency.toUpperCase();
  const formatted = formatter_for(code).format(minor_to_decimal_string(amount_minor) as Intl.StringNumericLiteral);
  return formatted.includes(code) ? formatted : `${formatted} ${code}`;
}

const MAJOR_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Parses a major-unit string ("85000", "85,000.5") into integer minor units. Returns null if invalid. */
export function major_to_minor(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '');
  const match = MAJOR_PATTERN.exec(cleaned);
  if (!match) return null;
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const minor = Number(`${whole}${fraction}`);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function minor_to_major_input(amount_minor: number): string {
  const text = minor_to_decimal_string(amount_minor);
  return text.endsWith('.00') ? text.slice(0, -3) : text;
}
