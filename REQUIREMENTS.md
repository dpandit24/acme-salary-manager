# ACME Salary Management — Requirements

**Persona:** HR Manager at ACME. One organization, about 10,000 employees across 8 countries.
**Detail:** [backend.md](backend.md) (API, salary rules, data model) and [frontend.md](frontend.md) (screens, behavior) expand on this page.

## Problem

HR keeps salary data for 10,000 people in Excel. Edits overwrite the old figure, so pay history is lost. Totals mix currencies by hand. Questions like "what do we pay engineers in India?" mean building a new pivot table every time.

## Goal

A web app where the HR manager can:

1. **Look up** anyone's current pay and full pay history in seconds.
2. **Change** pay as an explicit, dated action that keeps the previous figure.
3. **Answer** "how do we pay people?" (headcount, payroll, typical pay by country, department and level) with numbers HR can trust and trace back to rows.

**Success means:** HR stops opening the spreadsheet for these three jobs.

## Scope (v1)

| Area | Features |
| --- | --- |
| Sign in | One HR account, server-side session. No salary data without login. |
| Overview | Headcount; payroll per currency; one USD total from a dated FX snapshot; median and average side by side; breakdowns by country, department and level; an "as of" date to see pay on any day. |
| Employees | Search by name, email or number; filter by country, department, level and status; sort by name, hire date or pay; 25 per page; filters kept in the URL. |
| Employee | Profile and status edit, current pay, full history, record a raise (merit, promotion, market adjustment) with a future date allowed, correct a wrong row. |
| Add employee | Person and opening salary created together, so nobody exists without pay. |
| Data | Seed script loads 10,000 realistic employees across 8 currencies; about 20% have pay history, 3% are terminated and 2% on leave. |

## Product rules that matter

- **Pay history is never overwritten.** A change is a new row with an effective date. "Current pay" is the latest row on or before the chosen date.
- **Currencies are never added together.** Totals are shown per currency. The single combined figure is a USD conversion, labeled with its rate date.
- **Median next to average.** A few senior salaries pull the average up, so the median is the honest "typical pay".
- **Terminated people keep their history** but leave headcount and payroll. People on leave stay in both.
- **Money is stored in whole minor units** (cents, paise), never floating point.

## Deliberately left out

| Not in v1 | Why |
| --- | --- |
| Payroll runs, tax, payslips, bank files | The pain is salary *data* and questions about it. A payroll engine is a different product. |
| Bonus, equity, benefits | Annual base is what HR reconciles today. Get one pay component trustworthy first. |
| Employee/manager portals, roles, approvals | One persona. More audiences need a permission model v1 doesn't have. |
| Live exchange rates | Totals must give the same answer tomorrow. A dated snapshot is reproducible. |
| AI chat over salaries | A chatbot can invent a number. Guided questions backed by SQL totals can't. |
| Spreadsheet import / CSV export | The seed is the first load. The goal is to replace the spreadsheet, not keep it alive. |
| Charts, dark mode, translations | Tables answer the questions. One English-speaking user. Can follow later. |
| Hard delete | Termination is a status, so history stays queryable. |

## Constraints and assumptions

- **Stack:** NestJS + PostgreSQL (hosted on Supabase, used only as the database) for the API; Next.js + shadcn/ui for the UI.
- All 8 currencies have 2 decimal places, which keeps money math to one rule.
- One FX snapshot at a time; past dates are converted with the current snapshot.
- 10,000 rows is a small database workload, so the design favors correctness and clarity over caching and scale-out.
