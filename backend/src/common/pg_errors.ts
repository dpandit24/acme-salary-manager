import { QueryFailedError } from 'typeorm';

interface PgDriverError {
  code?: string;
  constraint?: string;
}

function driver_error(error: unknown): PgDriverError | undefined {
  return error instanceof QueryFailedError ? (error.driverError as PgDriverError) : undefined;
}

/** Name of the violated unique constraint, if `error` is a unique violation. */
export function unique_violation(error: unknown): string | undefined {
  const pg = driver_error(error);
  return pg?.code === '23505' ? pg.constraint : undefined;
}

/** Name of the violated foreign key, if `error` is a foreign key violation. */
export function foreign_key_violation(error: unknown): string | undefined {
  const pg = driver_error(error);
  return pg?.code === '23503' ? pg.constraint : undefined;
}
