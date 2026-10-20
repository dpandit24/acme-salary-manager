import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';

export type ApiErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export type FieldErrors = Record<string, string>;

/** Thrown anywhere in the app; rendered by ApiExceptionFilter as { error: { code, message, fields } }. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message, status);
  }

  static validation(message: string, fields?: FieldErrors): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, 'VALIDATION', message, fields);
  }

  static unauthorized(message = 'Sign in required'): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }

  static not_found(message = 'Not found'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(message: string, fields?: FieldErrors): ApiError {
    return new ApiError(HttpStatus.CONFLICT, 'CONFLICT', message, fields);
  }
}

/** ValidationPipe exceptionFactory: one message per field, named by the snake_case property. */
export function validation_exception_factory(errors: ValidationError[]): ApiError {
  const fields: FieldErrors = {};
  for (const error of errors) {
    const constraints = error.constraints ?? {};
    if ('whitelistValidation' in constraints) fields[error.property] = 'is not allowed on this endpoint';
    else if (error.value === undefined || error.value === null || error.value === '') fields[error.property] = 'is required';
    else fields[error.property] = Object.values(constraints)[0]?.replace(new RegExp(`^${error.property} `), '') ?? 'is invalid';
  }
  const [first_field] = Object.keys(fields);
  return ApiError.validation(first_field ? `${first_field} ${fields[first_field]}` : 'Invalid request', fields);
}
