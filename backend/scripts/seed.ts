// npm run seed: truncates the domain tables and reloads them over DATABASE_DIRECT_URL. Idempotent.
import 'reflect-metadata';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { require_env } from '../src/config/env';
import { database_options } from '../src/database/database_options';
import { HrUser } from '../src/modules/auth/entities/hr_user.entity';
import { PASSWORD_HASH_ROUNDS } from '../src/modules/auth/auth.service';
import { Compensation } from '../src/modules/compensations/entities/compensation.entity';
import { Employee } from '../src/modules/employees/entities/employee.entity';
import { FxRate } from '../src/modules/fx_rates/entities/fx_rate.entity';
import { FX_RATES_PPM, FX_SNAPSHOT_AS_OF, generate_seed_data } from './seed_data';

const BATCH_SIZE = 1_000;

export async function seed(data_source: DataSource, options: { count: number; hr_email: string; hr_password: string }): Promise<void> {
  const { employees, compensations } = generate_seed_data(options.count);
  const password_hash = await hash(options.hr_password, PASSWORD_HASH_ROUNDS);

  await data_source.transaction(async (manager) => {
    await manager.query('TRUNCATE TABLE user_sessions, hr_users, compensations, employees, fx_rates');

    await manager.getRepository(FxRate).insert(
      Object.entries(FX_RATES_PPM).map(([currency, rate_to_usd_ppm]) => ({ currency, rate_to_usd_ppm, as_of: FX_SNAPSHOT_AS_OF })),
    );
    await manager.getRepository(HrUser).insert({ email: options.hr_email.toLowerCase(), password_hash });

    for (let start = 0; start < employees.length; start += BATCH_SIZE) {
      await manager.getRepository(Employee).insert(employees.slice(start, start + BATCH_SIZE));
    }
    for (let start = 0; start < compensations.length; start += BATCH_SIZE) {
      await manager.getRepository(Compensation).insert(compensations.slice(start, start + BATCH_SIZE));
    }
  });
}

async function main(): Promise<void> {
  const count = Number(process.env.SEED_COUNT ?? 10_000);
  const data_source = await new DataSource(database_options(require_env('DATABASE_DIRECT_URL'), { pool_size: 2 })).initialize();
  const started = Date.now();
  try {
    await seed(data_source, { count, hr_email: require_env('HR_SEED_EMAIL'), hr_password: require_env('HR_SEED_PASSWORD') });
    console.log(`Seeded ${count} employees in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } finally {
    await data_source.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
