// API tests: the real Nest app against a disposable Postgres (TEST_DATABASE_URL), with a tiny hand-built fixture.
// Start the database with `npm run test:db:up`. Never point TEST_DATABASE_URL at Supabase.
import 'reflect-metadata';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configure_app } from '../src/configure_app';
import { database_options } from '../src/database/database_options';
import { CompensationsService } from '../src/modules/compensations/compensations.service';
import { FxRatesService } from '../src/modules/fx_rates/fx_rates.service';

process.env.DATABASE_SSL = 'false';
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54329/acme_test';
if (/supabase/i.test(TEST_DATABASE_URL)) throw new Error('TEST_DATABASE_URL must not point at Supabase');

const HR_EMAIL = 'hr@test.example';
const HR_PASSWORD = 'correct horse battery staple';
const AS_OF = '2026-10-20';

const ID = {
  us_active: '00000000-0000-4000-8000-000000000001',
  us_on_leave: '00000000-0000-4000-8000-000000000002',
  in_active: '00000000-0000-4000-8000-000000000003',
  in_terminated: '00000000-0000-4000-8000-000000000004',
};

async function load_fixture(data_source: DataSource): Promise<void> {
  await data_source.query('TRUNCATE TABLE user_sessions, hr_users, compensations, employees, fx_rates');
  await data_source.query(`INSERT INTO fx_rates (currency, rate_to_usd_ppm, as_of) VALUES ('USD', 1000000, '2026-10-01'), ('INR', 12000, '2026-10-01'), ('EUR', 1080000, '2026-10-01')`);
  await data_source.query(`INSERT INTO hr_users (email, password_hash) VALUES ($1, $2)`, [HR_EMAIL, hashSync(HR_PASSWORD, 4)]);
  await data_source.query(`
    INSERT INTO employees (id, employee_number, first_name, last_name, email, country_code, department, job_title, level, status, hire_date) VALUES
      ('${ID.us_active}',     'ACME-1', 'Ava',   'Smith', 'ava@acme.example',   'US', 'Engineering', 'Software Engineer', 'IC3', 'active',     '2020-01-01'),
      ('${ID.us_on_leave}',   'ACME-2', 'Ben',   'Jones', 'ben@acme.example',   'US', 'Sales',       'Manager, Sales',    'M1',  'on_leave',   '2021-01-01'),
      ('${ID.in_active}',     'ACME-3', 'Priya', 'Patel', 'priya@acme.example', 'IN', 'Engineering', 'Software Engineer', 'IC3', 'active',     '2022-01-01'),
      ('${ID.in_terminated}', 'ACME-4', 'Rahul', 'Shah',  'rahul@acme.example', 'IN', 'Sales',       'Account Executive', 'IC2', 'terminated', '2022-01-01')
  `);
  await data_source.query(`
    INSERT INTO compensations (employee_id, effective_from, amount_minor, currency, reason) VALUES
      ('${ID.us_active}',     '2020-01-01',  10000000, 'USD', 'hire'),
      ('${ID.us_on_leave}',   '2021-01-01',   8000000, 'USD', 'hire'),
      ('${ID.us_on_leave}',   '2099-01-01',   9000000, 'USD', 'merit'),
      ('${ID.in_active}',     '2022-01-01', 200000000, 'INR', 'hire'),
      ('${ID.in_terminated}', '2022-01-01', 300000000, 'INR', 'hire')
  `);
}

