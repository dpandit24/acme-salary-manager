# ACME Salary Management — Backend

**Audience:** HR Manager of ACME (single organization, about 10,000 employees, multiple countries).
**Job of this service:** Be the system of record for who we employ and what we pay them, and answer payroll questions with numbers that can be traced back to rows.
**Pairs with:** [frontend.md](./frontend.md) — same endpoints, same field names, same rules. If an endpoint or field changes, both files change in the same commit.

This document is the backend requirements and design note. It states the goal, what v1 includes, what is deliberately left out, and why.

---

## Goal

Replace the HR spreadsheet with a relational store and a small HTTP API.

The HR manager must be able to:

1. Find an employee and read their current pay and pay history.
2. Record a compensation change without destroying the previous figure.
3. Ask how the organization pays people: headcount, total payroll, average, and median, split by country, department, and level.

The scale is 10,000 employees. That is a small relational workload. The design optimizes for correctness, a clear salary history, honest multi-currency totals, and clean module boundaries. It does not optimize for distributed systems.

---

## Scope

v1 is a single-tenant API for one HR user.

| Area | In scope |
| --- | --- |
| Employees | Create, read, update profile fields, search, filter, paginate |
| Employment status | `active`, `on_leave`, `terminated` |
| Compensations | Append-only annual base pay, effective-dated |
| History | Every change kept; current pay is derived |
| Reference data | Country, department, level, currency, change reason |
| Analytics | Org-level pay questions over **active and on-leave** employees |
| Currency | Amounts stored in local currency; USD rollups use a **frozen** rate table |
| Seed | Script inserts 10,000 employees plus compensation rows |
| Auth | One HR user, server session, all salary routes require login |
| Tests | Unit tests for pay rules and money math; API tests against a disposable PostgreSQL database |

An employee record holds: employee number, legal name, work email, country, department, job title, level, status, hire date.

A compensation record holds: effective date, annual amount in minor units, ISO currency, reason (`hire`, `merit`, `promotion`, `market_adjustment`, `correction`), optional note.

Levels in v1: `IC1`–`IC6`, `M1`–`M3`. Level exists because “how we pay” is incomplete if the only cuts are country and department.

Countries and currencies in the seed (all minor-unit exponent 2):

| Country | Currency |
| --- | --- |
| US | USD |
| DE | EUR |
| GB | GBP |
| IN | INR |
| SG | SGD |
| AE | AED |
| CA | CAD |
| AU | AUD |

---

## Deliberately left out

These are product decisions, not leftovers.

| Excluded | Reason |
| --- | --- |
| Payroll run, tax, deductions, payslips, bank files | The pain is salary **data** and questions about pay. A payroll engine is a different product and would bury the assessment’s real problem. |
| Bonus, equity, benefits, allowances | Annual base is the number HR is reconciling in Excel today. Extra pay components multiply currency and history rules before the base path is trustworthy. |
| Employee self-service and manager views | The only persona is the HR manager. A second audience means a second permission model. |
| Approval workflows | The HR manager is the actor. A maker-checker flow needs more roles than v1 has. |
| Multi-organization tenancy, SSO, SCIM | ACME is one org. Session login still exists, because an open salary API is not acceptable. |
| Live foreign-exchange rates | Totals must be reproducible tomorrow. A rate that moves between page loads makes HR distrust the tool. v1 ships a dated snapshot table. |
| Currencies with a non-2 exponent (JPY, KWD, …) | Keeps minor-unit math one rule: 100 minor = 1 major. Adding them is a schema-compatible follow-up (an exponent column), not a v1 requirement. |
| Hard delete | Termination is a status. History stays queryable. |
| Free-text “ask AI” over salaries | The API returns aggregated SQL results. A chatbot can invent a number. Guided questions belong in the UI, fed only by these endpoints. |
| Spreadsheet import | The seed script is the initial load. Ongoing changes go through the API. Import can follow once validation rules are proven. |
| CSV export | Useful later for Finance. v1 answers the questions on screen so the spreadsheet stops being the workflow. |
| Supabase Auth, PostgREST / Data API, Realtime, Storage, Edge Functions | Supabase is used **only** to host PostgreSQL (see below). Auth, API, and business logic live in NestJS. The frontend never talks to Supabase directly. |

