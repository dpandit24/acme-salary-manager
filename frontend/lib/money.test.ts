import { describe, expect, it } from 'vitest';
import { format_money, major_to_minor, minor_to_major_input } from './money';

describe('format_money', () => {
  it('renders 100050 USD as a dollar amount with cents and the code', () => {
    const text = format_money(100050, 'USD');
    expect(text).toContain('$1,000.50');
    expect(text).toContain('USD');
  });

  it('does not reuse the dollar symbol for another currency', () => {
    const inr = format_money(100050, 'INR');
    expect(inr).toContain('1,000.50');
    expect(inr).toContain('INR');
    expect(inr).not.toContain('$');

    const eur = format_money(100050, 'EUR');
    expect(eur).toContain('EUR');
    expect(eur).not.toContain('$');
  });

  it('keeps exact cents for large amounts and handles small ones', () => {
    expect(format_money(900719925474099, 'USD')).toContain('9,007,199,254,740.99');
    expect(format_money(5, 'USD')).toContain('$0.05');
    expect(format_money(0, 'INR')).toContain('0.00');
  });
});

describe('major_to_minor', () => {
  it('parses whole and decimal major units into integer minor units', () => {
    expect(major_to_minor('85000')).toBe(8500000);
    expect(major_to_minor('85000.5')).toBe(8500050);
    expect(major_to_minor('85000.50')).toBe(8500050);
    expect(major_to_minor('0.29')).toBe(29);
    expect(major_to_minor(' 85,000.10 ')).toBe(8500010);
  });

  it('rejects more than two decimals and non-numbers', () => {
    expect(major_to_minor('1.234')).toBeNull();
    expect(major_to_minor('abc')).toBeNull();
    expect(major_to_minor('')).toBeNull();
    expect(major_to_minor('-5')).toBeNull();
    expect(major_to_minor('1e5')).toBeNull();
  });

  it('round-trips through minor_to_major_input', () => {
    expect(minor_to_major_input(8500050)).toBe('85000.50');
    expect(minor_to_major_input(8500000)).toBe('85000');
  });
});
