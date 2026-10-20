# ACME Salary Management

HR tool for ~10,000 employees: look up pay and history, record effective-dated changes, and answer "how do we pay people?" by country, department, and level.

- [REQUIREMENTS.md](REQUIREMENTS.md) — one-page goal, scope, and what is deliberately left out
- [backend.md](backend.md) — API, salary rules, data model (NestJS on Express, TypeORM, PostgreSQL on Supabase)
- [frontend.md](frontend.md) — screens and behavior (Next.js, TanStack Query, shadcn-style UI)

## Run locally

Requires Node 22 and, for API tests only, Docker.

```bash
# backend (port 3001)
cd backend
npm install
cp .env.example .env          # fill in Supabase pooler URLs, SESSION_SECRET, HR_SEED_PASSWORD
npm run migration:run         # schema, over DATABASE_DIRECT_URL
npm run seed                  # 10,000 employees + FX snapshot + HR user (idempotent)
npm run start:dev

# frontend (port 3000; proxies /api to BACKEND_ORIGIN)
cd frontend
npm install
npm run dev                   # or: npx next dev -p 3002 if 3000 is taken
```

Sign in with `HR_SEED_EMAIL` / `HR_SEED_PASSWORD` from `backend/.env`.

## Tests

```bash
cd backend
npm test                      # unit: money math, salary rules, analytics, seed invariants
npm run test:db:up            # disposable Postgres in Docker on :54329
npm run test:api              # Supertest against the real app + migrated test DB
npm run test:db:down

cd frontend
npm test                      # Vitest + RTL + MSW, fixtures follow the API contract
```
