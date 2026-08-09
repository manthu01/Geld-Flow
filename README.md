# Geld Flow

An expense-splitting platform for groups and pairs — IOU ledger, live activity feed, debt simplification, a Telegram bot, and a positive-only reputation system for fast settlers.

## Status

Phase 0 — foundations. No product features yet.

## Structure

```
apps/
  web/            Next.js 15 (TypeScript, App Router, Tailwind)
  api/             NestJS (TypeScript)
packages/
  shared/          Zod schemas shared by web and api
  db/              Prisma schema and generated client
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

Copy `.env.example` to `.env` in `apps/api` before starting the API.

## Design principles

- **IOU ledger, no funds custody.** The app tracks who owes whom; it never moves money.
- **One ledger engine, strict isolation.** Group and Personal splits share the same tables, but a balance is always computed for exactly one ledger and never summed across ledgers.
- **Balances computed live, never cached.** Correctness over speed for anything involving money.
