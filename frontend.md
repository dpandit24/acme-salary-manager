# ACME Salary Management — Frontend

**Audience:** HR Manager of ACME.
**Job of this UI:** Let one HR manager manage salary data for about 10,000 employees and answer “how does this organization pay people?” without a spreadsheet.
**Pairs with:** [backend.md](./backend.md) — same endpoints, same field names, same rules. If an endpoint or field changes, both files change in the same commit.

This document is the frontend requirements and design note. Screen behavior follows the backend salary rules. The UI does not invent a second definition of “current pay” or of a total.

---

## Goal

Give the HR manager three workflows:

1. **Look up** a person and see current pay in their contract currency, plus history.
2. **Change** pay by recording a new effective-dated amount, or correct a mistaken row.
3. **Answer** org questions: how many people, how much payroll, what is typical pay, and how that splits by country, department, and level.

The product succeeds when those questions are answered on screen with labels HR can trust, and when a salary edit is an explicit, dated action.

---

## Scope

A logged-in web app with four areas.

| Area | What the HR manager can do |
| --- | --- |
| Sign in | One HR account. Session cookie. No public salary pages. |
| Overview | Headcount, per-currency payroll, USD snapshot rollup, breakdowns by country, department, and level. Average and median side by side. |
| Employees | Search, filter, server-side pagination, open a person. |
| Employee | Read profile and history. Edit profile and status. Add a compensation change. Correct an existing row. |
| Add employee | Create the person and their opening salary together. |

Filters: text query (name, email, employee number), country, department, level, status.

Default employee list is **active and on leave**. Terminated people appear when the status filter asks for them. Overview numbers match that same rule: terminated people are excluded, on-leave people are included.

---

## Deliberately left out

| Excluded | Reason |
| --- | --- |
| A chat box that “answers questions” | The brief asks the HR manager to answer pay questions. Those answers must be SQL totals, not generated prose. The Overview is a set of guided questions bound to `GET /api/v1/analytics/overview`. |
| Dashboard widgets that sum mixed currencies into one unlabeled number | A total of rupees plus dollars is not a payroll figure. The only combined total is the USD snapshot, and it is labeled as such. |
| Rendering all 10,000 rows | The browser paginates. Virtualizing a full dump still pulls too much data and still feels like Excel. |
| Charts that need a charting platform | Country, department, and level tables answer the question. A bar chart can follow if the table is hard to read; it is not required for v1. |
| Employee or manager portals | One persona. |
| Inline edit of salary inside the table | Pay changes need an effective date and a reason. A grid cell edit hides that. |
| Dark-mode theming, i18n, and a design system beyond the component library | The user is one HR manager working in English. Locale-aware **currency formatting** is in scope; translating the app is not. |
| Spreadsheet import and export screens | Same cut as the backend. The UI is the place HR works, not a new way to download the workbook. |
| Bonus, equity, tax, payslip views | Those components are out of the domain for v1. The employee page shows annual base only, so the screen does not imply we store more than we do. |
| Any direct Supabase access | The database is PostgreSQL hosted on Supabase, but the frontend holds **no** Supabase keys, uses **no** `supabase-js`, and makes **no** database calls. Every read and write goes through the NestJS API below. |

---

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + React + TypeScript | Meets the UI constraint. File-based routes match the four areas. |
| Components | shadcn/ui + Tailwind | Accessible primitives, full control over how money is formatted, no data-grid license. |
| Server state | TanStack Query | List, detail, and overview have different cache lifetimes. Mutations invalidate the affected person and the overview. |
| Forms | React Hook Form + Zod | The same rules as the API (positive minor units, required date, known currency) fail in the form before the request. |
| API | `fetch` wrapper | Sends the session cookie to the **NestJS (Express) backend**. Maps the backend error body onto field errors. |

The app is a client of `/api/v1` on the NestJS backend only. It does not talk to PostgreSQL or Supabase directly. In development, Next.js rewrites `/api` to the backend origin.

Money on the wire is `amount_minor` plus `currency` (snake_case, exactly as the backend sends it — see the API contract). A single `format_money(amount_minor, currency)` helper uses `Intl.NumberFormat`. No screen formats currency on its own. TypeScript types for API payloads (`Employee`, `Compensation`, `Overview`, …) are defined once in `lib/api/types.ts` using the same snake_case field names as the backend DTOs, so a renamed field is a compile error here, not a silent blank cell.

---

## API contract (synced with backend)

