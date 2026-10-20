import { ParseUUIDPipe } from '@nestjs/common';
import { ApiError } from './api_error';

/** Route ids are UUIDs. A malformed id is an unknown id, so it returns 404 rather than 400. */
export function parse_id(): ParseUUIDPipe {
  return new ParseUUIDPipe({ exceptionFactory: () => ApiError.not_found() });
}
