import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { require_env } from './config/env';
import { database_options } from './database/database_options';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompensationsModule } from './modules/compensations/compensations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FxRatesModule } from './modules/fx_rates/fx_rates.module';
import { HealthModule } from './modules/health/health.module';
import { MetaModule } from './modules/meta/meta.module';

@Module({})
export class AppModule {
  /** `database_url` defaults to DATABASE_URL (the Supabase transaction pooler); API tests pass their own. */
  static register(database_url = require_env('DATABASE_URL')): DynamicModule {
    return {
      module: AppModule,
      imports: [
        TypeOrmModule.forRoot(database_options(database_url)),
        AuthModule,
        FxRatesModule,
        CompensationsModule,
        EmployeesModule,
        AnalyticsModule,
        MetaModule,
        HealthModule,
      ],
    };
  }
}
