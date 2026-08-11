# Geld Flow

An expense-splitting platform for groups and pairs — IOU ledger, live activity feed, debt simplification, a Telegram bot, a positive-only reputation system, and pixel-art badges.

## Status

All planned phases are built:

- **Phase 0** — monorepo foundation, auth (magic-link + Google OAuth)
- **Phase 1** — core engine: ledgers, expenses (equal/percentage/exact splits), balances, settlements, activity feed
- **Phase 2** — reputation/rank system, debt-simplification for groups
- **Phase 3** — Telegram bot, contextual Travel/Event dashboards
- **Phase 4** — visual identity: glassmorphism, aurora backdrop, pixel-art badges
- **Phase 5** — hardening: rate limiting, security headers, env validation, test coverage, health check

## Structure

```
apps/
  web/             Next.js (TypeScript, App Router, Tailwind v4)
  api/             NestJS (TypeScript)
packages/
  shared/          Zod schemas shared by web and api — the single source of validation truth
  db/               Prisma schema, migrations, and generated client
```

## Local development

Prerequisites: Node 20+, pnpm, Docker.

```bash
pnpm install
docker compose up -d          # Postgres + Redis
pnpm --filter @geld-flow/db generate
pnpm --filter @geld-flow/db migrate
pnpm dev:api                  # http://localhost:4000
pnpm dev:web                  # http://localhost:3000
```

Copy `apps/api/.env.example` to `apps/api/.env` before starting the API. In dev mode, magic-link emails aren't actually sent — the sign-in link is shown directly on the login page instead (`EmailService` just logs it).

### Running checks

```bash
pnpm lint          # all packages
pnpm typecheck      # all packages
pnpm test           # all packages (apps/api has real jest coverage; others are placeholders)
pnpm build           # all packages
```

## Environment variables

All live in `apps/api/.env` (see `apps/api/.env.example` for the template). Everything except `DATABASE_URL` and `JWT_ACCESS_SECRET` is optional — the app boots and runs with the rest unset, just with the corresponding feature disabled.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | | `development` \| `production` \| `test` |
| `PORT` | | API port (default 4000) |
| `API_BASE_URL` | | Public base URL of the API, used to build magic-link and invite URLs |
| `WEB_APP_URL` | | Frontend origin, used for CORS and post-auth redirects |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `REDIS_URL` | | Reserved for future session/cache use |
| `JWT_ACCESS_SECRET` | ✅ | Signs access tokens — must be at least 16 characters |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | | Google OAuth. Without these, Google sign-in returns a 503 instead of crashing the app |
| `TELEGRAM_BOT_TOKEN` | | Telegram bot. Without it, the bot module stays gracefully disabled — `/telegram/status` reports `configured: false` and the frontend hides the connect flow |

Missing `DATABASE_URL` or a too-short `JWT_ACCESS_SECRET` fails startup immediately with a clear error, rather than the app booting and failing confusingly on the first request that needs them.

`apps/web` reads `NEXT_PUBLIC_API_URL` (see `apps/web/.env.local`), defaulting to `http://localhost:4000`.

## Design principles

- **IOU ledger, no funds custody.** The app tracks who owes whom; it never moves money.
- **One ledger engine, strict isolation.** Group and Personal splits share the same tables, but a balance is always computed for exactly one ledger and never summed across ledgers — a group debt and a personal debt between the same two people never blend.
- **Balances computed live, never cached.** Correctness over speed for anything involving money.
- **Shares computed once, stored, never re-derived.** Editing an expense fully replaces its shares in one transaction rather than mutating them in place.
- **Positive-only reputation.** Rank only goes up (driven by a monotonically increasing confirmed-settlements counter) — there's no penalty axis.
- **Graceful degradation for optional integrations.** Google OAuth and the Telegram bot are both fully functional when configured and cleanly disabled (not crashing) when they're not.

## Architecture notes

- **Auth**: passwordless magic-link (single-use, hashed, 15-min expiry) or Google OAuth, both issuing a short-lived JWT access token plus a rotating httpOnly refresh cookie. Refresh rotation is atomic (`UPDATE ... WHERE revoked_at IS NULL`) to survive concurrent refresh attempts safely.
- **Splits**: `equal` / `percentage` / `exact`, computed server-side in integer cents so shares always sum exactly to the total — no float drift, remainder cents distributed deterministically.
- **Debt simplification**: a pure, DB-free util (`simplifyDebts`) doing greedy largest-creditor/largest-debtor matching — at most n-1 transfers for n participants. Groups only; a personal ledger is already just two people.
- **Telegram bot**: long-polls Telegram's `getUpdates` (no public webhook needed for local dev). One chat maps to one ledger via a short-lived link code generated from that ledger's page. Expense messages ("Paid $40 for pizza @Alex") are parsed and matched to members by pure, unit-tested utilities — an ambiguous or unmatched name is never guessed at.
- **Badges**: eight badge definitions sync into the database on every boot (idempotent upsert-by-key — no seed script to remember to run). Awards are idempotent and checked directly inside the services that already know when criteria are met.

## Security

- Rate limiting (`@nestjs/throttler`): a global default plus a tighter limit on magic-link requests specifically (the cheapest endpoint to abuse for email spam).
- `helmet` for standard security headers.
- CORS restricted to `WEB_APP_URL` with credentials.
- Every mutating endpoint validates its body against a Zod schema shared with the frontend.
- `GET /health` checks real database connectivity (not just "the process is alive") for use as a container/orchestrator readiness probe.
