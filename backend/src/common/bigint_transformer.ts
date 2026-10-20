import { ValueTransformer } from 'typeorm';

/** Postgres bigint arrives as a string; amounts are safe integers in TypeScript. */
export const bigint_transformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => {
    if (value === null || value === undefined) return value;
    const result = Number(value);
    if (!Number.isSafeInteger(result)) throw new RangeError(`bigint ${value} exceeds the safe integer range`);
    return result;
  },
};
