import { Module } from '@nestjs/common';
import { CompensationsModule } from '../compensations/compensations.module';
import { EmployeesModule } from '../employees/employees.module';
import { FxRatesModule } from '../fx_rates/fx_rates.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [EmployeesModule, CompensationsModule, FxRatesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
