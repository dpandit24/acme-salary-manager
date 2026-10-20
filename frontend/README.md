# ACME Salary Management — Frontend

Next.js 15 (App Router) + React + TypeScript client for the NestJS API described in `../frontend.md` and `../backend.md`.
The browser only calls relative `/api/v1/...`; in development Next.js rewrites `/api/*` to `BACKEND_ORIGIN`.

## Run

```bash
cp .env.example .env.local   # BACKEND_ORIGIN=http://localhost:3001
npm install
npm run dev                  # http://localhost:3000
```

The backend must be running and allow `FRONTEND_ORIGIN=http://localhost:3000`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` (`lint`) | `tsc --noEmit` |
| `npm test` | Vitest + React Testing Library + MSW (no backend needed) |

## Layout

- `app/` — routes: `/login`, `/` (Overview), `/employees`, `/employees/new`, `/employees/[id]`
- `components/ui/` — shadcn-style primitives; `components/overview`, `components/employees` — screens
- `lib/api/` — `types.ts` (API payloads, snake_case), `client.ts` (fetch wrapper, `ApiError`, 401 redirect), `endpoints.ts`
- `lib/money.ts` — `format_money`, `major_to_minor`
- `test/` — MSW server, contract fixtures, screen tests