describe('API', () => {
  let app: NestExpressApplication;
  let data_source: DataSource;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const migrator = await new DataSource(database_options(TEST_DATABASE_URL)).initialize();
    await migrator.dropDatabase();
    await migrator.runMigrations();
    await migrator.destroy();

    const module = await Test.createTestingModule({ imports: [AppModule.register(TEST_DATABASE_URL)] }).compile();
    app = module.createNestApplication<NestExpressApplication>({ logger: false });
    configure_app(app, { session_secret: 'test-secret' });
    await app.init();
    data_source = app.get(DataSource);
  });

  beforeEach(async () => {
    await load_fixture(data_source);
    app.get(FxRatesService).clear_cache();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email: HR_EMAIL, password: HR_PASSWORD }).expect(200);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('auth', () => {
    it('rejects unauthenticated salary calls with 401 and the error body', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/employees').expect(401);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Sign in required' } });
    });

    it('keeps /health public and outside the prefix', async () => {
      await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    });

    it('rejects a wrong password', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: HR_EMAIL, password: 'nope' }).expect(401);
    });

    it('logs in, reports the user, and logs out', async () => {
      const { body } = await agent.get('/api/v1/auth/me').expect(200);
      expect(body).toEqual({ id: expect.any(String), email: HR_EMAIL });
      await agent.post('/api/v1/auth/logout').expect(204);
      await agent.get('/api/v1/auth/me').expect(401);
    });
  });

  describe('GET /employees', () => {
    it('defaults to active and on-leave people, with current pay', async () => {
      const { body } = await agent.get(`/api/v1/employees?as_of=${AS_OF}`).expect(200);
      expect(body.total).toBe(3);
      expect(body.items.map((item: { employee_number: string }) => item.employee_number)).toEqual(['ACME-2', 'ACME-3', 'ACME-1']);
      const ben = body.items.find((item: { id: string }) => item.id === ID.us_on_leave);
      expect(ben).toMatchObject({ amount_minor: 8000000, currency: 'USD', amount_usd_minor: 8000000, effective_from: '2021-01-01' });
    });

    it('filters by country, status and text', async () => {
      expect((await agent.get('/api/v1/employees?country_code=IN').expect(200)).body.total).toBe(1);
      expect((await agent.get('/api/v1/employees?status=terminated').expect(200)).body.total).toBe(1);
      expect((await agent.get('/api/v1/employees?status=all').expect(200)).body.total).toBe(4);
      expect((await agent.get('/api/v1/employees?q=PRIYA%20pat').expect(200)).body.items[0].id).toBe(ID.in_active);
      expect((await agent.get('/api/v1/employees?q=acme-4&status=all').expect(200)).body.total).toBe(1);
    });

    it('sorts by salary using the USD equivalent', async () => {
      const { body } = await agent.get(`/api/v1/employees?sort=salary&direction=desc&as_of=${AS_OF}`).expect(200);
      expect(body.items.map((item: { amount_usd_minor: number }) => item.amount_usd_minor)).toEqual([10000000, 8000000, 2400000]);
    });

    it('returns an empty page past the end with the correct total', async () => {
      const { body } = await agent.get('/api/v1/employees?page=5&page_size=2').expect(200);
      expect(body).toEqual({ items: [], page: 5, page_size: 2, total: 3 });
    });

    it('caps page_size at 100', async () => {
      const { body } = await agent.get('/api/v1/employees?page_size=101').expect(400);
      expect(body.error.fields.page_size).toBeDefined();
    });
  });

  describe('GET /employees/:id', () => {
    it('returns history oldest first and current pay as of a date', async () => {
      const today = (await agent.get(`/api/v1/employees/${ID.us_on_leave}?as_of=${AS_OF}`).expect(200)).body;
      expect(today.compensations.map((row: { effective_from: string }) => row.effective_from)).toEqual(['2021-01-01', '2099-01-01']);
      expect(today.current_compensation.amount_minor).toBe(8000000);
      const later = (await agent.get(`/api/v1/employees/${ID.us_on_leave}?as_of=2099-01-01`).expect(200)).body;
      expect(later.current_compensation.amount_minor).toBe(9000000);
    });

    it('returns 404 for unknown and malformed ids', async () => {
      await agent.get('/api/v1/employees/00000000-0000-4000-8000-00000000ffff').expect(404);
      await agent.get('/api/v1/employees/not-an-id').expect(404);
    });
  });

  describe('POST /employees', () => {
    const new_employee = {
      employee_number: 'ACME-5',
      first_name: 'Lea',
      last_name: 'Weber',
      email: 'lea@acme.example',
      country_code: 'DE',
      department: 'Design',
      job_title: 'Product Designer',
      level: 'IC2',
      hire_date: '2026-10-01',
      amount_minor: 6000000,
      currency: 'EUR',
    };

    it('creates the person and the hire compensation together', async () => {
      const { body } = await agent.post('/api/v1/employees').send(new_employee).expect(201);
      expect(body).toMatchObject({ employee_number: 'ACME-5', status: 'active' });
      expect(body.compensations).toHaveLength(1);
      expect(body.compensations[0]).toMatchObject({ reason: 'hire', effective_from: '2026-10-01', amount_minor: 6000000, amount_usd_minor: 6480000 });
    });

    it('leaves no person behind when the compensation insert fails', async () => {
      const spy = jest.spyOn(app.get(CompensationsService), 'create_initial_compensation').mockRejectedValueOnce(new Error('boom'));
      await agent.post('/api/v1/employees').send(new_employee).expect(500);
      spy.mockRestore();
      const [{ count }] = await data_source.query(`SELECT count(*)::int AS count FROM employees WHERE employee_number = 'ACME-5'`);
      expect(count).toBe(0);
    });

    it('names the field in validation errors', async () => {
      const { body } = await agent.post('/api/v1/employees').send({ ...new_employee, amount_minor: 100.5, currency: 'JPY', email: undefined }).expect(400);
      expect(body.error.code).toBe('VALIDATION');
      expect(body.error.fields).toMatchObject({ amount_minor: 'must be a positive integer', currency: expect.any(String), email: 'is required' });
    });

    it('returns 409 on a duplicate email', async () => {
      const { body } = await agent.post('/api/v1/employees').send({ ...new_employee, email: 'ava@acme.example' }).expect(409);
      expect(body.error.fields.email).toBeDefined();
    });
  });

  describe('PATCH /employees/:id', () => {
    it('cannot change pay', async () => {
      const { body } = await agent.patch(`/api/v1/employees/${ID.us_active}`).send({ job_title: 'Senior Engineer', amount_minor: 1 }).expect(400);
      expect(body.error.fields.amount_minor).toBeDefined();
      const detail = (await agent.get(`/api/v1/employees/${ID.us_active}`).expect(200)).body;
      expect(detail.job_title).toBe('Software Engineer');
      expect(detail.current_compensation.amount_minor).toBe(10000000);
    });

    it('updates profile and status', async () => {
      const { body } = await agent.patch(`/api/v1/employees/${ID.us_active}`).send({ status: 'terminated' }).expect(200);
      expect(body.status).toBe('terminated');
      expect(body.compensations).toHaveLength(1);
    });
  });

  describe('compensations', () => {
    it('adds a future-dated row and rejects a second row on the same date with 409', async () => {
      const change = { effective_from: '2027-01-01', amount_minor: 11000000, currency: 'USD', reason: 'merit' };
      await agent.post(`/api/v1/employees/${ID.us_active}/compensations`).send(change).expect(201);
      const { body } = await agent.post(`/api/v1/employees/${ID.us_active}/compensations`).send(change).expect(409);
      expect(body.error.fields.effective_from).toBeDefined();
    });

    it('corrects a row in place only with reason correction', async () => {
      const detail = (await agent.get(`/api/v1/employees/${ID.in_active}`).expect(200)).body;
      const row_id = detail.compensations[0].id;
      await agent.patch(`/api/v1/employees/${ID.in_active}/compensations/${row_id}`).send({ reason: 'merit', amount_minor: 1 }).expect(400);
      const { body } = await agent.patch(`/api/v1/employees/${ID.in_active}/compensations/${row_id}`).send({ reason: 'correction', amount_minor: 210000000 }).expect(200);
      expect(body).toMatchObject({ id: row_id, amount_minor: 210000000, reason: 'correction', amount_usd_minor: 2520000 });
    });
  });

  describe('GET /analytics/overview', () => {
    it('matches the hand-computed fixture totals', async () => {
      const { body } = await agent.get(`/api/v1/analytics/overview?as_of=${AS_OF}`).expect(200);
      expect(body.headcount).toBe(3); // terminated excluded, on leave included, future raise not yet current
      expect(body.by_currency).toEqual([
        { currency: 'INR', headcount: 1, total_minor: 200000000, average_minor: 200000000, median_minor: 200000000 },
        { currency: 'USD', headcount: 2, total_minor: 18000000, average_minor: 9000000, median_minor: 9000000 },
      ]);
      expect(body.usd).toEqual({ total_minor: 20400000, average_minor: 6800000, median_minor: 8000000, rate_as_of: '2026-10-01', label: 'USD snapshot' });

      const engineering = body.by_department.find((group: { department: string }) => group.department === 'Engineering');
      expect(engineering).toMatchObject({ headcount: 2, usd: { total_minor: 12400000 } });
      expect(engineering.by_currency.map((entry: { currency: string }) => entry.currency)).toEqual(['INR', 'USD']);
      expect(body.by_level.map((group: { level: string }) => group.level)).toEqual(['IC3', 'M1']);
    });

    it('includes a future raise once as_of reaches it', async () => {
      const { body } = await agent.get('/api/v1/analytics/overview?as_of=2099-01-01').expect(200);
      expect(body.by_currency.find((entry: { currency: string }) => entry.currency === 'USD').total_minor).toBe(19000000);
    });
  });

  it('returns 404 with the error body for unknown routes', async () => {
    const { body } = await agent.get('/api/v1/nope').expect(404);
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
