import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { HEALTH_ROUTES } from './health.routes';

@Controller(HEALTH_ROUTES.base)
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
