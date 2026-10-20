import { types } from 'pg';
import { DataSourceOptions } from 'typeorm';
import { database_ssl_enabled } from '../config/env';
import { HrUser } from '../modules/auth/entities/hr_user.entity';
import { UserSession } from '../modules/auth/entities/user_session.entity';
import { Compensation } from '../modules/compensations/entities/compensation.entity';
import { Employee } from '../modules/employees/entities/employee.entity';
import { FxRate } from '../modules/fx_rates/entities/fx_rate.entity';
import { InitialSchema1760950000000 } from './migrations/1760950000000-initial_schema';

// Return DATE columns as 'YYYY-MM-DD' strings. The default parser builds a local-time Date, which shifts days.
const PG_DATE_OID = 1082;
types.setTypeParser(PG_DATE_OID, (value: string) => value);

export const ENTITIES = [Employee, Compensation, FxRate, HrUser, UserSession];
export const MIGRATIONS = [InitialSchema1760950000000];

export function database_options(url: string, overrides: Partial<{ pool_size: number }> = {}): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: false,
    // Supabase requires TLS. Its server certificate is not in Node's default trust store, so the channel is
    // encrypted without CA verification. To verify, pass Supabase's CA via `ssl: { ca }` instead.
    ssl: database_ssl_enabled() ? { rejectUnauthorized: false } : false,
    extra: { max: overrides.pool_size ?? 10 },
  };
}
