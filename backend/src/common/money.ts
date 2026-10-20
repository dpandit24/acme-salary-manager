// Integer minor-unit arithmetic. Products go through BigInt so amount * rate never loses precision.

export const PPM = 1_000_000n;

export function to_safe_number(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new RangeError(`Amount ${value} exceeds the safe integer range`);
  return result;
}

/** Half-up division for non-negative integers. */
export function div_half_up(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) throw new RangeError('div_half_up expects a non-negative numerator and positive denominator');
  return (2n * numerator + denominator) / (2n * denominator);
}

/** amount_usd_minor = half_up(amount_minor * rate_to_usd_ppm / 1_000_000) */
export function to_usd_minor(amount_minor: number, rate_to_usd_ppm: number): number {
  return to_safe_number(div_half_up(BigInt(amount_minor) * BigInt(rate_to_usd_ppm), PPM));
}

export function sum_minor(amounts: readonly number[]): number {
  return to_safe_number(amounts.reduce((total, amount) => total + BigInt(amount), 0n));
}

export function average_minor(amounts: readonly number[]): number {
  if (amounts.length === 0) return 0;
  return to_safe_number(div_half_up(BigInt(sum_minor(amounts)), BigInt(amounts.length)));
}

/** Median; for an even count, the half-up mean of the two central values. */
export function median_minor(amounts: readonly number[]): number {
  if (amounts.length === 0) return 0;
  const sorted = [...amounts].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return to_safe_number(div_half_up(BigInt(sorted[middle - 1]) + BigInt(sorted[middle]), 2n));
}

export interface PayStats {
  total_minor: number;
  average_minor: number;
  median_minor: number;
}

export function pay_stats(amounts: readonly number[]): PayStats {
  return {
    total_minor: sum_minor(amounts),
    average_minor: average_minor(amounts),
    median_minor: median_minor(amounts),
  };
}
