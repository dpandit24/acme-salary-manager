import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760950000000 implements MigrationInterface {
  name = 'InitialSchema1760950000000';

  async up(query_runner: QueryRunner): Promise<void> {
    await query_runner.query(`
      CREATE TABLE employees (
        id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_number  varchar(20)  NOT NULL,
        first_name       varchar(100) NOT NULL,
        last_name        varchar(100) NOT NULL,
        email            varchar(320) NOT NULL,
        country_code     char(2)      NOT NULL,
        department       varchar(100) NOT NULL,
        job_title        varchar(150) NOT NULL,
        level            varchar(10)  NOT NULL,
        status           varchar(20)  NOT NULL,
        hire_date        date         NOT NULL,
        created_at       timestamptz  NOT NULL DEFAULT now(),
        updated_at       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT uq_employees_employee_number UNIQUE (employee_number),
        CONSTRAINT uq_employees_email UNIQUE (email),
        CONSTRAINT ck_employees_status CHECK (status IN ('active', 'on_leave', 'terminated'))
      )
    `);
    await query_runner.query(`CREATE INDEX idx_employees_status_country_code_department ON employees (status, country_code, department)`);
    await query_runner.query(`CREATE INDEX idx_employees_level ON employees (level)`);

    await query_runner.query(`
      CREATE TABLE compensations (
        id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id      uuid         NOT NULL,
        effective_from   date         NOT NULL,
        amount_minor     bigint       NOT NULL,
        currency         char(3)      NOT NULL,
        reason           varchar(30)  NOT NULL,
        note             varchar(500) NULL,
        created_at       timestamptz  NOT NULL DEFAULT now(),
        updated_at       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT fk_compensations_employees FOREIGN KEY (employee_id) REFERENCES employees (id),
        CONSTRAINT uq_compensations_employee_id_effective_from UNIQUE (employee_id, effective_from),
        CONSTRAINT ck_compensations_amount_minor CHECK (amount_minor > 0),
        CONSTRAINT ck_compensations_reason CHECK (reason IN ('hire', 'merit', 'promotion', 'market_adjustment', 'correction'))
      )
    `);
    // uq_compensations_employee_id_effective_from creates the (employee_id, effective_from) index the spec calls
    // idx_compensations_employee_id_effective_from; a second identical index would only slow writes.

    await query_runner.query(`
      CREATE TABLE fx_rates (
        currency         char(3)      PRIMARY KEY,
        rate_to_usd_ppm  integer      NOT NULL,
        as_of            date         NOT NULL,
        created_at       timestamptz  NOT NULL DEFAULT now(),
        updated_at       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT ck_fx_rates_rate_to_usd_ppm CHECK (rate_to_usd_ppm > 0)
      )
    `);

    await query_runner.query(`
      CREATE TABLE hr_users (
        id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        email            varchar(320) NOT NULL,
        password_hash    varchar(255) NOT NULL,
        created_at       timestamptz  NOT NULL DEFAULT now(),
        updated_at       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT uq_hr_users_email UNIQUE (email)
      )
    `);

    await query_runner.query(`
      CREATE TABLE user_sessions (
        id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        hr_user_id       uuid         NOT NULL,
        expires_at       timestamptz  NOT NULL,
        created_at       timestamptz  NOT NULL DEFAULT now(),
        updated_at       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_sessions_hr_users FOREIGN KEY (hr_user_id) REFERENCES hr_users (id) ON DELETE CASCADE
      )
    `);
    await query_runner.query(`CREATE INDEX idx_user_sessions_hr_user_id ON user_sessions (hr_user_id)`);
  }

  async down(query_runner: QueryRunner): Promise<void> {
    await query_runner.query(`DROP TABLE user_sessions`);
    await query_runner.query(`DROP TABLE hr_users`);
    await query_runner.query(`DROP TABLE fx_rates`);
    await query_runner.query(`DROP TABLE compensations`);
    await query_runner.query(`DROP TABLE employees`);
  }
}
