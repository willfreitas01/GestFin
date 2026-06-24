# FinControl

FinControl is a Brazilian Portuguese personal finance management app for tracking receitas (income) and despesas (expenses) with a dashboard, monthly reports, and full transaction history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/fincontrol run dev` — run the frontend (port 20587)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session (cookie-based sessions)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + Recharts

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/users.ts` — users table (id, username, passwordHash, securityQuestion, securityAnswerHash)
- `lib/db/src/schema/transactions.ts` — transactions table (id, userId, date, category, description, amount)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, transactions, dashboard, reports)
- `artifacts/fincontrol/src/` — React frontend
- `lib/api-client-react/src/generated/` — Generated React Query hooks

## Architecture decisions

- Custom username/password auth with session cookies (no Clerk/Replit Auth) — matches original design's auth flow with security questions for password recovery.
- Passwords hashed with SHA-256 keyed on `username+password` to match the original app's behavior.
- All UI in Brazilian Portuguese (pt-BR).
- Categories: `venda` (Receita Operacional, income), `material` (Insumos), `funcionarios` (Folha de Pagamento), `outro` (Outras Despesas).
- Income categories: only `venda`; all others are expenses.

## Product

- Login / Cadastro / Recuperação de senha (security question-based)
- Dashboard: KPI cards (Receitas, Despesas, Saldo, Taxa de Economia), bar chart (últimos 7 dias), donut chart (composição por categoria), lançamentos recentes
- Registrar: form to add new transactions + today's transactions sidebar
- Histórico: full transaction history with category filter pills
- Relatório Mensal: month-picker + KPIs + category breakdown + transaction list

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing `lib/db/src/schema/` before typechecking artifact packages — stale declarations cause false errors.
- After any OpenAPI spec change, re-run `pnpm --filter @workspace/api-spec run codegen` before touching route handlers.
- `req.params.id` in Express 5 is typed as `string | string[]` — cast to `string` before `parseInt`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