---

## Tech stack

| Piece | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | Same language as the UI; request and response types can be shared. |
| Framework | **NestJS on Express.js** (`NestFactory.create<NestExpressApplication>`) | NestJS gives modules, DI, guards, pipes, and structure; Express is the HTTP adapter underneath. Routing is declared with Nest decorators on controllers, not raw Express `app.get(...)` calls scattered in files. |
| Database | **PostgreSQL hosted on Supabase** — [supabase.com/database](https://supabase.com/database) | A real hosted relational database from day one: no local file to lose, same engine in dev, test, and production. 10,000 employees is trivial for Postgres. |
| Data access | TypeORM (entities + custom repositories + migrations) | Entities map cleanly to the snake_case schema (see Naming conventions). Custom repository classes keep **all** SQL / query-builder code in one layer. Migrations are versioned and run against Supabase — the schema is never edited by hand in the Supabase dashboard. |
| Validation | `class-validator` DTOs + global `ValidationPipe` | Bad input fails with field-level errors before it reaches a service. |
| Auth | Server-side session (cookie), password stored as argon2 / bcrypt hash | One HR user; no token service needed. |
| Money math | Integer minor units (`bigint` in Postgres, safe integer in TypeScript) | No binary floats. Rounding is half-up and covered by tests. |
| Tests | Jest + Supertest (Nest testing utilities) | The Nest-standard toolchain; API tests run against a disposable PostgreSQL database (Postgres in Docker locally or in CI). |

### Supabase hosting — how it is used

- One Supabase project per environment (at least: **dev** and **prod**). API tests run against a disposable local PostgreSQL (Docker), not a Supabase project — the free tier allows two projects.
- The backend connects with the connection string from Supabase → **Connect**:
  - **Runtime (API):** pooled connection via Supavisor (port `6543`, transaction mode) — `DATABASE_URL`.
  - **Migrations and seed:** session-mode connection (port `5432`) — `DATABASE_DIRECT_URL`, because migrations and large seed batches should not go through transaction pooling. Use the **session pooler** host (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<project_ref>`), not `db.<project_ref>.supabase.co`: the direct host is IPv6-only and unreachable from most IPv4 networks.
  - Passwords in a connection URL are percent-encoded (`#` → `%23`, `/` → `%2F`, `,` → `%2C`).
  - SSL is required (`sslmode=require`); credentials live only in backend environment variables / the host's secret store. **Never** in source, never in the frontend, never prefixed for browser exposure.
- Supabase is the *database host*, not the application platform: no `supabase-js` client in the backend or frontend, no PostgREST calls, no Row Level Security policies acting as our authorization layer. Authorization is enforced by NestJS guards, because the backend connects with a privileged database role that bypasses RLS.
- TypeORM `synchronize` is **off** everywhere. Schema changes are migrations, reviewed and committed.
- `.env.example` documents `DATABASE_URL`, `DATABASE_DIRECT_URL`, `SESSION_SECRET`, `HR_SEED_EMAIL`, `HR_SEED_PASSWORD`, `PORT`, `FRONTEND_ORIGIN` — with placeholder values only.

---

## Architecture

```
                        ┌─────────────────────────────────────────────┐
HR UI (Next.js) ──HTTP──▶  NestJS application (Express adapter)    │
                        │                                             │
                        │   modules/<name>/                           │
                        │     <name>.routes.ts      route paths       │
                        │     <name>.controller.ts  HTTP in / out     │
                        │     <name>.service.ts     business logic    │
                        │     <name>.repository.ts  DB access (own    │
                        │                           tables only)      │
                        │     <name>.module.ts      wiring / exports  │
                        └──────────────────┬──────────────────────────┘
                                           │ TypeORM, pooled (6543)
                                           ▼
                        PostgreSQL hosted on Supabase
                        employees · compensations · fx_rates
                        hr_users · user_sessions
```

One NestJS process. Stateless request handlers. Sessions stored in the `user_sessions` table.

### Module anatomy (route, controller, service, repository)

Every feature module lives under `src/modules/<name>/` and follows the same anatomy:

| File | Responsibility | Must not do |
| --- | --- | --- |
| `<name>.routes.ts` | Exports the module's route path constants (single source of truth for paths). The controller builds its decorators from these constants. | Contain logic. |
| `<name>.controller.ts` | HTTP layer only: read params / query / body into DTOs, call **its own** service, map the result to the response. Applies auth guard. | Contain business rules, build queries, inject any repository, or inject another module's service. |
| `<name>.service.ts` | Business logic and orchestration for this module (salary rules, transactions, conversions). This is the **only file other modules may call** (see cross-module rule). | Import another module's repository or entity manager for another module's tables. |
| `<name>.repository.ts` | All database access **for this module's own tables only**: TypeORM repository / query builder, raw SQL where aggregation needs it. | Contain business rules, be exported from the module, or touch another module's tables. |
| `<name>.module.ts` | Declares controller + service + repository, imports other modules it depends on, and **exports only the service**. | Export the repository. |
| `dto/` | Request/response DTOs with `class-validator` rules. | — |
| `entities/` | TypeORM entities for the tables this module owns. | — |

Example — the employees module:

```
src/modules/employees/
  employees.routes.ts
  employees.controller.ts
  employees.service.ts
  employees.repository.ts
  employees.module.ts
  dto/
    create_employee.dto.ts
    update_employee.dto.ts
    list_employees.dto.ts
  entities/
    employee.entity.ts
```

### Modules

| Module | Owns tables | Exposes (service) | Routes file defines |
| --- | --- | --- | --- |
| `auth` | `hr_users`, `user_sessions` | `AuthService` | `/auth/login`, `/auth/logout`, `/auth/me` |
| `employees` | `employees` | `EmployeesService` | `/employees`, `/employees/:id` |
| `compensations` | `compensations` | `CompensationsService` | `/employees/:id/compensations`, `/employees/:id/compensations/:compensation_id` |
| `fx_rates` | `fx_rates` | `FxRatesService` | (no public routes; read through `meta` and `analytics`) |
| `analytics` | — (owns no tables) | `AnalyticsService` | `/analytics/overview` |
| `meta` | — (owns no tables) | `MetaService` | `/meta` |
| `health` | — (owns no tables) | — | `/health` |

Modules that own no tables (`analytics`, `meta`, `health`) intentionally have **no repository file**. Inventing one would mean querying other modules' tables, which the next rule forbids.

### Cross-module rule (strict)

> **If module A needs module B's data, A's service calls B's service. A never runs a query — directly or through a repository — against B's tables.**

Concretely:

1. A module's repository is used **only** by its own service, queries **only** its own tables, and is **never exported** from the module.
2. To depend on another module, import that module (`imports: [CompensationsModule]`) and inject its **service** (`CompensationsService`). Nest's DI enforces this at wiring time: the other module's repository simply isn't injectable from outside.
3. The other service returns domain data / DTOs, **not** entities from its repository and not a query builder. If a new read is needed, add a named method to the owning service (e.g. `CompensationsService.get_current_compensations(as_of)`), implemented through its own repository.
4. Same rule for writes and transactions: orchestration lives in the calling service; each participating service writes its own tables through its own repository, using the transaction manager passed to it. Example: `EmployeesService.create(...)` opens the transaction, inserts the employee via `EmployeesRepository`, then calls `CompensationsService.create_initial_compensation(employee_id, dto, manager)` — it does not insert into `compensations` itself.
5. This applies to analytics too: `AnalyticsService` composes results from `EmployeesService` (who is in the payroll population, with country, department, level) and `CompensationsService` (current pay per employee, already converted to USD via `FxRatesService`). It has no repository and writes no SQL. Grouping, totals, averages, and medians are computed in TypeScript over those two lists, using the shared money helpers. A group-by on department needs `employees` and an amount needs `compensations`; no single repository may join both, so the join happens in the service layer by `employee_id`. At 10,000 rows that is two indexed reads and a few milliseconds of arithmetic.
6. The employee list follows the same pattern. Sorting by `name` or `hire_date` paginates in SQL inside `EmployeesRepository`, then fetches current pay for the page's ids from `CompensationsService`. Sorting by `salary` asks `EmployeesRepository` for all matching ids (no pay), asks `CompensationsService` for their current USD equivalents, sorts and slices in the service, then loads that page of employees. At most 10,000 small rows; still one request from the UI.
7. In unit tests, cross-module dependencies are mocked at the **service** interface, never by reaching into another module's repository or tables.

**Why:** each table has exactly one owner, so salary rules (e.g. “current pay”, unique effective date) are implemented once, in one service, and every caller — UI, analytics, future features — gets identical numbers. The cost is a few extra service methods; that cost is the point.

---

## Salary rules

These rules are the core of the system. Tests should read like this list. They are implemented in the owning service (`compensations`, with money helpers shared from `compensations` / `fx_rates` services), never duplicated in controllers, repositories, or other modules.

1. **Money** is an integer in minor units (cents, paise, fils) plus an ISO 4217 code. The API never accepts or returns a float amount.
2. **Annual base** is the stored figure. The API does not derive hourly or monthly rates.
3. **History is append-only.** A change is a new row. Updating a person does not update their pay.
4. **One row per employee per effective date.** A second POST for the same date returns `409`. Same-day fixes use a correction endpoint that edits that row in place and requires `reason = correction`.
5. **Current pay** on date `as_of` (default: today, UTC date) is the row with the greatest `effective_from` where `effective_from <= as_of`.
6. **Future dates are allowed.** A merit increase next month is stored now and stays out of “current” and out of analytics until `as_of` reaches it.
7. **Amount must be a positive integer.** Currency must be one of the seeded currencies. `effective_from` is required.
8. **Currency may differ from the country default** (expat contracts). Analytics must not assume country implies currency; they group by the row’s currency.
9. **Terminated employees** remain readable and keep history. They are excluded from headcount and payroll totals. `on_leave` stays in both, because the person is still employed.
10. **Cross-currency sums** happen only through the USD snapshot. Per-currency totals are always returned as well, unlabeled by conversion.
11. **USD conversion:** `amount_usd_minor = half_up(amount_minor * rate_to_usd_ppm / 1_000_000)` where `rate_to_usd_ppm` is “USD major units for 1 major unit of source × 1,000,000”. The rate table has an `as_of` date returned on every converted figure.
12. **Median** is required next to average. Average alone overstates typical pay when a few senior rows dominate. Median for an even count is the half-up mean of the two central values, computed in minor units.
13. **Sorting a mixed-currency employee list by pay** uses the USD equivalent, and the API exposes that value as `amount_usd_minor` so the UI can label the sort. The displayed local amount stays the source of truth.

---

## Data model

### Naming conventions (strict)

| Thing | Convention | Examples |
| --- | --- | --- |
| Table names | **Plural**, `snake_case` | `employees`, `compensations`, `fx_rates`, `hr_users`, `user_sessions` |
| Column names | `snake_case` — never camelCase | `employee_number`, `country_code`, `effective_from`, `amount_minor`, `rate_to_usd_ppm`, `password_hash` |
| Timestamp columns | `created_at`, `updated_at` — type `timestamptz`, never camelCase, never a bare `timestamp` name | `created_at timestamptz NOT NULL DEFAULT now()` |
| Date columns | `snake_case` ending in `_date` or a full `snake_case` name | `hire_date date`, `effective_from date`, `as_of date` |
| Foreign keys | `<singular>_id` | `employee_id`, `hr_user_id`, `compensation_id` |
| Indexes / constraints | `idx_<table>_<columns>`, `uq_<table>_<columns>`, `fk_<table>_<ref_table>` | `idx_employees_status_country_code`, `uq_compensations_employee_id_effective_from` |
| TypeScript entity class | Singular PascalCase, mapped to the plural table | `Employee` → `employees`, `Compensation` → `compensations` |
| Entity column mapping | Every TypeORM column explicitly declares its snake_case database name (`@Column({ name: 'created_at' })`); JSON is serialized in snake_case (see API) | `created_at`, `updated_at` |

API JSON field names, query parameters, and DTO field names in the contract below are written in `snake_case` to match the schema one-to-one (e.g. `amount_minor`, `effective_from`, `page_size`, `as_of`). The frontend contract in [frontend.md](./frontend.md) uses exactly these names.

### Tables

```
employees
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  employee_number   varchar(20)  NOT NULL   -- uq_employees_employee_number
  first_name        varchar(100) NOT NULL
  last_name         varchar(100) NOT NULL
  email             varchar(320) NOT NULL   -- uq_employees_email
  country_code      char(2)      NOT NULL   -- ISO 3166-1 alpha-2
  department        varchar(100) NOT NULL
  job_title         varchar(150) NOT NULL
  level             varchar(10)  NOT NULL   -- IC1..IC6, M1..M3
  status            varchar(20)  NOT NULL   -- active | on_leave | terminated
  hire_date         date         NOT NULL
  created_at        timestamptz  NOT NULL DEFAULT now()
  updated_at        timestamptz  NOT NULL DEFAULT now()

compensations
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  employee_id       uuid NOT NULL  -- fk_compensations_employees -> employees.id
  effective_from    date         NOT NULL
  amount_minor      bigint       NOT NULL   -- > 0
  currency          char(3)      NOT NULL   -- ISO 4217
  reason            varchar(30)  NOT NULL   -- hire | merit | promotion | market_adjustment | correction
  note              varchar(500) NULL
  created_at        timestamptz  NOT NULL DEFAULT now()
  updated_at        timestamptz  NOT NULL DEFAULT now()
  UNIQUE (employee_id, effective_from)      -- uq_compensations_employee_id_effective_from

fx_rates
  currency          char(3) PRIMARY KEY     -- ISO 4217
  rate_to_usd_ppm   integer NOT NULL        -- > 0
  as_of             date    NOT NULL
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()

hr_users
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  email             varchar(320) NOT NULL   -- uq_hr_users_email
  password_hash     varchar(255) NOT NULL
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()

user_sessions
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  hr_user_id        uuid NOT NULL  -- fk_user_sessions_hr_users -> hr_users.id
  expires_at        timestamptz NOT NULL
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()
```

**Indexes**

- `idx_employees_status_country_code_department` on `employees (status, country_code, department)`
- `idx_employees_level` on `employees (level)`
- `idx_compensations_employee_id_effective_from` on `compensations (employee_id, effective_from)` (also backs the unique constraint)
- `idx_user_sessions_hr_user_id` on `user_sessions (hr_user_id)`

Reference lists (countries, departments, levels, reasons) live in code as constants and are exposed via `GET /api/v1/meta` (the `meta` module composes them, reading the FX snapshot through `FxRatesService`). They are not a configuration product.

**Current-pay query.** Implemented only in `CompensationsRepository`, exposed as `CompensationsService.get_current_compensations(as_of, ...)`: for each employee, the latest qualifying compensation row (max `effective_from` ≤ `as_of`). At this size the query is milliseconds. A cached “current salary” column is a later optimization, and only if a measurement says the join is slow.

---

## API

> **Sync contract:** this table is the single source of truth and is reproduced **identically** in [frontend.md](./frontend.md#api-contract-synced-with-backend). Every screen in the frontend maps to rows of this table; neither side adds, renames, or removes an endpoint without updating both documents.

Base path: `/api/v1` (set once as the Nest global prefix; `GET /health` is the only route outside it). JSON. Dates are `YYYY-MM-DD`. Errors:

```json
{ "error": { "code": "VALIDATION", "message": "Amount must be positive", "fields": { "amount_minor": "must be a positive integer" } } }
```

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Liveness. No auth. |
| `POST` | `/api/v1/auth/login` | No | Body `{ email, password }`. Sets an HTTP-only session cookie. |
| `POST` | `/api/v1/auth/logout` | Yes | Clears the session. |
| `GET` | `/api/v1/auth/me` | Yes | Current HR user, or `401`. |
| `GET` | `/api/v1/meta` | Yes | `countries[]` (`code`, `name`, `default_currency`), `departments[]`, `levels[]`, `currencies[]`, `reasons[]`, `fx_rates_as_of`. |
| `GET` | `/api/v1/employees` | Yes | Filters: `q`, `country_code`, `department`, `level`, `status`, `page`, `page_size`, `sort`, `direction`, `as_of`. |
| `POST` | `/api/v1/employees` | Yes | Creates the person and their hire compensation in one transaction. |
| `GET` | `/api/v1/employees/:id` | Yes | Profile, current compensation, full history (oldest first). |
| `PATCH` | `/api/v1/employees/:id` | Yes | Profile and status only. Rejects pay fields with `400`. |
| `POST` | `/api/v1/employees/:id/compensations` | Yes | New effective-dated row. |
| `PATCH` | `/api/v1/employees/:id/compensations/:compensation_id` | Yes | Correction of an existing row. `reason` must be `correction`. |
| `GET` | `/api/v1/analytics/overview` | Yes | Query `as_of`. The “how we pay” payload. |

Route paths in code come from each module's `*.routes.ts` constants (e.g. `EMPLOYEES_ROUTES`), which mirror this table; controllers do not hard-code strings elsewhere.

**List contract** (`GET /api/v1/employees`)

- `q` matches `employee_number`, `email`, `first_name`, and `last_name`. Case-insensitive (`ILIKE`). At 10,000 rows this is acceptable; full-text search is unnecessary.
- `status` accepts `active`, `on_leave`, `terminated`, or `all`. Omitted means `active` and `on_leave`.
- `page` is 1-based. `page_size` default 25, maximum 100. The response is `{ items, page, page_size, total }`.
- Each item includes `id`, `employee_number`, `first_name`, `last_name`, `email`, `country_code`, `department`, `job_title`, `level`, `status`, `hire_date`, and current pay: `amount_minor`, `currency`, `amount_usd_minor`, `effective_from`.
- `sort` is `name` (default), `hire_date`, or `salary`; `direction` is `asc` (default) or `desc`. `salary` sorts by USD equivalent (`amount_usd_minor`); people with no current pay sort last.
- An item with no effective compensation on `as_of` has `amount_minor`, `currency`, `amount_usd_minor`, and `effective_from` set to `null`.

**Create employee** requires identity fields (`employee_number`, `first_name`, `last_name`, `email`, `country_code`, `department`, `job_title`, `level`, `hire_date`) plus the opening compensation (`effective_from` normally equals `hire_date`, `amount_minor`, `currency`, `reason = hire`). One transaction, orchestrated by `EmployeesService` calling `CompensationsService` (cross-module rule). A failed compensation insert does not leave a person with no pay.

**Employee detail** (`GET /api/v1/employees/:id`, optional `as_of`) returns the profile fields, `current_compensation` (a full compensation object, or `null` if no row is effective yet), and `compensations[]` (full history, oldest first). Every compensation object has `id`, `employee_id`, `effective_from`, `amount_minor`, `currency`, `reason`, `note`, `amount_usd_minor`, `created_at`, `updated_at`.

**Overview payload** (`GET /api/v1/analytics/overview`, active + on leave, current pay as of `as_of`). People with no effective compensation row on `as_of` (hired in the future) are not counted.

```json
{
  "as_of": "2026-10-20",
  "headcount": 9500,
  "by_currency": [ { "currency": "INR", "headcount": 2100, "total_minor": 0, "average_minor": 0, "median_minor": 0 } ],
  "usd": { "total_minor": 0, "average_minor": 0, "median_minor": 0, "rate_as_of": "2026-10-01", "label": "USD snapshot" },
  "by_country":    [ { "country_code": "IN",        "headcount": 2100, "by_currency": [ … ], "usd": { "total_minor": 0, "average_minor": 0, "median_minor": 0 } } ],
  "by_department": [ { "department": "Engineering", "headcount": 3000, "by_currency": [ … ], "usd": { … } } ],
  "by_level":      [ { "level": "IC3",             "headcount": 1800, "by_currency": [ … ], "usd": { … } } ]
}
```

Every group carries its own `by_currency[]` (same shape as the top-level one), so a country with expat contracts simply has two entries. The UI renders one line per entry and never decides which groups are “single-currency”. The `usd` figure is the only combined total. `by_level[]` is ordered `IC1`…`IC6`, `M1`…`M3`; the other groups are ordered by key.

**FX snapshot.** `fx_rates` holds exactly one rate per currency (one snapshot). Replacing the snapshot replaces the rows, so USD figures for past `as_of` dates are recomputed with the current snapshot. Keeping historical snapshots (a `(currency, as_of)` key) is a follow-up, not v1. Every USD figure carries `rate_as_of` so the reader knows which snapshot was used.

Unknown routes and unknown ids return `404`. Unauthenticated salary calls return `401`.

---

## Seeding

`npm run seed` is idempotent: it truncates the domain tables and reloads, connecting with `DATABASE_DIRECT_URL` (direct Supabase connection).

- Exactly **10,000** employees. Stable PRNG seed so a re-run produces the same data and tests can assert known totals on a smaller fixture.
- Employee numbers `ACME-10001` … `ACME-20000`.
- Realistic spread across the eight countries, a fixed department list, and all nine levels. Bands live in a table inside the seed script so a salary is explainable from country + level, with a small deterministic jitter.
- Every employee gets a `hire` compensation row in the country’s currency.
- About 20% get one earlier row (promotion or merit) so history is visible. Effective dates stay on or after `hire_date` and the latest row is the current one.
- About 3% are `terminated`, 2% `on_leave`, the rest `active`.
- FX rates and one HR user come from the same script. The HR password comes from the `HR_SEED_PASSWORD` environment variable, not from source.

The seed writes through the modules' repositories/services (or batched repository inserts where the service path would be needlessly slow) — never through the Supabase dashboard or ad-hoc SQL files. Batch inserts (1,000 rows) so the full seed finishes in seconds.

Unit and API tests do **not** load 10,000 rows. They use a hand-built fixture of a few employees in a disposable PostgreSQL database. A separate smoke test may run the seed with `SEED_COUNT=100`. The 10,000 figure is a script invariant asserted once in a seed test that can be excluded from the fast suite if it is ever slow. With batching it should stay in the fast suite.

---

## Performance

| Topic | Decision |
| --- | --- |
| List endpoints | Always paginated. The API never returns 10,000 employees in one response. |
| Analytics | Two reads (payroll population from `EmployeesService`, current pay from `CompensationsService`), grouped in `AnalyticsService`. The response is kilobytes, not rows. |
| Current pay | Derived by one `DISTINCT ON` query in `CompensationsRepository`. No denormalized column until a measured problem exists. |
| Search | Index-backed filters for country, department, level, status. Name search is a scan of 10,000 rows and is fine. |
| N+1 | The list fetches current pay for the whole page in one `CompensationsService` call (`employee_id = ANY(...)`). The UI must not call `GET /api/v1/employees/:id` per row. |
| Connections | Runtime uses the Supabase pooled connection (Supavisor, port `6543`); pool sized for a single NestJS process. Migrations/seed use the direct connection. |
| Write volume | HR updates are rare next to reads. Postgres row locking is a non-issue at this volume. |

Target: list and overview p95 under 100 ms against the seeded Supabase database **from the deployed region** (the dev project is in `ap-northeast-1`; from a laptop elsewhere, network round trips dominate and the target does not apply). If overview misses that, add a covering index before adding a cache.

---

## Security and privacy

Salary data is sensitive even in an assessment build.

- All domain routes require a session (`AuthGuard` on controllers).
- Passwords stored only as a slow hash (argon2 or bcrypt) in `hr_users.password_hash`.
- Cookie is HTTP-only, `SameSite=Lax`, `Secure` in production.
- Notes are plain text capped at 500 characters.
- Logs may include employee numbers and status codes. Logs must not include amounts.
- CORS allows only the frontend origin (`FRONTEND_ORIGIN`).
- Database credentials exist only in the backend environment. The frontend holds no Supabase keys and makes no Supabase calls; there is no browser path to the database.

---

## Tests

Fast, deterministic, no shared mutable database. API tests run migrations against a disposable PostgreSQL database (`TEST_DATABASE_URL`, Postgres in Docker locally or in CI), truncate between suites, and never touch the dev/prod Supabase projects.

**Pure units** (services, with repositories and other modules' services mocked)

- Current-pay selection: past, today, future, and a person with no row yet.
- Unique effective date conflict.
- Correction path rejects a non-correction reason.
- USD conversion, including a rate below 1 (INR) and a rate of 1 (USD), plus a half-up boundary.
- Median on odd and even counts.
- Terminated people drop out of totals; on-leave people stay.
- Two currencies are never added into `by_currency`.
- Cross-module behavior is tested through mocked services (e.g. `AnalyticsService` given stub `EmployeesService` / `CompensationsService` results) — a service unit test never hits another module's repository or tables.

**API tests** (Supertest against the Nest app, migrated test database, tiny fixture)

- Login, then list; unauthenticated list returns `401`.
- Filters, pagination past the end (`items: []`, correct `total`), `page_size` cap.
- Create employee + hire pay is atomic.
- PATCH profile cannot change pay.
- Overview totals match a hand-computed fixture, including the USD rollup.
- Validation errors name the field.

**Outside the unit suite**

- Full 10,000 seed smoke, run on demand and in CI if it stays under a few seconds.

---

## Suggested commit sequence

1. This document.
2. NestJS (Express adapter) skeleton, health check, test harness, Supabase PostgreSQL connection + first migration.
3. Schema/migrations for `employees`, `compensations`, `fx_rates`, `hr_users`, `user_sessions` (snake_case, plural tables).
4. Module skeletons per module (`routes`, `controller`, `service`, `repository`, `module`) with the cross-module rule in place.
5. Seed script and the 10,000-row invariant.
6. Auth module.
7. Employees list and detail, with tests.
8. Compensations create and correction, with effective-date tests.
9. Analytics overview composed via services, with fixture totals.
10. Indexes and a short note of measured list and overview times.

Each commit should leave the suite green.

---

## Trade-offs worth defending

- **PostgreSQL on Supabase over a local file database.** A hosted Postgres removes the single-file/single-writer ceiling, matches what ACME would actually run, and costs nothing at 10,000 rows. Supabase is used strictly as the Postgres host — NestJS remains the only API and auth layer.
- **NestJS + Express over plain Express.** Plain Express leaves structure to discipline; Nest's modules, DI, and exported-service boundary *enforce* the cross-module rule. Express stays as the familiar HTTP adapter underneath.
- **Repository per module over services querying directly.** All SQL for a table sits in one file owned by one module. Services stay testable with mocked repositories, and no second module can quietly grow a dependency on a table it doesn't own.
- **Service-to-service calls over cross-table joins.** Composing analytics through owning services keeps one implementation of “current pay” and one of currency conversion. If a composition query ever becomes a measured bottleneck, the fix is a better-named aggregate method on the owning service — still not a foreign repository.
- **Effective-dated rows over in-place salary edits.** HR’s real question is often “what did we pay, and what changed?” Overwrite loses that. The cost is one extra table and a “current row” query.
- **Snapshot FX over live FX.** Reproducible answers beat a more “accurate” rate that the organization did not approve.
- **Integer minor units over decimal floats.** Payroll bugs from binary floats are well known. The API is slightly less pretty (`amount_minor`) and much safer.
- **One HR role over a full RBAC model.** Matches the persona. Auth still exists.
- **Derived current pay over a stored current-pay column.** One source of truth. The row count does not justify a cache.
