import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookie_parser from 'cookie-parser';
import { validation_exception_factory } from './common/api_error';
import { ApiExceptionFilter } from './common/api_exception.filter';

export const API_PREFIX = 'api/v1';

/** Shared by main.ts and the API tests so both run the exact same pipeline. */
export function configure_app(app: NestExpressApplication, options: { session_secret: string; frontend_origin?: string }): void {
  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.use(cookie_parser(options.session_secret));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validation_exception_factory,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  if (options.frontend_origin) app.enableCors({ origin: options.frontend_origin, credentials: true });
  app.disable('x-powered-by');
}
