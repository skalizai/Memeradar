# MemeRadar

Personal Solana meme-coin **signal + journal** platform. It watches new token launches, filters
them through staged gates, scores them, and shows suggestions on a trading-terminal dashboard
with email alerts and a trade journal.

**It never executes trades, holds no private keys, and never calls Axiom** — it only links to it.

The full build spec is in [MEMERADAR_SPEC.md](MEMERADAR_SPEC.md).

## Layout

| Path | What |
|---|---|
| `apps/worker` | Node + TypeScript ingestion and scoring worker (runs on your PC via Docker) |
| `apps/web` | Next.js dashboard (deployed on Vercel) |
| `packages/core` | Shared types, env config, rules schema and defaults, formatting helpers |
| `packages/db` | Supabase migrations (`supabase/migrations`) and table names |
| `packages/emails` | Email subjects and (from step 10) React Email templates |

## Prerequisites

- Node 20+ and pnpm 10 (`npm i -g pnpm`)
- Docker Desktop (for Redis and the worker)
- Supabase, Vercel and Resend accounts

## Setup

```bash
pnpm install
cp .env.example .env                 # worker / docker-compose
cp .env.example apps/web/.env.local  # web app (only the NEXT_PUBLIC_* and ALLOW_SIGNUP lines are needed)
```

### Supabase

1. Link the project and push the schema:
   ```bash
   cd packages/db
   pnpm dlx supabase link --project-ref <your-project-ref>
   pnpm db:push
   ```
2. **Authentication → Providers → Email**: keep email + password enabled and turn off
   "Allow new users to sign up".
3. **Authentication → Users → Add user**: create your single account.
4. **Authentication → SMTP**: configure Resend (host `smtp.resend.com`, port 465, user `resend`,
   password = your Resend API key).
5. **Authentication → URL Configuration**: set the Site URL to your app URL and add
   `<app-url>/auth/confirm` to the redirect allow-list.

## Running

```bash
# Web app at http://localhost:3000
pnpm --filter @memeradar/web dev

# Worker + Redis (Docker)
docker compose up -d --build
curl http://127.0.0.1:8787/health

# …or the worker directly, with only Redis in Docker
docker compose up -d redis
pnpm --filter @memeradar/worker dev
```

`PROVIDER_MODE=replay` (the default) needs no API keys.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm lint
```
