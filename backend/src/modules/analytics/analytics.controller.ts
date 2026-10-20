import { Controller, Get, Query } from '@nestjs/common';
import { AsOfQueryDto } from '../employees/dto/list_employees.dto';
import { ANALYTICS_ROUTES } from './analytics.routes';
import { AnalyticsService, Overview } from './analytics.service';

@Controller(ANALYTICS_ROUTES.base)
export class AnalyticsController {
  constructor(private readonly analytics_service: AnalyticsService) {}

  @Get(ANALYTICS_ROUTES.overview)
  overview(@Query() query: AsOfQueryDto): Promise<Overview> {
    return this.analytics_service.overview(query.as_of);
  }
}