> **Sync contract:** this table is reproduced **identically** from [backend.md](./backend.md#api) and is the single source of truth for both sides. Every screen below maps to rows of this table; neither side adds, renames, or removes an endpoint without updating both documents in the same commit.

Base path: `/api/v1` (NestJS global prefix; `GET /health` is the only route outside it). JSON. Dates are `YYYY-MM-DD`. Errors:

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

**Field names used by this UI (identical to the backend):**

- Employee: `id`, `employee_number`, `first_name`, `last_name`, `email`, `country_code`, `department`, `job_title`, `level`, `status`, `hire_date`, `created_at`, `updated_at`.
- Compensation: `id`, `employee_id`, `effective_from`, `amount_minor`, `currency`, `reason`, `note`, `amount_usd_minor`, `created_at`, `updated_at`.
- Employee list response: `{ items, page, page_size, total }`; each item also carries current pay (`amount_minor`, `currency`, `amount_usd_minor`, `effective_from`), all `null` when no row is effective yet.
- Employee detail response: profile fields + `current_compensation` (full compensation object, or `null`) + `compensations[]` (oldest first, full compensation objects).
- Overview response: `as_of`, `headcount`, `by_currency[]` (`currency`, `headcount`, `total_minor`, `average_minor`, `median_minor`), `usd` (`total_minor`, `average_minor`, `median_minor`, `rate_as_of`, `label`), and `by_country[]` / `by_department[]` / `by_level[]`. Each group item has its key (`country_code`, `department`, or `level`), `headcount`, its own `by_currency[]` (same shape as above), and `usd` (`total_minor`, `average_minor`, `median_minor`). Full example in [backend.md](./backend.md#api).
- Meta response: `countries[]` (`code`, `name`, `default_currency`), `departments[]`, `levels[]`, `currencies[]`, `reasons[]`, `fx_rates_as_of`.
- List query parameters: `q`, `country_code`, `department`, `level`, `status` (`active` | `on_leave` | `terminated` | `all`; omitted = active + on leave), `page`, `page_size`, `sort` (`name` | `hire_date` | `salary`), `direction` (`asc` | `desc`), `as_of`.

**Which screen calls what:**

| Screen | Endpoints called |
| --- | --- |
| Sign in | `POST /api/v1/auth/login`; session probe `GET /api/v1/auth/me`; sign-out `POST /api/v1/auth/logout` |
| Overview (`/`) | `GET /api/v1/analytics/overview?as_of=…` |
| Employees (`/employees`) | `GET /api/v1/employees` (with the list query parameters above); filter dropdowns from `GET /api/v1/meta` |
| Add employee (`/employees/new`) | `POST /api/v1/employees`; dropdowns from `GET /api/v1/meta` |
| Employee (`/employees/[id]`) | `GET /api/v1/employees/:id`; `PATCH /api/v1/employees/:id`; `POST /api/v1/employees/:id/compensations`; `PATCH /api/v1/employees/:id/compensations/:compensation_id` |

No other endpoints exist. In particular there is **no** compensation endpoint on the profile PATCH, **no** endpoint that returns all 10,000 employees, and **no** frontend call to Supabase/PostgreSQL.

---

## Information architecture

```
/login
/                         Overview — how ACME pays
/employees                Find and filter people
/employees/new            Add a person and opening salary
/employees/[id]           Profile, current pay, history, changes
```

Primary navigation: **Overview** and **Employees**. Add-employee is a button on the list. Sign-out sits in the header with the HR user’s email.

Overview is the home page after login. The HR manager’s first question is about the organization, not about row 1 of a table.

---

## How the screens answer questions

Each overview block is a question, then a number, then the definition in one line. Definitions are visible, not tucked into a tooltip only. All data comes from the single call `GET /api/v1/analytics/overview?as_of=…`.

| Question on screen | Source field | Definition shown |
| --- | --- | --- |
| How many people are we paying? | `headcount` | Active and on leave, as of the selected date. |
| What is payroll in each currency? | `by_currency[]` (`total_minor`) | Sum of current annual base. No conversion. |
| What is payroll in USD? | `usd.total_minor` | Snapshot conversion. Shows the rate date (`usd.rate_as_of`) from the API. |
| What does a typical employee earn? | `median_minor` next to `average_minor`, per currency and in USD | Median is typical pay. Average is pulled up by senior levels. |
| How does pay differ by country, department, and level? | `by_country[]`, `by_department[]`, `by_level[]` | Headcount, one local-currency line per entry in the group's `by_currency[]`, and the group's USD snapshot total. The UI never merges two currencies. |

An **as-of date** control defaults to today and refetches overview (`as_of` query parameter). That is how a future increase stays out of “current” until its effective date. The control is a date picker, not a free-typed string.

Country or department rows link to `/employees` with that filter applied (`country_code` / `department` query parameters), so a total can be opened as people.

---

## Employees

**List** — `GET /api/v1/employees`

- Search input, filters, table, pager.
- Columns: employee number (`employee_number`), name (`first_name` + `last_name`), country (`country_code`), department, level, status, current annual pay (`amount_minor` + `currency`), hire date (`hire_date`).
- Current pay is formatted in **contract currency**. The column header says so.
- If the user sorts by salary (`sort=salary`), the header reads **Salary (USD equiv.)** and the order matches the backend sort by `amount_usd_minor`. The cell still shows local currency. A second line can show the USD equivalent in muted text so the sort order is explainable.
- Page size 25 (`page_size=25`). Pager shows total count (“1–25 of 9,840”) from `total`.
- Query, filters, page, and sort live in the URL. A refresh and a shared link reproduce the view.
- Search is debounced (300 ms), sent as `q`. Changing a filter resets to `page=1`.
- Empty state: “No employees match these filters” and a clear-filters action.
- Loading and error states are explicit. A failed list does not render as an empty company.

**Add employee** — `POST /api/v1/employees`

One form, one submit, matching the backend transaction: identity fields (`employee_number`, `first_name`, `last_name`, `email`, `country_code`, `department`, `job_title`, `level`, `hire_date`) and opening compensation (`effective_from`, `amount_minor`, `currency`, `reason` fixed to `hire`). Currency defaults from the selected country (via `GET /api/v1/meta`) and can be changed. Success navigates to the new employee (`/employees/[id]`).

**Employee detail** — `GET /api/v1/employees/:id`

- Profile summary and an edit form for `first_name`, `last_name`, `email`, `country_code`, `department`, `job_title`, `level`, `status`, `hire_date`. Saving this form cannot change pay: it calls `PATCH /api/v1/employees/:id`, and the form does not contain amount fields.
- Current pay (`current_compensation`) called out in local currency, with `effective_from` and `reason`.
- History table from `compensations[]`, oldest first: `effective_from`, `amount_minor`, `currency`, `reason`, `note`.
- **Record a change:** `POST /api/v1/employees/:id/compensations` with `effective_from`, `amount_minor`, `currency`, `reason` (merit, promotion, market adjustment), optional `note`. Future dates are allowed. The helper text says the new amount becomes current on that date.
- **Correct a row:** available on a history row. Calls `PATCH /api/v1/employees/:id/compensations/:compensation_id`, edits `amount_minor`, `currency`, `effective_from`, and `note`. `reason` is sent as `correction`. Helper text says this rewrites that row because it was wrong, and does not record a raise.
- After a successful pay write, the detail query (`GET /api/v1/employees/:id`) and the overview query (`GET /api/v1/analytics/overview`) are invalidated.
- A `409` on a duplicate `effective_from` is shown on the date field: that date already has a compensation row.

Status `terminated` uses a confirmation step (“This person will drop out of payroll totals. Their history stays.”) before `PATCH /api/v1/employees/:id` is sent.

---

## Interaction rules

- Amounts are entered as major units (`85000` or `85000.50`) and converted to minor units (`amount_minor`) at the form boundary. The API still receives an integer. The input rejects more than two decimal places.
- Every money figure on screen includes a currency code. USD snapshot figures include the words “USD snapshot” and the rate date (`rate_as_of`).
- The UI never adds two `format_money` results together.
- Buttons that mutate show a pending state and ignore double submits.
- The session probe calls `GET /api/v1/auth/me`. A `401` on any request routes to `/login` and keeps the attempted URL for the return trip.
- Overview and list data may be cached for about 30 seconds. Detail is refreshed after every mutation. Pay figures are not cached across an `as_of` date change.

---

## Visual and accessibility baseline

- Desktop-first. The HR manager works at a desk. Layout still wraps: filters stack, tables scroll horizontally, and the overview cards become one column under 768 px.
- Use the component library’s focus rings, labels, and dialogs. Every input has a visible label. Errors are text, not color alone.
- Status is a text badge (Active, On leave, Terminated), not color alone.
- Tables have column headers. The pager is buttons with names, not only icons.
- Contrast meets WCAG AA for body text and for pay figures.

---

## Performance

The UI stays fast by asking for less data.

- Employee list requests one page (`page` + `page_size`). It does not prefetch all pages.
- Overview is one request (`GET /api/v1/analytics/overview`). Breakdowns are tables of tens of rows, not thousands.
- Employee detail is one request (profile + history). History for one person is a handful of rows.
- Route-level loading UI so a slow overview does not block typing in search on a later visit (Query cache).
- No client-side sort or filter of a downloaded dump.

If a table feels slow, measure the API before adding a virtualizer. At page size 25 the DOM is not the constraint.

---

## Tests

Vitest and React Testing Library. No real backend. MSW or an injected fetch stub returns fixture JSON using the exact snake_case fields and endpoints from the API contract above. Tests assert behavior.

| Test | What it protects |
| --- | --- |
| `format_money` | Minor units and currency code. `100050` USD renders as a dollar amount with cents. A second currency does not reuse the dollar symbol. |
| Overview | Renders per-currency totals (`by_currency`) and a labeled USD snapshot (`usd`, `rate_as_of`). Fixture text for `median_minor` and `average_minor` both appear. |
| Overview as-of | Changing the date sends a new `as_of` to `GET /api/v1/analytics/overview` and does not keep the previous totals on screen after the response. |
| Employee list | Renders one page, shows `total`, and sends `page`, `page_size`, `country_code`, and `q` to `GET /api/v1/employees`. |
| Salary sort label | Choosing `sort=salary` shows that the order is the USD equivalent (`amount_usd_minor`). |
| Empty and error | Empty filter result and a 500 do not look the same. |
| Add employee | Submit to `POST /api/v1/employees` sends `amount_minor` (integer) and `reason: hire`. A field error from the API appears on that field. |
| Record a change | `POST /api/v1/employees/:id/compensations` allows a future `effective_from`. Duplicate-date `409` surfaces on the date field. |
| Profile save | The `PATCH /api/v1/employees/:id` request body has no amount field. |
| Termination confirm | Confirming sends `status: terminated` via `PATCH /api/v1/employees/:id`. Dismissing does not. |
| Auth redirect | A `401` from `GET /api/v1/auth/me` renders the login route. |

Tests use fake timers only for the search debounce. They do not depend on animation or on the system locale beyond `format_money` pinning `en-US` so assertions stay stable. Currency code assertions (`USD`, `INR`) matter more than a particular thousands separator.

End-to-end browser coverage, if added, is one path: login → overview total → open a country → open a person → record a change → see the new current pay. That is a smoke test, not a substitute for the unit tests above.

---

## Suggested commit sequence

1. This document.
2. App shell, login (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`), route guard, `format_money` and its tests.
3. Overview page against `GET /api/v1/analytics/overview`, with tests.
4. Employee list against `GET /api/v1/employees`: URL state, filters, pagination, tests.
5. Employee detail and history against `GET /api/v1/employees/:id`.
6. Record-a-change and correction forms (`POST` / `PATCH` compensations), with API error mapping tests.
7. Add employee (`POST /api/v1/employees`).
8. Profile edit and termination confirmation (`PATCH /api/v1/employees/:id`).
9. Empty, error, and loading passes on the three main screens. Check desktop and a narrow viewport.

Each commit should leave the frontend suite green. Build against the backend contract in `backend.md` even if a screen lands before the endpoint, using the fixture the tests already use — and if the contract changes, update both documents in the same commit.

---

## Trade-offs worth defending

- **Guided questions over a natural-language box.** Trust is the feature. Every number on Overview is a field from the `GET /api/v1/analytics/overview` response.
- **Server pagination over a client grid of 10,000 rows.** The organization is large enough that “download everything” recreates Excel in the browser.
- **Pay edits on the employee page, with a date and a reason.** It is a few more clicks than a cell edit and it preserves history.
- **Major-unit inputs, minor-unit API.** HR types `85000`, not `8500000`. Conversion happens in one helper, covered by tests.
- **Median beside average.** The persona’s question “what do we pay?” is usually about a typical employee. Average alone answers a different question.
- **shadcn/ui over a heavy data grid.** The table is simple once paging and sorting are server-side. A grid component would add features (inline edit, virtualization) this product is choosing not to use.
- **API-only data access over direct Supabase access from the browser.** One backend (NestJS) means one place for auth, salary rules, and audit-friendly logs — and no database credentials or row-level policies to get wrong in the client.
